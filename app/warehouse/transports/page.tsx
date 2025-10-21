"use client";

import { useState } from "react";

const warehouses = ["Main", "Annex", "Remote"];
const vehicles = ["Truck 1", "Truck 2", "Van"];
const statuses = ["Planned", "En route", "Delivered"];

const mockTransports = [
  {
    vehicle: "Truck 1",
    driver: "A. Smith",
    job: "Show 2025-10-22",
    loadout: "2025-10-21 08:00",
    depart: "2025-10-21 09:00",
    arrive: "2025-10-21 11:00",
    status: "Planned",
  },
  {
    vehicle: "Van",
    driver: "B. Jones",
    job: "Expo 2025-10-23",
    loadout: "2025-10-22 13:00",
    depart: "2025-10-22 14:00",
    arrive: "2025-10-22 16:00",
    status: "En route",
  },
  {
    vehicle: "Truck 2",
    driver: "C. Lee",
    job: "Festival 2025-10-24",
    loadout: "2025-10-23 07:00",
    depart: "2025-10-23 08:00",
    arrive: "2025-10-23 10:30",
    status: "Delivered",
  },
];

function statusColor(status: string) {
  switch (status) {
    case "Planned":
      return "bg-amber-400/20 text-amber-200 border-amber-400/30";
    case "En route":
      return "bg-blue-400/20 text-blue-200 border-blue-400/30";
    case "Delivered":
      return "bg-green-400/20 text-green-200 border-green-400/30";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

export default function Transports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("");

  // Filter logic (simple, for demo)
  const filtered = mockTransports.filter(t =>
    (!warehouse || t.vehicle.includes(warehouse)) &&
    (!vehicle || t.vehicle === vehicle) &&
    (!status || t.status === status)
  );

  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold">Transports</h1>
        <button
          type="button"
          className="bg-amber-400/90 hover:bg-amber-400 text-[#0c0d10] font-semibold px-6 py-3 rounded-lg shadow transition-colors border border-amber-400/30"
        >
          + New Transport
        </button>
      </div>
      <form className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date From</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date To</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Warehouse</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
            <option value="">All</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Vehicle</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={vehicle} onChange={e => setVehicle(e.target.value)}>
            <option value="">All</option>
            {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Status</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20]">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-white/70 text-sm">
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Job/Show</th>
              <th className="px-4 py-3">Load-out</th>
              <th className="px-4 py-3">Depart</th>
              <th className="px-4 py-3">Arrive</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">No transports found.</td>
              </tr>
            ) : (
              filtered.map((t, idx) => (
                <tr key={idx} className="border-t border-white/10">
                  <td className="px-4 py-3">{t.vehicle}</td>
                  <td className="px-4 py-3">{t.driver}</td>
                  <td className="px-4 py-3">{t.job}</td>
                  <td className="px-4 py-3">{t.loadout}</td>
                  <td className="px-4 py-3">{t.depart}</td>
                  <td className="px-4 py-3">{t.arrive}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${statusColor(t.status)}`}>{t.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
