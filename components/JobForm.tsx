'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { calculateTotalAmortizationForGear } from '@/lib/utils/jobAmortization';
import { useLocation } from '@/lib/contexts/LocationContext';

interface GearItem {
  id: string;
  name: string;
  amortization_per_job: number;
}

interface SelectedGear {
  gear_id: string;
  name: string;
  quantity: number;
  amortization_each: number;
  amortization_total: number;
}

export default function JobForm() {
  const { currentLocation } = useLocation();
  const [availableGear, setAvailableGear] = useState<GearItem[]>([]);
  const [selectedGear, setSelectedGear] = useState<SelectedGear[]>([]);
  const [clientName, setClientName] = useState('');
  const [jobDate, setJobDate] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load available gear on mount
  useEffect(() => {
    loadGear();
  }, []);

  const loadGear = async () => {
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, amortization_per_job')
        .not('amortization_per_job', 'is', null)
        .order('name');

      if (error) throw error;
      setAvailableGear(data || []);
    } catch (err) {
      console.error('Error loading gear:', err);
      setError('Failed to load equipment list');
    }
  };

  const addGearToJob = (gearId: string) => {
    const gear = availableGear.find(g => g.id === gearId);
    if (!gear) return;

    // Check if already added
    if (selectedGear.some(g => g.gear_id === gearId)) {
      setError('This equipment is already added');
      return;
    }

    const newGear: SelectedGear = {
      gear_id: gear.id,
      name: gear.name,
      quantity: 1,
      amortization_each: gear.amortization_per_job,
      amortization_total: calculateTotalAmortizationForGear(
        gear.amortization_per_job,
        1
      )
    };

    setSelectedGear([...selectedGear, newGear]);
    setError('');
  };

  const updateQuantity = (gearId: string, quantity: number) => {
    if (quantity < 1) return;

    setSelectedGear(
      selectedGear.map(g => {
        if (g.gear_id === gearId) {
          const amortizationTotal = calculateTotalAmortizationForGear(
            g.amortization_each,
            quantity
          );
          return { ...g, quantity, amortization_total: amortizationTotal };
        }
        return g;
      })
    );
  };

  const removeGear = (gearId: string) => {
    setSelectedGear(selectedGear.filter(g => g.gear_id !== gearId));
  };

  const calculateTotalAmortization = (): number => {
    return selectedGear.reduce((sum, g) => sum + g.amortization_total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate
      if (!clientName || !jobDate || !totalPrice || selectedGear.length === 0) {
        throw new Error('Please fill in all fields and add at least one equipment item');
      }

      // Prepare payload
      const payload = {
        client_name: clientName,
        job_date: jobDate,
        gear: selectedGear.map(g => ({
          gear_id: g.gear_id,
          quantity: g.quantity
        })),
        total_price: parseFloat(totalPrice),
        warehouse_location: currentLocation // Include current warehouse location
      };

      // Submit to API
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create job');
      }

      // Success! Reset form
      setSuccess(true);
      setClientName('');
      setJobDate('');
      setTotalPrice('');
      setSelectedGear([]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('Error creating job:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const totalAmortization = calculateTotalAmortization();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create New Job</h2>

      {/* Warehouse indicator */}
      {currentLocation && currentLocation !== 'All Locations' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded flex items-center gap-2">
          <i className="fas fa-warehouse"></i>
          <span>This job will be created for: <strong>{currentLocation}</strong></span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
          Job created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Client Information */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Enter client name"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Job Date</label>
          <input
            type="date"
            value={jobDate}
            onChange={(e) => setJobDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Total Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>

        {/* Equipment Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Add Equipment</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                addGearToJob(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select equipment to add...</option>
            {availableGear.map(gear => (
              <option key={gear.id} value={gear.id}>
                {gear.name} - ${gear.amortization_per_job.toFixed(4)}/job
              </option>
            ))}
          </select>
        </div>

        {/* Selected Equipment Table */}
        {selectedGear.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Selected Equipment</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Equipment</th>
                    <th className="border p-2 text-center">Quantity</th>
                    <th className="border p-2 text-right">Per Job</th>
                    <th className="border p-2 text-right">Total</th>
                    <th className="border p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGear.map(gear => (
                    <tr key={gear.gear_id}>
                      <td className="border p-2">{gear.name}</td>
                      <td className="border p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={gear.quantity}
                          onChange={(e) => updateQuantity(gear.gear_id, parseInt(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                      </td>
                      <td className="border p-2 text-right">
                        ${gear.amortization_each.toFixed(4)}
                      </td>
                      <td className="border p-2 text-right font-semibold">
                        ${gear.amortization_total.toFixed(2)}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeGear(gear.gear_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={3} className="border p-2 text-right">
                      Total Amortization:
                    </td>
                    <td className="border p-2 text-right text-lg">
                      ${totalAmortization.toFixed(2)}
                    </td>
                    <td className="border p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || selectedGear.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          {loading ? 'Creating Job...' : 'Create Job'}
        </button>
      </form>

      {/* Amortization Info */}
      {selectedGear.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Equipment Amortization:</strong> ${totalAmortization.toFixed(2)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            This represents the depreciation cost recovery for equipment used on this job.
          </p>
        </div>
      )}
    </div>
  );
}
