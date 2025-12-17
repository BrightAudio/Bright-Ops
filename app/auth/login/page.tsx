"use client";

import { Suspense } from "react";
import HomeAuth from "@/components/home/HomeAuth";

function LoginContent() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        width: '100%',
        padding: '3rem'
      }}>
        <HomeAuth />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
