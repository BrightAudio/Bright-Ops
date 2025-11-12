// Auto-generated database types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          code: string | null
          status: string
          start_at: string | null
          end_at: string | null
          venue: string | null
          notes: string | null
          income: number | null
          labor_cost: number | null
          profit: number | null
          client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          code?: string | null
          status?: string
          start_at?: string | null
          end_at?: string | null
          venue?: string | null
          notes?: string | null
          income?: number | null
          labor_cost?: number | null
          profit?: number | null
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          code?: string | null
          status?: string
          start_at?: string | null
          end_at?: string | null
          venue?: string | null
          notes?: string | null
          income?: number | null
          labor_cost?: number | null
          profit?: number | null
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pull_sheets: {
        Row: {
          id: string
          name: string
          job_id: string
          status: string | null
          scheduled_out_at: string | null
          expected_return_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          job_id: string
          status?: string | null
          scheduled_out_at?: string | null
          expected_return_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          job_id?: string
          status?: string | null
          scheduled_out_at?: string | null
          expected_return_at?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      [key: string]: {
        Row: any
        Insert: any
        Update: any
      }
    }
  }
}