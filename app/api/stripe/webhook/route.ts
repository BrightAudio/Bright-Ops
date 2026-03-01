import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Initialize clients lazily in the request handler to avoid build-time env var requirements
function initializeClients() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as any,
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  return { stripe, supabase };
}

async function markStripeEventProcessed(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  type: string,
  payload: unknown,
  err?: string
) {
  await supabase.from('stripe_events').upsert({
    id: eventId,
    type,
    created: payload && typeof payload === 'object' && 'created' in payload 
      ? new Date((payload.created as number) * 1000).toISOString() 
      : null,
    payload,
    processed_at: err ? null : new Date().toISOString(),
    processing_error: err ?? null,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    var { stripe, supabase } = initializeClients();
  } catch (error) {
    console.error('❌ Failed to initialize Stripe/Supabase clients:', error);
    return NextResponse.json(
      { error: 'Webhook handler misconfigured' },
      { status: 500 }
    );
  }
  const sig = (await headers()).get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: `Webhook signature failed: ${error.message}` },
      { status: 400 }
    );
  }

  // Idempotency: check if event already processed
  const { data: existing } = (await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (existing?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        const { data: lic } = (await supabase
          .from('licenses')
          .select('id, delinquent_since')
          .eq('stripe_customer_id', customerId)
          .single()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (lic) {
          await supabase
            .from('licenses')
            .update({
              status: 'past_due',
              delinquent_since: lic.delinquent_since ?? new Date().toISOString(),
            })
            .eq('id', lic.id);

          await supabase.from('license_history').insert({
            license_id: lic.id,
            event_type: 'payment_failed',
            details: { invoice_id: invoice.id },
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        const { data: lic } = (await supabase
          .from('licenses')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (lic) {
          await supabase
            .from('licenses')
            .update({
              status: 'active',
              delinquent_since: null,
            })
            .eq('id', lic.id);

          await supabase.from('license_history').insert({
            license_id: lic.id,
            event_type: 'payment_succeeded',
            details: { invoice_id: invoice.id },
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription & { current_period_end?: number };
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

        if (!customerId) break;

        const newPlan = (sub.items.data[0]?.price?.lookup_key ?? null) as string | null;
        const status = sub.status;
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const { data: lic } = (await supabase
          .from('licenses')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .single()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

        if (lic) {
          // Only update plan if lookup_key is present (Stripe config requirement)
          const updateData: Record<string, unknown> = {
            stripe_subscription_id: sub.id,
            status,
            current_period_end: currentPeriodEnd,
          };

          if (newPlan) {
            updateData.plan = newPlan;
          }

          // If subscription is active/trialing, clear delinquency
          if (status === 'active' || status === 'trialing') {
            updateData.delinquent_since = null;
          }

          await supabase.from('licenses').update(updateData).eq('id', lic.id);

          await supabase.from('license_history').insert({
            license_id: lic.id,
            event_type: 'subscription_updated',
            details: {
              subscription_id: sub.id,
              status,
              plan: newPlan,
            },
          });
        }
        break;
      }

      default:
        break;
    }

    await markStripeEventProcessed(supabase, event.id, event.type, event);
    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    const error = e as Error;
    await markStripeEventProcessed(supabase, event.id, event.type, event, error?.message ?? 'unknown');
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
