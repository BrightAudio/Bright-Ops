"use client";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";

/** ✅ Force dynamic() to resolve to the default export (the component) */
const BarcodeScanner = dynamic(
  () => import("./BarcodeScanner").then((m) => m.default),
  { ssr: false, loading: () => <div>Starting camera…</div> }
);
const okBeep = typeof Audio !== "undefined" ? new Audio("/ok-beep.mp3") : null;
const errBeep = typeof Audio !== "undefined" ? new Audio("/err-beep.mp3") : null;


/** Optional: helper to play safely without crashing on browsers that block autoplay */
const playSafe = (a: HTMLAudioElement | null) => {
  try { a?.currentTime && (a.currentTime = 0); a?.play()?.catch(() => {}); } catch {}
};
export default function ScanConsole() {
    const inputRef = useRef<HTMLInputElement | null>(null);
  // Ref to avoid duplicate handling when camera + button both trigger a send
  const lastHandledRef = useRef<{ code: string; ts: number } | null>(null);
  const [jobCode, setJobCode] = useState("JOB-1001");
  const [code, setCode] = useState("VRX932-001");
  const [direction, setDirection] = useState<"OUT"|"IN">("OUT");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const codeToSend = code?.trim();
    if (!codeToSend) return; // nothing to send

    // If the same code was handled very recently, ignore to avoid double-trigger
    const now = Date.now();
    if (lastHandledRef.current?.code === codeToSend && now - lastHandledRef.current.ts < 1500) {
      return;
    }

    // mark this code as handled now
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
        // failure sound
        playSafe(errBeep);
        throw new Error(json?.error || "Request failed");
      }
      // ✅ success path: beep + show success
      playSafe(okBeep);
setMsg(`✅ ${direction} OK — ${code}`);

      setCode("");
      inputRef.current?.focus(); // clear after success
    } catch (e: any) {
      setError(e.message || "Unknown error");
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
  <BarcodeScanner onResult={(value) => { 
    // fill the input with the scanned value
    setCode(value);
  }} />
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
       onClick={() => {
    // prime sounds by loading them (don't call .play() here)
    try { okBeep?.load(); } catch {}
    try { errBeep?.load(); } catch {}
    send();
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
