-- AF_APP — Migration 005: Client Portal
-- Run this in Supabase SQL Editor AFTER 004_admin.sql

-- ============================================================
-- 1. LINK PROFILE TO CLIENT RECORD
-- ============================================================
alter table public.profiles
  add column if not exists client_id uuid references public.clients(id) on delete set null;

-- Update role check to include 'client'
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('trainer', 'admin', 'super_admin', 'client'));

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================
create or replace function public.is_client()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'client'
  );
$$ language sql security definer stable;

create or replace function public.my_client_id()
returns uuid as $$
  select client_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- 3. UPDATE RLS — clients see only their own data
-- ============================================================

-- clients: client can view their own record
drop policy if exists "Trainers can view their own clients" on public.clients;
create policy "Trainers can view their own clients"
  on public.clients for select
  using (auth.uid() = trainer_id or is_admin() or id = my_client_id());

-- workout_entries: client can view + insert their own
drop policy if exists "Trainers can view their clients workout entries" on public.workout_entries;
create policy "Trainers can view their clients workout entries"
  on public.workout_entries for select
  using (auth.uid() = trainer_id or is_admin() or client_id = my_client_id());

create policy "Clients can insert their own workout entries"
  on public.workout_entries for insert
  with check (client_id = my_client_id() and is_client());

create policy "Clients can delete their own workout entries"
  on public.workout_entries for delete
  using (client_id = my_client_id() and is_client());

-- body_measurements: client can view their own
drop policy if exists "Trainers can view their clients measurements" on public.body_measurements;
create policy "Trainers can view their clients measurements"
  on public.body_measurements for select
  using (auth.uid() = trainer_id or is_admin() or client_id = my_client_id());

-- client_goals: client can view their own
drop policy if exists "Trainers can view their clients goals" on public.client_goals;
create policy "Trainers can view their clients goals"
  on public.client_goals for select
  using (auth.uid() = trainer_id or is_admin() or client_id = my_client_id());

-- client_checkins: client can view their own
drop policy if exists "Trainers can view their clients checkins" on public.client_checkins;
create policy "Trainers can view their clients checkins"
  on public.client_checkins for select
  using (auth.uid() = trainer_id or is_admin() or client_id = my_client_id());

-- profiles: clients can view their own profile
drop policy if exists "View profiles" on public.profiles;
create policy "View profiles"
  on public.profiles for select
  using (auth.uid() = id or is_admin());

-- ============================================================
-- 4. PR NOTIFICATIONS TABLE (trainer inbox)
-- ============================================================
create table if not exists public.pr_notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  client_name text not null,
  exercise text not null,
  new_weight numeric not null,
  logged_at timestamptz default now() not null,
  read boolean default false not null
);

alter table public.pr_notifications enable row level security;

create policy "Trainers see their own PR notifications"
  on public.pr_notifications for select
  using (auth.uid() = trainer_id);

create policy "Anyone can insert PR notifications"
  on public.pr_notifications for insert
  with check (true);

create policy "Trainers can update their notifications"
  on public.pr_notifications for update
  using (auth.uid() = trainer_id);
