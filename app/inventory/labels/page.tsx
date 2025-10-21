'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BarcodeFormData {
  data: string;
  type: 'qr' | 'code128' | 'ean13';
  width: number;
  height: number;
}

export default function LabelPage() {
  const [formData, setFormData] = useState<BarcodeFormData>({
    data: '',
    type: 'code128',
    width: 200,
    height: 200
  });
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate barcode');
      }

      // Create a blob URL from the response for displaying the image
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBarcodeUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate barcode');
    }
  };

  const handlePrint = () => {
    if (barcodeUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Label</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${barcodeUrl}" alt="Barcode" onload="window.print();window.close()">
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Label Generator</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">
            Data
            <input
              type="text"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </label>
        </div>

        <div>
          <label className="block mb-2">
            Type
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as BarcodeFormData['type'] })}
              className="w-full p-2 border rounded"
            >
              <option value="code128">Code 128</option>
              <option value="ean13">EAN-13</option>
              <option value="qr">QR Code</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            Width
            <input
              type="number"
              value={formData.width}
              onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
              min="50"
              max="800"
              className="w-full p-2 border rounded"
            />
          </label>

          <label className="block">
            Height
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
              min="50"
              max="800"
              className="w-full p-2 border rounded"
            />
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Generate
          </button>
          
          {barcodeUrl && (
            <button
              type="button"
              onClick={handlePrint}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Print
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {barcodeUrl && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="border p-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={barcodeUrl} alt="Generated barcode" />
          </div>
        </div>
      )}
    </div>
  );
}