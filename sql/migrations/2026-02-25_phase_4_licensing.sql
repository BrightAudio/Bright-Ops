-- ============================================
-- PHASE 4: Licensing & Billing System
-- Supabase migrations
-- ============================================

-- STEP 1: Create licenses table (tracks subscription per organization)
-- ============================================

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  
  plan text not null check (plan in ('starter','pro','enterprise')),
  status text not null check (status in ('active','past_due','unpaid','canceled','incomplete','trialing')),
  
  current_period_end timestamptz,
  delinquent_since timestamptz,  -- first payment failure timestamp
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_licenses_org on public.licenses(organization_id);
create index if not exists idx_licenses_status on public.licenses(status);
create index if not exists idx_licenses_stripe_customer on public.licenses(stripe_customer_id);

alter table public.licenses enable row level security;

-- RLS: Users can see license status for their organization
drop policy if exists "Users can view their organization license" on public.licenses;
create policy "Users can view their organization license"
  on public.licenses
  for select
  using (
    organization_id in (
      select organization_id from public.user_profiles where id = auth.uid()
    )
  );

comment on table public.licenses is 'Tracks Stripe subscription per organization';


-- STEP 2: License devices (device fingerprinting + last seen)
-- ============================================

create table if not exists public.license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null,
  device_name text,
  
  last_seen_at timestamptz not null default now(),
  app_version text,
  
  created_at timestamptz not null default now(),
  
  unique(license_id, device_id)
);

create index if not exists idx_license_devices_license on public.license_devices(license_id);

alter table public.license_devices enable row level security;

comment on table public.license_devices is 'Tracks devices using a license for enforcement and analytics';


-- STEP 3: License history (audit trail – human readable)
-- ============================================

create table if not exists public.license_history (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  event_type text not null,  -- payment_failed, payment_succeeded, plan_changed, status_changed, etc
  details jsonb,  -- flexible event data
  created_at timestamptz not null default now()
);

create index if not exists idx_license_history_license on public.license_history(license_id);

comment on table public.license_history is 'Audit trail of all license lifecycle events';


-- STEP 4: Stripe events (idempotency)
-- ============================================

create table if not exists public.stripe_events (
  id text primary key,  -- Stripe event id: evt_...
  type text not null,
  created timestamptz,
  payload jsonb not null,
  
  processed_at timestamptz,
  processing_error text,
  
  created_at timestamptz default now()
);

comment on table public.stripe_events is 'Log of Stripe webhooks for idempotency and debugging';


-- STEP 5: Auto-update timestamps
-- ============================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_licenses_updated_at on public.licenses;
create trigger trg_licenses_updated_at
  before update on public.licenses
  for each row
  execute function set_updated_at();
