"use client";

import React, { useEffect, useRef, useState } from 'react';
import { scanIn } from '@/lib/hooks/useInventory';

type ScanRow = {
  ts: string;
  barcode: string;
  result: 'success' | 'error';
  name?: string | null;
};

export default function ScanInPage() {
  const [barcode, setBarcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // audio refs
  const successAudio = useRef<HTMLAudioElement | null>(null);
  const failAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Put your MP3s in /public/sounds/
    successAudio.current = new Audio('/sounds/success.mp3');
    failAudio.current = new Audio('/sounds/fail.mp3');
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || busy) return;

    setBusy(true);
    try {
      const res = await scanIn(code);

      const row: ScanRow = {
        ts: new Date().toLocaleTimeString(),
        barcode: code,
        result: res.ok ? 'success' : 'error',
        name: res.item?.name ?? (res.ok ? '—' : 'Unknown'),
      };

      if (res.ok) {
        successAudio.current?.play().catch(() => {});
      } else {
        failAudio.current?.play().catch(() => {});
      }

      setScans((prev) => [row, ...prev]);
    } finally {
      setBusy(false);
      setBarcode('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4 text-blue-400">Free Scan (In)</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type a barcode…"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 text-white px-3 py-2 outline-none focus:border-blue-500"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !barcode.trim()}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-500"
        >
          {busy ? 'Scanning…' : 'Scan In'}
        </button>
      </form>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-4 text-sm bg-zinc-900/60 px-3 py-2">
          <div>Time</div>
          <div>Barcode</div>
          <div>Item</div>
          <div>Status</div>
        </div>

        <ul className="divide-y divide-zinc-800">
          {scans.map((row, i) => (
            <li key={i} className="grid grid-cols-4 px-3 py-2 text-sm">
              <div className="text-zinc-400">{row.ts}</div>
              <div className="font-mono">{row.barcode}</div>
              <div className="truncate">{row.name ?? 'Unknown'}</div>
              <div className={row.result === 'success' ? 'text-green-400' : 'text-red-400'}>
                {row.result === 'success' ? 'Added to warehouse' : 'Error'}
              </div>
            </li>
          ))}

          {scans.length === 0 && (
            <li className="px-3 py-6 text-sm text-zinc-500">
              No scans yet. Scan a barcode to begin.
            </li>
          )}
        </ul>
      </div>
    </div>
  );

