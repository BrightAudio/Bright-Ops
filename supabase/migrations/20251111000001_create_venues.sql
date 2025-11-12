-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Info
  name TEXT NOT NULL,
  business_name TEXT,
  
  -- Location Details
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Contact Info
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- File Storage
  show_files JSONB DEFAULT '[]'::jsonb,
  room_tuning_files JSONB DEFAULT '[]'::jsonb,
  
  -- Notes
  notes TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_state ON venues(state);

-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read venues"
  ON venues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert venues"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete venues"
  ON venues FOR DELETE
  TO authenticated
  USING (true);

-- Add comments
COMMENT ON TABLE venues IS 'Stores venue/location information including show files and room tuning data';
COMMENT ON COLUMN venues.show_files IS 'Array of show file objects with name, url, uploaded_at';
COMMENT ON COLUMN venues.room_tuning_files IS 'Array of room tuning file objects with name, url, uploaded_at';
