import type { CurriculumModule, CurriculumTopic, JsonValue } from "./domain-contracts";

type LegacyLesson = {
  id: string;
  topicId: number;
  moduleId: number;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  trackId: string;
  trackTitle: string;
  order: number;
  status: "in-progress";
  skillLevel: string;
  estimatedDurationMinutes: number;
  learningObjectives: string[];
  stages: Array<Record<string, unknown>>;
  requiredTool?: { name: string; url: string; instructions?: string };
};

type JsonObject = { [key: string]: JsonValue };

function asObject(value: JsonValue | undefined): JsonObject {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "string") return asObject(parsed as JsonValue);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as JsonObject
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function asArray(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: JsonValue | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: JsonValue | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function makeQuizOptions(options: JsonValue[] | undefined, answerIndex: number, explanation = "") {
  return (options ?? []).filter((option): option is string => typeof option === "string").map((text, index) => ({
    id: `option-${index + 1}`,
    text,
    correct: index === answerIndex,
    explanation
  }));
}

/**
 * Converts the production topics.lesson_content JSONB contract into the
 * six-stage shape consumed by the existing JavaScript lesson renderer.
 * This is a read-only presentation adapter; it does not persist progress.
 */
export function adaptSupabaseTopicToLegacyLesson(
  module: CurriculumModule,
  topic: CurriculumTopic
): LegacyLesson {
  const content = asObject(topic.lessonContent);
  const learningPath = asArray(content.learningPath)
    .map(asObject)
    .sort((a, b) => asNumber(a.order) - asNumber(b.order));
  const quizzes = asArray(content.quiz).map(asObject);
  const challenges = asArray(content.challenge).map(asObject);
  const firstChallenge = challenges[0] ?? {};

  const slides = learningPath.map((item, index) => {
    const title = asText(item.title, `Materi ${index + 1}`);
    const body = asText(item.content, asText(item.explanation));
    const code = asObject(item.code);
    const blocks: Array<Record<string, unknown>> = [];
    if (body) blocks.push({ type: "text", value: body });
    if (typeof code.content === "string" && code.content) {
      blocks.push({
        type: "copyable-prompt",
        title: "Contoh Kode",
        label: asText(code.language, "Kode"),
        code: code.content
      });
    }
    if (Array.isArray(item.options) && item.options.every((option) => typeof option === "string")) {
      blocks.push({
        type: "interactive-quiz",
        quizType: "mcq",
        question: asText(item.instructions, title),
        options: makeQuizOptions(
          item.options,
          typeof item.correctOption === "string" ? item.options.indexOf(item.correctOption) : -1
        )
      });
    }
    return { id: asText(item.id, `slide-${index + 1}`), title, type: "concept", content: blocks };
  });

  const questions = quizzes.map((quiz, index) => {
    const options = asArray(quiz.options);
    const answerIndex = asNumber(quiz.answer_index, -1);
    return {
      id: `topic-${topic.id}-quiz-${index + 1}`,
      questionIndex: index,
      type: "mcq",
      prompt: asText(quiz.question, `Pertanyaan ${index + 1}`),
      options: makeQuizOptions(options, answerIndex, asText(quiz.explanation))
    };
  });

  const requirements = asText(firstChallenge.instructions)
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const checkpoints = requirements.map((description, index) => ({
    id: `topic-${topic.id}-checkpoint-${index + 1}`,
    title: `Langkah ${index + 1}`,
    description,
    expectedResult: ""
  }));

  const learningObjectives = [
    topic.description,
    ...learningPath.slice(0, 4).map((item) => asText(item.title))
  ].filter((value): value is string => Boolean(value));

  const stages: Array<Record<string, unknown>> = [
    {
      id: "brief",
      number: 1,
      title: "Kenalan dengan Misi",
      badge: "Misi Awal",
      content: {
        overview: topic.description || `Mari mulai belajar ${topic.title}.`,
        keySteps: learningPath.slice(0, 5).map((item) => asText(item.title)).filter(Boolean)
      }
    },
    {
      id: "materials",
      number: 2,
      title: "Materi Belajar",
      badge: "Materi dari Kurikulum",
      slides
    },
    {
      id: "practice",
      number: 3,
      title: "Ayo Praktik",
      badge: "Praktik Terbimbing",
      content: {
        instructions: asText(firstChallenge.instructions, "Ikuti instruksi pada materi dan praktikkan secara mandiri."),
        checkpoints
      }
    },
    {
      id: "check",
      number: 4,
      title: "Kuis Singkat",
      badge: "Uji Pemahaman",
      questions
    },
    {
      id: "challenge",
      number: 5,
      title: "Tantangan Karya",
      badge: "Tantangan Mandiri",
      challenge: {
        title: asText(firstChallenge.title, `Tantangan ${topic.title}`),
        story: asText(firstChallenge.instructions),
        requirements,
        evaluationRubric: []
      }
    },
    {
      id: "submission",
      number: 6,
      title: "Kirim Karyamu",
      badge: "Pengumpulan Proyek",
      submission: {
        instructions: "Ikuti metode pengumpulan yang ditentukan guru untuk topik ini.",
        allowedMethods: [asText(firstChallenge.submission_type, "Tautan proyek atau bukti hasil karya")]
      }
    }
  ];

  const lesson: LegacyLesson = {
    id: `topic-${topic.id}`,
    topicId: topic.id,
    moduleId: module.id,
    title: topic.title,
    subtitle: topic.description || topic.title,
    description: topic.description || "",
    category: module.title,
    trackId: `module-${module.id}`,
    trackTitle: module.title,
    order: topic.sortOrder,
    status: "in-progress",
    skillLevel: "Sesuai kurikulum",
    estimatedDurationMinutes: asNumber(content.estimatedDurationMinutes),
    learningObjectives,
    stages
  };

  const tool = asObject(content.requiredTool);
  if (typeof tool.name === "string" && typeof tool.url === "string") {
    lesson.requiredTool = {
      name: tool.name,
      url: tool.url,
      instructions: asText(tool.instructions)
    };
  } else {
    // Legacy curriculum topics may identify their required tool only in the
    // published challenge instructions. Keep the inferred allowlist explicit.
    const challengeContext = `${topic.title} ${asText(firstChallenge.instructions)}`.toLowerCase();
    if (challengeContext.includes("tinkercad")) {
      lesson.requiredTool = {
        name: "Tinkercad",
        url: "https://www.tinkercad.com/",
        instructions: "Bagikan tautan proyek Tinkercad yang dapat dibuka guru."
      };
    } else if (challengeContext.includes("scratch")) {
      lesson.requiredTool = {
        name: "Scratch",
        url: "https://scratch.mit.edu/",
        instructions: "Bagikan tautan proyek Scratch yang dapat dibuka guru."
      };
    }
  }

  return lesson;
}
