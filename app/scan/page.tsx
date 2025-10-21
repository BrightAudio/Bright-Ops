"use client";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(
  () => import("./BarcodeScanner").then((m) => m.default),
  { ssr: false, loading: () => <div>Starting camera…</div> }
);
// Use success.mp3 for success and fail.mp3 for failure
const okBeep = typeof Audio !== "undefined" ? new Audio("/success.mp3") : null;
const errBeep = typeof Audio !== "undefined" ? new Audio("/fail.mp3") : null;

const playSafe = (a: HTMLAudioElement | null) => {
  try { a?.currentTime && (a.currentTime = 0); a?.play()?.catch(() => {}); } catch {}
};

type Direction = "OUT" | "IN";

export default function ScanConsole() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastHandledRef = useRef<{ code: string; ts: number } | null>(null);
  const [jobCode, setJobCode] = useState<string>("JOB-1001");
  const [code, setCode] = useState<string>("VRX932-001");
  const [direction, setDirection] = useState<Direction>("OUT");
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const codeToSend = code?.trim();
    if (!codeToSend) return;
    const now = Date.now();
    if (lastHandledRef.current?.code === codeToSend && now - lastHandledRef.current.ts < 1500) {
      return;
    }
    lastHandledRef.current = { code: codeToSend, ts: now };
    setLoading(true); setMsg(null); setError(null);
    try {
      const res = await fetch("/api/scan-direction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobCode,
          code,
          direction,
          scannedBy: "stephen",
          location: "Warehouse A",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        playSafe(errBeep);
        throw new Error(json?.error || "Request failed");
      } else {
        playSafe(okBeep);
        setMsg(`✅ ${direction} OK — ${code}`);
        setCode("");
        inputRef.current?.focus();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scan Console</h1>
      <label className="block text-sm font-medium mb-1">Job Code</label>
      <input
        className="w-full border rounded px-3 py-2 mb-4"
        value={jobCode}
        onChange={(e) => setJobCode(e.target.value)}
        placeholder="JOB-1001"
      />
      <div className="mb-4">
        <BarcodeScanner onResult={(value) => setCode(value)} />
      </div>
      <label className="block text-sm font-medium mb-1">Serial / Barcode</label>
      <input
        ref={inputRef}
        className="w-full border rounded px-3 py-2 mb-4"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Scan or type a barcode"
        onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(); }}
        autoFocus
      />
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded ${direction === "OUT" ? "bg-black text-white" : "border"}`}
          onClick={() => setDirection("OUT")}
          disabled={loading}
        >
          OUT
        </button>
        <button
          className={`px-3 py-2 rounded ${direction === "IN" ? "bg-black text-white" : "border"}`}
          onClick={() => setDirection("IN")}
          disabled={loading}
        >
          IN
        </button>
        <span className="text-sm opacity-70 ml-2">Current: <b>{direction}</b></span>
      </div>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        onClick={async () => {
          try {
            await Promise.all([
              okBeep?.load?.() || Promise.resolve(),
              errBeep?.load?.() || Promise.resolve()
            ]);
          } catch {}
          await send();
        }}
        disabled={loading}
      >
        {loading ? "Working..." : "Send Scan"}
      </button>
      <button
        className="px-4 py-2 rounded border ml-2"
        onClick={() => window.open(`/api/pullsheet?jobCode=${encodeURIComponent(jobCode)}`, "_blank")}
      >
        View Pull Sheet (Print → PDF)
      </button>
      {msg && <div className="mt-4 text-green-700">{msg}</div>}
      {error && <div className="mt-4 text-red-700">❌ {error}</div>}
    </div>
  );
}
