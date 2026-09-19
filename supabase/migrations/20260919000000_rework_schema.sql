-- CallNGo Rework Migration: Emergency Profile & Pre-Printed QR Sticker Activation Support

-- 1. Update profiles table with emergency & medical info + phone number
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists emergency_contact text;
alter table public.profiles add column if not exists blood_group text;
alter table public.profiles add column if not exists health_issues text;
alter table public.profiles add column if not exists medications text;
alter table public.profiles add column if not exists allergies text;

-- 2. Update cars table to allow unassigned/unclaimed pre-printed QR stickers
alter table public.cars alter column owner_id drop not null;
alter table public.cars alter column nickname drop not null;
alter table public.cars add column if not exists model_number text;
alter table public.cars add column if not exists activated_at timestamptz;

-- 3. RLS policies for claiming unclaimed cars
drop policy if exists "Users can claim unclaimed cars" on public.cars;
create policy "Users can claim unclaimed cars"
  on public.cars for update
  to authenticated
  using (owner_id is null or auth.uid() = owner_id);

-- 4. Trigger helper to handle full_name and phone_number on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_number'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone_number = coalesce(excluded.phone_number, public.profiles.phone_number);
  return new;
end;
$$ language plpgsql security definer;
