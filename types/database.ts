// Generated Supabase types for Bright Ops
//
// This file mirrors the structure of your Supabase database. Using
// these explicit types throughout your hooks and API routes ensures
// compile‑time safety when inserting, updating or selecting rows.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      /**
       * Inventory items represent individual pieces of equipment in
       * your warehouse. Quantities are tracked both in the warehouse
       * (`qty_in_warehouse`) and overall (`quantity_on_hand`).
       */
      inventory_items: {
        Row: {
          id: string;
          barcode: string;
          name: string;
          qty_in_warehouse: number | null;
          quantity_on_hand: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          barcode: string;
          name: string;
          qty_in_warehouse?: number | null;
          quantity_on_hand?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          barcode?: string;
          name?: string;
          qty_in_warehouse?: number | null;
          quantity_on_hand?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      /**
       * Inventory movements record increments and decrements of
       * `quantity_on_hand`. Each movement can optionally specify a
       * direction (e.g. "out") and a note for context.
       */
      inventory_movements: {
        Row: {
          id: string;
          item_id: string;
          qty: number;
          direction: string | null;
          note: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          qty: number;
          direction?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          qty?: number;
          direction?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Scan events log every barcode scan, whether successful or
       * unknown. The `result` field indicates the outcome (e.g.
       * "success" or "not_found").
       */
      scan_events: {
        Row: {
          id: string;
          barcode: string;
          result: string;
          job_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          barcode: string;
          result: string;
          job_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          barcode?: string;
          result?: string;
          job_id?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Jobs represent rental events or projects in the system. This is a generic definition using Json to ensure TypeScript correctness even without a full schema.
       */
      jobs: {
        Row: {
          id: string;
          code?: string;
          title?: string;
          status?: string;
          client?: string;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          code?: string;
          title?: string;
          status?: string;
          client?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          status?: string;
          client?: string;
          created_at?: string | null;
        };
      };
      /**
       * Clients represent companies or individuals that book jobs. Only the id and name are typed; additional columns default to Json.
       */
      clients: {
        Row: {
          id: string;
          name: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
        };
      };
      /**
       * Prep sheets group items that need to be prepared for a job. They are associated with a job and have a status.
       */
      prep_sheets: {
        Row: {
          id: string;
          job_id: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Each prep sheet has multiple items. This table tracks the required and picked quantity for each inventory item.
       */
      prep_sheet_items: {
        Row: {
          id: string;
          prep_sheet_id: string | null;
          inventory_item_id: string | null;
          required_qty: number | null;
          picked_qty: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          prep_sheet_id?: string | null;
          inventory_item_id?: string | null;
          required_qty?: number | null;
          picked_qty?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          prep_sheet_id?: string | null;
          inventory_item_id?: string | null;
          required_qty?: number | null;
          picked_qty?: number | null;
          created_at?: string | null;
        };
      };
      /**
       * Return manifests record the status of returned items for a job.
       */
      return_manifest: {
        Row: {
          id: string;
          job_id: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Transports represent vehicles or transport orders associated with jobs.
       */
      transports: {
        Row: {
          id: string;
          job_id: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Products catalogue your rentable items. Only id, name and barcode are typed; other fields fall back to Json.
       */
      products: {
        Row: {
          id: string;
          name: string | null;
          barcode: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          barcode?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          barcode?: string | null;
        };
      };
      /**
       * Serials track individual serialised items derived from a product.
       */
      serials: {
        Row: {
          id: string;
          product_id: string | null;
          serial_number: string | null;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          serial_number?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          serial_number?: string | null;
        };
      };
      /**
       * Scans capture barcode scans not tied to a particular job or manifest. They log what was scanned and when.
       */
      scans: {
        Row: {
          id: string;
          barcode: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          barcode?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          barcode?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Sheets represent generic containers for sheet items (used by prep and return workflows). This is a flexible definition.
       */
      sheets: {
        Row: {
          id: string;
          job_id: string | null;
          type: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          type?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          type?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
      /**
       * Sheet items link a sheet to either an inventory item or a product, with quantities.
       */
      sheet_items: {
        Row: {
          id: string;
          sheet_id: string | null;
          product_id: string | null;
          quantity: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          sheet_id?: string | null;
          product_id?: string | null;
          quantity?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          sheet_id?: string | null;
          product_id?: string | null;
          quantity?: number | null;
          created_at?: string | null;
        };
      };
      // Add additional table definitions as your schema grows
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      job_status: "draft" | "active" | "complete";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
