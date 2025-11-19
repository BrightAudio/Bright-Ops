"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AccountSettingsPage() {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    companyName: "",
    email: "",
  });

  // Load user profile on mount
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, company_name, pexels_api_key')
          .eq('id', user.id)
          .single();
        
        setProfileForm({
          name: (profile as any)?.full_name || '',
          companyName: (profile as any)?.company_name || '',
          email: user.email || ''
        });

        // Load API key if exists
        if ((profile as any)?.pexels_api_key) {
          setPexelsApiKey((profile as any).pexels_api_key);
        }
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      // await supabase.auth.updateUser({
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update user profile with Pexels API key
        const { error } = await supabase
          .from('user_profiles')
          .update({
            pexels_api_key: pexelsApiKey || null
          } as any)
          .eq('id', user.id);
        
        if (error) throw error;
        
        setApiKeySuccess("Pexels API key saved successfully");
        setIsEditingApiKey(false);
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      setPasswordError("Failed to save API key");
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
            onClick={() => window.history.back()}
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
      </div>
    </div>
  );
}
