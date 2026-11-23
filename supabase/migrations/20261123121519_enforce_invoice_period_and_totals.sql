create unique index if not exists invoices_student_period_unique
  on public.invoices(student_id,month_year) where student_id is not null;

alter table public.invoices
  add constraint invoices_nonnegative_totals_check
    check(total_meetings >= 0 and attended_meetings >= 0 and attended_meetings <= total_meetings and total_amount >= 0);
