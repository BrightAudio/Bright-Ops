'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function OrganizationWidget() {
  const supabase = supabaseBrowser();
  
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>('');
  const [teamCount, setTeamCount] = useState<number>(0);
  const [warehouseCount, setWarehouseCount] = useState<number>(0);
  
  useEffect(() => {
    loadOrganizationStats();
  }, []);
  
  async function loadOrganizationStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id, organizations(name)')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) return;
      
      // @ts-ignore - organizations relation exists
      setOrgName(profile.organizations?.name || 'Your Organization');
      
      // Count team members
      const { count: memberCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);
      
      setTeamCount(memberCount || 0);
      
      // Count warehouses
      const { count: warehouseCountResult } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);
      
      setWarehouseCount(warehouseCountResult || 0);
      
    } catch (error) {
      console.error('Error loading organization stats:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }
  
  if (!orgName) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem' }}>
          Organization
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          You're not part of an organization yet.
        </p>
        <Link
          href="/onboarding"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#667eea',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600'
          }}
        >
          Complete Setup
        </Link>
      </div>
    );
  }
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
      color: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
          🏢 {orgName}
        </h3>
        <Link
          href="/app/settings/organization"
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Settings
        </Link>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem'
      }}>
        {/* Team Members Stat */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '1rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {teamCount}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Team Members
          </div>
        </div>
        
        {/* Warehouses Stat */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '1rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {warehouseCount}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Locations
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span>💡</span>
        <span style={{ opacity: 0.95 }}>
          Invite team members by sharing your business name and PIN
        </span>
      </div>
    </div>
  );
}
