import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";

export type TutorMeetingSummary = {
  id: number;
  title: string;
  meeting_date: string | null;
  link_url: string | null;
  notes: string | null;
  session_count: number | null;
  session_number: number | null;
  completion_status: string | null;
  is_completed: boolean | null;
};

type MeetingStudentRow = {
  meeting_id: number;
  student_id: string;
};

export type TutorScheduleSnapshot = {
  meetings: TutorMeetingSummary[];
  studentCounts: Record<number, number>;
  meetingStudents: Array<{ meetingId: number; studentId: string }>;
};

export type TutorAssignedStudent = {
  id: string;
  fullName: string;
  grade: string | null;
  avatarId: string | null;
};

export interface TutorScheduleRepository {
  listForCurrentTutor(expectedTutorId: string): Promise<TutorScheduleSnapshot>;
  listAssignedStudents(expectedTutorId: string): Promise<TutorAssignedStudent[]>;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
  return client;
}

/**
 * Production-backed read capability for the current tutor's schedule.
 * The actor is always resolved from Supabase Auth; caller IDs are assertions,
 * never authorization credentials. RLS remains the database enforcement layer.
 */
export function createSupabaseTutorScheduleRepository(
  client: SupabaseClient | null = supabase,
  clock: () => Date = () => new Date()
): TutorScheduleRepository {
  return {
    async listForCurrentTutor(expectedTutorId: string): Promise<TutorScheduleSnapshot> {
      if (!expectedTutorId) throw new Error("Identitas tutor tidak valid.");
      const db = requireClient(client);
      const { data: authData, error: authError } = await db.auth.getUser();

      if (authError || !authData.user || authData.user.id !== expectedTutorId) {
        throw new Error("Sesi tutor tidak cocok. Silakan masuk kembali.");
      }

      const now = clock().toISOString();
      const columns = "id,title,meeting_date,link_url,notes,session_count,session_number,completion_status,is_completed";
      const [upcomingResult, historyResult] = await Promise.all([
        db
          .from("meetings")
          .select(columns)
          .eq("teacher_id", authData.user.id)
          .gte("meeting_date", now)
          .order("meeting_date", { ascending: true })
          .limit(100),
        db
          .from("meetings")
          .select(columns)
          .eq("teacher_id", authData.user.id)
          .lt("meeting_date", now)
          .order("meeting_date", { ascending: false })
          .limit(20)
      ]);

      if (upcomingResult.error || historyResult.error) {
        throw new Error("Jadwal Supabase tidak dapat dibaca. Periksa kebijakan akses akun guru.");
      }

      const meetings = [
        ...((historyResult.data ?? []) as TutorMeetingSummary[]),
        ...((upcomingResult.data ?? []) as TutorMeetingSummary[])
      ].sort((a, b) => {
        if (!a.meeting_date) return 1;
        if (!b.meeting_date) return -1;
        return new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime();
      });

      if (meetings.length === 0) return { meetings: [], studentCounts: {}, meetingStudents: [] };

      const { data: links, error: linksError } = await db
        .from("meeting_students")
        .select("meeting_id,student_id")
        .in("meeting_id", meetings.map((meeting) => meeting.id));

      if (linksError) {
        throw new Error("Jadwal berhasil dimuat, tetapi relasi siswa belum dapat dibaca.");
      }

      const uniqueByMeeting = new Map<number, Set<string>>();
      for (const link of (links ?? []) as MeetingStudentRow[]) {
        if (!Number.isSafeInteger(link.meeting_id) || link.meeting_id <= 0) continue;
        if (typeof link.student_id !== "string" || !link.student_id) continue;
        const students = uniqueByMeeting.get(link.meeting_id) ?? new Set<string>();
        students.add(link.student_id);
        uniqueByMeeting.set(link.meeting_id, students);
      }

      const studentCounts: Record<number, number> = {};
      for (const [meetingId, students] of uniqueByMeeting) {
        studentCounts[meetingId] = students.size;
      }

      return {
        meetings,
        studentCounts,
        meetingStudents: (links ?? [])
          .filter((link: MeetingStudentRow) =>
            Number.isSafeInteger(link.meeting_id) && link.meeting_id > 0 &&
            typeof link.student_id === "string" && link.student_id.length > 0
          )
          .map((link: MeetingStudentRow) => ({ meetingId: link.meeting_id, studentId: link.student_id }))
      };
    },

    async listAssignedStudents(expectedTutorId: string): Promise<TutorAssignedStudent[]> {
      if (!expectedTutorId) throw new Error("Identitas tutor tidak valid.");
      const db = requireClient(client);
      const { data: authData, error: authError } = await db.auth.getUser();
      if (authError || !authData.user || authData.user.id !== expectedTutorId) {
        throw new Error("Sesi tutor tidak cocok. Silakan masuk kembali.");
      }
      const { data, error } = await db.rpc("list_tutor_assigned_students");
      if (error) throw new Error("Daftar siswa yang ditugaskan gagal dimuat.");
      return (data ?? []).map((row: { student_id: string; full_name: string | null; grade: string | null; avatar_id: string | null }) => ({
        id: row.student_id,
        fullName: row.full_name ?? "Siswa",
        grade: row.grade,
        avatarId: row.avatar_id
      }));
    }
  };
}

export const supabaseTutorScheduleRepository = createSupabaseTutorScheduleRepository();
