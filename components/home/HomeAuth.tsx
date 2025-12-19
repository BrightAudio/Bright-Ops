"use client";

import { useState, useEffect } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { Fingerprint } from "lucide-react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "loading" | "success";
type Mode = "signup" | "login";

export default function HomeAuth() {
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [industry, setIndustry] = useState("");
  
  // UI state
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signup");
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check if biometric authentication is available
  useEffect(() => {
    // Check for biometric support on mobile devices
    const checkBiometric = async () => {
      if (typeof window === 'undefined') return;
      
      // Check if user has saved credentials
      const storedEmail = localStorage.getItem('biometric_email');
      const storedPassword = localStorage.getItem('biometric_password');
      const hasCredentials = !!(storedEmail && storedPassword);
      
      // Simple check: if on iOS or Android and has saved credentials, show option
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      
      if (hasCredentials && isMobile) {
        setBiometricAvailable(true);
        return;
      }
      
      // For desktop, check WebAuthn support
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available && hasCredentials);
        } catch {
          setBiometricAvailable(false);
        }
      }
    };
    
    checkBiometric();
  }, [mode]); // Re-check when mode changes

  async function handleBiometricLogin() {
    setError(null);
    setMessage(null);
    setStatus("loading");

    try {
      // Get stored credentials from localStorage
      const storedEmail = localStorage.getItem('biometric_email');
      const storedPassword = localStorage.getItem('biometric_password');

      if (!storedEmail || !storedPassword) {
        setError("No saved credentials. Please log in manually first.");
        setStatus("idle");
        return;
      }

      // For iOS/mobile, directly attempt login (system will prompt Face ID/Touch ID)
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS || isAndroid) {
        // Mobile devices: Just log in (browser/WebView will handle biometric prompt)
        const result = await loginAction(storedEmail, storedPassword);
        
        if (result?.error) {
          throw new Error(result.error);
        }
        return;
      }

      // Desktop: Use WebAuthn if available
      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const publicKeyOptions: PublicKeyCredentialRequestOptions = {
          challenge,
          timeout: 60000,
          userVerification: "required"
        };

        const credential = await navigator.credentials.get({
          publicKey: publicKeyOptions
        });

        if (credential) {
          const result = await loginAction(storedEmail, storedPassword);
          
          if (result?.error) {
            throw new Error(result.error);
          }
        }
      } else {
        // Fallback: just login
        const result = await loginAction(storedEmail, storedPassword);
        
        if (result?.error) {
          throw new Error(result.error);
        }
      }
    } catch (err: any) {
      setStatus("idle");
      if (err.name === 'NotAllowedError') {
        setError("Biometric authentication cancelled.");
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please try manual login.");
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!emailPattern.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setStatus("loading");
    try {
      if (mode === "signup") {
        const result = await signupAction(trimmedEmail, password, fullName.trim(), industry.trim());
        
        if (result?.error) {
          throw new Error(result.error);
        }
        
        if (result?.message) {
          setStatus("success");
          setMessage(result.message);
        }
        // If no result returned, redirect happened server-side
      } else {
        const result = await loginAction(trimmedEmail, password);
        
        if (result?.error) {
          throw new Error(result.error);
        }
        
        // Save credentials for biometric login on successful login
        localStorage.setItem('biometric_email', trimmedEmail);
        localStorage.setItem('biometric_password', password);
        // If no result returned, redirect happened server-side
      }
    } catch (err) {
      // Don't catch redirect errors - let them propagate
      if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.includes('NEXT_REDIRECT')) {
        throw err;
      }
      setStatus("idle");
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-6 mb-6 justify-center">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setMessage(null);
          }}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            mode === "signup"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          disabled={status === "loading"}
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setMessage(null);
          }}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            mode === "login"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          disabled={status === "loading"}
        >
          Log in
        </button>
      </div>

      <div className="space-y-2 mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-gray-600">
          {mode === "signup"
            ? "Get started with your Bright Ops workspace"
            : "Log in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
              <input
                type="text"
                placeholder="John Smith"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={status === "loading" || status === "success"}
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Industry (Optional)
              <input
                type="text"
                placeholder="e.g., Audio Production, Event Production"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                disabled={status === "loading" || status === "success"}
              />
            </label>
          </>
        )}

        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading" || status === "success"}
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Password
          <input
            type="password"
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-60"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={status === "loading" || status === "success"}
            required
            minLength={8}
          />
          {mode === "signup" && (
            <p className="mt-2 text-xs text-gray-500">Must be at least 8 characters</p>
          )}
        </label>

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="w-full py-3 mt-2 rounded-lg text-white text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {status === "loading"
            ? mode === "signup"
              ? "Creating account..."
              : "Logging in..."
            : status === "success"
              ? mode === "signup"
                ? "Account created!"
                : "Success!"
              : mode === "signup"
                ? "Create Account"
                : "Log in"}
        </button>
      </form>

      {mode === "login" && biometricAvailable && (
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={status === "loading"}
            className="w-full mt-4 py-3 rounded-lg border-2 border-purple-600 text-purple-600 text-sm font-bold transition hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-5 h-5" />
            {status === "loading" ? "Authenticating..." : "Log in with Face ID"}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
