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
set search_path = pg_catalog
as $function$
declare
  v_actor uuid := auth.uid();
  v_module_id bigint;
  v_saved public.student_lesson_progress;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id=v_actor and p.role='student'
  ) then
    raise exception 'Authenticated student session required' using errcode='42501';
  end if;
  if p_state not in ('not-started','in-progress','practice-completed') then
    raise exception 'Invalid lesson progress state' using errcode='22023';
  end if;
  if p_slide_index is null or p_slide_index<0 or p_slide_index>200 then
    raise exception 'Invalid slide index' using errcode='22023';
  end if;
  if p_expected_version is null or p_expected_version<0 then
    raise exception 'Invalid expected version' using errcode='22023';
  end if;
  if p_checkpoints is null or jsonb_typeof(p_checkpoints)<>'object'
     or pg_column_size(p_checkpoints)>16384
     or exists(select 1 from jsonb_each(p_checkpoints) e where jsonb_typeof(e.value)<>'boolean') then
    raise exception 'Invalid checkpoint payload' using errcode='22023';
  end if;
  if p_submission_draft is not null and (
    jsonb_typeof(p_submission_draft)<>'object'
    or pg_column_size(p_submission_draft)>8192
    or (p_submission_draft ? 'link' and jsonb_typeof(p_submission_draft->'link')<>'string')
    or (p_submission_draft ? 'notes' and jsonb_typeof(p_submission_draft->'notes')<>'string')
    or length(coalesce(p_submission_draft->>'link',''))>2048
    or length(coalesce(p_submission_draft->>'notes',''))>4000
  ) then
    raise exception 'Invalid submission draft' using errcode='22023';
  end if;

  select t.module_id into v_module_id
  from public.topics t
  join public.modules m on m.id=t.module_id and m.is_active is true
  where t.id=p_topic_id and t.status='published';

  if v_module_id is null or not exists (
    select 1 from public.student_modules sm
    where sm.student_id=v_actor and sm.module_id=v_module_id and sm.status='active'
  ) then
    raise exception 'Topic is not available to this student' using errcode='42501';
  end if;

  insert into public.student_lesson_progress(
    student_id,topic_id,state,checkpoints,submission_draft,slide_index,version,updated_at
  )
  values(v_actor,p_topic_id,p_state,p_checkpoints,p_submission_draft,p_slide_index,1,now())
  on conflict(student_id,topic_id) do update
  set state=excluded.state,
      checkpoints=excluded.checkpoints,
      submission_draft=excluded.submission_draft,
      slide_index=excluded.slide_index,
      version=public.student_lesson_progress.version+1,
      updated_at=now()
  where public.student_lesson_progress.version=p_expected_version
  returning * into v_saved;

  if not found then
    raise exception 'Progress version conflict; reload before saving' using errcode='40001';
  end if;
  return v_saved;
end;
$function$;

revoke all on function private.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) from public,anon,authenticated;
grant usage on schema private to authenticated;
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
set search_path = pg_catalog
as $$
  select private.save_student_lesson_progress(
    p_topic_id,p_state,p_checkpoints,p_submission_draft,p_slide_index,p_expected_version
  );
$$;
revoke all on function public.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) from public,anon;
grant execute on function public.save_student_lesson_progress(bigint,text,jsonb,jsonb,integer,integer) to authenticated;
