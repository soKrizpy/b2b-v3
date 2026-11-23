-- Cover all reported foreign keys used by the production domains.
create index if not exists certificates_issued_by_idx on public.certificates(issued_by);
create index if not exists certificates_module_id_idx on public.certificates(module_id);
create index if not exists challenge_submissions_reviewed_by_idx on public.challenge_submissions(reviewed_by);
create index if not exists enrollments_module_id_idx on public.enrollments(module_id);
create index if not exists invoice_items_meeting_id_idx on public.invoice_items(meeting_id);
create index if not exists invoice_payments_recorded_by_idx on public.invoice_payments(recorded_by);
create index if not exists invoices_created_by_idx on public.invoices(created_by);
create index if not exists invoices_issued_by_idx on public.invoices(issued_by);
create index if not exists invoices_updated_by_idx on public.invoices(updated_by);
create index if not exists meeting_students_attendance_recorded_by_idx on public.meeting_students(attendance_recorded_by);
create index if not exists meetings_cancelled_by_idx on public.meetings(cancelled_by);
create index if not exists meetings_deleted_by_idx on public.meetings(deleted_by);
create index if not exists meetings_replacement_for_session_id_idx on public.meetings(replacement_for_session_id);
create index if not exists meetings_replacement_session_id_idx on public.meetings(replacement_session_id);
create index if not exists module_assessment_attempts_assessment_id_idx on public.module_assessment_attempts(assessment_id);
create index if not exists module_assessment_questions_assessment_id_idx on public.module_assessment_questions(assessment_id);
create index if not exists quiz_attempts_quiz_id_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_questions_quiz_id_idx on public.quiz_questions(quiz_id);
create index if not exists student_assessment_unlocks_module_id_idx on public.student_assessment_unlocks(module_id);
create index if not exists student_assessment_unlocks_unlocked_by_idx on public.student_assessment_unlocks(unlocked_by);
create index if not exists student_inventory_item_id_idx on public.student_inventory(item_id);
create index if not exists student_lesson_progress_topic_id_idx on public.student_lesson_progress(topic_id);
create index if not exists student_modules_module_id_idx on public.student_modules(module_id);
create index if not exists student_pet_inventory_cosmetic_id_idx on public.student_pet_inventory(cosmetic_id);
create index if not exists student_tariffs_updated_by_idx on public.student_tariffs(updated_by);
create index if not exists topic_progress_topic_id_idx on public.topic_progress(topic_id);
create index if not exists topic_quiz_attempts_topic_id_idx on public.topic_quiz_attempts(topic_id);
create index if not exists topics_module_id_idx on public.topics(module_id);
create index if not exists tutor_student_assignments_created_by_idx on public.tutor_student_assignments(created_by);

-- Remove only confirmed redundant indexes; keep the constraint-backed unique indexes.
drop index if exists public.parent_links_token_idx;
alter table public.topic_progress drop constraint if exists topic_progress_student_topic_unique;

-- Avoid per-row auth.uid() evaluation in the existing engine progress policy.
drop policy if exists "Students manage own engine progress" on public.engine_progress;
create policy "Students manage own engine progress"
  on public.engine_progress for all to authenticated
  using ((select auth.uid()) = student_id)
  with check ((select auth.uid()) = student_id);

-- Session reports: one SELECT policy and explicit write scopes.
drop policy if exists session_reports_admin_all on public.session_reports;
drop policy if exists session_reports_tutor_manage on public.session_reports;
drop policy if exists session_reports_student_read_submitted on public.session_reports;

create policy session_reports_select_authorized
  on public.session_reports for select to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.meetings m
        join public.meeting_students ms on ms.meeting_id=m.id
        where m.id=session_reports.meeting_id
          and m.teacher_id=(select auth.uid())
          and ms.student_id=session_reports.student_id
      )
    )
    or (student_id=(select auth.uid()) and status='submitted')
  );

create policy session_reports_insert_admin_or_tutor
  on public.session_reports for insert to authenticated
  with check (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.meetings m
        join public.meeting_students ms on ms.meeting_id=m.id
        where m.id=session_reports.meeting_id
          and m.teacher_id=(select auth.uid())
          and ms.student_id=session_reports.student_id
      )
    )
  );

create policy session_reports_update_admin_or_tutor
  on public.session_reports for update to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.meetings m
        join public.meeting_students ms on ms.meeting_id=m.id
        where m.id=session_reports.meeting_id
          and m.teacher_id=(select auth.uid())
          and ms.student_id=session_reports.student_id
      )
    )
  )
  with check (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.meetings m
        join public.meeting_students ms on ms.meeting_id=m.id
        where m.id=session_reports.meeting_id
          and m.teacher_id=(select auth.uid())
          and ms.student_id=session_reports.student_id
      )
    )
  );

create policy session_reports_delete_admin_or_tutor_draft
  on public.session_reports for delete to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and status='draft'
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.meetings m
        join public.meeting_students ms on ms.meeting_id=m.id
        where m.id=session_reports.meeting_id
          and m.teacher_id=(select auth.uid())
          and ms.student_id=session_reports.student_id
      )
    )
  );

-- Monthly evaluations: students see published rows; assigned tutors manage drafts.
drop policy if exists monthly_evaluations_admin_all on public.monthly_evaluations;
drop policy if exists monthly_evaluations_student_read_published on public.monthly_evaluations;
drop policy if exists monthly_evaluations_tutor_manage_assigned on public.monthly_evaluations;

create policy monthly_evaluations_select_authorized
  on public.monthly_evaluations for select to authenticated
  using (
    private.is_admin_actor()
    or (student_id=(select auth.uid()) and status='published')
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=monthly_evaluations.student_id
          and a.status='active'
      )
    )
  );

create policy monthly_evaluations_insert_admin_or_assigned_tutor
  on public.monthly_evaluations for insert to authenticated
  with check (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=monthly_evaluations.student_id
          and a.status='active'
      )
    )
  );

create policy monthly_evaluations_update_admin_or_assigned_tutor
  on public.monthly_evaluations for update to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=monthly_evaluations.student_id
          and a.status='active'
      )
    )
  )
  with check (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=monthly_evaluations.student_id
          and a.status='active'
      )
    )
  );

create policy monthly_evaluations_delete_admin_or_tutor_draft
  on public.monthly_evaluations for delete to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and status='draft'
      and tutor_id=(select auth.uid())
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=monthly_evaluations.student_id
          and a.status='active'
      )
    )
  );

-- Invoice line items: students only read issued/paid invoices; admins mutate drafts.
drop policy if exists invoice_items_admin_all on public.invoice_items;
drop policy if exists invoice_items_student_read_own on public.invoice_items;

create policy invoice_items_select_authorized
  on public.invoice_items for select to authenticated
  using (
    private.is_admin_actor()
    or exists (
      select 1 from public.invoices i
      where i.id=invoice_items.invoice_id
        and i.student_id=(select auth.uid())
        and i.status in ('sent','paid')
    )
  );
create policy invoice_items_insert_admin_draft
  on public.invoice_items for insert to authenticated
  with check (
    private.is_admin_actor()
    and exists (select 1 from public.invoices i where i.id=invoice_items.invoice_id and i.status='draft')
  );
create policy invoice_items_update_admin_draft
  on public.invoice_items for update to authenticated
  using (private.is_admin_actor() and exists (select 1 from public.invoices i where i.id=invoice_items.invoice_id and i.status='draft'))
  with check (private.is_admin_actor() and exists (select 1 from public.invoices i where i.id=invoice_items.invoice_id and i.status='draft'));
create policy invoice_items_delete_admin_draft
  on public.invoice_items for delete to authenticated
  using (private.is_admin_actor() and exists (select 1 from public.invoices i where i.id=invoice_items.invoice_id and i.status='draft'));

-- Payments are append-only; only admins can insert and students can read issued invoice payments.
drop policy if exists invoice_payments_admin_all on public.invoice_payments;
drop policy if exists invoice_payments_student_read_own on public.invoice_payments;
create policy invoice_payments_select_authorized
  on public.invoice_payments for select to authenticated
  using (
    private.is_admin_actor()
    or exists (
      select 1 from public.invoices i
      where i.id=invoice_payments.invoice_id
        and i.student_id=(select auth.uid())
        and i.status in ('sent','paid')
    )
  );
create policy invoice_payments_insert_admin
  on public.invoice_payments for insert to authenticated
  with check (private.is_admin_actor());
revoke update,delete on public.invoice_payments from authenticated;

-- Challenge submissions: one read policy and pending-only tutor review.
drop policy if exists challenge_submissions_admin_review on public.challenge_submissions;
drop policy if exists challenge_submissions_admin_select on public.challenge_submissions;
drop policy if exists challenge_submissions_assigned_tutor_review on public.challenge_submissions;
drop policy if exists challenge_submissions_assigned_tutor_select on public.challenge_submissions;
drop policy if exists challenge_submissions_student_select on public.challenge_submissions;

create policy challenge_submissions_select_authorized
  on public.challenge_submissions for select to authenticated
  using (
    private.is_admin_actor()
    or student_id=(select auth.uid())
    or (
      private.is_teacher_actor()
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.student_id=challenge_submissions.student_id
          and a.tutor_id=(select auth.uid())
          and a.status='active'
      )
    )
  );
create policy challenge_submissions_update_admin_or_pending_tutor
  on public.challenge_submissions for update to authenticated
  using (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and status='pending'
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.student_id=challenge_submissions.student_id
          and a.tutor_id=(select auth.uid())
          and a.status='active'
      )
    )
  )
  with check (
    private.is_admin_actor()
    or (
      private.is_teacher_actor()
      and reviewed_by=(select auth.uid())
      and status in ('approved','needs_revision')
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.student_id=challenge_submissions.student_id
          and a.tutor_id=(select auth.uid())
          and a.status='active'
      )
    )
  );

-- Tariffs: combine the three read audiences; only admins write.
drop policy if exists student_tariffs_admin_all on public.student_tariffs;
drop policy if exists student_tariffs_student_read on public.student_tariffs;
drop policy if exists student_tariffs_tutor_read_assigned on public.student_tariffs;
create policy student_tariffs_select_authorized
  on public.student_tariffs for select to authenticated
  using (
    private.is_admin_actor()
    or student_id=(select auth.uid())
    or (
      private.is_teacher_actor()
      and exists (
        select 1 from public.tutor_student_assignments a
        where a.tutor_id=(select auth.uid())
          and a.student_id=student_tariffs.student_id
          and a.status='active'
      )
    )
  );
create policy student_tariffs_insert_admin
  on public.student_tariffs for insert to authenticated
  with check (private.is_admin_actor());
create policy student_tariffs_update_admin
  on public.student_tariffs for update to authenticated
  using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy student_tariffs_delete_admin
  on public.student_tariffs for delete to authenticated
  using (private.is_admin_actor());

-- Assignments: combine related-user reads; all mutations remain admin-only.
drop policy if exists tutor_student_assignments_admin_manage on public.tutor_student_assignments;
drop policy if exists tutor_student_assignments_read_related on public.tutor_student_assignments;
create policy tutor_student_assignments_select_related
  on public.tutor_student_assignments for select to authenticated
  using (
    private.is_admin_actor()
    or tutor_id=(select auth.uid())
    or student_id=(select auth.uid())
  );
create policy tutor_student_assignments_insert_admin
  on public.tutor_student_assignments for insert to authenticated
  with check (private.is_admin_actor());
create policy tutor_student_assignments_update_admin
  on public.tutor_student_assignments for update to authenticated
  using (private.is_admin_actor()) with check (private.is_admin_actor());
create policy tutor_student_assignments_delete_admin
  on public.tutor_student_assignments for delete to authenticated
  using (private.is_admin_actor());
