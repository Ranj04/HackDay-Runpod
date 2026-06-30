create table if not exists public.ghost_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  score double precision not null check (score >= 0 and score <= 100),
  top_flaw_id text not null,
  top_flaw_label text not null,
  top_flaw_severity text not null check (
    top_flaw_severity in ('low', 'med', 'high')
  ),
  metrics jsonb not null,
  coaching jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ghost_sessions_user_created_idx
  on public.ghost_sessions (user_id, created_at desc);

alter table public.ghost_sessions enable row level security;

drop policy if exists "Players can insert their sessions"
  on public.ghost_sessions;
create policy "Players can insert their sessions"
  on public.ghost_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can read their sessions"
  on public.ghost_sessions;
create policy "Players can read their sessions"
  on public.ghost_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
