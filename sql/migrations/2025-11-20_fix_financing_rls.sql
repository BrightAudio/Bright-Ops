-- Enable RLS on financing tables
ALTER TABLE financing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view financing applications" ON financing_applications;
DROP POLICY IF EXISTS "Allow authenticated users to create financing applications" ON financing_applications;
DROP POLICY IF EXISTS "Allow authenticated users to update financing applications" ON financing_applications;
DROP POLICY IF EXISTS "Allow authenticated users to delete financing applications" ON financing_applications;

DROP POLICY IF EXISTS "Allow authenticated users to view financing payments" ON financing_payments;
DROP POLICY IF EXISTS "Allow authenticated users to manage financing payments" ON financing_payments;

-- Financing Applications Policies
CREATE POLICY "Allow authenticated users to view financing applications"
  ON financing_applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create financing applications"
  ON financing_applications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financing applications"
  ON financing_applications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete financing applications"
  ON financing_applications FOR DELETE
  TO authenticated
  USING (true);

-- Financing Payments Policies
CREATE POLICY "Allow authenticated users to view financing payments"
  ON financing_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage financing payments"
  ON financing_payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
