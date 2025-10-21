"use client";

export default function Topbar() {
  return (
    <header className="w-full flex items-center px-6 py-4 bg-zinc-900 border-b border-gray-800 shadow">
      <span className="inline-block" aria-label="Bright Ops logo">
        {/* Minimal Bright Ops mark: simple white SVG */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2" />
          <path d="M10 16a6 6 0 0 1 12 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2" fill="white" />
        </svg>
      </span>
      <span className="ml-4 text-xl font-bold text-white tracking-tight">Bright Ops</span>
    </header>
  );
}
