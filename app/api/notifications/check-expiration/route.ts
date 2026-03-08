import { NextRequest, NextResponse } from 'next/server';
import {
  checkLicenseExpiration,
  checkPaymentFailures,
  checkGracePeriodEnding,
} from '@/lib/notifications/triggers';

/**
 * POST /api/notifications/check-expiration
 * Manually trigger license expiration checks
 * Protected by CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all checks
    const expirationResults = await checkLicenseExpiration();
    const paymentResults = await checkPaymentFailures();
    const graceResults = await checkGracePeriodEnding();

    return NextResponse.json({
      status: 'success',
      results: {
        expirations: expirationResults,
        payments: paymentResults,
        gracePeriods: graceResults,
        totalSent: (expirationResults?.length || 0) + (paymentResults?.length || 0) + (graceResults?.length || 0),
      },
    });
  } catch (error) {
    console.error('❌ Error in notification check endpoint:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
