'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

type Organization = Database['public']['Tables']['organizations']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export default function OrganizationSettingsPage() {
  const supabase = supabaseBrowser();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [showSecretId, setShowSecretId] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  useEffect(() => {
    loadOrganizationData();
  }, []);
  
  async function loadOrganizationData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      
      // Get user's profile with organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) {
        return;
      }
      
      // Get organization details
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      
      if (org) {
        setOrganization(org);
        setNewOrgName(org.name);
      }
      
      // Get team members
      const { data: members } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true });
      
      if (members) {
        setTeamMembers(members);
      }
      
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleUpdateOrganizationName() {
    if (!organization || !newOrgName.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: newOrgName.trim() })
        .eq('id', organization.id);
      
      if (error) throw error;
      
      setOrganization({ ...organization, name: newOrgName.trim() });
      setEditingName(false);
      alert('✅ Organization name updated');
    } catch (error: any) {
      alert('Error updating name: ' + error.message);
    } finally {
      setSaving(false);
    }
  }
  
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard`);
  }
  
  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading organization settings...</p>
      </div>
    );
  }
  
  if (!organization) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          No Organization
        </h1>
        <p>You are not currently part of an organization.</p>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '2rem' }}>
        Organization Settings
      </h1>
      
      {/* Organization Details Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          Organization Details
        </h2>
        
        {/* Business Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Business Name
          </label>
          {editingName ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <button
                onClick={handleUpdateOrganizationName}
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNewOrgName(organization.name);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <p style={{ fontSize: '18px', fontWeight: '500' }}>{organization.name}</p>
              <button
                onClick={() => setEditingName(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        
        {/* Organization ID */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Organization ID
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              background: '#f9fafb',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              flex: 1
            }}>
              {organization.id}
            </p>
            <button
              onClick={() => copyToClipboard(organization.id, 'Organization ID')}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.5rem' }}>
            Unique database identifier for your organization (UUID).
          </p>
        </div>
        
        {/* Business PIN */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Business PIN
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{
              fontSize: '18px',
              fontFamily: 'monospace',
              background: '#f9fafb',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              {showPin ? organization.business_pin : '••••••••'}
            </p>
            <button
              onClick={() => setShowPin(!showPin)}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
            {organization.business_pin && (
              <button
                onClick={() => copyToClipboard(organization.business_pin!, 'Business PIN')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.5rem' }}>
            Share this PIN with team members to allow them to join your organization.
          </p>
        </div>
        
        {/* Secret ID */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Organization Secret ID
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              background: '#f9fafb',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              flex: 1
            }}>
              {showSecretId ? organization.secret_id : '••••••••-••••-••••-••••-••••••••••••'}
            </p>
            <button
              onClick={() => setShowSecretId(!showSecretId)}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {showSecretId ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => copyToClipboard(organization.secret_id, 'Secret ID')}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.5rem' }}>
            Unique identifier for your organization. Keep this secure.
          </p>
        </div>
        
        {/* Created Date */}
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Created
          </label>
          <p style={{ color: '#6b7280' }}>
            {new Date(organization.created_at!).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
      
      {/* Team Members Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem' }}>
          Team Members ({teamMembers.length})
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Name
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Email
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Role
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Department
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: member.id === currentUserId ? '#f0f9ff' : 'white'
                  }}
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {member.full_name || 'N/A'}
                      {member.id === currentUserId && (
                        <span style={{
                          fontSize: '11px',
                          background: '#3b82f6',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      fontSize: '12px',
                      background: member.role === 'manager' ? '#dcfce7' : '#f3f4f6',
                      color: member.role === 'manager' ? '#166534' : '#374151',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>
                    {member.department || 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '14px' }}>
                    {new Date(member.created_at!).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#f0f9ff',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
            <strong>💡 How to add team members:</strong><br />
            Share your Business Name and PIN with new team members. They can sign up at the signup page and enter these credentials to automatically join your organization.
          </p>
        </div>
      </div>
    </div>
  );
}
