-- Call Audit Logs & IP Tracking Migration
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references public.cars(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  caller_phone text,
  caller_ip text,
  reason text,
  call_sid text,
  status text,
  is_spam boolean default false,
  reported_at timestamptz,
  created_at timestamptz default now()
);

-- Index for speedy querying by car_id, caller_ip, or spam tracking
create index if not exists idx_call_logs_car_id on public.call_logs(car_id);
create index if not exists idx_call_logs_caller_ip on public.call_logs(caller_ip);
create index if not exists idx_call_logs_created_at on public.call_logs(created_at desc);
create index if not exists idx_call_logs_is_spam on public.call_logs(is_spam);

-- Automated 30-Day IP Blocks Table
create table if not exists public.blocked_ips (
  ip text primary key,
  reason text default '4 or more spam reports within 30 days',
  spam_count integer default 4,
  blocked_until timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_blocked_ips_until on public.blocked_ips(blocked_until);

-- RLS: Service role can read/write; users can view call logs for their own cars
alter table public.call_logs enable row level security;
alter table public.blocked_ips enable row level security;

drop policy if exists "Owners can view calls to their cars" on public.call_logs;
create policy "Owners can view calls to their cars"
  on public.call_logs for select
  using (auth.uid() = owner_id);
