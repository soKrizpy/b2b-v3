alter table public.student_lesson_progress
  add column if not exists max_slide_index integer not null default 0
    check (max_slide_index between 0 and 200);

update public.student_lesson_progress
set max_slide_index = greatest(max_slide_index, slide_index)
where max_slide_index < slide_index;

create table if not exists public.student_topic_stage_progress (
  student_id uuid not null references public.students(id) on delete cascade,
  topic_id bigint not null references public.topics(id) on delete cascade,
  stage_key text not null check (stage_key in ('brief','materials','practice','check','challenge','submission')),
  status text not null check (status in ('completed','skipped')),
  completed_at timestamptz not null default now(),
  primary key (student_id, topic_id, stage_key),
  check (status <> 'skipped' or stage_key in ('challenge','submission'))
);

alter table public.student_topic_stage_progress enable row level security;
drop policy if exists student_topic_stage_progress_select_self on public.student_topic_stage_progress;
create policy student_topic_stage_progress_select_self
  on public.student_topic_stage_progress
  for select to authenticated
  using (student_id = (select auth.uid()) and private.is_student_actor());
revoke all on table public.student_topic_stage_progress from anon, authenticated;
grant select on table public.student_topic_stage_progress to authenticated;
grant all on table public.student_topic_stage_progress to service_role;

drop policy if exists topics_select_published_for_authenticated on public.topics;
create policy topics_select_published_for_authenticated
  on public.topics
  for select to authenticated
  using (
    status='published'
    and exists (
      select 1 from public.modules mod
      where mod.id=topics.module_id and mod.is_active is true
    )
    and (
      not private.is_student_actor()
      or exists (
        select 1
        from public.student_modules sm
        join public.meetings m on m.module_id=sm.module_id and m.topic_id=topics.id
        join public.meeting_students ms on ms.meeting_id=m.id and ms.student_id=sm.student_id
        where sm.student_id=(select auth.uid())
          and sm.module_id=topics.module_id
          and sm.status='active'
          and m.meeting_date<=now()
          and m.deleted_at is null
          and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
      )
    )
  );

create or replace function private.is_student_topic_released(p_student_id uuid, p_topic_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.topics t
    join public.modules mod on mod.id=t.module_id and mod.is_active is true
    join public.student_modules sm
      on sm.module_id=t.module_id and sm.student_id=p_student_id and sm.status='active'
    join public.meetings m
      on m.module_id=t.module_id and m.topic_id=t.id
    join public.meeting_students ms
      on ms.meeting_id=m.id and ms.student_id=p_student_id
    where t.id=p_topic_id
      and t.status='published'
      and m.meeting_date <= now()
      and m.deleted_at is null
      and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
  );
$$;

create or replace function private.practice_checkpoints_valid(p_student_id uuid, p_topic_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_instructions text;
  v_expected_count integer;
  v_checkpoints jsonb;
  v_index integer;
begin
  select t.lesson_content #>> '{challenge,0,instructions}'
    into v_instructions
  from public.topics t
  where t.id=p_topic_id and t.status='published';
  if v_instructions is null then return false; end if;

  select count(*)::integer into v_expected_count
  from pg_catalog.regexp_split_to_table(v_instructions, E'\\n|[.!?][[:space:]]+') as parts(value)
  where pg_catalog.btrim(parts.value) <> '';
  if v_expected_count < 1 then return false; end if;

  select p.checkpoints into v_checkpoints
  from public.student_lesson_progress p
  where p.student_id=p_student_id and p.topic_id=p_topic_id
    and p.state='practice-completed';
  if not found or pg_catalog.jsonb_object_length(v_checkpoints) <> v_expected_count then
    return false;
  end if;

  for v_index in 1..v_expected_count loop
    if v_checkpoints ->> pg_catalog.format('topic-%s-checkpoint-%s',p_topic_id,v_index) is distinct from 'true' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function private.is_student_topic_complete(p_student_id uuid, p_topic_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_student_topic_released(p_student_id,p_topic_id)
    and private.practice_checkpoints_valid(p_student_id,p_topic_id)
    and exists (
      select 1 from public.topic_quiz_attempts q
      where q.student_id=p_student_id and q.topic_id=p_topic_id
    )
    and (
      select count(*)=6
        and count(*) filter (where
          (stage_key in ('brief','materials','practice','check') and status='completed')
          or (stage_key in ('challenge','submission') and status in ('completed','skipped'))
        )=6
      from public.student_topic_stage_progress s
      where s.student_id=p_student_id and s.topic_id=p_topic_id
    );
$$;

create or replace function public.list_my_released_topic_ids(p_module_id bigint)
returns table(topic_id bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct t.id
  from public.topics t
  join public.modules mod on mod.id=t.module_id and mod.is_active is true
  join public.student_modules sm
    on sm.module_id=t.module_id and sm.student_id=(select auth.uid()) and sm.status='active'
  join public.meetings m
    on m.module_id=t.module_id and m.topic_id=t.id
  join public.meeting_students ms
    on ms.meeting_id=m.id and ms.student_id=(select auth.uid())
  join public.profiles actor on actor.id=(select auth.uid()) and actor.role='student'
  where t.module_id=p_module_id
    and t.status='published'
    and m.meeting_date <= now()
    and m.deleted_at is null
    and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted');
$$;
revoke all on function public.list_my_released_topic_ids(bigint) from public,anon;
grant execute on function public.list_my_released_topic_ids(bigint) to authenticated;

create or replace function public.student_topic_is_released(p_student_id uuid,p_topic_id bigint)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_student_topic_released(p_student_id,p_topic_id); $$;
revoke all on function public.student_topic_is_released(uuid,bigint) from public,anon,authenticated;
grant execute on function public.student_topic_is_released(uuid,bigint) to service_role;

create or replace function public.student_module_topic_completion(p_student_id uuid,p_module_id bigint)
returns table(total_topics integer, completed_topics integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(t.id)::integer,
    count(t.id) filter (where private.is_student_topic_complete(p_student_id,t.id))::integer
  from public.topics t
  join public.modules mod on mod.id=t.module_id and mod.is_active is true
  join public.student_modules sm
    on sm.module_id=t.module_id and sm.student_id=p_student_id and sm.status='active'
  where t.module_id=p_module_id and t.status='published'
  having count(t.id)=16
    and count(t.order_index)=16
    and count(distinct t.order_index)=16;
$$;
revoke all on function public.student_module_topic_completion(uuid,bigint) from public,anon,authenticated;
grant execute on function public.student_module_topic_completion(uuid,bigint) to service_role;

create or replace function private.complete_student_topic_stage(
  p_topic_id bigint,
  p_stage_key text,
  p_status text default 'completed'
)
returns public.student_topic_stage_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_module_id bigint;
  v_stage_index integer;
  v_previous_stage text;
  v_slide_count integer;
  v_max_slide_index integer;
  v_saved public.student_topic_stage_progress;
begin
  if v_student_id is null or not private.is_student_actor() then
    raise exception 'Authenticated student session required' using errcode='42501';
  end if;
  if p_stage_key is null or p_status is null
     or p_stage_key not in ('brief','materials','practice','check','challenge','submission')
     or p_status not in ('completed','skipped')
     or (p_status='skipped' and p_stage_key not in ('challenge','submission')) then
    raise exception 'Invalid Topic stage completion' using errcode='22023';
  end if;

  select t.module_id into v_module_id
  from public.topics t
  join public.modules mod on mod.id=t.module_id and mod.is_active is true
  join public.student_modules sm
    on sm.module_id=t.module_id and sm.student_id=v_student_id and sm.status='active'
  where t.id=p_topic_id and t.status='published';
  if v_module_id is null or not private.is_student_topic_released(v_student_id,p_topic_id) then
    raise exception 'Topic is not released to this student' using errcode='42501';
  end if;

  v_stage_index := pg_catalog.array_position(
    array['brief','materials','practice','check','challenge','submission']::text[],
    p_stage_key
  );
  if v_stage_index > 1 then
    v_previous_stage := (array['brief','materials','practice','check','challenge','submission']::text[])[v_stage_index-1];
    if not exists (
      select 1 from public.student_topic_stage_progress s
      where s.student_id=v_student_id and s.topic_id=p_topic_id
        and s.stage_key=v_previous_stage
        and (s.status='completed' or (s.stage_key in ('challenge','submission') and s.status='skipped'))
    ) then
      raise exception 'Complete the previous Topic stage first' using errcode='55000';
    end if;
  end if;

  if p_stage_key='materials' and p_status='completed' then
    select pg_catalog.jsonb_array_length(coalesce(t.lesson_content->'learningPath','[]'::jsonb))
      into v_slide_count
    from public.topics t where t.id=p_topic_id;
    select p.max_slide_index into v_max_slide_index
    from public.student_lesson_progress p
    where p.student_id=v_student_id and p.topic_id=p_topic_id;
    if v_slide_count is null or v_slide_count < 1 or coalesce(v_max_slide_index,-1) < v_slide_count-1 then
      raise exception 'Complete all learning material slides first' using errcode='55000';
    end if;
  elsif p_stage_key='practice' and p_status='completed' then
    if not private.practice_checkpoints_valid(v_student_id,p_topic_id) then
      raise exception 'Complete every Practice checkpoint first' using errcode='55000';
    end if;
  elsif p_stage_key='check' and p_status='completed' then
    if not exists (
      select 1 from public.topic_quiz_attempts q
      where q.student_id=v_student_id and q.topic_id=p_topic_id
    ) then
      raise exception 'Submit the formative Topic Check first' using errcode='55000';
    end if;
  elsif p_stage_key='challenge' and p_status='completed' then
    if not exists (
      select 1 from public.challenge_submissions s
      join public.challenges c on c.id=s.challenge_id
      where s.student_id=v_student_id and c.topic_id=p_topic_id
    ) then
      raise exception 'Submit a Challenge project or mark the optional Challenge as skipped' using errcode='55000';
    end if;
  elsif p_stage_key='submission' and p_status='completed' then
    if not exists (
      select 1 from public.challenge_submissions s
      join public.challenges c on c.id=s.challenge_id
      where s.student_id=v_student_id and c.topic_id=p_topic_id
    ) then
      raise exception 'Submit a project or mark the optional Submission stage as skipped' using errcode='55000';
    end if;
  end if;

  insert into public.student_topic_stage_progress(student_id,topic_id,stage_key,status,completed_at)
  values(v_student_id,p_topic_id,p_stage_key,p_status,now())
  on conflict(student_id,topic_id,stage_key) do update
  set status=case
        when public.student_topic_stage_progress.status='completed' then 'completed'
        else excluded.status
      end,
      completed_at=case
        when public.student_topic_stage_progress.status='completed' then public.student_topic_stage_progress.completed_at
        else excluded.completed_at
      end
  returning * into v_saved;
  return v_saved;
end;
$$;

create or replace function public.complete_student_topic_stage(
  p_topic_id bigint,
  p_stage_key text,
  p_status text default 'completed'
)
returns public.student_topic_stage_progress
language sql
security invoker
set search_path = ''
as $$ select private.complete_student_topic_stage(p_topic_id,p_stage_key,p_status); $$;
revoke all on function private.complete_student_topic_stage(bigint,text,text) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.complete_student_topic_stage(bigint,text,text) to authenticated;
revoke all on function public.complete_student_topic_stage(bigint,text,text) from public,anon;
grant execute on function public.complete_student_topic_stage(bigint,text,text) to authenticated;

create or replace function public.get_my_topic_stage_progress(p_topic_id bigint)
returns table(stage_key text,status text,completed_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.stage_key,s.status,s.completed_at
  from public.student_topic_stage_progress s
  join public.profiles actor on actor.id=(select auth.uid()) and actor.role='student'
  where s.student_id=(select auth.uid()) and s.topic_id=p_topic_id;
$$;
revoke all on function public.get_my_topic_stage_progress(bigint) from public,anon;
grant execute on function public.get_my_topic_stage_progress(bigint) to authenticated;

create or replace function private.save_student_lesson_progress(
  p_topic_id bigint,
  p_state text,
  p_checkpoints jsonb default '{}'::jsonb,
  p_submission_draft jsonb default null::jsonb,
  p_slide_index integer default 0,
  p_expected_version integer default 0
)
returns public.student_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_max_slide_index integer := 0;
  v_slide_count integer;
  v_saved public.student_lesson_progress;
begin
  if v_student_id is null or not private.is_student_actor() then
    raise exception 'Authenticated student session required' using errcode='42501';
  end if;
  if p_state not in ('not-started','in-progress','practice-completed') then
    raise exception 'Invalid lesson progress state' using errcode='22023';
  end if;
  if p_slide_index is null or p_slide_index<0 or p_slide_index>200
     or p_expected_version is null or p_expected_version<0 then
    raise exception 'Invalid lesson progress position or version' using errcode='22023';
  end if;
  if p_checkpoints is null or pg_catalog.jsonb_typeof(p_checkpoints)<>'object'
     or pg_catalog.pg_column_size(p_checkpoints)>16384
     or exists(select 1 from pg_catalog.jsonb_each(p_checkpoints) e where pg_catalog.jsonb_typeof(e.value)<>'boolean') then
    raise exception 'Invalid checkpoint payload' using errcode='22023';
  end if;
  if p_submission_draft is not null and (
    pg_catalog.jsonb_typeof(p_submission_draft)<>'object'
    or pg_catalog.pg_column_size(p_submission_draft)>8192
    or (p_submission_draft ? 'link' and pg_catalog.jsonb_typeof(p_submission_draft->'link')<>'string')
    or (p_submission_draft ? 'notes' and pg_catalog.jsonb_typeof(p_submission_draft->'notes')<>'string')
    or pg_catalog.length(coalesce(p_submission_draft->>'link',''))>2048
    or pg_catalog.length(coalesce(p_submission_draft->>'notes',''))>4000
  ) then
    raise exception 'Invalid submission draft' using errcode='22023';
  end if;
  if not private.is_student_topic_released(v_student_id,p_topic_id) then
    raise exception 'Topic is not released to this student' using errcode='42501';
  end if;

  select case
      when pg_catalog.jsonb_typeof(t.lesson_content->'learningPath')='array'
        then pg_catalog.jsonb_array_length(t.lesson_content->'learningPath')
      else 0
    end
    into v_slide_count
  from public.topics t
  where t.id=p_topic_id and t.status='published';
  if v_slide_count is null or v_slide_count<1 or p_slide_index>=v_slide_count then
    raise exception 'Learning material slide index is outside the published Topic' using errcode='22023';
  end if;

  select p.max_slide_index into v_max_slide_index
  from public.student_lesson_progress p
  where p.student_id=v_student_id and p.topic_id=p_topic_id
  for update;
  if (found and p_slide_index > v_max_slide_index + 1) or (not found and p_slide_index > 0) then
    raise exception 'Learning material slides must be viewed in order' using errcode='55000';
  end if;
  if p_state='practice-completed' and not private.practice_checkpoints_valid_payload(p_topic_id,p_checkpoints) then
    raise exception 'Practice completion does not match the published checkpoints' using errcode='22023';
  end if;

  insert into public.student_lesson_progress(
    student_id,topic_id,state,checkpoints,submission_draft,slide_index,max_slide_index,version,updated_at
  )
  values(v_student_id,p_topic_id,p_state,p_checkpoints,p_submission_draft,p_slide_index,p_slide_index,1,now())
  on conflict(student_id,topic_id) do update
  set state=excluded.state,
      checkpoints=excluded.checkpoints,
      submission_draft=excluded.submission_draft,
      slide_index=excluded.slide_index,
      max_slide_index=greatest(public.student_lesson_progress.max_slide_index,excluded.slide_index),
      version=public.student_lesson_progress.version+1,
      updated_at=now()
  where public.student_lesson_progress.version=p_expected_version
  returning * into v_saved;
  if not found then
    raise exception 'Progress version conflict; reload before saving' using errcode='40001';
  end if;
  return v_saved;
end;
$$;

create or replace function private.practice_checkpoints_valid_payload(p_topic_id bigint,p_checkpoints jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_instructions text;
  v_expected_count integer;
  v_index integer;
begin
  select t.lesson_content #>> '{challenge,0,instructions}'
    into v_instructions
  from public.topics t where t.id=p_topic_id and t.status='published';
  if v_instructions is null then return false; end if;
  select count(*)::integer into v_expected_count
  from pg_catalog.regexp_split_to_table(v_instructions,E'\\n|[.!?][[:space:]]+') as parts(value)
  where pg_catalog.btrim(parts.value)<>'';
  if v_expected_count<1 or pg_catalog.jsonb_object_length(p_checkpoints)<>v_expected_count then return false; end if;
  for v_index in 1..v_expected_count loop
    if p_checkpoints ->> pg_catalog.format('topic-%s-checkpoint-%s',p_topic_id,v_index) is distinct from 'true' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function private.practice_checkpoints_valid_payload(bigint,jsonb) from public,anon,authenticated;
revoke all on function private.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) from public,anon,authenticated;
grant execute on function private.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) to authenticated;

create or replace function public.save_student_lesson_progress(
  p_topic_id bigint,
  p_state text,
  p_checkpoints jsonb default '{}'::jsonb,
  p_submission_draft jsonb default null::jsonb,
  p_slide_index integer default 0,
  p_expected_version integer default 0
)
returns public.student_lesson_progress
language sql
security invoker
set search_path = ''
as $$ select private.save_student_lesson_progress(p_topic_id,p_state,p_checkpoints,p_submission_draft,p_slide_index,p_expected_version); $$;
revoke all on function public.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) from public,anon;
grant execute on function public.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) to authenticated;

drop function if exists public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text);
drop function if exists private.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text);

create function private.create_recurring_meeting_series(
  p_student_id uuid,
  p_tutor_id uuid,
  p_module_id bigint,
  p_start_date date,
  p_start_time time,
  p_weekdays integer[],
  p_duration_minutes integer,
  p_meeting_url text default null
)
returns setof public.meetings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series_id uuid := gen_random_uuid();
  v_date date := p_start_date;
  v_start timestamptz;
  v_created integer := 0;
  v_meeting public.meetings;
  v_topic_ids bigint[];
  v_topic_count integer;
  v_ordered_count integer;
  v_unique_order_count integer;
  v_locked_id bigint;
begin
  if p_student_id is null or p_tutor_id is null or p_module_id is null or p_start_date is null or p_start_time is null then
    raise exception 'Student, tutor, module, start date and start time are required' using errcode='22023';
  end if;
  if p_weekdays is null or cardinality(p_weekdays)=0
     or p_duration_minutes is null or p_duration_minutes<15 or p_duration_minutes>240
     or exists(select 1 from unnest(p_weekdays) d where d is null or d<0 or d>6)
     or cardinality(p_weekdays)<> (select count(distinct d) from unnest(p_weekdays) d) then
    raise exception 'Invalid recurring schedule configuration' using errcode='22023';
  end if;
  if not (private.is_admin_actor() or (private.is_teacher_actor() and p_tutor_id=auth.uid())) then
    raise exception 'Only the assigned tutor or an admin can create this schedule' using errcode='42501';
  end if;
  if p_start_date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Schedule start date cannot be in the past' using errcode='22023';
  end if;
  select mod.id into v_locked_id from public.modules mod
  where mod.id=p_module_id and mod.is_active is true for share;
  if v_locked_id is null then raise exception 'Active module not found' using errcode='P0002'; end if;
  perform 1 from public.student_modules sm
  where sm.student_id=p_student_id and sm.module_id=p_module_id and sm.status='active'
  for share;
  if not found then raise exception 'Module must be actively assigned to this student' using errcode='42501'; end if;
  if not exists (select 1 from public.profiles p where p.id=p_tutor_id and p.role='teacher') then
    raise exception 'Tutor profile not found' using errcode='P0002';
  end if;
  if not exists (
    select 1 from public.tutor_student_assignments a
    where a.tutor_id=p_tutor_id and a.student_id=p_student_id and a.status='active'
  ) then
    raise exception 'Student must have an active assignment to this tutor' using errcode='42501';
  end if;
  if p_meeting_url is not null and (length(p_meeting_url)>2048 or p_meeting_url !~ '^https?://') then
    raise exception 'Meeting URL must be a valid HTTP(S) URL' using errcode='22023';
  end if;

  select count(*)::integer,count(t.order_index)::integer,count(distinct t.order_index)::integer,
         array_agg(t.id::bigint order by t.order_index,t.id)
    into v_topic_count,v_ordered_count,v_unique_order_count,v_topic_ids
  from public.topics t
  where t.module_id=p_module_id and t.status='published';
  if v_topic_count<>16 or v_ordered_count<>16 or v_unique_order_count<>16 then
    raise exception 'The selected module must have exactly 16 published topics with unique order indices' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bits2bytes:tutor:'||p_tutor_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bits2bytes:student:'||p_student_id::text,0));

  while v_created<16 loop
    if extract(dow from v_date)::integer=any(p_weekdays) then
      v_start := (v_date+p_start_time) at time zone 'Asia/Jakarta';
      if exists (
        select 1
        from public.meetings m
        left join public.meeting_students ms on ms.meeting_id=m.id
        where (m.teacher_id=p_tutor_id or ms.student_id=p_student_id)
          and m.deleted_at is null
          and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
          and m.meeting_date < v_start + make_interval(mins=>p_duration_minutes)
          and m.meeting_date + make_interval(mins=>coalesce(m.duration_minutes,60)) > v_start
      ) then
        raise exception 'Schedule conflict on % for tutor or student',v_date using errcode='23P01';
      end if;

      insert into public.meetings(
        title,meeting_date,link_url,session_count,series_id,session_number,
        is_completed,completion_status,teacher_id,module_id,topic_id,duration_minutes,version,updated_at
      )
      values(
        'Sesi '||(v_created+1),v_start,p_meeting_url,16,v_series_id,
        v_created+1,false,'scheduled',p_tutor_id,p_module_id,v_topic_ids[v_created+1],
        p_duration_minutes,1,now()
      )
      returning * into v_meeting;
      insert into public.meeting_students(meeting_id,student_id,attendance_status,has_joined)
      values(v_meeting.id,p_student_id,'absen',false);
      return next v_meeting;
      v_created:=v_created+1;
    end if;
    v_date:=v_date+1;
    if v_date>p_start_date+interval '370 days' then
      raise exception 'Could not generate requested schedule slots' using errcode='22023';
    end if;
  end loop;
  return;
end;
$$;

create or replace function public.create_recurring_meeting_series(
  p_student_id uuid,p_tutor_id uuid,p_module_id bigint,p_start_date date,p_start_time time,
  p_weekdays integer[],p_duration_minutes integer,p_meeting_url text default null
)
returns setof public.meetings
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_recurring_meeting_series(
    p_student_id,p_tutor_id,p_module_id,p_start_date,p_start_time,p_weekdays,p_duration_minutes,p_meeting_url
  );
$$;
revoke all on function private.create_recurring_meeting_series(uuid,uuid,bigint,date,time,integer[],integer,text) from public,anon,authenticated;
grant execute on function private.create_recurring_meeting_series(uuid,uuid,bigint,date,time,integer[],integer,text) to authenticated;
revoke all on function public.create_recurring_meeting_series(uuid,uuid,bigint,date,time,integer[],integer,text) from public,anon;
grant execute on function public.create_recurring_meeting_series(uuid,uuid,bigint,date,time,integer[],integer,text) to authenticated;

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
  if v_student_id is null or not private.is_student_actor() then
    raise exception 'Student session required' using errcode='42501';
  end if;
  if p_submission_url is null or length(p_submission_url)>2048 or p_submission_url !~ '^https?://' then
    raise exception 'A valid project URL is required' using errcode='22023';
  end if;
  if length(coalesce(p_submission_note,''))>3000 then
    raise exception 'Submission note is too long' using errcode='22023';
  end if;
  if not private.is_student_topic_released(v_student_id,p_topic_id) then
    raise exception 'Topic is not released to this student' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.student_topic_stage_progress s
    where s.student_id=v_student_id and s.topic_id=p_topic_id
      and s.stage_key='check' and s.status='completed'
  ) then
    raise exception 'Submit the formative Topic Check before submitting a project' using errcode='55000';
  end if;

  select c.id into v_challenge_id
  from public.challenges c where c.topic_id=p_topic_id
  order by c.order_index,c.id limit 1;
  if v_challenge_id is null then
    raise exception 'No project challenge is configured for this topic' using errcode='P0002';
  end if;
  select s.status into v_previous_status
  from public.challenge_submissions s
  where s.student_id=v_student_id and s.challenge_id=v_challenge_id
  order by s.submitted_at desc,s.id desc limit 1;
  if v_previous_status in ('pending','approved') then
    raise exception 'This project is already submitted or approved' using errcode='55000';
  end if;

  insert into public.challenge_submissions(challenge_id,student_id,submission_url,submission_note)
  values(v_challenge_id,v_student_id,p_submission_url,nullif(p_submission_note,''))
  returning * into v_result;
  insert into public.student_topic_stage_progress(student_id,topic_id,stage_key,status,completed_at)
  values
    (v_student_id,p_topic_id,'challenge','completed',now()),
    (v_student_id,p_topic_id,'submission','completed',now())
  on conflict(student_id,topic_id,stage_key) do update
  set status='completed',completed_at=now();
  return v_result;
end;
$$;
revoke all on function private.submit_student_challenge(bigint,text,text) from public,anon,authenticated;
grant execute on function private.submit_student_challenge(bigint,text,text) to authenticated;

create or replace function private.student_module_topic_completion(p_student_id uuid,p_module_id bigint)
returns table(total_topics integer,completed_topics integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(t.id)::integer,
         count(t.id) filter (where private.is_student_topic_complete(p_student_id,t.id))::integer
  from public.topics t
  join public.modules mod on mod.id=t.module_id and mod.is_active is true
  join public.student_modules sm
    on sm.module_id=t.module_id and sm.student_id=p_student_id and sm.status='active'
  where t.module_id=p_module_id and t.status='published'
  having count(t.id)=16 and count(t.order_index)=16 and count(distinct t.order_index)=16;
$$;

create or replace function private.record_student_module_assessment_attempt(
  p_student_id uuid,
  p_assessment_id bigint,
  p_score integer,
  p_correct_count integer,
  p_total_questions integer,
  p_answers jsonb
)
returns table(attempt_number integer,score integer,best_score integer,correct_count integer,total_questions integer,submitted_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module_id bigint;
  v_attempt_count integer;
  v_attempt_number integer;
  v_best_score integer;
  v_saved public.module_assessment_attempts;
  v_certificate_tier text;
begin
  if p_student_id is null or p_assessment_id is null or p_total_questions is distinct from 20
     or p_correct_count is null or p_correct_count<0 or p_correct_count>20
     or p_score is distinct from round((p_correct_count::numeric/20)*100)
     or p_answers is null
     or pg_catalog.jsonb_typeof(p_answers)<>'array'
     or pg_catalog.jsonb_array_length(p_answers)<>20 then
    raise exception 'Invalid Final Boss attempt payload' using errcode='22023';
  end if;

  select a.module_id into v_module_id
  from public.module_assessments a
  join public.modules mod on mod.id=a.module_id and mod.is_active is true
  where a.id=p_assessment_id;
  if v_module_id is null or not exists (
    select 1 from public.student_modules sm
    where sm.student_id=p_student_id and sm.module_id=v_module_id and sm.status='active'
  ) then
    raise exception 'Assessment is unavailable to this student' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.module_assessment_questions q
    where q.assessment_id=p_assessment_id
    having count(*)=20
  ) then
    raise exception 'Final Boss must contain exactly 20 questions' using errcode='22023';
  end if;
  if not exists (
    select 1 from private.student_module_topic_completion(p_student_id,v_module_id) c
    where c.total_topics=16 and c.completed_topics=16
  ) then
    raise exception 'Complete all 16 Topics before submitting the Final Boss' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bits2bytes:module-assessment:'||p_student_id::text||':'||p_assessment_id::text,0)
  );
  select count(*)::integer,coalesce(max(a.best_score),0)
    into v_attempt_count,v_best_score
  from public.module_assessment_attempts a
  where a.student_id=p_student_id and a.assessment_id=p_assessment_id;
  if v_attempt_count>=1 then
    raise exception 'The Final Boss has already been submitted' using errcode='55000';
  end if;
  v_attempt_number:=v_attempt_count+1;
  v_best_score:=greatest(v_best_score,p_score);

  insert into public.module_assessment_attempts(
    student_id,assessment_id,attempt_number,score,best_score,total_questions,correct_count,answers
  )
  values(p_student_id,p_assessment_id,v_attempt_number,p_score,v_best_score,p_total_questions,p_correct_count,p_answers)
  returning * into v_saved;

  v_certificate_tier := case
    when p_score >= 80 then 'excellent'
    when p_score >= 65 then 'achievement'
    else 'participant'
  end;

  -- The attempt and certificate are deliberately written in this one database
  -- transaction. The unique student/module constraint is the concurrency guard;
  -- a replay can never create a second certificate for the same module.
  insert into public.certificates(
    student_id,module_id,score,tier,certificate_number,issued_at,issue_source,
    verification_token,learning_record
  ) values (
    p_student_id,v_module_id,p_score,v_certificate_tier,
    'B2B-' || pg_catalog.to_char(now(),'YYYYMMDD') || '-' ||
      pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text,'-',''),1,10)),
    now(),'assessment',gen_random_uuid(),
    pg_catalog.jsonb_build_object(
      'assessment_id',p_assessment_id,
      'attempt_number',v_attempt_number,
      'correct_count',p_correct_count,
      'total_questions',p_total_questions
    )
  ) on conflict (student_id,module_id) do nothing;

  return query select v_saved.attempt_number,v_saved.score,v_saved.best_score,
    v_saved.correct_count,v_saved.total_questions,v_saved.submitted_at;
end;
$$;

-- Preserve historic `completion` rows while admitting the product's required
-- Participant tier. The final-assessment writer above only emits the three
-- current product tiers.
do $$
declare v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_catalog.pg_constraint c
    where c.conrelid='public.certificates'::regclass
      and c.contype='c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%tier%'
  loop
    execute pg_catalog.format('alter table public.certificates drop constraint %I',v_constraint.conname);
  end loop;
end;
$$;
alter table public.certificates
  add constraint certificates_tier_check
  check (tier in ('achievement','excellent','completion','participant'));

revoke all on function private.is_student_topic_released(uuid,bigint) from public,anon,authenticated;
grant execute on function private.is_student_topic_released(uuid,bigint) to service_role;
revoke all on function private.practice_checkpoints_valid(uuid,bigint) from public,anon,authenticated;
revoke all on function private.practice_checkpoints_valid_payload(bigint,jsonb) from public,anon,authenticated;
revoke all on function private.is_student_topic_complete(uuid,bigint) from public,anon,authenticated;
grant execute on function private.is_student_topic_complete(uuid,bigint) to service_role;
revoke all on function private.student_module_topic_completion(uuid,bigint) from public,anon,authenticated;
grant execute on function private.student_module_topic_completion(uuid,bigint) to service_role;
revoke all on function private.record_student_module_assessment_attempt(uuid,bigint,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function private.record_student_module_assessment_attempt(uuid,bigint,integer,integer,integer,jsonb) to service_role;
grant usage on schema private to service_role;

create or replace function public.record_student_module_assessment_attempt(
  p_student_id uuid,p_assessment_id bigint,p_score integer,p_correct_count integer,
  p_total_questions integer,p_answers jsonb
)
returns table(attempt_number integer,score integer,best_score integer,correct_count integer,total_questions integer,submitted_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.record_student_module_assessment_attempt(
    p_student_id,p_assessment_id,p_score,p_correct_count,p_total_questions,p_answers
  );
$$;
revoke all on function public.record_student_module_assessment_attempt(uuid,bigint,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.record_student_module_assessment_attempt(uuid,bigint,integer,integer,integer,jsonb) to service_role;

comment on function public.create_recurring_meeting_series(uuid,uuid,bigint,date,time,integer[],integer,text) is
  'Creates exactly 16 meetings for an actively assigned Module and maps each session_number to published Topic rank by order_index.';
comment on function public.complete_student_topic_stage(bigint,text,text) is
  'Records one server-validated Topic stage. Challenge and Submission may be explicitly skipped.';

-- The Edge Function calculates the prospective attempt number, but concurrent
-- requests must be serialized at the database boundary so a student can never
-- obtain a third Topic Check attempt through a race.
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
set search_path = ''
as $$
declare
  v_attempt_id integer;
  v_attempt_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bits2bytes:topic-quiz:' || p_student_id::text || ':' || p_topic_id::text, 0)
  );
  select count(*)::integer into v_attempt_count
  from public.topic_quiz_attempts
  where student_id=p_student_id and topic_id=p_topic_id;
  if v_attempt_count >= 2 then
    raise exception 'All quiz attempts have been used' using errcode='55000';
  end if;
  if p_attempt_num is distinct from v_attempt_count + 1 then
    raise exception 'Quiz attempt number is stale; refresh and try again' using errcode='40001';
  end if;

  insert into public.topic_quiz_attempts(
    student_id,topic_id,attempt_num,score,answers,quiz_version
  ) values (
    p_student_id,p_topic_id,p_attempt_num,p_score,p_answers,p_quiz_version
  ) returning id into v_attempt_id;
  insert into public.topic_quiz_attempt_snapshots(attempt_id,quiz_snapshot)
  values(v_attempt_id,p_quiz_snapshot);
  return v_attempt_id;
end;
$$;
revoke all on function public.save_topic_quiz_attempt_with_snapshot(
  uuid,integer,smallint,integer,jsonb,integer,jsonb
) from public,anon,authenticated;
grant execute on function public.save_topic_quiz_attempt_with_snapshot(
  uuid,integer,smallint,integer,jsonb,integer,jsonb
) to service_role;

-- Read-only Parent Hub projection.  It intentionally accepts only a module id:
-- the student id always comes from the authenticated JWT, never from the browser.
create or replace function public.get_my_parent_hub_module(p_module_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_student_id is null or not private.is_student_actor() then
    raise exception 'Authenticated student session required' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.student_modules sm
    where sm.student_id=v_student_id and sm.module_id=p_module_id and sm.status='active'
  ) then
    raise exception 'Module is not assigned to this student' using errcode='42501';
  end if;

  select jsonb_build_object(
    'topics', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'order', t.order_index,
      'lessonState', coalesce(lp.state, 'not-started'), 'updatedAt', lp.updated_at,
      'stages', coalesce((select jsonb_object_agg(s.stage_key, s.status)
        from public.student_topic_stage_progress s
        where s.student_id=v_student_id and s.topic_id=t.id), '{}'::jsonb),
      'quizAttempts', coalesce((select jsonb_agg(jsonb_build_object(
        'attemptNumber', q.attempt_num, 'score', q.score, 'submittedAt', q.created_at)
        order by q.attempt_num) from public.topic_quiz_attempts q
        where q.student_id=v_student_id and q.topic_id=t.id), '[]'::jsonb),
      'projects', coalesce((select jsonb_agg(jsonb_build_object(
        'id', cs.id, 'title', c.title, 'url', cs.submission_url,
        'status', cs.status, 'submittedAt', cs.submitted_at, 'reviewNote', cs.review_note)
        order by cs.submitted_at desc, cs.id desc)
        from public.challenge_submissions cs
        join public.challenges c on c.id=cs.challenge_id
        where cs.student_id=v_student_id and c.topic_id=t.id), '[]'::jsonb)
    ) order by t.order_index, t.id)
      from public.topics t where t.module_id=p_module_id and t.status='published'), '[]'::jsonb),
    'finalBoss', coalesce((select jsonb_build_object(
      'attemptNumber', a.attempt_number, 'score', a.score, 'bestScore', a.best_score,
      'submittedAt', a.submitted_at)
      from public.module_assessment_attempts a
      join public.module_assessments ma on ma.id=a.assessment_id
      where a.student_id=v_student_id and ma.module_id=p_module_id
      order by a.submitted_at desc, a.id desc limit 1), 'null'::jsonb),
    'certificate', coalesce((select jsonb_build_object(
      'number', c.certificate_number, 'tier', c.tier, 'score', c.score, 'issuedAt', c.issued_at)
      from public.certificates c where c.student_id=v_student_id and c.module_id=p_module_id
      order by c.issued_at desc limit 1), 'null'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_my_parent_hub_module(bigint) from public, anon;
grant execute on function public.get_my_parent_hub_module(bigint) to authenticated;
comment on function public.get_my_parent_hub_module(bigint) is
  'Student-scoped, read-only Parent Hub projection. Parent identity mapping is intentionally not implied.';
