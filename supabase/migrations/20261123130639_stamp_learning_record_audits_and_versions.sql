create or replace function private.stamp_session_report_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op='INSERT' then
    new.version := 1;
    new.updated_at := now();
    if new.status='submitted' then
      new.submitted_at := now();
    else
      new.submitted_at := null;
    end if;
  else
    new.version := old.version + 1;
    new.updated_at := now();
    if new.status='submitted' and old.status is distinct from 'submitted' then
      new.submitted_at := now();
    elsif new.status='submitted' then
      new.submitted_at := old.submitted_at;
    else
      new.submitted_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_session_report_lifecycle() from public,anon,authenticated;
drop trigger if exists session_reports_stamp_lifecycle on public.session_reports;
create trigger session_reports_stamp_lifecycle
before insert or update on public.session_reports
for each row execute function private.stamp_session_report_lifecycle();

create or replace function private.stamp_monthly_evaluation_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op='INSERT' then
    new.version := 1;
    new.updated_at := now();
    if new.status='published' then
      new.published_at := now();
    else
      new.published_at := null;
    end if;
  else
    new.version := old.version + 1;
    new.updated_at := now();
    if new.status='published' and old.status is distinct from 'published' then
      new.published_at := now();
    elsif new.status='published' then
      new.published_at := old.published_at;
    else
      new.published_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_monthly_evaluation_lifecycle() from public,anon,authenticated;
drop trigger if exists monthly_evaluations_stamp_lifecycle on public.monthly_evaluations;
create trigger monthly_evaluations_stamp_lifecycle
before insert or update on public.monthly_evaluations
for each row execute function private.stamp_monthly_evaluation_lifecycle();

-- Clients can write report content/status, never versions or lifecycle timestamps.
revoke insert,update on public.session_reports from authenticated;
grant insert (
  student_id,tutor_id,meeting_id,session_date,session_number,topic,module_name,
  activities,achievements,difficulties,solutions,parent_recommendations,competencies,status
) on public.session_reports to authenticated;
grant update (
  student_id,tutor_id,meeting_id,session_date,session_number,topic,module_name,
  activities,achievements,difficulties,solutions,parent_recommendations,competencies,status
) on public.session_reports to authenticated;

revoke insert,update on public.monthly_evaluations from authenticated;
grant insert (student_id,tutor_id,period,rating,summary,strengths,next_goals,status)
  on public.monthly_evaluations to authenticated;
grant update (student_id,tutor_id,period,rating,summary,strengths,next_goals,status)
  on public.monthly_evaluations to authenticated;

create or replace function private.stamp_challenge_submission_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending' or new.status not in ('approved','needs_revision') then
      raise exception 'Only pending submissions can be reviewed' using errcode='55000';
    end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_challenge_submission_review() from public,anon,authenticated;
drop trigger if exists challenge_submissions_stamp_review on public.challenge_submissions;
create trigger challenge_submissions_stamp_review
before update on public.challenge_submissions
for each row execute function private.stamp_challenge_submission_review();

-- Review audit columns are server-stamped; tutors/admins can only choose status and note.
revoke update on public.challenge_submissions from authenticated;
grant update (status,review_note) on public.challenge_submissions to authenticated;
