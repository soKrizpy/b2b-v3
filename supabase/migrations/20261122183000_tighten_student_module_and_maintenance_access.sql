-- Remove duplicate SELECT policy path and restrict maintenance execution.
drop policy if exists student_modules_admin_manage on public.student_modules;

create policy student_modules_admin_insert
on public.student_modules
for insert
to authenticated
with check (private.is_admin_actor());

create policy student_modules_admin_update
on public.student_modules
for update
to authenticated
using (private.is_admin_actor())
with check (private.is_admin_actor());

create policy student_modules_admin_delete
on public.student_modules
for delete
to authenticated
using (private.is_admin_actor());

-- Maintenance function is not used by application code. Keep it server-only.
create or replace function public.delete_expired_learning_logs()
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  delete from public.session_attendances
  where created_at < pg_catalog.now() - interval '1 year';
end;
$function$;

revoke all on function public.delete_expired_learning_logs() from public, anon, authenticated;
grant execute on function public.delete_expired_learning_logs() to service_role;

-- Trigger function resolves all application objects explicitly.
create or replace function public.enforce_meeting_series_single_module()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.series_id is not null
     and new.module_id is not null
     and exists (
       select 1
       from public.meetings existing
       where existing.series_id = new.series_id
         and existing.id is distinct from new.id
         and existing.module_id is not null
         and existing.module_id is distinct from new.module_id
     ) then
    raise exception 'All assigned meetings in a series must belong to the same module'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
