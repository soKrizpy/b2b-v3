-- Backfill only current relationships supported by future active meetings.
-- Historical-only tutor/student pairs are intentionally not promoted to active assignments.
-- Preflight: 7 pairs, each with exactly one valid teacher/student profile pair.
insert into public.tutor_student_assignments (tutor_id, student_id, status, created_by)
select m.teacher_id, ms.student_id, 'active'::text, null::uuid
from public.meetings m
join public.meeting_students ms on ms.meeting_id = m.id
join public.profiles tutor on tutor.id = m.teacher_id and tutor.role = 'teacher'
join public.profiles student on student.id = ms.student_id and student.role = 'student'
join public.students student_record on student_record.id = student.id
where m.teacher_id is not null
  and m.meeting_date >= now()
  and m.deleted_at is null
  and coalesce(m.completion_status, 'scheduled') not in ('cancelled', 'soft_deleted')
group by m.teacher_id, ms.student_id
having count(*) > 0
on conflict (tutor_id, student_id) where status = 'active' do nothing;

comment on table public.tutor_student_assignments is
  'Explicit current tutor-student assignments. Initial active pairs were backfilled only from future non-cancelled meetings; historical-only pairs remain unassigned.';
