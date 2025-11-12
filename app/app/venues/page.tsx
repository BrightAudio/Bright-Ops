"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useVenues, Venue } from "@/lib/hooks/useVenues";

export default function VenuesPage() {
  const [search, setSearch] = useState("");
  const { data: venues, loading, error, refetch } = useVenues({ search });

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Venues</h1>
            <p className="text-zinc-400">Manage venue locations, show files, and room tuning data</p>
          </div>
          <Link
            href="/app/venues/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <i className="fas fa-plus"></i>
            Add Venue
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venues by name or location..."
            className="w-full max-w-md px-4 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-white"
          />
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="text-zinc-400 text-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading venues...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* Venues Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues?.map((venue: Venue) => (
              <Link
                key={venue.id}
                href={`/app/venues/${venue.id}`}
                className="block p-6 bg-zinc-800/30 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <i className="fas fa-building text-blue-400"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                      <p className="text-sm text-zinc-400">{venue.business_name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <i className="fas fa-map-marker-alt text-zinc-500 w-4"></i>
                    <span>{venue.address || 'No address'}</span>
                  </div>
                  {venue.city && venue.state && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <i className="fas fa-location-dot text-zinc-500 w-4"></i>
                      <span>{venue.city}, {venue.state} {venue.zip_code}</span>
                    </div>
                  )}
                  {venue.contact_phone && (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <i className="fas fa-phone text-zinc-500 w-4"></i>
                      <span>{venue.contact_phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center gap-4 text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <i className="fas fa-file"></i>
                    <span>{venue.show_files?.length || 0} show files</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <i className="fas fa-sliders"></i>
                    <span>{venue.room_tuning_files?.length || 0} tuning files</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && venues?.length === 0 && (
          <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
            <i className="fas fa-building text-4xl text-zinc-600 mb-4"></i>
            <h3 className="text-xl font-semibold text-white mb-2">No venues found</h3>
            <p className="text-zinc-400 mb-4">
              {search ? 'Try adjusting your search' : 'Get started by adding your first venue'}
            </p>
            {!search && (
              <Link
                href="/app/venues/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <i className="fas fa-plus"></i>
                Add Venue
              </Link>
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
