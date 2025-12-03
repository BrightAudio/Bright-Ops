-- Add barcode column to rig_containers table
-- Each rig gets a unique RIG-XXX barcode for bulk scanning

ALTER TABLE rig_containers 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

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

-- Generate barcodes for existing rigs
DO $$
DECLARE
  rig_record RECORD;
  new_barcode TEXT;
BEGIN
  FOR rig_record IN 
    SELECT id FROM rig_containers WHERE barcode IS NULL
  LOOP
    new_barcode := generate_next_rig_barcode();
    UPDATE rig_containers 
    SET barcode = new_barcode 
    WHERE id = rig_record.id;
  END LOOP;
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
COMMENT ON COLUMN rig_containers.barcode IS 'Unique barcode for scanning entire rig (format: RIG-XXX). Scanning this barcode updates all items in the rig.';
