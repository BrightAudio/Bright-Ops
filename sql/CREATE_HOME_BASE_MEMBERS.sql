-- Create home_base_members table and grant you permissions
-- This is the SIMPLE version that will definitely work

-- ==========================================
-- STEP 1: Create home_base_members table
-- ==========================================

DROP TABLE IF EXISTS public.home_base_members CASCADE;

CREATE TABLE public.home_base_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'owner',
  can_create_pullsheets boolean DEFAULT true,
  can_delete_pullsheets boolean DEFAULT true,
  can_finalize_pullsheets boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT home_base_members_user_id_key UNIQUE(user_id)
);

-- ==========================================
-- STEP 2: Add ALL current users as owners
-- ==========================================

INSERT INTO public.home_base_members (user_id, role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets)
SELECT 
  id, 
  'owner', 
  true, 
  true, 
  true
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
  role = 'owner',
  can_create_pullsheets = true,
  can_delete_pullsheets = true,
  can_finalize_pullsheets = true;

-- ==========================================
-- STEP 3: Disable RLS on pull sheets tables
-- ==========================================

ALTER TABLE public.pull_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_sheet_items DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: Grant permissions
-- ==========================================

GRANT ALL ON public.home_base_members TO authenticated;
GRANT ALL ON public.home_base_members TO service_role;
GRANT ALL ON public.pull_sheets TO authenticated;
GRANT ALL ON public.pull_sheet_items TO authenticated;

-- ==========================================
-- VERIFY - You should see your email here!
-- ==========================================

SELECT 
  u.email,
  hbm.role,
  hbm.can_create_pullsheets,
  hbm.can_delete_pullsheets,
  hbm.can_finalize_pullsheets
FROM public.home_base_members hbm
JOIN auth.users u ON u.id = hbm.user_id;
