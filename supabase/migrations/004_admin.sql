-- AF_APP — Migration 004: Admin Role System
-- Run this in Supabase SQL Editor AFTER 003_measurements_expanded.sql

-- ============================================================
-- 1. ADD ROLE TO PROFILES
-- ============================================================
alter table public.profiles
  add column if not exists role text not null default 'trainer'
  check (role in ('trainer', 'admin', 'super_admin'));

-- ============================================================
-- 2. HELPER FUNCTION — used in RLS (security definer avoids recursion)
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  );
$$ language sql security definer stable;

-- ============================================================
-- 3. UPDATE RLS — admins can see all data across all trainers
-- ============================================================

-- profiles
drop policy if exists "Trainers can view their own profile" on public.profiles;
create policy "View profiles"
  on public.profiles for select
  using (auth.uid() = id or is_admin());

drop policy if exists "Trainers can update their own profile" on public.profiles;
create policy "Update profiles"
  on public.profiles for update
  using (auth.uid() = id or is_admin());

-- clients
drop policy if exists "Trainers can view their own clients" on public.clients;
create policy "Trainers can view their own clients"
  on public.clients for select
  using (auth.uid() = trainer_id or is_admin());

-- workout_entries
drop policy if exists "Trainers can view their clients workout entries" on public.workout_entries;
create policy "Trainers can view their clients workout entries"
  on public.workout_entries for select
  using (auth.uid() = trainer_id or is_admin());

-- body_measurements
drop policy if exists "Trainers can view their clients measurements" on public.body_measurements;
create policy "Trainers can view their clients measurements"
  on public.body_measurements for select
  using (auth.uid() = trainer_id or is_admin());

-- client_goals
drop policy if exists "Trainers can view their clients goals" on public.client_goals;
create policy "Trainers can view their clients goals"
  on public.client_goals for select
  using (auth.uid() = trainer_id or is_admin());

-- client_checkins
drop policy if exists "Trainers can view their clients checkins" on public.client_checkins;
create policy "Trainers can view their clients checkins"
  on public.client_checkins for select
  using (auth.uid() = trainer_id or is_admin());

-- ============================================================
-- 4. TRANSFER CLIENT FUNCTION (atomic, security definer)
-- ============================================================
create or replace function public.transfer_client(p_client_id uuid, p_new_trainer_id uuid)
returns void as $$
begin
  if not is_admin() then
    raise exception 'Permission denied: admin role required';
  end if;
  update public.clients          set trainer_id = p_new_trainer_id where id         = p_client_id;
  update public.workout_entries  set trainer_id = p_new_trainer_id where client_id  = p_client_id;
  update public.body_measurements set trainer_id = p_new_trainer_id where client_id = p_client_id;
  update public.client_goals     set trainer_id = p_new_trainer_id where client_id  = p_client_id;
  update public.client_checkins  set trainer_id = p_new_trainer_id where client_id  = p_client_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. SET THE 3 ADMINS
-- ============================================================
update public.profiles set role = 'super_admin'
  where id = (select id from auth.users where email = 'adrian690@hotmail.fr');

update public.profiles set role = 'admin'
  where id in (
    select id from auth.users
    where email in ('clintbrevig1@aol.com', 'brkamp@gmail.com')
  );
