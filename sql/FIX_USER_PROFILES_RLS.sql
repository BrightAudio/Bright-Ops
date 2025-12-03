-- Check if RLS is enabled on user_profiles
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Disable RLS temporarily to test (ONLY FOR TESTING - re-enable after)
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- OR add a policy to allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Also allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS if it's not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Test the query (this should now work)
SELECT id, email, full_name, company_name, role, department
FROM public.user_profiles
WHERE id = auth.uid();
