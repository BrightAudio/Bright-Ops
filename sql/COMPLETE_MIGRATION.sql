-- =============================================================================
-- BRIGHT AUDIO COMPLETE MIGRATION - CORRECTED VERSION
-- Run this entire script in Supabase SQL Editor
-- Includes: Training System + Rig Barcode System
-- =============================================================================

-- =============================================================================
-- PART 1: RIG BARCODE SYSTEM
-- =============================================================================

-- Add barcode column to rig_containers table (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rig_containers' 
    AND column_name = 'barcode'
  ) THEN
    ALTER TABLE rig_containers ADD COLUMN barcode TEXT UNIQUE;
  END IF;
END $$;

-- Function to generate next rig barcode
CREATE OR REPLACE FUNCTION generate_next_rig_barcode()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_barcode TEXT;
BEGIN
  -- Find the highest RIG number
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(barcode FROM 'RIG-(\d+)')
        AS INTEGER
      )
    ), 
    0
  ) + 1
  INTO next_num
  FROM rig_containers
  WHERE barcode LIKE 'RIG-%';
  
  -- Format as RIG-XXX (3 digits)
  new_barcode := 'RIG-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN new_barcode;
END;
$$ LANGUAGE plpgsql;

-- Generate barcodes for existing rigs (only if barcode column exists and has nulls)
DO $$
DECLARE
  rig_record RECORD;
  new_barcode TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rig_containers' 
    AND column_name = 'barcode'
  ) THEN
    FOR rig_record IN 
      SELECT id FROM rig_containers WHERE barcode IS NULL
    LOOP
      new_barcode := generate_next_rig_barcode();
      UPDATE rig_containers 
      SET barcode = new_barcode 
      WHERE id = rig_record.id;
    END LOOP;
  END IF;
END $$;

-- Trigger to auto-generate barcode on insert
CREATE OR REPLACE FUNCTION auto_generate_rig_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := generate_next_rig_barcode();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_rig_barcode ON rig_containers;
CREATE TRIGGER trigger_auto_rig_barcode
  BEFORE INSERT ON rig_containers
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_rig_barcode();

-- Comment for documentation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rig_containers' 
    AND column_name = 'barcode'
  ) THEN
    COMMENT ON COLUMN rig_containers.barcode IS 'Unique barcode for scanning entire rig (format: RIG-XXX). Scanning this barcode updates all items in the rig.';
  END IF;
END $$;


-- =============================================================================
-- PART 2: TRAINING SYSTEM
-- =============================================================================

-- 1. User Profiles Table (add role and profile info)
-- Drop existing table if it has conflicts
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'associate' CHECK (role IN ('manager', 'associate')),
  department TEXT CHECK (department IN ('warehouse', 'leads', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Training Modules Table
DROP TABLE IF EXISTS public.training_modules CASCADE;

CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_id TEXT NOT NULL,
  duration TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('warehouse', 'leads', 'both')),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Training Assignments Table
DROP TABLE IF EXISTS public.training_assignments CASCADE;

CREATE TABLE public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, module_id)
);

-- 4. Training Progress Table (track video watch progress)
DROP TABLE IF EXISTS public.training_progress CASCADE;

CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT false,
  watch_duration INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  marked_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id)
);

-- 5. Training Tests Table
DROP TABLE IF EXISTS public.training_tests CASCADE;

CREATE TABLE public.training_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Test Questions Table
DROP TABLE IF EXISTS public.test_questions CASCADE;

CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.training_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Test Submissions Table
DROP TABLE IF EXISTS public.test_submissions CASCADE;

CREATE TABLE public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.training_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.training_assignments(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,
  answers JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  time_taken INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON public.user_profiles(department);
CREATE INDEX IF NOT EXISTS idx_training_modules_department ON public.training_modules(department);
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON public.training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user ON public.training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON public.training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON public.training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_user ON public.test_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test ON public.test_submissions(test_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Everyone can view active modules" ON public.training_modules;
DROP POLICY IF EXISTS "Managers can manage modules" ON public.training_modules;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Managers can view all assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Managers can create assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Managers can update assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Users can update own assignment status" ON public.training_assignments;
DROP POLICY IF EXISTS "Users can view own progress" ON public.training_progress;
DROP POLICY IF EXISTS "Managers can view all progress" ON public.training_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.training_progress;
DROP POLICY IF EXISTS "Everyone can view active tests" ON public.training_tests;
DROP POLICY IF EXISTS "Managers can manage tests" ON public.training_tests;
DROP POLICY IF EXISTS "Everyone can view questions" ON public.test_questions;
DROP POLICY IF EXISTS "Managers can manage questions" ON public.test_questions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Managers can view all submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON public.test_submissions;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for training_modules
CREATE POLICY "Everyone can view active modules" ON public.training_modules
  FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage modules" ON public.training_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- RLS Policies for training_assignments
CREATE POLICY "Users can view own assignments" ON public.training_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all assignments" ON public.training_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can create assignments" ON public.training_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can update assignments" ON public.training_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Users can update own assignment status" ON public.training_assignments
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for training_progress
CREATE POLICY "Users can view own progress" ON public.training_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all progress" ON public.training_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Users can update own progress" ON public.training_progress
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for training_tests
CREATE POLICY "Everyone can view active tests" ON public.training_tests
  FOR SELECT USING (is_active = true);

CREATE POLICY "Managers can manage tests" ON public.training_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- RLS Policies for test_questions
CREATE POLICY "Everyone can view questions" ON public.test_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage questions" ON public.test_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- RLS Policies for test_submissions
CREATE POLICY "Users can view own submissions" ON public.test_submissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all submissions" ON public.test_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Users can create own submissions" ON public.test_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_training_modules_updated_at ON public.training_modules;
DROP TRIGGER IF EXISTS update_training_tests_updated_at ON public.training_tests;
DROP TRIGGER IF EXISTS update_training_progress_updated_at ON public.training_progress;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_tests_updated_at
  BEFORE UPDATE ON public.training_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial training modules from leads training page
INSERT INTO public.training_modules (title, description, youtube_id, duration, difficulty, category, department, order_index) VALUES
-- Administrative Skills
('How to Succeed as an Administrative Assistant', 'Core admin skills including organization, soft skills, and "managing up". Essential training for support roles.', 'V5kCFv5b4VY', '45:00', 'beginner', 'Administrative', 'leads', 1),
('Essential Office Administrative Skills Training', 'Office operations, document handling, time-management, and communication skills for administrative professionals.', 't5TRGKaBBzs', '35:20', 'beginner', 'Administrative', 'leads', 2),
('Administrative Assistant Training | Online Course', 'Full-course for assistants covering scheduling, communication, IT basics, and record-keeping.', '1zqaZi3A_J8', '52:15', 'beginner', 'Administrative', 'leads', 3),
('Master Administrative Assistant Skills: Essential Training for Job Success', 'Good for beginners or inexperienced staff - covers all essential administrative skills.', 'TqDlGAcUOQ0', '38:45', 'beginner', 'Administrative', 'leads', 4),
('24 Powerful Communication Strategies for Administrative Assistants', 'Builds communication, listening, public-speaking and soft-skills for support roles.', '9VUDYC8n0Ws', '42:30', 'intermediate', 'Administrative', 'leads', 5),

-- Customer Service
('Customer Service Training', 'General best-practices for support, call-handling, and interpersonal interactions with clients.', 'iGZCmc3b_OM', '28:15', 'beginner', 'Customer Service', 'both', 6),
('De-escalation Skills Training for Employees', 'Handling frustrated customers, diffusing tension, resolving complaints. Valuable for client-facing staff.', 'KvHi2trFlpo', '32:40', 'intermediate', 'Customer Service', 'both', 7),
('Practice Task: Customer Service | Free Training for Virtual Assistants', 'Good for VA-style work: remote customer support, virtual admin, communication via email/chat/phone.', '548QbADFw84', '25:50', 'beginner', 'Customer Service', 'leads', 8),
('Top 10 Customer Service Training Courses to Boost Your Career', 'Overview of courses & strategies for high-level customer support and scalable service delivery systems.', 'zltmFZR6llU', '36:20', 'intermediate', 'Customer Service', 'both', 9),

-- Sales Training
('11 Sales Training Basics Beginners MUST Master', 'Great foundational video: teaches core sales principles and mindset for beginners.', 'BaDGqm4rEzY', '18:45', 'beginner', 'Sales', 'leads', 10),
('How to Sell Anything to Anyone Anytime - Sales Training', 'Simple, effective strategies for closing a sale — good for teaching staff how to navigate sales conversations.', '1N9BGJxVF5w', '22:30', 'beginner', 'Sales', 'leads', 11),
('The Ultimate Sales Training for 2025 [Full Course]', 'A more comprehensive sales "blueprint." Great if you want to train clerical/sales staff beyond basics.', 'StVqS0jD7Ls', '1:45:00', 'intermediate', 'Sales', 'leads', 12),
('57 Minutes of sales training that will explode your sales in 2024', 'Strong refresher or boot-camp style video — good for team meetings or onboarding new sales hires.', '5O-sLe6iOns', '57:00', 'intermediate', 'Sales', 'leads', 13),
('Sales Training // How to Sell Anything to Anyone // Andy Elliott', 'Solid practical strategies — good for someone who''ll be doing outreach, phone-calls, bookings, etc.', '1NXacboR5ME', '34:20', 'intermediate', 'Sales', 'leads', 14),
('Acquisition Strategy: How to Grow Your Sales the Easy Way', 'Useful for understanding customer acquisition flow — helpful if you want clerical staff to help bring in leads.', 'oKY3Vfvf9zI', '28:15', 'advanced', 'Sales', 'leads', 15),

-- Lead Generation
('Lead Generation 101 - Complete Beginner Guide', 'Learn the fundamentals of lead generation, including what leads are, why they matter, and basic strategies for finding potential customers.', 'cF5_bcaZqwQ', '15:42', 'beginner', 'Lead Generation', 'leads', 16),
('Cold Outreach Strategies That Actually Work', 'Master the art of cold email and cold calling to reach out to potential customers. Learn proven templates and techniques used by top sales professionals.', 'M9pIB64gvaw', '22:15', 'intermediate', 'Lead Generation', 'leads', 17),
('LinkedIn Lead Generation Mastery', 'Discover how to find and qualify leads on LinkedIn, build your network strategically, and use LinkedIn features to generate high-quality leads.', 'uiHhf32uUlQ', '18:30', 'intermediate', 'Lead Generation', 'leads', 18),
('Lead Qualification: Separating Hot Leads from Duds', 'Learn how to qualify leads effectively, score leads based on potential, and prioritize your outreach efforts to close more deals.', 'CkdgPXRzslk', '17:45', 'intermediate', 'Lead Generation', 'leads', 19),
('Email Marketing for Lead Generation', 'Build effective email campaigns that generate leads, create compelling copy, and set up automation to nurture prospects.', 'e-kHBhJzZo8', '24:20', 'intermediate', 'Lead Generation', 'leads', 20),
('Advanced: Building a Lead Generation Funnel', 'Design and implement a complete lead generation funnel, from awareness to conversion. Learn advanced tactics used by enterprise teams.', 'FHpqEYLZfJU', '31:15', 'advanced', 'Lead Generation', 'leads', 21),
('Research Skills for Lead Generation', 'Become an expert researcher! Learn tools and techniques to find contact information, identify decision makers, and research companies.', 'ck0A1QKqF6k', '19:50', 'beginner', 'Lead Generation', 'leads', 22),
('Sales Psychology: Understanding Buyer Behavior', 'Learn the psychology behind purchasing decisions, how to identify pain points, and tailor your approach to different customer types.', 'p-nKttWT5Dc', '25:30', 'intermediate', 'Lead Generation', 'leads', 23)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access (manager/associate)';
COMMENT ON TABLE public.training_modules IS 'Training video modules for warehouse and leads departments';
COMMENT ON TABLE public.training_assignments IS 'Manager-assigned training modules for associates';
COMMENT ON TABLE public.training_progress IS 'Track user progress through assigned training videos';
COMMENT ON TABLE public.training_tests IS 'Tests/quizzes associated with training modules';
COMMENT ON TABLE public.test_questions IS 'Questions for training tests';
COMMENT ON TABLE public.test_submissions IS 'User test submissions with scores and answers';

-- =============================================================================
-- MIGRATION COMPLETE
-- Both Rig Barcode System and Training System are now ready to use!
-- =============================================================================
