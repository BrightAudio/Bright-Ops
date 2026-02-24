/**
 * Inventory Repository Interface
 * Defines all inventory operations
 * Implemented differently for web (Supabase) and desktop (SQLite)
 */

import { IRepository } from './base';

export type InventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  qty_in_warehouse: number;
  category: string;
  location: string;
  unit_value: number;
  purchase_cost: number;
  purchase_date: string | null;
  maintenance_status: string;
  repair_cost: number;
  image_url: string | null;
  updated_at: string;
};

export interface IInventoryRepository extends IRepository<InventoryItem> {
  list(): Promise<InventoryItem[]>;
  getById(id: string): Promise<InventoryItem | null>;
  create(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem>;
  update(id: string, changes: Partial<InventoryItem>): Promise<InventoryItem>;
  delete(id: string): Promise<boolean>;
  
  // Additional inventory-specific methods
  searchByBarcode(barcode: string): Promise<InventoryItem | null>;
  searchByName(name: string): Promise<InventoryItem[]>;
  getByCategory(category: string): Promise<InventoryItem[]>;
  getByLocation(location: string): Promise<InventoryItem[]>;
  updateQuantity(id: string, qty: number): Promise<InventoryItem>;
  checkoutItem(id: string, qty: number): Promise<InventoryItem>;
  returnItem(id: string, qty: number): Promise<InventoryItem>;
}
