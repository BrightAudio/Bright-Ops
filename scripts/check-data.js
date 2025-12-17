const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qifhpsazsnmqnbnazrct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZmhwc2F6c25tcW5ibmF6cmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjQ5NDE0MiwiZXhwIjoyMDQ4MDcwMTQyfQ.nXx6-3eYjh-iOSqT-FLLLvXq3lSNCt8CigRqJEAM7qI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== Checking New Sound Warehouse ===');
  const { data: warehouse, error: wError } = await supabase
    .from('warehouses')
    .select('id, name, organization_id')
    .eq('name', 'New Sound')
    .single();
  
  if (wError) {
    console.error('Warehouse error:', wError);
    return;
  }
  
  console.log('Warehouse:', warehouse);
  
  console.log('\n=== Checking Employees ===');
  const { data: employees, error: eError } = await supabase
    .from('employees')
    .select('id, name, warehouse_id');
  
  console.log('Total employees:', employees?.length || 0);
  console.log('Employees with warehouse_id:', employees?.filter(e => e.warehouse_id).length || 0);
  console.log('Employees with New Sound warehouse_id:', employees?.filter(e => e.warehouse_id === warehouse.id).length || 0);
  console.log('Sample employees:', employees?.slice(0, 3));
  
  console.log('\n=== Checking Jobs ===');
  const { data: jobs, error: jError } = await supabase
    .from('jobs')
    .select('id, name, warehouse_id, warehouse');
  
  console.log('Total jobs:', jobs?.length || 0);
  console.log('Jobs with warehouse_id:', jobs?.filter(j => j.warehouse_id).length || 0);
  console.log('Jobs with New Sound warehouse_id:', jobs?.filter(j => j.warehouse_id === warehouse.id).length || 0);
  console.log('Jobs with warehouse TEXT:', jobs?.filter(j => j.warehouse).length || 0);
  console.log('Sample jobs:', jobs?.slice(0, 3));
}

checkData().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
