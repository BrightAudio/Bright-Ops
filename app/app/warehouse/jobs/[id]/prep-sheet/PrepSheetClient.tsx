'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface PrepItem {
  id: string;
  equipment_id: string;
  equipment_name: string;
  quantity_required: number;
  quantity_picked: number;
}

interface PrepSheet {
  id: string;
  job_id: string;
  job_code: string;
  job_title: string;
  items: PrepItem[];
}

const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.error('Audio error:', e);
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error('Audio error:', e);
  }
};

export default function PrepSheetClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [prepSheet, setPrepSheet] = useState<PrepSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<Map<string, number>>(new Map());
  const [lastScanError, setLastScanError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrepSheet();
  }, [jobId]);

  const fetchPrepSheet = async () => {
    try {
      setLoading(true);
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, code, title')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      if (!jobData) throw new Error('Job not found');

      const { data: itemsData, error: itemsError } = await supabase
        .from('pull_sheet_items')
        .select('id, equipment_id, quantity')
        .eq('job_id', jobId);

      if (itemsError) throw itemsError;

      const itemsWithDetails: PrepItem[] = [];
      for (const item of itemsData || []) {
        const { data: equipmentData } = await supabase
          .from('inventory_items')
          .select('name')
          .eq('id', item.equipment_id)
          .single();

        itemsWithDetails.push({
          id: item.id,
          equipment_id: item.equipment_id,
          equipment_name: equipmentData?.name || 'Unknown Equipment',
          quantity_required: item.quantity,
          quantity_picked: 0,
        });
      }

      setPrepSheet({
        id: jobId,
        job_id: jobId,
        job_code: jobData.code,
        job_title: jobData.title,
        items: itemsWithDetails,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prep sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (equipmentId: string) => {
    if (!prepSheet) return;

    const item = prepSheet.items.find((i) => i.equipment_id === equipmentId);

    if (!item) {
      setLastScanError('Equipment not found in this job');
      playErrorSound();
      setTimeout(() => setLastScanError(null), 3000);
      return;
    }

    const currentCount = scannedItems.get(equipmentId) || 0;

    if (currentCount >= item.quantity_required) {
      setLastScanError('All units already picked');
      playErrorSound();
      setTimeout(() => setLastScanError(null), 3000);
      return;
    }

    // Update the scanned items
    scannedItems.set(equipmentId, currentCount + 1);
    setScannedItems(new Map(scannedItems));

    // Remove from warehouse inventory and update location
    try {
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select('qty_in_warehouse, quantity_on_hand')
        .eq('id', equipmentId)
        .single();

      if (inventoryData) {
        const newWarehouseQty = (inventoryData.qty_in_warehouse || 0) - 1;
        
        // Update inventory: reduce warehouse quantity and set location to job
        await supabase
          .from('inventory_items')
          .update({
            qty_in_warehouse: Math.max(0, newWarehouseQty),
            location: prepSheet.job_code, // Set location to job code for tracking
          })
          .eq('id', equipmentId);
      }

      setLastScanError(null);
      playSuccessSound();
    } catch (err) {
      console.error('Error updating inventory:', err);
      playErrorSound();
      setLastScanError('Error updating inventory');
      setTimeout(() => setLastScanError(null), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && scanInput.trim()) {
        e.preventDefault();
        handleScan(scanInput.trim());
        setScanInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanInput, scannedItems, prepSheet]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>
          Loading prep sheet...
        </div>
      </DashboardLayout>
    );
  }

  if (!prepSheet) {
    return (
      <DashboardLayout>
        <div style={{ padding: '2rem' }}>
          <div style={{ color: '#ff6b6b' }}>{error || 'Prep sheet not found'}</div>
          <button
            onClick={() => router.back()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#137CFB',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const progress = Array.from(scannedItems.values()).reduce((a, b) => a + b, 0);
  const total = prepSheet.items.reduce((a, b) => a + b.quantity_required, 0);
  const allComplete = progress === total && total > 0;

  return (
    <DashboardLayout>
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#137CFB',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '1rem',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
            Prep Sheet: {prepSheet.job_title}
          </h1>
          <p style={{ color: '#aaa', fontSize: '1.1rem' }}>
            {prepSheet.job_code}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.5rem' }}>
              Prep Progress
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 600, color: allComplete ? '#4caf50' : '#137CFB', marginBottom: '0.75rem' }}>
              {progress} / {total} items picked
            </div>
            <div
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: allComplete ? '#4caf50' : '#137CFB',
                  width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                  transition: 'width 0.2s',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <input
            type="text"
            placeholder="Scan equipment barcode or enter equipment ID..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#2a2b2c',
              border: lastScanError ? '2px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '1rem',
            }}
          />
          {lastScanError && (
            <div style={{ color: '#ff6b6b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {lastScanError}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {prepSheet.items.map((item) => {
            const picked = scannedItems.get(item.equipment_id) || 0;
            const isComplete = picked >= item.quantity_required;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: isComplete ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: isComplete ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                    {item.equipment_name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#aaa' }}>
                    Equipment ID: {item.equipment_id}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color: isComplete ? '#4caf50' : '#137CFB',
                    }}
                  >
                    {picked}/{item.quantity_required}
                  </div>
                  {isComplete && (
                    <div style={{ color: '#4caf50', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      ✓ Complete
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allComplete && (
          <div
            style={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              marginTop: '2rem',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#4caf50', marginBottom: '0.5rem' }}>
              Prep Complete!
            </h2>
            <p style={{ color: 'rgba(76, 175, 80, 0.8)', marginBottom: '1.5rem' }}>
              All equipment has been picked from the warehouse. Items are now tracked to this job.
            </p>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Back to Job
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
