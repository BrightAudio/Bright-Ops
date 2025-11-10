"use client";

import { useState, useEffect } from "react";
import { generateBarcodeAndQRImages } from "@/lib/utils/barcodeGenerator";

interface BarcodePreviewProps {
  barcode: string;
  itemName: string;
}

export function BarcodePreview({ barcode, itemName }: BarcodePreviewProps) {
  const [barcodeImage, setBarcodeImage] = useState<string>("");
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (barcode) {
      setLoading(true);
      generateBarcodeAndQRImages(barcode)
        .then(({ barcodeImage: bcImg, qrCodeImage: qrImg }) => {
          setBarcodeImage(bcImg);
          setQrCodeImage(qrImg);
        })
        .catch((err) => {
          console.error("Failed to generate barcode images:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setBarcodeImage("");
      setQrCodeImage("");
    }
  }, [barcode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Generating barcode...</div>
      </div>
    );
  }

  if (!barcodeImage || !qrCodeImage) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800 mb-2">{itemName}</div>
        <img
          src={barcodeImage}
          alt={`Barcode ${barcode}`}
          className="max-w-full h-16 object-contain mb-2"
        />
        <img
          src={qrCodeImage}
          alt={`QR Code ${barcode}`}
          className="w-24 h-24 object-contain mb-2"
        />
        <div className="text-sm font-mono text-gray-600">{barcode}</div>
      </div>
    </div>
  );
}