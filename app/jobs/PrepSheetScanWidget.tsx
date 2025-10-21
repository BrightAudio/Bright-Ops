"use client";
import { useState } from "react";
import { usePrepSheet, scanToPick } from "@/lib/hooks/usePrepSheets";

export default function PrepSheetScanWidget({ prepSheetId }: { prepSheetId: string }) {
  const { data, reload, loading } = usePrepSheet(prepSheetId);
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setError(null);
    try {
      await scanToPick(prepSheetId, barcode, 1, {
        onSuccess: reload,
        onFail: () => setError("Scan failed"),
      });
      setBarcode("");
    } catch {
      setError("Scan failed");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No prep sheet found.</div>;

  return (
    <div className="p-4 border rounded shadow w-96">
      <label className="block mb-2 font-bold">Scan to Pick:</label>
      <input
        className="border p-2 w-full mb-2"
        value={barcode}
        onChange={e => setBarcode(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleScan()}
        placeholder="Enter barcode"
      />
      <button
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
        onClick={handleScan}
      >
        Scan
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <div className="mt-4">
  {data.prep_sheet_items.map((item: any) => (
          <div key={item.id} className="mb-2">
            <div className="flex justify-between">
              <span>{item.inventory_items?.name || item.inventory_item_id}</span>
              <span>
                {item.picked_qty ?? 0} / {item.required_qty ?? 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div
                className="bg-blue-500 h-2 rounded"
                style={{
                  width: `${Math.min(100, ((item.picked_qty ?? 0) / (item.required_qty ?? 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
