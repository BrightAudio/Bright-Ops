/**
 * useCostEstimate - Hook for managing job cost estimates
 * 
 * Auto-calculates cost estimate from:
 * 1. Equipment rental costs (from prep sheet items)
 * 2. Labor charges (by role/crew assignments)
 * 3. Suggested invoice amount (base + 40% markup)
 */

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type CostLineItem = Database["public"]["Tables"]["cost_estimate_line_items"]["Row"];
type PrepSheetItem = {
  id: string;
  inventory_item_id: string | null;
  required_qty: number | null;
  inventory_item?: {
    name: string;
    rental_cost_daily: number | null;
    rental_cost_weekly: number | null;
  };
};

interface CostEstimateSummary {
  equipmentTotal: number;
  laborTotal: number;
  subtotal: number;
  suggestedMarkup: number; // 40%
  suggestedInvoiceAmount: number; // subtotal + markup
  lineItems: CostLineItem[];
}

export function useCostEstimate(jobId: string | null) {
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<CostEstimateSummary>({
    equipmentTotal: 0,
    laborTotal: 0,
    subtotal: 0,
    suggestedMarkup: 0,
    suggestedInvoiceAmount: 0,
    lineItems: []
  });

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    fetchCostEstimate();
  }, [jobId]);

  async function fetchCostEstimate() {
    if (!jobId) return;

    const supabase = supabaseBrowser();

    // Fetch existing line items
    const { data: lineItems } = await supabase
      .from("cost_estimate_line_items")
      .select("*")
      .eq("job_id", jobId)
      .order("sort_order", { ascending: true });

    if (lineItems && lineItems.length > 0) {
      // Use existing line items
      calculateTotals(lineItems);
    } else {
      // Auto-generate from prep sheet
      await generateFromPrepSheet();
    }

    setLoading(false);
  }

  async function generateFromPrepSheet() {
    if (!jobId) return;

    const supabase = supabaseBrowser();

    // Get prep sheet for this job
    const { data: prepSheets } = await supabase
      .from("prep_sheets")
      .select("id")
      .eq("job_id", jobId)
      .limit(1);

    if (!prepSheets || prepSheets.length === 0) {
      setLoading(false);
      return;
    }

    const prepSheetId = prepSheets[0].id;

    // Get prep sheet items with inventory details including amortization
    const { data: prepItems } = await supabase
      .from("prep_sheet_items")
      .select(`
        id,
        inventory_item_id,
        required_qty,
        inventory_items:inventory_item_id (
          name,
          rental_cost_daily,
          rental_cost_weekly,
          amortization_per_job
        )
      `)
      .eq("prep_sheet_id", prepSheetId);

    if (!prepItems) {
      setLoading(false);
      return;
    }

    // Create line items for equipment
    const newLineItems: CostLineItem[] = [];
    let sortOrder = 0;

    for (const item of prepItems) {
      const inventoryItem = Array.isArray(item.inventory_items) 
        ? item.inventory_items[0] 
        : item.inventory_items;

      if (!inventoryItem) continue;

      const quantity = item.required_qty || 1;
      const dailyRate = inventoryItem.rental_cost_daily || 0;

      // Create line item (don't insert yet, just for display)
      newLineItems.push({
        id: `temp-${sortOrder}`,
        job_id: jobId,
        item_type: "equipment",
        item_name: inventoryItem.name,
        description: null,
        quantity,
        unit_cost: dailyRate,
        total_cost: quantity * dailyRate,
        rental_period: "daily",
        role: null,
        is_editable: false,
        sort_order: sortOrder++,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Add placeholder labor line item
    newLineItems.push({
      id: `temp-labor`,
      job_id: jobId,
      item_type: "labor",
      item_name: "Labor Charges",
      description: "Crew labor (edit to add roles and rates)",
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
      rental_period: null,
      role: null,
      is_editable: true,
      sort_order: sortOrder++,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    calculateTotals(newLineItems);
  }

  function calculateTotals(lineItems: CostLineItem[]) {
    const equipmentTotal = lineItems
      .filter(item => item.item_type === "equipment")
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);

    const laborTotal = lineItems
      .filter(item => item.item_type === "labor")
      .reduce((sum, item) => sum + (item.total_cost || 0), 0);

    const subtotal = equipmentTotal + laborTotal;
    const suggestedMarkup = subtotal * 0.40; // 40% markup
    const suggestedInvoiceAmount = subtotal + suggestedMarkup;

    setEstimate({
      equipmentTotal,
      laborTotal,
      subtotal,
      suggestedMarkup,
      suggestedInvoiceAmount,
      lineItems
    });
  }

  async function saveLineItems(items: CostLineItem[]) {
    if (!jobId) return;

    const supabase = supabaseBrowser();

    // Delete existing line items
    await supabase
      .from("cost_estimate_line_items")
      .delete()
      .eq("job_id", jobId);

    // Insert new line items (filter out temp IDs)
    const itemsToInsert = items.map(item => ({
      job_id: jobId,
      item_type: item.item_type,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      rental_period: item.rental_period,
      role: item.role,
      is_editable: item.is_editable,
      sort_order: item.sort_order
    }));

    const { error } = await supabase
      .from("cost_estimate_line_items")
      .insert(itemsToInsert);

    if (!error) {
      // Update job cost_estimate_amount
      await supabase
        .from("jobs")
        .update({ cost_estimate_amount: estimate.subtotal })
        .eq("id", jobId);

      fetchCostEstimate();
    }
  }

  async function updateLineItem(itemId: string, updates: Partial<CostLineItem>) {
    const updatedItems = estimate.lineItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        // Recalculate total_cost if quantity or unit_cost changed
        if (updates.quantity !== undefined || updates.unit_cost !== undefined) {
          updated.total_cost = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      }
      return item;
    });

    calculateTotals(updatedItems);
    await saveLineItems(updatedItems);
  }

  async function addLineItem(itemType: "equipment" | "labor" | "other", itemName: string) {
    const newItem: CostLineItem = {
      id: `temp-${Date.now()}`,
      job_id: jobId,
      item_type: itemType,
      item_name: itemName,
      description: null,
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
      rental_period: itemType === "equipment" ? "daily" : null,
      role: itemType === "labor" ? "crew" : null,
      is_editable: true,
      sort_order: estimate.lineItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedItems = [...estimate.lineItems, newItem];
    calculateTotals(updatedItems);
    await saveLineItems(updatedItems);
  }

  async function deleteLineItem(itemId: string) {
    const updatedItems = estimate.lineItems.filter(item => item.id !== itemId);
    calculateTotals(updatedItems);
    await saveLineItems(updatedItems);
  }

  return {
    loading,
    estimate,
    updateLineItem,
    addLineItem,
    deleteLineItem,
    saveLineItems,
    refresh: fetchCostEstimate
  };
}
