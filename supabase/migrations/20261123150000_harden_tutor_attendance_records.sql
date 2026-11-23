alter table public.meeting_students
  add column if not exists attendance_recorded_by uuid references auth.users(id) on delete set null,
  add column if not exists attendance_recorded_at timestamptz;

revoke update on public.meeting_students from authenticated;
grant update (attendance_status,attendance_recorded_by,attendance_recorded_at,has_joined)
  on public.meeting_students to authenticated;

create or replace function private.stamp_meeting_attendance_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    new.attendance_status is distinct from old.attendance_status
    or new.has_joined is distinct from old.has_joined
  ) then
    new.attendance_recorded_by := auth.uid();
    new.attendance_recorded_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_meeting_attendance_actor() from public,anon,authenticated;
drop trigger if exists meeting_students_stamp_attendance_actor on public.meeting_students;
create trigger meeting_students_stamp_attendance_actor
before update on public.meeting_students
for each row execute function private.stamp_meeting_attendance_actor();

comment on column public.meeting_students.attendance_recorded_at is 'Null means attendance has not yet been explicitly recorded; avoids treating the legacy default absen as a confirmed absence.';
