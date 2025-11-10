"use client";

import { useState } from "react";
import {
  printBarcodeLabel,
  getPrinterCapabilities,
  LABEL_SIZES,
  type PrinterType,
  type LabelConfig,
} from "@/lib/utils/labelPrinter";

interface PrintBarcodeButtonProps {
  barcode: string;
  itemName: string;
  additionalInfo?: string;
  className?: string;
}

export function PrintBarcodeButton({
  barcode,
  itemName,
  additionalInfo,
  className = "",
}: PrintBarcodeButtonProps) {
  const [printing, setPrinting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capabilities = getPrinterCapabilities();

  async function handlePrint(
    method: "browser" | "bluetooth" | "usb",
    printerType: PrinterType = "zebra"
  ) {
    if (!barcode) {
      setError("No barcode to print");
      return;
    }

    setPrinting(true);
    setError(null);

    try {
      const config: LabelConfig = {
        ...LABEL_SIZES.medium,
        barcode,
        itemName,
        additionalInfo,
      };

      await printBarcodeLabel(config, { method, printerType });
      setShowOptions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to print");
      console.error("Print error:", err);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="relative inline-block">
      {/* Main Print Button */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        disabled={printing || !barcode}
        className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        {printing ? "Printing..." : "Print Label"}
      </button>

      {/* Dropdown Menu */}
      {showOptions && !printing && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs text-zinc-400 font-semibold mb-2 px-2">
              Select Print Method
            </div>

            {/* Browser Print (Always available) */}
            <button
              onClick={() => handlePrint("browser")}
              className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 text-white flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div className="text-sm">System Printer</div>
                <div className="text-xs text-zinc-400">Use any printer</div>
              </div>
            </button>

            {/* Bluetooth Print */}
            {capabilities.bluetooth && (
              <button
                onClick={() => handlePrint("bluetooth")}
                className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 text-white flex items-center gap-2 mt-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
                <div>
                  <div className="text-sm">Bluetooth Printer</div>
                  <div className="text-xs text-zinc-400">Zebra/Dymo wireless</div>
                </div>
              </button>
            )}

            {/* USB Print */}
            {capabilities.usb && (
              <button
                onClick={() => handlePrint("usb")}
                className="w-full text-left px-3 py-2 rounded hover:bg-zinc-700 text-white flex items-center gap-2 mt-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                <div>
                  <div className="text-sm">USB Label Printer</div>
                  <div className="text-xs text-zinc-400">Direct USB connection</div>
                </div>
              </button>
            )}

            {!capabilities.bluetooth && !capabilities.usb && (
              <div className="px-3 py-2 text-xs text-zinc-500 mt-1">
                Advanced printing requires Chrome or Edge browser
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-900 border border-red-700 text-red-100 px-3 py-2 rounded text-sm max-w-xs">
          {error}
        </div>
      )}

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}
