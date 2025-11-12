import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVideoAvailability(videoId: string): Promise<boolean> {
  try {
    // Use YouTube oEmbed API to check if video exists
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return response.ok;
  } catch (error) {
    console.error(`Error checking video ${videoId}:`, error);
    return false;
  }
}

async function checkAndRemoveUnavailableVideos() {
  console.log('Fetching all training videos...');
  
  const { data: videos, error } = await supabase
    .from('training_videos')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching videos:', error);
    return;
  }

  console.log(`Found ${videos?.length || 0} videos. Checking availability...\n`);

  let unavailableCount = 0;
  const unavailableVideos: any[] = [];

  for (const video of videos || []) {
    const isAvailable = await checkVideoAvailability(video.youtube_video_id);
    
    if (!isAvailable) {
      console.log(`❌ UNAVAILABLE: "${video.title}"`);
      console.log(`   Video ID: ${video.youtube_video_id}`);
      console.log(`   URL: ${video.youtube_url}\n`);
      unavailableCount++;
      unavailableVideos.push(video);
    } else {
      console.log(`✅ Available: "${video.title}"`);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total videos: ${videos?.length || 0}`);
  console.log(`Available: ${(videos?.length || 0) - unavailableCount}`);
  console.log(`Unavailable: ${unavailableCount}`);
  console.log(`${'='.repeat(60)}\n`);

  if (unavailableVideos.length > 0) {
    console.log('Removing unavailable videos from database...\n');
    
    for (const video of unavailableVideos) {
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', video.id);

      if (error) {
        console.error(`Failed to delete "${video.title}":`, error);
      } else {
        console.log(`🗑️  Deleted: "${video.title}"`);
      }
    }

    console.log(`\n✅ Removed ${unavailableVideos.length} unavailable video(s)`);
  } else {
    console.log('✅ All videos are available!');
  }
}

checkAndRemoveUnavailableVideos();
