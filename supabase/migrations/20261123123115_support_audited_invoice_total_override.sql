drop function if exists public.update_draft_invoice(uuid,integer,integer,text,integer[]);

create function public.update_draft_invoice(
  p_invoice_id uuid,
  p_discount_amount integer,
  p_additional_charges integer,
  p_adjustment_note text,
  p_meeting_ids integer[] default null,
  p_manual_total integer default null
)
returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_start timestamptz;
  v_end timestamptz;
  v_subtotal integer;
  v_calculated_total integer;
begin
  if not private.is_admin_actor() then
    raise exception 'Only admins can update invoices' using errcode='42501';
  end if;
  if p_discount_amount<0 or p_additional_charges<0 or (p_manual_total is not null and p_manual_total<0) then
    raise exception 'Invoice amounts cannot be negative' using errcode='22023';
  end if;
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found or v_invoice.status<>'draft' then
    raise exception 'Only draft invoices can be updated' using errcode='55000';
  end if;

  if p_meeting_ids is not null then
    v_start := make_timestamptz(substring(v_invoice.month_year,1,4)::int,substring(v_invoice.month_year,6,2)::int,1,0,0,0,'Asia/Jakarta');
    v_end := v_start + interval '1 month';
    if exists (
      select 1 from unnest(p_meeting_ids) requested(id)
      where not exists (
        select 1 from public.meeting_students ms
        join public.meetings m on m.id=ms.meeting_id
        where ms.student_id=v_invoice.student_id
          and ms.meeting_id=requested.id
          and ms.attendance_status='hadir'
          and m.meeting_date>=v_start and m.meeting_date<v_end
      )
    ) then
      raise exception 'Selected sessions must be attended sessions for this student and period' using errcode='22023';
    end if;
    delete from public.invoice_items where invoice_id=p_invoice_id;
    insert into public.invoice_items(invoice_id,meeting_id,session_number,session_date,description,amount)
    select p_invoice_id,m.id,m.session_number,m.meeting_date,m.title,v_invoice.price_per_meeting
    from public.meetings m
    join public.meeting_students ms on ms.meeting_id=m.id
    where ms.student_id=v_invoice.student_id
      and ms.attendance_status='hadir'
      and m.id=any(p_meeting_ids);
  end if;

  select coalesce(sum(amount),0) into v_subtotal from public.invoice_items where invoice_id=p_invoice_id;
  v_calculated_total := greatest(0,v_subtotal-p_discount_amount+p_additional_charges);
  if p_manual_total is not null
     and p_manual_total <> v_calculated_total
     and length(btrim(coalesce(p_adjustment_note,'')))=0 then
    raise exception 'A reason is required when overriding the calculated invoice total' using errcode='22023';
  end if;

  update public.invoices
  set attended_meetings=(select count(*) from public.invoice_items where invoice_id=p_invoice_id),
      total_amount=coalesce(p_manual_total,v_calculated_total),
      discount_amount=p_discount_amount,
      additional_charges=p_additional_charges,
      adjustment_note=coalesce(p_adjustment_note,''),
      updated_at=now(),
      updated_by=auth.uid()
  where id=p_invoice_id
  returning * into v_invoice;
  return v_invoice;
end;
$$;
revoke all on function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) from public,anon;
grant execute on function public.update_draft_invoice(uuid,integer,integer,text,integer[],integer) to authenticated;
