"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to account page with training tab
    router.replace('/app/settings/account?tab=training');
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#1a1a1a',
      color: '#e5e5e5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '2rem', 
          marginBottom: '1rem'
        }}>
          ⏳
        </div>
        <p>Redirecting to Account Settings...</p>
      </div>
    </div>
  );
}
