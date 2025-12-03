"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "@/lib/contexts/LocationContext";
import LeadsPasswordPrompt from "@/components/LeadsPasswordPrompt";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  submenu?: NavItem[];
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
      { href: "/app/inventory/rigs", icon: "fa-layer-group", label: "Rig Containers" },
      { href: "/app/inventory/locations", icon: "fa-map-marker-alt", label: "Stock Locations" },
      { href: "/app/inventory/archived", icon: "fa-archive", label: "Archived Equipment" },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { href: "/app/clients", icon: "fa-users", label: "Contacts" },
      { href: "/app/crew", icon: "fa-user-friends", label: "Crew Members" },
      { href: "/app/venues", icon: "fa-building", label: "Venues" },
      { href: "/app/training", icon: "fa-graduation-cap", label: "Training Videos" },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showLeadsPassword, setShowLeadsPassword] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/app/dashboard/leads': pathname?.includes('/dashboard/leads') || false
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    link: string;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; company_name: string | null; email: string } | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | undefined>();
  const { notifications, markAsRead, markAllAsRead, hasUnread } = useNotifications(currentEmployeeId);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { currentLocation } = useLocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user profile (cached and optimized)
  useEffect(() => {
    let mounted = true;
    
    async function fetchUserProfile() {
      // Check cache first
      const cached = sessionStorage.getItem('user_profile');
      if (cached && mounted) {
        try {
          const profileData = JSON.parse(cached);
          setUserProfile(profileData);
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user || !mounted) return;
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, company_name')
          .eq('id', user.id)
          .maybeSingle();
          
        const profileData = {
          full_name: (profile as any)?.full_name || user.email?.split('@')[0] || 'User',
          company_name: (profile as any)?.company_name || null,
          email: user.email || ''
        };
        
        if (mounted) {
          setUserProfile(profileData);
          sessionStorage.setItem('user_profile', JSON.stringify(profileData));
        }

        // Fetch employee ID
        if (user.email && mounted) {
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (employee && mounted) {
            setCurrentEmployeeId(employee.id);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
    
    fetchUserProfile();
    return () => { mounted = false; };
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    if (profileOpen || searchOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen, searchOpen, notificationsOpen]);

  // Search functionality (debounced for performance)
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    
    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results: any[] = [];
        const query = searchQuery.toLowerCase();

        // Search jobs
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, name, job_id, status')
          .or(`name.ilike.%${query}%,job_id.ilike.%${query}%`)
          .limit(5);
        
        if (jobs && Array.isArray(jobs)) {
          jobs.forEach((job: any) => {
            results.push({
              type: 'job',
              id: job.id,
              title: job.name,
              subtitle: `Job ID: ${job.job_id}`,
              link: `/app/jobs/${job.id}`
            });
          });
        }

        // Search inventory items
        const { data: inventory } = await supabase
          .from('inventory_items')
          .select('id, name, barcode, gear_type')
          .or(`name.ilike.%${query}%,barcode.ilike.%${query}%,gear_type.ilike.%${query}%`)
          .limit(5);
        
        if (inventory && Array.isArray(inventory)) {
          inventory.forEach((item: any) => {
            results.push({
              type: 'inventory',
              id: item.id,
              title: item.name,
              subtitle: item.barcode ? `Barcode: ${item.barcode}` : `Type: ${item.gear_type || 'N/A'}`,
              link: `/app/inventory/${item.id}`
            });
          });
        }

        // Search clients
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, email')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);
        
        if (clients && Array.isArray(clients)) {
          clients.forEach((client: any) => {
            results.push({
              type: 'client',
              id: client.id,
              title: client.name,
              subtitle: client.email || '',
              link: `/app/clients/${client.id}`
            });
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNavClick = () => {
    // Collapse sidebar after clicking a nav item
    setSidebarCollapsed(true);
    // Close mobile menu
    setMobileMenuOpen(false);
  };

  const handleMouseEnter = () => {
    setSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    setSidebarHovered(false);
  };

  const handleLeadsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Check if user already has access in this session
    const hasAccess = sessionStorage.getItem('leadsAccess');
    if (hasAccess === 'granted') {
      window.location.href = '/app/dashboard/leads';
    } else {
      setShowLeadsPassword(true);
    }
  };

  // Sidebar is expanded if manually toggled open OR if being hovered
  const isExpanded = !sidebarCollapsed || sidebarHovered;

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="top-bar">
        <div className="left-section">
          {/* Desktop sidebar toggle */}
          <button
            className="sidebar-toggle hidden md:block"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          {/* Mobile menu toggle */}
          <button
            className="sidebar-toggle md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? '×' : '☰'}
          </button>
          <div className="app-title">Bright Ops</div>
        </div>

        <div className="right-actions">
          {/* Goals Portal Link */}
          <button 
            onClick={() => window.location.href = '/app/warehouse/financial/goals'}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '1px',
              textDecoration: 'none',
              padding: '0 1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            GOALS
          </button>

          {/* Leads Portal Link */}
          <button 
            onClick={handleLeadsClick}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '20px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '1px',
              textDecoration: 'none',
              padding: '0 1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: 'none',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            LEADS
          </button>

          {/* Location Indicator */}
          <Link 
            href="/app/inventory/locations"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors text-sm"
          >
            <span className="text-blue-400">📍</span>
            <span className="text-zinc-300">{currentLocation}</span>
          </Link>

          {/* Search Button */}
          <div style={{ position: 'relative' }} ref={searchRef}>
            <button 
              className="icon-btn" 
              aria-label="Search"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              🔍
            </button>

            {searchOpen && (
              <div style={{
                position: 'fixed',
                top: '60px',
                right: '250px',
                backgroundColor: '#363839',
                color: '#ffffff',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                minWidth: '400px',
                maxWidth: '500px',
                zIndex: 10000,
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                maxHeight: '500px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }}>Search</h3>
                  <input
                    type="text"
                    placeholder="Search jobs, inventory, contacts..."
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        // Force immediate search on Enter (bypassing debounce)
                        e.preventDefault();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      backgroundColor: '#2a2b2c',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                
                {searchQuery.trim() && (
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                    {searchLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa' }}>Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa' }}>No results found</div>
                    ) : (
                      <div>
                        {searchResults.map((result) => (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={result.link}
                            onClick={() => setSearchOpen(false)}
                            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                          >
                            <div style={{
                              padding: '0.75rem',
                              borderRadius: '6px',
                              marginBottom: '0.5rem',
                              cursor: 'pointer',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                            >
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                                {result.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                {result.subtitle}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                                {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {!searchQuery.trim() && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <p style={{ margin: 0 }}>Quick tips:</p>
                    <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                      <li>Search by job ID, name, or status</li>
                      <li>Search inventory by name, barcode, or category</li>
                      <li>Search contacts by name or email</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications Button */}
          <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button 
              className="icon-btn" 
              aria-label="Notifications"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              🔔
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#FC3668',
                  borderRadius: '50%',
                  border: '2px solid #1a1b1e'
                }}></span>
              )}
            </button>

            {notificationsOpen && (
              <div style={{
                position: 'fixed',
                top: '60px',
                right: '150px',
                backgroundColor: '#363839',
                color: '#ffffff',
                padding: '0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                minWidth: '350px',
                maxWidth: '400px',
                zIndex: 10000,
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#363839',
                  zIndex: 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Notifications</h3>
                    <button
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#137CFB',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                      onClick={markAllAsRead}
                    >
                      Mark all read
                    </button>
                  </div>
                </div>

                <div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#aaa' }}>No notifications</div>
                  ) : (
                    notifications.map((notification) => {
                      const { type, title, message, timestamp, link, id } = notification;
                      let icon = "fas fa-info-circle";
                      let color = "#6B7280";
                      if (type === "pull_sheet") { icon = "fas fa-clipboard-list"; color = "#137CFB"; }
                      if (type === "job_assignment") { icon = "fas fa-briefcase"; color = "#10B981"; }
                      if (type === "job_update") { icon = "fas fa-calendar-check"; color = "#F59E0B"; }
                      if (type === "system") { icon = "fas fa-bell"; color = "#8B5CF6"; }
                      return link ? (
                        <Link
                          key={id}
                          href={link}
                          onClick={() => { setNotificationsOpen(false); markAsRead(id); }}
                          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                        >
                          <div style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            backgroundColor: 'rgba(19, 124, 251, 0.05)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(19, 124, 251, 0.05)'}
                          >
                            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <i className={icon} style={{ color: '#fff', fontSize: '0.875rem' }}></i>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                                  {title}
                                  <span style={{ marginLeft: '8px', display: 'inline-block', width: '8px', height: '8px', background: '#137CFB', borderRadius: '50%' }}></span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                  {message}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                                  {typeof timestamp === 'string' ? timestamp : new Date(timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div
                          key={id}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: 'default',
                            backgroundColor: 'rgba(19, 124, 251, 0.05)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <i className={icon} style={{ color: '#fff', fontSize: '0.875rem' }}></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                                {title}
                                <span style={{ marginLeft: '8px', display: 'inline-block', width: '8px', height: '8px', background: '#137CFB', borderRadius: '50%' }}></span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                {message}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.25rem' }}>
                                {typeof timestamp === 'string' ? timestamp : new Date(timestamp).toLocaleString()}
                              </div>
                              <button
                                onClick={() => markAsRead(id)}
                                style={{ fontSize: '0.75rem', color: '#137CFB', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}
                              >
                                Mark as read
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <Link
                      href="/app/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      style={{
                        color: '#137CFB',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            className="icon-btn" 
            aria-label="Help"
            onClick={() => window.location.href = '/app/help'}
          >
            <i className="fas fa-question-circle"></i>
          </button>
          
          {/* Inline Profile Dropdown - TESTING */}
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button 
              className="user-menu" 
              onClick={() => {
                console.log("Clicking profile! Current state:", profileOpen);
                setProfileOpen(!profileOpen);
              }}
              type="button"
              id="profile-button"
            >
              <div className="avatar">
                {userProfile?.full_name ? 
                  userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
                  'BA'}
              </div>
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
                    }}>
                      {userProfile?.full_name ? 
                        userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 
                        'BA'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {userProfile?.full_name || 'User'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {userProfile?.email || 'user@example.com'}
                      </div>
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
                    href="/app/settings/payments"
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
                    <i className="fas fa-credit-card" style={{ width: '1.125rem', textAlign: 'center' }}></i>
                    <span>Payment Settings</span>
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
        {/* Mobile Sidebar Overlay */}
        <div 
          className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        ></div>

        {/* Sidebar Navigation */}
        <nav 
          className={`sidebar ${isExpanded ? "" : "collapsed"} ${mobileMenuOpen ? 'open' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="sidebar-header">
            <div className="sidebar-logo">
              {isExpanded ? "Bright Ops" : "BO"}
            </div>
            {/* Close button for mobile - only show when mobile menu is open */}
            {mobileMenuOpen && (
              <button 
                className="md:hidden p-2 text-white hover:bg-white/10 rounded"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            )}
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
                    const hasSubmenu = item.submenu && item.submenu.length > 0;
                    const isSubmenuExpanded = expandedMenus[item.href] || false;
                    
                    return (
                      <li key={item.href}>
                        <div className={`nav-item ${isActive ? "active" : ""}`} style={{ display: 'flex', alignItems: 'center' }}>
                          <Link href={item.href} className="sidebar-nav-item" onClick={handleNavClick} style={{ flex: 1 }}>
                            <i className={`fas ${item.icon} nav-icon`}></i>
                            {isExpanded && <span className="nav-label">{item.label}</span>}
                          </Link>
                          {hasSubmenu && isExpanded && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setExpandedMenus(prev => ({
                                  ...prev,
                                  [item.href]: !prev[item.href]
                                }));
                              }}
                              className="submenu-toggle"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: '0 8px',
                                marginLeft: 'auto'
                              }}
                            >
                              <i className={`fas fa-chevron-${isSubmenuExpanded ? 'down' : 'right'}`} style={{ fontSize: '10px' }}></i>
                            </button>
                          )}
                        </div>
                        {hasSubmenu && isExpanded && isSubmenuExpanded && (
                          <ul className="nav-submenu" style={{ paddingLeft: '2rem', marginTop: '0.25rem' }}>
                            {item.submenu!.map((subitem) => {
                              const isSubActive = pathname === subitem.href;
                              return (
                                <li key={subitem.href} className={`nav-item ${isSubActive ? "active" : ""}`}>
                                  <Link href={subitem.href} className="sidebar-nav-item" onClick={handleNavClick}>
                                    <i className={`fas ${subitem.icon} nav-icon`} style={{ fontSize: '12px' }}></i>
                                    {isExpanded && <span className="nav-label">{subitem.label}</span>}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
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

      {/* Leads Password Prompt */}
      {showLeadsPassword && (
        <LeadsPasswordPrompt onClose={() => setShowLeadsPassword(false)} />
      )}
    </div>
  );
}
