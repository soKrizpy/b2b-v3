create or replace function private.list_tutor_assigned_students()
returns table(student_id uuid, full_name text, grade text, avatar_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.grade, s.avatar_id
  from public.tutor_student_assignments a
  join public.students s on s.id = a.student_id
  join public.profiles actor on actor.id = auth.uid() and actor.role = 'teacher'
  where a.tutor_id = auth.uid()
    and a.status = 'active'
  order by s.full_name nulls last, s.id;
$$;

revoke all on function private.list_tutor_assigned_students() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.list_tutor_assigned_students() to authenticated;

create or replace function public.list_tutor_assigned_students()
returns table(student_id uuid, full_name text, grade text, avatar_id text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_tutor_assigned_students();
$$;
revoke all on function public.list_tutor_assigned_students() from public, anon;
grant execute on function public.list_tutor_assigned_students() to authenticated;
