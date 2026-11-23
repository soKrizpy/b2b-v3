create or replace function private.require_attendance_before_meeting_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.completion_status = 'selesai'
     and old.completion_status is distinct from 'selesai' then
    if not exists (
      select 1
      from public.meeting_students ms
      where ms.meeting_id = new.id
    ) then
      raise exception 'A meeting cannot be completed without at least one linked student'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.meeting_students ms
      where ms.meeting_id = new.id
        and ms.attendance_recorded_at is null
    ) then
      raise exception 'Attendance must be explicitly recorded for every linked student before completing the meeting'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.require_attendance_before_meeting_completion() from public, anon, authenticated;

drop trigger if exists meetings_require_attendance_before_completion on public.meetings;
create trigger meetings_require_attendance_before_completion
before update of completion_status on public.meetings
for each row
execute function private.require_attendance_before_meeting_completion();

comment on function private.require_attendance_before_meeting_completion() is
  'Database invariant: a meeting can only be marked complete after attendance has been explicitly recorded for every linked student.';
