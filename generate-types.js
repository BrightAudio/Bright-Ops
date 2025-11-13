// Generate database types from actual Supabase schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generateTypes() {
  console.log('Fetching database schema...\n');

  // Get all tables by querying information_schema
  const tables = [
    'jobs',
    'clients', 
    'crew_members',
    'inventory_items',
    'products',
    'pull_sheets',
    'pull_sheet_items',
    'transports',
    'scan_events',
    'inventory_movements',
    'training_videos',
    'venues',
    'profiles'
  ];

  const schemas = {};

  for (const table of tables) {
    console.log(`Fetching schema for ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      const sample = data[0];
      schemas[table] = Object.keys(sample).map(key => ({
        name: key,
        type: typeof sample[key],
        value: sample[key]
      }));
      console.log(`✓ ${table}: ${Object.keys(sample).length} columns`);
    } else {
      console.log(`⚠ ${table}: No data found, trying empty insert...`);
      // Try to get schema from error message
      const { error: insertError } = await supabase.from(table).insert({});
      if (insertError) {
        console.log(`  Error message may contain schema info: ${insertError.message.substring(0, 200)}`);
      }
    }
  }

  console.log('\n\nSchema Summary:');
  console.log('================\n');
  
  for (const [table, columns] of Object.entries(schemas)) {
    console.log(`\n${table}:`);
    columns.forEach(col => {
      const typeInfo = col.value === null ? 'null' : typeof col.value;
      const valuePreview = col.value === null ? 'null' : 
                          typeof col.value === 'object' ? 'object/array' :
                          String(col.value).substring(0, 30);
      console.log(`  ${col.name}: ${typeInfo} (example: ${valuePreview})`);
    });
  }

  console.log('\n\nSave this output and I will generate the TypeScript types file.');
}

generateTypes().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
