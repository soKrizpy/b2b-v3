import { expect, test } from "@playwright/test";

test.describe("Production quiz and lesson-progress contracts", () => {
  test("normalizes valid quiz answers and rejects duplicate question indexes", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { validateTopicQuizSubmission } = await import("/src/data/quiz-contract.ts");
      const valid = validateTopicQuizSubmission(146, [
        { questionIndex: 0, selectedIndex: 2 },
        { questionIndex: 1, selectedIndex: 0 }
      ]);
      let duplicateRejected = false;
      try {
        validateTopicQuizSubmission(146, [
          { questionIndex: 0, selectedIndex: 2 },
          { questionIndex: 0, selectedIndex: 1 }
        ]);
      } catch {
        duplicateRejected = true;
      }
      return { valid, duplicateRejected };
    });

    expect(result.valid).toEqual({
      topicId: 146,
      answers: [
        { questionIndex: 0, selectedIndex: 2 },
        { questionIndex: 1, selectedIndex: 0 }
      ]
    });
    expect(result.duplicateRejected).toBe(true);
  });

  test("rejects invalid quiz identifiers, indexes, and oversized answer payloads", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { validateTopicQuizSubmission } = await import("/src/data/quiz-contract.ts");
      const rejects = (topicId, answers) => {
        try {
          validateTopicQuizSubmission(topicId, answers);
          return false;
        } catch {
          return true;
        }
      };
      return {
        zeroTopic: rejects(0, [{ questionIndex: 0, selectedIndex: 0 }]),
        negativeQuestion: rejects(146, [{ questionIndex: -1, selectedIndex: 0 }]),
        negativeChoice: rejects(146, [{ questionIndex: 0, selectedIndex: -1 }]),
        fractionalIndex: rejects(146, [{ questionIndex: 0.5, selectedIndex: 0 }]),
        emptyAnswers: rejects(146, []),
        tooManyAnswers: rejects(146, Array.from({ length: 51 }, (_, questionIndex) => ({ questionIndex, selectedIndex: 0 })))
      };
    });

    expect(Object.values(result).every(Boolean)).toBe(true);
  });

  test("accepts a consistent quiz attempt result and rejects inconsistent scoring", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { mapTopicQuizAttemptResult } = await import("/src/data/quiz-contract.ts");
      const valid = mapTopicQuizAttemptResult({
        attemptNumber: 1,
        score: 67,
        correctCount: 2,
        totalQuestions: 3
      });
      let inconsistentRejected = false;
      let malformedRejected = false;
      try {
        mapTopicQuizAttemptResult({
          attemptNumber: 1,
          score: 100,
          correctCount: 2,
          totalQuestions: 3
        });
      } catch {
        inconsistentRejected = true;
      }
      try {
        mapTopicQuizAttemptResult(null);
      } catch {
        malformedRejected = true;
      }
      return { valid, inconsistentRejected, malformedRejected };
    });

    expect(result.valid).toEqual({
      attemptNumber: 1,
      score: 67,
      correctCount: 2,
      totalQuestions: 3
    });
    expect(result.inconsistentRejected).toBe(true);
    expect(result.malformedRejected).toBe(true);
  });

  test("maps a valid progress RPC row into the canonical client shape", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { mapStudentLessonProgressRow } = await import("/src/data/lesson-progress-rpc-contract.ts");
      return mapStudentLessonProgressRow({
        id: 12,
        student_id: "student-uuid",
        topic_id: 146,
        state: "in-progress",
        checkpoints: { watched: true, practice: false },
        submission_draft: { link: "https://example.test/project", notes: "Draft" },
        slide_index: 4,
        max_slide_index: 4,
        version: 3,
        updated_at: "2026-11-23T09:00:00.000Z"
      });
    });

    expect(result).toEqual({
      id: 12,
      studentId: "student-uuid",
      topicId: 146,
      state: "in-progress",
      checkpoints: { watched: true, practice: false },
      submissionDraft: { link: "https://example.test/project", notes: "Draft" },
      slideIndex: 4,
      maxSlideIndex: 4,
      version: 3,
      updatedAt: "2026-11-23T09:00:00.000Z"
    });
  });

  test("rejects malformed progress RPC rows and maps optimistic version conflicts", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const {
        mapStudentLessonProgressRow,
        resolveStudentLessonProgressRpc
      } = await import("/src/data/lesson-progress-rpc-contract.ts");
      const base = {
        id: 12,
        student_id: "student-uuid",
        topic_id: 146,
        state: "in-progress",
        checkpoints: { watched: true },
        submission_draft: null,
        slide_index: 4,
        max_slide_index: 4,
        version: 3,
        updated_at: "2026-11-23T09:00:00.000Z"
      };
      const rejects = (row) => {
        try {
          mapStudentLessonProgressRow(row);
          return false;
        } catch {
          return true;
        }
      };
      let conflictMessage = "";
      try {
        resolveStudentLessonProgressRpc(null, {
          code: "40001",
          message: "serialization failure"
        });
      } catch (error) {
        conflictMessage = error instanceof Error ? error.message : "";
      }
      return {
        invalidId: rejects({ ...base, id: 0 }),
        invalidCheckpoint: rejects({ ...base, checkpoints: { watched: "yes" } }),
        invalidDraft: rejects({ ...base, submission_draft: { link: 42 } }),
        invalidSlide: rejects({ ...base, slide_index: 201 }),
        invalidMaxSlide: rejects({ ...base, max_slide_index: 3 }),
        invalidVersion: rejects({ ...base, version: -1 }),
        zeroVersion: rejects({ ...base, version: 0 }),
        conflictMessage
      };
    });

    expect(result.invalidId).toBe(true);
    expect(result.invalidCheckpoint).toBe(true);
    expect(result.invalidDraft).toBe(true);
    expect(result.invalidSlide).toBe(true);
    expect(result.invalidVersion).toBe(true);
    expect(result.zeroVersion).toBe(true);
    expect(result.conflictMessage).toContain("perangkat lain");
  });
});
