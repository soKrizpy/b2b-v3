import { expect, test } from "@playwright/test";

test.describe("Supabase curriculum lesson adapter", () => {
  test("maps ordered learning steps, formative quiz, challenge, and required tool", async ({ page }) => {
    await page.goto("/");
    const lesson = await page.evaluate(async () => {
      const { adaptSupabaseTopicToLegacyLesson } = await import("/src/data/supabase-lesson-adapter.ts");
      return adaptSupabaseTopicToLegacyLesson(
        {
          id: 29,
          title: "Scratch Beginner",
          description: "Belajar Scratch bertahap",
          sortOrder: 29,
          isPublished: true
        },
        {
          id: 146,
          moduleId: 29,
          title: "Mengenal Sprite",
          description: "Memahami sprite dan panggung",
          sortOrder: 0,
          lessonContent: {
            estimatedDurationMinutes: 35,
            learningPath: [
              { id: "step-2", order: 2, title: "Langkah kedua", content: "Isi kedua" },
              { id: "step-1", order: 1, title: "Langkah pertama", content: "Isi pertama" }
            ],
            quiz: [
              {
                question: "Apa itu sprite?",
                options: ["Karakter", "Latar", "Suara", "Blok"],
                answer_index: 0,
                explanation: "Sprite adalah objek atau karakter."
              }
            ],
            challenge: [
              {
                title: "Buat sprite bergerak",
                instructions: "Pilih sprite.\nTambahkan blok gerak.",
                submission_type: "Tautan proyek"
              }
            ],
            requiredTool: {
              name: "Scratch",
              url: "https://scratch.mit.edu",
              instructions: "Buka editor Scratch."
            }
          }
        }
      );
    });

    expect(lesson.id).toBe("topic-146");
    expect(lesson.topicId).toBe(146);
    expect(lesson.estimatedDurationMinutes).toBe(35);
    expect(lesson.stages).toHaveLength(6);
    expect(lesson.stages[1].slides.map((slide) => slide.title)).toEqual([
      "Langkah pertama",
      "Langkah kedua"
    ]);
    expect(lesson.stages[3].questions[0]).toMatchObject({
      prompt: "Apa itu sprite?",
      options: [
        { text: "Karakter", correct: true },
        { text: "Latar", correct: false },
        { text: "Suara", correct: false },
        { text: "Blok", correct: false }
      ]
    });
    expect(lesson.stages[4].challenge.title).toBe("Buat sprite bergerak");
    expect(lesson.stages[2].content.checkpoints).toHaveLength(2);
    expect(lesson.requiredTool).toEqual({
      name: "Scratch",
      url: "https://scratch.mit.edu",
      instructions: "Buka editor Scratch."
    });
  });

  test("keeps an empty but valid lesson content renderable without inventing quiz questions", async ({ page }) => {
    await page.goto("/");
    const lesson = await page.evaluate(async () => {
      const { adaptSupabaseTopicToLegacyLesson } = await import("/src/data/supabase-lesson-adapter.ts");
      return adaptSupabaseTopicToLegacyLesson(
        {
          id: 30,
          title: "Tinkercad",
          description: null,
          sortOrder: 30,
          isPublished: true
        },
        {
          id: 157,
          moduleId: 30,
          title: "Topik kosong",
          description: null,
          sortOrder: 0,
          lessonContent: {}
        }
      );
    });

    expect(lesson.title).toBe("Topik kosong");
    expect(lesson.stages).toHaveLength(6);
    expect(lesson.stages[1].slides).toEqual([]);
    expect(lesson.stages[3].questions).toEqual([]);
    expect(lesson.stages[4].challenge.title).toBe("Tantangan Topik kosong");
    expect(lesson.stages[2].content.instructions).toContain("praktikkan");
  });
});
