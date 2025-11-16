-- Quick test to verify lead tables exist and populate test data
-- Run this in Supabase SQL editor

-- Check if tables exist
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lead_job_titles', 'lead_search_keywords', 'leads_settings');

-- Check how many rows are in job titles
SELECT COUNT(*) as job_titles_count FROM lead_job_titles;

-- Check how many rows are in keywords
SELECT COUNT(*) as keywords_count FROM lead_search_keywords;

-- Check Google API settings
SELECT google_api_key, google_search_engine_id FROM leads_settings LIMIT 1;

-- If job titles are empty, run this to populate them:
DELETE FROM lead_job_titles;

INSERT INTO lead_job_titles (title, category, priority, is_active) VALUES
('Event Coordinator', 'Event & Venue Decision-Makers', 100, true),
('Event Manager', 'Event & Venue Decision-Makers', 100, true),
('Event Director', 'Event & Venue Decision-Makers', 100, true),
('Venue Manager', 'Event & Venue Decision-Makers', 100, true),
('Venue Coordinator', 'Event & Venue Decision-Makers', 100, true),
('Director of Events', 'Event & Venue Decision-Makers', 95, true),
('Booking Manager', 'Event & Venue Decision-Makers', 90, true),
('Banquet Manager', 'Event & Venue Decision-Makers', 90, true),
('Corporate Events Manager', 'Corporate / Institutional', 85, true),
('Corporate Events Coordinator', 'Corporate / Institutional', 85, true),
('Programs Coordinator', 'Museum / Cultural / Arts', 85, true),
('Programs Manager', 'Museum / Cultural / Arts', 85, true),
('Entertainment Manager', 'Hospitality & Entertainment', 80, true),
('Banquet & Events Supervisor', 'Hospitality & Entertainment', 75, true),
('Parks & Recreation Events Coordinator', 'Government / Civic / Community', 75, true),
('Community Events Director', 'Government / Civic / Community', 75, true);

-- If keywords are empty, run this to populate them:
DELETE FROM lead_search_keywords;

INSERT INTO lead_search_keywords (keyword, is_active) VALUES
('event booking', true),
('rental coordination', true),
('venue rentals', true),
('facility rentals', true),
('special events', true),
('public programs', true),
('museum events', true),
('arts and culture events', true),
('weddings corporate events', true),
('audio visual services', true),
('production services', true),
('event production', true);

-- Verify the inserts worked
SELECT 'Job Titles' as table_name, COUNT(*) as count FROM lead_job_titles
UNION ALL
SELECT 'Keywords' as table_name, COUNT(*) as count FROM lead_search_keywords;
