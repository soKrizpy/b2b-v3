-- Stage 3 production domain foundations.
-- Additive only: preserve all existing invoices, meetings, attendance and student records.
-- All exposed tables have RLS and explicit least-privilege grants.

create table if not exists public.tutor_student_assignments (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint tutor_student_assignments_end_state check (
    (status = 'active' and ended_at is null) or
    (status = 'inactive' and ended_at is not null)
  )
);
create unique index if not exists tutor_student_assignments_one_active_pair
  on public.tutor_student_assignments(tutor_id, student_id) where status = 'active';
create index if not exists tutor_student_assignments_student_status_idx
  on public.tutor_student_assignments(student_id, status);
create index if not exists tutor_student_assignments_tutor_status_idx
  on public.tutor_student_assignments(tutor_id, status);

create table if not exists public.session_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  tutor_id uuid not null references public.profiles(id) on delete restrict,
  meeting_id integer references public.meetings(id) on delete set null,
  session_date date not null,
  session_number integer check (session_number is null or session_number > 0),
  topic text not null default '',
  module_name text,
  activities text not null default '',
  achievements text not null default '',
  difficulties text not null default '',
  solutions text not null default '',
  parent_recommendations text not null default '',
  competencies jsonb not null default '{}'::jsonb check (jsonb_typeof(competencies) = 'object'),
  status text not null default 'draft' check (status in ('draft','submitted')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint session_reports_meeting_student_unique unique (meeting_id, student_id)
);
create index if not exists session_reports_tutor_date_idx on public.session_reports(tutor_id, session_date desc);
create index if not exists session_reports_student_status_idx on public.session_reports(student_id, status, session_date desc);

create table if not exists public.monthly_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  tutor_id uuid not null references public.profiles(id) on delete restrict,
  period char(7) not null check (period ~ '^\\d{4}-(0[1-9]|1[0-2])$'),
  rating text check (rating is null or rating in (
    'Sangat baik','Baik','Berkembang sesuai proses','Membutuhkan pendampingan lebih lanjut'
  )),
  summary text not null default '',
  strengths text not null default '',
  next_goals text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint monthly_evaluations_student_period_unique unique (student_id, period)
);
create index if not exists monthly_evaluations_tutor_period_idx on public.monthly_evaluations(tutor_id, period desc);
create index if not exists monthly_evaluations_student_status_idx on public.monthly_evaluations(student_id, status, period desc);

create table if not exists public.student_tariffs (
  student_id uuid primary key references public.students(id) on delete restrict,
  amount_per_session integer not null check (amount_per_session >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict
);

alter table public.invoices
  add column if not exists currency text not null default 'IDR',
  add column if not exists discount_amount integer not null default 0,
  add column if not exists additional_charges integer not null default 0,
  add column if not exists adjustment_note text not null default '',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists issued_at timestamptz,
  add column if not exists issued_by uuid references public.profiles(id) on delete set null,
  add column if not exists paid_at timestamptz;
alter table public.invoices
  add constraint invoices_currency_idr_check check (currency = 'IDR'),
  add constraint invoices_adjustments_nonnegative_check check (discount_amount >= 0 and additional_charges >= 0);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  meeting_id integer references public.meetings(id) on delete restrict,
  session_number integer check (session_number is null or session_number > 0),
  session_date timestamptz,
  description text not null default '',
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists invoice_items_invoice_meeting_unique
  on public.invoice_items(invoice_id, meeting_id) where meeting_id is not null;
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount integer not null check (amount > 0),
  paid_at timestamptz not null default now(),
  payment_method text not null default 'manual',
  reference text,
  notes text not null default '',
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists invoice_payments_invoice_paid_idx on public.invoice_payments(invoice_id, paid_at desc);

-- Every public table is explicitly protected and exposed only to authenticated actors.
alter table public.tutor_student_assignments enable row level security;
alter table public.session_reports enable row level security;
alter table public.monthly_evaluations enable row level security;
alter table public.student_tariffs enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;

grant select on public.tutor_student_assignments to authenticated;
grant insert, update, delete on public.tutor_student_assignments to authenticated;
grant select, insert, update, delete on public.session_reports to authenticated;
grant select, insert, update, delete on public.monthly_evaluations to authenticated;
grant select, insert, update on public.student_tariffs to authenticated;
grant select on public.invoice_items to authenticated;
grant select on public.invoice_payments to authenticated;
grant select, insert, update, delete on public.tutor_student_assignments to service_role;
grant select, insert, update, delete on public.session_reports to service_role;
grant select, insert, update, delete on public.monthly_evaluations to service_role;
grant select, insert, update, delete on public.student_tariffs to service_role;
grant select, insert, update, delete on public.invoice_items to service_role;
grant select, insert, update, delete on public.invoice_payments to service_role;

create policy tutor_student_assignments_read_related
  on public.tutor_student_assignments for select to authenticated
  using (
    private.is_admin_actor()
    or tutor_id = (select auth.uid())
    or student_id = (select auth.uid())
  );
create policy tutor_student_assignments_admin_manage
  on public.tutor_student_assignments for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());

create policy session_reports_admin_all
  on public.session_reports for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy session_reports_tutor_manage
  on public.session_reports for all to authenticated
  using (
    private.is_teacher_actor()
    and tutor_id = (select auth.uid())
    and exists (
      select 1 from public.meetings m
      join public.meeting_students ms on ms.meeting_id = m.id
      where m.id = session_reports.meeting_id
        and m.teacher_id = (select auth.uid())
        and ms.student_id = session_reports.student_id
    )
  )
  with check (
    private.is_teacher_actor()
    and tutor_id = (select auth.uid())
    and exists (
      select 1 from public.meetings m
      join public.meeting_students ms on ms.meeting_id = m.id
      where m.id = session_reports.meeting_id
        and m.teacher_id = (select auth.uid())
        and ms.student_id = session_reports.student_id
    )
  );
create policy session_reports_student_read_submitted
  on public.session_reports for select to authenticated
  using (student_id = (select auth.uid()) and status = 'submitted');

create policy monthly_evaluations_admin_all
  on public.monthly_evaluations for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy monthly_evaluations_tutor_manage_assigned
  on public.monthly_evaluations for all to authenticated
  using (
    private.is_teacher_actor()
    and tutor_id = (select auth.uid())
    and exists (
      select 1 from public.tutor_student_assignments a
      where a.tutor_id = (select auth.uid())
        and a.student_id = monthly_evaluations.student_id
        and a.status = 'active'
    )
  )
  with check (
    private.is_teacher_actor()
    and tutor_id = (select auth.uid())
    and exists (
      select 1 from public.tutor_student_assignments a
      where a.tutor_id = (select auth.uid())
        and a.student_id = monthly_evaluations.student_id
        and a.status = 'active'
    )
  );
create policy monthly_evaluations_student_read_published
  on public.monthly_evaluations for select to authenticated
  using (student_id = (select auth.uid()) and status = 'published');

create policy student_tariffs_admin_all
  on public.student_tariffs for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy student_tariffs_student_read
  on public.student_tariffs for select to authenticated
  using (student_id = (select auth.uid()));
create policy student_tariffs_tutor_read_assigned
  on public.student_tariffs for select to authenticated
  using (
    private.is_teacher_actor()
    and exists (
      select 1 from public.tutor_student_assignments a
      where a.tutor_id = (select auth.uid())
        and a.student_id = student_tariffs.student_id
        and a.status = 'active'
    )
  );

create policy invoice_items_admin_all
  on public.invoice_items for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy invoice_items_student_read_own
  on public.invoice_items for select to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.student_id = (select auth.uid())
        and i.status in ('sent','paid')
    )
  );
create policy invoice_payments_admin_all
  on public.invoice_payments for all to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy invoice_payments_student_read_own
  on public.invoice_payments for select to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_payments.invoice_id
        and i.student_id = (select auth.uid())
        and i.status in ('sent','paid')
    )
  );

-- Student project submission can only be created for an actively assigned module.
create policy challenge_submissions_student_insert_own_active
  on public.challenge_submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and review_note is null
    and exists (
      select 1
      from public.challenges c
      join public.topics t on t.id = c.topic_id
      join public.student_modules sm on sm.module_id = t.module_id
      where c.id = challenge_submissions.challenge_id
        and t.status = 'published'
        and sm.student_id = (select auth.uid())
        and sm.status = 'active'
    )
  );

create policy challenge_submissions_admin_review
  on public.challenge_submissions for update to authenticated
  using (private.is_admin_actor())
  with check (private.is_admin_actor());
create policy challenge_submissions_assigned_tutor_review
  on public.challenge_submissions for update to authenticated
  using (
    private.is_teacher_actor()
    and exists (
      select 1
      from public.challenge_submissions s
      join public.challenges c on c.id = s.challenge_id
      join public.topics t on t.id = c.topic_id
      join public.tutor_student_assignments a
        on a.student_id = s.student_id
       and a.tutor_id = (select auth.uid())
       and a.status = 'active'
      where s.id = challenge_submissions.id
        and t.id = c.topic_id
    )
  )
  with check (
    private.is_teacher_actor()
    and reviewed_by = (select auth.uid())
    and status in ('approved','needs_revision')
    and exists (
      select 1
      from public.tutor_student_assignments a
      where a.student_id = challenge_submissions.student_id
        and a.tutor_id = (select auth.uid())
        and a.status = 'active'
    )
  );

-- Keep the old summary invoice values intact. New canonical fields are additive.
comment on table public.tutor_student_assignments is 'Explicit current tutor-student assignment records; legacy meeting links are not auto-promoted to active assignments.';
comment on table public.session_reports is 'Versioned tutor session reports; student visibility is limited to submitted reports.';
comment on table public.monthly_evaluations is 'Versioned monthly tutor evaluations; students can only read published evaluations.';
comment on table public.invoice_items is 'Snapshot line items for invoice session details; historical invoices are not backfilled without verified session mapping.';
comment on table public.invoice_payments is 'Audited payment records; existing invoice status/history remains unchanged.';
