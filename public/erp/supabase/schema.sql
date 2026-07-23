-- ============================================================
--  ERP Construcción — Supabase schema
--  Run this once in your Supabase project: SQL Editor -> New query -> paste -> Run
-- ============================================================

-- Single document-style table: every ERP record is one row keyed by
-- (collection, id), with the full record stored as JSONB. This mirrors the
-- app's data model exactly and scales comfortably to 50-80 concurrent users.
create table if not exists public.erp_records (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (collection, id)
);

-- Helps the initial full load and per-collection queries.
create index if not exists erp_records_collection_idx on public.erp_records (collection);

-- Broadcast row changes so every connected browser stays in sync in real time.
alter publication supabase_realtime add table public.erp_records;

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.erp_records enable row level security;

-- -------- OPTION A (default): authenticated company users --------
-- Recommended. Requires each user to sign in via Supabase Auth. Only logged-in
-- users can read/write. Pair with Supabase Auth in the app (next phase).
create policy "erp_authenticated_all"
  on public.erp_records
  for all
  to authenticated
  using (true)
  with check (true);

-- -------- OPTION B: quick internal pilot (anon key) --------
-- Lets anyone holding the anon key read/write WITHOUT logging in. Convenient for
-- a fast internal pilot, but the data is effectively public to anyone with the
-- URL. Only use behind a private/VPN deployment, and switch to Option A for real
-- use. To enable it, comment out the policy above and uncomment this one:
--
-- create policy "erp_anon_all"
--   on public.erp_records
--   for all
--   to anon
--   using (true)
--   with check (true);
