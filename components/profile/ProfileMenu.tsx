"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { logoutAction } from "@/app/actions/auth";

export default function ProfileMenu() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUserEmail(data.user?.email ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", handleClickOutside);
      return () => window.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const logout = async () => {
    setOpen(false);
    await logoutAction();
  };

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 transition hover:bg-slate-200"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {initial}
        </div>
        <span className="hidden text-xs font-medium sm:inline">{userEmail ?? "Profile"}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white text-sm shadow-lg z-50">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/app/settings/home-base");
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-50"
          >
            Home Base & Team
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/app/settings/profile");
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-50"
          >
            My Profile
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={logout}
            className="w-full px-3 py-2 text-left text-red-500 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
