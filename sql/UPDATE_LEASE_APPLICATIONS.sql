-- Add source and submitted_at columns to lease_applications table

-- Add source column to track where the application came from
ALTER TABLE public.lease_applications 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'dashboard';

-- Add submitted_at column to track when application was submitted
ALTER TABLE public.lease_applications 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have submitted_at if null
UPDATE public.lease_applications 
SET submitted_at = created_at 
WHERE submitted_at IS NULL;

-- Create index for faster queries by source
CREATE INDEX IF NOT EXISTS idx_lease_applications_source 
ON public.lease_applications(source);

-- Create index for faster queries by submitted_at
CREATE INDEX IF NOT EXISTS idx_lease_applications_submitted_at 
ON public.lease_applications(submitted_at DESC);

-- Enable RLS if not already enabled
ALTER TABLE public.lease_applications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert lease applications from website widget
DROP POLICY IF EXISTS "Anonymous users can submit lease applications" ON public.lease_applications;
CREATE POLICY "Anonymous users can submit lease applications"
ON public.lease_applications
FOR INSERT
TO anon
WITH CHECK (true);

-- Authenticated users can view all applications
DROP POLICY IF EXISTS "Authenticated users can view all lease applications" ON public.lease_applications;
CREATE POLICY "Authenticated users can view all lease applications"
ON public.lease_applications
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can update applications
DROP POLICY IF EXISTS "Authenticated users can update lease applications" ON public.lease_applications;
CREATE POLICY "Authenticated users can update lease applications"
ON public.lease_applications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Verification
SELECT 
  'Lease Applications Table Updated' as info,
  COUNT(*) as total_applications,
  COUNT(CASE WHEN source = 'website_widget' THEN 1 END) as website_submissions,
  COUNT(CASE WHEN source = 'dashboard' THEN 1 END) as dashboard_submissions
FROM public.lease_applications;

SELECT 
  'RLS Policies' as info,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'lease_applications';
