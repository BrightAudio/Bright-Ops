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
  const [showJoinForm, setShowJoinForm] = useState(false);
  
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

  async function testDatabaseConnection() {
    try {
      console.log('Testing database connection...');
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('warehouses')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Database connection test failed:', testError);
        return false;
      }
      
      console.log('✅ Database connection successful');
      
      // Try to call the RPC function with invalid params to see if it exists
      const { error: rpcError } = await supabase.rpc('join_warehouse_with_pin', {
        p_warehouse_name: '__test__',
        p_pin: '__test__'
      });
      
      // If error message includes "does not exist", function is missing
      if (rpcError?.message?.includes('does not exist') || rpcError?.message?.includes('function')) {
        console.error('❌ Function join_warehouse_with_pin does not exist in database');
        console.log('💡 Run the migration: sql/migrations/2025-12-12_warehouse_access_control.sql');
        return false;
      }
      
      console.log('✅ Function join_warehouse_with_pin exists');
      return true;
    } catch (error) {
      console.error('❌ Database test failed:', error);
      return false;
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

      console.log('Attempting to join warehouse:', { 
        warehouseName: warehouseName.trim(), 
        pinLength: warehousePin.length 
      });

      // Call the secure function to verify PIN and grant access
      // This bypasses RLS so users can join warehouses they don't have access to yet
      const { data, error } = await supabase.rpc('join_warehouse_with_pin', {
        p_warehouse_name: warehouseName.trim(),
        p_pin: warehousePin.trim()
      });

      console.log('=== RPC CALL COMPLETE ===');
      console.log('Has data?', !!data);
      console.log('Data value:', data);
      console.log('Data type:', typeof data);
      console.log('Data is array?', Array.isArray(data));
      console.log('Has error?', !!error);
      console.log('Error value:', error);
      console.log('Error type:', typeof error);
      console.log('Error is null?', error === null);
      console.log('Error is undefined?', error === undefined);
      console.log('Error truthiness:', error ? 'truthy' : 'falsy');
      console.log('========================');

      // Check both error cases: error object OR no data
      if (error || !data) {
        console.log('=== ENTERING ERROR HANDLER ===');
        
        if (error) {
          // Log comprehensive error information
          console.error('Error exists! Details:');
          console.error('- message:', error.message);
          console.error('- details:', error.details);
          console.error('- hint:', error.hint);
          console.error('- code:', error.code);
          console.error('- keys:', Object.keys(error));
          console.error('- stringified:', JSON.stringify(error));
          console.error('- raw object:', error);
          
          // Try to extract any properties
          for (const key in error) {
            console.error(`- error.${key}:`, (error as any)[key]);
          }
        }
        
        if (!data) {
          console.error('No data returned from RPC call!');
        }
        
        // Provide more helpful error messages
        let errorMessage = 'Unable to verify credentials';
        
        if (error) {
          if (error.message?.includes('function') && error.message?.includes('does not exist')) {
            errorMessage = 'Database function not found. Please contact administrator.';
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.code) {
            errorMessage = `Database error (${error.code}). Please try again.`;
          } else {
            errorMessage = 'Unknown database error. Check console for details.';
          }
        } else if (!data) {
          errorMessage = 'No response from database. Please try again.';
        }
        
        console.error('Setting error message:', errorMessage);
        setJoinError(`Error: ${errorMessage}`);
        setJoining(false);
        return;
      }
      
      console.log('=== NO ERROR - PROCESSING DATA ===');

      // Check if data is valid
      if (!data) {
        console.error('No data returned from RPC call');
        setJoinError('No response from server. Please try again.');
        setJoining(false);
        return;
      }

      if (!Array.isArray(data)) {
        console.error('Invalid response format:', { 
          data, 
          type: typeof data,
          isArray: Array.isArray(data),
          dataKeys: typeof data === 'object' ? Object.keys(data) : 'not object'
        });
        setJoinError('Invalid response from server. Please try again.');
        setJoining(false);
        return;
      }

      // Check result from function
      const result = data[0];
      console.log('Result from function:', {
        result,
        hasResult: !!result,
        success: result?.success,
        message: result?.message,
        warehouseId: result?.warehouse_id,
        warehouseName: result?.warehouse_name
      });
      
      if (!result) {
        console.error('Empty result from function');
        setJoinError('No response data. Please try again.');
        setJoining(false);
        return;
      }

      if (!result.success) {
        console.log('Function returned unsuccessful:', result.message);
        setJoinError(result.message || 'Invalid warehouse name or PIN');
        setJoining(false);
        return;
      }

      // Success!
      alert(`✅ Successfully joined ${result.warehouse_name}!`);
      setShowJoinForm(false);
      setWarehouseName("");
      setWarehousePin("");
      setJoinError("");
      
      // Refresh everything
      await Promise.all([
        loadWarehouses(),
        refreshLocations()
      ]);
      
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
      if (!user) {
        alert('You must be logged in');
        return;
      }

      console.log('Removing warehouse access:', { userId: user.id, warehouseId, warehouseName });

      // First verify the access exists
      const { data: existingAccess } = await supabase
        .from('user_warehouse_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('warehouse_id', warehouseId)
        .maybeSingle();

      if (!existingAccess) {
        console.warn('No access found to remove');
        alert('You do not have access to this warehouse');
        await loadWarehouses(); // Refresh to sync state
        return;
      }

      console.log('Found access record to delete:', existingAccess.id);

      // Delete the access
      const { error, data: deletedData } = await supabase
        .from('user_warehouse_access')
        .delete()
        .eq('user_id', user.id)
        .eq('warehouse_id', warehouseId)
        .select();

      if (error) {
        console.error('Error removing access:', error);
        alert(`Failed to remove access: ${error.message}`);
        return;
      }

      console.log('Successfully deleted access:', deletedData);

      // If this was the current location, switch to All Locations
      if (currentLocation === warehouseName) {
        setCurrentLocation('All Locations');
      }

      // Refresh the UI
      await Promise.all([
        loadWarehouses(),
        refreshLocations()
      ]);

      alert(`✅ Access to ${warehouseName} removed successfully. Inventory from this warehouse will no longer be visible.`);

      // Force a page reload to clear any cached inventory data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
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
              <p className="text-zinc-400">Manage warehouse access - all data is location-specific</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinForm(!showJoinForm)}
                className={`px-4 py-2 ${showJoinForm ? 'bg-zinc-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors flex items-center gap-2`}
              >
                <i className={`fas ${showJoinForm ? 'fa-times' : 'fa-plus'}`}></i>
                {showJoinForm ? 'Cancel' : 'Join Warehouse'}
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={testDatabaseConnection}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  title="Test database connection and function availability"
                >
                  <i className="fas fa-heartbeat"></i>
                  Test DB
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline Join Warehouse Form */}
        {showJoinForm && (
          <div className="mb-6 p-6 bg-zinc-800/50 border-2 border-blue-500/50 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">
              <i className="fas fa-key text-blue-400 mr-2"></i>
              Join Warehouse with PIN
            </h3>
            <p className="text-zinc-400 mb-4">
              Enter the warehouse name and PIN to gain access. All jobs, pullsheets, and clients are location-specific.
            </p>

            <form onSubmit={handleJoinWarehouse} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Warehouse Name
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="e.g., NEW SOUND Warehouse"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {joinError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {joinError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={joining}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {joining ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Joining...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Join Warehouse
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

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
              <div className="text-center py-16 px-4">
                <div className="inline-block p-6 bg-zinc-800/50 rounded-full mb-6">
                  <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-zinc-300 mb-3">No Warehouse Access Yet</h3>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                  You need to join a warehouse location to access inventory and create jobs. Contact your administrator for a warehouse name and PIN, then click the button below.
                </p>
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Join a Warehouse
                </button>
              </div>
            )}

            <div className="mt-8 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
              <h3 className="text-lg font-semibold text-white mb-2">
                <i className="fas fa-info-circle text-blue-400 mr-2"></i>
                Location-Based Access Control
              </h3>
              <p className="text-zinc-300 mb-3">
                <span className="font-bold text-blue-400">{currentLocation}</span> is currently selected.
              </p>
              <div className="text-sm text-zinc-400 space-y-1">
                <p>• <strong>Inventory:</strong> Only visible from accessible warehouses</p>
                <p>• <strong>Jobs:</strong> Location-specific, requires warehouse access</p>
                <p>• <strong>Pullsheets:</strong> Tied to warehouse location</p>
                <p>• <strong>Clients:</strong> Associated with warehouse locations</p>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-500">
                You have access to {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''}
              </div>
            </div>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
