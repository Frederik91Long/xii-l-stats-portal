-- Optional persistence foundation for future stats and admin panel.
create table if not exists public.sleeper_snapshots (
 id bigint generated always as identity primary key,
 league_id text not null,
 season text not null,
 week integer not null check (week between 1 and 18),
 payload jsonb not null,
 synced_at timestamptz not null default now(),
 unique(league_id,season,week)
);
create index if not exists sleeper_snapshots_season_idx on public.sleeper_snapshots(league_id,season,week);
alter table public.sleeper_snapshots enable row level security;
-- No public access. Server-side service role alone performs syncs.
create table if not exists public.franchise_profiles (
 id bigint generated always as identity primary key,
 league_id text not null,
 roster_id integer not null,
 season text not null,
 display_name text,
 city text,
 stadium text,
 logo_url text,
 primary_color text,
 updated_at timestamptz not null default now(),
 unique(league_id,season,roster_id)
);
alter table public.franchise_profiles enable row level security;
-- Admin policies intentionally not enabled until authentication and roles are implemented.
