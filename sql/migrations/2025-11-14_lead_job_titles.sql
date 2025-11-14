-- Lead Job Titles Table for Auto-Search
-- This table stores predefined job titles to search for when scraping leads

CREATE TABLE IF NOT EXISTS lead_job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher priority = searched first
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE lead_job_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job titles"
  ON lead_job_titles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage job titles"
  ON lead_job_titles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert all job titles organized by category

-- Event & Venue Decision-Makers (highest priority)
INSERT INTO lead_job_titles (title, category, priority) VALUES
('Event Coordinator', 'Event & Venue Decision-Makers', 100),
('Event Manager', 'Event & Venue Decision-Makers', 100),
('Event Director', 'Event & Venue Decision-Makers', 100),
('Director of Events', 'Event & Venue Decision-Makers', 100),
('Venue Manager', 'Event & Venue Decision-Makers', 100),
('Venue Coordinator', 'Event & Venue Decision-Makers', 100),
('Event Operations Manager', 'Event & Venue Decision-Makers', 95),
('Special Events Manager', 'Event & Venue Decision-Makers', 95),
('Special Events Coordinator', 'Event & Venue Decision-Makers', 95),
('Booking Manager', 'Event & Venue Decision-Makers', 90),
('Banquet Manager', 'Event & Venue Decision-Makers', 90),
('Catering & Events Manager', 'Event & Venue Decision-Makers', 90);

-- Museum / Cultural / Arts Organizations
INSERT INTO lead_job_titles (title, category, priority) VALUES
('Curator', 'Museum / Cultural / Arts', 85),
('Programs Coordinator', 'Museum / Cultural / Arts', 85),
('Programs Manager', 'Museum / Cultural / Arts', 85),
('Director of Visitor Experience', 'Museum / Cultural / Arts', 85),
('Director of Public Programs', 'Museum / Cultural / Arts', 85),
('Community Engagement Manager', 'Museum / Cultural / Arts', 80),
('Community Engagement Director', 'Museum / Cultural / Arts', 80),
('Cultural Events Coordinator', 'Museum / Cultural / Arts', 80),
('Arts Programming Manager', 'Museum / Cultural / Arts', 80),
('Exhibition Coordinator', 'Museum / Cultural / Arts', 75);

-- Corporate / Institutional Events
INSERT INTO lead_job_titles (title, category, priority) VALUES
('Corporate Events Manager', 'Corporate / Institutional', 85),
('Corporate Events Coordinator', 'Corporate / Institutional', 85),
('Marketing & Events Manager', 'Corporate / Institutional', 80),
('Marketing & Events Coordinator', 'Corporate / Institutional', 80),
('Communications & Events Specialist', 'Corporate / Institutional', 75),
('Campus Events Manager', 'Corporate / Institutional', 75),
('Student Activities Director', 'Corporate / Institutional', 75),
('Conference Services Manager', 'Corporate / Institutional', 80);

-- Hospitality & Entertainment
INSERT INTO lead_job_titles (title, category, priority) VALUES
('Hospitality Events Manager', 'Hospitality & Entertainment', 80),
('Banquet & Events Supervisor', 'Hospitality & Entertainment', 75),
('Entertainment Manager', 'Hospitality & Entertainment', 80),
('Entertainment Coordinator', 'Hospitality & Entertainment', 75),
('Nightlife Manager', 'Hospitality & Entertainment', 70),
('Programming Director', 'Hospitality & Entertainment', 75);

-- Government / Civic / Community
INSERT INTO lead_job_titles (title, category, priority) VALUES
('Parks & Recreation Events Coordinator', 'Government / Civic / Community', 75),
('Economic Development Events Manager', 'Government / Civic / Community', 70),
('Community Events Director', 'Government / Civic / Community', 75),
('Public Events Manager', 'Government / Civic / Community', 75);

-- Create search keywords table for advanced filtering
CREATE TABLE IF NOT EXISTS lead_search_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lead_search_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view keywords"
  ON lead_search_keywords FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage keywords"
  ON lead_search_keywords FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert advanced search keywords
INSERT INTO lead_search_keywords (keyword) VALUES
('event booking'),
('rental coordination'),
('venue rentals'),
('facility rentals'),
('special events'),
('public programs'),
('museum events'),
('arts and culture events'),
('weddings corporate events'),
('audio visual services'),
('production services'),
('event production');

-- Add venue column to leads table if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for better search performance
CREATE INDEX IF NOT EXISTS idx_lead_job_titles_priority ON lead_job_titles(priority DESC, is_active);
CREATE INDEX IF NOT EXISTS idx_lead_job_titles_category ON lead_job_titles(category);
