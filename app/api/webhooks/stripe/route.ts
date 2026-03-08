import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Lazy initialize Stripe to avoid build-time errors when API keys are not available
let stripeClient: Stripe | null = null;
let supabaseClient: any = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeClient = new Stripe(apiKey, {
      apiVersion: '2023-10-16' as any,
    });
  }
  return stripeClient;
}

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials are not set');
    }
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient;
}

/**
 * Stripe Webhook Handler
 * Processes payment failures and updates license status
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    const stripe = getStripe();
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', (error as any).message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`📨 Stripe webhook: ${event.type}`);

    // Handle payment_intent.payment_failed
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(paymentIntent);
    }

    // Handle charge.failed (fallback)
    if (event.type === 'charge.failed') {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeFailed(charge);
    }

    // Handle invoice payment failed
    if (event.type === 'invoice.payment_action_required' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await handleInvoicePaymentFailed(invoice.customer as string);
      }
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('❌ Webhook error:', (error as any).message);
    return NextResponse.json(
      { error: (error as any).message ?? 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle payment_intent.payment_failed
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  if (!paymentIntent.customer) {
    console.log('⚠️  Payment intent has no customer, skipping');
    return;
  }

  const customerId = typeof paymentIntent.customer === 'string'
    ? paymentIntent.customer
    : paymentIntent.customer.id;

  try {
    // Find organization by Stripe customer ID
    const { data: org, error: orgErr } = await getSupabase()
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (orgErr || !org) {
      console.log(`⚠️  Organization not found for customer ${customerId}`);
      return;
    }

    // Update license to mark delinquent
    const now = new Date().toISOString();
    const { error: licErr } = await getSupabase()
      .from('licenses')
      .update({
        delinquent_since: now,
        status: 'delinquent',
      })
      .eq('organization_id', org.id)
      .is('delinquent_since', null); // Only update if not already delinquent

    if (licErr) {
      console.error(`❌ Failed to update license: ${licErr.message}`);
      return;
    }

    console.log(`✅ License marked as delinquent for org ${org.id}`);

    // Queue email notification
    await sendDelinquentNotification(org.id, customerId);
  } catch (error) {
    console.error(`❌ Error handling payment failed: ${(error as any).message}`);
  }
}

/**
 * Handle charge.failed (fallback)
 */
async function handleChargeFailed(charge: Stripe.Charge): Promise<void> {
  if (!charge.customer) {
    console.log('⚠️  Charge has no customer, skipping');
    return;
  }

  const customerId = typeof charge.customer === 'string'
    ? charge.customer
    : charge.customer.id;

  // Same logic as payment_intent
  await handlePaymentFailed({ customer: customerId } as Stripe.PaymentIntent);
}

/**
 * Handle invoice payment failures
 */
async function handleInvoicePaymentFailed(customerId: string): Promise<void> {
  try {
    // Find organization by Stripe customer ID
    const { data: org, error: orgErr } = await getSupabase()
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (orgErr || !org) {
      console.log(`⚠️  Organization not found for customer ${customerId}`);
      return;
    }

    // Update license to mark delinquent
    const now = new Date().toISOString();
    const { error: licErr } = await getSupabase()
      .from('licenses')
      .update({
        delinquent_since: now,
        status: 'delinquent',
      })
      .eq('organization_id', org.id)
      .is('delinquent_since', null);

    if (licErr) {
      console.error(`❌ Failed to update license: ${licErr.message}`);
      return;
    }

    console.log(`✅ License marked as delinquent for org ${org.id}`);

    // Queue email notification
    await sendDelinquentNotification(org.id, customerId);
  } catch (error) {
    console.error(`❌ Error handling invoice payment failed: ${(error as any).message}`);
  }
}

/**
 * Send delinquent notification email (placeholder for now)
 * In production, this would queue a job to send email via service
 */
async function sendDelinquentNotification(
  orgId: string,
  customerId: string
): Promise<void> {
  try {
    // Get organization details
    const { data: org } = await getSupabase()
      .from('organizations')
      .select('id, name, created_by')
      .eq('id', orgId)
      .single();

    if (!org) return;

    // Get user email
    const { data: user } = await getSupabase()
      .from('user_profiles')
      .select('email')
      .eq('id', org.created_by)
      .single();

    if (!user?.email) return;

    // TODO: Queue email job
    console.log(`📧 Notification queued for ${user.email}: Payment failed for ${org.name}`);

    // In production, this would look like:
    // await emailQueue.push({
    //   to: user.email,
    //   template: 'payment-failed',
    //   data: {
    //     orgName: org.name,
    //     daysUntilRestricted: 15,
    //   }
    // })
  } catch (error) {
    console.error(`❌ Error sending notification: ${(error as any).message}`);
  }
}
