import { expect, test } from "@playwright/test";

test.describe("Sequential comprehension quiz", () => {
  test("renders exactly one question at a time and advances by the active index", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { LessonWorkspace } = await import("/js/lesson-workspace.js");
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

  test("does not render a next button for an empty quiz", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { LessonWorkspace } = await import("/js/lesson-workspace.js");
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
