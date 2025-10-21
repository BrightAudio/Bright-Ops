"use client";

import { useState } from "react";

interface ItemRow {
  code: string;
  name: string;
  expected: number;
  returned: number;
  notes: string;
}

const mockItems: ItemRow[] = [
  { code: "EQ-1001", name: "LED Panel", expected: 4, returned: 0, notes: "" },
  { code: "EQ-1002", name: "Speaker Stand", expected: 6, returned: 0, notes: "" },
  { code: "EQ-1003", name: "Wireless Mic", expected: 2, returned: 0, notes: "" },
];

export default function ReturnManifest() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<ItemRow[]>(mockItems);

  function markAllReturned() {
    setItems(items.map(item => ({ ...item, returned: item.expected })));
  }

  function handleReturnedChange(idx: number, value: number) {
    setItems(items =>
      items.map((item, i) =>
        i === idx ? { ...item, returned: Math.max(0, Math.min(item.expected, value)) } : item
      )
    );
  }

  function handleNotesChange(idx: number, value: string) {
    setItems(items =>
      items.map((item, i) =>
        i === idx ? { ...item, notes: value } : item
      )
    );
  }

  function saveManifest() {
    // No backend, just a placeholder
    alert("Manifest saved (state only)");
  }

  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8">Return Manifest</h1>
      <form className="flex flex-col md:flex-row gap-4 mb-8 items-end">
        <div className="flex flex-col">
          <label htmlFor="search" className="text-sm mb-1 text-white/70">Job Code or Project</label>
          <input
            id="search"
            type="text"
            className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
            placeholder="Search by job code or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="date" className="text-sm mb-1 text-white/70">Return Date</label>
          <input
            id="date"
            type="date"
            className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="bg-amber-400/90 hover:bg-amber-400 text-[#0c0d10] font-semibold px-6 py-2 rounded-lg shadow transition-colors border border-amber-400/30 mt-4 md:mt-0"
          onClick={markAllReturned}
        >
          Mark All Returned
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20]">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-white/70 text-sm">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Expected Qty</th>
              <th className="px-4 py-3">Returned Qty</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/40">No items found.</td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.code} className="border-t border-white/10">
                  <td className="px-4 py-3 font-mono text-amber-200">{item.code}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.expected}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={item.expected}
                      className="w-20 bg-[#23242a] border border-white/10 rounded px-2 py-1 text-white text-center focus:outline-none focus:border-amber-400"
                      value={item.returned}
                      onChange={e => handleReturnedChange(idx, Number(e.target.value))}
                      aria-label={`Returned quantity for ${item.code}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-40 bg-[#23242a] border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-400"
                      value={item.notes}
                      onChange={e => handleNotesChange(idx, e.target.value)}
                      aria-label={`Notes for ${item.code}`}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-8">
        <button
          type="button"
          className="bg-amber-400/90 hover:bg-amber-400 text-[#0c0d10] font-semibold px-8 py-3 rounded-lg shadow transition-colors border border-amber-400/30"
          onClick={saveManifest}
        >
          Save Manifest
        </button>
      </div>
    </main>
  );
}
