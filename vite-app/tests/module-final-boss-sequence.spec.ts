import { expect, test } from "@playwright/test";

test.describe("Final Boss sequential question flow", () => {
  test("selects exactly one current question and preserves the question order", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { getCurrentAssessmentQuestion } = await import(
        "/src/data/module-assessment-sequence.ts"
      );
      const questions = Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        questionText: `Pertanyaan ${index + 1}`,
        options: { A: "Pilihan A", B: "Pilihan B", C: "Pilihan C", D: "Pilihan D" }
      }));
      return [0, 1, 2, 3, 4].map((index) =>
        getCurrentAssessmentQuestion(questions, index)?.questionText ?? null
      );
    });

    expect(result).toEqual([
      "Pertanyaan 1",
      "Pertanyaan 2",
      "Pertanyaan 3",
      "Pertanyaan 4",
      "Pertanyaan 5"
    ]);
  });

  test("returns no active question for an empty assessment and clamps invalid indexes", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { getCurrentAssessmentQuestion } = await import(
        "/src/data/module-assessment-sequence.ts"
      );
      const questions = [
        { id: 1, questionText: "Pertanyaan 1", options: { A: "", B: "", C: "", D: "" } },
        { id: 2, questionText: "Pertanyaan 2", options: { A: "", B: "", C: "", D: "" } }
      ];
      return {
        empty: getCurrentAssessmentQuestion([], 0),
        negative: getCurrentAssessmentQuestion(questions, -1)?.id,
        tooLarge: getCurrentAssessmentQuestion(questions, 99)?.id,
        notANumber: getCurrentAssessmentQuestion(questions, Number.NaN)?.id
      };
    });

    expect(result).toEqual({
      empty: null,
      negative: 1,
      tooLarge: 2,
      notANumber: 1
    });
  });
});
