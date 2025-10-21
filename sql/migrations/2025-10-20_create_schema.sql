-- 2025-10-20_create_schema.sql

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Table: clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- Table: jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text,
  client_id uuid references public.clients(id),
  venue text,
  start_at timestamptz,
  end_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Table: products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  photo_url text,
  status text default 'active',
  created_at timestamptz default now()
);

-- Table: serials
create table if not exists public.serials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  barcode text unique not null,
  status text default 'in_stock',
  location text,
  created_at timestamptz default now()
);

-- Table: sheets
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  type text check (type in ('PULL','PREP','OUTBOUND','RETURN')) not null,
  code text unique,
  status text default 'OPEN',
  finalized_by text,
  finalized_at timestamptz,
  created_at timestamptz default now()
);

-- Table: sheet_items
create table if not exists public.sheet_items (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references public.sheets(id) on delete cascade,
  product_id uuid references public.products(id),
  serial_id uuid references public.serials(id),
  qty_requested int default 0,
  qty_done int default 0,
  item_name text,
  notes text
);

-- Table: scans
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id),
  serial_id uuid references public.serials(id),
  direction text check (direction in ('OUT','IN')) not null,
  scanned_by text,
  location text,
  created_at timestamptz default now()
);

-- Indexes for fast lookup
create index if not exists idx_serials_barcode on public.serials(barcode);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_jobs_code on public.jobs(code);
create index if not exists idx_sheets_code on public.sheets(code);

-- Function: scan_direction
create or replace function public.scan_direction(
  p_job_code text,
  p_serial_or_barcode text,
  p_direction text,
  p_scanned_by text default null,
  p_location text default null
)
returns public.scans as $$
declare
  v_serial_id uuid;
  v_product_id uuid;
  v_job_id uuid;
  v_scan public.scans%rowtype;
begin
  -- Find serial by barcode or id
  select id, product_id into v_serial_id, v_product_id
  from public.serials
  where barcode = p_serial_or_barcode or id::text = p_serial_or_barcode
  limit 1;
  if v_serial_id is null then
    raise exception 'Serial not found for barcode/id: %', p_serial_or_barcode;
  end if;

  -- Find job by code
  select id into v_job_id from public.jobs where code = p_job_code limit 1;
  if v_job_id is null then
    raise exception 'Job not found for code: %', p_job_code;
  end if;

  -- Insert scan
  insert into public.scans (job_id, serial_id, direction, scanned_by, location)
    values (v_job_id, v_serial_id, upper(p_direction), p_scanned_by, p_location)
    returning * into v_scan;

  -- Update serial status
  if upper(p_direction) = 'OUT' then
    update public.serials set status = 'out' where id = v_serial_id;
  elsif upper(p_direction) = 'IN' then
    update public.serials set status = 'in_stock' where id = v_serial_id;
  end if;

  return v_scan;
end;
$$ language plpgsql security definer;

-- Enable RLS and policies

-- serials
alter table public.serials enable row level security;
-- Allow select to anon and authenticated (read-only)
create policy if not exists allow_select_anon_serials on public.serials
  for select to public using (true);
create policy if not exists allow_select_authenticated_serials on public.serials
  for select to authenticated using (true);

-- scans
alter table public.scans enable row level security;
create policy if not exists allow_select_anon_scans on public.scans
  for select to public using (true);
create policy if not exists allow_select_authenticated_scans on public.scans
  for select to authenticated using (true);

-- sheets
alter table public.sheets enable row level security;
create policy if not exists allow_select_anon_sheets on public.sheets
  for select to public using (true);
create policy if not exists allow_select_authenticated_sheets on public.sheets
  for select to authenticated using (true);

-- sheet_items
alter table public.sheet_items enable row level security;
create policy if not exists allow_select_anon_sheet_items on public.sheet_items
  for select to public using (true);
create policy if not exists allow_select_authenticated_sheet_items on public.sheet_items
  for select to authenticated using (true);

-- Note: No insert/update/delete policies are created for anon/authenticated roles.
-- Mutations should be performed via the service_role key or secure RPC functions.
