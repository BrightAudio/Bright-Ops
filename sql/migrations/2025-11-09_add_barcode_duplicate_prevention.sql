-- ============================================================================
-- BARCODE DUPLICATE SCAN PREVENTION
-- ============================================================================
-- This migration improves the scan_direction function to prevent scanning
-- the same physical unit twice for the same job (unless it's a "free scan"
-- where the item is being returned/checked back in).
--
-- Key Features:
-- 1. First 3-6 chars of barcode = item type (e.g., "X32" for all X32 mixers)
-- 2. Last 3 digits = unique unit (e.g., "001", "002")
-- 3. Prevents scanning X32-001 twice for same job on OUT scan
-- 4. Allows X32-001 to be scanned IN after being scanned OUT
-- 5. Allows X32-002 to be scanned (different physical unit)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.scan_direction(text, text, text, text, text);

-- Create improved scan function with duplicate prevention
CREATE OR REPLACE FUNCTION public.scan_direction(
  p_job_code text,
  p_serial_or_barcode text,
  p_direction text,
  p_scanned_by text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS public.scans AS $$
DECLARE
  v_serial_id uuid;
  v_product_id uuid;
  v_job_id uuid;
  v_scan public.scans%rowtype;
  v_last_scan_direction text;
  v_scan_count integer;
BEGIN
  -- Find serial by barcode or id
  SELECT id, product_id INTO v_serial_id, v_product_id
  FROM public.serials
  WHERE barcode = p_serial_or_barcode OR id::text = p_serial_or_barcode
  LIMIT 1;
  
  IF v_serial_id IS NULL THEN
    RAISE EXCEPTION 'Serial not found for barcode/id: %', p_serial_or_barcode;
  END IF;

  -- Find job by code
  SELECT id INTO v_job_id FROM public.jobs WHERE code = p_job_code LIMIT 1;
  
  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Job not found for code: %', p_job_code;
  END IF;

  -- DUPLICATE PREVENTION LOGIC
  -- Check if this exact barcode has already been scanned for this job
  SELECT direction INTO v_last_scan_direction
  FROM public.scans
  WHERE job_id = v_job_id 
    AND serial_id = v_serial_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If scanning OUT and this item was already scanned OUT for this job, reject
  IF UPPER(p_direction) = 'OUT' AND v_last_scan_direction = 'OUT' THEN
    RAISE EXCEPTION 'Duplicate scan: Barcode % was already scanned OUT for job %. Use a different unit or scan it IN first.', 
      p_serial_or_barcode, p_job_code;
  END IF;

  -- If scanning IN and this item was already scanned IN (or never scanned OUT), reject
  IF UPPER(p_direction) = 'IN' AND (v_last_scan_direction = 'IN' OR v_last_scan_direction IS NULL) THEN
    RAISE EXCEPTION 'Invalid scan: Barcode % was not scanned OUT for job %. Cannot scan IN.', 
      p_serial_or_barcode, p_job_code;
  END IF;

  -- Insert scan record
  INSERT INTO public.scans (job_id, serial_id, direction, scanned_by, location)
    VALUES (v_job_id, v_serial_id, UPPER(p_direction), p_scanned_by, p_location)
    RETURNING * INTO v_scan;

  -- Log to scan_events table for audit trail
  INSERT INTO public.scan_events (barcode, result, job_id)
    VALUES (p_serial_or_barcode, 'SUCCESS: ' || UPPER(p_direction), v_job_id);

  -- Update serial status
  IF UPPER(p_direction) = 'OUT' THEN
    UPDATE public.serials SET status = 'out' WHERE id = v_serial_id;
  ELSIF UPPER(p_direction) = 'IN' THEN
    UPDATE public.serials SET status = 'in_stock' WHERE id = v_serial_id;
  END IF;

  RETURN v_scan;
EXCEPTION
  WHEN OTHERS THEN
    -- Log failed scans to scan_events
    INSERT INTO public.scan_events (barcode, result, job_id)
      VALUES (p_serial_or_barcode, 'ERROR: ' || SQLERRM, v_job_id);
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.scan_direction(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_direction(text, text, text, text, text) TO anon;

-- Add comment
COMMENT ON FUNCTION public.scan_direction IS 
  'Scans equipment in/out for jobs with duplicate prevention. 
   Prevents scanning the same barcode OUT twice for same job.
   Requires scanning IN before scanning OUT again.';
