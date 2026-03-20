-- ============================================
-- ACTIVATION KEYS TABLE
-- Supports license key activation flow
-- ============================================

create table if not exists public.activation_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  plan text not null default 'starter' check (plan in ('starter','pro','enterprise')),
  
  -- Tracking
  used_by_org_id uuid references public.organizations(id) on delete set null,
  activated_at timestamptz,
  expires_at timestamptz,  -- null = never expires
  
  -- Metadata
  notes text,
  created_by text,  -- admin email or 'stripe_webhook' or 'manual'
  
  created_at timestamptz not null default now()
);

create index if not exists idx_activation_keys_key on public.activation_keys(key);
create index if not exists idx_activation_keys_org on public.activation_keys(used_by_org_id);

alter table public.activation_keys enable row level security;

-- Only service role can read/write activation keys (via API routes)
-- No direct user access needed
comment on table public.activation_keys is 'License activation keys for Bright Ops subscriptions';
