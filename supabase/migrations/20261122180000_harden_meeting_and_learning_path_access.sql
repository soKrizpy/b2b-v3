-- Harden meeting, attendance, and learning-path access.
-- Authorization is derived only from auth.uid() + profiles.role.
-- No user rows or authentication identities are modified.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin_actor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function private.is_student_actor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  );
$;

create or replace function private.is_teacher_actor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  );
$;

create or replace function private.can_manage_meeting(p_meeting_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.meetings m
    join public.profiles p on p.id = auth.uid()
    where m.id = p_meeting_id
      and (
        p.role = 'admin'
        or (p.role = 'teacher' and m.teacher_id = auth.uid())
      )
  );
$$;

create or replace function private.can_access_meeting(p_meeting_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.meetings m
    join public.profiles p on p.id = auth.uid()
    where m.id = p_meeting_id
      and (
        p.role = 'admin'
        or (p.role = 'teacher' and m.teacher_id = auth.uid())
        or (
          p.role = 'student'
          and exists (
            select 1
            from public.meeting_students ms
            where ms.meeting_id = m.id
              and ms.student_id = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function private.is_admin_actor() from public, anon;
revoke all on function private.is_student_actor() from public, anon;
revoke all on function private.is_teacher_actor() from public, anon;
revoke all on function private.can_manage_meeting(bigint) from public, anon;
revoke all on function private.can_access_meeting(bigint) from public, anon;
grant execute on function private.is_admin_actor() to authenticated;
grant execute on function private.is_student_actor() to authenticated;
grant execute on function private.is_teacher_actor() to authenticated;
grant execute on function private.can_manage_meeting(bigint) to authenticated;
grant execute on function private.can_access_meeting(bigint) to authenticated;

-- Remove permissive PUBLIC policies, including the old unrestricted ALL policies.
drop policy if exists "Enable all for authenticated admin" on public.meetings;
drop policy if exists "Enable read access for all users" on public.meetings;
drop policy if exists "meetings_teacher_select_own" on public.meetings;

create policy meetings_select_authorized
on public.meetings
for select
to authenticated
using (private.can_access_meeting(id));

create policy meetings_insert_admin_or_owner_teacher
on public.meetings
for insert
to authenticated
with check (
  private.is_admin_actor()
  or (private.is_teacher_actor() and teacher_id = (select auth.uid()))
);

create policy meetings_update_admin_or_owner_teacher
on public.meetings
for update
to authenticated
using (private.can_manage_meeting(id))
with check (private.can_manage_meeting(id));

create policy meetings_delete_admin_or_owner_teacher
on public.meetings
for delete
to authenticated
using (private.can_manage_meeting(id));

drop policy if exists "Enable all for authenticated admin" on public.meeting_students;
drop policy if exists "Enable read access for involved students" on public.meeting_students;

create policy meeting_students_select_authorized
on public.meeting_students
for select
to authenticated
using (
  (student_id = (select auth.uid()) and private.is_student_actor())
  or private.can_manage_meeting(meeting_id)
);

create policy meeting_students_insert_admin_or_owner_teacher
on public.meeting_students
for insert
to authenticated
with check (private.can_manage_meeting(meeting_id));

create policy meeting_students_update_admin_or_owner_teacher
on public.meeting_students
for update
to authenticated
using (private.can_manage_meeting(meeting_id))
with check (private.can_manage_meeting(meeting_id));

create policy meeting_students_delete_admin_or_owner_teacher
on public.meeting_students
for delete
to authenticated
using (private.can_manage_meeting(meeting_id));

drop policy if exists "Enable delete for authenticated users only" on public.student_modules;
drop policy if exists "Enable insert for authenticated users only" on public.student_modules;
drop policy if exists "Students can view their own modules" on public.student_modules;

create policy student_modules_select_self_or_admin
on public.student_modules
for select
to authenticated
using (
  (student_id = (select auth.uid()) and private.is_student_actor())
  or private.is_admin_actor()
);

create policy student_modules_admin_manage
on public.student_modules
for all
to authenticated
using (private.is_admin_actor())
with check (private.is_admin_actor());

-- Remove direct anonymous access. Authenticated access is still constrained by RLS.
revoke all privileges on table public.meetings from anon, authenticated;
revoke all privileges on table public.meeting_students from anon, authenticated;
revoke all privileges on table public.student_modules from anon, authenticated;

-- Restore only row-level operations; TRUNCATE, TRIGGER, REFERENCES, and MAINTAIN
-- remain unavailable to browser-facing roles.
grant select, insert, update, delete on table public.meetings to authenticated;
grant select, insert, update, delete on table public.meeting_students to authenticated;
grant select, insert, update, delete on table public.student_modules to authenticated;

-- This function changes another student's learning-path state. It is now an
-- invoker function and is callable only by trusted server-side service_role.
create or replace function public.activate_learning_path(
  p_student_id uuid,
  p_module_id integer
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  update public.student_modules
  set status = 'paused'
  where student_id = p_student_id
    and module_id <> p_module_id;

  update public.student_modules
  set status = 'active'
  where student_id = p_student_id
    and module_id = p_module_id;
end;
$function$;

revoke all on function public.activate_learning_path(uuid, integer) from public, anon, authenticated;
grant execute on function public.activate_learning_path(uuid, integer) to service_role;

comment on function private.can_access_meeting(bigint) is
  'RLS helper: permits admin, assigned teacher, or linked student to read a meeting.';
comment on function private.can_manage_meeting(bigint) is
  'RLS helper: permits admin or the meeting owner teacher to manage a meeting.';
comment on function public.activate_learning_path(uuid, integer) is
  'Trusted server-side operation; service_role only.';
