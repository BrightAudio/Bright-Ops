/**
 * Pull Sheet Supabase Repository
 * Web implementation using Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { IPullSheetRepository, PullSheet, PullSheetItem } from './PullSheetRepo';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class PullSheetSupabaseRepository implements IPullSheetRepository {
  async list(): Promise<PullSheet[]> {
    const { data, error } = await supabase
      .from('pull_sheets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing pull sheets:', error);
      return [];
    }
    return data || [];
  }

  async getById(id: string): Promise<PullSheet | null> {
    const { data, error } = await supabase
      .from('pull_sheets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting pull sheet:', error);
      return null;
    }
    return data;
  }

  async getByIdWithItems(id: string): Promise<PullSheet | null> {
    const { data, error } = await supabase
      .from('pull_sheets')
      .select(`
        *,
        items:pull_sheet_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting pull sheet with items:', error);
      return null;
    }
    return data as PullSheet;
  }

  async create(data: Omit<PullSheet, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<PullSheet> {
    const { data: newSheet, error } = await supabase
      .from('pull_sheets')
      .insert([{
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: true
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create pull sheet: ${error.message}`);
    }
    return newSheet;
  }

  async update(id: string, changes: Partial<PullSheet>): Promise<PullSheet> {
    const { data: updated, error } = await supabase
      .from('pull_sheets')
      .update({
        ...changes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update pull sheet: ${error.message}`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('pull_sheets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pull sheet:', error);
      return false;
    }
    return true;
  }

  async addItem(pullSheetId: string, item: Omit<PullSheetItem, 'id' | 'created_at' | 'updated_at'>): Promise<PullSheetItem> {
    const { data: newItem, error } = await supabase
      .from('pull_sheet_items')
      .insert([{
        ...item,
        pull_sheet_id: pullSheetId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add item: ${error.message}`);
    }
    return newItem;
  }

  async checkoutItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem> {
    // Get current state
    const { data: item, error: getError } = await supabase
      .from('pull_sheet_items')
      .select('*')
      .eq('id', itemId)
      .eq('pull_sheet_id', pullSheetId)
      .single();

    if (getError) {
      throw new Error(`Failed to get item: ${getError.message}`);
    }

    const newCheckedOut = (item.qty_checked_out || 0) + qty;
    const newStatus = newCheckedOut >= item.qty_needed ? 'checked_out' : 'partial';

    const { data: updated, error } = await supabase
      .from('pull_sheet_items')
      .update({
        qty_checked_out: newCheckedOut,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to checkout item: ${error.message}`);
    }
    return updated;
  }

  async returnItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem> {
    // Get current state
    const { data: item, error: getError } = await supabase
      .from('pull_sheet_items')
      .select('*')
      .eq('id', itemId)
      .eq('pull_sheet_id', pullSheetId)
      .single();

    if (getError) {
      throw new Error(`Failed to get item: ${getError.message}`);
    }

    const newReturned = (item.qty_returned || 0) + qty;
    const newStatus = newReturned >= item.qty_needed ? 'returned' : 'partial';

    const { data: updated, error } = await supabase
      .from('pull_sheet_items')
      .update({
        qty_returned: newReturned,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to return item: ${error.message}`);
    }
    return updated;
  }

  async getByJobId(jobId: string): Promise<PullSheet[]> {
    const { data, error } = await supabase
      .from('pull_sheets')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting pull sheets by job:', error);
      return [];
    }
    return data || [];
  }

  async getByStatus(status: string): Promise<PullSheet[]> {
    const { data, error } = await supabase
      .from('pull_sheets')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting pull sheets by status:', error);
      return [];
    }
    return data || [];
  }

  async getItem(pullSheetId: string, itemId: string): Promise<PullSheetItem | null> {
    const { data, error } = await supabase
      .from('pull_sheet_items')
      .select('*')
      .eq('pull_sheet_id', pullSheetId)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('Error getting pull sheet item:', error);
      return null;
    }
    return data;
  }

  async removeItem(pullSheetId: string, itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pull_sheet_items')
      .delete()
      .eq('id', itemId)
      .eq('pull_sheet_id', pullSheetId);

    if (error) {
      console.error('Error removing item:', error);
      return false;
    }
    return true;
  }
}
