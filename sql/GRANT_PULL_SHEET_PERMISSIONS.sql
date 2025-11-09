-- Quick Permission Fix for Pull Sheets
-- Run this in Supabase SQL Editor if you're getting permission errors

-- ==========================================
-- GRANT PERMISSIONS TO YOUR USER
-- ==========================================

-- First, disable RLS completely
ALTER TABLE public.pull_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_sheet_items DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to authenticated role (your logged-in user)
GRANT ALL PRIVILEGES ON public.pull_sheets TO authenticated;
GRANT ALL PRIVILEGES ON public.pull_sheet_items TO authenticated;

-- Grant ALL permissions to anon role (just in case)
GRANT ALL PRIVILEGES ON public.pull_sheets TO anon;
GRANT ALL PRIVILEGES ON public.pull_sheet_items TO anon;

-- Grant ALL permissions to service_role
GRANT ALL PRIVILEGES ON public.pull_sheets TO service_role;
GRANT ALL PRIVILEGES ON public.pull_sheet_items TO service_role;

-- Grant ALL permissions to postgres role
GRANT ALL PRIVILEGES ON public.pull_sheets TO postgres;
GRANT ALL PRIVILEGES ON public.pull_sheet_items TO postgres;

-- ==========================================
-- UPDATE USER PROFILE PERMISSIONS
-- ==========================================

-- Permissions are actually stored in home_base_members table!
-- Add the columns and grant permissions

DO $$
BEGIN
  -- Check if home_base_members table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'home_base_members') THEN
    
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'home_base_members' AND column_name = 'can_create_pullsheets') THEN
      ALTER TABLE public.home_base_members ADD COLUMN can_create_pullsheets boolean DEFAULT true;
      RAISE NOTICE 'Added can_create_pullsheets column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'home_base_members' AND column_name = 'can_delete_pullsheets') THEN
      ALTER TABLE public.home_base_members ADD COLUMN can_delete_pullsheets boolean DEFAULT true;
      RAISE NOTICE 'Added can_delete_pullsheets column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'home_base_members' AND column_name = 'can_finalize_pullsheets') THEN
      ALTER TABLE public.home_base_members ADD COLUMN can_finalize_pullsheets boolean DEFAULT true;
      RAISE NOTICE 'Added can_finalize_pullsheets column';
    END IF;
    
    -- Update ALL members to have full pull sheet permissions
    UPDATE public.home_base_members 
    SET 
      can_create_pullsheets = true,
      can_delete_pullsheets = true,
      can_finalize_pullsheets = true;
    
    RAISE NOTICE 'Updated home_base_members permissions for all users';
  ELSE
    RAISE NOTICE 'home_base_members table does not exist - creating it now';
    
    -- Create the table if it doesn't exist
    CREATE TABLE public.home_base_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      role text DEFAULT 'crew',
      can_create_pullsheets boolean DEFAULT true,
      can_delete_pullsheets boolean DEFAULT true,
      can_finalize_pullsheets boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id)
    );
    
    -- Insert current user
    INSERT INTO public.home_base_members (user_id, role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets)
    SELECT id, 'owner', true, true, true
    FROM auth.users
    ON CONFLICT (user_id) DO UPDATE SET
      can_create_pullsheets = true,
      can_delete_pullsheets = true,
      can_finalize_pullsheets = true;
    
    RAISE NOTICE 'Created home_base_members table and added all users';
  END IF;
END $$;

-- ==========================================
-- VERIFY
-- ==========================================

SELECT 
  'pull_sheets' as table_name,
  has_table_privilege('authenticated', 'public.pull_sheets', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.pull_sheets', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.pull_sheets', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.pull_sheets', 'DELETE') as can_delete
UNION ALL
SELECT 
  'pull_sheet_items' as table_name,
  has_table_privilege('authenticated', 'public.pull_sheet_items', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.pull_sheet_items', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.pull_sheet_items', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.pull_sheet_items', 'DELETE') as can_delete;

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pull_sheets', 'pull_sheet_items');

-- ==========================================
-- VERIFY USER PERMISSIONS
-- ==========================================

-- Show current users and their permissions
SELECT 
  hbm.user_id,
  u.email,
  hbm.role,
  hbm.can_create_pullsheets,
  hbm.can_delete_pullsheets,
  hbm.can_finalize_pullsheets
FROM public.home_base_members hbm
JOIN auth.users u ON u.id = hbm.user_id;

-- If no results above, that's the problem! Run this to add yourself:
-- (Uncomment the INSERT below if needed)

/*
INSERT INTO public.home_base_members (user_id, role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets)
SELECT id, 'owner', true, true, true
FROM auth.users
WHERE email = 'your-email@example.com'  -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id) DO UPDATE SET
  role = 'owner',
  can_create_pullsheets = true,
  can_delete_pullsheets = true,
  can_finalize_pullsheets = true;
*/
