create or replace function public.create_draft_invoice(p_student_id uuid, p_period text)
returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_rate integer;
  v_start timestamptz;
  v_end timestamptz;
  v_total integer;
  v_attended integer;
  v_invoice public.invoices;
begin
  if not private.is_admin_actor() then
    raise exception 'Only admins can create invoices' using errcode = '42501';
  end if;
  if p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid invoice period' using errcode = '22023';
  end if;
  select amount_per_session into v_rate from public.student_tariffs where student_id = p_student_id;
  if v_rate is null then
    raise exception 'Student tariff is not configured' using errcode = 'P0002';
  end if;
  if exists(select 1 from public.invoices where student_id=p_student_id and month_year=p_period) then
    raise exception 'An invoice already exists for this student and period' using errcode = '23505';
  end if;
  v_start := make_timestamptz(substring(p_period,1,4)::int,substring(p_period,6,2)::int,1,0,0,0,'Asia/Jakarta');
  v_end := v_start + interval '1 month';

  select count(*), count(*) filter(where ms.attendance_status='hadir')
    into v_total,v_attended
  from public.meeting_students ms
  join public.meetings m on m.id=ms.meeting_id
  where ms.student_id=p_student_id and m.meeting_date>=v_start and m.meeting_date<v_end;

  insert into public.invoices(student_id,month_year,total_meetings,attended_meetings,price_per_meeting,total_amount,status,created_by,updated_by,updated_at,currency)
  values(p_student_id,p_period,v_total,v_attended,v_rate,v_attended*v_rate,'draft',v_actor,v_actor,now(),'IDR')
  returning * into v_invoice;

  insert into public.invoice_items(invoice_id,meeting_id,session_number,session_date,description,amount)
  select v_invoice.id,m.id,m.session_number,m.meeting_date,m.title,v_rate
  from public.meeting_students ms
  join public.meetings m on m.id=ms.meeting_id
  where ms.student_id=p_student_id
    and ms.attendance_status='hadir'
    and m.meeting_date>=v_start and m.meeting_date<v_end
  on conflict (invoice_id,meeting_id) where meeting_id is not null do nothing;

  return v_invoice;
end;
$$;

create or replace function public.update_draft_invoice(
  p_invoice_id uuid,
  p_discount_amount integer,
  p_additional_charges integer,
  p_adjustment_note text,
  p_meeting_ids integer[] default null
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
begin
  if not private.is_admin_actor() then
    raise exception 'Only admins can update invoices' using errcode='42501';
  end if;
  if p_discount_amount<0 or p_additional_charges<0 then
    raise exception 'Invoice adjustments cannot be negative' using errcode='22023';
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
  update public.invoices
  set attended_meetings=(select count(*) from public.invoice_items where invoice_id=p_invoice_id),
      total_amount=greatest(0,v_subtotal-p_discount_amount+p_additional_charges),
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

create or replace function public.issue_draft_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare v_invoice public.invoices;
begin
  if not private.is_admin_actor() then raise exception 'Only admins can issue invoices' using errcode='42501'; end if;
  update public.invoices
  set status='sent',issued_at=now(),issued_by=auth.uid(),updated_at=now(),updated_by=auth.uid()
  where id=p_invoice_id and status='draft' and total_amount>=0
  returning * into v_invoice;
  if not found then raise exception 'Draft invoice not found or already issued' using errcode='55000'; end if;
  return v_invoice;
end;
$$;

create or replace function public.mark_invoice_paid(p_invoice_id uuid, p_payment_method text default 'manual', p_reference text default null, p_notes text default '')
returns public.invoices
language plpgsql
security invoker
set search_path = ''
as $$
declare v_invoice public.invoices;
begin
  if not private.is_admin_actor() then raise exception 'Only admins can record invoice payments' using errcode='42501'; end if;
  select * into v_invoice from public.invoices where id=p_invoice_id for update;
  if not found or v_invoice.status<>'sent' then raise exception 'Only issued unpaid invoices can be marked paid' using errcode='55000'; end if;
  insert into public.invoice_payments(invoice_id,amount,payment_method,reference,notes,recorded_by)
  values(v_invoice.id,v_invoice.total_amount,coalesce(nullif(p_payment_method,''),'manual'),p_reference,coalesce(p_notes,''),auth.uid());
  update public.invoices set status='paid',paid_at=now(),updated_at=now(),updated_by=auth.uid()
  where id=p_invoice_id returning * into v_invoice;
  return v_invoice;
end;
$$;

revoke all on function public.create_draft_invoice(uuid,text) from public,anon;
revoke all on function public.update_draft_invoice(uuid,integer,integer,text,integer[]) from public,anon;
revoke all on function public.issue_draft_invoice(uuid) from public,anon;
revoke all on function public.mark_invoice_paid(uuid,text,text,text) from public,anon;
grant execute on function public.create_draft_invoice(uuid,text) to authenticated;
grant execute on function public.update_draft_invoice(uuid,integer,integer,text,integer[]) to authenticated;
grant execute on function public.issue_draft_invoice(uuid) to authenticated;
grant execute on function public.mark_invoice_paid(uuid,text,text,text) to authenticated;
