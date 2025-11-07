"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-[#0c0d10] flex flex-col px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Open Jobs */}
        <div className="bg-[#181a20] border border-white/10 rounded-xl p-6 shadow flex flex-col">
          <span className="text-sm text-white/60 mb-2 font-semibold">Open Jobs</span>
          <span className="text-3xl font-bold text-amber-300">12</span>
        </div>
        {/* Today's Moves */}
        <div className="bg-[#181a20] border border-white/10 rounded-xl p-6 shadow flex flex-col">
          <span className="text-sm text-white/60 mb-2 font-semibold">Today&apos;s Moves</span>
          <span className="text-3xl font-bold text-amber-300">7</span>
        </div>
        {/* Warehouse Alerts */}
        <div className="bg-[#181a20] border border-white/10 rounded-xl p-6 shadow flex flex-col">
          <span className="text-sm text-white/60 mb-2 font-semibold">Warehouse Alerts</span>
          <span className="text-3xl font-bold text-amber-300">2</span>
        </div>
      </div>
      <button
        className="self-start bg-amber-400/90 hover:bg-amber-400 text-[#0c0d10] font-semibold px-6 py-3 rounded-lg shadow transition-colors border border-amber-400/30"
        onClick={() => router.push("/warehouse")}
      >
        Go to Warehouse
      </button>
    </main>
  );
}
