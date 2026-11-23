alter function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) security definer;
alter function public.create_replacement_meeting(integer,timestamptz,integer,text) security definer;

revoke insert, update, delete on public.meetings from authenticated;
grant update (completion_status,cancellation_reason) on public.meetings to authenticated;

revoke insert, delete on public.meeting_students from authenticated;

create or replace function private.stamp_meeting_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.completion_status in ('selesai','terlewat','cancelled','soft_deleted')
     and new.completion_status is distinct from old.completion_status then
    raise exception 'A terminal meeting state cannot be reopened or changed; create a replacement when needed'
      using errcode = '55000';
  end if;

  if old.completion_status = 'cancelled'
     and new.cancellation_reason is distinct from old.cancellation_reason then
    raise exception 'A cancellation reason is immutable after cancellation'
      using errcode = '55000';
  end if;

  new.updated_at := now();
  new.version := old.version + 1;

  if new.completion_status = 'selesai' then
    new.is_completed := true;
  elsif new.completion_status = 'terlewat' then
    new.is_completed := true;
  end if;

  if new.completion_status = 'cancelled'
     and old.completion_status is distinct from 'cancelled' then
    if length(btrim(coalesce(new.cancellation_reason,''))) = 0 then
      raise exception 'A cancellation reason is required' using errcode = '22023';
    end if;
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
    new.replacement_required := true;
  end if;

  if new.completion_status = 'soft_deleted'
     and old.completion_status is distinct from 'soft_deleted' then
    new.deleted_at := now();
    new.deleted_by := auth.uid();
    new.replacement_required := true;
  end if;

  return new;
end;
$$;

revoke all on function private.stamp_meeting_lifecycle() from public,anon,authenticated;

revoke all on function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) from public,anon;
revoke all on function public.create_replacement_meeting(integer,timestamptz,integer,text) from public,anon;
grant execute on function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) to authenticated;
grant execute on function public.create_replacement_meeting(integer,timestamptz,integer,text) to authenticated;

comment on function private.stamp_meeting_lifecycle() is
  'Enforces terminal meeting-state transitions and stamps server-owned lifecycle audit fields.';
comment on function public.create_recurring_meeting_series(uuid,uuid,date,time,integer[],integer,integer,text) is
  'Privileged scheduling RPC. Performs explicit actor, assignment, conflict, and serialization checks before creating meetings and roster links.';
comment on function public.create_replacement_meeting(integer,timestamptz,integer,text) is
  'Privileged replacement RPC. Performs explicit actor, replacement-state, conflict, and serialization checks before creating the replacement.';
