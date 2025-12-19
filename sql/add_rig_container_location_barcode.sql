-- Add location and barcode to rig_containers table
ALTER TABLE rig_containers 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Update existing rig_containers to generate barcodes if they don't have one
-- Barcode format: RIG-{last 8 chars of ID}
UPDATE rig_containers
SET barcode = 'RIG-' || UPPER(SUBSTRING(id::text, 25, 8))
WHERE barcode IS NULL;

-- Create function to auto-generate barcode on insert
CREATE OR REPLACE FUNCTION generate_rig_container_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := 'RIG-' || UPPER(SUBSTRING(NEW.id::text, 25, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate barcode
DROP TRIGGER IF EXISTS trigger_generate_rig_barcode ON rig_containers;
CREATE TRIGGER trigger_generate_rig_barcode
  BEFORE INSERT ON rig_containers
  FOR EACH ROW
  EXECUTE FUNCTION generate_rig_container_barcode();

-- Add comment
COMMENT ON COLUMN rig_containers.location IS 'Default/home location for the container';
COMMENT ON COLUMN rig_containers.current_location IS 'Current physical location of the container';
