import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VideoData {
  category: string;
  title: string;
  youtube_url: string;
  focus_notes: string;
  relevant_to: string;
}

function parseCSV(csvContent: string): VideoData[] {
  const lines = csvContent.split('\n');
  const videos: VideoData[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with proper quote handling
    const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 5) continue;

    const [category, title, url, notes, relevantTo] = matches.map(m => 
      m.replace(/^"|"$/g, '').trim()
    );

    videos.push({
      category,
      title,
      youtube_url: url,
      focus_notes: notes,
      relevant_to: relevantTo
    });
  }

  return videos;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function parseDuration(notes: string): number | null {
  const match = notes.match(/(\d+)\s*(?:minutes?|mins?)/i);
  return match ? parseInt(match[1]) : null;
}

async function checkVideoAvailability(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function importReplacementVideos() {
  console.log('Reading replacement videos CSV...\n');
  
  const csvPath = path.join(process.cwd(), 'scripts', 'verified-replacement-videos.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const videos = parseCSV(csvContent);

  console.log(`Found ${videos.length} replacement videos to import.\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    const videoId = extractYouTubeVideoId(video.youtube_url);
    
    if (!videoId) {
      console.log(`⚠️  Skipping "${video.title}" - invalid URL`);
      skipCount++;
      continue;
    }

    // Check if video is available
    const isAvailable = await checkVideoAvailability(videoId);
    if (!isAvailable) {
      console.log(`❌ Skipping "${video.title}" - video unavailable`);
      skipCount++;
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    const duration = parseDuration(video.focus_notes);
    const tags = video.relevant_to.split('/').map(t => t.trim());
    
    // Determine if featured (Advanced and Equipment-Specific)
    const isFeatured = ['Advanced', 'Equipment-Specific'].includes(video.category);

    try {
      const { error } = await supabase
        .from('training_videos')
        .insert({
          title: video.title,
          description: video.focus_notes,
          youtube_url: video.youtube_url,
          youtube_video_id: videoId,
          category: video.category,
          tags: tags,
          duration_minutes: duration,
          is_featured: isFeatured,
          view_count: 0,
          display_order: successCount + 1
        });

      if (error) {
        console.log(`❌ Error importing "${video.title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Imported: "${video.title}" (${video.category})`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Error importing "${video.title}":`, err);
      errorCount++;
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Import Summary:`);
  console.log(`  ✅ Successfully imported: ${successCount}`);
  console.log(`  ⚠️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`${'='.repeat(60)}`);
}

importReplacementVideos();
