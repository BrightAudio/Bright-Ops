"use client";

export default function Topbar() {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="app-title flex items-center">
        <span className="inline-block" aria-label="Bright Ops logo">
          {/* Bright Ops logo */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="#137CFB" strokeWidth="2" />
            <path d="M10 16a6 6 0 0 1 12 0" stroke="#137CFB" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2" fill="#137CFB" />
          </svg>
        </span>
        <span className="ml-3">Bright Ops</span>
      </div>
      <div className="right-actions">
        <button type="button" aria-label="Search">
          <i className="fas fa-search" aria-hidden="true"></i>
        </button>
        <button type="button" aria-label="Notifications">
          <i className="fas fa-bell" aria-hidden="true"></i>
        </button>
        <div className="avatar" role="button" aria-label="Account menu" tabIndex={0}>
          <i className="fas fa-user" aria-hidden="true"></i>
        </div>
      </div>
    </div>
  );
}
