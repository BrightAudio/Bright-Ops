"use client";

import { useMemo, useState } from "react";
import WidgetCard from "./WidgetCard";

type ScheduleItem = {
  title: string;
  location: string;
  date: string;
  time: string;
};

export default function MySchedule() {
  const [view, setView] = useState<"today" | "tomorrow">("today");

  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    if (view === "tomorrow") {
      return [
        {
          title: "Venue Walkthrough - XYZ Events",
          location: "Downtown Pavilion",
          date: "Sat 08-11-2025",
          time: "09:00",
        },
        {
          title: "Logistics Sync with Transport Team",
          location: "Logistics Hub",
          date: "Sat 08-11-2025",
          time: "11:30",
        },
        {
          title: "Crew Meal Coordination",
          location: "Catering Office",
          date: "Sat 08-11-2025",
          time: "14:00",
        },
        {
          title: "Evening Soundcheck - Main Stage",
          location: "Soundstage A",
          date: "Sat 08-11-2025",
          time: "18:00",
        },
      ];
    }

    return [
      {
        title: "Appointment: Check-in with Brandy",
        location: "Office",
        date: "Fri 07-11-2025",
        time: "12:00",
      },
      {
        title: "Prep: Stage Lighting Review",
        location: "Warehouse",
        date: "Fri 07-11-2025",
        time: "14:30",
      },
      {
        title: "Crew Briefing - Evening Showcase",
        location: "Soundstage B",
        date: "Fri 07-11-2025",
        time: "17:00",
      },
    ];
  }, [view]);

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
    </WidgetCard>
  );
}
