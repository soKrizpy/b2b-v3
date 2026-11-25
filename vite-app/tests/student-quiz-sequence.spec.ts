import { expect, test } from "@playwright/test";

test.describe("Sequential comprehension quiz", () => {
  test("renders exactly one question at a time and advances by the active index", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { LessonWorkspace } = await import("/src/data/lesson-workspace-access.ts");
      const workspace = Object.create(LessonWorkspace.prototype) as {
        currentCheckQuestionIndex: number;
        renderComprehensionCheck: (stage: { questions: Array<Record<string, unknown>> }) => string;
      };
      const stage = {
        questions: Array.from({ length: 5 }, (_, index) => ({
          id: `question-${index + 1}`,
          type: "mcq",
          prompt: `Pertanyaan ${index + 1}`,
          options: [
            { id: "a", text: "Pilihan A", correct: true, explanation: "" },
            { id: "b", text: "Pilihan B", correct: false, explanation: "" }
          ]
        }))
      };

      workspace.currentCheckQuestionIndex = 0;
      const firstHtml = workspace.renderComprehensionCheck(stage);
      const first = document.createElement("div");
      first.innerHTML = firstHtml;

      workspace.currentCheckQuestionIndex = 1;
      const secondHtml = workspace.renderComprehensionCheck(stage);
      const second = document.createElement("div");
      second.innerHTML = secondHtml;

      workspace.currentCheckQuestionIndex = 4;
      const lastHtml = workspace.renderComprehensionCheck(stage);
      const last = document.createElement("div");
      last.innerHTML = lastHtml;

      return {
        firstCount: first.querySelectorAll(".quiz-container").length,
        firstPrompt: first.querySelector(".quiz-prompt")?.textContent,
        firstProgress: first.querySelector(".quiz-progress-label")?.textContent,
        nextInitiallyHidden: first.querySelector<HTMLButtonElement>("[data-quiz-next]")?.hidden,
        secondCount: second.querySelectorAll(".quiz-container").length,
        secondPrompt: second.querySelector(".quiz-prompt")?.textContent,
        secondProgress: second.querySelector(".quiz-progress-label")?.textContent,
        lastCount: last.querySelectorAll(".quiz-container").length,
        lastPrompt: last.querySelector(".quiz-prompt")?.textContent,
        lastHasNextButton: Boolean(last.querySelector("[data-quiz-next]")),
        lastHasCompletionNote: Boolean(last.querySelector(".quiz-completion-note"))
      };
    });

    expect(result).toEqual({
      firstCount: 1,
      firstPrompt: "Pertanyaan 1",
      firstProgress: "Soal 1 dari 5",
      nextInitiallyHidden: true,
      secondCount: 1,
      secondPrompt: "Pertanyaan 2",
      secondProgress: "Soal 2 dari 5",
      lastCount: 1,
      lastPrompt: "Pertanyaan 5",
      lastHasNextButton: false,
      lastHasCompletionNote: true
    });
  });

  test("restores stored quiz history instead of reopening an exhausted quiz", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { LessonWorkspace } = await import("/src/data/lesson-workspace-access.ts");
      const workspace = Object.create(LessonWorkspace.prototype) as {
        currentCheckQuestionIndex: number;
        quizSubmitted: boolean;
        quizAttemptHistory: Array<{ attemptNumber: number; score: number; submittedAt: string }>;
        renderComprehensionCheck: (stage: { questions: Array<Record<string, unknown>> }) => string;
      };
      workspace.currentCheckQuestionIndex = 0;
      workspace.quizSubmitted = true;
      workspace.quizAttemptHistory = [
        { attemptNumber: 1, score: 100, submittedAt: "2026-10-18T14:07:09.000Z" },
        { attemptNumber: 2, score: 40, submittedAt: "2026-10-25T11:40:30.000Z" }
      ];
      const host = document.createElement("div");
      host.innerHTML = workspace.renderComprehensionCheck({
        questions: [{ prompt: "Tidak boleh dibuka lagi", options: [] }]
      });
      return {
        quizCount: host.querySelectorAll(".quiz-container").length,
        bestScore: host.querySelector(".quiz-result-summary")?.textContent?.includes("100/100"),
        attemptsUsed: host.querySelector(".quiz-result-summary")?.textContent?.includes("2 dari 2")
      };
    });

    expect(result).toEqual({ quizCount: 0, bestScore: true, attemptsUsed: true });
  });

  test("hides quiz explanations until the student checks an answer", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { renderQuiz, attachInteractions } = await import("/src/content-renderer.js");
      const host = document.createElement("div");
      host.innerHTML = renderQuiz({
        id: "secure-feedback",
        question: "Pertanyaan",
        options: [
          { id: "a", text: "Benar", correct: true, explanation: "Penjelasan jawaban." },
          { id: "b", text: "Salah", correct: false, explanation: "Penjelasan jawaban." }
        ]
      });
      const before = Array.from(host.querySelectorAll<HTMLElement>(".quiz-explanation"))
        .every((element) => element.hidden);
      attachInteractions(host);
      host.querySelector<HTMLElement>(".quiz-option")?.click();
      host.querySelector<HTMLButtonElement>("[data-quiz-check]")?.click();
      const after = Array.from(host.querySelectorAll<HTMLElement>(".quiz-explanation"))
        .some((element) => !element.hidden);
      return { before, after };
    });

    expect(result).toEqual({ before: true, after: true });
  });

  test("does not render a next button for an empty quiz", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { LessonWorkspace } = await import("/src/data/lesson-workspace-access.ts");
      const workspace = Object.create(LessonWorkspace.prototype) as {
        currentCheckQuestionIndex: number;
        renderComprehensionCheck: (stage: { questions: Array<Record<string, unknown>> }) => string;
      };
      workspace.currentCheckQuestionIndex = 0;
      const host = document.createElement("div");
      host.innerHTML = workspace.renderComprehensionCheck({ questions: [] });
      return host.textContent?.trim();
    });

    expect(result).toBe("Belum ada soal evaluasi.");
  });
});
