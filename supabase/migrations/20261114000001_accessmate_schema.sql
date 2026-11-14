-- ACCESSMATE AI — Supabase Postgres Schema & Row-Level Security (RLS)
-- Run this in the Supabase SQL Editor or via `supabase db query`

create extension if not exists "pgcrypto";

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text unique not null,
  password text,
  preferred_language text not null default 'English',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_auth_user_id on public.users (auth_user_id);

-- 2. DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  file_name text not null,
  mime_type text not null default 'text/plain',
  file_size integer not null default 0,
  extracted_text text not null,
  summary text not null,
  simplified_text text not null,
  key_takeaways jsonb not null default '[]'::jsonb,
  complex_terms jsonb not null default '[]'::jsonb,
  qa_history jsonb not null default '[]'::jsonb,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_user_created on public.documents (user_id, created_at desc);

-- 3. ACTIVITIES TABLE
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null,
  title text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_user_created on public.activities (user_id, created_at desc);

-- 4. ENABLE ROW-LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.documents enable row level security;
alter table public.activities enable row level security;

-- 5. RLS POLICIES (using `(select auth.uid())` per Supabase Postgres best practices)
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select
  to authenticated
  using ( (select auth.uid()) = auth_user_id or (select auth.uid())::text = id::text );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update
  to authenticated
  using ( (select auth.uid()) = auth_user_id or (select auth.uid())::text = id::text )
  with check ( (select auth.uid()) = auth_user_id or (select auth.uid())::text = id::text );

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select
  to authenticated
  using ( (select auth.uid())::text = user_id );

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert
  to authenticated
  with check ( (select auth.uid())::text = user_id );

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update
  to authenticated
  using ( (select auth.uid())::text = user_id )
  with check ( (select auth.uid())::text = user_id );

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete
  to authenticated
  using ( (select auth.uid())::text = user_id );

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities
  for select
  to authenticated
  using ( (select auth.uid())::text = user_id );

drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities
  for insert
  to authenticated
  with check ( (select auth.uid())::text = user_id );

-- 6. GRANT ACCESS FOR DATA API
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users, public.documents, public.activities to authenticated;
