-- Create financing applications table
CREATE TABLE IF NOT EXISTS financing_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  business_name TEXT,
  business_address TEXT,
  business_ein TEXT,
  business_years_in_operation INTEGER,
  
  -- Loan Details
  loan_amount DECIMAL(12, 2) NOT NULL,
  term_months INTEGER NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  monthly_payment DECIMAL(12, 2) NOT NULL,
  
  -- Equipment Details
  equipment_description TEXT,
  equipment_list JSONB,
  
  -- Application Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted')),
  application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Signatures
  client_signature TEXT, -- Base64 encoded signature image
  client_signature_date TIMESTAMP WITH TIME ZONE,
  guarantor_name TEXT,
  guarantor_signature TEXT,
  guarantor_signature_date TIMESTAMP WITH TIME ZONE,
  
  -- Contract Details
  contract_start_date DATE,
  contract_end_date DATE,
  first_payment_date DATE,
  
  -- Financial Tracking
  total_paid DECIMAL(12, 2) DEFAULT 0,
  remaining_balance DECIMAL(12, 2),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_due DATE,
  missed_payments INTEGER DEFAULT 0,
  
  -- Notes and Documents
  notes TEXT,
  documents JSONB, -- Array of document URLs/metadata
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financing payments table
CREATE TABLE IF NOT EXISTS financing_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES financing_applications(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_number INTEGER NOT NULL,
  payment_amount DECIMAL(12, 2) NOT NULL,
  principal_amount DECIMAL(12, 2) NOT NULL,
  interest_amount DECIMAL(12, 2) NOT NULL,
  
  -- Payment Status
  due_date DATE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed', 'waived')),
  
  -- Payment Method
  payment_method TEXT, -- 'credit_card', 'ach', 'check', 'wire', etc.
  transaction_id TEXT,
  confirmation_number TEXT,
  
  -- Late Fees
  late_fee DECIMAL(12, 2) DEFAULT 0,
  late_fee_paid BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financing_applications_lead_id ON financing_applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_financing_applications_status ON financing_applications(status);
CREATE INDEX IF NOT EXISTS idx_financing_applications_client_email ON financing_applications(client_email);
CREATE INDEX IF NOT EXISTS idx_financing_payments_application_id ON financing_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_financing_payments_status ON financing_payments(status);
CREATE INDEX IF NOT EXISTS idx_financing_payments_due_date ON financing_payments(due_date);

-- Add RLS policies
ALTER TABLE financing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_payments ENABLE ROW LEVEL SECURITY;

-- Financing Applications Policies
CREATE POLICY "Allow authenticated users to view financing applications"
  ON financing_applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert financing applications"
  ON financing_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financing applications"
  ON financing_applications
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete financing applications"
  ON financing_applications
  FOR DELETE
  TO authenticated
  USING (true);

-- Financing Payments Policies
CREATE POLICY "Allow authenticated users to view financing payments"
  ON financing_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert financing payments"
  ON financing_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financing payments"
  ON financing_payments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete financing payments"
  ON financing_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update remaining balance
CREATE OR REPLACE FUNCTION update_financing_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE financing_applications
  SET 
    total_paid = total_paid + NEW.payment_amount,
    remaining_balance = remaining_balance - NEW.payment_amount,
    last_payment_date = NEW.paid_date,
    updated_at = NOW()
  WHERE id = NEW.application_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balance when payment is made
CREATE TRIGGER update_balance_on_payment
  AFTER INSERT OR UPDATE OF status
  ON financing_payments
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND NEW.paid_date IS NOT NULL)
  EXECUTE FUNCTION update_financing_balance();

-- Function to calculate next payment due date
CREATE OR REPLACE FUNCTION calculate_next_payment_due()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE financing_applications
  SET next_payment_due = (
    SELECT MIN(due_date)
    FROM financing_payments
    WHERE application_id = NEW.application_id
      AND status IN ('pending', 'late')
  )
  WHERE id = NEW.application_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next payment due date
CREATE TRIGGER update_next_payment_due
  AFTER INSERT OR UPDATE OF status
  ON financing_payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_payment_due();
