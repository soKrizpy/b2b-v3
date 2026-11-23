alter table public.meetings
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_reason text,
  add column if not exists replacement_required boolean not null default false,
  add column if not exists replacement_session_id integer references public.meetings(id) on delete set null,
  add column if not exists replacement_for_session_id integer references public.meetings(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists version integer not null default 1;

alter table public.meetings
  add constraint meetings_duration_minutes_check check(duration_minutes between 15 and 240),
  add constraint meetings_version_positive_check check(version>0);

create index if not exists meetings_teacher_date_active_idx
  on public.meetings(teacher_id,meeting_date)
  where deleted_at is null and completion_status not in ('cancelled','soft_deleted');
create index if not exists meetings_series_session_idx
  on public.meetings(series_id,session_number);

create or replace function private.stamp_meeting_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  if new.completion_status='cancelled' and old.completion_status is distinct from 'cancelled' then
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
    new.replacement_required := true;
  end if;
  if new.completion_status='soft_deleted' and old.completion_status is distinct from 'soft_deleted' then
    new.deleted_at := now();
    new.deleted_by := auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_meeting_lifecycle() from public,anon,authenticated;
drop trigger if exists meetings_stamp_lifecycle on public.meetings;
create trigger meetings_stamp_lifecycle
before update on public.meetings
for each row execute function private.stamp_meeting_lifecycle();

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
  if not (private.is_admin_actor() or (private.is_teacher_actor() and p_tutor_id=auth.uid())) then
    raise exception 'Only the assigned tutor or an admin can create this schedule' using errcode='42501';
  end if;
  if p_target_count<1 or p_target_count>52 or p_duration_minutes<15 or p_duration_minutes>240
     or coalesce(array_length(p_weekdays,1),0)<1
     or exists(select 1 from unnest(p_weekdays) d where d<0 or d>6) then
    raise exception 'Invalid recurring schedule configuration' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id=p_tutor_id and p.role='teacher'
  ) then
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
        select 1 from public.meetings m
        where m.teacher_id=p_tutor_id
          and m.deleted_at is null
          and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
          and m.meeting_date < v_start + make_interval(mins=>p_duration_minutes)
          and m.meeting_date + make_interval(mins=>coalesce(m.duration_minutes,60)) > v_start
      ) then
        raise exception 'Schedule conflict on %',v_date using errcode='23P01';
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
begin
  select * into v_original
  from public.meetings
  where id=p_original_meeting_id
  for update;
  if not found then raise exception 'Original meeting not found' using errcode='P0002'; end if;
  if not (private.is_admin_actor() or (private.is_teacher_actor() and v_original.teacher_id=auth.uid())) then
    raise exception 'Only the meeting owner or an admin can create a replacement' using errcode='42501';
  end if;
  if v_original.replacement_required is not true then
    raise exception 'Original meeting does not require a replacement' using errcode='55000';
  end if;
  if p_duration_minutes is not null and (p_duration_minutes<15 or p_duration_minutes>240) then
    raise exception 'Replacement duration is invalid' using errcode='22023';
  end if;
  if exists (
    select 1 from public.meetings m
    where m.teacher_id=v_original.teacher_id
      and m.deleted_at is null
      and coalesce(m.completion_status,'scheduled') not in ('cancelled','soft_deleted')
      and m.meeting_date < p_scheduled_start_at + make_interval(mins=>coalesce(p_duration_minutes,v_original.duration_minutes,60))
      and m.meeting_date + make_interval(mins=>coalesce(m.duration_minutes,60)) > p_scheduled_start_at
  ) then
    raise exception 'Replacement schedule conflicts with another meeting' using errcode='23P01';
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
    coalesce(p_duration_minutes,v_original.duration_minutes,60),v_original.id,1,now()
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

revoke all on function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) from public,anon;
revoke all on function public.create_replacement_meeting(integer,timestamptz,integer,text) from public,anon;
grant execute on function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) to authenticated;
grant execute on function public.create_replacement_meeting(integer,timestamptz,integer,text) to authenticated;

comment on column public.meetings.duration_minutes is 'Scheduled duration in minutes for conflict detection and billing.';
comment on column public.meetings.replacement_required is 'True when a cancelled session still needs a replacement meeting.';
