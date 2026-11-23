-- Serialize administrator deactivation across Edge Function instances.
-- The lease is longer than the Edge Function execution limit; abandoned leases
-- self-expire so a crashed request cannot permanently block administrator changes.
create table private.admin_deactivation_lock (
  lock_name text primary key check (lock_name = 'global'),
  lock_token uuid not null,
  expires_at timestamptz not null
);

revoke all on table private.admin_deactivation_lock from public, anon, authenticated, service_role;

create or replace function private.acquire_admin_deactivation_lock(p_lock_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acquired boolean := false;
begin
  insert into private.admin_deactivation_lock (lock_name, lock_token, expires_at)
  values ('global', p_lock_token, clock_timestamp() + interval '5 minutes')
  on conflict (lock_name) do update
    set lock_token = excluded.lock_token,
        expires_at = excluded.expires_at
    where private.admin_deactivation_lock.expires_at <= clock_timestamp()
  returning true into v_acquired;

  return coalesce(v_acquired, false);
end;
$$;

create or replace function private.release_admin_deactivation_lock(p_lock_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer := 0;
begin
  delete from private.admin_deactivation_lock
  where lock_name = 'global' and lock_token = p_lock_token;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

grant usage on schema private to service_role;
revoke all on function private.acquire_admin_deactivation_lock(uuid) from public, anon, authenticated;
revoke all on function private.release_admin_deactivation_lock(uuid) from public, anon, authenticated;
grant execute on function private.acquire_admin_deactivation_lock(uuid) to service_role;
grant execute on function private.release_admin_deactivation_lock(uuid) to service_role;

create or replace function public.acquire_admin_deactivation_lock(p_lock_token uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.acquire_admin_deactivation_lock(p_lock_token); $$;

create or replace function public.release_admin_deactivation_lock(p_lock_token uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.release_admin_deactivation_lock(p_lock_token); $$;

revoke all on function public.acquire_admin_deactivation_lock(uuid) from public, anon, authenticated;
revoke all on function public.release_admin_deactivation_lock(uuid) from public, anon, authenticated;
grant execute on function public.acquire_admin_deactivation_lock(uuid) to service_role;
grant execute on function public.release_admin_deactivation_lock(uuid) to service_role;
