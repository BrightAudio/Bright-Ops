import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface VideoData {
  Category: string;
  Title: string;
  'YouTube URL': string;
  'Focus/Notes': string;
  'Relevant To (Inventory / Service Model)': string;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function parseDuration(notes: string): number | null {
  // Try to extract duration from notes like "45 Minutes" or "10 minutes"
  const match = notes.match(/(\d+)\s*(?:minute|min)/i);
  return match ? parseInt(match[1]) : null;
}

function parseCSV(csvContent: string): VideoData[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const videos: VideoData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles commas in quotes)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= 4) {
      videos.push({
        Category: values[0],
        Title: values[1],
        'YouTube URL': values[2],
        'Focus/Notes': values[3],
        'Relevant To (Inventory / Service Model)': values[4] || '',
      });
    }
  }

  return videos;
}

async function importTrainingVideos() {
  console.log('Starting training video import...');

  // Read the CSV file
  const csvPath = path.join(process.cwd(), 'scripts', 'live_audio_training_videos.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const videos = parseCSV(csvContent);
  console.log(`Found ${videos.length} videos to import`);

  let successCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    const videoId = extractYouTubeVideoId(video['YouTube URL']);
    
    if (!videoId) {
      console.error(`❌ Invalid YouTube URL for: ${video.Title}`);
      errorCount++;
      continue;
    }

    const duration = parseDuration(video['Focus/Notes']);

    // Determine if featured (Advanced or Equipment-Specific categories)
    const isFeatured = ['Advanced', 'Equipment-Specific'].includes(video.Category);

    // Create tags from relevant items
    const tags = video['Relevant To (Inventory / Service Model)']
      .split('/')
      .map(t => t.trim())
      .filter(t => t && t !== 'General Training');

    try {
      const { error } = await supabase
        .from('training_videos')
        .insert({
          title: video.Title,
          description: video['Focus/Notes'],
          youtube_url: video['YouTube URL'],
          youtube_video_id: videoId,
          category: video.Category,
          tags: tags,
          duration_minutes: duration,
          is_featured: isFeatured,
          view_count: 0,
        });

      if (error) {
        console.error(`❌ Error importing "${video.Title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Imported: ${video.Title}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception importing "${video.Title}":`, err);
      errorCount++;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Import Complete ===');
  console.log(`✅ Successfully imported: ${successCount} videos`);
  console.log(`❌ Failed: ${errorCount} videos`);
  console.log(`📊 Total: ${videos.length} videos`);
}

importTrainingVideos()
  .then(() => {
    console.log('Import script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import script failed:', error);
    process.exit(1);
  });
