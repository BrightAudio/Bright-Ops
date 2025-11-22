-- Fix payment schedule generation to handle NULL first_payment_date
-- Migration: 2025-11-22_fix_payment_schedule_generation.sql

CREATE OR REPLACE FUNCTION generate_payment_schedule()
RETURNS TRIGGER AS $$
DECLARE
  payment_date DATE;
  principal_per_payment DECIMAL(12, 2);
  interest_per_payment DECIMAL(12, 2);
  remaining_principal DECIMAL(12, 2);
  monthly_rate DECIMAL(10, 8);
  payment_num INTEGER;
BEGIN
  -- Only generate schedule when status changes to 'approved' or 'active'
  IF (NEW.status IN ('approved', 'active') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'active'))) THEN
    
    -- Delete any existing payment schedule for this application
    DELETE FROM financing_payments WHERE application_id = NEW.id;
    
    -- Initialize variables
    remaining_principal := NEW.loan_amount;
    monthly_rate := (NEW.interest_rate / 100) / 12;
    
    -- Use first_payment_date if provided, otherwise use created_at + 1 month
    payment_date := COALESCE(NEW.first_payment_date, (NEW.created_at::date) + INTERVAL '1 month');
    
    -- If still NULL, use today + 1 month as fallback
    IF payment_date IS NULL THEN
      payment_date := CURRENT_DATE + INTERVAL '1 month';
    END IF;
    
    -- Generate payment records for each month
    FOR payment_num IN 1..NEW.term_months LOOP
      -- Calculate interest for this period
      interest_per_payment := remaining_principal * monthly_rate;
      
      -- Calculate principal portion (monthly payment - interest)
      principal_per_payment := NEW.monthly_payment - interest_per_payment;
      
      -- Insert payment record
      INSERT INTO financing_payments (
        application_id,
        payment_number,
        payment_amount,
        principal_amount,
        interest_amount,
        due_date,
        status
      ) VALUES (
        NEW.id,
        payment_num,
        NEW.monthly_payment,
        principal_per_payment,
        interest_per_payment,
        payment_date,
        'pending'
      );
      
      -- Update remaining principal
      remaining_principal := remaining_principal - principal_per_payment;
      
      -- Move to next month
      payment_date := payment_date + INTERVAL '1 month';
    END LOOP;
    
    -- Update the application with the initial remaining balance
    UPDATE financing_applications 
    SET remaining_balance = NEW.loan_amount
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
