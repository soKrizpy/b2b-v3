import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceStatus,
  ClassSession,
  ClassSessionRepository,
  ClassSessionStatus,
  CreateReplacementSessionInput,
  RecurringSessionSeriesInput,
  RepositoryResult,
  UUID,
  YearMonth,
} from "./domain-contracts";
import { supabase } from "./supabase-client";

type MeetingRow = {
  id: number;
  title: string;
  meeting_date: string;
  link_url: string | null;
  notes: string | null;
  session_count: number | null;
  series_id: string | null;
  session_number: number | null;
  is_completed: boolean | null;
  completion_status: string | null;
  teacher_id: string | null;
  duration_minutes: number | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  replacement_required: boolean | null;
  replacement_session_id: number | null;
  replacement_for_session_id: number | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

type MeetingStudentRow = {
  meeting_id: number;
  student_id: string;
  attendance_status: "hadir" | "telat" | "absen";
  attendance_recorded_by: string | null;
  attendance_recorded_at: string | null;
};

type MeetingWithStudent = {
  meeting: MeetingRow;
  link: MeetingStudentRow;
};

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
  return client;
}

function parseSessionId(value: string): { meetingId: number; studentId: string | null } | null {
  const [meetingPart, studentPart] = String(value).split(":", 2);
  const meetingId = Number(meetingPart);
  if (!Number.isSafeInteger(meetingId) || meetingId <= 0) return null;
  return { meetingId, studentId: studentPart || null };
}

function mapStatus(value: string | null, deletedAt: string | null): ClassSessionStatus {
  if (deletedAt || value === "soft_deleted") return "soft_deleted";
  if (value === "cancelled") return "cancelled";
  if (value === "terlewat") return "not_held";
  if (value === "selesai" || value === "completed") return "held";
  return "scheduled";
}

function mapAttendance(link: MeetingStudentRow): AttendanceStatus {
  if (link.attendance_status === "hadir") return "present";
  if (link.attendance_status === "telat") return "late";
  if (!link.attendance_recorded_at) return "not_recorded";
  return "absent";
}

function mapClassSession({ meeting, link }: MeetingWithStudent): ClassSession {
  return {
    id: `${meeting.id}:${link.student_id}`,
    seriesId: meeting.series_id ?? String(meeting.id),
    sessionNumber: meeting.session_number ?? 1,
    studentId: link.student_id,
    tutorId: meeting.teacher_id ?? "",
    scheduledStartAt: meeting.meeting_date,
    durationMinutes: meeting.duration_minutes ?? 60,
    meetingUrl: meeting.link_url,
    status: mapStatus(meeting.completion_status, meeting.deleted_at),
    attendanceStatus: mapAttendance(link),
    attendanceRecordedBy: link.attendance_recorded_by,
    attendanceRecordedAt: link.attendance_recorded_at,
    cancellation: meeting.cancelled_at && meeting.cancelled_by ? {
      actorId: meeting.cancelled_by,
      actorRole: meeting.cancelled_by === meeting.teacher_id ? "tutor" : "admin",
      reason: meeting.cancellation_reason ?? "",
      cancelledAt: meeting.cancelled_at,
    } : null,
    replacementRequired: Boolean(meeting.replacement_required),
    replacementSessionId: meeting.replacement_session_id == null ? null : String(meeting.replacement_session_id),
    replacementForSessionId: meeting.replacement_for_session_id == null ? null : String(meeting.replacement_for_session_id),
    deletedAt: meeting.deleted_at,
    deletedBy: meeting.deleted_by,
    createdAt: meeting.created_at,
    updatedAt: meeting.updated_at,
    version: meeting.version ?? 1,
  };
}

async function currentActor(db: SupabaseClient) {
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) throw new Error("Sesi Supabase tidak valid.");
  const { data: profile, error } = await db.from("profiles").select("role").eq("id", auth.user.id).single();
  if (error || !profile) throw new Error("Profil aktor tidak dapat diverifikasi.");
  return { id: auth.user.id, role: profile.role as string };
}

async function readMeetingWithLinks(db: SupabaseClient, meetingId: number): Promise<MeetingWithStudent[]> {
  const { data: meeting, error: meetingError } = await db
    .from("meetings").select("*").eq("id", meetingId).maybeSingle();
  if (meetingError || !meeting) return [];
  const { data: links, error: linksError } = await db
    .from("meeting_students")
    .select("meeting_id,student_id,attendance_status,attendance_recorded_by,attendance_recorded_at")
    .eq("meeting_id", meetingId);
  if (linksError) throw new Error("Relasi siswa untuk sesi ini gagal dimuat.");
  return ((links ?? []) as MeetingStudentRow[]).map((link) => ({
    meeting: meeting as MeetingRow,
    link,
  }));
}

export function createSupabaseClassSessionRepository(
  client: SupabaseClient | null = supabase
): ClassSessionRepository {
  return {
    async listSessions(filters = {}) {
      const db = requireClient(client);
      let query = db.from("meetings").select("*").order("meeting_date", { ascending: true }).limit(1000);
      if (filters.tutorId) query = query.eq("teacher_id", filters.tutorId);
      if (filters.seriesId) query = query.eq("series_id", filters.seriesId);
      if (filters.status) {
        const statusValue: Record<ClassSessionStatus, string> = {
          scheduled: "scheduled",
          held: "selesai",
          not_held: "terlewat",
          cancelled: "cancelled",
          soft_deleted: "soft_deleted",
        };
        query = query.eq("completion_status", statusValue[filters.status]);
      }

      let meetingRows: MeetingRow[] = [];
      if (filters.studentId) {
        const { data: links, error: linksError } = await db
          .from("meeting_students").select("meeting_id").eq("student_id", filters.studentId);
        if (linksError) throw new Error("Sesi siswa gagal dimuat.");
        const ids = [...new Set((links ?? []).map((row: { meeting_id: number }) => row.meeting_id))];
        if (!ids.length) return [];
        query = query.in("id", ids);
      }
      const { data, error } = await query;
      if (error) throw new Error("Daftar sesi Supabase gagal dimuat.");
      meetingRows = (data ?? []) as MeetingRow[];
      if (!meetingRows.length) return [];

      const { data: links, error: linksError } = await db
        .from("meeting_students")
        .select("meeting_id,student_id,attendance_status,attendance_recorded_by,attendance_recorded_at")
        .in("meeting_id", meetingRows.map((row) => row.id));
      if (linksError) throw new Error("Status siswa untuk sesi gagal dimuat.");
      const sessions = (links ?? []).map((link) => {
        const meeting = meetingRows.find((row) => row.id === link.meeting_id);
        return meeting ? mapClassSession({ meeting, link: link as MeetingStudentRow }) : null;
      }).filter((item): item is ClassSession => item !== null);
      return filters.studentId ? sessions.filter((item) => item.studentId === filters.studentId) : sessions;
    },

    async getSession(sessionId: UUID) {
      const parsed = parseSessionId(sessionId);
      if (!parsed) return null;
      const records = await readMeetingWithLinks(requireClient(client), parsed.meetingId);
      const selected = parsed.studentId
        ? records.find((record) => record.link.student_id === parsed.studentId)
        : records[0];
      return selected ? mapClassSession(selected) : null;
    },

    async createRecurringSeries(input: RecurringSessionSeriesInput): Promise<RepositoryResult<ClassSession[]>> {
      try {
        const db = requireClient(client);
        const actor = await currentActor(db);
        if (actor.role !== "admin" && (actor.role !== "teacher" || actor.id !== input.tutorId)) {
          return { success: false, error: { code: "FORBIDDEN", message: "Tutor hanya dapat membuat jadwal atas namanya sendiri." } };
        }
        const { data, error } = await db.rpc("create_recurring_meeting_series", {
          p_student_id: input.studentId,
          p_tutor_id: input.tutorId,
          p_start_date: input.startDate,
          p_start_time: input.startTime,
          p_weekdays: input.weekdays,
          p_target_count: input.targetCount,
          p_duration_minutes: input.durationMinutes,
          p_meeting_url: input.meetingUrl ?? null,
        });
        if (error) return { success: false, error: { code: error.code ?? "SCHEDULE_FAILED", message: error.message } };
        const meetings = (data ?? []) as MeetingRow[];
        const sessions = meetings.map((meeting) => mapClassSession({
          meeting,
          link: {
            meeting_id: meeting.id,
            student_id: input.studentId,
            attendance_status: "absen",
            attendance_recorded_by: null,
            attendance_recorded_at: null,
          },
        }));
        return { success: true, data: sessions };
      } catch (error) {
        return { success: false, error: { code: "SCHEDULE_FAILED", message: error instanceof Error ? error.message : "Seri jadwal gagal dibuat." } };
      }
    },

    async recordAttendance(sessionId: UUID, status: Exclude<AttendanceStatus, "not_recorded">): Promise<RepositoryResult<ClassSession>> {
      const parsed = parseSessionId(sessionId);
      if (!parsed?.studentId) return { success: false, error: { code: "INVALID_SESSION", message: "Sesi siswa tidak valid." } };
      const db = requireClient(client);
      const attendanceStatus = status === "present" ? "hadir" : status === "late" ? "telat" : "absen";
      const { data, error } = await db
        .from("meeting_students")
        .update({ attendance_status: attendanceStatus })
        .eq("meeting_id", parsed.meetingId)
        .eq("student_id", parsed.studentId)
        .select("meeting_id,student_id,attendance_status,attendance_recorded_by,attendance_recorded_at")
        .maybeSingle();
      if (error || !data) return { success: false, error: { code: error?.code ?? "ATTENDANCE_FAILED", message: "Kehadiran gagal disimpan." } };
      const records = await readMeetingWithLinks(db, parsed.meetingId);
      const selected = records.find((record) => record.link.student_id === parsed.studentId);
      if (!selected) return { success: false, error: { code: "NOT_FOUND", message: "Sesi siswa tidak ditemukan setelah presensi." } };
      return { success: true, data: mapClassSession(selected) };
    },

    async cancelSession(sessionId: UUID, reasonOrActor: string | unknown = ""): Promise<RepositoryResult<ClassSession>> {
      const reason = typeof reasonOrActor === "string" ? reasonOrActor : "";
      const parsed = parseSessionId(sessionId);
      if (!parsed) return { success: false, error: { code: "INVALID_SESSION", message: "Sesi tidak valid." } };
      const db = requireClient(client);
      const { data, error } = await db
        .from("meetings")
        .update({ completion_status: "cancelled", cancellation_reason: reason.slice(0, 500) })
        .eq("id", parsed.meetingId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error || !data) return { success: false, error: { code: error?.code ?? "CANCEL_FAILED", message: "Sesi gagal dibatalkan." } };
      const session = await this.getSession(sessionId);
      return session ? { success: true, data: session } : { success: false, error: { code: "NOT_FOUND", message: "Sesi tidak ditemukan." } };
    },

    async softDeleteSession(sessionId: UUID): Promise<RepositoryResult<ClassSession>> {
      const parsed = parseSessionId(sessionId);
      if (!parsed) return { success: false, error: { code: "INVALID_SESSION", message: "Sesi tidak valid." } };
      const db = requireClient(client);
      const { data, error } = await db
        .from("meetings")
        .update({ completion_status: "soft_deleted" })
        .eq("id", parsed.meetingId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error || !data) return { success: false, error: { code: error?.code ?? "DELETE_FAILED", message: "Sesi gagal diarsipkan." } };
      const session = await this.getSession(sessionId);
      return session ? { success: true, data: session } : { success: false, error: { code: "NOT_FOUND", message: "Sesi tidak ditemukan." } };
    },

    async createReplacement(
      originalSessionId: UUID,
      input: CreateReplacementSessionInput
    ): Promise<RepositoryResult<{ original: ClassSession; replacement: ClassSession }>> {
      const parsed = parseSessionId(originalSessionId);
      if (!parsed?.studentId) return { success: false, error: { code: "INVALID_SESSION", message: "Sesi asal tidak valid." } };
      const db = requireClient(client);
      const originalBeforeReplacement = await this.getSession(originalSessionId);
      if (!originalBeforeReplacement) return { success: false, error: { code: "NOT_FOUND", message: "Sesi asal tidak ditemukan." } };
      if (input.tutorId && input.tutorId !== originalBeforeReplacement.tutorId) {
        return { success: false, error: { code: "TUTOR_CHANGE_UNSUPPORTED", message: "Penggantian harus menggunakan tutor yang sama dengan sesi asal." } };
      }
      const { data, error } = await db.rpc("create_replacement_meeting", {
        p_original_meeting_id: parsed.meetingId,
        p_scheduled_start_at: input.scheduledStartAt,
        p_duration_minutes: input.durationMinutes ?? null,
        p_meeting_url: input.meetingUrl ?? null,
      });
      if (error || !data) return { success: false, error: { code: error?.code ?? "REPLACEMENT_FAILED", message: error?.message ?? "Sesi pengganti gagal dibuat." } };
      const original = await this.getSession(originalSessionId);
      const replacementId = Number((data as { replacement: MeetingRow }).replacement.id);
      const replacementRecords = await readMeetingWithLinks(db, replacementId);
      const replacement = replacementRecords.find((record) => record.link.student_id === parsed.studentId);
      if (!original || !replacement) return { success: false, error: { code: "REPLACEMENT_READ_FAILED", message: "Sesi pengganti tersimpan tetapi gagal dimuat ulang." } };
      return { success: true, data: { original, replacement: mapClassSession(replacement) } };
    },

    async listBillableSessions(studentId: UUID, period: YearMonth) {
      const sessions = await this.listSessions({ studentId });
      return sessions.filter((session) => {
        if ((session.attendanceStatus !== "present" && session.attendanceStatus !== "late") || session.status !== "held") return false;
        const date = new Date(session.scheduledStartAt);
        const month = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit"
        }).format(date);
        return month === period;
      });
    },

    subscribe(listener) {
      if (!client) return () => undefined;
      const channel = client
        .channel("production-class-session-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, (payload) => {
          listener({ domain: "sessions", action: payload.eventType.toLowerCase(), entityId: String((payload.new as { id?: number })?.id ?? ""), occurredAt: new Date().toISOString() });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "meeting_students" }, (payload) => {
          listener({ domain: "sessions", action: `attendance_${payload.eventType.toLowerCase()}`, entityId: String((payload.new as { meeting_id?: number })?.meeting_id ?? ""), occurredAt: new Date().toISOString() });
        })
        .subscribe();
      return () => { void client.removeChannel(channel); };
    },
  };
}

export const supabaseClassSessionRepository = createSupabaseClassSessionRepository();
