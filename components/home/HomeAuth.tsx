"use client";

import { useState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";

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
    <div className="bg-white border border-slate-200 shadow-lg rounded-xl p-6 w-full max-w-md">
      <div className="flex gap-6 mb-4">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setMessage(null);
          }}
          className={`pb-1 text-sm font-semibold border-b-2 ${
            mode === "signup"
              ? "border-rentman-blue text-rentman-blue"
              : "border-transparent text-slate-500 hover:text-rentman-dark"
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
          className={`pb-1 text-sm font-semibold border-b-2 ${
            mode === "login"
              ? "border-rentman-blue text-rentman-blue"
              : "border-transparent text-slate-500 hover:text-rentman-dark"
          }`}
          disabled={status === "loading"}
        >
          Log in
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-rentman-dark">
          {mode === "signup" ? "Create your Bright Ops account" : "Welcome back"}
        </h2>
        <p className="text-sm text-slate-600">
          {mode === "signup"
            ? "Get started with your Bright Ops workspace"
            : "Log in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                type="text"
                placeholder="John Smith"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-rentman-dark focus:outline-none focus:ring-2 focus:ring-rentman-blue disabled:opacity-60"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={status === "loading" || status === "success"}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Industry (Optional)
              <input
                type="text"
                placeholder="e.g., Audio Production, Event Production"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-rentman-dark focus:outline-none focus:ring-2 focus:ring-rentman-blue disabled:opacity-60"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                disabled={status === "loading" || status === "success"}
              />
            </label>
          </>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            placeholder="you@company.com"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-rentman-dark focus:outline-none focus:ring-2 focus:ring-rentman-blue disabled:opacity-60"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading" || status === "success"}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            placeholder="••••••••"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-rentman-dark focus:outline-none focus:ring-2 focus:ring-rentman-blue disabled:opacity-60"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={status === "loading" || status === "success"}
            required
            minLength={8}
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
          )}
        </label>

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="w-full py-2.5 mt-2 rounded-md bg-rentman-blue text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
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

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
