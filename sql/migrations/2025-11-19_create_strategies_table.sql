-- Create strategies table for saving AI-generated outreach strategies
CREATE TABLE IF NOT EXISTS strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  lead_name TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  lead_org TEXT,
  lead_venue TEXT,
  strategy_content TEXT NOT NULL,
  messages JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on lead_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_strategies_lead_id ON strategies(lead_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON strategies(created_at DESC);

-- Add RLS policies
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all strategies
CREATE POLICY "Allow authenticated users to view strategies"
  ON strategies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert strategies
CREATE POLICY "Allow authenticated users to insert strategies"
  ON strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own strategies
CREATE POLICY "Allow authenticated users to update strategies"
  ON strategies
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete strategies
CREATE POLICY "Allow authenticated users to delete strategies"
  ON strategies
  FOR DELETE
  TO authenticated
  USING (true);
