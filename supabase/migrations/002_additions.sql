-- AF_APP — Migration 002: Goals, Check-ins, Templates, Extended Profiles
-- Run this in Supabase SQL Editor AFTER schema.sql

-- ============================================================
-- EXTEND CLIENTS TABLE
-- ============================================================
alter table public.clients add column if not exists date_of_birth date;
alter table public.clients add column if not exists training_level text; -- beginner | intermediate | advanced
alter table public.clients add column if not exists primary_goal text;   -- fat_loss | muscle_gain | performance | rehab | general
alter table public.clients add column if not exists start_date date;
alter table public.clients add column if not exists is_active boolean default true;

-- ============================================================
-- EXTEND WORKOUT ENTRIES — add RPE
-- ============================================================
alter table public.workout_entries add column if not exists rpe numeric(3,1) check (rpe >= 0 and rpe <= 10);

-- ============================================================
-- CLIENT GOALS
-- ============================================================
create table if not exists public.client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  goal_type text not null default 'custom', -- lift_pr | body_weight | body_fat | custom
  target_value numeric,
  target_unit text,       -- lb, %, kg, min, etc.
  baseline_value numeric, -- starting point
  deadline date,
  status text not null default 'active', -- active | achieved | missed | cancelled
  achieved_on date,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.client_goals enable row level security;

create policy "Trainers can view their clients goals"
  on public.client_goals for select using (auth.uid() = trainer_id);
create policy "Trainers can insert goals"
  on public.client_goals for insert with check (auth.uid() = trainer_id);
create policy "Trainers can update goals"
  on public.client_goals for update using (auth.uid() = trainer_id);
create policy "Trainers can delete goals"
  on public.client_goals for delete using (auth.uid() = trainer_id);

create index if not exists idx_client_goals_client_id on public.client_goals(client_id);

-- ============================================================
-- CLIENT CHECK-INS / SESSION NOTES
-- ============================================================
create table if not exists public.client_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  type text not null default 'general', -- session | general | nutrition | call
  body text not null,
  mood_score integer check (mood_score between 1 and 5),
  energy_score integer check (energy_score between 1 and 5),
  created_at timestamptz default now() not null
);

alter table public.client_checkins enable row level security;

create policy "Trainers can view their clients checkins"
  on public.client_checkins for select using (auth.uid() = trainer_id);
create policy "Trainers can insert checkins"
  on public.client_checkins for insert with check (auth.uid() = trainer_id);
create policy "Trainers can update checkins"
  on public.client_checkins for update using (auth.uid() = trainer_id);
create policy "Trainers can delete checkins"
  on public.client_checkins for delete using (auth.uid() = trainer_id);

create index if not exists idx_client_checkins_client_id on public.client_checkins(client_id);
create index if not exists idx_client_checkins_date on public.client_checkins(date desc);

-- ============================================================
-- WORKOUT TEMPLATES
-- ============================================================
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now() not null
);

alter table public.workout_templates enable row level security;

create policy "Trainers can view their own templates"
  on public.workout_templates for select using (auth.uid() = trainer_id);
create policy "Trainers can insert templates"
  on public.workout_templates for insert with check (auth.uid() = trainer_id);
create policy "Trainers can update templates"
  on public.workout_templates for update using (auth.uid() = trainer_id);
create policy "Trainers can delete templates"
  on public.workout_templates for delete using (auth.uid() = trainer_id);

-- ============================================================
-- TEMPLATE EXERCISES
-- ============================================================
create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.workout_templates(id) on delete cascade not null,
  trainer_id uuid references auth.users(id) on delete cascade not null,
  exercise text not null,
  muscle_group text not null,
  sets integer not null default 3,
  reps_target text not null default '10', -- "8-12" or "5"
  weight_target numeric,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.template_exercises enable row level security;

create policy "Trainers can view their template exercises"
  on public.template_exercises for select using (auth.uid() = trainer_id);
create policy "Trainers can insert template exercises"
  on public.template_exercises for insert with check (auth.uid() = trainer_id);
create policy "Trainers can update template exercises"
  on public.template_exercises for update using (auth.uid() = trainer_id);
create policy "Trainers can delete template exercises"
  on public.template_exercises for delete using (auth.uid() = trainer_id);

create index if not exists idx_template_exercises_template_id on public.template_exercises(template_id);

-- ============================================================
-- ACTIVITY SUMMARY VIEW (for dashboard)
-- ============================================================
create or replace view public.client_activity_summary as
select
  c.id as client_id,
  c.trainer_id,
  c.name,
  c.is_active,
  max(we.date) as last_session_date,
  count(distinct we.date) as total_sessions,
  count(we.id) as total_entries
from public.clients c
left join public.workout_entries we on we.client_id = c.id
group by c.id, c.trainer_id, c.name, c.is_active;
