# SOLUTION: Ambiguous warehouse_id Error

## Root Cause
The error `column reference "warehouse_id" is ambiguous` occurred because:

1. The `join_warehouse_with_pin` function was created in `2025-12-12_warehouse_access_control.sql`
2. Later, the `2025-12-12_warehouse_location_associations.sql` migration added `warehouse_id` columns to multiple tables
3. When the function references `warehouse_id` without qualification, PostgreSQL can't determine if it refers to:
   - The local variable `v_warehouse_id`
   - The table column `user_warehouse_access.warehouse_id`

## The Fix
Added a table alias (`uwa`) to the EXISTS clause to explicitly specify we're referencing the table column:

**Before:**
```sql
IF EXISTS (
  SELECT 1 FROM public.user_warehouse_access
  WHERE user_id = v_user_id AND warehouse_id = v_warehouse_id
)
```

**After:**
```sql
IF EXISTS (
  SELECT 1 FROM public.user_warehouse_access uwa
  WHERE uwa.user_id = v_user_id AND uwa.warehouse_id = v_warehouse_id
)
```

## Apply the Fix

### Option 1: Run the Fix Migration (Recommended)
In Supabase SQL Editor, run:
```bash
sql/migrations/2025-12-12_fix_join_warehouse_function.sql
```

### Option 2: Quick Fix via SQL Editor
Copy and paste this into Supabase SQL Editor and run:

```sql
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warehouse_id UUID;
  v_warehouse_name TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  SELECT w.id, w.name INTO v_warehouse_id, v_warehouse_name
  FROM public.warehouses w
  WHERE LOWER(w.name) = LOWER(TRIM(p_warehouse_name))
    AND w.pin = p_pin
  LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid warehouse name or PIN'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.user_warehouse_access uwa
    WHERE uwa.user_id = v_user_id AND uwa.warehouse_id = v_warehouse_id
  ) THEN
    RETURN QUERY SELECT false, 'You already have access to this warehouse'::TEXT, v_warehouse_id, v_warehouse_name;
    RETURN;
  END IF;
  
  INSERT INTO public.user_warehouse_access (user_id, warehouse_id, granted_by)
  VALUES (v_user_id, v_warehouse_id, v_user_id);
  
  RETURN QUERY SELECT true, 'Access granted successfully'::TEXT, v_warehouse_id, v_warehouse_name;
END;
$$;
```

## Test the Fix
After applying, test by:
1. Go to `http://localhost:3000/app/inventory/locations`
2. Click "Join Warehouse"
3. Enter warehouse name and PIN
4. Should now work without the ambiguous column error!

## Files Modified
- ✅ `sql/migrations/2025-12-12_fix_join_warehouse_function.sql` - New fix migration
- ✅ `sql/migrations/2025-12-12_warehouse_access_control.sql` - Updated original
