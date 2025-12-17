-- ============================================
-- FIX: Ambiguous warehouse_id reference in join_warehouse_with_pin
-- This fixes the "column reference warehouse_id is ambiguous" error
-- ============================================

CREATE OR REPLACE FUNCTION public.join_warehouse_with_pin(
  p_warehouse_name TEXT,
  p_pin TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  warehouse_id UUID,
  warehouse_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_warehouse_id UUID;
  v_warehouse_name TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Find warehouse by name (case-insensitive) and PIN (exact match)
  SELECT w.id, w.name INTO v_warehouse_id, v_warehouse_name
  FROM public.warehouses w
  WHERE LOWER(w.name) = LOWER(TRIM(p_warehouse_name))
    AND w.pin = p_pin
  LIMIT 1;
  
  -- Check if warehouse found
  IF v_warehouse_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid warehouse name or PIN'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already has access
  -- FIX: Use fully qualified column names to avoid ambiguity
  IF EXISTS (
    SELECT 1 FROM public.user_warehouse_access uwa
    WHERE uwa.user_id = v_user_id AND uwa.warehouse_id = v_warehouse_id
  ) THEN
    RETURN QUERY SELECT false, 'You already have access to this warehouse'::TEXT, v_warehouse_id, v_warehouse_name;
    RETURN;
  END IF;
  
  -- Grant access
  INSERT INTO public.user_warehouse_access (user_id, warehouse_id, granted_by)
  VALUES (v_user_id, v_warehouse_id, v_user_id);
  
  -- Return success
  RETURN QUERY SELECT true, 'Access granted successfully'::TEXT, v_warehouse_id, v_warehouse_name;
END;
$$;

COMMENT ON FUNCTION public.join_warehouse_with_pin IS 'Allows users to join a warehouse by providing correct name + PIN combination. Uses SECURITY DEFINER to bypass RLS for warehouse lookup. Fixed ambiguous column references.';
