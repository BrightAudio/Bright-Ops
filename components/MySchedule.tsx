"use client";

import WidgetCard from "./WidgetCard";

export default function MySchedule() {
  const scheduleItems = [
    { time: "9:00 AM", title: "Team Meeting", type: "meeting" },
    { time: "11:00 AM", title: "Client Call - ABC Productions", type: "call" },
    { time: "2:00 PM", title: "Equipment Check - Job #4521", type: "task" },
  ];

  return (
    <WidgetCard title="My Schedule" icon="fas fa-calendar">
      <div className="space-y-3">
        {scheduleItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-blue-600 w-20">{item.time}</div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-500 capitalize">{item.type}</div>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
