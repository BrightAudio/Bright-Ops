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
    <div className="bg-zinc-800 border border-zinc-700 shadow-xl rounded-xl p-8 w-full max-w-md">
      <div className="flex gap-6 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setMessage(null);
          }}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            mode === "signup"
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-gray-400 hover:text-white"
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
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
          disabled={status === "loading"}
        >
          Log in
        </button>
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-sm text-gray-400">
          {mode === "signup"
            ? "Get started with your Bright Ops workspace"
            : "Log in to your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <>
            <label className="block text-sm font-medium text-gray-300">
              Full Name
              <input
                type="text"
                placeholder="John Smith"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={status === "loading" || status === "success"}
                required
              />
            </label>

            <label className="block text-sm font-medium text-gray-300">
              Industry (Optional)
              <input
                type="text"
                placeholder="e.g., Audio Production, Event Production"
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                disabled={status === "loading" || status === "success"}
              />
            </label>
          </>
        )}

        <label className="block text-sm font-medium text-gray-300">
          Email
          <input
            type="email"
            placeholder="you@company.com"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading" || status === "success"}
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-300">
          Password
          <input
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60"
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
          className="w-full py-3 mt-2 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
