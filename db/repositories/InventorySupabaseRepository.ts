/**
 * Supabase Inventory Repository
 * Web implementation using Supabase
 */

import { supabase } from '@/lib/supabaseClient';
import { IInventoryRepository, InventoryItem } from './InventoryRepo';

export class InventorySupabaseRepository implements IInventoryRepository {
  async list(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }

    return data || [];
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return null;
    }

    return data;
  }

  async create(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select()
      .single();

    if (error) throw new Error(`Failed to create item: ${error.message}`);
    return data;
  }

  async update(id: string, changes: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update item: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      return false;
    }

    return true;
  }

  async searchByBarcode(barcode: string): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) {
      console.error('Error searching by barcode:', error);
      return null;
    }

    return data;
  }

  async searchByName(name: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .ilike('name', `%${name}%`);

    if (error) {
      console.error('Error searching by name:', error);
      return [];
    }

    return data || [];
  }

  async getByCategory(category: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('category', category);

    if (error) {
      console.error('Error fetching by category:', error);
      return [];
    }

    return data || [];
  }

  async getByLocation(location: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('location', location);

    if (error) {
      console.error('Error fetching by location:', error);
      return [];
    }

    return data || [];
  }

  async updateQuantity(id: string, qty: number): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ qty_in_warehouse: qty })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update quantity: ${error.message}`);
    return data;
  }

  async checkoutItem(id: string, qty: number): Promise<InventoryItem> {
    // Get current quantity
    const item = await this.getById(id);
    if (!item) throw new Error('Item not found');

    const newQty = Math.max(0, item.qty_in_warehouse - qty);

    return this.updateQuantity(id, newQty);
  }

  async returnItem(id: string, qty: number): Promise<InventoryItem> {
    // Get current quantity
    const item = await this.getById(id);
    if (!item) throw new Error('Item not found');

    const newQty = item.qty_in_warehouse + qty;

    return this.updateQuantity(id, newQty);
  }
}
