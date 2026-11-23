alter function public.create_draft_invoice(uuid,text) set schema private;
alter function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) set schema private;
alter function public.issue_draft_invoice(uuid) set schema private;
alter function public.mark_invoice_paid(uuid,text,text,text) set schema private;

alter function private.create_draft_invoice(uuid,text) security definer;
alter function private.update_draft_invoice(uuid,integer,integer,text,integer[],integer) security definer;
alter function private.issue_draft_invoice(uuid) security definer;
alter function private.mark_invoice_paid(uuid,text,text,text) security definer;

grant usage on schema private to authenticated;
revoke all on function private.create_draft_invoice(uuid,text) from public,anon;
revoke all on function private.update_draft_invoice(uuid,integer,integer,text,integer[],integer) from public,anon;
revoke all on function private.issue_draft_invoice(uuid) from public,anon;
revoke all on function private.mark_invoice_paid(uuid,text,text,text) from public,anon;
grant execute on function private.create_draft_invoice(uuid,text) to authenticated;
grant execute on function private.update_draft_invoice(uuid,integer,integer,text,integer[],integer) to authenticated;
grant execute on function private.issue_draft_invoice(uuid) to authenticated;
grant execute on function private.mark_invoice_paid(uuid,text,text,text) to authenticated;

create or replace function public.create_draft_invoice(p_student_id uuid,p_period text)
returns public.invoices language sql security invoker set search_path=''
as $$ select private.create_draft_invoice(p_student_id,p_period); $$;
create or replace function public.update_draft_invoice(
  p_invoice_id uuid,p_discount_amount integer,p_additional_charges integer,p_adjustment_note text,
  p_meeting_ids integer[],p_manual_total integer
)
returns public.invoices language sql security invoker set search_path=''
as $$ select private.update_draft_invoice(p_invoice_id,p_discount_amount,p_additional_charges,p_adjustment_note,p_meeting_ids,p_manual_total); $$;
create or replace function public.issue_draft_invoice(p_invoice_id uuid)
returns public.invoices language sql security invoker set search_path=''
as $$ select private.issue_draft_invoice(p_invoice_id); $$;
create or replace function public.mark_invoice_paid(p_invoice_id uuid,p_payment_method text,p_reference text,p_notes text)
returns public.invoices language sql security invoker set search_path=''
as $$ select private.mark_invoice_paid(p_invoice_id,p_payment_method,p_reference,p_notes); $$;

revoke all on function public.create_draft_invoice(uuid,text) from public,anon;
revoke all on function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) from public,anon;
revoke all on function public.issue_draft_invoice(uuid) from public,anon;
revoke all on function public.mark_invoice_paid(uuid,text,text,text) from public,anon;
grant execute on function public.create_draft_invoice(uuid,text) to authenticated;
grant execute on function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) to authenticated;
grant execute on function public.issue_draft_invoice(uuid) to authenticated;
grant execute on function public.mark_invoice_paid(uuid,text,text,text) to authenticated;
