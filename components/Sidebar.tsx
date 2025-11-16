"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Dashboard",
    links: [
      { label: "Overview", href: "/app", icon: "fas fa-home" },
    ],
  },
  {
    label: "Work",
    links: [
      { label: "Projects", href: "/app/jobs", icon: "fas fa-briefcase" },
      { label: "Crew planner", href: "/app/crew", icon: "fas fa-users" },
      { label: "Shortages", href: "/app/shortages", icon: "fas fa-exclamation-triangle" },
      { label: "Financial", href: "/app/financial", icon: "fas fa-dollar-sign" },
    ],
  },
  {
    label: "Equipment",
    links: [
      { label: "Equipment", href: "/app/inventory", icon: "fas fa-box" },
      { label: "Serial numbers", href: "/app/inventory/serial", icon: "fas fa-barcode" },
      { label: "Stock locations", href: "/app/inventory/locations", icon: "fas fa-warehouse" },
      { label: "Archived equipment", href: "/app/inventory/archived", icon: "fas fa-archive" },
    ],
  },
  {
    label: "Warehouse",
    links: [
      { label: "Overview", href: "/app/warehouse", icon: "fas fa-warehouse" },
      { label: "Pull sheets", href: "/app/warehouse/pull-sheets", icon: "fas fa-clipboard-list" },
      { label: "Transports", href: "/app/warehouse/transports", icon: "fas fa-truck" },
      { label: "Returns", href: "/app/warehouse/returns", icon: "fas fa-undo" },
    ],
  },
  {
    label: "People",
    links: [
      { label: "Contacts", href: "/app/contacts", icon: "fas fa-address-book" },
      { label: "Crew members", href: "/app/crew-members", icon: "fas fa-user-friends" },
    ],
  },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 shadow-sm mr-2" />
        <span className="text-xl font-extrabold tracking-tight text-white">Bright Ops</span>
      </div>
      <div className="flex-1 overflow-y-auto px-0 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="text-xs font-bold uppercase text-gray-400 px-4 mb-2 tracking-wider">
              {section.label}
            </div>
            <ul className="nav-list">
              {section.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={classNames(
                        "nav-item",
                        active && "active"
                      )}
                    >
                      <i className={`${link.icon}`}></i>
                      <span className="nav-label">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
