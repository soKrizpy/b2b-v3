create or replace function private.validate_tutor_student_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = new.tutor_id;
  if v_role is distinct from 'teacher' then
    raise exception 'Tutor assignment requires a teacher profile';
  end if;
  if not exists (
    select 1 from public.profiles p
    join public.students s on s.id = p.id
    where p.id = new.student_id and p.role = 'student'
  ) then
    raise exception 'Tutor assignment requires a student profile';
  end if;
  if new.status = 'active' then
    new.ended_at := null;
  elsif new.ended_at is null then
    new.ended_at := now();
  end if;
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;
