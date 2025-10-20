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
    const videoEl = videoRef.current;
    let stopped = false;

    async function start() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices?.[0]?.deviceId;
        if (!deviceId || !videoEl) return;

        await reader.decodeFromVideoDevice(deviceId, videoEl, (result) => {
          if (stopped) return;
          const text = result?.getText?.();
          if (text) onResult(text);
        });
      } catch {
        // camera not granted / no device — safe to ignore for now
      }
    }

    start();

    // Cleanup: stop the camera stream directly (cross-version safe)
    return () => {
      stopped = true;
      if (!videoEl) return;

      const stream = videoEl.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch {
            // ignore stop errors
          }
        });
      }
      videoEl.srcObject = null;
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
