"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileDropdown from "./ProfileDropdown";
import { logoutAction } from "@/app/actions/auth";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "WORK",
    items: [
      { href: "/app/jobs", icon: "fa-calendar-alt", label: "Projects" },
      { href: "/app/warehouse/pull-sheets", icon: "fa-clipboard-list", label: "Pull Sheets" },
      { href: "/app/warehouse/scheduled-crew", icon: "fa-user-clock", label: "Crew Planner" },
      { href: "/app/warehouse/transports", icon: "fa-truck", label: "Transports" },
      { href: "/app/warehouse", icon: "fa-warehouse", label: "Warehouse" },
      { href: "/app/warehouse/shortages", icon: "fa-exclamation-triangle", label: "Shortages" },
      { href: "/app/financial", icon: "fa-dollar-sign", label: "Financial" },
    ],
  },
  {
    title: "EQUIPMENT",
    items: [
      { href: "/app/inventory", icon: "fa-boxes", label: "Serial Numbers" },
      { href: "/app/inventory/locations", icon: "fa-map-marker-alt", label: "Stock Locations" },
      { href: "/app/inventory/archived", icon: "fa-archive", label: "Archived Equipment" },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { href: "/app/clients", icon: "fa-users", label: "Contacts" },
      { href: "/app/crew", icon: "fa-user-friends", label: "Crew Members" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavClick = () => {
    // Collapse sidebar after clicking a nav item
    setSidebarCollapsed(true);
  };

  const handleMouseEnter = () => {
    setSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    setSidebarHovered(false);
  };

  // Sidebar is expanded if manually toggled open OR if being hovered
  const isExpanded = !sidebarCollapsed || sidebarHovered;

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="left-section">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>
          <div className="app-title">Bright Ops</div>
        </div>

        <div className="right-actions">
          <button className="icon-btn" aria-label="Search">
            <i className="fas fa-search"></i>
          </button>
          <button className="icon-btn" aria-label="Notifications">
            <i className="fas fa-bell"></i>
          </button>
          <button className="icon-btn" aria-label="Help">
            <i className="fas fa-question-circle"></i>
          </button>
          
          {/* Inline Profile Dropdown - TESTING */}
          <div style={{ position: 'relative' }}>
            <button 
              className="user-menu" 
              onClick={(e) => {
                console.log("Clicking profile! Current state:", profileOpen);
                setProfileOpen(!profileOpen);
              }}
              type="button"
              id="profile-button"
            >
              <div className="avatar">BA</div>
              <i className={`fas fa-chevron-${profileOpen ? "up" : "down"}`}></i>
            </button>

            {profileOpen && (
              <div 
                style={{
                  position: 'fixed',
                  top: '60px',
                  right: '20px',
                  backgroundColor: '#363839',
                  color: '#ffffff',
                  padding: '0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  minWidth: '260px',
                  zIndex: 10000,
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(19, 124, 251, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="avatar-large" style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      background: '#137CFB', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.125rem'
                    }}>BA</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Bright Audio</div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.7)' }}>admin@brightaudio.com</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '0.25rem 0' }}>
                  <Link 
                    href="/app/settings/account"
                    onClick={() => setProfileOpen(false)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.625rem 1rem', 
                      color: 'rgba(255, 255, 255, 0.85)', 
                      textDecoration: 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <i className="fas fa-user-circle" style={{ width: '1.125rem', textAlign: 'center' }}></i>
                    <span>Account Settings</span>
                  </Link>
                  
                  <Link 
                    href="/app/crew"
                    onClick={() => setProfileOpen(false)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.625rem 1rem', 
                      color: 'rgba(255, 255, 255, 0.85)', 
                      textDecoration: 'none',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <i className="fas fa-users" style={{ width: '1.125rem', textAlign: 'center' }}></i>
                    <span>Employees</span>
                  </Link>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.25rem 0' }}>
                  <button 
                    onClick={async () => {
                      setProfileOpen(false);
                      await logoutAction();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      padding: '0.625rem 1rem', 
                      color: '#FC3668',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(252, 54, 104, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <i className="fas fa-sign-out-alt" style={{ width: '1.125rem', textAlign: 'center' }}></i>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Area: Sidebar + Content */}
      <div className="main-area">
        {/* Sidebar Navigation */}
        <nav 
          className={`sidebar ${isExpanded ? "" : "collapsed"}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="sidebar-header">
            <div className="sidebar-logo">
              {isExpanded ? "Bright Ops" : "BO"}
            </div>
          </div>

          <div className="sidebar-nav">
            {/* Overview - Top level item */}
            <ul className="nav-list" style={{ marginBottom: '1.5rem' }}>
              <li className={`nav-item ${pathname === '/app/dashboard' || pathname === '/app' ? 'active' : ''}`}>
                <Link href="/app/dashboard" className="sidebar-nav-item" onClick={handleNavClick}>
                  <i className="fas fa-th-large nav-icon"></i>
                  {isExpanded && <span className="nav-label">Overview</span>}
                </Link>
              </li>
            </ul>

            {/* Sections with headers */}
            {navSections.map((section) => (
              <div key={section.title} className="nav-section">
                {isExpanded && (
                  <div className="nav-section-title">{section.title}</div>
                )}
                <ul className="nav-list">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
                        <Link href={item.href} className="sidebar-nav-item" onClick={handleNavClick}>
                          <i className={`fas ${item.icon} nav-icon`}></i>
                          {isExpanded && <span className="nav-label">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Dashboard Content Area */}
        <section className="dashboard-content">{children}</section>
      </div>
    </div>
  );
}
