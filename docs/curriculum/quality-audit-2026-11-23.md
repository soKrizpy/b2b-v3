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


## Remediation progress — Batch 1: Begin to Scratch

Completed after the initial audit:

- Re-authored module 11 topics 11–16 (topic IDs 172–177) as a six-topic continuation.
- Each now has **5 topic-specific quiz questions**, each with four options and an authored answer key/explanation.
- Each now has **12 learning nodes** with concrete Scratch concepts, block-sequence examples, guided practice, independent testing, troubleshooting, and a project challenge.
- Updated the six matching `challenges` rows and kept their existing challenge IDs (103–108).
- Verified all six topics have the expected quiz/node counts, no short nodes under the audit's 80-character screening threshold, no invalid quiz option/index structures, and valid `activeChallengeIds` links.
- Before the rewrite, these six topics had zero `topic_progress` rows and zero `topic_quiz_attempts`; no learner history needed migration.
- The module's original topic IDs 28–41 and the six new IDs 172–177 remain unchanged.

Canonical batch file: `docs/curriculum/begin-to-scratch-quality-pass-1.json`.

Remaining newly added topics that still need this substantive rewrite: **22** (modules 20: 4, 27: 4, 28: 4, 29: 4, 30: 4, and 31: 2).

The ten pre-existing Begin to Scratch topics meet the 5-quiz and 10-node structural counts, but still require human review of content depth and answer-key semantics before this module can be called fully quality-approved.


## Remediation progress — current verified state (23 November 2026, later pass)

This section supersedes the earlier remediation counts and module-specific concerns above where they conflict.

### Production curriculum changes now applied

- All **28 newly added topics** have been substantively re-authored. Each has 5 topic-specific quiz questions, 12 learning nodes, concrete examples or demonstrations, guided and independent practice, troubleshooting, and a practical challenge.
- The 12 pre-existing Tinkercad foundation topics (module 30) were expanded from 9 to 12 nodes each. Added nodes are topic-specific worked examples, independent practice, and troubleshooting; existing challenge instructions were made specific.
- The original 10 Begin to Scratch topics had their concept/practice nodes rewritten with Scratch-specific explanations and tasks.
- The 12 original Scratch Visual Block Coding & Games topics had their guided-practice and recap nodes rewritten with topic-specific block sequences and test criteria. Their old quiz bank was also replaced with 60 authored questions because no production quiz attempts existed for those 12 topics.
- The 12 original ScratchJr topics had their generic challenge-node copy replaced with the actual challenge instructions from their linked challenge rows.
- The 16 HTML foundation topics and 14 pre-existing CSS/JavaScript topics had generic lesson-node copy rewritten with topic-specific concepts, examples, setup, practice, browser tests, and troubleshooting.
- The 86 previously short or empty learning-node contents were replaced with topic-specific instructions. The final structural screen now finds **zero** learning nodes with fewer than 80 characters.
- Repeated quiz questions were replaced. The final duplicate-question screen finds **zero** duplicated question texts across the 128 topics.

### Quiz history preservation

- For the 16 HTML foundation topics, 14 original CSS/JavaScript topics, and 10 original Begin to Scratch topics, revised quiz questions are stored as the current quiz while the prior question set is preserved in `lesson_content.legacyQuiz`.
- Those 40 topics are marked with `legacyQuizVersion=1` and `quizVersion=2`.
- Existing `topic_quiz_attempts` rows were not deleted or reset. Historical scores remain intact; the prior quiz arrays are retained for audit/reference.
- The 75 previously incorrect Basic Visual Web answer indexes were corrected. The 10 original Begin to Scratch topics also had their answer indexes corrected using the unique intended option in the old generated option template.
- Module 20's 12 old topics now have a new 60-question topic-specific quiz bank.
- All 28 new topics use newly authored questions and answer explanations.

### Sequence and capstone corrections

- Module 10 was reordered from HTML structure and content fundamentals through lists/tables/forms/semantics, then practical pages and profile project.
- Module 20's original Showcase Project (topic ID 107) is now topic 16, after clone, My Blocks, balancing, and debugging.
- Module 27's original product/printing capstone (topic ID 132) is now topic 16. The new documentation/presentation topic is a preparation skill, not a duplicate capstone.
- Module 28's original interactive-story capstone (topic ID 145) is now topic 16. The new last added topic is testing and presentation, not another final story project.
- Module 29's original Scratch capstone (topic ID 157) is now topic 16. The new topic 15 teaches playtesting/showcase.
- Module 30's original product capstone (topic ID 169) is now topic 16. The new topic 15 teaches model review/documentation.
- Module 31 places Responsive Design at topic 14, the Mini Website project at topic 15, and Portfolio Web Interaktif at topic 16.

### Latest production verification

The final aggregate SQL verification returned:

| Check | Result |
|---|---:|
| Modules | 8 |
| Published topics | 128 |
| Modules with exactly 16 contiguous topics | 8/8 |
| Topics with exactly 5 quiz questions | 128/128 |
| Topics with 10–20 learning nodes | 128/128 |
| Quiz items with invalid option count or answer index | 0 |
| Challenge-to-topic/activeChallengeIds mismatches | 0 |
| Learning nodes under 80 characters | 0 |
| Duplicate quiz question texts | 0 |
| Legacy quiz snapshots retained | 40 |
| Student progress rows | 21 (unchanged) |
| Quiz attempt rows | 55 (unchanged) |

Canonical content files are stored under `docs/curriculum/`, including:
- `begin-to-scratch-quality-pass-1.json`
- `scratch-visual-games-quality-pass-1.json`
- `3d-design-beginner-quality-pass-1.json`
- `scratchjr-quality-pass-1.json`
- `scratch-beginner-grade-4-6-quality-pass-1.json`
- `tinkercad-3d-beginner-quality-pass-1.json`
- `basic-visual-web-quality-pass-1.json`
- `tinkercad-3d-foundation-quality-pass-2.json`
- `basic-visual-web-html-quality-pass-1.json`
- `basic-visual-web-css-js-quality-pass-1.json`
- `scratch-visual-games-quiz-quality-pass-1.json`
- `begin-to-scratch-quiz-quality-pass-1.json`
- `basic-visual-web-quiz-quality-pass-1.json`

### Remaining quality gates — do not mark curriculum fully approved yet

The structural and duplicate-content checks pass, but this is not equivalent to a complete pedagogical sign-off. Remaining work:
1. Human semantic review of every existing quiz answer key and explanation, especially module 27's older quiz bank (which has a predictable answer-position pattern) and other pre-existing quizzes not fully re-authored.
2. Confirm age/grade alignment for every module against the approved course plan. Module 29's production sequence matches the SD 4–6 source set, but module-level grade metadata and the overall module progression still need a formal check.
3. Review lesson content and code examples in the actual student lesson UI, including responsive web examples and ScratchJr demonstration workflow.
4. Run a real student-account smoke test in the deployed preview after the curriculum content is reviewed. No Vercel deployment was made by this curriculum remediation.
5. Confirm that new quiz-version metadata is surfaced appropriately in student progress/reporting views; existing attempt rows remain untouched but do not themselves store a quiz-version field.

The curriculum is now structurally complete and the previously identified filler batches have been replaced, but **do not declare it 100% quality-approved** until these remaining gates are completed.
