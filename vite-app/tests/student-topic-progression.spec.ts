import { expect, test } from "@playwright/test";

test("production lesson stages unlock sequentially and optional stages require an explicit skip", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { LessonWorkspace } = await import("/src/data/lesson-workspace-access.ts");
    const container = document.createElement("div");
    container.id = "topic-progression-workspace";
    document.body.append(container);

    const stageProgress: Array<{ stageKey: string; status: string }> = [];
    const completionCalls: Array<{ stageKey: string; status: string }> = [];
    const bridge = {
      getLessonProgress: async () => ({
        state: "not-started",
        checkpoints: {},
        submissionDraft: null,
        slideIndex: 0,
        maxSlideIndex: 0,
        version: 1
      }),
      getTopicStageProgress: async () => stageProgress,
      getStudentLessonSubmission: async () => null,
      saveLessonProgress: async (_studentId: string, _lessonId: string, updates: Record<string, unknown>) => ({
        ...updates,
        maxSlideIndex: Math.max(0, Number(updates.slideIndex) || 0)
      }),
      completeTopicStage: async (_studentId: string, _lessonId: string, stageKey: string, status = "completed") => {
        completionCalls.push({ stageKey, status });
        const existing = stageProgress.find((stage) => stage.stageKey === stageKey);
        if (existing) existing.status = status;
        else stageProgress.push({ stageKey, status });
        return { stage_key: stageKey, status };
      },
      submitTopicQuizAttempt: async () => ({ score: 100, correctCount: 1, totalQuestions: 1, attemptNumber: 1 }),
      subscribe: () => () => {}
    };
    const lesson = {
      id: "topic-146",
      topicId: 146,
      title: "Mengenal Sprite",
      description: "Memahami sprite.",
      subtitle: "Memahami sprite.",
      category: "Scratch",
      trackTitle: "Scratch Beginner",
      skillLevel: "Beginner",
      estimatedDurationMinutes: 30,
      learningObjectives: [],
      stages: [
        { id: "brief", number: 1, title: "Brief", content: { overview: "Tujuan topik." } },
        { id: "materials", number: 2, title: "Materials", slides: [
          { title: "Slide 1", type: "concept", content: [] },
          { title: "Slide 2", type: "concept", content: [] }
        ] },
        { id: "practice", number: 3, title: "Practice", content: { checkpoints: [
          { id: "topic-146-checkpoint-1", title: "Langkah", description: "Selesaikan langkah." }
        ] } },
        { id: "check", number: 4, title: "Check", questions: [{
          id: "topic-146-quiz-1",
          questionIndex: 0,
          type: "mcq",
          prompt: "Apa itu sprite?",
          options: [{ id: "option-1", text: "Karakter", correct: true }, { id: "option-2", text: "Latar", correct: false }]
        }] },
        { id: "challenge", number: 5, title: "Challenge", challenge: { title: "Proyek", requirements: [] } },
        { id: "submission", number: 6, title: "Submission", submission: { allowedMethods: [] } }
      ]
    };
    const workspace = new LessonWorkspace(container, lesson, { id: "student-1", name: "Siswa", role: "student" }, {
      learning: bridge
    }, {
      repositoryMode: "production",
      parentHubEnabled: false,
      submissionEnabled: true
    });
    await workspace.init();
    (window as Window & { __topicProgressionFixture?: { workspace: unknown; completionCalls: typeof completionCalls } })
      .__topicProgressionFixture = { workspace, completionCalls };
  });

  await page.getByRole("button", { name: "Lanjutkan Misi" }).click();
  const materialsTab = page.locator('#stage-nav [data-stage-index="1"]');
  await expect(materialsTab).toBeDisabled();
  await page.getByRole("button", { name: /Selesaikan & lanjut ke Materials/ }).click();
  await expect(page.getByRole("heading", { name: "Materials" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Selesaikan & lanjut ke Practice/ })).toBeDisabled();

  await page.getByRole("button", { name: "Selanjutnya" }).click();
  await expect(page.getByText("Slide 2 / 2")).toBeVisible();
  await page.getByRole("button", { name: /Selesaikan & lanjut ke Practice/ }).click();
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Tandai Langkah selesai" }).click();
  await expect(page.getByRole("button", { name: /Selesaikan & lanjut ke Check/ })).toBeEnabled();
  await page.getByRole("button", { name: /Selesaikan & lanjut ke Check/ }).click();
  await expect(page.getByRole("heading", { name: "Check" })).toBeVisible();
  await expect(page.locator(".quiz-container")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Selesaikan & lanjut ke Challenge/ })).toBeDisabled();
  await page.locator(".quiz-option").first().click();
  await page.getByRole("button", { name: /Periksa Jawaban/ }).click();
  await expect(page.getByRole("button", { name: /Selesaikan & lanjut ke Challenge/ })).toBeEnabled();
  await page.getByRole("button", { name: /Selesaikan & lanjut ke Challenge/ }).click();

  await expect(page.getByRole("heading", { name: "Challenge" })).toBeVisible();
  await page.getByRole("button", { name: "Lewati tahapan opsional" }).click();
  await expect(page.getByRole("heading", { name: "Submission" })).toBeVisible();
  await page.getByRole("button", { name: "Lewati tahapan opsional" }).click();

  const completions = await page.evaluate(() =>
    (window as Window & { __topicProgressionFixture?: { completionCalls: Array<{ stageKey: string; status: string }> } })
      .__topicProgressionFixture?.completionCalls
  );
  expect(completions).toEqual([
    { stageKey: "brief", status: "completed" },
    { stageKey: "materials", status: "completed" },
    { stageKey: "practice", status: "completed" },
    { stageKey: "check", status: "completed" },
    { stageKey: "challenge", status: "skipped" },
    { stageKey: "submission", status: "skipped" }
  ]);
});
