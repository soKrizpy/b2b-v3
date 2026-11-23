-- Close legacy PUBLIC/anon table grants and narrow policies to their intended roles.
-- RLS remains the row-level authorization boundary for authenticated users.

-- Remove inherited/default public access from every public-schema table.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Authenticated users retain table-level capabilities; RLS policies decide rows/actions.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Anonymous access is limited to explicitly public read-only content.
GRANT SELECT ON TABLE public.announcements TO anon;
GRANT SELECT ON TABLE public.game_items TO anon;
GRANT SELECT ON TABLE public.pet_cosmetics TO anon;

-- The service-role policy on quiz attempts was mistakenly assigned to PUBLIC.
DROP POLICY IF EXISTS "Service role can manage quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Service role can manage quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ownership policies should apply only to authenticated sessions, not the PUBLIC pseudo-role.
DROP POLICY IF EXISTS "cert_student_select" ON public.certificates;
CREATE POLICY "cert_student_select" ON public.certificates
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "challenge_submissions_student_select" ON public.challenge_submissions;
CREATE POLICY "challenge_submissions_student_select" ON public.challenge_submissions
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Students can view own quiz attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id);

DROP POLICY IF EXISTS "tqa_student_select" ON public.topic_quiz_attempts;
CREATE POLICY "tqa_student_select" ON public.topic_quiz_attempts
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view their own profile." ON public.students;
CREATE POLICY "Users can view their own profile." ON public.students
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "student_pets_select_own" ON public.student_pets;
CREATE POLICY "student_pets_select_own" ON public.student_pets
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id);

DROP POLICY IF EXISTS "student_pets_insert_own" ON public.student_pets;
CREATE POLICY "student_pets_insert_own" ON public.student_pets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = student_id);

DROP POLICY IF EXISTS "student_pets_update_own" ON public.student_pets;
CREATE POLICY "student_pets_update_own" ON public.student_pets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = student_id)
  WITH CHECK ((SELECT auth.uid()) = student_id);
