-- QUERY 2: Create Scheduled Meetings Table (Safe Version)

-- Drop existing trigger and policies if they exist
DROP TRIGGER IF EXISTS update_scheduled_meetings_updated_at ON public.scheduled_meetings;
DROP POLICY IF EXISTS "Users can view team scheduled meetings" ON public.scheduled_meetings;
DROP POLICY IF EXISTS "Users can insert team scheduled meetings" ON public.scheduled_meetings;
DROP POLICY IF EXISTS "Users can update team scheduled meetings" ON public.scheduled_meetings;
DROP POLICY IF EXISTS "Users can delete team scheduled meetings" ON public.scheduled_meetings;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_type VARCHAR(50) NOT NULL DEFAULT 'call',
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_lead_id ON public.scheduled_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_date ON public.scheduled_meetings(meeting_date);

-- Enable RLS
ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view team scheduled meetings"
  ON public.scheduled_meetings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert team scheduled meetings"
  ON public.scheduled_meetings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update team scheduled meetings"
  ON public.scheduled_meetings
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete team scheduled meetings"
  ON public.scheduled_meetings
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create or replace update function
CREATE OR REPLACE FUNCTION update_scheduled_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_scheduled_meetings_updated_at
    BEFORE UPDATE ON public.scheduled_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_meetings_updated_at();
