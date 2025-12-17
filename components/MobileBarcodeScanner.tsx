"use client";

import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface MobileBarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function MobileBarcodeScanner({ onScan, onClose }: MobileBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  async function startScanning() {
    try {
      setScanning(true);
      setError(null);

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device');
        return;
      }

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Get video devices
      const videoInputDevices = await codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setError('No camera found on this device');
        return;
      }

      // Prefer back camera on mobile
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      const selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;

      // Start scanning
      if (videoRef.current) {
        codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const code = result.getText();
              onScan(code);
              stopScanning();
            }
          }
        );
      }
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Failed to start camera');
    }
  }

  function stopScanning() {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem' }}>
          Scan Barcode
        </h2>
        <button
          onClick={() => {
            stopScanning();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '2rem',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          ×
        </button>
      </div>

      {/* Scanner View */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {error ? (
          <div style={{
            color: '#fff',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>{error}</p>
            <button
              onClick={() => {
                stopScanning();
                onClose();
              }}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              maxWidth: '300px',
              height: '200px',
              border: '2px solid #667eea',
              borderRadius: '8px',
              boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Corner brackets */}
              <div style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                width: '30px',
                height: '30px',
                borderTop: '4px solid #667eea',
                borderLeft: '4px solid #667eea'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '30px',
                height: '30px',
                borderTop: '4px solid #667eea',
                borderRight: '4px solid #667eea'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '30px',
                height: '30px',
                borderBottom: '4px solid #667eea',
                borderLeft: '4px solid #667eea'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '30px',
                height: '30px',
                borderBottom: '4px solid #667eea',
                borderRight: '4px solid #667eea'
              }}></div>
            </div>

            {/* Instructions */}
            <div style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '1rem 2rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0 }}>Position barcode within the frame</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
