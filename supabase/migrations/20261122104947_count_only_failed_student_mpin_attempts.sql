CREATE OR REPLACE FUNCTION private.verify_student_mpin(p_phone text, p_mpin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions', 'private'
AS $function$
DECLARE
  v_digits text;
  v_phone text;
  v_identifier_hash text;
  v_hash text;
  v_attempts integer := 0;
  v_window_started_at timestamptz;
  v_locked_until timestamptz;
  v_now timestamptz := clock_timestamp();
  v_student_id uuid;
  v_matches integer;
BEGIN
  IF p_phone IS NULL OR p_mpin IS NULL OR p_mpin !~ '^[0-9]{6}$' THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_digits) < 10 OR length(v_digits) > 15 THEN
    RETURN NULL;
  END IF;

  -- Accept local 08..., international 628..., and the common mistaken +62 08... form.
  v_phone := CASE
    WHEN left(v_digits, 3) = '620' THEN '62' || substr(v_digits, 4)
    WHEN left(v_digits, 1) = '0' THEN '62' || substr(v_digits, 2)
    ELSE v_digits
  END;

  v_identifier_hash := encode(extensions.digest(v_phone, 'sha256'), 'hex');

  -- Serialize attempts for one normalized phone to prevent concurrent bypasses.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_identifier_hash, 0));

  SELECT attempts, window_started_at, locked_until
    INTO v_attempts, v_window_started_at, v_locked_until
  FROM private.student_login_attempts
  WHERE identifier_hash = v_identifier_hash
  FOR UPDATE;

  IF FOUND AND v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN NULL;
  END IF;

  IF NOT FOUND OR v_window_started_at < v_now - interval '15 minutes' THEN
    v_attempts := 0;
    v_window_started_at := v_now;
  END IF;

  SELECT count(*), min(s.id::text)::uuid, min(s.mpin)
    INTO v_matches, v_student_id, v_hash
  FROM public.students s
  JOIN public.profiles p ON p.id = s.id AND p.role = 'student'
  CROSS JOIN LATERAL (
    SELECT regexp_replace(
      coalesce(nullif(btrim(s.whatsapp), ''), nullif(btrim(s.email_or_phone), ''), ''),
      '[^0-9]', '', 'g'
    ) AS digits
  ) normalized
  WHERE (
    CASE
      WHEN left(normalized.digits, 3) = '620' THEN '62' || substr(normalized.digits, 4)
      WHEN left(normalized.digits, 1) = '0' THEN '62' || substr(normalized.digits, 2)
      ELSE normalized.digits
    END
  ) = v_phone;

  IF v_matches = 1 AND v_hash IS NOT NULL AND extensions.crypt(p_mpin, v_hash) = v_hash THEN
    DELETE FROM private.student_login_attempts
    WHERE identifier_hash = v_identifier_hash;
    RETURN v_student_id;
  END IF;

  -- Only a failed credential check increments the counter.
  v_attempts := v_attempts + 1;
  INSERT INTO private.student_login_attempts (
    identifier_hash, attempts, window_started_at, locked_until
  )
  VALUES (
    v_identifier_hash,
    v_attempts,
    v_window_started_at,
    CASE WHEN v_attempts >= 5 THEN v_now + interval '15 minutes' ELSE NULL END
  )
  ON CONFLICT (identifier_hash) DO UPDATE
  SET attempts = EXCLUDED.attempts,
      window_started_at = EXCLUDED.window_started_at,
      locked_until = EXCLUDED.locked_until;

  RETURN NULL;
END;
$function$;
