export type StudentLessonProgressState =
  | "not-started"
  | "in-progress"
  | "practice-completed";

export type StudentLessonProgress = {
  id: number;
  studentId: string;
  topicId: number;
  state: StudentLessonProgressState;
  checkpoints: Record<string, boolean>;
  submissionDraft: { link?: string; notes?: string } | null;
  slideIndex: number;
  version: number;
  updatedAt: string;
};

type ProgressRow = {
  id: number;
  student_id: string;
  topic_id: number;
  state: StudentLessonProgressState;
  checkpoints: Record<string, boolean>;
  submission_draft: { link?: string; notes?: string } | null;
  slide_index: number;
  version: number;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalStringRecord(value: unknown): value is { link?: string; notes?: string } {
  return isRecord(value)
    && (value.link === undefined || typeof value.link === "string")
    && (value.notes === undefined || typeof value.notes === "string");
}

export function mapStudentLessonProgressRow(value: unknown): StudentLessonProgress {
  if (!isRecord(value)) throw new Error("Respons penyimpanan progres belajar tidak valid.");

  const row = value as unknown as ProgressRow;
  const checkpointsValid = isRecord(row.checkpoints)
    && Object.values(row.checkpoints).every((item) => typeof item === "boolean");
  const draftValid = row.submission_draft === null || isOptionalStringRecord(row.submission_draft);
  const stateValid = row.state === "not-started"
    || row.state === "in-progress"
    || row.state === "practice-completed";

  if (
    !Number.isSafeInteger(row.id) || row.id <= 0
    || typeof row.student_id !== "string" || !row.student_id
    || !Number.isSafeInteger(row.topic_id) || row.topic_id <= 0
    || !stateValid
    || !checkpointsValid
    || !draftValid
    || !Number.isSafeInteger(row.slide_index) || row.slide_index < 0 || row.slide_index > 200
    || !Number.isSafeInteger(row.version) || row.version <= 0
    || typeof row.updated_at !== "string" || !row.updated_at
  ) {
    throw new Error("Respons penyimpanan progres belajar tidak valid.");
  }

  return {
    id: row.id,
    studentId: row.student_id,
    topicId: row.topic_id,
    state: row.state,
    checkpoints: row.checkpoints,
    submissionDraft: row.submission_draft,
    slideIndex: row.slide_index,
    version: row.version,
    updatedAt: row.updated_at
  };
}

export function resolveStudentLessonProgressRpc(
  data: unknown,
  error: { code?: string; message?: string } | null
): StudentLessonProgress {
  if (error?.code === "40001") {
    throw new Error("Progres berubah di perangkat lain. Muat ulang materi sebelum menyimpan lagi.");
  }
  if (error || !data) {
    throw new Error(error?.message || "Progres belajar gagal disimpan.");
  }
  return mapStudentLessonProgressRow(data);
}
