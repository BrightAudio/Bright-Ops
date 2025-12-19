'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Wrench, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type MaintenanceItem = {
  id: string;
  barcode: string;
  name: string;
  gear_type: string | null;
  maintenance_status: string;
  location: string;
  created_at: string;
  rental_notes: string | null;
};

type SpeakerPart = {
  id: string;
  name: string;
  driver_type: string;
  source_item_name: string;
  impedance: string;
  power_rating: string;
  diameter: string;
  condition: string;
  is_available: boolean;
  notes: string;
  created_at: string;
};

export default function MaintenanceClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'maintenance' | 'parts'>('maintenance');
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [parts, setParts] = useState<SpeakerPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    if (activeTab === 'maintenance') {
      loadMaintenanceItems();
    } else {
      loadParts();
    }
  }, [activeTab]);

  const loadMaintenanceItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .select('id, barcode, name, gear_type, maintenance_status, location, created_at, rental_notes')
        .in('maintenance_status', ['needs_repair', 'in_repair', 'maintenance'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading maintenance items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadParts = async () => {
    try {
      setLoading(true);
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
  };

  const selectedItem = items.find(item => item.id === selectedItemId);

  const handleSaveNotes = async () => {
    if (!selectedItem) return;

    try {
      setRepairing(true);
      const { error } = await (supabase as any)
        .from('inventory_items')
        .update({
          rental_notes: maintenanceNotes || null
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update the item in the list
      setItems(items.map(item => 
        item.id === selectedItem.id 
          ? { ...item, rental_notes: maintenanceNotes }
          : item
      ));
      alert('Notes saved!');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes');
    } finally {
      setRepairing(false);
    }
  };

  const handleRepair = async () => {
    if (!selectedItem) return;

    try {
      setRepairing(true);
      const { error } = await (supabase as any)
        .from('inventory_items')
        .update({
          maintenance_status: 'operational',
          location: 'Warehouse',
          rental_notes: maintenanceNotes ? `Repaired: ${maintenanceNotes}` : null
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Remove from the list
      setItems(items.filter(item => item.id !== selectedItem.id));
      setSelectedItemId(null);
      setMaintenanceNotes('');
      alert('Equipment repaired and returned to inventory!');
    } catch (err) {
      console.error('Error repairing item:', err);
      alert('Failed to repair equipment');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Archived Equipment</h1>
              <p className="text-gray-600 mt-1">Equipment under maintenance and salvaged parts</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600">
                {activeTab === 'maintenance' ? items.length : parts.length}
              </div>
              <div className="text-sm text-gray-600">
                {activeTab === 'maintenance' ? 'In Maintenance' : 'Parts Available'}
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'maintenance'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench size={16} className="inline mr-2" />
              Maintenance
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'parts'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔧 Parts/Drivers
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'maintenance' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Equipment List</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No equipment in maintenance</div>
              ) : (
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-orange-50 transition ${
                        selectedItemId === item.id ? 'bg-orange-50 border-l-4 border-l-orange-600' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.barcode}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.gear_type && <span className="inline-block bg-gray-100 px-2 py-1 rounded">{item.gear_type}</span>}
                      </div>
                      <div className="text-xs text-orange-600 font-semibold mt-1 capitalize">
                        {item.maintenance_status.replace('_', ' ')}
                      </div>
                      {item.rental_notes && (
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                          <span className="font-semibold">Notes: </span>{item.rental_notes}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Details */}
          <div className="lg:col-span-2">
            {!selectedItem ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Select an item to view details and maintenance notes
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                {/* Item Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600">Name</label>
                      <p className="text-gray-900 font-medium">{selectedItem.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Barcode</label>
                      <p className="text-gray-900 font-medium">{selectedItem.barcode}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Type</label>
                      <p className="text-gray-900 font-medium">{selectedItem.gear_type || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Status</label>
                      <p className="text-orange-600 font-medium capitalize">{selectedItem.maintenance_status.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Location</label>
                      <p className="text-gray-900 font-medium">{selectedItem.location}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Date Added</label>
                      <p className="text-gray-900 font-medium">{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Maintenance Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Maintenance Notes</label>
                  <textarea
                    value={maintenanceNotes}
                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                    placeholder="Enter maintenance notes, repair details, or work completed..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    rows={6}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={repairing}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    💾 Save Notes
                  </button>
                  <button
                    onClick={handleRepair}
                    disabled={repairing}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    <CheckCircle size={20} />
                    Repair & Return
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
          // Parts Tab
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading parts...</div>
            ) : parts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No parts available</div>
            ) : (
              parts.map(part => (
                <div key={part.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{part.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{part.driver_type}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      part.is_available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {part.is_available ? 'Available' : 'In Use'}
                    </span>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {part.source_item_name && (
                      <div>
                        <label className="block text-xs text-gray-500">Source</label>
                        <p className="text-sm text-gray-900">{part.source_item_name}</p>
                      </div>
                    )}
                    {part.impedance && (
                      <div>
                        <label className="block text-xs text-gray-500">Impedance</label>
                        <p className="text-sm text-gray-900">{part.impedance}</p>
                      </div>
                    )}
                    {part.power_rating && (
                      <div>
                        <label className="block text-xs text-gray-500">Power</label>
                        <p className="text-sm text-gray-900">{part.power_rating}</p>
                      </div>
                    )}
                    {part.diameter && (
                      <div>
                        <label className="block text-xs text-gray-500">Size</label>
                        <p className="text-sm text-gray-900">{part.diameter}</p>
                      </div>
                    )}
                  </div>
                  
                  {part.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                      <span className="font-semibold">Notes: </span>{part.notes}
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">Condition: <span className="font-medium">{part.condition}</span></span>
                    <span>{new Date(part.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
