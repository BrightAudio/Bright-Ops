'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function SchemaTestPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function testTables() {
    setLoading(true);
    setResult('Testing...\n');
    const supabase = supabaseBrowser();
    let output = '';

    try {
      // Test employee_availability
      output += '=== Testing employee_availability table ===\n';
      const { data: avail, error: availError } = await supabase
        .from('employee_availability')
        .select('*')
        .limit(1);
      
      if (availError) {
        output += `❌ Error: ${availError.message}\n`;
        output += `Code: ${availError.code}\n`;
      } else {
        output += `✅ Table exists! Rows: ${avail?.length || 0}\n`;
      }

      // Test job_requests
      output += '\n=== Testing job_requests table ===\n';
      const { data: req, error: reqError } = await supabase
        .from('job_requests')
        .select('*')
        .limit(1);
      
      if (reqError) {
        output += `❌ Error: ${reqError.message}\n`;
        output += `Code: ${reqError.code}\n`;
      } else {
        output += `✅ Table exists! Rows: ${req?.length || 0}\n`;
      }

      // Test employees table with role column
      output += '\n=== Testing employees.role column ===\n';
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id, name, role, job_title')
        .limit(3);
      
      if (empError) {
        output += `❌ Error: ${empError.message}\n`;
        output += `Code: ${empError.code}\n`;
      } else {
        output += `✅ Columns exist!\n`;
        output += `Sample data:\n${JSON.stringify(emp, null, 2)}\n`;
      }

    } catch (err: any) {
      output += `\n❌ Exception: ${err.message}\n`;
    }

    setResult(output);
    setLoading(false);
  }

  async function forceSchemaReload() {
    setLoading(true);
    setResult('Attempting to force schema reload...\n');
    
    try {
      const response = await fetch(
        'https://qifhpsazsnmqnbnazrct.supabase.co/rest/v1/',
        {
          method: 'OPTIONS',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Prefer': 'schema=public'
          }
        }
      );
      
      setResult(prev => prev + `Response: ${response.status}\n`);
      setResult(prev => prev + `\nNow wait 30 seconds and click "Test Tables" again.\n`);
    } catch (err: any) {
      setResult(prev => prev + `Error: ${err.message}\n`);
    }
    
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-900 p-8 text-white font-mono">
      <h1 className="text-3xl font-bold text-amber-500 mb-6">Database Schema Test</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testTables}
          disabled={loading}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 text-black disabled:text-zinc-500 rounded font-bold"
        >
          {loading ? 'Testing...' : 'Test Tables'}
        </button>

        <button
          onClick={forceSchemaReload}
          disabled={loading}
          className="ml-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 text-white disabled:text-zinc-500 rounded font-bold"
        >
          Force Schema Reload (Attempt)
        </button>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-3 text-amber-500">Results:</h2>
        <pre className="text-sm whitespace-pre-wrap">{result || 'Click "Test Tables" to check database schema'}</pre>
      </div>

      <div className="mt-8 bg-zinc-800 border border-amber-500 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-500 mb-2">Manual Fix:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Go to <a href="https://supabase.com/dashboard/project/qifhpsazsnmqnbnazrct" target="_blank" className="text-blue-400 underline">Supabase Dashboard</a></li>
          <li>Click Settings (gear icon) in left sidebar</li>
          <li>Click "API" in the settings menu</li>
          <li>Scroll down and click "Reload schema cache" button</li>
          <li>Wait 10 seconds and return to test</li>
        </ol>
      </div>
    </main>
  );
}
