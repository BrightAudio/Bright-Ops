
// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let browserClient: SupabaseClient<Database> | null = null;

export const supabaseBrowser = (): SupabaseClient<Database> => {
  if (!browserClient) {
    browserClient = createClientComponentClient<Database>();
  }
  return browserClient;
};

// Maintain the singleton export expected across the app
export const supabase = supabaseBrowser();

// Export type helpers for easier access throughout the app
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
