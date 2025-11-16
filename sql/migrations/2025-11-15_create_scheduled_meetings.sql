-- Create scheduled_meetings table
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_type VARCHAR(50) NOT NULL DEFAULT 'call', -- call, video, meeting, email
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled, no-show
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on lead_id for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_lead_id ON scheduled_meetings(lead_id);

-- Create index on meeting date for calendar queries
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_date ON scheduled_meetings(meeting_date);

-- Enable RLS
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view/insert/update their own team's meetings
CREATE POLICY "Users can view team scheduled meetings"
  ON scheduled_meetings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert team scheduled meetings"
  ON scheduled_meetings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update team scheduled meetings"
  ON scheduled_meetings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete team scheduled meetings"
  ON scheduled_meetings
  FOR DELETE
  USING (auth.role() = 'authenticated');
