-- Attendance audit fields are trigger-owned; authenticated clients may change attendance only.
revoke update (attendance_recorded_by, attendance_recorded_at)
  on public.meeting_students from authenticated;

comment on column public.meeting_students.attendance_recorded_by is
  'Set only by the attendance audit trigger from auth.uid(); authenticated clients cannot write this column.';
comment on column public.meeting_students.attendance_recorded_at is
  'Set only by the attendance audit trigger; authenticated clients cannot write this column.';
