'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Organization data
  const [orgName, setOrgName] = useState('');
  const [businessPin, setBusinessPin] = useState('');
  const [isJoiningExisting, setIsJoiningExisting] = useState(false);
  
  // Warehouse location data
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  
  useEffect(() => {
    checkUser();
  }, []);
  
  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    setUser(user);
    
    // Check if user already has an organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, organizations(name)')
      .eq('id', user.id)
      .single();
    
    if (profile?.organization_id) {
      // User already onboarded, redirect to dashboard
      router.push('/app/dashboard');
    }
  }
  
  async function handleCreateOrganization() {
    if (!orgName.trim()) {
      alert('Please enter your business name');
      return;
    }
    
    if (!businessPin.trim() || businessPin.length < 4) {
      alert('Please enter a business PIN (minimum 4 characters)');
      return;
    }
    
    setLoading(true);
    try {
      // Check if organization with this name and PIN already exists
      const { data: existingOrg, error: searchError } = await supabase
        .from('organizations')
        .select('id, name, secret_id')
        .ilike('name', orgName.trim())
        .eq('business_pin', businessPin)
        .maybeSingle();
      
      if (searchError) throw searchError;
      
      let organizationId: string;
      let secretId: string;
      
      if (existingOrg) {
        // Join existing organization
        organizationId = existingOrg.id;
        secretId = existingOrg.secret_id;
        setIsJoiningExisting(true);
      } else {
        // Create new organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({ 
            name: orgName.trim(),
            business_pin: businessPin
          })
          .select('id, secret_id')
          .single();
        
        if (orgError) throw orgError;
        organizationId = org.id;
        secretId = org.secret_id;
      }
      
      // Update user profile with organization_id
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ organization_id: organizationId })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // Show secret ID to user
      if (!existingOrg) {
        alert(`✅ Organization created!\n\nYour Secret ID: ${secretId}\n\nShare your business name and PIN with team members to join.`);
      } else {
        alert(`✅ Joined existing organization: ${existingOrg.name}`);
      }
      
      setStep(2);
    } catch (error: any) {
      console.error('Error with organization:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleCreateWarehouse() {
    setLoading(true);
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      // Create warehouse location
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .insert({
          name: locationName || 'Main Warehouse',
          address: locationAddress || '',
          organization_id: profile.organization_id
        });
      
      if (warehouseError) throw warehouseError;
      
      setStep(3);
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      alert('Error creating warehouse: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  function completeOnboarding() {
    router.push('/app/dashboard');
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '600px',
        width: '100%',
        padding: '3rem'
      }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem'
          }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: '30%',
                  height: '4px',
                  background: step >= i ? '#667eea' : '#e5e7eb',
                  borderRadius: '2px',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            Step {step} of 3
          </p>
        </div>
        
        {/* Step 1: Create Organization */}
        {step === 1 && (
          <>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Welcome to Bright Ops! 🎉
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Let's get your account set up. Enter your business name and PIN to create or join an organization.
            </p>
            
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              background: '#eff6ff', 
              borderRadius: '8px',
              borderLeft: '4px solid #3b82f6'
            }}>
              <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                <strong>Creating new?</strong> Choose a unique business name and create a secure PIN.<br/>
                <strong>Joining existing?</strong> Enter the exact business name and PIN provided by your team.
              </p>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Business Name *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Bright Audio Productions"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Business PIN *
              </label>
              <input
                type="password"
                value={businessPin}
                onChange={(e) => setBusinessPin(e.target.value)}
                placeholder="Create or enter 4+ character PIN"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.5rem' }}>
                This PIN will be used to securely connect team members to your organization.
              </p>
            </div>
            
            <button
              onClick={handleCreateOrganization}
              disabled={loading || !orgName.trim() || businessPin.length < 4}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading || !orgName.trim() || businessPin.length < 4 ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !orgName.trim() || businessPin.length < 4 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </>
        )}
        
        {/* Step 2: Create Warehouse */}
        {step === 2 && (
          <>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Add Your First Location 📍
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Set up your main warehouse or storage location. You can add more later.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Location Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Main Warehouse"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Address (Optional)
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City, State"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'transparent',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreateWarehouse}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '1rem',
                  background: loading ? '#9ca3af' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating...' : 'Continue'}
              </button>
            </div>
            
            <button
              onClick={completeOnboarding}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: '#6b7280',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Skip for now
            </button>
          </>
        )}
        
        {/* Step 3: Complete */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '1rem' }}>✅</div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                You're All Set!
              </h1>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Your account is ready. Let's start managing your inventory and equipment.
              </p>
              
              <button
                onClick={completeOnboarding}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
