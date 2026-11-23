create or replace function private.stamp_meeting_attendance_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_completion_status text;
begin
  if new.attendance_status is distinct from old.attendance_status
     or new.has_joined is distinct from old.has_joined then
    -- Lock the parent meeting so attendance edits serialize with session completion.
    select m.completion_status
      into v_completion_status
      from public.meetings m
     where m.id = old.meeting_id
     for update;

    if v_completion_status in ('selesai','terlewat','cancelled','soft_deleted') then
      raise exception 'Attendance is locked after the meeting has been finalized'
        using errcode = '55000';
    end if;

    if auth.uid() is not null then
      new.attendance_recorded_by := auth.uid();
      new.attendance_recorded_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_meeting_attendance_actor() from public,anon,authenticated;

comment on function private.stamp_meeting_attendance_actor() is
  'Stamps attendance actor/time and serializes attendance changes against meeting completion; finalized sessions are immutable.';
