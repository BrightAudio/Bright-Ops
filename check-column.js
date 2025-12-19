const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qifhpsazsnmqnbnazrct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZmhwc2F6c25tcW5ibmF6cmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDIwODM0NCwiZXhwIjoyMDQ5Nzg0MzQ0fQ.cXj7cBuaBD0kzA3vC0PEPIjFuovGY-a8I6n1N9c1tEE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumn() {
  try {
    console.log('Checking current columns in job_assignments...');
    
    // First, let's see what columns exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('job_assignments')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample:', sampleError);
    } else {
      console.log('Current columns:', sampleData && sampleData[0] ? Object.keys(sampleData[0]) : 'No data');
    }
    
    console.log('\nAttempting to add estimated_hours column using pg_catalog...');
    
    // Try to check if column exists using a different approach
    const { data, error } = await supabase
      .from('job_assignments')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Table accessible, column should be added via Supabase dashboard SQL editor');
      console.log('\nPlease run this SQL in Supabase dashboard:');
      console.log('ALTER TABLE job_assignments ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);');
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

addColumn();
