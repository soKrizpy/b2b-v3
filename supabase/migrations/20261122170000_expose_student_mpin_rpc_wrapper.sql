-- Expose a narrowly permissioned PostgREST RPC wrapper.
-- The implementation remains in the unexposed private schema.
create or replace function public.verify_student_mpin(p_phone text, p_mpin text)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $function$
  select private.verify_student_mpin(p_phone, p_mpin);
$function$;

revoke all on function public.verify_student_mpin(text, text) from public;
revoke all on function public.verify_student_mpin(text, text) from anon;
revoke all on function public.verify_student_mpin(text, text) from authenticated;
grant execute on function public.verify_student_mpin(text, text) to service_role;
