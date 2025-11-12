"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocation, LOCATIONS, LocationType } from "@/lib/contexts/LocationContext";
import { useRouter } from "next/navigation";

export default function StockLocationsPage() {
  const { currentLocation, setCurrentLocation } = useLocation();
  const router = useRouter();

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <span>←</span>
            Back
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Stock Locations</h1>
          <p className="text-zinc-400">Select your active warehouse location to filter inventory</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LOCATIONS.map((location) => (
            <div
              key={location}
              onClick={() => setCurrentLocation(location)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                currentLocation === location
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <i className={`fas fa-map-marker-alt text-2xl ${
                  currentLocation === location ? 'text-blue-400' : 'text-zinc-400'
                }`}></i>
                {currentLocation === location && (
                  <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{location}</h3>
              <p className="text-sm text-zinc-400">
                {location === 'All Locations' 
                  ? 'View equipment from all warehouse locations'
                  : `Filter inventory to ${location} only`}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <h3 className="text-lg font-semibold text-white mb-2">
            <i className="fas fa-info-circle text-blue-400 mr-2"></i>
            Current Active Location
          </h3>
          <p className="text-zinc-300">
            <span className="font-bold text-blue-400">{currentLocation}</span> is currently selected.
            The inventory page will show items from this location.
          </p>
        </div>
      </main>
    </DashboardLayout>
  );
}
