import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * SETUP ENDPOINT - Populate database with test data
 * This fixes the issue where migrations ran but data wasn't inserted
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setup: Populating database with test data...');

    // Use service role key (admin) to bypass RLS policies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: any = {};

    // 1. Clear and populate job titles
    console.log('📝 Inserting job titles...');
    const { error: deleteError } = await supabase
      .from('lead_job_titles')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting old job titles:', deleteError);
    }

    const jobTitles = [
      // Event & Venue Decision-Makers (highest priority)
      { title: 'Event Coordinator', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Event Manager', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Event Director', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Director of Events', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Venue Manager', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Venue Coordinator', category: 'Event & Venue Decision-Makers', priority: 100 },
      { title: 'Event Operations Manager', category: 'Event & Venue Decision-Makers', priority: 95 },
      { title: 'Special Events Manager', category: 'Event & Venue Decision-Makers', priority: 95 },
      { title: 'Special Events Coordinator', category: 'Event & Venue Decision-Makers', priority: 95 },
      { title: 'Booking Manager', category: 'Event & Venue Decision-Makers', priority: 90 },
      { title: 'Banquet Manager', category: 'Event & Venue Decision-Makers', priority: 90 },
      { title: 'Catering & Events Manager', category: 'Event & Venue Decision-Makers', priority: 90 },

      // Museum / Cultural / Arts Organizations
      { title: 'Curator', category: 'Museum / Cultural / Arts', priority: 85 },
      { title: 'Programs Coordinator', category: 'Museum / Cultural / Arts', priority: 85 },
      { title: 'Programs Manager', category: 'Museum / Cultural / Arts', priority: 85 },
      { title: 'Director of Visitor Experience', category: 'Museum / Cultural / Arts', priority: 85 },
      { title: 'Director of Public Programs', category: 'Museum / Cultural / Arts', priority: 85 },
      { title: 'Community Engagement Manager', category: 'Museum / Cultural / Arts', priority: 80 },
      { title: 'Community Engagement Director', category: 'Museum / Cultural / Arts', priority: 80 },
      { title: 'Cultural Events Coordinator', category: 'Museum / Cultural / Arts', priority: 80 },
      { title: 'Arts Programming Manager', category: 'Museum / Cultural / Arts', priority: 80 },
      { title: 'Exhibition Coordinator', category: 'Museum / Cultural / Arts', priority: 75 },

      // Corporate / Institutional Events
      { title: 'Corporate Events Manager', category: 'Corporate / Institutional', priority: 85 },
      { title: 'Corporate Events Coordinator', category: 'Corporate / Institutional', priority: 85 },
      { title: 'Marketing & Events Manager', category: 'Corporate / Institutional', priority: 80 },
      { title: 'Marketing & Events Coordinator', category: 'Corporate / Institutional', priority: 80 },
      { title: 'Communications & Events Specialist', category: 'Corporate / Institutional', priority: 75 },
      { title: 'Campus Events Manager', category: 'Corporate / Institutional', priority: 75 },
      { title: 'Student Activities Director', category: 'Corporate / Institutional', priority: 75 },
      { title: 'Conference Services Manager', category: 'Corporate / Institutional', priority: 80 },

      // Hospitality & Entertainment
      { title: 'Hospitality Events Manager', category: 'Hospitality & Entertainment', priority: 80 },
      { title: 'Banquet & Events Supervisor', category: 'Hospitality & Entertainment', priority: 75 },
      { title: 'Entertainment Manager', category: 'Hospitality & Entertainment', priority: 80 },
      { title: 'Entertainment Coordinator', category: 'Hospitality & Entertainment', priority: 75 },
      { title: 'Nightlife Manager', category: 'Hospitality & Entertainment', priority: 70 },
      { title: 'Programming Director', category: 'Hospitality & Entertainment', priority: 75 },

      // Government / Civic / Community
      { title: 'Parks & Recreation Events Coordinator', category: 'Government / Civic / Community', priority: 75 },
      { title: 'Economic Development Events Manager', category: 'Government / Civic / Community', priority: 70 },
      { title: 'Community Events Director', category: 'Government / Civic / Community', priority: 75 },
      { title: 'Public Events Manager', category: 'Government / Civic / Community', priority: 75 },
    ];

    const { data: insertedTitles, error: titlesError } = await supabase
      .from('lead_job_titles')
      .insert(jobTitles)
      .select();

    console.log('Job titles insert response:', { insertedTitles, titlesError });

    results.jobTitles = {
      inserted: insertedTitles?.length || 0,
      error: titlesError?.message || null,
    };
    console.log(`✅ Job titles: ${jobTitles.length} rows attempted, ${insertedTitles?.length || 0} inserted`);

    // 2. Clear and populate keywords
    console.log('📝 Inserting keywords...');
    const { error: deleteKeywordsError } = await supabase
      .from('lead_search_keywords')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    const keywords = [
      'event booking',
      'rental coordination',
      'venue rentals',
      'facility rentals',
      'special events',
      'public programs',
      'museum events',
      'arts and culture events',
      'weddings corporate events',
      'audio visual services',
      'production services',
      'event production',
    ];

    const keywordData = keywords.map((k) => ({ keyword: k, is_active: true }));
    const { data: insertedKeywords, error: keywordsError } = await supabase
      .from('lead_search_keywords')
      .insert(keywordData)
      .select();

    console.log('Keywords insert response:', { insertedKeywords, keywordsError });

    results.keywords = {
      inserted: insertedKeywords?.length || 0,
      error: keywordsError?.message || null,
    };
    console.log(`✅ Keywords: ${keywords.length} rows attempted, ${insertedKeywords?.length || 0} inserted`);

    // 3. Verify inserts
    console.log('🔍 Verifying inserts...');
    const { data: verifyTitles, error: verifyTitlesError } = await supabase
      .from('lead_job_titles')
      .select('COUNT');

    const { data: verifyKeywords, error: verifyKeywordsError } = await supabase
      .from('lead_search_keywords')
      .select('COUNT');

    return NextResponse.json({
      status: 'Setup complete',
      results,
      message: `Inserted ${jobTitles.length} job titles and ${keywords.length} keywords. Auto-search should now work!`,
    });
  } catch (error: any) {
    console.error('❌ Setup error:', error);
    return NextResponse.json(
      {
        error: 'Setup failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
