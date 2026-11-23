-- Backfill historical invoice line items only where current completed/attended sessions
-- exactly match the stored invoice attended_meetings count. Do not alter totals, status, or payments.
with eligible_invoices as (
  select i.id, i.student_id, i.month_year, i.attended_meetings, i.price_per_meeting
  from public.invoices i
  join public.meeting_students ms on ms.student_id=i.student_id and ms.attendance_status='hadir'
  join public.meetings m on m.id=ms.meeting_id
    and m.completion_status='selesai'
    and m.deleted_at is null
    and m.meeting_date >= make_timestamptz(
      substring(i.month_year,1,4)::int,
      substring(i.month_year,6,2)::int,
      1,0,0,0,'Asia/Jakarta'
    )
    and m.meeting_date < make_timestamptz(
      substring(i.month_year,1,4)::int,
      substring(i.month_year,6,2)::int,
      1,0,0,0,'Asia/Jakarta'
    ) + interval '1 month'
  where i.attended_meetings > 0
  group by i.id
  having count(distinct m.id)=i.attended_meetings
)
insert into public.invoice_items(
  invoice_id,meeting_id,session_number,session_date,description,amount
)
select e.id,m.id,m.session_number,m.meeting_date,m.title,e.price_per_meeting
from eligible_invoices e
join public.meeting_students ms on ms.student_id=e.student_id and ms.attendance_status='hadir'
join public.meetings m on m.id=ms.meeting_id
  and m.completion_status='selesai'
  and m.deleted_at is null
  and m.meeting_date >= make_timestamptz(
    substring(e.month_year,1,4)::int,
    substring(e.month_year,6,2)::int,
    1,0,0,0,'Asia/Jakarta'
  )
  and m.meeting_date < make_timestamptz(
    substring(e.month_year,1,4)::int,
    substring(e.month_year,6,2)::int,
    1,0,0,0,'Asia/Jakarta'
  ) + interval '1 month'
on conflict (invoice_id,meeting_id) where meeting_id is not null do nothing;

comment on table public.invoice_items is
  'Snapshot line items for invoice session details. Legacy items were backfilled only when completed/attended meeting counts exactly matched stored invoice attendance; invoice totals and payment history were never rewritten.';
