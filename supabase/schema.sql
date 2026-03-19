-- AF_APP Workout Tracker — Supabase Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- PROFILES (trainer info, 1-to-1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Trainers can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Trainers can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profile is created on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.clients enable row level security;

create policy "Trainers can view their own clients"
  on public.clients for select
  using (auth.uid() = trainer_id);

create policy "Trainers can insert clients"
  on public.clients for insert
  with check (auth.uid() = trainer_id);

create policy "Trainers can update their own clients"
  on public.clients for update
  using (auth.uid() = trainer_id);

create policy "Trainers can delete their own clients"
  on public.clients for delete
  using (auth.uid() = trainer_id);


-- ============================================================
-- WORKOUT ENTRIES
-- ============================================================
create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  exercise text not null,
  muscle_group text not null,
  sets integer not null check (sets > 0),
  reps integer not null check (reps > 0),
  weight numeric(6, 2) not null check (weight >= 0),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.workout_entries enable row level security;

create policy "Trainers can view their clients workout entries"
  on public.workout_entries for select
  using (auth.uid() = trainer_id);

create policy "Trainers can insert workout entries"
  on public.workout_entries for insert
  with check (auth.uid() = trainer_id);

create policy "Trainers can update workout entries"
  on public.workout_entries for update
  using (auth.uid() = trainer_id);

create policy "Trainers can delete workout entries"
  on public.workout_entries for delete
  using (auth.uid() = trainer_id);


-- ============================================================
-- BODY MEASUREMENTS
-- ============================================================
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_lbs numeric(6, 2),
  body_fat_pct numeric(5, 2),
  chest_in numeric(5, 2),
  waist_in numeric(5, 2),
  hips_in numeric(5, 2),
  notes text,
  created_at timestamptz default now() not null
);

alter table public.body_measurements enable row level security;

create policy "Trainers can view their clients measurements"
  on public.body_measurements for select
  using (auth.uid() = trainer_id);

create policy "Trainers can insert measurements"
  on public.body_measurements for insert
  with check (auth.uid() = trainer_id);

create policy "Trainers can update measurements"
  on public.body_measurements for update
  using (auth.uid() = trainer_id);

create policy "Trainers can delete measurements"
  on public.body_measurements for delete
  using (auth.uid() = trainer_id);


-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_clients_trainer_id on public.clients(trainer_id);
create index if not exists idx_workout_entries_client_id on public.workout_entries(client_id);
create index if not exists idx_workout_entries_trainer_id on public.workout_entries(trainer_id);
create index if not exists idx_workout_entries_date on public.workout_entries(date desc);
create index if not exists idx_body_measurements_client_id on public.body_measurements(client_id);
create index if not exists idx_body_measurements_date on public.body_measurements(date desc);
