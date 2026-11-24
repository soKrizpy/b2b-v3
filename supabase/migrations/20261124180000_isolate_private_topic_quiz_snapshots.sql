create table if not exists public.topic_quiz_attempt_snapshots (
  attempt_id integer primary key
    references public.topic_quiz_attempts(id) on delete cascade,
  quiz_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.topic_quiz_attempt_snapshots enable row level security;

drop policy if exists topic_quiz_attempt_snapshots_service_role_all
  on public.topic_quiz_attempt_snapshots;

create policy topic_quiz_attempt_snapshots_service_role_all
  on public.topic_quiz_attempt_snapshots
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.topic_quiz_attempt_snapshots from anon, authenticated;
grant all on table public.topic_quiz_attempt_snapshots to service_role;

create or replace function public.save_topic_quiz_attempt_with_snapshot(
  p_student_id uuid,
  p_topic_id integer,
  p_attempt_num smallint,
  p_score integer,
  p_answers jsonb,
  p_quiz_version integer,
  p_quiz_snapshot jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attempt_id integer;
begin
  insert into public.topic_quiz_attempts (
    student_id, topic_id, attempt_num, score, answers, quiz_version
  ) values (
    p_student_id, p_topic_id, p_attempt_num, p_score, p_answers, p_quiz_version
  )
  returning id into v_attempt_id;

  insert into public.topic_quiz_attempt_snapshots (attempt_id, quiz_snapshot)
  values (v_attempt_id, p_quiz_snapshot);

  return v_attempt_id;
end;
$$;

revoke all on function public.save_topic_quiz_attempt_with_snapshot(
  uuid, integer, smallint, integer, jsonb, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.save_topic_quiz_attempt_with_snapshot(
  uuid, integer, smallint, integer, jsonb, integer, jsonb
) to service_role;

alter table public.topic_quiz_attempts
  drop column if exists quiz_snapshot;

comment on table public.topic_quiz_attempt_snapshots is
  'Server-only immutable quiz content snapshots; correct answer keys are never exposed by the student-readable attempts table.';
