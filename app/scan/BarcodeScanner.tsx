"use client";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({
  onResult,
}: {
  onResult: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    async function start() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices?.[0]?.deviceId;
        if (!deviceId || !videoRef.current) return;

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (stopped) return;
          const text = result?.getText?.();
          if (text) onResult(text);
        });
      } catch (e) {
        // camera not granted / no device — safe to ignore for now
        // console.warn(e);
      }
    }

    start();

    // Cleanup: stop the camera stream directly (cross-version safe)
    return () => {
      stopped = true;
      const el = videoRef.current;
      const stream = (el?.srcObject as MediaStream | null) ?? null;
      if (stream) {
        for (const track of stream.getTracks()) {
          try { track.stop(); } catch {}
        }
        if (el) el.srcObject = null;
      }
    };
  }, [onResult]);

  return (
    <video
      ref={videoRef}
      style={{ width: "100%", maxWidth: 480, borderRadius: 8 }}
      muted
      playsInline
    />
  );
}
