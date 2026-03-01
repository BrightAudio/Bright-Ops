// lib/leads/verifyLeadsAccess.ts
/**
 * Enterprise Leads access gate + atomic token reservation
 * 
 * Checks (in order):
 * 1. License exists & plan is 'enterprise'
 * 2. License status is active (not past_due/restricted/etc)
 * 3. Rate limit not exceeded (2 requests per 10 sec per endpoint)
 * 4. Reserve tokens atomically via RPC (prevents double-spend)
 * 5. Log audit trail
 */

import { createClient } from '@supabase/supabase-js';

export type GateResult =
  | { allowed: true; tokensRemaining: number }
  | { allowed: false; status: number; error: string };

export async function verifyLeadsAccessAndReserveTokens(params: {
  organizationId: string;
  userId: string;
  tokenType: 'lead_generation';
  tokensNeeded: number;
  endpoint: string;
}): Promise<GateResult> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ════════════════════════════════════════════════════════════
  // GATE 1: License check (single source of truth)
  // ════════════════════════════════════════════════════════════
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('plan, status')
    .eq('organization_id', params.organizationId)
    .single();

  if (!license) {
    return { allowed: false, status: 403, error: 'License not found.' };
  }

  if (license.plan !== 'enterprise') {
    return { allowed: false, status: 403, error: 'Leads is Enterprise-only.' };
  }

  if (['past_due', 'restricted', 'canceled', 'unpaid'].includes(license.status)) {
    return { allowed: false, status: 402, error: 'Leads suspended due to billing status.' };
  }

  // ════════════════════════════════════════════════════════════
  // GATE 2: Rate limit (2 req / 10 sec per endpoint per user)
  // ════════════════════════════════════════════════════════════
  const since = new Date(Date.now() - 10_000).toISOString();

  const { count } = await supabaseAdmin
    .from('lead_activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .eq('endpoint', params.endpoint)
    .gte('created_at', since);

  if ((count ?? 0) >= 2) {
    return { allowed: false, status: 429, error: 'Rate limit exceeded.' };
  }

  // ════════════════════════════════════════════════════════════
  // GATE 3: Atomic token reserve via RPC
  // ════════════════════════════════════════════════════════════
  const { data: newBalance, error: tokenError } = await supabaseAdmin.rpc(
    'reserve_tokens',
    {
      p_organization_id: params.organizationId,
      p_token_type: params.tokenType,
      p_amount: params.tokensNeeded
    }
  );

  if (tokenError) {
    if (tokenError.message.includes('Insufficient')) {
      return {
        allowed: false,
        status: 402,
        error: 'Out of tokens. Buy credits to continue.'
      };
    }

    return {
      allowed: false,
      status: 500,
      error: 'Token system error.'
    };
  }

  // ════════════════════════════════════════════════════════════
  // GATE 4: Audit log (for rate limiting + traceability)
  // ════════════════════════════════════════════════════════════
  try {
    await supabaseAdmin
      .from('lead_activities')
      .insert({
        user_id: params.userId,
        activity_type: 'api_call',
        endpoint: params.endpoint,
        tokens_used: params.tokensNeeded
      });
  } catch (err) {
    console.error('Failed to log lead activity:', err);
  }

  return { allowed: true, tokensRemaining: Number(newBalance) };
}

// ════════════════════════════════════════════════════════════
// REQUIRED: Supabase SQL function for atomic token deduction
// ════════════════════════════════════════════════════════════
// Run this ONCE in your Supabase SQL editor:
/*
create or replace function reserve_tokens(
  p_organization_id uuid,
  p_token_type text,
  p_amount int
) returns int language plpgsql security definer as $$
declare
  v_balance int;
begin
  -- Lock row to prevent race condition (concurrent requests)
  select balance into v_balance from ai_tokens
    where organization_id = p_organization_id
      and token_type = p_token_type
    for update;

  -- Validate prerequisites
  if v_balance is null then
    raise exception 'Token account not found';
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient tokens';
  end if;

  -- Deduct tokens atomically
  update ai_tokens
    set balance = balance - p_amount,
        total_used = total_used + p_amount,
        last_used_at = now(),
        updated_at = now()
    where organization_id = p_organization_id
      and token_type = p_token_type;

  -- Return new balance
  select balance into v_balance from ai_tokens
    where organization_id = p_organization_id
      and token_type = p_token_type;

  return v_balance;
end;
$$;
*/
