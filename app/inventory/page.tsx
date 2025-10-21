"use client";

import { useState, useMemo } from "react";

const equipmentData = [
  { id: 1, code: "EQ-1001", name: "LED Panel", qty: 12, price: 45, cost: 30, type: "Lighting", tags: ["LED", "Panel"] },
  { id: 2, code: "EQ-1002", name: "Speaker Stand", qty: 24, price: 8, cost: 5, type: "Audio", tags: ["Stand"] },
  { id: 3, code: "EQ-1003", name: "Wireless Mic", qty: 6, price: 25, cost: 15, type: "Audio", tags: ["Wireless", "Mic"] },
  { id: 4, code: "EQ-1004", name: "Truss Segment", qty: 18, price: 12, cost: 9, type: "Rigging", tags: ["Truss"] },
];
const allTags = ["LED", "Panel", "Stand", "Wireless", "Mic", "Truss"];
const allTypes = ["Lighting", "Audio", "Rigging"];

export default function EquipmentPage() {
   const [search, setSearch] = useState("");
   const filtered = useMemo(() => {
     if (!search.trim()) return equipmentData;
     return equipmentData.filter((row: typeof equipmentData[number]) =>
       row.code.toLowerCase().includes(search.toLowerCase()) ||
       row.name.toLowerCase().includes(search.toLowerCase())
     );
   }, [search]);

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white/80 flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 tracking-tight">Equipment</h1>
            <div className="text-white/60 text-sm">All folders • Eastern Warehouse</div>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <button className="px-4 py-2 rounded-lg border border-white/10 text-white/70 bg-transparent hover:border-amber-400 hover:text-amber-300 transition-colors font-medium">Import</button>
            <button className="px-4 py-2 rounded-lg bg-amber-400 text-black font-semibold shadow hover:bg-amber-300 transition-colors border border-white/10">+ Add equipment</button>
          </div>
        </div>
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search code or name..."
            className="bg-[#111112] border border-white/10 rounded-xl px-4 py-2 text-white/90 focus:outline-none focus:border-amber-400 w-full md:w-64"
          />
          <button className="px-4 py-2 rounded-lg border border-white/10 text-white/70 bg-transparent hover:border-amber-400 hover:text-amber-300 transition-colors font-medium">Tags</button>
          <button className="px-4 py-2 rounded-lg border border-white/10 text-white/70 bg-transparent hover:border-amber-400 hover:text-amber-300 transition-colors font-medium">Filters</button>
          <span className="ml-auto text-white/40 text-xs font-semibold tracking-wider">Views</span>
        </div>
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111112]">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="p-3 text-left">
                  <input type="checkbox" className="accent-amber-400 w-4 h-4 rounded" />
                </th>
                <th className="p-3 text-left text-white/70 font-semibold">Code</th>
                <th className="p-3 text-left text-white/70 font-semibold">Name</th>
                <th className="p-3 text-right text-white/70 font-semibold">Current qty</th>
                <th className="p-3 text-right text-white/70 font-semibold">Rental/Sales price</th>
                <th className="p-3 text-right text-white/70 font-semibold">Subrent/purchase cost</th>
                <th className="p-3 text-left text-white/70 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
               {filtered.map((row: typeof equipmentData[number], i: number) => (
                 <tr
                   key={row.code}
                   className="border-t border-white/10 hover:bg-white/5 transition-colors"
                 >
                   <td className="p-3 text-left">
                     <input type="checkbox" className="accent-amber-400 w-4 h-4 rounded" />
                   </td>
                   <td className="p-3 text-left font-semibold text-amber-300">{row.code}</td>
                   <td className="p-3 text-left text-white/90">{row.name}</td>
                   <td className="p-3 text-right tabular-nums">{row.qty}</td>
                   <td className="p-3 text-right tabular-nums">${row.price.toFixed(2)}</td>
                   <td className="p-3 text-right tabular-nums">${row.cost.toFixed(2)}</td>
                   <td className="p-3 text-left text-white/80">{row.type}</td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
