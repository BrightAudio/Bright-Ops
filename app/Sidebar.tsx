"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Dashboard",
    links: [
      { label: "Overview", href: "/app" },
    ],
  },
  {
    label: "Work",
    links: [
      { label: "Projects", href: "/app/jobs" },
      { label: "Crew planner", href: "/app/crew" },
      { label: "Shortages", href: "/app/shortages" },
      { label: "Financial", href: "/app/financial" },
    ],
  },
  {
    label: "Equipment",
    links: [
      { label: "Equipment", href: "/app/inventory" },
      { label: "Serial numbers", href: "/app/inventory/serial" },
      { label: "Stock locations", href: "/app/inventory/locations" },
      { label: "Archived equipment", href: "/app/inventory/archived" },
    ],
  },
  {
    label: "People",
    links: [
      { label: "Contacts", href: "/app/contacts" },
      { label: "Crew members", href: "/app/crew-members" },
    ],
  },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-[260px] bg-[#0b0b0c] border-r border-white/10 flex flex-col shadow-lg sticky top-0 left-0 z-30">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-amber-400/40 shadow mr-2" />
        <span className="text-xl font-extrabold tracking-tight text-amber-400">Bright Ops</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="text-xs font-bold uppercase text-white/40 px-3 mb-2 tracking-wider">
              {section.label}
            </div>
            <ul className="space-y-1">
              {section.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={classNames(
                        "block px-4 py-2 rounded-lg font-medium text-white/80 transition-all border border-transparent",
                        active &&
                          "bg-amber-400/10 border-amber-400 text-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.15)]"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
