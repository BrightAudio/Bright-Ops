"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface ProfileDropdownProps {
  userEmail?: string;
  userName?: string;
}

export default function ProfileDropdown({ userEmail, userName }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  console.log("ProfileDropdown rendered, isOpen:", isOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "BA";

  return (
    <div className="profile-dropdown-container" ref={dropdownRef}>
      <button 
        className="user-menu" 
        onClick={() => {
          console.log("Profile clicked, isOpen:", !isOpen);
          setIsOpen(!isOpen);
        }}
        type="button"
      >
        <div className="avatar">{initials}</div>
        <i className={`fas fa-chevron-${isOpen ? "up" : "down"}`}></i>
      </button>

      {isOpen && (
        <div 
          className="profile-dropdown" 
          style={{ 
            display: 'block',
            backgroundColor: '#ff0000',
            color: '#ffffff',
            padding: '20px',
            border: '5px solid yellow'
          }}
        >
          <h2>DROPDOWN IS OPEN!</h2>
          <div className="profile-dropdown-header">
            <div className="avatar-large">{initials}</div>
            <div className="profile-info">
              <div className="profile-name">{userName || "User"}</div>
              <div className="profile-email">{userEmail || "user@example.com"}</div>
            </div>
          </div>

          <div className="profile-dropdown-divider"></div>

          <div className="profile-dropdown-section">
            <Link href="/app/settings/account" className="profile-dropdown-item" onClick={() => setIsOpen(false)}>
              <i className="fas fa-user-circle"></i>
              <span>Account Settings</span>
            </Link>
            <Link href="/app/crew" className="profile-dropdown-item" onClick={() => setIsOpen(false)}>
              <i className="fas fa-users"></i>
              <span>Employees</span>
            </Link>
          </div>

          <div className="profile-dropdown-divider"></div>

          <button className="profile-dropdown-item profile-dropdown-signout" onClick={handleSignOut}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
