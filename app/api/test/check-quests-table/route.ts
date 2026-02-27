import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking if quests table exists...');

    // Try to query the quests table to see if it exists
    const { data, error } = await supabase
      .from('quests')
      .select('COUNT(*)', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      console.error('❌ Error checking quests table:', error.message, error.code);
      
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          message: '❌ Quests table does not exist',
          instructions: [
            '1. Go to Supabase dashboard (https://supabase.com/dashboard)',
            '2. Select your project',
            '3. Go to SQL Editor',
            '4. Copy and run the migration from migrations/003_create_quests.sql',
            'Or run: supabase db push (if using Supabase CLI)'
          ],
          error: error.message,
          code: error.code
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        message: 'Error checking quests table',
        error: error.message,
        code: error.code
      }, { status: 400 });
    }

    console.log('✅ Quests table exists and is accessible');
    return NextResponse.json({
      success: true,
      message: '✅ Quests table exists and is ready to use'
    }, { status: 200 });
  } catch (error) {
    console.error('❌ Exception:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check quests table',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
