-- Submission persistence is now mediated by narrow, actor-derived RPCs.
revoke insert on public.challenge_submissions from authenticated;
drop policy if exists challenge_submissions_student_insert_own_active on public.challenge_submissions;

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

create or replace function private.get_student_challenge_submission(p_topic_id bigint)
returns setof public.challenge_submissions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_student_id uuid := auth.uid();
begin
  if v_student_id is null or not exists (
    select 1 from public.profiles p where p.id=v_student_id and p.role='student'
  ) then
    raise exception 'Student session required' using errcode='42501';
  end if;
  return query
  select s.*
  from public.challenge_submissions s
  join public.challenges c on c.id=s.challenge_id
  where s.student_id=v_student_id and c.topic_id=p_topic_id
  order by s.submitted_at desc,s.id desc
  limit 1;
end;
$$;

create or replace function private.list_tutor_pending_submissions()
returns table(
  submission_id integer,
  student_id uuid,
  student_name text,
  student_grade text,
  topic_id bigint,
  topic_title text,
  challenge_title text,
  submission_url text,
  submission_note text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.student_id, st.full_name, st.grade, t.id, t.title, c.title,
         s.submission_url, s.submission_note, s.submitted_at
  from public.challenge_submissions s
  join public.challenges c on c.id=s.challenge_id
  join public.topics t on t.id=c.topic_id
  join public.students st on st.id=s.student_id
  join public.tutor_student_assignments a
    on a.student_id=s.student_id and a.tutor_id=auth.uid() and a.status='active'
  join public.profiles actor on actor.id=auth.uid() and actor.role='teacher'
  where s.status='pending'
  order by s.submitted_at asc,s.id asc;
$$;

revoke all on function private.submit_student_challenge(bigint,text,text) from public,anon,authenticated;
revoke all on function private.get_student_challenge_submission(bigint) from public,anon,authenticated;
revoke all on function private.list_tutor_pending_submissions() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.submit_student_challenge(bigint,text,text) to authenticated;
grant execute on function private.get_student_challenge_submission(bigint) to authenticated;
grant execute on function private.list_tutor_pending_submissions() to authenticated;

create or replace function public.submit_student_challenge(p_topic_id bigint,p_submission_url text,p_submission_note text default null)
returns public.challenge_submissions
language sql
security invoker
set search_path = ''
as $$ select private.submit_student_challenge(p_topic_id,p_submission_url,p_submission_note); $$;

create or replace function public.get_student_challenge_submission(p_topic_id bigint)
returns setof public.challenge_submissions
language sql
security invoker
set search_path = ''
as $$ select * from private.get_student_challenge_submission(p_topic_id); $$;

create or replace function public.list_my_tutor_pending_submissions()
returns table(
  submission_id integer,
  student_id uuid,
  student_name text,
  student_grade text,
  topic_id bigint,
  topic_title text,
  challenge_title text,
  submission_url text,
  submission_note text,
  submitted_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$ select * from private.list_tutor_pending_submissions(); $$;

revoke all on function public.submit_student_challenge(bigint,text,text) from public,anon;
revoke all on function public.get_student_challenge_submission(bigint) from public,anon;
revoke all on function public.list_my_tutor_pending_submissions() from public,anon;
grant execute on function public.submit_student_challenge(bigint,text,text) to authenticated;
grant execute on function public.get_student_challenge_submission(bigint) to authenticated;
grant execute on function public.list_my_tutor_pending_submissions() to authenticated;

create policy challenge_submissions_admin_select
  on public.challenge_submissions for select to authenticated
  using (private.is_admin_actor());
create policy challenge_submissions_assigned_tutor_select
  on public.challenge_submissions for select to authenticated
  using (
    private.is_teacher_actor()
    and exists (
      select 1 from public.tutor_student_assignments a
      where a.student_id=challenge_submissions.student_id
        and a.tutor_id=(select auth.uid())
        and a.status='active'
    )
  );
