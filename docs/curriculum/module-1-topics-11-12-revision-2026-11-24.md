# Module 10 — Topic 11–12 Revision Log (2026-11-24)

Module: **BASIC VISUAL WEB — HTML & Struktur Halaman** (module ID 10)

## Scope completed

- Topic 11 (ID 18): Margin dan Padding: Mengatur Ruang Elemen.
- Topic 12 (ID 19): Navigasi Bar: Menyusun Menu dengan CSS.
- Both topics retain their IDs, order, publication status, existing challenge arrays, and historical attempt rows.
- Both topics now contain 10 ordered learning nodes, 5 validated multiple-choice questions, and quizVersion 3.
- The previous quiz content is retained in `legacyQuiz` (5 questions per topic); it is not overwritten.
- Existing quiz attempts were not deleted, rewritten, or backfilled with guessed answers. Their original answer arrays were empty, so the exact historical question/answer mapping cannot be reconstructed.

## Topic 11 learning sequence

1. Tujuan Belajar
2. Empat Bagian Box Model
3. Padding vs Margin
4. Urutan Box Model
5. Contoh CSS Kartu
6. Mengatur Sisi
7. box-sizing
8. Praktik Dua Kartu
9. Uji dan Perbaiki
10. Rangkuman

## Topic 11 quiz coverage

- Padding versus margin
- Spacing between cards
- Box-model order
- box-sizing: border-box
- Diagnosing content too close to a border

## Topic 12 learning sequence

1. Tujuan Navigasi
2. Elemen nav
3. Tautan Anchor
4. Section Tujuan
5. Contoh Struktur
6. Tata Letak Flexbox
7. Hover dan Fokus
8. Praktik Tiga Menu
9. Uji Tautan
10. Rangkuman

## Topic 12 quiz coverage

- Semantic nav element
- href fragment and matching id
- Flexbox gap
- Keyboard navigation and visible focus
- Debugging an anchor destination

## Historical quiz integrity implementation

Migrations `20261124170000_add_topic_quiz_attempt_snapshots.sql` and `20261124180000_isolate_private_topic_quiz_snapshots.sql` add a nullable `quiz_version` to `topic_quiz_attempts` and a separate service-role-only `topic_quiz_attempt_snapshots` table.

- Existing rows remain NULL in these new fields and are explicitly treated as legacy history; no historical version is fabricated.
- The `student-submit-topic-quiz` Edge Function now reads the published `quizVersion`, validates question text/options/answer key, and calls a database transaction that stores the attempt and a snapshot of question text, options, correct index, and explanation together.
- Full snapshots are stored in `topic_quiz_attempt_snapshots`, a separate table with RLS enabled, no `anon`/`authenticated` SELECT grants, and only a `service_role` policy. Students can still read their own score/attempt rows without reading the answer key.
- Existing submission response shape remains unchanged for frontend compatibility.

## Validation

- Module 10 contains 16 published topics.
- All 16 topics have exactly 10 learning nodes, 5 quiz questions, and 1 challenge.
- All 16 topics retain 5 legacy quiz questions.
- All learning node IDs are present and unique within their topic.
- All quiz items have non-empty question text, exactly 4 non-empty options, and a valid answer index.
- Invalid quiz item count: 0.
- Topics 11–12 use quizVersion 3.
- Existing attempts were preserved.

## Deployment and verification

- Supabase project: `enfqoofluceqrlcjemfu`.
- Edge Function `student-submit-topic-quiz` version 4 was deployed first; version 5 with the private-snapshot transaction is pending its current CI check before deployment. Existing `verify_jwt=false` platform setting is preserved; the handler independently validates the bearer token with Supabase Auth.
- GitHub Actions typecheck/build/browser workflow passed for the function and migration commits.
- Live authenticated student submission and history rendering still require a real student session and a controlled student-side test. No test attempt was inserted during this revision.
