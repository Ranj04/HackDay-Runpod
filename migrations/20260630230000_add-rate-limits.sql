-- Phase 2 (security): per-user rate limiting for the expensive server actions.
-- A fixed-window token bucket, atomic under concurrency (single upsert), and
-- serverless-safe (state lives in Postgres, not a per-instance Map).

create table if not exists public.rate_limits (
  bucket_key   text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket_key, window_start)
);

-- Service-role only: RLS on with no policies denies anon/authenticated entirely.
-- The limiter is called with the service key from server actions.
alter table public.rate_limits enable row level security;

-- Atomically bump the counter for the caller's current window and report whether
-- they are still under the limit. SECURITY DEFINER so the RPC can write the table
-- regardless of the caller's role.
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
begin
  insert into public.rate_limits (bucket_key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  -- Opportunistic cleanup so the table can't grow without bound.
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => p_window_seconds * 3);

  return v_count <= p_max;
end;
$$;
