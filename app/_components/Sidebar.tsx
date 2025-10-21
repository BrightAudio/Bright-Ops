"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  ScanLine,
  ClipboardList,
  Truck,
  Users
} from "lucide-react";

const warehouseLinks = [
  { label: "Jobs", href: "/jobs", icon: <Package className="w-4 h-4 mr-2" /> },
  { label: "Free Scan (In)", href: "/warehouse/scan-in", icon: <ScanLine className="w-4 h-4 mr-2" /> },
  { label: "Return Manifest", href: "/warehouse/return-manifest", icon: <ClipboardList className="w-4 h-4 mr-2" /> },
  { label: "Transports", href: "/warehouse/transports", icon: <Truck className="w-4 h-4 mr-2" /> },
  { label: "Scheduled Crew", href: "/warehouse/scheduled-crew", icon: <Users className="w-4 h-4 mr-2" /> },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {

  const pathname = usePathname();
  const warehouseKey = "sidebar:warehouseOpen";
  const firstLoad = useRef(true);
  const [warehouseOpen, setWarehouseOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(warehouseKey);
      if (stored !== null) return stored === "true";
    }
    return false;
  });

  // Persist expand/collapse in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(warehouseKey, String(warehouseOpen));
    }
  }, [warehouseOpen]);

  // Expand warehouse if on /warehouse route
  useEffect(() => {
    if (pathname.startsWith("/warehouse")) {
      setWarehouseOpen(true);
    }
    // On first load, if localStorage is set, don't override
    if (firstLoad.current) {
      firstLoad.current = false;
    }
  }, [pathname]);

  // Keyboard support for toggling warehouse section
  function handleWarehouseKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setWarehouseOpen((open) => !open);
    }
  }

  return (
    <aside className="h-screen w-[260px] bg-[#0c0d10] border-r border-white/10 flex flex-col shadow-lg sticky top-0 left-0 z-30 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <span className="inline-block w-3 h-3 rounded-full bg-amber-400 shadow-amber-400/40 shadow mr-2" />
        <span className="text-xl font-extrabold tracking-tight text-amber-400">Bright Ops</span>
      </div>
  <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* Dashboard */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase text-white/40 px-3 mb-2 tracking-wider">Dashboard</div>
          <ul className="space-y-1">
            <li>
              <Link
                href="/"
                className={classNames(
                  "block px-4 py-2 rounded-lg font-medium transition-all border-l-4 border-transparent transition-all",
                  pathname === "/" &&
                    "bg-amber-400/20 text-amber-200 border-amber-400"
                )}
              >
                <Home className="w-4 h-4 mr-2 inline" /> Overview
              </Link>
            </li>
          </ul>
        </div>
        {/* Warehouse (collapsible) */}
        <div className="mb-6">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase text-white/40 tracking-wider hover:text-amber-300 focus:outline-none"
            onClick={() => setWarehouseOpen((open) => !open)}
            onKeyDown={handleWarehouseKey}
            aria-expanded={warehouseOpen}
            tabIndex={0}
            aria-controls="sidebar-warehouse-list"
          >
            <span>Warehouse</span>
            <svg
              className={classNames(
                "w-4 h-4 ml-2 transition-transform",
                warehouseOpen ? "rotate-90 text-amber-300" : "text-white/30"
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <ul
            id="sidebar-warehouse-list"
            className={classNames(
              "space-y-1 mt-2 overflow-hidden transition-all duration-300",
              warehouseOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
            aria-hidden={!warehouseOpen}
          >
            {warehouseLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={classNames(
                      "flex items-center px-4 py-2 rounded-lg font-medium transition-all border-l-4 border-transparent",
                      isActive &&
                        "bg-amber-400/20 text-amber-200 border-amber-400"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        {/* Equipment */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase text-white/40 px-3 mb-2 tracking-wider">Equipment</div>
          <ul className="space-y-1">
            <li>
              <Link
                href="/inventory"
                className={classNames(
                  "block px-4 py-2 rounded-lg font-medium transition-all border border-transparent",
                  (pathname === "/inventory" || pathname.startsWith("/inventory/")) &&
                    "bg-amber-400/20 text-amber-200 border-amber-400/30"
                )}
              >
                Equipment
              </Link>
            </li>
          </ul>
        </div>
        {/* People */}
        <div className="mb-6">
          <div className="text-xs font-bold uppercase text-white/40 px-3 mb-2 tracking-wider">People</div>
          <ul className="space-y-1">
            <li>
              <Link
                href="/contacts"
                className={classNames(
                  "block px-4 py-2 rounded-lg font-medium transition-all border border-transparent",
                  (pathname === "/contacts" || pathname.startsWith("/contacts/")) &&
                    "bg-amber-400/20 text-amber-200 border-amber-400/30"
                )}
              >
                Contacts
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
