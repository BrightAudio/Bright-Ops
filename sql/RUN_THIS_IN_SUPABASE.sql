-- ============================================
-- SPEAKER DESIGNER DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- STEP 1: Create speaker_parts table
-- ============================================

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
  xmax_excursion TEXT, -- Maximum linear excursion
  
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

-- Create indexes for speaker_parts
CREATE INDEX IF NOT EXISTS idx_speaker_parts_driver_type ON public.speaker_parts(driver_type);
CREATE INDEX IF NOT EXISTS idx_speaker_parts_is_available ON public.speaker_parts(is_available);
CREATE INDEX IF NOT EXISTS idx_speaker_parts_source_item ON public.speaker_parts(source_item_id);

-- Enable RLS for speaker_parts
ALTER TABLE public.speaker_parts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for speaker_parts (drop if exists first)
DROP POLICY IF EXISTS "Allow all access to speaker_parts" ON public.speaker_parts;
CREATE POLICY "Allow all access to speaker_parts" 
  ON public.speaker_parts 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Add updated_at trigger for speaker_parts
CREATE OR REPLACE FUNCTION update_speaker_parts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speaker_parts_updated_at ON public.speaker_parts;
CREATE TRIGGER speaker_parts_updated_at
  BEFORE UPDATE ON public.speaker_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_parts_updated_at();

-- Add comment for speaker_parts
COMMENT ON TABLE public.speaker_parts IS 'Salvaged speaker drivers and components from broken/archived equipment for use in custom speaker builds';


-- STEP 2: Create speaker_designs table
-- ============================================

CREATE TABLE IF NOT EXISTS public.speaker_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  speaker_type TEXT NOT NULL, -- line_array, sub, active, passive, etc.
  additional_types TEXT[], -- Additional attributes like active, passive
  
  -- Design specifications
  cabinet_dimensions JSONB, -- { width, height, depth, volume }
  port_specs JSONB, -- { diameter, length, tuning }
  materials JSONB, -- { woodCutList, steelBracing, dampening, crossover, ampPlate }
  blueprint JSONB, -- { woodCuts, steelCuts, bracingDesign, assemblyNotes }
  
  -- Drivers used in design
  drivers JSONB NOT NULL, -- Array of driver objects with specs
  
  -- Research data used
  blueprint_research TEXT, -- Research findings from web search
  driver_analysis JSONB, -- Analysis of each driver used
  ai_analysis TEXT, -- AI's overall analysis and recommendations
  
  -- Status and metadata
  status TEXT DEFAULT 'draft', -- draft, approved, built, archived
  notes TEXT,
  built_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for speaker_designs
CREATE INDEX IF NOT EXISTS idx_speaker_designs_speaker_type ON public.speaker_designs(speaker_type);
CREATE INDEX IF NOT EXISTS idx_speaker_designs_status ON public.speaker_designs(status);
CREATE INDEX IF NOT EXISTS idx_speaker_designs_created_at ON public.speaker_designs(created_at DESC);

-- Enable RLS for speaker_designs
ALTER TABLE public.speaker_designs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for speaker_designs (drop if exists first)
DROP POLICY IF EXISTS "Allow all access to speaker_designs" ON public.speaker_designs;
CREATE POLICY "Allow all access to speaker_designs" 
  ON public.speaker_designs 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Add updated_at trigger for speaker_designs
CREATE OR REPLACE FUNCTION update_speaker_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS speaker_designs_updated_at ON public.speaker_designs;
CREATE TRIGGER speaker_designs_updated_at
  BEFORE UPDATE ON public.speaker_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_designs_updated_at();

-- Add comment for speaker_designs
COMMENT ON TABLE public.speaker_designs IS 'AI-generated speaker cabinet designs with specifications, blueprints, and research data';


-- ============================================
-- VERIFICATION QUERIES (Run separately to check)
-- ============================================

-- Check if tables were created successfully:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('speaker_parts', 'speaker_designs');

-- Check speaker_parts structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'speaker_parts' ORDER BY ordinal_position;

-- Check speaker_designs structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'speaker_designs' ORDER BY ordinal_position;
