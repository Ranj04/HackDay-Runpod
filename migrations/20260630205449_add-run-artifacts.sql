alter table public.ghost_sessions
  add column if not exists report jsonb,
  add column if not exists clip_url text,
  add column if not exists clip_key text,
  add column if not exists keypoints_url text,
  add column if not exists keypoints_key text,
  add column if not exists report_url text,
  add column if not exists report_key text;

create index if not exists ghost_sessions_report_gin_idx
  on public.ghost_sessions using gin (report);

alter table storage.objects enable row level security;

drop policy if exists ghost_runs_owner_select on storage.objects;
create policy ghost_runs_owner_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket = 'ghost-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists ghost_runs_owner_insert on storage.objects;
create policy ghost_runs_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket = 'ghost-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists ghost_runs_owner_update on storage.objects;
create policy ghost_runs_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket = 'ghost-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'ghost-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists ghost_runs_owner_delete on storage.objects;
create policy ghost_runs_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket = 'ghost-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
