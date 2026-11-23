# Curriculum Quality Audit — 23 November 2026

Repository: `soKrizpy/b2b-v3`
Branch: `preview`
Production data source: active Supabase project `enfqoofluceqrlcjemfu`

## Executive verdict

The 16-topic count is now structurally correct, but the curriculum is **not yet quality-approved for student use**. A count of 16 was achieved by appending 28 newly generated topics. Those additions were not authored to the previously agreed content standard and several modules have sequencing/capstone duplication concerns. Existing content also contains template-generated filler and quiz answer-key errors.

The agreed topic standard:
- A topic teaches a distinct, age-appropriate concept in a sensible sequence.
- Include a clear concept, concrete example, guided practical steps, independent practice, topic-specific troubleshooting, and observable success criteria.
- Exactly 5 formative quiz questions per topic, each with 4 options and a correct answer/explanation.
- One meaningful practical challenge/tryout.
- 10–20 substantive learning nodes; repeated generic text does not count as substantive.
- Preserve existing topic IDs, progress, attempts, submissions, and assignments when revising.

## Verified database snapshot

- 8 active modules, 128 published topics.
- Exactly 16 topics in each module.
- All module order indexes are now contiguous (four modules use 1–16; four use 0–15).
- Every topic has a challenge row and a matching active challenge reference.
- No topic or student learning-history rows were deleted by this audit's corrections.

## Confirmed quality gaps

### 1. The 28 added topics do not meet the agreed standard

The newly added topics have only 3 quiz questions and 8 learning-path nodes each, not 5 questions and 10–20 substantive nodes.

| Module ID | Module | Added topics needing substantive rewrite |
|---:|---|---:|
| 11 | Begin to Scratch | 6 |
| 20 | Scratch Visual Block Coding & Games | 4 |
| 27 | 3D Design Beginner | 4 |
| 28 | ScratchJr | 4 |
| 29 | Scratch Beginner | 4 |
| 30 | Tinkercad 3D Beginner | 4 |
| 31 | Basic Visual Web — CSS & JavaScript | 2 |
| **Total** | | **28** |

These 28 additions need 2 more topic-specific quiz questions each, expanded lesson nodes with concrete examples and troubleshooting, and a pedagogically reviewed sequence. Merely increasing node/question counts by duplicating text is not acceptable.

### 2. Basic Visual Web uses repetitive template material

Module 10 and the 14 pre-existing topics now in module 31 have 11 nodes and 5 quizzes each, but a number of nodes are generic boilerplate rather than topic-specific instruction. For example, preparation and debugging steps mention HTML, CSS, JavaScript, links, images, and browser console indiscriminately even when a topic only teaches one narrow concept. The first module's sequence also places some CSS and project topics before foundational HTML topics, so the 30-topic course needs a deliberate sequence review.

### 3. Quiz answer keys were materially wrong

A deterministic review of the generated quiz template found that its distractors were reused consistently, allowing the intended correct option to be identified unambiguously.

- Module 10: 40 of 80 answer indexes were wrong.
- Module 31: 35 of 70 pre-existing quiz answer indexes were wrong.
- Total corrected: **75 incorrect answer indexes**.
- The 6 quiz questions on the two newest module-31 topics use a different option set and were not changed by this correction. They remain part of the content rewrite.

The correction changed only `lesson_content.quiz[].answer_index` on topics in modules 10 and 31. It did not change question text, topic IDs, student progress, or quiz-attempt rows. A repeat query returned zero remaining mismatches for all 150 questions where the unique correct option could be identified from the generated template.

### 4. Module order gaps

Modules 28, 29, and 30 had a missing order index 12: their 4 new topics started at 13 and ended at 16. The indexes were corrected to 12–15. A fresh verification confirms all 8 modules now have 16 distinct, contiguous order indexes.

### 5. Module-specific pedagogical concerns to resolve

- **Begin to Scratch (11):** the added topics move quickly from introductory projects into broadcast, obstacle games, lives/timers, levels, and a capstone. Review whether this progression remains appropriate for the intended beginner age/grade and does not duplicate the next Scratch game-development module.
- **Scratch Visual Block Coding & Games (20):** the existing Showcase Project was topic 12, followed by four newly appended advanced concepts. Review whether the showcase should become the true final capstone after clone patterns, custom blocks, balancing, and debugging.
- **3D Design Beginner (27):** the original topic 12 is already a finished racing-car print project; the new sequence adds modular design, precision measurement, iteration, and another final product. Review duplication and reorder the capstone after the extension skills.
- **ScratchJr (28):** the original topic 12 is already an interactive-story capstone; the new topic 16 is another interactive-story capstone. Consolidate the capstone objectives without deleting the original topic ID or history.
- **Scratch Beginner (29):** the original topic 12 is already a Scratch project capstone; the new topics 13–16 introduce game design, timers/lives, levels, and another game capstone. Reorder and distinguish the capstones. The canonical files available in the Library also contain different target grades (one version SD 1–3, another partial set SD 4–6); the intended grade mapping for this production module must be resolved from the approved course plan before rewriting.
- **Tinkercad 3D Beginner (30):** the original 12 topics have 9 nodes each, below the 10–20 node standard. The new four topics have 8 nodes and 3 quizzes each. The existing topic 12 is already a final product project, so the new topic 16 needs a distinct culminating purpose or the sequence must be reorganized.

## Corrections already applied in active Supabase

1. Corrected the 75 answer indexes described above in modules 10 and 31.
2. Corrected the order indexes for the four new topics in modules 28, 29, and 30 so every module has a contiguous sequence.

No topic IDs were deleted or recreated. No student progress, quiz attempts, submissions, meetings, or assignments were changed.

## Not yet quality-approved

- The 28 new topics still require full authoring to 5 quizzes and 10–20 substantive nodes.
- The 12 existing Tinkercad topics need at least one substantive node added each, after reviewing the current content.
- Basic Visual Web topics require a topic-by-topic rewrite of generic slides and a prerequisite-aware sequence review.
- All other existing quizzes and answer keys require semantic review, not only schema validation.
- Grade/age alignment and the module-level beginner/intermediate labels need confirmation against the approved course plan.
- Final Boss/module assessments are still a separate issue: earlier audit found two assessment records with zero questions.

## Safe revision rules

- Do not delete, replace, or renumber topic IDs that may have learning history.
- Do not reset `topic_progress`, `topic_quiz_attempts`, submissions, certificates, or meeting associations.
- Keep the canonical JSON as the source of truth and validate it before syncing to Supabase.
- Revise in module-sized batches; after each batch, validate question count, option count, answer key, node substance, example, troubleshooting, challenge, and sequence.
- Do not declare the curriculum complete based on row counts or JSON shape alone.
