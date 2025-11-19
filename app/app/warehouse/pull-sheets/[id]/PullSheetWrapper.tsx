"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PullSheetRedesign from "./PullSheetRedesign";

type Item = {
  id: string;
  inventory_item_id?: string | null;
  item_name?: string;
  qty_requested?: number;
  qty_pulled?: number;
  qty_fulfilled?: number;
  notes?: string | null;
  category?: string | null;
  prep_status?: string | null;
  inventory_items?: {
    barcode?: string;
    name?: string;
    category?: string;
  };
};

type PullSheet = {
  id: string;
  name: string;
  status: string;
  scheduled_out_at: string | null;
  expected_return_at: string | null;
  notes: string | null;
  jobs?: {
    code?: string;
    title?: string;
    client?: string;
  };
};

export default function PullSheetDetailWrapper() {
  const params = useParams();
  const pullSheetId = params?.id as string;
  
  const [pullSheet, setPullSheet] = useState<PullSheet | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!pullSheetId) {
      setError('No pull sheet ID provided');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Load pull sheet with job info
      const { data: sheetData, error: sheetError } = await supabase
        .from('pull_sheets')
        .select(`
          *,
          jobs (code, title, client)
        `)
        .eq('id', pullSheetId)
        .single();

      if (sheetError) {
        console.error('Sheet error:', sheetError);
        throw new Error(sheetError.message || 'Failed to load pull sheet');
      }
      
      if (!sheetData) {
        throw new Error('Pull sheet not found');
      }
      
      setPullSheet(sheetData as any);

      // Load items with inventory details
      const { data: itemsData, error: itemsError } = await supabase
        .from('pull_sheet_items')
        .select(`
          *,
          inventory_items (barcode, name, category, gear_type, image_url)
        `)
        .eq('pull_sheet_id', pullSheetId)
        .order('sort_index', { ascending: true });

      console.log('=== PULL SHEET DATA DEBUG ===');
      console.log('Pull Sheet ID:', pullSheetId);
      console.log('Items Query Result:', itemsData);
      console.log('Items Error:', itemsError);
      console.log('Items Count:', itemsData?.length || 0);
      console.log('============================');

      if (itemsError) {
        console.error('Items error:', itemsError);
        throw new Error(itemsError.message || 'Failed to load items');
      }
      
      setItems((itemsData as any) || []);
      
    } catch (err: any) {
      console.error('Error loading pull sheet:', err);
      setError(err?.message || 'Failed to load pull sheet');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [pullSheetId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-lg text-zinc-400">Loading pull sheet...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !pullSheet) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-lg text-red-400 mb-4">{error || 'Pull sheet not found'}</div>
            <button 
              onClick={() => window.location.href = '/app/warehouse/pull-sheets'} 
              className="text-amber-400 hover:text-amber-300"
            >
              Back to Pull Sheets
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PullSheetRedesign
        pullSheet={pullSheet}
        items={items}
        onRefresh={loadData}
      />
    </DashboardLayout>
  );
}
