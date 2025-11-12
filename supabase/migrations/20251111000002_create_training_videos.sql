-- Create training_videos table
CREATE TABLE IF NOT EXISTS training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Video Info
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  
  -- Organization
  category TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  duration_minutes INTEGER,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  
  -- Order
  display_order INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_training_videos_category ON training_videos(category);
CREATE INDEX IF NOT EXISTS idx_training_videos_featured ON training_videos(is_featured);
CREATE INDEX IF NOT EXISTS idx_training_videos_display_order ON training_videos(display_order);

-- Enable RLS
ALTER TABLE training_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read training videos"
  ON training_videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert training videos"
  ON training_videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update training videos"
  ON training_videos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete training videos"
  ON training_videos FOR DELETE
  TO authenticated
  USING (true);

-- Add comments
COMMENT ON TABLE training_videos IS 'Stores training video links and metadata for team learning';
COMMENT ON COLUMN training_videos.youtube_url IS 'Full YouTube URL';
COMMENT ON COLUMN training_videos.youtube_video_id IS 'Extracted YouTube video ID for embedding';
