create or replace function public.issue_draft_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare v_invoice public.invoices;
begin
  if not private.is_admin_actor() then
    raise exception 'Only admins can issue invoices' using errcode='42501';
  end if;
  update public.invoices
  set status='sent',issued_at=now(),issued_by=auth.uid(),updated_at=now(),updated_by=auth.uid()
  where id=p_invoice_id
    and status='draft'
    and total_amount>0
    and attended_meetings>0
  returning * into v_invoice;
  if not found then
    raise exception 'Draft invoice must contain at least one billable session and a positive total' using errcode='55000';
  end if;
  return v_invoice;
end;
$$;
revoke all on function public.issue_draft_invoice(uuid) from public,anon;
grant execute on function public.issue_draft_invoice(uuid) to authenticated;
