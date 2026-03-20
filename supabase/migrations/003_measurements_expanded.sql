-- AF_APP — Migration 003: Expanded Body Measurements
-- Run this in Supabase SQL Editor AFTER 002_additions.sql

alter table public.body_measurements add column if not exists neck_in      numeric(5,2);
alter table public.body_measurements add column if not exists shoulders_in numeric(5,2);
alter table public.body_measurements add column if not exists bicep_in     numeric(5,2);
alter table public.body_measurements add column if not exists forearm_in   numeric(5,2);
alter table public.body_measurements add column if not exists thigh_in     numeric(5,2);
alter table public.body_measurements add column if not exists calf_in      numeric(5,2);
