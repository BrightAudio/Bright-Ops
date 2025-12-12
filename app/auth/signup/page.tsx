"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'manager' | 'associate'>('associate');
  const [department, setDepartment] = useState<'warehouse' | 'leads' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const supabaseAny = supabase as any;
      const { data: authData, error: signUpError } = await supabaseAny.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // Update user profile after successful signup (trigger already creates it)
      if (authData.user) {
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { error: profileError } = await supabaseAny
          .from('user_profiles')
          .update({
            email,
            full_name: fullName,
            role,
            department
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Failed to update profile:', profileError);
          // Don't fail signup if profile update fails, they can update later
        }
      }

      alert("Account created! Check your email to confirm your account, then complete setup.");
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#1a1a1a" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-lg shadow-lg"
        style={{
          background: "#2a2a2a",
          border: "1px solid #333333",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#f3f4f6" }}>
            Bright Ops
          </h1>
          <p style={{ color: "#9ca3af" }}>Create your account</p>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded"
            style={{
              background: "#ef4444",
              color: "white",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'manager' | 'associate')}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
            >
              <option value="associate">Associate</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as 'warehouse' | 'leads' | 'both')}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
            >
              <option value="both">Both Warehouse & Leads</option>
              <option value="warehouse">Warehouse Only</option>
              <option value="leads">Leads Only</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "#e5e5e5" }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333333",
                color: "#e5e5e5",
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-medium transition-all"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#9ca3af" }}>
          Already have an account?{" "}
          <a
            href="/auth/login"
            style={{ color: "#667eea" }}
            className="hover:underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
