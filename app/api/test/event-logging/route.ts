import { NextRequest, NextResponse } from 'next/server';
import { logQuestEvent } from '@/lib/utils/questEvents';

/**
 * POST /api/test/event-logging
 * 
 * Test endpoint to verify quest event logging is working
 * Logs a test event and returns the result
 * 
 * Response:
 * {
 *   success: boolean,
 *   event: QuestEvent | null,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Log a test event
    const event = await logQuestEvent(
      'lead_reachout_sent',
      'lead',
      'test-lead-001',
      {
        metricValue: 1,
        source: 'system',
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'This is a test event from event-logging API',
        },
      }
    );

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          message: 'Failed to log event - database error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        event,
        message: 'Test event logged successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in test event-logging:', error);
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
