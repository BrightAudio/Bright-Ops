'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaBoxes,
  FaClipboardList,
  FaUsers,
  FaCalendarAlt,
  FaHome,
  FaFileInvoiceDollar,
} from 'react-icons/fa';

type Item = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number | null;
};

const items: Item[] = [
  { label: 'Home Base', href: '/app', icon: <FaHome /> },
  { label: 'Jobs', href: '/app/jobs', icon: <FaCalendarAlt /> },
  { label: 'Warehouse', href: '/app/warehouse', icon: <FaBoxes /> },
  { label: 'Pull Sheets', href: '/app/warehouse/pull-sheets', icon: <FaClipboardList /> },
  { label: 'Invoices', href: '/app/invoices', icon: <FaFileInvoiceDollar /> },
  { label: 'Crew Planner', href: '/app/crew-planner', icon: <FaCalendarAlt /> },
  { label: 'Team', href: '/app/settings/home-base', icon: <FaUsers /> },
];

export default function AppSidebar() {
  const pathname = usePathname() || '';
  return (
    <aside className="app-sidebar">
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div style={{ width:36, height:36 }} className="rounded-md bg-[var(--primary-blue-500)] flex items-center justify-center text-white font-bold">BA</div>
          <div>
            <div className="text-sm font-semibold">Bright Audio</div>
            <div className="text-xs text-[var(--muted)]">Home Base</div>
          </div>
        </div>

        <nav>
          {items.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href} className={`sidebar-item ${active ? 'active' : ''}`}>
                <div className="icon" aria-hidden>
                  {it.icon}
                </div>
                <span>{it.label}</span>
                {it.badge ? <div className="ml-auto badge">{it.badge}</div> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
