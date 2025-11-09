"use client";

import { useMemo, useState, useEffect } from "react";
import WidgetCard from "./WidgetCard";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Transport = {
  id: string;
  depart_at: string | null;
  arrive_at: string | null;
  origin: string | null;
  destination: string | null;
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
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      // Fetch upcoming jobs (next 7 days)
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .or(`event_date.gte.${today.toISOString()},load_in_date.gte.${today.toISOString()},load_out_date.gte.${today.toISOString()},prep_start_date.gte.${today.toISOString()}`)
        .lte("event_date", weekFromNow.toISOString())
        .order("event_date", { ascending: true });

      // Fetch upcoming transports
      const { data: transportsData } = await supabase
        .from("transports")
        .select("id, depart_at, arrive_at, origin, destination")
        .gte("depart_at", today.toISOString())
        .lte("depart_at", weekFromNow.toISOString())
        .order("depart_at", { ascending: true });

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
    jobs.forEach(job => {
      const jobTitle = job.title || job.code || "Untitled Job";

      // Check prep start date
      if (job.prep_start_date) {
        const prepDate = new Date(job.prep_start_date);
        if (prepDate >= targetDate && prepDate < nextDay) {
          items.push({
            title: `Prep: ${jobTitle}`,
            location: "Warehouse",
            date: formatDate(prepDate),
            time: formatTime(prepDate),
            type: "prep"
          });
        }
      }

      // Check load-in date
      if (job.load_in_date) {
        const loadInDate = new Date(job.load_in_date);
        if (loadInDate >= targetDate && loadInDate < nextDay) {
          items.push({
            title: `Load In: ${jobTitle}`,
            location: job.client || "TBD",
            date: formatDate(loadInDate),
            time: formatTime(loadInDate),
            type: "load-in"
          });
        }
      }

      // Check event date
      if (job.event_date) {
        const eventDate = new Date(job.event_date);
        if (eventDate >= targetDate && eventDate < nextDay) {
          items.push({
            title: `Event: ${jobTitle}`,
            location: job.client || "TBD",
            date: formatDate(eventDate),
            time: formatTime(eventDate),
            type: "event"
          });
        }
      }

      // Check load-out date
      if (job.load_out_date) {
        const loadOutDate = new Date(job.load_out_date);
        if (loadOutDate >= targetDate && loadOutDate < nextDay) {
          items.push({
            title: `Load Out: ${jobTitle}`,
            location: job.client || "TBD",
            date: formatDate(loadOutDate),
            time: formatTime(loadOutDate),
            type: "load-out"
          });
        }
      }
    });

    // Add transport events
    transports.forEach(transport => {
      if (transport.depart_at) {
        const departDate = new Date(transport.depart_at);
        if (departDate >= targetDate && departDate < nextDay) {
          items.push({
            title: "Transport Departure",
            location: transport.origin || "TBD",
            date: formatDate(departDate),
            time: formatTime(departDate),
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
