import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Plan = 'starter' | 'pro' | 'enterprise';
type ComputedStatus = 'active' | 'warning' | 'limited' | 'restricted';

function featuresForPlan(plan: Plan) {
  return {
    multi_warehouse: plan !== 'starter',
    crew_scheduling: plan !== 'starter',
    financial_dashboards: plan !== 'starter',
    api_access: plan === 'enterprise',
    advanced_analytics: plan === 'enterprise',
  };
}

function computeDegradation(delinquentSinceISO: string | null): {
  computedStatus: ComputedStatus;
  daysDelinquent: number;
} {
  if (!delinquentSinceISO) {
    return { computedStatus: 'active', daysDelinquent: 0 };
  }

  const delinquentSince = new Date(delinquentSinceISO).getTime();
  const now = Date.now();
  const days = Math.floor((now - delinquentSince) / (1000 * 60 * 60 * 24));

  if (days <= 7) return { computedStatus: 'warning', daysDelinquent: Math.max(0, days) };
  if (days <= 14) return { computedStatus: 'limited', daysDelinquent: days };
  return { computedStatus: 'restricted', daysDelinquent: days };
}

interface VerifyRequest {
  userId: string;
  deviceId: string;
  deviceName?: string;
  appVersion: string;
}

interface LicenseVerifyResponse {
  license_id: string;
  plan: Plan;
  status: ComputedStatus;
  expiry_date: string | null;
  last_verified_at: string;
  grace_period: {
    days_remaining: number;
    expires_at: string | null;
  };
  features: Record<string, boolean>;
  sync_enabled: boolean;
  can_create_jobs: boolean;
  can_add_inventory: boolean;
  min_required_app_version: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<LicenseVerifyResponse | { error: string }>> {
  try {
    const body: VerifyRequest = await req.json();
    const { userId, deviceId, deviceName, appVersion } = body;

    if (!userId || !deviceId || !appVersion) {
      return NextResponse.json(
        { error: 'Missing userId/deviceId/appVersion' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userProfile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileErr || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 403 }
      );
    }

    const orgId = userProfile.organization_id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lic, error: licErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (licErr || !lic) {
      return NextResponse.json(
        { error: 'No license found' },
        { status: 403 }
      );
    }

    // Register/update device
    await supabase.from('license_devices').upsert(
      {
        license_id: lic.id,
        device_id: deviceId,
        device_name: deviceName ?? null,
        app_version: appVersion,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'license_id,device_id' }
    );

    // Determine status based on billing
    const plan = lic.plan as Plan;
    const billingStatus = lic.status as string;
    const isPaid = billingStatus === 'active' || billingStatus === 'trialing';

    let computedStatus: ComputedStatus = 'active';
    let grace = {
      days_remaining: 0,
      expires_at: null as string | null,
    };

    if (!isPaid) {
      const { computedStatus: s, daysDelinquent } = computeDegradation(lic.delinquent_since);
      computedStatus = s;

      const totalGraceDays = 15;
      const daysRemaining = Math.max(0, totalGraceDays - daysDelinquent);
      grace = {
        days_remaining: daysRemaining,
        expires_at: lic.delinquent_since
          ? new Date(
              new Date(lic.delinquent_since).getTime() + totalGraceDays * 86400000
            ).toISOString()
          : null,
      };
    }

    const features = featuresForPlan(plan);
    const sync_enabled = computedStatus !== 'limited' && computedStatus !== 'restricted';
    const can_create_jobs = computedStatus !== 'restricted';
    const can_add_inventory = computedStatus !== 'restricted';

    return NextResponse.json({
      license_id: lic.id,
      plan,
      status: computedStatus,
      expiry_date: lic.current_period_end ?? null,
      last_verified_at: new Date().toISOString(),
      grace_period: grace,
      features,
      sync_enabled,
      can_create_jobs,
      can_add_inventory,
      min_required_app_version: '1.0.0',
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json(
      { error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
