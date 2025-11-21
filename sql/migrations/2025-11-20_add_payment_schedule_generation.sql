-- Function to generate payment schedule for a financing application
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
    payment_date := NEW.first_payment_date;
    
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
    
    -- Update the application with the initial remaining balance (separate update to avoid conflict)
    UPDATE financing_applications 
    SET remaining_balance = NEW.loan_amount
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS generate_payment_schedule_trigger ON financing_applications;

-- Create trigger to generate payment schedule when application is approved
CREATE TRIGGER generate_payment_schedule_trigger
  AFTER UPDATE
  ON financing_applications
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_schedule();
