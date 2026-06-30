alter table public.ghost_sessions rename to echo_sessions;

alter index if exists ghost_sessions_user_created_idx rename to echo_sessions_user_created_idx;
alter index if exists ghost_sessions_report_gin_idx rename to echo_sessions_report_gin_idx;

drop policy if exists echo_runs_owner_select on storage.objects;
create policy echo_runs_owner_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket = 'echo-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists echo_runs_owner_insert on storage.objects;
create policy echo_runs_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket = 'echo-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists echo_runs_owner_update on storage.objects;
create policy echo_runs_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket = 'echo-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  )
  with check (
    bucket = 'echo-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );

drop policy if exists echo_runs_owner_delete on storage.objects;
create policy echo_runs_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket = 'echo-runs'
    and uploaded_by = (select auth.jwt() ->> 'sub')
  );
