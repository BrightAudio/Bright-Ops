-- Lead Management Features: Scoring, Tags, Activities, Custom Fields

-- Add score field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- Lead Tags
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#667eea',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Lead Tag Associations (Many-to-Many)
CREATE TABLE IF NOT EXISTS lead_tag_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, tag_id)
);

-- Custom Fields Definitions
CREATE TABLE IF NOT EXISTS lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field_key TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'multiselect')),
  options TEXT[], -- For select/multiselect
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS lead_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES lead_custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, field_id)
);

-- Activity Timeline
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email_sent', 'email_opened', 'email_clicked', 'status_changed', 'note_added', 'score_changed', 'tag_added', 'tag_removed', 'field_updated', 'created')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- Store additional context (old_value, new_value, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tag_associations_lead ON lead_tag_associations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_associations_tag ON lead_tag_associations(tag_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_lead ON lead_custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_field ON lead_custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type, created_at DESC);

-- RLS Policies for lead_tags
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tags"
  ON lead_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON lead_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
  ON lead_tags FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete tags"
  ON lead_tags FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for lead_tag_associations
ALTER TABLE lead_tag_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tag associations"
  ON lead_tag_associations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tag associations"
  ON lead_tag_associations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tag associations"
  ON lead_tag_associations FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for lead_custom_fields
ALTER TABLE lead_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view custom fields"
  ON lead_custom_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create custom fields"
  ON lead_custom_fields FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update custom fields"
  ON lead_custom_fields FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete custom fields"
  ON lead_custom_fields FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for lead_custom_field_values
ALTER TABLE lead_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view custom field values"
  ON lead_custom_field_values FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create custom field values"
  ON lead_custom_field_values FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update custom field values"
  ON lead_custom_field_values FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete custom field values"
  ON lead_custom_field_values FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for lead_activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities"
  ON lead_activities FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete activities"
  ON lead_activities FOR DELETE
  TO authenticated
  USING (true);

-- Function to update lead score based on activity
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  days_since_created INTEGER;
  email_count INTEGER;
  opened_count INTEGER;
  clicked_count INTEGER;
  last_contact_days INTEGER;
BEGIN
  -- Get lead data
  SELECT 
    EXTRACT(DAY FROM NOW() - created_at)::INTEGER,
    EXTRACT(DAY FROM NOW() - COALESCE(last_activity_at, created_at))::INTEGER
  INTO days_since_created, last_contact_days
  FROM leads
  WHERE id = lead_id_param;

  -- Count email interactions
  SELECT COUNT(*) INTO email_count
  FROM leads_emails
  WHERE lead_id = lead_id_param AND status = 'sent';

  SELECT COUNT(*) INTO opened_count
  FROM leads_emails
  WHERE lead_id = lead_id_param AND opened_at IS NOT NULL;

  SELECT COUNT(*) INTO clicked_count
  FROM leads_emails
  WHERE lead_id = lead_id_param AND clicked_at IS NOT NULL;

  -- Scoring algorithm
  score := 50; -- Base score

  -- Email engagement
  score := score + (email_count * 5); -- +5 per email sent
  score := score + (opened_count * 10); -- +10 per open
  score := score + (clicked_count * 20); -- +20 per click

  -- Recency factor (decay over time)
  IF last_contact_days <= 7 THEN
    score := score + 30;
  ELSIF last_contact_days <= 30 THEN
    score := score + 15;
  ELSIF last_contact_days <= 90 THEN
    score := score + 5;
  ELSE
    score := score - 10; -- Penalty for old leads
  END IF;

  -- Cap score at 100
  IF score > 100 THEN
    score := 100;
  END IF;

  -- Update lead
  UPDATE leads SET score = score WHERE id = lead_id_param;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_activity_at on lead_activities insert
CREATE OR REPLACE FUNCTION update_lead_activity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET last_activity_at = NOW() WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_activity_timestamp_trigger
AFTER INSERT ON lead_activities
FOR EACH ROW
EXECUTE FUNCTION update_lead_activity_timestamp();

-- Create initial activity for existing leads
INSERT INTO lead_activities (lead_id, activity_type, title, description, created_at)
SELECT 
  id,
  'created',
  'Lead Created',
  'Lead was added to the system',
  created_at
FROM leads
WHERE NOT EXISTS (
  SELECT 1 FROM lead_activities WHERE lead_id = leads.id AND activity_type = 'created'
);
