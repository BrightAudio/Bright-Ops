-- Create invoices table for tracking revenue and payment status
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
  issue_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (adjust later for proper permissions)
CREATE POLICY "Allow all access to invoices" ON public.invoices 
  FOR ALL TO public 
  USING (true) 
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.invoices IS 'Tracks invoices and payment status for jobs';
COMMENT ON COLUMN public.invoices.status IS 'Invoice status: draft, sent, paid, or overdue';
COMMENT ON COLUMN public.invoices.amount IS 'Invoice amount in USD';
COMMENT ON COLUMN public.invoices.due_date IS 'Payment due date';
COMMENT ON COLUMN public.invoices.paid_date IS 'Date invoice was marked as paid';
