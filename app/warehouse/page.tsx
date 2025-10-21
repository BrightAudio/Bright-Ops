"use client";

import Link from "next/link";

const actions = [
  { label: "Jobs", href: "/jobs" },
  { label: "Free Scan (In)", href: "/warehouse/scan-in" },
  { label: "Return Manifest", href: "/warehouse/return-manifest" },
  { label: "Transports", href: "/warehouse/transports" },
  { label: "Scheduled Crew", href: "/warehouse/scheduled-crew" },
];

export default function WarehouseIndex() {
  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-10">Warehouse</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center justify-center bg-[#181a20] border border-white/10 rounded-xl p-8 shadow text-lg font-semibold text-white hover:border-amber-400 hover:bg-amber-400/20 hover:text-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
