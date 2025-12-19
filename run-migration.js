const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://qifhpsazsnmqnbnazrct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZmhwc2F6c25tcW5ibmF6cmN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDIwODM0NCwiZXhwIjoyMDQ5Nzg0MzQ0fQ.cXj7cBuaBD0kzA3vC0PEPIjFuovGY-a8I6n1N9c1tEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration: add_estimated_hours.sql');
    
    const sql = fs.readFileSync(path.join(__dirname, 'sql', 'add_estimated_hours.sql'), 'utf8');
    
    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 100) + '...');
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('Error:', error);
        return;
      }
      console.log('Success!');
    }
    
    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Failed to run migration:', err);
  }
}

runMigration();
