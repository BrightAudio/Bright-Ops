"use client";

import { useState } from "react";

const roles = ["Audio", "Lighting", "Rigging", "Stagehand"];
const statuses = ["Confirmed", "Pending", "Declined"];

const mockCrew = [
  {
    name: "J. Carter",
    role: "Audio",
    start: "2025-10-21 08:00",
    end: "2025-10-21 18:00",
    job: "Show 2025-10-21",
    location: "Main Hall",
    status: "Confirmed",
  },
  {
    name: "L. Kim",
    role: "Lighting",
    start: "2025-10-21 09:00",
    end: "2025-10-21 17:00",
    job: "Show 2025-10-21",
    location: "Main Hall",
    status: "Pending",
  },
  {
    name: "M. Singh",
    role: "Stagehand",
    start: "2025-10-22 10:00",
    end: "2025-10-22 16:00",
    job: "Expo 2025-10-22",
    location: "Annex",
    status: "Confirmed",
  },
];

function statusColor(status: string) {
  switch (status) {
    case "Confirmed":
      return "bg-amber-400/20 text-amber-200 border-amber-400/30";
    case "Pending":
      return "bg-blue-400/20 text-blue-200 border-blue-400/30";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

function groupByDay(items: typeof mockCrew) {
  const days: Record<string, typeof mockCrew> = {};
  for (const item of items) {
    const day = item.start.split(" ")[0];
    if (!days[day]) days[day] = [];
    days[day].push(item);
  }
  return days;
}

export default function ScheduledCrew() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [role, setRole] = useState("");
  const [job, setJob] = useState("");
  const [crewData, setCrewData] = useState(mockCrew);

  // Filter logic (simple, for demo)
  const filtered = crewData.filter(c =>
    (!role || c.role === role) &&
    (!job || c.job.includes(job))
  );
  const grouped = groupByDay(filtered);

  function handleStatusChange(day: string, idx: number, newStatus: string) {
    setCrewData(prev => {
      const updated = [...prev];
      // Find the correct item by day and index
      const flatIdx = prev.findIndex(
        c => c.start.split(" ")[0] === day && grouped[day][idx] && c.name === grouped[day][idx].name
      );
      if (flatIdx !== -1) updated[flatIdx] = { ...updated[flatIdx], status: newStatus };
      return updated;
    });
  }

  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8">Scheduled Crew</h1>
      <form className="flex flex-wrap gap-4 mb-8 items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date From</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date To</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Role</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={role} onChange={e => setRole(e.target.value)}>
            <option value="">All</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Job</label>
          <input type="text" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={job} onChange={e => setJob(e.target.value)} placeholder="Job name/code..." />
        </div>
      </form>
      {Object.keys(grouped).length === 0 ? (
        <div className="text-white/40 text-center py-12">No crew scheduled for selected filters.</div>
      ) : (
        Object.entries(grouped).map(([day, crew]) => (
          <div key={day} className="mb-10">
            <div className="text-lg font-bold text-amber-300 mb-2">{new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20]">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-white/70 text-sm">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">End</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.map((c, idx) => (
                    <tr key={idx} className="border-t border-white/10">
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3">{c.role}</td>
                      <td className="px-4 py-3">{c.start.split(' ')[1]}</td>
                      <td className="px-4 py-3">{c.end.split(' ')[1]}</td>
                      <td className="px-4 py-3">{c.job}</td>
                      <td className="px-4 py-3">{c.location}</td>
                      <td className="px-4 py-3">
                        <select
                          className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${statusColor(c.status)} bg-transparent`}
                          value={c.status}
                          onChange={e => handleStatusChange(day, idx, e.target.value)}
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
