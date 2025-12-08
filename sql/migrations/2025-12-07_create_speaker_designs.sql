-- Create speaker_designs table to save generated cabinet designs
-- Stores AI-generated speaker cabinet designs with all specifications

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_speaker_designs_speaker_type ON public.speaker_designs(speaker_type);
CREATE INDEX IF NOT EXISTS idx_speaker_designs_status ON public.speaker_designs(status);
CREATE INDEX IF NOT EXISTS idx_speaker_designs_created_at ON public.speaker_designs(created_at DESC);

-- Enable RLS
ALTER TABLE public.speaker_designs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to speaker_designs" 
  ON public.speaker_designs 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_speaker_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER speaker_designs_updated_at
  BEFORE UPDATE ON public.speaker_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_speaker_designs_updated_at();

-- Add comment
COMMENT ON TABLE public.speaker_designs IS 'AI-generated speaker cabinet designs with specifications, blueprints, and research data';
