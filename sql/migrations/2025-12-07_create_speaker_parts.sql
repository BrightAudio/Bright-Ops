-- Create speaker_parts table for salvaged drivers and components
-- These are parts extracted from broken/archived equipment

CREATE TABLE IF NOT EXISTS public.speaker_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  driver_type TEXT, -- woofer, mid, tweeter, compression_driver, passive_radiator
  source_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  source_item_name TEXT, -- Name of equipment it was pulled from
  
  -- Driver specifications
  impedance TEXT, -- e.g., "8 ohm", "16 ohm"
  power_rating TEXT, -- e.g., "500W RMS", "1000W peak"
  frequency_response_low TEXT, -- e.g., "40 Hz"
  frequency_response_high TEXT, -- e.g., "18 kHz"
  sensitivity TEXT, -- e.g., "98 dB"
  diameter TEXT, -- e.g., "18 inch", "1 inch"
  voice_coil_diameter TEXT, -- e.g., "4 inch"
  
  -- Thiele-Small parameters (for woofers/subs)
  fs TEXT, -- Resonant frequency
  qts TEXT, -- Total Q
  vas TEXT, -- Equivalent compliance volume
  xmax_excursion TEXT, -- Maximum linear excursion (renamed to avoid system column conflict)
  
  -- Condition and notes
  condition TEXT DEFAULT 'working', -- working, needs_repair, untested
  extraction_date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  used_in_design_id TEXT, -- Reference to design if used
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_speaker_parts_driver_type ON public.speaker_parts(driver_type);
CREATE INDEX IF NOT EXISTS idx_speaker_parts_is_available ON public.speaker_parts(is_available);
CREATE INDEX IF NOT EXISTS idx_speaker_parts_source_item ON public.speaker_parts(source_item_id);

-- Enable RLS
ALTER TABLE public.speaker_parts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to speaker_parts" 
  ON public.speaker_parts 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_speaker_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER speaker_parts_updated_at
  BEFORE UPDATE ON public.speaker_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_parts_updated_at();

-- Add comment
COMMENT ON TABLE public.speaker_parts IS 'Salvaged speaker drivers and components from broken/archived equipment for use in custom speaker builds';
