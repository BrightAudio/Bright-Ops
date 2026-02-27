import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST /api/test/event-logging
 * 
 * Test endpoint to verify quest event logging is working
 * Logs a test event directly to Supabase and returns the result
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Test event-logging endpoint called');
    
    const supabase = await supabaseServer();
    
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
