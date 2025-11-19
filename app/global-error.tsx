"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset?: () => void }) {
  useEffect(() => {
    // Optionally log error to a service
    console.error('Global error:', error);
  }, [error]);

  const handleReset = () => {
    if (typeof reset === 'function') {
      reset();
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-amber-400 mb-4">Something went wrong</h1>
      <div className="bg-zinc-800 border border-amber-400 rounded p-6 mb-6 max-w-xl w-full">
        <pre className="text-red-400 whitespace-pre-wrap break-words text-lg font-mono">{error.message}</pre>
      </div>
      <button
        onClick={handleReset}
        className="px-6 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
