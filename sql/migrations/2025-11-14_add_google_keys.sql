-- Add Google API columns to existing leads_settings table
-- Run this if leads_settings already exists

ALTER TABLE public.leads_settings 
ADD COLUMN IF NOT EXISTS google_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_search_engine_id TEXT;
