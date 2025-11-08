"use client";
import { useRef, useState } from "react";
import { scanIn } from "@/lib/hooks/useInventory";

export default function FreeScanInWidget() {
  const [barcode, setBarcode] = useState("");
  const successAudio = useRef<HTMLAudioElement>(null);
  const failAudio = useRef<HTMLAudioElement>(null);

  const handleScan = async () => {
    try {
      const res = await scanIn(barcode, {});
      if (res.ok) {
        successAudio.current?.play();
      } else {
        failAudio.current?.play();
      }
      setBarcode("");
    } catch {
      failAudio.current?.play();
    }
  };

  return (
    <div className="p-4 border rounded shadow w-80">
      <label className="block mb-2 font-bold">Scan Barcode:</label>
      <input
        className="border p-2 w-full mb-2"
        value={barcode}
        onChange={e => setBarcode(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleScan()}
        placeholder="Enter barcode"
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        onClick={handleScan}
      >
        Scan In
      </button>
      <audio ref={successAudio} src="/sounds/success.mp3" />
      <audio ref={failAudio} src="/sounds/fail.mp3" />
    </div>
  );
}
