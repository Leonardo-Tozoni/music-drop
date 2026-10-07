-- Music Drop: band hub (auth, YouTube import, chords, events, attendance)
-- Run in Supabase SQL Editor after the original tracks/playlists/playlist_tracks tables exist.

-- ── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  instrument text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist
insert into public.profiles (id, name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ── Tracks: YouTube source, import status, chords ───────────
alter table public.tracks
  add column if not exists source text not null default 'upload' check (source in ('upload', 'youtube')),
  add column if not exists youtube_url text,
  add column if not exists status text not null default 'ready' check (status in ('pending', 'ready', 'error')),
  add column if not exists error_msg text,
  add column if not exists chords text not null default '';

-- Pending YouTube imports have no file yet
alter table public.tracks alter column file_path drop not null;

-- ── Events (shows + rehearsals) ─────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('show', 'ensaio')),
  title text not null,
  starts_at timestamptz not null,
  location text not null default '',
  notes text not null default '',
  setlist_id uuid references public.playlists (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);

-- ── Attendance votes ────────────────────────────────────────
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  status text not null check (status in ('vou', 'nao_vou', 'talvez')),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ── Row Level Security: only logged-in band members ─────────
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

-- Drop permissive anon policies from the single-user phase (and our own, so this file can be re-run)
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('tracks', 'playlists', 'playlist_tracks', 'profiles', 'events', 'attendance')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "members read profiles" on public.profiles
  for select to authenticated using (true);
create policy "members update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members manage tracks" on public.tracks
  for all to authenticated using (true) with check (true);
create policy "members manage playlists" on public.playlists
  for all to authenticated using (true) with check (true);
create policy "members manage playlist_tracks" on public.playlist_tracks
  for all to authenticated using (true) with check (true);
create policy "members manage events" on public.events
  for all to authenticated using (true) with check (true);

create policy "members read attendance" on public.attendance
  for select to authenticated using (true);
create policy "members insert own attendance" on public.attendance
  for insert to authenticated with check (user_id = auth.uid());
create policy "members update own attendance" on public.attendance
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members delete own attendance" on public.attendance
  for delete to authenticated using (user_id = auth.uid());

-- ── Storage: bucket `music` stays public for playback; writes need login ──
drop policy if exists "members upload music" on storage.objects;
drop policy if exists "members delete music" on storage.objects;
create policy "members upload music" on storage.objects
  for insert to authenticated with check (bucket_id = 'music');
create policy "members delete music" on storage.objects
  for delete to authenticated using (bucket_id = 'music');

-- ── Realtime ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['tracks', 'attendance'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
