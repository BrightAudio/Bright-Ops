'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FaBoxes,
  FaClipboardList,
  FaUsers,
  FaCalendarAlt,
  FaHome,
  FaFileInvoiceDollar,
  FaUndoAlt,
  FaChevronDown,
  FaChevronRight,
  FaBriefcase,
  FaEnvelope,
  FaChartLine,
  FaCog,
  FaPlayCircle,
  FaShieldAlt,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number | null;
};

type MenuSection = {
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
};

const topItems: MenuItem[] = [
  { label: 'Home Base', href: '/app', icon: <FaHome /> },
  { label: 'Jobs', href: '/app/jobs', icon: <FaCalendarAlt /> },
  { label: 'Warehouse', href: '/app/warehouse', icon: <FaBoxes /> },
  { label: 'Pull Sheets', href: '/app/warehouse/pull-sheets', icon: <FaClipboardList /> },
  { label: 'Returns', href: '/app/warehouse/returns', icon: <FaUndoAlt /> },
  { label: 'Invoices', href: '/app/invoices', icon: <FaFileInvoiceDollar /> },
  { label: 'Crew Planner', href: '/app/crew-planner', icon: <FaCalendarAlt /> },
  { label: 'Team', href: '/app/settings/home-base', icon: <FaUsers /> },
];

const workSection: MenuSection = {
  label: 'Work',
  icon: <FaBriefcase />,
  items: [
    { label: 'Leads Dashboard', href: '/app/dashboard/leads', icon: <FaChartLine /> },
    { label: 'Imported Leads', href: '/app/dashboard/leads/imported', icon: <FaUsers /> },
    { label: 'Interested Leads', href: '/app/dashboard/leads/interested', icon: <FaUsers /> },
    { label: 'Converted Clients', href: '/app/dashboard/leads/converted', icon: <FaUsers /> },
    { label: 'Archived Leads', href: '/app/dashboard/leads/archived', icon: <FaUsers /> },
    { label: 'Meeting Calendar', href: '/app/dashboard/calendar', icon: <FaCalendarAlt /> },
    { label: 'Email Campaigns', href: '/app/dashboard/leads/campaigns', icon: <FaEnvelope /> },
    { label: 'Training', href: '/app/dashboard/leads/training', icon: <FaPlayCircle /> },
    { label: 'Security Guide', href: '/app/dashboard/leads/security-guide', icon: <FaShieldAlt /> },
    { label: 'Lead Settings', href: '/app/dashboard/leads/settings', icon: <FaCog /> },
  ],
};

export default function AppSidebar() {
  const pathname = usePathname() || '';
  const [workExpanded, setWorkExpanded] = useState(
    pathname.includes('/dashboard/leads') || 
    pathname.includes('/dashboard/calendar') ||
    pathname.includes('/dashboard/imported')
  );
  const [organizationPlan, setOrganizationPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganizationPlan() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('plan')
            .eq('id', profile.organization_id)
            .single();

          setOrganizationPlan(org?.plan || 'starter');
        }
      } catch (error) {
        console.error('Error fetching organization plan:', error);
        setOrganizationPlan('starter');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizationPlan();
  }, []);

  // Gate Leads feature to Enterprise users only
  const isEnterpriseUser = organizationPlan === 'enterprise';

  // Filter Leads items - only show for Enterprise tier
  const filteredLeadsItems = isEnterpriseUser ? workSection.items : workSection.items.filter(
    item => !item.href.includes('/dashboard/leads')
  );

  // Get tier badge color and label
  const getTierBadge = () => {
    switch (organizationPlan) {
      case 'enterprise':
        return { label: '✨ Enterprise', color: '#b45309', bg: 'rgba(180, 83, 9, 0.1)' };
      case 'pro':
        return { label: '⭐ Pro', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' };
      default:
        return { label: '🚀 Starter', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  const tierBadge = getTierBadge();

  return (
    <aside className="app-sidebar">
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div style={{ width:36, height:36 }} className="rounded-md bg-[var(--primary-blue-500)] flex items-center justify-center text-white font-bold">BA</div>
          <div>
            <div className="text-sm font-semibold">Bright Audio</div>
            <div style={{ 
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              color: tierBadge.color,
              backgroundColor: tierBadge.bg,
              fontWeight: '600',
              marginTop: '2px',
              display: 'inline-block'
            }}>
              {tierBadge.label}
            </div>
          </div>
        </div>

        <nav>
          {/* Top-level items */}
          {topItems.map((it) => {
            const active = pathname.startsWith(it.href) && pathname === it.href;
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

          {/* Work Section (Collapsible) - Gated to Enterprise */}
          {isEnterpriseUser && (
            <div className="mt-2">
              <button
                onClick={() => setWorkExpanded(!workExpanded)}
                className={`sidebar-item w-full ${pathname.includes('/dashboard/leads') ? 'active' : ''}`}
              >
                <div className="icon" aria-hidden>
                  {workSection.icon}
                </div>
                <span>{workSection.label}</span>
                <div className="ml-auto">
                  {workExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </div>
              </button>
              
              {workExpanded && (
                <div className="ml-4">
                  {filteredLeadsItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`}>
                        <div className="icon" aria-hidden>
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                        {item.badge ? <div className="ml-auto badge">{item.badge}</div> : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
