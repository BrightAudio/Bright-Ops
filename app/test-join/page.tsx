"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestJoinWarehousePage() {
  const [warehouseName, setWarehouseName] = useState("NEW SOUND Warehouse");
  const [pin, setPin] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = data 
      ? `[${timestamp}] ${message}: ${JSON.stringify(data, null, 2)}`
      : `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage, data);
  };

  const testFunction = async () => {
    setLogs([]);
    setTesting(true);
    
    try {
      addLog("Step 1: Checking authentication");
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        addLog("❌ Auth error", authError);
        setTesting(false);
        return;
      }
      
      if (!user) {
        addLog("❌ No user logged in");
        setTesting(false);
        return;
      }
      
      addLog("✅ User authenticated", { email: user.email, id: user.id });
      
      addLog("Step 2: Calling join_warehouse_with_pin RPC");
      const { data, error } = await supabase.rpc('join_warehouse_with_pin', {
        p_warehouse_name: warehouseName.trim(),
        p_pin: pin.trim()
      });
      
      addLog("Step 3: RPC response received", {
        hasData: !!data,
        dataType: typeof data,
        dataIsArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : 'N/A',
        hasError: !!error,
        errorType: typeof error
      });
      
      if (error) {
        addLog("❌ Error object", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          keys: Object.keys(error),
          fullError: error
        });
      }
      
      if (data) {
        addLog("✅ Data received", data);
        
        if (Array.isArray(data) && data.length > 0) {
          const result = data[0];
          addLog("Result object", result);
          
          if (result.success) {
            addLog("✅ SUCCESS - Warehouse joined!", {
              warehouseId: result.warehouse_id,
              warehouseName: result.warehouse_name,
              message: result.message
            });
          } else {
            addLog("❌ Function returned failure", {
              message: result.message
            });
          }
        } else {
          addLog("⚠️ Data is not an array or is empty");
        }
      }
      
    } catch (err: any) {
      addLog("❌ Caught exception", {
        message: err.message,
        stack: err.stack,
        fullError: err
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          Test Join Warehouse Function
        </h1>

        <div className="bg-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Parameters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Warehouse Name
              </label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="NEW SOUND Warehouse"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                PIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Enter PIN"
              />
            </div>

            <button
              onClick={testFunction}
              disabled={testing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Testing...
                </>
              ) : (
                <>
                  <i className="fas fa-flask"></i>
                  Run Test
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Logs</h2>
          
          {logs.length === 0 ? (
            <p className="text-zinc-400 italic">No logs yet. Run a test to see results.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log, index) => (
                <pre 
                  key={index}
                  className="text-xs font-mono text-zinc-300 bg-zinc-900 p-3 rounded border border-zinc-700 overflow-x-auto"
                >
                  {log}
                </pre>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
