'use client';

import { useState } from 'react';
import { getInventoryRepository } from '@/db/repositories';
import type { InventoryItem } from '@/db/repositories';

/**
 * Barcode Scanner Component
 * Converts to use repository pattern - works on both web and desktop
 * On desktop: queries SQLite via IPC
 * On web: queries Supabase
 */
export default function BarcodeScanner() {
  const [barcode, setBarcode] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);

  const handleScan = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim()) {
      setError('Please scan a valid barcode');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const repo = getInventoryRepository();
      const result = await repo.searchByBarcode(scannedBarcode);

      if (result) {
        setItem(result);
        setScannedCount(prev => prev + 1);
        // Clear barcode input after successful scan
        setBarcode('');
        
        // Play success sound (optional)
        playBeep();
      } else {
        setError(`No equipment found with barcode: ${scannedBarcode}`);
        setItem(null);
        setBarcode('');
      }
    } catch (err) {
      setError(`Scan failed: ${(err as Error).message}`);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const playBeep = () => {
    // Simple beep sound for successful scan
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      // Audio context not available, skip beep
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(barcode);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📱 Barcode Scanner</h1>
        <p className="text-gray-600">
          Scan equipment barcodes to view inventory details
        </p>
      </div>

      {/* Scanner Input */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
          Scan Barcode:
        </label>
        <input
          id="barcode"
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Scan barcode here or type manually..."
          disabled={loading}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          autoFocus
        />
        <button
          onClick={() => handleScan(barcode)}
          disabled={loading || !barcode.trim()}
          className={`mt-3 w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            loading || !barcode.trim()
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
          }`}
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          ❌ {error}
        </div>
      )}

      {/* Scanned Item Details */}
      {item && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-green-700 mb-4">✅ Item Found!</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Item Name</p>
              <p className="text-lg font-semibold">{item.name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Barcode</p>
              <p className="text-lg font-semibold">{item.barcode}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">In Warehouse</p>
              <p className="text-xl font-bold text-blue-600">{item.qty_in_warehouse} units</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="text-lg">{item.category}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="text-lg">{item.location}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Unit Value</p>
              <p className="text-lg">${item.unit_value?.toFixed(2) || 'N/A'}</p>
            </div>

            {item.maintenance_status && (
              <div>
                <p className="text-sm text-gray-600">Condition</p>
                <p className="text-lg">{item.maintenance_status}</p>
              </div>
            )}

            {item.purchase_cost && (
              <div>
                <p className="text-sm text-gray-600">Purchase Cost</p>
                <p className="text-lg">${item.purchase_cost.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setItem(null);
                setBarcode('');
              }}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Scan Another
            </button>

            <button
              onClick={() => {
                // Could navigate to checkout workflow
                alert('Checkout workflow: coming in next phase!');
              }}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
            >
              Checkout Item
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Items scanned in this session: <span className="font-bold text-lg">{scannedCount}</span>
        </p>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <p className="text-sm text-blue-800">
          💡 <strong>Works Offline:</strong> This scanner uses the repository pattern and works on both web (Supabase) and desktop (SQLite offline mode). Changes are tracked in the outbox for sync.
        </p>
      </div>
    </div>
  );
}
