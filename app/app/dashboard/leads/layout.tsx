'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { FaChartLine, FaEnvelope, FaCog, FaSignOutAlt, FaUser, FaDollarSign, FaComments } from 'react-icons/fa';

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organizationPlan, setOrganizationPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Check organization tier - Leads is Enterprise only
  useEffect(() => {
    if (!loading && user) {
      checkOrganizationPlan();
    }
  }, [user, loading]);

  async function checkOrganizationPlan() {
    try {
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

        const plan = org?.plan || 'starter';
        setOrganizationPlan(plan);

        // Redirect if not enterprise
        if (plan !== 'enterprise') {
          console.log(`❌ Leads requires enterprise tier. Current plan: ${plan}`);
          router.push('/app');
        } else {
          console.log('✅ Enterprise plan confirmed. Leads access granted.');
        }
      }
    } catch (error) {
      console.error('Error checking organization plan:', error);
      router.push('/app');
    }
  }

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login?redirectTo=/app/dashboard/leads');
    } else {
      setUser(session.user);
      // Load user profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      setProfile(profileData);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading Leads Portal...</div>
      </div>
    );
  }

  const menuItems = [
    { href: '/app/dashboard/leads', icon: <FaChartLine />, label: 'Dashboard' },
    { href: '/app/dashboard/leads/chat', icon: <FaComments />, label: 'Chat' },
    { href: '/app/dashboard/leads/campaigns', icon: <FaEnvelope />, label: 'Email Campaigns' },
    { href: '/app/dashboard/leads/financing', icon: <FaDollarSign />, label: 'Financing' },
    { href: '/app/dashboard/leads/settings', icon: <FaCog />, label: 'Settings' },
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#1a1a1a',
      overflow: 'hidden'
    }}>
      {/* Vertical Top Menu Bar */}
      <div style={{
        width: '100%',
        height: '60px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000
      }}>
        {/* Logo/Title */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '28px',
          fontWeight: 700,
          color: 'white',
          letterSpacing: '1px',
          marginRight: '3rem'
        }}>
          LEADS
        </div>

        {/* Horizontal Navigation */}
        <nav style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Back to Warehouse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.push('/app/settings/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'white',
              fontSize: '14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <FaUser />
            <span>{profile?.full_name || user?.email?.split('@')[0] || 'User'}</span>
          </button>
          <button
            onClick={() => router.push('/app/warehouse')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            <FaSignOutAlt />
            <span>Back to Warehouse</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginTop: '60px',
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
}
