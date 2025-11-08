"use client";

export default function Topbar() {
  return (
    <>
      <div className="flex items-center">
        <span className="inline-block" aria-label="Bright Ops logo">
          {/* Bright Ops logo */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="#137CFB" strokeWidth="2" />
            <path d="M10 16a6 6 0 0 1 12 0" stroke="#137CFB" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2" fill="#137CFB" />
          </svg>
        </span>
        <span className="ml-4 text-xl font-bold text-gray-800 tracking-tight">Bright Ops</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <i className="fas fa-bell mr-2"></i>
          Notifications
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <i className="fas fa-user-circle mr-2"></i>
          Profile
        </button>
      </div>
    </>
  );
}
