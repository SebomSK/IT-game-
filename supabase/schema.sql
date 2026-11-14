-- TicketQuest: admin-only login log. Run once in Supabase Dashboard -> SQL Editor.
-- Emails + (hashed) passwords live in Supabase Auth (auth.users). Passwords are NEVER readable.

create table if not exists public.login_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  ip          text,
  event       text not null check (event in ('signup','login')),
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- RLS ON + NO policies + no grants = browser (anon/authenticated keys) can read/write NOTHING.
-- Only you (Dashboard) and the Edge Function (service_role) can touch it.
alter table public.login_events enable row level security;
revoke all on public.login_events from anon, authenticated;

create index if not exists login_events_user_idx on public.login_events (user_id, created_at desc);

-- GDPR retention: wipe IPs older than 90 days (enable pg_cron under Database -> Extensions first).
-- select cron.schedule('purge-login-ips', '0 3 * * *',
--   $$ update public.login_events set ip = null, user_agent = null where created_at < now() - interval '90 days' $$);

-- Your admin view (run in SQL Editor):
-- select e.created_at, e.email, e.ip, e.event from public.login_events e order by e.created_at desc;
