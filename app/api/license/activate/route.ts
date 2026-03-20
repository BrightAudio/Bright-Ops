import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Hardcoded test key for development/demo use
const TEST_KEY = 'BRIGHT-OPS-TEST';
const TEST_PLAN = 'enterprise';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { licenseKey, userId } = await req.json();

    if (!licenseKey || !userId) {
      return NextResponse.json(
        { error: 'License key and user ID are required' },
        { status: 400 }
      );
    }

    const normalizedKey = licenseKey.trim().toUpperCase();

    // Get user's organization
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileErr || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found. Please complete onboarding first.' },
        { status: 403 }
      );
    }

    const orgId = userProfile.organization_id;

    // Handle test key
    if (normalizedKey === TEST_KEY) {
      return await activateLicense(orgId, TEST_PLAN, 'test_key', normalizedKey);
    }

    // Look up activation key in database
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from('activation_keys')
      .select('*')
      .eq('key', normalizedKey)
      .single();

    if (keyErr || !keyRecord) {
      return NextResponse.json(
        { error: 'Invalid license key. Please check and try again.' },
        { status: 404 }
      );
    }

    // Check if key is already used
    if (keyRecord.used_by_org_id && keyRecord.used_by_org_id !== orgId) {
      return NextResponse.json(
        { error: 'This license key has already been redeemed by another organization.' },
        { status: 409 }
      );
    }

    // Check if key is expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This license key has expired.' },
        { status: 410 }
      );
    }

    // Mark key as used
    await supabaseAdmin
      .from('activation_keys')
      .update({
        used_by_org_id: orgId,
        activated_at: new Date().toISOString(),
      })
      .eq('id', keyRecord.id);

    return await activateLicense(
      orgId,
      keyRecord.plan || 'starter',
      'activation_key',
      normalizedKey
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.error('[license/activate] Error:', error);
    return NextResponse.json(
      { error: 'Activation failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function activateLicense(
  orgId: string,
  plan: string,
  source: string,
  key: string
): Promise<NextResponse> {
  // Check if org already has a license
  const { data: existingLicense } = await supabaseAdmin
    .from('licenses')
    .select('id, status')
    .eq('organization_id', orgId)
    .single();

  if (existingLicense) {
    // Reactivate existing license
    await supabaseAdmin
      .from('licenses')
      .update({
        status: 'active',
        plan,
        delinquent_since: null,
        current_period_end: getExpiryDate(plan),
      })
      .eq('id', existingLicense.id);

    await supabaseAdmin.from('license_history').insert({
      license_id: existingLicense.id,
      event_type: 'key_activated',
      details: { source, key, plan },
    });

    return NextResponse.json({
      success: true,
      message: 'License activated successfully!',
      plan,
      license_id: existingLicense.id,
    });
  }

  // Create new license
  const { data: newLicense, error: createErr } = await supabaseAdmin
    .from('licenses')
    .insert({
      organization_id: orgId,
      stripe_customer_id: `key_${key}_${Date.now()}`,
      plan,
      status: 'active',
      current_period_end: getExpiryDate(plan),
    })
    .select('id')
    .single();

  if (createErr || !newLicense) {
    console.error('[activateLicense] Failed to create license:', createErr);
    return NextResponse.json(
      { error: 'Failed to create license record.' },
      { status: 500 }
    );
  }

  await supabaseAdmin.from('license_history').insert({
    license_id: newLicense.id,
    event_type: 'key_activated',
    details: { source, key, plan },
  });

  return NextResponse.json({
    success: true,
    message: 'License activated successfully!',
    plan,
    license_id: newLicense.id,
  });
}

function getExpiryDate(plan: string): string {
  // Test keys and activation keys get 1 year by default
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  return expiry.toISOString();
}
