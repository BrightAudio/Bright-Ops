"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

const actions = [
  { label: "Jobs", href: "/app/jobs" },
  { label: "Free Scan (In)", href: "/app/warehouse/scan-in" },
  { label: "Returns", href: "/app/warehouse/returns" },
  { label: "Pull Sheets", href: "/app/warehouse/pull-sheets" },
  { label: "Transports", href: "/app/warehouse/transports" },
  { label: "Scheduled Crew", href: "/app/warehouse/scheduled-crew" },
  { label: "Crew Portal", href: "/app/crew/portal" },
  { label: "Training", href: "/app/settings/training" },
  { label: "Archived Jobs", href: "/app/archive/jobs" },
];

export default function WarehouseIndex() {
  return (
    <DashboardLayout>
      <div style={{ padding: '1.5rem' }}>
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: 600, 
          color: 'var(--color-text-main)', 
          marginBottom: '1.5rem' 
        }}>
          Warehouse
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-lg font-semibold text-slate-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
