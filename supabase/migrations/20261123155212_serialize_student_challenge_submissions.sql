create unique index if not exists challenge_submissions_one_pending_per_student_challenge
  on public.challenge_submissions(student_id,challenge_id)
  where status='pending';

create or replace function private.submit_student_challenge(
  p_topic_id bigint,
  p_submission_url text,
  p_submission_note text default null
)
returns public.challenge_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_challenge_id integer;
  v_previous_status text;
  v_result public.challenge_submissions;
begin
  if v_student_id is null or not exists (
    select 1 from public.profiles p where p.id=v_student_id and p.role='student'
  ) then
    raise exception 'Student session required' using errcode='42501';
  end if;
  if p_submission_url is null or length(p_submission_url)>2048 or p_submission_url !~ '^https?://' then
    raise exception 'A valid project URL is required' using errcode='22023';
  end if;
  if length(coalesce(p_submission_note,''))>3000 then
    raise exception 'Submission note is too long' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.topics t
    join public.student_modules sm on sm.module_id=t.module_id
    where t.id=p_topic_id and t.status='published'
      and sm.student_id=v_student_id and sm.status='active'
  ) then
    raise exception 'Topic is not assigned to this student' using errcode='42501';
  end if;

  select c.id into v_challenge_id
  from public.challenges c
  where c.topic_id=p_topic_id
  order by c.order_index,c.id
  limit 1;
  if v_challenge_id is null then
    raise exception 'No project challenge is configured for this topic' using errcode='P0002';
  end if;

  -- Serialize submissions for one student/challenge pair before checking its latest review state.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bits2bytes:challenge:'||v_student_id::text||':'||v_challenge_id::text,0)
  );

  select s.status into v_previous_status
  from public.challenge_submissions s
  where s.student_id=v_student_id and s.challenge_id=v_challenge_id
  order by s.submitted_at desc,s.id desc
  limit 1;
  if v_previous_status in ('pending','approved') then
    raise exception 'This project is already submitted or approved' using errcode='55000';
  end if;

  insert into public.challenge_submissions(challenge_id,student_id,submission_url,submission_note)
  values(v_challenge_id,v_student_id,p_submission_url,nullif(p_submission_note,''))
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function private.submit_student_challenge(bigint,text,text) from public,anon,authenticated;
grant execute on function private.submit_student_challenge(bigint,text,text) to authenticated;

comment on index public.challenge_submissions_one_pending_per_student_challenge is
  'Prevents concurrent requests from creating multiple pending submissions for the same student and challenge.';
