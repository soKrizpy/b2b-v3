-- Reassert final production write guards after all Stage 3 schema and workflow migrations.
alter function public.create_draft_invoice(uuid,text) security definer;
alter function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) security definer;
alter function public.issue_draft_invoice(uuid) security definer;
alter function public.mark_invoice_paid(uuid,text,text,text) security definer;

revoke insert,update,delete on public.invoices from authenticated;
revoke insert,update,delete on public.invoice_items from authenticated;
revoke insert,update,delete on public.invoice_payments from authenticated;
revoke update (attendance_recorded_by,attendance_recorded_at)
  on public.meeting_students from authenticated;

revoke insert,update on public.session_reports from authenticated;
revoke insert (version,created_at,updated_at,submitted_at),
       update (version,created_at,updated_at,submitted_at)
  on public.session_reports from authenticated;
grant insert (
  student_id,tutor_id,meeting_id,session_date,session_number,topic,module_name,
  activities,achievements,difficulties,solutions,parent_recommendations,competencies,status
) on public.session_reports to authenticated;
grant update (
  student_id,tutor_id,meeting_id,session_date,session_number,topic,module_name,
  activities,achievements,difficulties,solutions,parent_recommendations,competencies,status
) on public.session_reports to authenticated;

revoke insert,update on public.monthly_evaluations from authenticated;
revoke insert (version,created_at,updated_at,published_at),
       update (version,created_at,updated_at,published_at)
  on public.monthly_evaluations from authenticated;
grant insert (student_id,tutor_id,period,rating,summary,strengths,next_goals,status)
  on public.monthly_evaluations to authenticated;
grant update (student_id,tutor_id,period,rating,summary,strengths,next_goals,status)
  on public.monthly_evaluations to authenticated;

revoke update on public.challenge_submissions from authenticated;
revoke update (reviewed_by,reviewed_at)
  on public.challenge_submissions from authenticated;
grant update (status,review_note) on public.challenge_submissions to authenticated;
