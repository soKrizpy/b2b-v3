create or replace function public.create_recurring_meeting_series(
  p_student_id uuid,
  p_tutor_id uuid,
  p_start_date date,
  p_start_time time,
  p_weekdays integer[],
  p_target_count integer,
  p_duration_minutes integer,
  p_meeting_url text default null
)
returns setof public.meetings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_series_id uuid := gen_random_uuid();
  v_date date := p_start_date;
  v_start timestamptz;
  v_created integer := 0;
  v_meeting public.meetings;
begin
  if p_student_id is null or p_tutor_id is null or p_start_date is null or p_start_time is null then
    raise exception 'Student, tutor, start date and start time are required' using errcode='22023';
  end if;
  if not (private.is_admin_actor() or (private.is_teacher_actor() and p_tutor_id=auth.uid())) then
    raise exception 'Only the assigned tutor or an admin can create this schedule' using errcode='42501';
  end if;
  if p_start_date < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Schedule start date cannot be in the past' using errcode='22023';
  end if;
  if p_target_count<1 or p_target_count>52 or p_duration_minutes<15 or p_duration_minutes>240
     or coalesce(array_length(p_weekdays,1),0)<1
     or exists(select 1 from unnest(p_weekdays) d where d<0 or d>6) then
    raise exception 'Invalid recurring schedule configuration' using errcode='22023';
  end if;
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

  while v_created<p_target_count loop
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
        is_completed,completion_status,teacher_id,duration_minutes,version,updated_at
      )
      values(
        'Sesi '||(v_created+1),v_start,p_meeting_url,p_target_count,v_series_id,
        v_created+1,false,'scheduled',p_tutor_id,p_duration_minutes,1,now()
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

create or replace function public.create_replacement_meeting(
  p_original_meeting_id integer,
  p_scheduled_start_at timestamptz,
  p_duration_minutes integer default null,
  p_meeting_url text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_original public.meetings;
  v_replacement public.meetings;
  v_duration integer;
begin
  if p_scheduled_start_at is null then
    raise exception 'Replacement start time is required' using errcode='22023';
  end if;
  select * into v_original from public.meetings where id=p_original_meeting_id for update;
  if not found then raise exception 'Original meeting not found' using errcode='P0002'; end if;
  if not (private.is_admin_actor() or (private.is_teacher_actor() and v_original.teacher_id=auth.uid())) then
    raise exception 'Only the meeting owner or an admin can create a replacement' using errcode='42501';
  end if;
  if v_original.replacement_required is not true then
    raise exception 'Original meeting does not require a replacement' using errcode='55000';
  end if;
  v_duration := coalesce(p_duration_minutes,v_original.duration_minutes,60);
  if v_duration<15 or v_duration>240 then
    raise exception 'Replacement duration is invalid' using errcode='22023';
  end if;
  if p_meeting_url is not null and (length(p_meeting_url)>2048 or p_meeting_url !~ '^https?://') then
    raise exception 'Meeting URL must be a valid HTTP(S) URL' using errcode='22023';
  end if;
  if exists (
    select 1
    from public.meetings m
    left join public.meeting_students ms on ms.meeting_id=m.id
    where (m.teacher_id=v_original.teacher_id or ms.student_id in (
      select original_link.student_id
      from public.meeting_students original_link
      where original_link.meeting_id=v_original.id
    ))
      and m.id<>v_original.id
      and m.deleted_at is null
      and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
      and m.meeting_date < p_scheduled_start_at + make_interval(mins=>v_duration)
      and m.meeting_date + make_interval(mins=>coalesce(m.duration_minutes,60)) > p_scheduled_start_at
  ) then
    raise exception 'Replacement schedule conflicts with tutor or student schedule' using errcode='23P01';
  end if;

  insert into public.meetings(
    title,meeting_date,link_url,notes,session_count,series_id,session_number,
    is_completed,completion_status,teacher_id,module_id,topic_id,duration_minutes,
    replacement_for_session_id,version,updated_at
  )
  values(
    v_original.title||' (Pengganti)',p_scheduled_start_at,coalesce(p_meeting_url,v_original.link_url),
    v_original.notes,v_original.session_count,v_original.series_id,v_original.session_number,
    false,'scheduled',v_original.teacher_id,v_original.module_id,v_original.topic_id,
    v_duration,v_original.id,1,now()
  )
  returning * into v_replacement;

  insert into public.meeting_students(meeting_id,student_id,attendance_status,has_joined)
  select v_replacement.id,ms.student_id,'absen',false
  from public.meeting_students ms
  where ms.meeting_id=v_original.id;

  update public.meetings
  set replacement_required=false,replacement_session_id=v_replacement.id
  where id=v_original.id;

  return jsonb_build_object('original',to_jsonb(v_original),'replacement',to_jsonb(v_replacement));
end;
$$;
