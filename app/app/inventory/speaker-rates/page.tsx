'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';

interface UpdateResult {
  category: string;
  dailyRate: number;
  weeklyRate: number;
  count: number;
  speakers: string[];
}

export default function SetSpeakerRatesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UpdateResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalUpdated, setTotalUpdated] = useState(0);

  async function handleSetRates() {
    setLoading(true);
    setError(null);
    setResults(null);
    setTotalUpdated(0);

    try {
      const response = await fetch('/api/inventory/set-speaker-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set speaker rates');
      }

      const data = await response.json();
      setResults(data.results);
      setTotalUpdated(data.totalUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/app/inventory" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
              ← Back to Inventory
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Set Speaker Rental Rates</h1>
            <p className="text-zinc-400">Configure daily and weekly rental rates for speakers</p>
          </div>

          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-8 mb-6">
            <div className="space-y-4 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Rental Rate Schedule</h3>
                <div className="space-y-2 text-zinc-300">
                  <p><span className="font-medium text-green-400">Monitor Wedges & Column Speakers:</span> $75/day, $375/week</p>
                  <p><span className="font-medium text-blue-400">Tops & Subs:</span> $100/day, $500/week</p>
                  <p><span className="font-medium text-purple-400">L Acoustics Speakers:</span> $150/day, $750/week (by name)</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSetRates}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Updating speaker rental rates...
                </>
              ) : (
                <>🎵 Set Speaker Rental Rates</>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-4 mb-6">
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              <div className="rounded-lg border border-green-700/50 bg-green-900/20 p-4">
                <p className="text-green-400 font-semibold">✓ Success!</p>
                <p className="text-green-300 text-sm mt-1">
                  Updated <span className="font-bold text-green-200">{totalUpdated}</span> speaker(s) with new rental rates.
                </p>
              </div>

              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div key={idx} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{result.category}</h3>
                        <p className="text-sm text-zinc-400">
                          ${result.dailyRate}/day • ${result.weeklyRate}/week
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-blue-900/50 border border-blue-700/50 rounded text-blue-300 text-sm font-medium">
                        {result.count} item{result.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {result.speakers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <p className="text-xs text-zinc-500 mb-2">Speakers Updated:</p>
                        <ul className="space-y-1">
                          {result.speakers.map((speaker, i) => (
                            <li key={i} className="text-sm text-zinc-300">
                              • {speaker}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
