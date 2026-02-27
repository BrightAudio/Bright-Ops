import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/event-logging
 * 
 * Test endpoint to verify quest event logging is working
 * Uses service role for admin access (bypasses RLS)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Test event-logging endpoint called');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('📋 Checking config:', {
      hasUrl: !!supabaseUrl,
      hasServiceRole: !!supabaseServiceRole,
    });

    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          message: 'Missing Supabase environment variables',
        },
        { status: 500 }
      );
    }
    
    // Use service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
    });
    
    console.log('🔐 Supabase client created');
    
    // Log a test event directly
    const { data, error } = await supabase
      .from('quest_events')
      .insert({
        event_type: 'lead_reachout_sent',
        entity_type: 'lead',
        entity_id: 'test-lead-001',
        metric_value: 1,
        source: 'system',
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'This is a test event from event-logging API',
        },
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Event logging error:', error);
      return NextResponse.json(
        {
          success: false,
          event: null,
          message: `Database error: ${error.message}`,
          errorDetails: error,
        },
        { status: 500 }
      );
    }

    console.log('✅ Test event logged successfully:', data);
    
    return NextResponse.json(
      {
        success: true,
        event: data,
        message: 'Test event logged successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error in test event-logging:', error);
    return NextResponse.json(
      {
        success: false,
        event: null,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/event-logging
 * 
 * Health check - returns info about the endpoint
 */
export async function GET() {
  return NextResponse.json({
    name: 'Event Logging Test Endpoint',
    description: 'Test endpoint to verify quest_events table is working',
    method: 'POST',
    usage: 'curl -X POST http://localhost:3000/api/test/event-logging',
    response: {
      success: 'boolean',
      event: 'QuestEvent object or null',
      message: 'Status message',
    },
  });
}
