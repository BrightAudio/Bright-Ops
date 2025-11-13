const fs = require('fs');

const content = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          code: string
          title: string
          status: string | null
          client: string | null
          created_at: string
          cost_estimate_amount: number
          labor_cost: number
          event_date: string | null
          load_in_date: string | null
          load_out_date: string | null
          prep_start_date: string | null
          suggested_invoice_amount: number
          final_invoice_amount: number | null
          invoice_status: string
          total_amortization: number
          start_date: string | null
          end_date: string | null
          expected_return_date: string | null
          venue: string | null
          assigned_crew: Json
          notes: string | null
          start_at: string | null
          end_at: string | null
          income: number
          client_id: string | null
          profit: number
          archived: boolean
        }
        Insert: {
          id?: string
          code: string
          title: string
          status?: string | null
          client?: string | null
          created_at?: string
          cost_estimate_amount?: number
          labor_cost?: number
          event_date?: string | null
          load_in_date?: string | null
          load_out_date?: string | null
          prep_start_date?: string | null
          suggested_invoice_amount?: number
          final_invoice_amount?: number | null
          invoice_status?: string
          total_amortization?: number
          start_date?: string | null
          end_date?: string | null
          expected_return_date?: string | null
          venue?: string | null
          assigned_crew?: Json
          notes?: string | null
          start_at?: string | null
          end_at?: string | null
          income?: number
          client_id?: string | null
          profit?: number
          archived?: boolean
        }
        Update: {
          id?: string
          code?: string
          title?: string
          status?: string | null
          client?: string | null
          created_at?: string
          cost_estimate_amount?: number
          labor_cost?: number
          event_date?: string | null
          load_in_date?: string | null
          load_out_date?: string | null
          prep_start_date?: string | null
          suggested_invoice_amount?: number
          final_invoice_amount?: number | null
          invoice_status?: string
          total_amortization?: number
          start_date?: string | null
          end_date?: string | null
          expected_return_date?: string | null
          venue?: string | null
          assigned_crew?: Json
          notes?: string | null
          start_at?: string | null
          end_at?: string | null
          income?: number
          client_id?: string | null
          profit?: number
          archived?: boolean
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          barcode: string
          name: string
          qty_in_warehouse: number
          quantity_on_hand: number
          created_at: string
          unit_value: number
          gear_type: string | null
          product_type_code: string | null
          individual_item_code: string | null
          rental_cost_daily: number
          rental_cost_weekly: number
          rental_notes: string | null
          purchase_cost: number
          purchase_date: string
          useful_life_years: number
          estimated_jobs_per_year: number
          residual_value: number
          amortization_per_job: number
          total_jobs_used: number
          accumulated_amortization: number
          category: string | null
          tags: Json
          image_url: string | null
          repair_cost: number
          maintenance_status: string
          speaker_test_data: Record<string, unknown> | null
          location: string
          updated_at?: string
        }
        Insert: {
          id?: string
          barcode: string
          name: string
          qty_in_warehouse?: number
          quantity_on_hand?: number
          created_at?: string
          unit_value?: number
          gear_type?: string | null
          product_type_code?: string | null
          individual_item_code?: string | null
          rental_cost_daily?: number
          rental_cost_weekly?: number
          rental_notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          useful_life_years?: number
          estimated_jobs_per_year?: number
          residual_value?: number
          amortization_per_job?: number
          total_jobs_used?: number
          accumulated_amortization?: number
          category?: string | null
          tags?: Json
          image_url?: string | null
          repair_cost?: number
          maintenance_status?: string
          speaker_test_data?: Record<string, unknown> | null
          location?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barcode?: string
          name?: string
          qty_in_warehouse?: number
          quantity_on_hand?: number
          created_at?: string
          unit_value?: number
          gear_type?: string | null
          product_type_code?: string | null
          individual_item_code?: string | null
          rental_cost_daily?: number
          rental_cost_weekly?: number
          rental_notes?: string | null
          purchase_cost?: number
          purchase_date?: string
          useful_life_years?: number
          estimated_jobs_per_year?: number
          residual_value?: number
          amortization_per_job?: number
          total_jobs_used?: number
          accumulated_amortization?: number
          category?: string | null
          tags?: Json
          image_url?: string | null
          repair_cost?: number
          maintenance_status?: string
          speaker_test_data?: Record<string, unknown> | null
          location?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pull_sheets: {
        Row: {
          id: string
          job_id: string | null
          code: string
          status: string
          created_at: string
          finalized_at: string | null
          created_by: string | null
          notes: string | null
          image_url: string | null
          pdf_link: string | null
          legacy_row_id: number | null
          _legacy_job_id: number | null
          org_id: string | null
          expected_return_at: string | null
          name: string
          scheduled_out_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          code?: string
          status?: string
          created_at?: string
          finalized_at?: string | null
          created_by?: string | null
          notes?: string | null
          image_url?: string | null
          pdf_link?: string | null
          legacy_row_id?: number | null
          _legacy_job_id?: number | null
          org_id?: string | null
          expected_return_at?: string | null
          name: string
          scheduled_out_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          code?: string
          status?: string
          created_at?: string
          finalized_at?: string | null
          created_by?: string | null
          notes?: string | null
          image_url?: string | null
          pdf_link?: string | null
          legacy_row_id?: number | null
          _legacy_job_id?: number | null
          org_id?: string | null
          expected_return_at?: string | null
          name?: string
          scheduled_out_at?: string | null
          updated_at?: string
        }
      }
      pull_sheet_items: {
        Row: {
          id: string
          pull_sheet_id: string
          product_id: string | null
          qty_requested: number
          qty_pulled: number
          item_name: string
          barcode: string | null
          legacy_row_id: number | null
          _legacy_pull_sheet_id: number | null
          _legacy_product_id: number | null
          sort_index: number
          inventory_item_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          scanned_barcode: string | null
          category: string | null
          prep_status: string | null
          qty_fulfilled: number
        }
        Insert: {
          id?: string
          pull_sheet_id: string
          product_id?: string | null
          qty_requested?: number
          qty_pulled?: number
          item_name: string
          barcode?: string | null
          legacy_row_id?: number | null
          _legacy_pull_sheet_id?: number | null
          _legacy_product_id?: number | null
          sort_index?: number
          inventory_item_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          scanned_barcode?: string | null
          category?: string | null
          prep_status?: string | null
          qty_fulfilled?: number
        }
        Update: {
          id?: string
          pull_sheet_id?: string
          product_id?: string | null
          qty_requested?: number
          qty_pulled?: number
          item_name?: string
          barcode?: string | null
          legacy_row_id?: number | null
          _legacy_pull_sheet_id?: number | null
          _legacy_product_id?: number | null
          sort_index?: number
          inventory_item_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          scanned_barcode?: string | null
          category?: string | null
          prep_status?: string | null
          qty_fulfilled?: number
        }
      }
      transports: {
        Row: {
          id: string
          job_id: string | null
          type: string | null
          scheduled_at: string | null
          status: string | null
          created_at: string
          vehicle: string | null
          driver: string | null
          depart_at: string | null
          arrive_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          type?: string | null
          scheduled_at?: string | null
          status?: string | null
          created_at?: string
          vehicle?: string | null
          driver?: string | null
          depart_at?: string | null
          arrive_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          type?: string | null
          scheduled_at?: string | null
          status?: string | null
          created_at?: string
          vehicle?: string | null
          driver?: string | null
          depart_at?: string | null
          arrive_at?: string | null
          notes?: string | null
        }
      }
      scan_events: {
        Row: {
          id: string
          barcode: string
          result: string
          job_id: string | null
          created_at: string
          user_id: string | null
          item_id: string | null
          scan_type: string
        }
        Insert: {
          id?: string
          barcode: string
          result?: string
          job_id?: string | null
          created_at?: string
          user_id?: string | null
          item_id?: string | null
          scan_type?: string
        }
        Update: {
          id?: string
          barcode?: string
          result?: string
          job_id?: string | null
          created_at?: string
          user_id?: string | null
          item_id?: string | null
          scan_type?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          item_id: string
          movement_type: string
          quantity: number
          from_location: string | null
          to_location: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          item_id: string
          movement_type: string
          quantity: number
          from_location?: string | null
          to_location?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          movement_type?: string
          quantity?: number
          from_location?: string | null
          to_location?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      training_videos: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string
          thumbnail_url: string | null
          duration: number | null
          category: string | null
          created_at: string
          updated_at: string
          view_count: number
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url: string
          thumbnail_url?: string | null
          duration?: number | null
          category?: string | null
          created_at?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string
          thumbnail_url?: string | null
          duration?: number | null
          category?: string | null
          created_at?: string
          updated_at?: string
          view_count?: number
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          company_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
`;

fs.writeFileSync('./types/database.ts', content, 'utf8');
console.log('✅ Database types file generated successfully!');
