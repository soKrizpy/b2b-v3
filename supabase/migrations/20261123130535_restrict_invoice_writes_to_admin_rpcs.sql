alter function public.create_draft_invoice(uuid,text) security definer;
alter function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) security definer;
alter function public.issue_draft_invoice(uuid) security definer;
alter function public.mark_invoice_paid(uuid,text,text,text) security definer;

-- All invoice writes must go through the actor-checked atomic RPCs above.
revoke insert, update, delete on public.invoices from authenticated;
revoke insert, update, delete on public.invoice_items from authenticated;
revoke insert, update, delete on public.invoice_payments from authenticated;
