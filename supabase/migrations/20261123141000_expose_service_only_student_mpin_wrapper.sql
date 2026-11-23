create or replace function public.admin_set_student_mpin(p_student_id uuid,p_phone text,p_mpin text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_student_mpin(p_student_id,p_phone,p_mpin);
$$;
revoke all on function public.admin_set_student_mpin(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_set_student_mpin(uuid,text,text) to service_role;
