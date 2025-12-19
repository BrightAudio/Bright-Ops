'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SpeakerPart = {
  id: string;
  name: string;
  driver_type: string;
  source_item_id?: string;
  source_item_name?: string;
  impedance?: string;
  power_rating?: string;
  frequency_response_low?: string;
  frequency_response_high?: string;
  sensitivity?: string;
  diameter?: string;
  voice_coil_diameter?: string;
  fs?: string;
  qts?: string;
  vas?: string;
  xmax?: string;
  condition: string;
  extraction_date?: string;
  notes?: string;
  is_available: boolean;
  used_in_design_id?: string;
};

export default function PartsArchivePage() {
  const router = useRouter();
  const [parts, setParts] = useState<SpeakerPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    driver_type: 'woofer',
    source_item_id: '',
    source_item_name: '',
    impedance: '',
    power_rating: '',
    frequency_response_low: '',
    frequency_response_high: '',
    sensitivity: '',
    diameter: '',
    voice_coil_diameter: '',
    fs: '',
    qts: '',
    vas: '',
    xmax: '',
    condition: 'working',
    notes: ''
  });

  useEffect(() => {
    loadParts();
    loadAvailableEquipment();
  }, []);

  async function loadParts() {
    try {
      const { data, error } = await (supabase as any)
        .from('speaker_parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParts(data || []);
    } catch (err) {
      console.error('Error loading parts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableEquipment() {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, subcategory, maintenance_status')
        .in('maintenance_status', ['needs_repair', 'retired', 'broken'])
        .in('subcategory', ['tops', 'subs', 'monitor_wedges', 'active_speakers'])
        .order('name');

      if (error) throw error;
      setAvailableEquipment(data || []);
    } catch (err) {
      console.error('Error loading equipment:', err);
    }
  }

  async function handleAddPart() {
    try {
      const { data, error } = await (supabase as any)
        .from('speaker_parts')
        .insert([{
          ...formData,
          source_item_id: formData.source_item_id || null,
          source_item_name: formData.source_item_name || null,
          is_available: true
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        name: '',
        driver_type: 'woofer',
        source_item_id: '',
        source_item_name: '',
        impedance: '',
        power_rating: '',
        frequency_response_low: '',
        frequency_response_high: '',
        sensitivity: '',
        diameter: '',
        voice_coil_diameter: '',
        fs: '',
        qts: '',
        vas: '',
        xmax: '',
        condition: 'working',
        notes: ''
      });

      loadParts();
    } catch (err) {
      console.error('Error adding part:', err);
      alert('Failed to add part');
    }
  }

  async function handleDeletePart(id: string) {
    if (!confirm('Delete this part?')) return;

    try {
      const { error } = await (supabase as any)
        .from('speaker_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadParts();
    } catch (err) {
      console.error('Error deleting part:', err);
      alert('Failed to delete part');
    }
  }

  async function handleToggleAvailability(id: string, currentStatus: boolean) {
    try {
      const { error } = await (supabase as any)
        .from('speaker_parts')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadParts();
    } catch (err) {
      console.error('Error updating availability:', err);
    }
  }

  function handleSourceChange(itemId: string) {
    const item = availableEquipment.find(e => e.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        source_item_id: itemId,
        source_item_name: item.name
      }));
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-zinc-400">Loading parts...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="md:hidden flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1 className="text-3xl font-bold text-white">Archive</h1>
          </div>
          <div className="flex gap-2 border-b border-zinc-700">
            <Link
              href="/app/archive/jobs"
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Completed Jobs
            </Link>
            <Link
              href="/app/archive/parts"
              className="px-4 py-2 text-amber-400 border-b-2 border-amber-400 font-medium"
            >
              Speaker Parts/Drivers
            </Link>
          </div>
        </div>

        {/* Add Button */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-zinc-400">
            Salvaged drivers and components from broken equipment
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            + Add Part/Driver
          </button>
        </div>

        {/* Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map(part => (
            <div
              key={part.id}
              className={`bg-zinc-800 border rounded-lg p-4 ${
                part.is_available ? 'border-zinc-700' : 'border-zinc-600 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{part.name}</h3>
                  <p className="text-sm text-zinc-400 capitalize">{part.driver_type?.replace('_', ' ')}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  part.is_available 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {part.is_available ? 'Available' : 'In Use'}
                </span>
              </div>

              {part.source_item_name && (
                <p className="text-sm text-zinc-500 mb-2">
                  From: {part.source_item_name}
                </p>
              )}

              <div className="space-y-1 text-sm text-zinc-300">
                {part.diameter && <p>• Size: {part.diameter}</p>}
                {part.impedance && <p>• Impedance: {part.impedance}</p>}
                {part.power_rating && <p>• Power: {part.power_rating}</p>}
                {part.sensitivity && <p>• Sensitivity: {part.sensitivity}</p>}
                {part.frequency_response_low && part.frequency_response_high && (
                  <p>• Freq: {part.frequency_response_low} - {part.frequency_response_high}</p>
                )}
              </div>

              {part.notes && (
                <p className="text-sm text-zinc-400 mt-2 italic">{part.notes}</p>
              )}

              <div className="mt-4 pt-3 border-t border-zinc-700 flex gap-2">
                <button
                  onClick={() => handleToggleAvailability(part.id, part.is_available)}
                  className="flex-1 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition-colors"
                >
                  {part.is_available ? 'Mark Used' : 'Mark Available'}
                </button>
                <button
                  onClick={() => handleDeletePart(part.id)}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {parts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-lg">No parts added yet</p>
            <p className="text-zinc-600 text-sm mt-2">Add salvaged drivers from broken equipment</p>
          </div>
        )}

        {/* Add Part Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-4">Add Speaker Part/Driver</h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                    placeholder="e.g., JBL 2226H Woofer"
                  />
                </div>

                {/* Driver Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Driver Type *
                  </label>
                  <select
                    value={formData.driver_type}
                    onChange={(e) => setFormData({ ...formData, driver_type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                  >
                    <option value="woofer">Woofer</option>
                    <option value="mid">Mid-Range</option>
                    <option value="tweeter">Tweeter</option>
                    <option value="compression_driver">Compression Driver</option>
                    <option value="passive_radiator">Passive Radiator</option>
                  </select>
                </div>

                {/* Source Equipment */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Source Equipment (Optional)
                  </label>
                  <select
                    value={formData.source_item_id}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                  >
                    <option value="">Select source equipment...</option>
                    {availableEquipment.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.maintenance_status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Diameter
                    </label>
                    <input
                      type="text"
                      value={formData.diameter}
                      onChange={(e) => setFormData({ ...formData, diameter: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 18 inch"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Impedance
                    </label>
                    <input
                      type="text"
                      value={formData.impedance}
                      onChange={(e) => setFormData({ ...formData, impedance: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 8 ohm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Power Rating
                    </label>
                    <input
                      type="text"
                      value={formData.power_rating}
                      onChange={(e) => setFormData({ ...formData, power_rating: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 500W RMS"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Sensitivity
                    </label>
                    <input
                      type="text"
                      value={formData.sensitivity}
                      onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 98 dB"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Freq Low (Hz)
                    </label>
                    <input
                      type="text"
                      value={formData.frequency_response_low}
                      onChange={(e) => setFormData({ ...formData, frequency_response_low: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 40 Hz"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      Freq High (Hz)
                    </label>
                    <input
                      type="text"
                      value={formData.frequency_response_high}
                      onChange={(e) => setFormData({ ...formData, frequency_response_high: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                      placeholder="e.g., 3 kHz"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                  >
                    <option value="working">Working</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="untested">Untested</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                    rows={3}
                    placeholder="Additional notes about this part..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPart}
                  disabled={!formData.name}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Add Part
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
