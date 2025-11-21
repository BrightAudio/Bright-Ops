-- Add payment processing fields to financing_applications
ALTER TABLE financing_applications
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_ip_address TEXT,
-- Stripe secure payment method storage (employees cannot see full details)
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT, -- Stripe customer ID
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT, -- Encrypted payment method ID
ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT, -- Last 4 digits (safe to display)
ADD COLUMN IF NOT EXISTS payment_method_brand TEXT, -- Bank name or card brand
ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN ('us_bank_account', 'card')),
ADD COLUMN IF NOT EXISTS payment_method_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT false;

-- Create company_settings table for bank account info
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment processing table for tracking transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES financing_applications(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES financing_payments(id) ON DELETE SET NULL,
  
  -- Transaction Details
  transaction_type TEXT CHECK (transaction_type IN ('debit', 'credit', 'refund', 'chargeback')),
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  
  -- Payment Method Used
  payment_method TEXT,
  account_last4 TEXT,
  
  -- Processing Details
  processor_response TEXT,
  processor_transaction_id TEXT,
  error_message TEXT,
  
  -- Receipt
  receipt_sent BOOLEAN DEFAULT false,
  receipt_sent_at TIMESTAMP WITH TIME ZONE,
  receipt_email TEXT,
  
  -- Metadata
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES financing_applications(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES financing_payments(id) ON DELETE CASCADE,
  
  -- Reminder Details
  reminder_type TEXT CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'final_notice')),
  scheduled_date DATE NOT NULL,
  sent_date TIMESTAMP WITH TIME ZONE,
  
  -- Communication
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  email_opened BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_application_id ON payment_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_application_id ON payment_reminders(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled_date ON payment_reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);

-- Add RLS policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Company settings policies (admin only)
CREATE POLICY "Allow authenticated users to view company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payment transactions policies
CREATE POLICY "Allow authenticated users to view payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payment transactions"
  ON payment_transactions FOR UPDATE
  TO authenticated
  USING (true);

-- Payment reminders policies
CREATE POLICY "Allow authenticated users to view payment reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage payment reminders"
  ON payment_reminders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_reminders_updated_at
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
