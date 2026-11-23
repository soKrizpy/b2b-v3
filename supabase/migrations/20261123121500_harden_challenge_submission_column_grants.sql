-- Students may submit only their own project; tutors/admins may update review fields only.
revoke insert, update, delete on public.challenge_submissions from authenticated;
grant insert (challenge_id, student_id, submission_url, submission_note)
  on public.challenge_submissions to authenticated;
grant update (status, review_note, reviewed_by, reviewed_at)
  on public.challenge_submissions to authenticated;
