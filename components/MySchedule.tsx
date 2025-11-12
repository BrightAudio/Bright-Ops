"use client";

import { useMemo, useState, useEffect } from "react";
import WidgetCard from "./WidgetCard";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Transport = {
  id: string;
  scheduled_at: string | null;
  type: string | null;
  status: string | null;
};

type ScheduleItem = {
  title: string;
  location: string;
  date: string;
  time: string;
  type: "prep" | "transport" | "load-in" | "event" | "load-out";
};

export default function MySchedule() {
  const [view, setView] = useState<"today" | "tomorrow">("today");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScheduleData() {
      const supabase = supabaseBrowser();
      
      // Get today and tomorrow dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      // Fetch jobs for today and tomorrow only
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .or(`start_at.gte.${today.toISOString()},end_at.gte.${today.toISOString()}`)
        .order("start_at", { ascending: true });

      if (jobsError) {
        console.error('Error fetching jobs for schedule:', jobsError);
      }

      // Fetch transports for today and tomorrow
      const { data: transportsData, error: transportsError } = await supabase
        .from("transports")
        .select("id, scheduled_at, type, status")
        .gte("scheduled_at", today.toISOString())
        .lte("scheduled_at", dayAfterTomorrow.toISOString())
        .order("scheduled_at", { ascending: true });

      if (transportsError) {
        console.error('Error fetching transports for schedule:', transportsError);
      }

      setJobs(jobsData || []);
      setTransports(transportsData || []);
      setLoading(false);
    }

    fetchScheduleData();
  }, []);

  const scheduleItems = useMemo(() => {
    const items: ScheduleItem[] = [];
    
    // Determine date range based on view
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = view === "today" ? today : new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    // Add job-related events
    jobs.forEach((job: any) => {
      const jobTitle = job.title || job.code || "Untitled Job";

      // Check start date (event/job start)
      if (job.start_at) {
        const startDate = new Date(job.start_at);
        if (startDate >= targetDate && startDate < nextDay) {
          items.push({
            title: `Start: ${jobTitle}`,
            location: job.venue || "TBD",
            date: formatDate(startDate),
            time: formatTime(startDate),
            type: "event"
          });
        }
      }

      // Check end date (load-out/return)
      if (job.end_at) {
        const endDate = new Date(job.end_at);
        if (endDate >= targetDate && endDate < nextDay) {
          items.push({
            title: `Return: ${jobTitle}`,
            location: job.venue || "TBD",
            date: formatDate(endDate),
            time: formatTime(endDate),
            type: "load-out"
          });
        }
      }
    });

    // Add transport events
    transports.forEach(transport => {
      if (transport.scheduled_at) {
        const scheduledDate = new Date(transport.scheduled_at);
        if (scheduledDate >= targetDate && scheduledDate < nextDay) {
          items.push({
            title: `Transport: ${transport.type || 'Scheduled'}`,
            location: transport.status || "TBD",
            date: formatDate(scheduledDate),
            time: formatTime(scheduledDate),
            type: "transport"
          });
        }
      }
    });

    // Sort by time
    items.sort((a, b) => {
      const timeA = a.time.replace(":", "");
      const timeB = b.time.replace(":", "");
      return timeA.localeCompare(timeB);
    });

    return items;
  }, [jobs, transports, view]);

  function formatDate(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    return `${days[date.getDay()]} ${months[date.getMonth()]}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;
  }

  function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return (
    <WidgetCard
      title="My Schedule"
      icon="fas fa-calendar"
      actions={
        <div className="toggle-buttons" role="group" aria-label="Schedule view">
          <button
            type="button"
            className={`toggle-button${view === "today" ? " active" : ""}`}
            onClick={() => setView("today")}
            aria-pressed={view === "today"}
          >
            Today
          </button>
          <button
            type="button"
            className={`toggle-button${view === "tomorrow" ? " active" : ""}`}
            onClick={() => setView("tomorrow")}
            aria-pressed={view === "tomorrow"}
          >
            Tomorrow
          </button>
        </div>
      }
      className="schedule-widget"
      contentClassName="schedule-scroll"
    >
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading schedule...</div>
      ) : scheduleItems.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No events scheduled for {view === "today" ? "today" : "tomorrow"}
        </div>
      ) : (
        <div className="schedule-list">
          {scheduleItems.map((item, idx) => (
            <div key={`${item.title}-${idx}`} className="schedule-item">
              <div className="schedule-title">{item.title}</div>
              <div className="schedule-details">
                <span>
                  <i className="fas fa-map-marker-alt" aria-hidden="true"></i>
                  {item.location}
                </span>
                <span>
                  <i className="fas fa-calendar-day" aria-hidden="true"></i>
                  {item.date}
                </span>
                <span>
                  <i className="fas fa-clock" aria-hidden="true"></i>
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
