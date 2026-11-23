create or replace function private.set_student_mpin(
  p_student_id uuid,
  p_phone text,
  p_mpin text default null
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, extensions, private
as $$
declare
  v_digits text;
  v_phone text;
begin
  if p_student_id is null or p_phone is null then
    raise exception 'Student ID and WhatsApp are required' using errcode='22023';
  end if;
  if p_mpin is not null and p_mpin !~ '^[0-9]{6}$' then
    raise exception 'MPIN must contain exactly six digits' using errcode='22023';
  end if;

  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if length(v_digits) < 10 or length(v_digits) > 15 then
    raise exception 'WhatsApp number is invalid' using errcode='22023';
  end if;
  v_phone := case when left(v_digits,1)='0' then '62'||substr(v_digits,2) else v_digits end;

  if exists (
    select 1 from public.students s
    where s.id <> p_student_id
      and case
        when left(regexp_replace(coalesce(nullif(btrim(s.whatsapp),''),s.email_or_phone,''),'[^0-9]','','g'),1)='0'
          then '62'||substr(regexp_replace(coalesce(nullif(btrim(s.whatsapp),''),s.email_or_phone,''),'[^0-9]','','g'),2)
        else regexp_replace(coalesce(nullif(btrim(s.whatsapp),''),s.email_or_phone,''),'[^0-9]','','g')
      end = v_phone
  ) then
    raise exception 'WhatsApp number is already used by another student' using errcode='23505';
  end if;

  update public.students
  set whatsapp = v_phone,
      mpin = case when p_mpin is null then mpin else extensions.crypt(p_mpin,extensions.gen_salt('bf',12)) end
  where id = p_student_id
    and exists (select 1 from public.profiles p where p.id=p_student_id and p.role='student');

  if not found then
    raise exception 'Student profile not found' using errcode='P0002';
  end if;
end;
$$;

revoke all on function private.set_student_mpin(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.set_student_mpin(uuid,text,text) to service_role;
