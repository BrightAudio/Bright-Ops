"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Dashboard",
    links: [
      { label: "Overview", href: "/", icon: "fas fa-home" },
    ],
  },
  {
    label: "Work",
    links: [
      { label: "Projects", href: "/jobs", icon: "fas fa-briefcase" },
      { label: "Crew planner", href: "/crew", icon: "fas fa-users" },
      { label: "Shortages", href: "/shortages", icon: "fas fa-exclamation-triangle" },
      { label: "Financial", href: "/financial", icon: "fas fa-dollar-sign" },
    ],
  },
  {
    label: "Equipment",
    links: [
      { label: "Equipment", href: "/inventory", icon: "fas fa-box" },
      { label: "Serial numbers", href: "/inventory/serial", icon: "fas fa-barcode" },
      { label: "Stock locations", href: "/inventory/locations", icon: "fas fa-warehouse" },
      { label: "Archived equipment", href: "/inventory/archived", icon: "fas fa-archive" },
    ],
  },
  {
    label: "People",
    links: [
      { label: "Contacts", href: "/contacts", icon: "fas fa-address-book" },
      { label: "Crew members", href: "/crew-members", icon: "fas fa-user-friends" },
    ],
  },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-[260px] bg-white border-r border-gray-200 flex flex-col shadow-sm sticky top-0 left-0 z-30">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 shadow-sm mr-2" />
        <span className="text-xl font-extrabold tracking-tight text-blue-600">Bright Ops</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="text-xs font-bold uppercase text-gray-500 px-3 mb-2 tracking-wider">
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
                        "block px-4 py-2 rounded-lg font-medium transition-all border border-transparent",
                        active
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <i className={`${link.icon} w-5 mr-3`}></i>
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
