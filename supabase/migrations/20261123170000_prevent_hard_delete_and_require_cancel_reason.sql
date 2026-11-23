revoke delete on public.meetings from authenticated;

create or replace function private.stamp_meeting_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  if new.completion_status='cancelled' and old.completion_status is distinct from 'cancelled' then
    if length(btrim(coalesce(new.cancellation_reason,'')))=0 then
      raise exception 'A cancellation reason is required' using errcode='22023';
    end if;
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
    new.replacement_required := true;
  end if;
  if new.completion_status='soft_deleted' and old.completion_status is distinct from 'soft_deleted' then
    new.deleted_at := now();
    new.deleted_by := auth.uid();
    new.replacement_required := true;
  end if;
  return new;
end;
$$;
