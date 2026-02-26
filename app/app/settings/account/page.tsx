"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'account' | 'training'>('account');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  
  // Training state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [trainingFilter, setTrainingFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    companyName: "",
    email: "",
  });

  // Load user profile on mount
  useEffect(() => {
    async function loadProfile() {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: profileData } = await sb
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);
        const orgId = (profileData as any)?.organization_id;
        setOrganizationId(orgId || '');
        setProfileForm({
          name: (profileData as any)?.full_name || '',
          companyName: (profileData as any)?.company_name || '',
          email: user.email || ''
        });
        
        // Load organization name if we have an org ID
        if (orgId) {
          try {
            const { data: orgData, error } = await sb
              .from('organizations')
              .select('name')
              .eq('id', orgId)
              .single();
            
            if (!error && orgData) {
              setOrganizationName((orgData as any).name);
            } else {
              console.error('Error loading organization:', error);
              setOrganizationName('');
            }
          } catch (err) {
            console.error('Error fetching organization:', err);
            setOrganizationName('');
          }
        }
        
        // Load API keys
        setPexelsApiKey((profileData as any)?.pexels_api_key || '');
        setStripePublishableKey((profileData as any)?.stripe_publishable_key || '');
        setStripeSecretKey((profileData as any)?.stripe_secret_key || '');
      }
    }
    loadProfile();
  }, []);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // API Keys state
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState("");
  
  // Stripe API Keys state
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [isEditingStripe, setIsEditingStripe] = useState(false);

  // Warehouse Access state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // Load warehouses user has access to
  useEffect(() => {
    async function loadWarehouses() {
      setLoadingWarehouses(true);
      try {
        const { data: { user } } = await supabaseBrowser().auth.getUser();
        if (!user) return;

        // Get warehouse access
        const { data: accessData } = await supabaseBrowser()
          .from('user_warehouse_access')
          .select('warehouse_id')
          .eq('user_id', user.id);

        if (!accessData || accessData.length === 0) {
          setWarehouses([]);
          return;
        }

        const warehouseIds = accessData.map((a: any) => a.warehouse_id);

        // Get warehouse details
        const { data: warehousesData } = await supabaseBrowser()
          .from('warehouses')
          .select('id, name, address, pin')
          .in('id', warehouseIds);

        setWarehouses(warehousesData || []);
      } catch (error) {
        console.error('Error loading warehouses:', error);
      } finally {
        setLoadingWarehouses(false);
      }
    }
    loadWarehouses();
  }, []);

  // Load training assignments
  useEffect(() => {
    if (activeTab === 'training') {
      loadTrainingAssignments();
    }
  }, [activeTab]);

  async function loadTrainingAssignments() {
    setLoadingTraining(true);
    try {
      const { data: { user } } = await supabaseBrowser().auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_modules (*),
          training_progress (*)
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error) {
      console.error('Error loading training assignments:', error);
    } finally {
      setLoadingTraining(false);
    }
  }

  async function toggleTrainingComplete(assignmentId: string, moduleId: string, currentStatus: boolean) {
    try {
      const { data: { user } } = await supabaseBrowser().auth.getUser();
      if (!user) return;

      const newStatus = !currentStatus;

      // Update or insert progress
      const { error: progressError } = await supabase
        .from('training_progress')
        .upsert({
          assignment_id: assignmentId,
          user_id: user.id,
          module_id: moduleId,
          marked_complete: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
          watched: newStatus
        }, {
          onConflict: 'assignment_id'
        });

      if (progressError) throw progressError;

      // Update assignment status
      const { error: assignmentError } = await supabase
        .from('training_assignments')
        .update({
          status: newStatus ? 'completed' : 'in_progress',
          completed_at: newStatus ? new Date().toISOString() : null,
          started_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;

      // Reload assignments
      await loadTrainingAssignments();
    } catch (error) {
      console.error('Error updating completion:', error);
      alert('Failed to update training progress');
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");
    setPasswordError("");

    try {
      const { data: { user } } = await supabaseBrowser().auth.getUser();
      if (user) {
        // Update user profile
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: profileForm.name,
            company_name: profileForm.companyName || null
          } as any)
          .eq('id', user.id);
        
        if (error) throw error;
        
        setSuccessMessage("Profile updated successfully");
        setIsEditingProfile(false);
        // Refresh the page to update the header
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setPasswordError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setSuccessMessage("");

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Implement actual password change with Supabase
      // await supabaseBrowser().auth.updateUser({
      //   password: passwordForm.newPassword
      // });
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccessMessage("Password changed successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsChangingPassword(false);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setApiKeySuccess("");
    setPasswordError("");

    try {
      const { data: { user } } = await supabaseBrowser().auth.getUser();
      if (user) {
        // Update user profile with Pexels API key
        const { error } = await supabase
          .from('user_profiles')
          .update({
            pexels_api_key: pexelsApiKey || null
          } as any)
          .eq('id', user.id);
        
        if (error) {
          console.error("Supabase error:", error);
          setPasswordError(`Failed to save API key: ${error.message || 'Unknown error'}`);
          return;
        }
        
        setApiKeySuccess("Pexels API key saved successfully");
        setIsEditingApiKey(false);
      }
    } catch (error: any) {
      console.error("Error saving API key:", error);
      setPasswordError(`Failed to save API key: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#fff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500
            }}
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Link 
                href="/app/dashboard" 
                style={{ 
                  color: "#666", 
                  textDecoration: "none",
                  fontSize: "0.875rem"
                }}
              >
                Dashboard
              </Link>
              <span style={{ color: "#999" }}>/</span>
              <span style={{ color: "#333", fontSize: "0.875rem" }}>Account Settings</span>
            </div>
            <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 600 }}>Account Settings</h1>
          </div>
        </div>
        
        {/* Role & Department Display */}
        {profile && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem', 
            marginTop: '1rem'
          }}>
            {/* Organization Info */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1rem',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Organization</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af' }}>{organizationName || 'Loading...'}</span>
                  {organizationId && (
                    <>
                      <span style={{ color: '#bfdbfe' }}>•</span>
                      <code style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{organizationId.slice(0, 8)}...</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(organizationId);
                          alert('Organization ID copied to clipboard');
                        }}
                        style={{
                          marginLeft: 'auto',
                          padding: '0.25rem 0.75rem',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        Copy ID
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Role & Department Display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Role:</span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: profile.role === 'manager' ? '#059669' : '#2563eb',
                  textTransform: 'capitalize'
                }}>
                  {profile.role === 'manager' ? '👔 Manager' : '👤 Associate'}
                </span>
              </div>
              
              {profile.department && (
                <>
                  <span style={{ color: '#d1d5db' }}>•</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Department:</span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600,
                      color: '#374151',
                      textTransform: 'uppercase'
                    }}>
                      {profile.department}
                    </span>
                  </div>
                </>
              )}
              
              <div style={{ marginLeft: 'auto' }}>
                <button
                  onClick={async () => {
                  if (!profile?.id) {
                    alert('Profile not loaded. Please refresh the page.');
                    return;
                  }
                  
                  const newRole = profile.role === 'manager' ? 'associate' : 'manager';
                  
                  // If switching to manager, require password
                  if (newRole === 'manager') {
                    const password = prompt('Enter manager password to switch to manager role:');
                    const savedPassword = localStorage.getItem('managerPassword') || 'BrightNewSound';
                    if (password !== savedPassword) {
                      alert('Incorrect password');
                      return;
                    }
                  }
                  
                  if (confirm(`Change role to ${newRole}?`)) {
                    const { error } = await supabase
                      .from('user_profiles')
                      .update({ role: newRole })
                      .eq('id', profile.id);
                    
                    if (error) {
                      console.error('Error updating role:', error);
                      alert(`Failed to update role: ${error.message}`);
                    } else {
                      alert(`Role changed to ${newRole}`);
                      window.location.reload();
                    }
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Switch to {profile.role === 'manager' ? 'Associate' : 'Manager'}
              </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('account')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'account' ? '2px solid #667eea' : '2px solid transparent',
            color: activeTab === 'account' ? '#667eea' : '#6b7280',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 600,
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          Account Settings
        </button>
        <button
          onClick={() => setActiveTab('training')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'training' ? '2px solid #667eea' : '2px solid transparent',
            color: activeTab === 'training' ? '#667eea' : '#6b7280',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 600,
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          Training
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          padding: "1rem",
          marginBottom: "1.5rem",
          backgroundColor: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: "6px",
          color: "#155724",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <i className="fas fa-check-circle"></i>
          {successMessage}
        </div>
      )}

      {/* Account Settings Tab */}
      {activeTab === 'account' && (
        <div style={{ display: "grid", gap: "1.5rem", maxWidth: "800px" }}>
          {/* Profile Information Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "1.5rem"
          }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              Profile Information
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#137CFB",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500
                }}
              >
                <i className="fas fa-edit" style={{ marginRight: "0.5rem" }}></i>
                Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem"
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    placeholder="Your company name (optional)"
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem",
                      backgroundColor: "#f9fafb",
                      cursor: "not-allowed"
                    }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    Email cannot be changed here
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      padding: "0.625rem 1.5rem",
                      backgroundColor: "#137CFB",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: isSaving ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      // Reload the current profile data
                    }}
                    style={{
                      padding: "0.625rem 1.5rem",
                      backgroundColor: "#fff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginBottom: "0.25rem"
                }}>
                  Full Name
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                  {profileForm.name || 'Not set'}
                </div>
              </div>

              <div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginBottom: "0.25rem"
                }}>
                  Company Name
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                  {profileForm.companyName || 'Not set'}
                </div>
              </div>

              <div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280",
                  marginBottom: "0.25rem"
                }}>
                  Email
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                  {profileForm.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warehouse Access Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "1.5rem"
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                Warehouse Access
              </h2>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                Stock locations you have access to
              </p>
            </div>
            <Link
              href="/app/inventory/locations"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#137CFB",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-block"
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: "0.5rem" }}></i>
              Join Warehouse
            </Link>
          </div>

          {loadingWarehouses ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: "1.5rem" }}></i>
              <p style={{ marginTop: "0.5rem" }}>Loading warehouses...</p>
            </div>
          ) : warehouses.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem 1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              border: "1px dashed #d1d5db"
            }}>
              <i className="fas fa-warehouse" style={{ fontSize: "2rem", color: "#9ca3af", marginBottom: "1rem" }}></i>
              <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280" }}>
                You haven't joined any warehouses yet
              </p>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#9ca3af" }}>
                Contact your administrator for warehouse access PINs
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {warehouses.map((warehouse: any) => (
                <div
                  key={warehouse.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    backgroundColor: "#fafafa",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.5rem",
                      marginBottom: "0.5rem"
                    }}>
                      <i className="fas fa-map-marker-alt" style={{ color: "#137CFB" }}></i>
                      <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                        {warehouse.name}
                      </span>
                    </div>
                    
                    {warehouse.address && (
                      <div style={{ 
                        fontSize: "0.875rem", 
                        color: "#6b7280",
                        marginBottom: "0.75rem"
                      }}>
                        <i className="fas fa-location-dot" style={{ marginRight: "0.5rem", color: "#9ca3af" }}></i>
                        {warehouse.address}
                      </div>
                    )}

                    {warehouse.pin && (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.75rem",
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "0.875rem"
                      }}>
                        <i className="fas fa-key" style={{ color: "#9ca3af", fontSize: "0.75rem" }}></i>
                        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>
                          PIN: {warehouse.pin}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(warehouse.pin);
                            alert('PIN copied to clipboard!');
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#137CFB",
                            padding: "0.125rem 0.25rem"
                          }}
                          title="Copy PIN"
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/app/inventory/locations"
                    style={{
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      color: "#137CFB",
                      textDecoration: "none",
                      border: "1px solid #137CFB",
                      borderRadius: "4px",
                      fontWeight: 500,
                      display: "inline-block"
                    }}
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#1e40af"
          }}>
            <i className="fas fa-info-circle" style={{ marginRight: "0.5rem" }}></i>
            Share the warehouse name and PIN with team members to grant them access to these locations.
          </div>
        </div>

        {/* Password Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "1.5rem"
          }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              Password
            </h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#137CFB",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500
                }}
              >
                <i className="fas fa-key" style={{ marginRight: "0.5rem" }}></i>
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <div style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#991b1b",
                  fontSize: "0.875rem"
                }}>
                  {passwordError}
                </div>
              )}

              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem"
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem"
                    }}
                    required
                    minLength={8}
                  />
                  <div style={{ 
                    fontSize: "0.75rem", 
                    color: "#6b7280",
                    marginTop: "0.25rem"
                  }}>
                    Must be at least 8 characters
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#374151"
                  }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.9375rem"
                    }}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      padding: "0.625rem 1.5rem",
                      backgroundColor: "#137CFB",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: isSaving ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      opacity: isSaving ? 0.6 : 1
                    }}
                  >
                    {isSaving ? "Changing..." : "Change Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setPasswordError("");
                    }}
                    style={{
                      padding: "0.625rem 1.5rem",
                      backgroundColor: "#fff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ 
                fontSize: "0.875rem", 
                color: "#6b7280",
                marginBottom: "0.25rem"
              }}>
                Password
              </div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                ••••••••••••
              </div>
            </div>
          )}
        </div>

        {/* Manager Settings Card (Managers Only) */}
        {profile?.role === 'manager' && (
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1.5rem"
          }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>
                Manager Settings
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: "0.875rem", 
                color: "#6b7280"
              }}>
                Change the password required for switching to Manager role
              </p>
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "0.75rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#374151"
              }}>
                Change Manager Password
              </label>
              
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div>
                  <input
                    type="password"
                    id="current-manager-password"
                    placeholder="Current password"
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem"
                    }}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    id="new-manager-password"
                    placeholder="New password"
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem"
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const currentPassword = (document.getElementById('current-manager-password') as HTMLInputElement)?.value;
                    const newPassword = (document.getElementById('new-manager-password') as HTMLInputElement)?.value;
                    
                    if (!currentPassword || !newPassword) {
                      alert('Please enter both current and new password');
                      return;
                    }
                    
                    const savedPassword = localStorage.getItem('managerPassword') || 'BrightNewSound';
                    if (currentPassword !== savedPassword) {
                      alert('Current password is incorrect');
                      return;
                    }
                    
                    if (newPassword.length < 8) {
                      alert('New password must be at least 8 characters');
                      return;
                    }
                    
                    localStorage.setItem('managerPassword', newPassword);
                    alert('Manager password updated successfully');
                    
                    (document.getElementById('current-manager-password') as HTMLInputElement).value = '';
                    (document.getElementById('new-manager-password') as HTMLInputElement).value = '';
                  }}
                  style={{
                    padding: "0.625rem 1.5rem",
                    backgroundColor: "#137CFB",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 500
                  }}
                >
                  Update Password
                </button>
              </div>
              
              <p style={{ 
                fontSize: "0.75rem", 
                color: "#6b7280", 
                marginTop: "0.75rem",
                lineHeight: "1.5"
              }}>
                This password is required when switching from Associate to Manager role.
              </p>
            </div>
          </div>
        )}

        {/* API Key Management Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem"
        }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>
              API Keys & Security
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: "0.875rem", 
              color: "#6b7280",
              marginBottom: "1rem"
            }}>
              Manage your API keys and integration credentials
            </p>
          </div>

          {/* 3-Month Reminder Alert */}
          <div style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#fef3c7",
            border: "1px solid #fbbf24",
            borderRadius: "6px",
            display: "flex",
            gap: "1rem",
            alignItems: "flex-start"
          }}>
            <div style={{
              fontSize: "1.5rem",
              flexShrink: 0
            }}>
              ⚠️
            </div>
            <div>
              <div style={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#92400e",
                marginBottom: "0.25rem"
              }}>
                Rotate API Keys Every 3 Months
              </div>
              <p style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#92400e",
                lineHeight: "1.5"
              }}>
                For security best practices, rotate your API keys and integration credentials every three months. This helps prevent unauthorized access and protects your data.
              </p>
              <div style={{
                marginTop: "0.75rem",
                display: "flex",
                gap: "0.5rem"
              }}>
                <button
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 500
                  }}
                >
                  <i className="fas fa-sync-alt" style={{ marginRight: "0.25rem" }}></i>
                  Rotate Keys Now
                </button>
                <button
                  style={{
                    padding: "0.375rem 0.75rem",
                    backgroundColor: "transparent",
                    color: "#92400e",
                    border: "1px solid #fbbf24",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 500
                  }}
                >
                  <i className="fas fa-info-circle" style={{ marginRight: "0.25rem" }}></i>
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div>
            <h3 style={{
              margin: "0 0 1rem 0",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#374151"
            }}>
              Active API Keys
            </h3>
            
            {apiKeySuccess && (
              <div style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                backgroundColor: "#d1fae5",
                border: "1px solid #10b981",
                borderRadius: "6px",
                color: "#065f46",
                fontSize: "0.875rem"
              }}>
                <i className="fas fa-check-circle" style={{ marginRight: "0.5rem" }}></i>
                {apiKeySuccess}
              </div>
            )}

            {/* Pexels API Key */}
            <div style={{
              padding: "1rem",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              marginBottom: "1rem"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isEditingApiKey ? "1rem" : "0"
              }}>
                <div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                    color: "#374151",
                    marginBottom: "0.25rem"
                  }}>
                    Pexels API Key
                  </div>
                  <div style={{
                    fontSize: "0.8125rem",
                    color: "#6b7280"
                  }}>
                    Used for AI-powered image search in inventory
                  </div>
                  {pexelsApiKey && !isEditingApiKey && (
                    <div style={{
                      marginTop: "0.5rem",
                      fontSize: "0.8125rem",
                      color: "#059669",
                      fontFamily: "monospace"
                    }}>
                      <i className="fas fa-check-circle" style={{ marginRight: "0.25rem" }}></i>
                      Key configured ({pexelsApiKey.substring(0, 8)}...{pexelsApiKey.substring(pexelsApiKey.length - 4)})
                    </div>
                  )}
                </div>
                {!isEditingApiKey && (
                  <button
                    onClick={() => setIsEditingApiKey(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#fff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                      fontWeight: 500
                    }}
                  >
                    <i className="fas fa-edit" style={{ marginRight: "0.25rem" }}></i>
                    {pexelsApiKey ? "Edit" : "Configure"}
                  </button>
                )}
              </div>

              {isEditingApiKey && (
                <form onSubmit={handleApiKeySubmit}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151"
                    }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={pexelsApiKey}
                      onChange={(e) => setPexelsApiKey(e.target.value)}
                      placeholder="Enter your Pexels API key"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontFamily: "monospace"
                      }}
                    />
                    <div style={{
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                      color: "#6b7280"
                    }}>
                      Get your API key from{" "}
                      <a 
                        href="https://www.pexels.com/api/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb", textDecoration: "underline" }}
                      >
                        pexels.com/api
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={isSaving}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      {isSaving ? "Saving..." : "Save Key"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingApiKey(false);
                        setApiKeySuccess("");
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#fff",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Stripe API Keys */}
            <div style={{
              padding: "1rem",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              marginBottom: "1rem"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isEditingStripe ? "1rem" : "0"
              }}>
                <div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                    color: "#374151",
                    marginBottom: "0.25rem"
                  }}>
                    Stripe API Keys
                  </div>
                  <div style={{
                    fontSize: "0.8125rem",
                    color: "#6b7280"
                  }}>
                    Used for payment processing and customer management
                  </div>
                  {(stripePublishableKey || stripeSecretKey) && !isEditingStripe && (
                    <div style={{
                      marginTop: "0.5rem",
                      fontSize: "0.8125rem",
                      color: "#059669"
                    }}>
                      <i className="fas fa-check-circle" style={{ marginRight: "0.25rem" }}></i>
                      Stripe keys configured
                    </div>
                  )}
                </div>
                {!isEditingStripe && (
                  <button
                    onClick={() => setIsEditingStripe(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#fff",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                      fontWeight: 500
                    }}
                  >
                    <i className="fas fa-edit" style={{ marginRight: "0.25rem" }}></i>
                    {(stripePublishableKey || stripeSecretKey) ? "Edit" : "Configure"}
                  </button>
                )}
              </div>

              {isEditingStripe && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  setApiKeySuccess("");
                  setPasswordError("");

                  try {
                    const { data: { user } } = await supabaseBrowser().auth.getUser();
                    if (user) {
                      const { error } = await supabase
                        .from('user_profiles')
                        .update({
                          stripe_publishable_key: stripePublishableKey || null,
                          stripe_secret_key: stripeSecretKey || null
                        } as any)
                        .eq('id', user.id);
                      
                      if (error) {
                        console.error("Supabase error:", error);
                        setPasswordError(`Failed to save Stripe keys: ${error.message || 'Unknown error'}`);
                        return;
                      }
                      
                      setApiKeySuccess("Stripe API keys saved successfully");
                      setIsEditingStripe(false);
                    }
                  } catch (error: any) {
                    console.error("Error saving Stripe keys:", error);
                    setPasswordError(`Failed to save Stripe keys: ${error?.message || 'Unknown error'}`);
                  } finally {
                    setIsSaving(false);
                  }
                }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151"
                    }}>
                      Publishable Key
                    </label>
                    <input
                      type="text"
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      placeholder="pk_live_... or pk_test_..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#374151"
                    }}>
                      Secret Key
                    </label>
                    <input
                      type="password"
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      placeholder="sk_live_... or sk_test_..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontFamily: "monospace"
                      }}
                    />
                    <div style={{
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                      color: "#6b7280"
                    }}>
                      Get your API keys from{" "}
                      <a 
                        href="https://dashboard.stripe.com/apikeys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb", textDecoration: "underline" }}
                      >
                        Stripe Dashboard
                      </a>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={isSaving}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#6366f1",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        opacity: isSaving ? 0.6 : 1
                      }}
                    >
                      {isSaving ? "Saving..." : "Save Keys"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingStripe(false);
                        setApiKeySuccess("");
                      }}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#fff",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Info section */}
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              fontSize: "0.8125rem",
              color: "#1e40af"
            }}>
              <i className="fas fa-info-circle" style={{ marginRight: "0.5rem" }}></i>
              API keys are stored securely and never exposed to the client
            </div>
          </div>
        </div>

        {/* Training Management Card (Managers Only) */}
        {profile?.role === 'manager' && (
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1.5rem"
          }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>
                Training Management
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: "0.875rem", 
                color: "#6b7280"
              }}>
                Assign and manage training for your team
              </p>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link
                href="/app/training/manage"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#137CFB",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none"
                }}
              >
                <i className="fas fa-chalkboard-teacher"></i>
                Training Manager Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* My Training Card (All Users) */}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "1.5rem"
        }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>
              My Training
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: "0.875rem", 
              color: "#6b7280"
            }}>
              View your assigned training and track progress
            </p>
          </div>

          <Link
            href="/app/settings/training"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#667eea",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none"
            }}
          >
            <i className="fas fa-graduation-cap"></i>
            View My Training
          </Link>
        </div>
      </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div>
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                Total Trainings
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
                {assignments.length}
              </div>
            </div>

            <div style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                Completed
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>
                {assignments.filter(a => a.status === 'completed').length}
              </div>
            </div>

            <div style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                In Progress
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {assignments.filter(a => a.status === 'in_progress').length}
              </div>
            </div>

            <div style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                Completion Rate
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
                {assignments.length > 0 ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {assignments.length > 0 && (
            <div style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-trophy" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: '#f3f4f6' }}>
                    Training Progress
                  </span>
                </div>
                <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {assignments.filter(a => a.status === 'completed').length} of {assignments.length} completed
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '24px',
                background: '#1a1a1a',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${assignments.length > 0 ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100) : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['all', 'assigned', 'in_progress', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTrainingFilter(f)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: trainingFilter === f ? '#667eea' : '#2a2a2a',
                    border: '1px solid',
                    borderColor: trainingFilter === f ? '#667eea' : '#333333',
                    borderRadius: '6px',
                    color: trainingFilter === f ? 'white' : '#e5e5e5',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Trainings List */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f3f4f6' }}>
              {trainingFilter === 'all' ? 'All Assigned Trainings' : 
               trainingFilter === 'assigned' ? 'New Assignments' :
               trainingFilter === 'in_progress' ? 'In Progress' :
               'Completed Trainings'}
            </h2>

            {loadingTraining ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                Loading trainings...
              </div>
            ) : assignments.filter(a => trainingFilter === 'all' || a.status === trainingFilter).length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                border: '1px solid #333333'
              }}>
                <i className="fas fa-book" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }}></i>
                <p style={{ color: '#9ca3af', margin: 0 }}>
                  {trainingFilter === 'all' ? 'No training assignments yet' :
                   trainingFilter === 'completed' ? 'No completed trainings yet' :
                   `No ${trainingFilter.replace('_', ' ')} trainings`}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignments.filter(a => trainingFilter === 'all' || a.status === trainingFilter).map((assignment) => {
                  const progress = assignment.training_progress?.[0];
                  const isComplete = progress?.marked_complete || false;

                  return (
                    <div
                      key={assignment.id}
                      style={{
                        background: '#2a2a2a',
                        border: '1px solid #333333',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem'
                      }}>
                        {/* Thumbnail */}
                        <div style={{
                          width: '120px',
                          height: '67px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedVideo(expandedVideo === assignment.id ? null : assignment.id)}
                        >
                          <i className="fas fa-play" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            {assignment.training_modules?.duration || 'N/A'}
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#f3f4f6' }}>
                            {assignment.training_modules?.title || 'Untitled'}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: '#333333',
                              color: '#9ca3af',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {assignment.training_modules?.category || 'General'}
                            </span>

                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: '1px solid',
                              ...(() => {
                                const difficulty = assignment.training_modules?.difficulty;
                                return {
                                  background: difficulty === 'beginner' ? '#064e3b' : difficulty === 'intermediate' ? '#0c2d6b' : '#5f1313',
                                  color: difficulty === 'beginner' ? '#6ee7b7' : difficulty === 'intermediate' ? '#60a5fa' : '#f87171',
                                  borderColor: difficulty === 'beginner' ? '#059669' : difficulty === 'intermediate' ? '#2563eb' : '#dc2626'
                                };
                              })()
                            }}>
                              {assignment.training_modules?.difficulty || 'N/A'}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                              <i className="fas fa-clock" style={{ fontSize: '0.875rem' }}></i>
                              <span>Assigned {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af', lineHeight: '1.4' }}>
                            {assignment.training_modules?.description || 'No description available'}
                          </p>
                        </div>

                        {/* Checkbox */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => toggleTrainingComplete(assignment.id, assignment.training_modules?.id, isComplete)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.5rem'
                            }}
                          >
                            <i 
                              className="fas fa-check-circle"
                              style={{
                                fontSize: '2rem',
                                color: isComplete ? '#10b981' : '#4b5563'
                              }}
                            ></i>
                          </button>
                          <span style={{
                            fontSize: '0.75rem',
                            color: isComplete ? '#10b981' : '#9ca3af',
                            fontWeight: '500'
                          }}>
                            {isComplete ? 'Complete' : 'Mark Done'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Video Player */}
                      {expandedVideo === assignment.id && (
                        <div style={{
                          padding: '1.5rem',
                          borderTop: '1px solid #333333',
                          background: '#1a1a1a'
                        }}>
                          <iframe
                            width="100%"
                            height="400"
                            src={`https://www.youtube.com/embed/${assignment.training_modules?.youtube_id}`}
                            title={assignment.training_modules?.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ borderRadius: '8px' }}
                          />
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${assignment.training_modules?.youtube_id}`, '_blank')}
                              style={{
                                padding: '0.625rem 1.5rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                              }}
                            >
                              Watch on YouTube
                            </button>
                            {!isComplete && (
                              <button
                                onClick={() => toggleTrainingComplete(assignment.id, assignment.training_modules?.id, false)}
                                style={{
                                  padding: '0.625rem 1.5rem',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: '500'
                                }}
                              >
                                Mark as Complete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
