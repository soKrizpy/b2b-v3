export type LessonProgressState = "not-started" | "in-progress" | "practice-completed";

export type LessonProgressUpdate = {
  state: LessonProgressState;
  checkpoints: Record<string, boolean>;
  submissionDraft: { link?: string; notes?: string } | null;
  slideIndex: number;
};

const maxSlideIndex = 200;

const validStates = new Set<LessonProgressState>([
  "not-started",
  "in-progress",
  "practice-completed"
]);

/** Validate untrusted UI progress before sending it to the Supabase RPC. */
export function validateLessonProgressUpdate(input: {
  state: unknown;
  checkpoints: unknown;
  submissionDraft: unknown;
  slideIndex: unknown;
}): LessonProgressUpdate {
  if (typeof input.state !== "string" || !validStates.has(input.state as LessonProgressState)) {
    throw new Error("Status pengumpulan/review belum memiliki jalur penyimpanan produksi.");
  }

  if (
    !input.checkpoints ||
    typeof input.checkpoints !== "object" ||
    Array.isArray(input.checkpoints)
  ) {
    throw new Error("Data checkpoint tidak valid.");
  }

  const checkpoints = input.checkpoints as Record<string, unknown>;
  if (Object.values(checkpoints).some((value) => typeof value !== "boolean")) {
    throw new Error("Setiap nilai checkpoint harus berupa boolean.");
  }

  let submissionDraft: LessonProgressUpdate["submissionDraft"] = null;
  if (input.submissionDraft !== null) {
    if (
      !input.submissionDraft ||
      typeof input.submissionDraft !== "object" ||
      Array.isArray(input.submissionDraft)
    ) {
      throw new Error("Draf proyek tidak valid.");
    }

    const draft = input.submissionDraft as Record<string, unknown>;
    if (
      (draft.link !== undefined && typeof draft.link !== "string") ||
      (draft.notes !== undefined && typeof draft.notes !== "string")
    ) {
      throw new Error("Tautan dan catatan draf proyek harus berupa teks.");
    }
    submissionDraft = {
      ...(typeof draft.link === "string" ? { link: draft.link } : {}),
      ...(typeof draft.notes === "string" ? { notes: draft.notes } : {})
    };
  }

  if (
    typeof input.slideIndex !== "number" ||
    !Number.isSafeInteger(input.slideIndex) ||
    input.slideIndex < 0 ||
    input.slideIndex > maxSlideIndex
  ) {
    throw new Error("Posisi materi tidak valid.");
  }

  return {
    state: input.state as LessonProgressState,
    checkpoints: checkpoints as Record<string, boolean>,
    submissionDraft,
    slideIndex: input.slideIndex
  };
}
