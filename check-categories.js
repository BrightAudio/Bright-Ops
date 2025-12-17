const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('category, name')
    .limit(100);

  if (error) {
    console.log('Error:', error);
  } else {
    const categories = [...new Set(data.map(i => i.category))].sort();
    console.log('Total items:', data.length);
    console.log('\nCategories found:');
    categories.forEach(cat => {
      const count = data.filter(i => i.category === cat).length;
      console.log(`  - ${cat}: ${count} items`);
    });
    
    console.log('\nSample items with "top" in category:');
    data.filter(i => i.category && i.category.toLowerCase().includes('top')).forEach(i => {
      console.log(`  - ${i.name} (${i.category})`);
    });
    
    console.log('\nSample items with "sub" in category:');
    data.filter(i => i.category && i.category.toLowerCase().includes('sub')).forEach(i => {
      console.log(`  - ${i.name} (${i.category})`);
    });
  }
  process.exit(0);
})();
