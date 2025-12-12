-- ============================================
-- UPDATE USER PROFILES TRIGGER TO SUPPORT NEW FIELDS
-- Handles role and department from signup metadata
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email,
    full_name, 
    role,
    department,
    company_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'associate'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'industry'
  );
  RETURN NEW;
END;
$$;

-- Trigger already exists, no need to recreate
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user_profiles entry when new user signs up, extracting data from auth.users metadata';
