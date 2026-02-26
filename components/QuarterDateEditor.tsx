'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface QuarterDates {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface QuarterDateEditorProps {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  currentDates: QuarterDates;
  onSave: (dates: QuarterDates) => Promise<void>;
  onClose: () => void;
}

export default function QuarterDateEditor({
  quarter,
  currentDates,
  onSave,
  onClose,
}: QuarterDateEditorProps) {
  const [startDate, setStartDate] = useState(currentDates.startDate);
  const [endDate, setEndDate] = useState(currentDates.endDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    setSaving(true);
    try {
      await onSave({ startDate, endDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save dates');
    } finally {
      setSaving(false);
    }
  };

  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  console.log('QuarterDateEditor rendering for quarter:', quarter);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
    >
      <div
        style={{ 
          backgroundColor: 'white', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '32px',
          width: '384px',
          maxWidth: '100%',
          position: 'relative',
          zIndex: 10000
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar size={24} style={{ color: '#fbbf24' }} />
            <h2 style={{ color: '#b45309' }} className="text-2xl font-bold">
              Edit {quarter} Dates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Start Date */}
        <div className="mb-6">
          <label style={{ color: '#b45309' }} className="block text-sm font-bold mb-2">
            Quarter Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setError(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* End Date */}
        <div className="mb-6">
          <label style={{ color: '#b45309' }} className="block text-sm font-bold mb-2">
            Quarter End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setError(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Duration Info */}
        {startDate && endDate && (
          <div
            style={{ backgroundColor: '#fef3c7', borderLeft: '3px solid #fbbf24' }}
            className="p-3 rounded mb-6"
          >
            <p style={{ color: '#78716c' }} className="text-sm">
              <strong>Duration:</strong> {days} days ({Math.ceil(days / 7)} weeks)
            </p>
            <p style={{ color: '#a16207' }} className="text-xs mt-1">
              {new Date(startDate).toLocaleDateString()} to{' '}
              {new Date(endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{ backgroundColor: '#fee2e2', borderLeft: '3px solid #dc2626' }}
            className="p-3 rounded mb-6"
          >
            <p style={{ color: '#991b1b' }} className="text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            className="flex-1 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: '#fbbf24', color: 'white' }}
            className="flex-1 py-2 rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
