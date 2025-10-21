"use client";
import Link from "next/link";

type JobRow = {
  code: string;
  title: string;
  client: string;
  start: string;
  end: string;
  status: "Planned" | "Confirmed" | "Completed";
};

const DATA: JobRow[] = [
  { code: "JOB-2401", title: "Summer Fest FOH", client: "City Events", start: "2025-06-10", end: "2025-06-12", status: "Confirmed" },
  { code: "JOB-2402", title: "Corporate AV", client: "Apex Labs",   start: "2025-07-02", end: "2025-07-02", status: "Planned"   },
  { code: "JOB-2403", title: "Theatre Tour",  client: "Stage Co.",   start: "2025-07-14", end: "2025-07-20", status: "Completed" },
];

export function JobsTable() {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-white/70">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
            <th>Code</th>
            <th>Title</th>
            <th>Client</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-[#0f1013]">
          {DATA.map((row) => (
            <tr key={row.code} className="hover:bg-white/[0.04]">
              <td className="px-3 py-2 font-medium text-white">{row.code}</td>
              <td className="px-3 py-2">{row.title}</td>
              <td className="px-3 py-2">{row.client}</td>
              <td className="px-3 py-2">{row.start}</td>
              <td className="px-3 py-2">{row.end}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs border",
                    row.status === "Confirmed"
                      ? "border-amber-300 text-amber-200"
                      : row.status === "Completed"
                      ? "border-green-400 text-green-300"
                      : "border-white/20 text-white/70",
                  ].join(" ")}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 space-x-2">
                <Link href={`/prep-sheet/${row.code}`} className="text-blue-600 underline">Prep Sheet</Link>
                <Link href={`/return-manifest/${row.code}`} className="text-blue-600 underline">Return</Link>
                <Link href={`/transports/${row.code}`} className="text-blue-600 underline">Transports</Link>
              </td>
            </tr>
          ))}
          {DATA.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-white/60">
                No jobs yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
