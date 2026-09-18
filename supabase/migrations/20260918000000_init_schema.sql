-- CallNGo Full Schema & RLS Migration

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- 2. Create cars table with vehicle details, address, and emergency contact
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  nickname text not null,
  plate_number text,
  address text,
  emergency_contact text,
  created_at timestamptz default now()
);

-- Ensure columns exist if table already created
alter table public.cars add column if not exists plate_number text;
alter table public.cars add column if not exists address text;
alter table public.cars add column if not exists emergency_contact text;

-- 3. Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.push_subscriptions enable row level security;

--------------------------------------------------
-- RLS POLICIES FOR PROFILES
--------------------------------------------------
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

--------------------------------------------------
-- RLS POLICIES FOR CARS
--------------------------------------------------
-- Authenticated car owners can view, update, insert, and delete their own cars
create policy "Owners can view own cars"
  on public.cars for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own cars"
  on public.cars for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own cars"
  on public.cars for update
  using (auth.uid() = owner_id);

create policy "Owners can delete own cars"
  on public.cars for delete
  using (auth.uid() = owner_id);

-- Public policy:
-- Allows public read access to cars table (API endpoint ensures only nickname and id are exposed to callers)
create policy "Public can view car nickname by car id"
  on public.cars for select
  to anon, authenticated
  using (true);

--------------------------------------------------
-- RLS POLICIES FOR PUSH SUBSCRIPTIONS
--------------------------------------------------
-- Users can only manage their own push subscriptions
create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = owner_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = owner_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = owner_id);

--------------------------------------------------
-- TRIGGER FOR AUTOMATIC PROFILE CREATION ON SIGNUP
--------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
