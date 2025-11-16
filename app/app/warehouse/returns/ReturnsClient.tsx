'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface ReturnItem {
  id: string;
  equipment_id: string;
  equipment_name: string;
  quantity: number;
  status: 'pending' | 'received' | 'damaged';
  created_at: string;
}

interface Return {
  id: string;
  job_id: string;
  job_code: string;
  job_title: string;
  expected_return_date: string;
  items: ReturnItem[];
  status: 'pending' | 'completed';
  created_at: string;
}

const playSuccessSound = () => {
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
};

const playErrorSound = () => {
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
};

export default function ReturnsClient() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: jobsData, error: jobsError } = await (supabase as any)
        .from('jobs')
        .select('id, code, title, expected_return_date')
        .lt('expected_return_date', today)
        .eq('archived', false);

      if (jobsError) throw jobsError;

      if (!jobsData) {
        setReturns([]);
        setLoading(false);
        return;
      }

      const returnsWithItems: Return[] = [];

      for (const job of jobsData as any[]) {
        const { data: itemsData, error: itemsError } = await (supabase as any)
          .from('pull_sheet_items')
          .select('id, equipment_id, quantity')
          .eq('job_id', job.id);

        if (itemsError) throw itemsError;

        const itemsWithDetails: ReturnItem[] = [];
        for (const item of itemsData || []) {
          const { data: equipmentData } = await (supabase as any)
            .from('equipment')
            .select('name')
            .eq('id', (item as any).equipment_id)
            .single();

          itemsWithDetails.push({
            id: (item as any).id,
            equipment_id: (item as any).equipment_id,
            equipment_name: equipmentData?.name || 'Unknown',
            quantity: (item as any).quantity,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }

        returnsWithItems.push({
          id: (job as any).id,
          job_id: (job as any).id,
          job_code: (job as any).code,
          job_title: (job as any).title,
          expected_return_date: (job as any).expected_return_date,
          items: itemsWithDetails,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }

      setReturns(returnsWithItems);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (barcode: string) => {
    if (!selectedReturn) return;

    const item = selectedReturn.items.find((i) => i.equipment_id === barcode);

    if (!item) {
      playErrorSound();
      return;
    }

    const currentCount = scannedItems.get(barcode) || 0;

    if (currentCount >= item.quantity) {
      playErrorSound();
      return;
    }

    scannedItems.set(barcode, currentCount + 1);
    setScannedItems(new Map(scannedItems));
    playSuccessSound();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && scanInput) {
        handleScan(scanInput);
        setScanInput('');
      } else {
        setScanInput((prev) => prev + e.key);
      }
    };

    if (selectedReturn) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedReturn, scanInput, scannedItems]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>
        Loading returns...
      </div>
    );
  }

  if (!selectedReturn) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#fff' }}>
          Returns
        </h1>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              color: '#ff6b6b',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {returns.length === 0 ? (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '3rem 1rem' }}>
            No returns due at this time.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {returns.map((ret) => (
              <div
                key={ret.id}
                onClick={() => setSelectedReturn(ret)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#aaa' }}>{ret.job_code}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
                    {ret.job_title}
                  </div>
                </div>
                <div style={{ color: '#aaa', fontSize: '0.875rem' }}>
                  Due: {new Date(ret.expected_return_date).toLocaleDateString()}
                </div>
                <div style={{ color: '#137CFB', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {ret.items.length} items
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const progress = Array.from(scannedItems.values()).reduce((a, b) => a + b, 0);
  const total = selectedReturn.items.reduce((a, b) => a + b.quantity, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setSelectedReturn(null)}
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
          ← Back to Returns
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#fff' }}>
          {selectedReturn.job_title}
        </h1>
        <p style={{ color: '#aaa' }}>{selectedReturn.job_code}</p>
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
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.25rem' }}>
            Progress
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#137CFB' }}>
            {progress} / {total} items received
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#137CFB',
              width: `${(progress / total) * 100}%`,
              transition: 'width 0.2s',
            }}
          />
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
          placeholder="Scan item or enter equipment ID..."
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#2a2b2c',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '1rem',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
        }}
      >
        {selectedReturn.items.map((item) => {
          const scanned = scannedItems.get(item.equipment_id) || 0;
          const isComplete = scanned >= item.quantity;

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: isComplete
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isComplete
                  ? '1px solid rgba(76, 175, 80, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                  {item.equipment_name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#aaa' }}>
                  Need: {item.quantity} | Scanned: {scanned}
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: isComplete ? '#4caf50' : '#137CFB',
                }}
              >
                {scanned}/{item.quantity}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
