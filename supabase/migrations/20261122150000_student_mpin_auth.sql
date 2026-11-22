create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.student_login_attempts (
  identifier_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table private.student_login_attempts enable row level security;
revoke all on private.student_login_attempts from public, anon, authenticated, service_role;

update public.students
set mpin = extensions.crypt(btrim(mpin::text), extensions.gen_salt('bf', 12))
where mpin is not null
  and btrim(mpin::text) ~ '^[0-9]{6}$'
  and btrim(mpin::text) not like '$2%';

create or replace function private.verify_student_mpin(p_phone text, p_mpin text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, private
as $$
declare
  v_digits text;
  v_phone text;
  v_hash text;
  v_attempts integer;
  v_locked_until timestamptz;
  v_student_id uuid;
  v_matches integer;
begin
  if p_phone is null or p_mpin is null or p_mpin !~ '^[0-9]{6}$' then
    return null;
  end if;

  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if length(v_digits) < 10 or length(v_digits) > 15 then
    return null;
  end if;

  v_phone := case
    when left(v_digits, 1) = '0' then '62' || substr(v_digits, 2)
    else v_digits
  end;

  insert into private.student_login_attempts (identifier_hash, attempts, window_started_at, locked_until)
  values (encode(extensions.digest(v_phone, 'sha256'), 'hex'), 1, now(), null)
  on conflict (identifier_hash) do update
  set attempts = case
        when private.student_login_attempts.window_started_at < now() - interval '15 minutes' then 1
        else private.student_login_attempts.attempts + 1
      end,
      window_started_at = case
        when private.student_login_attempts.window_started_at < now() - interval '15 minutes' then now()
        else private.student_login_attempts.window_started_at
      end,
      locked_until = case
        when private.student_login_attempts.locked_until > now() then private.student_login_attempts.locked_until
        when private.student_login_attempts.window_started_at < now() - interval '15 minutes' then null
        when private.student_login_attempts.attempts + 1 >= 5 then now() + interval '15 minutes'
        else null
      end
  returning attempts, locked_until into v_attempts, v_locked_until;

  if v_attempts > 5 or v_locked_until > now() then
    return null;
  end if;

  select count(*), min(s.id::text)::uuid, min(s.mpin::text)
    into v_matches, v_student_id, v_hash
  from public.students s
  join public.profiles p on p.id = s.id and p.role = 'student'
  where (
    case
      when left(regexp_replace(coalesce(s.whatsapp, s.email_or_phone, ''), '[^0-9]', '', 'g'), 1) = '0'
        then '62' || substr(regexp_replace(coalesce(s.whatsapp, s.email_or_phone, ''), '[^0-9]', '', 'g'), 2)
      else regexp_replace(coalesce(s.whatsapp, s.email_or_phone, ''), '[^0-9]', '', 'g')
    end
  ) = v_phone;

  if v_matches <> 1 or v_hash is null or extensions.crypt(p_mpin, v_hash) <> v_hash then
    return null;
  end if;

  delete from private.student_login_attempts
  where identifier_hash = encode(extensions.digest(v_phone, 'sha256'), 'hex');

  return v_student_id;
end;
$$;

revoke all on function private.verify_student_mpin(text, text) from public, anon, authenticated;
grant execute on function private.verify_student_mpin(text, text) to service_role;
