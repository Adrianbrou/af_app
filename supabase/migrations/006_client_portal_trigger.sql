-- AF_APP — Migration 006: Auto-link client accounts
-- Run AFTER 005_client_portal.sql
-- When a user signs up / gets invited, if their email matches a client record,
-- automatically set role='client' and link their profile to that client.

-- ============================================================
-- 1. AUTO-LINK FUNCTION
-- ============================================================
create or replace function public.auto_link_client_profile()
returns trigger as $$
declare
  matched_client_id uuid;
  user_email text;
begin
  -- Get the email for this user
  select email into user_email from auth.users where id = new.id;

  -- Check if there is a client with this email
  select id into matched_client_id
    from public.clients
    where lower(email) = lower(user_email)
    limit 1;

  -- If matched, make this profile a client
  if matched_client_id is not null then
    new.role      := 'client';
    new.client_id := matched_client_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 2. TRIGGER on profiles INSERT
-- ============================================================
drop trigger if exists on_profile_created_link_client on public.profiles;

create trigger on_profile_created_link_client
  before insert on public.profiles
  for each row execute function public.auto_link_client_profile();

-- ============================================================
-- 3. BACKFILL — fix existing client accounts that are missing the link
-- ============================================================
update public.profiles p
set
  role      = 'client',
  client_id = c.id
from public.clients c
join auth.users u on lower(u.email) = lower(c.email)
where p.id = u.id
  and (p.role != 'client' or p.client_id is null)
  and p.role not in ('admin', 'super_admin');
