export type Json =
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
          job_id: string
          name: string
          client_id: string | null
          status: string
          start_at: string | null
          end_at: string | null
          venue: string | null
          notes: string | null
          income: number | null
          labor_cost: number | null
          profit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id?: string
          name: string
          client_id?: string | null
          status?: string
          start_at?: string | null
          end_at?: string | null
          venue?: string | null
          notes?: string | null
          income?: number | null
          labor_cost?: number | null
          profit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          name?: string
          client_id?: string | null
          status?: string
          start_at?: string | null
          end_at?: string | null
          venue?: string | null
          notes?: string | null
          income?: number | null
          labor_cost?: number | null
          profit?: number | null
          created_at?: string
          updated_at?: string
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
          name: string
          barcode: string | null
          gear_type: string | null
          category: string | null
          quantity_on_hand: number | null
          qty_in_warehouse: number | null
          unit_value: number | null
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          useful_life_years: number | null
          estimated_jobs_per_year: number | null
          residual_value: number | null
          location: string | null
          tags: string[] | null
          image_url: string | null
          repair_cost: number | null
          maintenance_status: string | null
          speaker_test_data: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          barcode?: string | null
          gear_type?: string | null
          category?: string | null
          quantity_on_hand?: number | null
          qty_in_warehouse?: number | null
          unit_value?: number | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          useful_life_years?: number | null
          estimated_jobs_per_year?: number | null
          residual_value?: number | null
          location?: string | null
          tags?: string[] | null
          image_url?: string | null
          repair_cost?: number | null
          maintenance_status?: string | null
          speaker_test_data?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          barcode?: string | null
          gear_type?: string | null
          category?: string | null
          quantity_on_hand?: number | null
          qty_in_warehouse?: number | null
          unit_value?: number | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          useful_life_years?: number | null
          estimated_jobs_per_year?: number | null
          residual_value?: number | null
          location?: string | null
          tags?: string[] | null
          image_url?: string | null
          repair_cost?: number | null
          maintenance_status?: string | null
          speaker_test_data?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      pull_sheets: {
        Row: {
          id: string
          name: string
          job_id: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          job_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          job_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      pull_sheet_items: {
        Row: {
          id: string
          pull_sheet_id: string
          inventory_item_id: string
          qty_requested: number
          qty_fulfilled: number
          category: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pull_sheet_id: string
          inventory_item_id: string
          qty_requested: number
          qty_fulfilled?: number
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pull_sheet_id?: string
          inventory_item_id?: string
          qty_requested?: number
          qty_fulfilled?: number
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pull_sheet_item_scans: {
        Row: {
          id: string
          pull_sheet_id: string
          pull_sheet_item_id: string
          inventory_item_id: string
          barcode: string
          scanned_at: string
          scanned_by: string | null
          scan_status: string
          created_at: string
        }
        Insert: {
          id?: string
          pull_sheet_id: string
          pull_sheet_item_id: string
          inventory_item_id: string
          barcode: string
          scanned_at?: string
          scanned_by?: string | null
          scan_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          pull_sheet_id?: string
          pull_sheet_item_id?: string
          inventory_item_id?: string
          barcode?: string
          scanned_at?: string
          scanned_by?: string | null
          scan_status?: string
          created_at?: string
        }
      }
      pull_sheet_scans: {
        Row: {
          id: string
          pull_sheet_id: string
          inventory_item_id: string
          barcode: string
          scan_type: string
          scanned_at: string
          scanned_by: string | null
        }
        Insert: {
          id?: string
          pull_sheet_id: string
          inventory_item_id: string
          barcode: string
          scan_type: string
          scanned_at?: string
          scanned_by?: string | null
        }
        Update: {
          id?: string
          pull_sheet_id?: string
          inventory_item_id?: string
          barcode?: string
          scan_type?: string
          scanned_at?: string
          scanned_by?: string | null
        }
      }
      pull_sheet_substitutions: {
        Row: {
          id: string
          pull_sheet_id: string
          original_item_id: string
          substitute_item_id: string
          reason: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          pull_sheet_id: string
          original_item_id: string
          substitute_item_id: string
          reason?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          pull_sheet_id?: string
          original_item_id?: string
          substitute_item_id?: string
          reason?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      scan_events: {
        Row: {
          id: string
          barcode: string
          item_id: string | null
          scan_type: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          barcode: string
          item_id?: string | null
          scan_type: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          barcode?: string
          item_id?: string | null
          scan_type?: string
          created_at?: string
          user_id?: string | null
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
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
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
          view_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url: string
          thumbnail_url?: string | null
          duration?: number | null
          category?: string | null
          view_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string
          thumbnail_url?: string | null
          duration?: number | null
          category?: string | null
          view_count?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      transports: {
        Row: {
          id: string
          job_id: string | null
          vehicle: string | null
          driver: string | null
          depart_at: string | null
          arrive_at: string | null
          notes: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          vehicle?: string | null
          driver?: string | null
          depart_at?: string | null
          arrive_at?: string | null
          notes?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          vehicle?: string | null
          driver?: string | null
          depart_at?: string | null
          arrive_at?: string | null
          notes?: string | null
          status?: string | null
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
