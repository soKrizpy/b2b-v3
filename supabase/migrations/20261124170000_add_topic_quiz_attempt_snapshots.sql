alter table public.topic_quiz_attempts
  add column if not exists quiz_version integer,
  add column if not exists quiz_snapshot jsonb;

alter table public.topic_quiz_attempts
  drop constraint if exists topic_quiz_attempts_quiz_version_check;

alter table public.topic_quiz_attempts
  add constraint topic_quiz_attempts_quiz_version_check
  check (quiz_version is null or quiz_version > 0);

comment on column public.topic_quiz_attempts.quiz_version is
  'Immutable quiz content version used for this attempt; NULL denotes a legacy attempt without a recorded version.';

comment on column public.topic_quiz_attempts.quiz_snapshot is
  'Immutable server-captured question/options/answer-key snapshot for this attempt; NULL denotes legacy history that cannot be reconstructed.';
