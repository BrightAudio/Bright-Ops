import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CSV data
const csvData = `Brand,Model,Amount ,Working ,Non Working
,,,,
Nexo ,CD 18,18,16,2
,,,,
Nexo ,S2,12,8,4
,,,,
Nexo ,B1-15,32,24,8
,,,,
Nexo ,M3 ,28,24,4
,,,,
Nexo,B1-18,2,2,0
,,,,
L'Acoustics ,ARCS,8,8,0
,,,,
EAW,SB-1000,16,9,7
,,,,
EAW,LA215,7,1,6
,,,,
EAW,LA400,8,1,7
,,,,
EAW,LA460,4,2,2
,,,,
EAW,LA118,4,2,2
,,,,
EAW,KF650,4,3,1
,,,,
EAW,KF750,2,2,0
EAW,SM200IH,3,1,2
,,,,
JBL,PRX400,2,2,0
,,,,
QSC,KW153,2,1,1
,,,,
QSC,KW181,2,2,0
,,,,
MACKIE,THUMP 15,4,3,1
,,,,
RADIAN,Micro Wedge 12,6,4,2
,,,,
THUNDER,Wedge,9,5,4`;

// Function to determine category from model name
function determineCategory(model: string): string {
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes('wedge') || modelLower.includes('m3') || modelLower.includes('micro')) {
    return 'monitor_wedges';
  } else if (modelLower.includes('sub') || modelLower.includes('b1') || modelLower.includes('sb')) {
    return 'subs';
  } else {
    return 'tops'; // Default for most speakers
  }
}

// Function to generate barcode
function generateBarcode(brand: string, model: string, index: number): string {
  const brandCode = brand.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const modelCode = model.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
  const paddedIndex = String(index).padStart(3, '0');
  return `${brandCode}-${modelCode}-${paddedIndex}`;
}

async function importInventory() {
  console.log('Starting inventory import...\n');
  
  const lines = csvData.split('\n');
  const items: any[] = [];
  let itemCounter = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line || line === ',,,,') continue;
    
    const parts = line.split(',');
    
    // Skip if not enough data
    if (parts.length < 5) continue;
    
    const brand = parts[0]?.trim();
    const model = parts[1]?.trim();
    const amount = parseInt(parts[2]?.trim() || '0');
    const working = parseInt(parts[3]?.trim() || '0');
    const nonWorking = parseInt(parts[4]?.trim() || '0');
    
    // Skip if no valid data
    if (!brand || !model || amount === 0) continue;
    
    const category = determineCategory(model);
    
    console.log(`Processing: ${brand} ${model} (${working} working, ${nonWorking} non-working)`);
    
    // Create individual items for each working unit
    for (let j = 1; j <= working; j++) {
      itemCounter++;
      const barcode = generateBarcode(brand, model, itemCounter);
      
      items.push({
        name: `${brand} ${model}`,
        barcode: barcode,
        qty_in_warehouse: 1,
        quantity_on_hand: 1,
        category: category,
        tags: [brand.toLowerCase().trim(), 'speaker'],
        maintenance_status: 'operational',
      });
    }
    
    // Create individual items for each non-working unit
    for (let j = 1; j <= nonWorking; j++) {
      itemCounter++;
      const barcode = generateBarcode(brand, model, itemCounter);
      
      items.push({
        name: `${brand} ${model}`,
        barcode: barcode,
        qty_in_warehouse: 1,
        quantity_on_hand: 1,
        category: category,
        tags: [brand.toLowerCase().trim(), 'speaker', 'repair'],
        maintenance_status: 'needs_repair',
      });
    }
  }
  
  console.log(`\nPrepared ${items.length} items for import\n`);
  
  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)...`);
    
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(batch)
      .select();
    
    if (error) {
      console.error('Error inserting batch:', error);
      throw error;
    }
    
    console.log(`✓ Inserted ${batch.length} items`);
  }
  
  console.log(`\n✅ Successfully imported ${items.length} inventory items!`);
  
  // Print summary
  console.log('\n📊 Summary:');
  const byBrand = items.reduce((acc, item) => {
    const brand = item.name.split(' ')[0];
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(byBrand).forEach(([brand, count]) => {
    console.log(`  ${brand}: ${count} items`);
  });
  
  const operational = items.filter(i => i.maintenance_status === 'operational').length;
  const needsRepair = items.filter(i => i.maintenance_status === 'needs_repair').length;
  
  console.log(`\n  Operational: ${operational}`);
  console.log(`  Needs Repair: ${needsRepair}`);
}

// Run the import
importInventory()
  .then(() => {
    console.log('\n✨ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
