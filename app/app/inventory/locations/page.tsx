"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocation } from "@/lib/contexts/LocationContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  pin: string | null;
}

export default function StockLocationsPage() {
  const { currentLocation, setCurrentLocation, refreshLocations } = useLocation();
  const router = useRouter();
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Join warehouse form
  const [warehouseName, setWarehouseName] = useState("");
  const [warehousePin, setWarehousePin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get warehouses user has access to
      const { data: accessData, error: accessError } = await supabase
        .from('user_warehouse_access')
        .select('warehouse_id')
        .eq('user_id', user.id);

      if (accessError) {
        console.error('Error loading warehouse access:', accessError);
        setLoading(false);
        return;
      }

      if (!accessData || accessData.length === 0) {
        setWarehouses([]);
        setLoading(false);
        return;
      }

      const warehouseIds = accessData.map(a => a.warehouse_id);

      // Get warehouse details
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name, address, pin')
        .in('id', warehouseIds);

      if (warehousesError) {
        console.error('Error loading warehouses:', warehousesError);
      } else {
        setWarehouses(warehousesData || []);
      }
    } catch (error) {
      console.error('Error in loadWarehouses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setJoinError("");
    setJoining(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setJoinError("You must be logged in");
        setJoining(false);
        return;
      }

      // Find warehouse by name and PIN
      const { data: warehouse, error: searchError } = await supabase
        .from('warehouses')
        .select('id, name, address, pin')
        .ilike('name', warehouseName.trim())
        .eq('pin', warehousePin)
        .maybeSingle();

      if (searchError) {
        console.error('Search error:', searchError);
        setJoinError('Error searching for warehouse');
        setJoining(false);
        return;
      }

      if (!warehouse) {
        setJoinError('No warehouse found with that name and PIN. Check your credentials.');
        setJoining(false);
        return;
      }

      // Check if user already has access
      const { data: existingAccess } = await supabase
        .from('user_warehouse_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('warehouse_id', warehouse.id)
        .maybeSingle();

      if (existingAccess) {
        setJoinError('You already have access to this warehouse');
        setJoining(false);
        return;
      }

      // Grant access
      const { error: insertError } = await supabase
        .from('user_warehouse_access')
        .insert({
          user_id: user.id,
          warehouse_id: warehouse.id,
          granted_by: user.id
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        setJoinError('Failed to grant warehouse access');
        setJoining(false);
        return;
      }

      // Success!
      alert(`✅ Successfully joined ${warehouse.name}!`);
      setShowJoinModal(false);
      setWarehouseName("");
      setWarehousePin("");
      loadWarehouses(); // Reload the list
      refreshLocations(); // Refresh the context
      
    } catch (error: any) {
      console.error('Error joining warehouse:', error);
      setJoinError(error?.message || 'Unknown error occurred');
    } finally {
      setJoining(false);
    }
  }

  async function handleRemoveAccess(warehouseId: string, warehouseName: string) {
    if (!confirm(`Remove access to ${warehouseName}? You'll need the PIN to rejoin.`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_warehouse_access')
        .delete()
        .eq('user_id', user.id)
        .eq('warehouse_id', warehouseId);

      if (error) {
        console.error('Error removing access:', error);
        alert('Failed to remove access');
        return;
      }

      alert('Access removed successfully');
      loadWarehouses();
      refreshLocations(); // Refresh the context
      
      // If this was the current location, switch to first available or none
      if (currentLocation === warehouseName) {
        const remaining = warehouses.filter(w => w.id !== warehouseId);
        if (remaining.length > 0) {
          setCurrentLocation(remaining[0].name);
        } else {
          setCurrentLocation('All Locations');
        }
      }
    } catch (error) {
      console.error('Error in handleRemoveAccess:', error);
      alert('Failed to remove access');
    }
  }

  // Build location list: "All Locations" + user's warehouses
  const allLocations = ['All Locations', ...warehouses.map(w => w.name)];

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <span>←</span>
            Back
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white">Stock Locations</h1>
              <p className="text-zinc-400">Select your active warehouse location to filter inventory</p>
            </div>
            
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Join Warehouse
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-zinc-400 mt-4">Loading warehouses...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* All Locations option */}
              <div
                onClick={() => setCurrentLocation('All Locations')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  currentLocation === 'All Locations'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <i className={`fas fa-globe text-2xl ${
                    currentLocation === 'All Locations' ? 'text-blue-400' : 'text-zinc-400'
                  }`}></i>
                  {currentLocation === 'All Locations' && (
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">All Locations</h3>
                <p className="text-sm text-zinc-400">
                  View equipment from all accessible warehouses
                </p>
              </div>

              {/* User's warehouses */}
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    currentLocation === warehouse.name
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      onClick={() => setCurrentLocation(warehouse.name)}
                      className="flex-1 cursor-pointer"
                    >
                      <i className={`fas fa-map-marker-alt text-2xl ${
                        currentLocation === warehouse.name ? 'text-blue-400' : 'text-zinc-400'
                      }`}></i>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentLocation === warehouse.name && (
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                          ACTIVE
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveAccess(warehouse.id, warehouse.name)}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Remove access"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div
                    onClick={() => setCurrentLocation(warehouse.name)}
                    className="cursor-pointer"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{warehouse.name}</h3>
                    {warehouse.address && (
                      <p className="text-xs text-zinc-500 mb-2">{warehouse.address}</p>
                    )}
                    <p className="text-sm text-zinc-400">
                      Filter inventory to {warehouse.name} only
                    </p>
                    {warehouse.pin && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <span className="text-xs text-zinc-500">PIN: </span>
                        <span className="text-xs font-mono text-zinc-400">{warehouse.pin}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {warehouses.length === 0 && (
              <div className="text-center py-12 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <i className="fas fa-warehouse text-4xl text-zinc-600 mb-4"></i>
                <h3 className="text-xl font-semibold text-white mb-2">No Warehouses Yet</h3>
                <p className="text-zinc-400 mb-4">
                  Click "Join Warehouse" to access a warehouse location with a PIN
                </p>
              </div>
            )}

            <div className="mt-8 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <h3 className="text-lg font-semibold text-white mb-2">
                <i className="fas fa-info-circle text-blue-400 mr-2"></i>
                Current Active Location
              </h3>
              <p className="text-zinc-300">
                <span className="font-bold text-blue-400">{currentLocation}</span> is currently selected.
                The inventory page will show items from this location.
              </p>
            </div>
          </>
        )}

        {/* Join Warehouse Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Join Warehouse</h2>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError("");
                    setWarehouseName("");
                    setWarehousePin("");
                  }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <p className="text-zinc-400 mb-6">
                Enter the warehouse name and PIN to gain access
              </p>

              <form onSubmit={handleJoinWarehouse}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Warehouse Name
                    </label>
                    <input
                      type="text"
                      value={warehouseName}
                      onChange={(e) => setWarehouseName(e.target.value)}
                      placeholder="e.g., NEW SOUND Warehouse"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Access PIN
                    </label>
                    <input
                      type="text"
                      value={warehousePin}
                      onChange={(e) => setWarehousePin(e.target.value)}
                      placeholder="Enter PIN"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  {joinError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {joinError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowJoinModal(false);
                        setJoinError("");
                        setWarehouseName("");
                        setWarehousePin("");
                      }}
                      className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={joining}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? 'Joining...' : 'Join Warehouse'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
