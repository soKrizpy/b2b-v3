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
};

export interface TutorScheduleRepository {
  listForCurrentTutor(expectedTutorId: string): Promise<TutorScheduleSnapshot>;
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
  client: SupabaseClient | null = supabase
): TutorScheduleRepository {
  return {
    async listForCurrentTutor(expectedTutorId: string): Promise<TutorScheduleSnapshot> {
      if (!expectedTutorId) throw new Error("Identitas tutor tidak valid.");
      const db = requireClient(client);
      const { data: authData, error: authError } = await db.auth.getUser();

      if (authError || !authData.user || authData.user.id !== expectedTutorId) {
        throw new Error("Sesi tutor tidak cocok. Silakan masuk kembali.");
      }

      const { data, error } = await db
        .from("meetings")
        .select("id,title,meeting_date,link_url,notes,session_count,session_number,completion_status,is_completed")
        .eq("teacher_id", authData.user.id)
        .order("meeting_date", { ascending: false })
        .limit(100);

      if (error) throw new Error("Jadwal Supabase tidak dapat dibaca. Periksa kebijakan akses akun guru.");

      const meetings = ((data ?? []) as TutorMeetingSummary[]).slice().sort((a, b) => {
        if (!a.meeting_date) return 1;
        if (!b.meeting_date) return -1;
        return new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime();
      });

      if (meetings.length === 0) return { meetings: [], studentCounts: {} };

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

      return { meetings, studentCounts };
    }
  };
}

export const supabaseTutorScheduleRepository = createSupabaseTutorScheduleRepository();
