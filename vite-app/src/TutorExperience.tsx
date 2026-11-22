import { useEffect, useMemo, useState } from "react";
import { supabase } from "./data/supabase-client";

type TutorUser = { id: string; displayName: string; role: "admin" | "tutor" | "student" };
type MeetingRow = {
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
type MeetingStudentRow = { meeting_id: number; student_id: string };

function formatMeetingDate(value: string | null) {
  if (!value) return "Waktu belum ditentukan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu belum valid";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
  }).format(date) + " WIB";
}

function statusLabel(meeting: MeetingRow) {
  if (meeting.is_completed || meeting.completion_status === "completed" || meeting.completion_status === "held") return "Selesai";
  if (meeting.completion_status === "cancelled" || meeting.completion_status === "soft_deleted") return "Dibatalkan";
  if (meeting.completion_status === "not_held") return "Tidak terlaksana";
  return "Terjadwal";
}

export default function TutorExperience({ user }: { user: TutorUser }) {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      if (!supabase) {
        setError("Konfigurasi Supabase belum tersedia pada deployment ini.");
        setLoading(false);
        return;
      }
      const { data, error: meetingError } = await supabase
        .from("meetings")
        .select("id,title,meeting_date,link_url,notes,session_count,session_number,completion_status,is_completed")
        .eq("teacher_id", user.id)
        .order("meeting_date", { ascending: true })
        .limit(100);
      if (!active) return;
      if (meetingError) {
        console.error("Jadwal tutor gagal dimuat:", meetingError);
        setError("Jadwal Supabase tidak dapat dibaca. Periksa sesi dan kebijakan akses akun guru.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as MeetingRow[];
      setMeetings(rows);
      if (rows.length > 0) {
        const { data: links, error: linksError } = await supabase
          .from("meeting_students")
          .select("meeting_id,student_id")
          .in("meeting_id", rows.map((meeting) => meeting.id));
        if (!active) return;
        if (linksError) {
          console.error("Relasi siswa-pertemuan gagal dimuat:", linksError);
          setError("Jadwal berhasil dimuat, tetapi relasi siswa belum dapat dibaca.");
        } else {
          const counts: Record<number, number> = {};
          const uniqueByMeeting: Record<number, Set<string>> = {};
          for (const link of (links ?? []) as MeetingStudentRow[]) {
            uniqueByMeeting[link.meeting_id] ??= new Set<string>();
            uniqueByMeeting[link.meeting_id].add(link.student_id);
          }
          for (const [meetingId, ids] of Object.entries(uniqueByMeeting)) counts[Number(meetingId)] = ids.size;
          setStudentCounts(counts);
        }
      } else {
        setStudentCounts({});
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [user.id]);

  const uniqueStudents = useMemo(() => {
    // Only count linked student IDs; student profile names are intentionally not
    // queried because the current production RLS policy does not grant tutors
    // general access to the students table.
    return Object.values(studentCounts).reduce((sum, count) => sum + count, 0);
  }, [studentCounts]);

  const upcoming = meetings.filter((meeting) => {
    if (!meeting.meeting_date || statusLabel(meeting) !== "Terjadwal") return false;
    return new Date(meeting.meeting_date).getTime() >= Date.now();
  });

  return (
    <section className="tutor-experience" aria-label="Ruang Tutor" aria-busy={loading}>
      <div className="tutor-live-header card">
        <div>
          <p className="tutor-live-eyebrow">RUANG TUTOR · DATA SUPABASE</p>
          <h2>Halo, {user.displayName}!</h2>
          <p>Ringkasan jadwal mengajar dari akun Bits2Bytes yang sedang masuk.</p>
        </div>
        <span className="tutor-live-source">Terhubung ke Supabase</span>
      </div>

      {loading && <div className="card tutor-loading" role="status">Memuat jadwal mengajar dari Supabase…</div>}
      {error && <div className="card tutor-live-error" role="alert">{error}</div>}

      {!loading && !error && (
        <>
          <div className="tutor-live-stats">
            <article className="card tutor-live-stat"><span>Total jadwal terbaca</span><strong>{meetings.length}</strong></article>
            <article className="card tutor-live-stat"><span>Jadwal mendatang</span><strong>{upcoming.length}</strong></article>
            <article className="card tutor-live-stat"><span>Relasi siswa per jadwal*</span><strong>{uniqueStudents}</strong></article>
          </div>
          <div className="card tutor-live-list">
            <div className="tutor-live-list-heading">
              <div><h3>Jadwal Mengajar</h3><p>Daftar pertemuan yang ditautkan ke akun guru ini.</p></div>
            </div>
            {meetings.length === 0 ? (
              <p className="tutor-live-empty">Belum ada jadwal yang ditautkan ke akun guru ini di Supabase.</p>
            ) : (
              <div className="tutor-live-meetings">
                {meetings.map((meeting) => (
                  <article className="tutor-live-meeting" key={meeting.id}>
                    <div className="tutor-live-meeting-main">
                      <div className="tutor-live-meeting-title-row">
                        <h4>{meeting.title || "Pertemuan tanpa judul"}</h4>
                        <span className={"tutor-live-status " + (statusLabel(meeting) === "Selesai" ? "is-done" : statusLabel(meeting) === "Dibatalkan" ? "is-cancelled" : "")}>{statusLabel(meeting)}</span>
                      </div>
                      <p>{formatMeetingDate(meeting.meeting_date)}</p>
                      <small>Sesi {meeting.session_number ?? "—"} dari {meeting.session_count ?? "—"} · {studentCounts[meeting.id] ?? 0} siswa terhubung</small>
                      {meeting.notes && <p className="tutor-live-notes">{meeting.notes}</p>}
                    </div>
                    {meeting.link_url && <a className="btn btn-secondary btn-sm" href={meeting.link_url} target="_blank" rel="noreferrer">Buka pertemuan</a>}
                  </article>
                ))}
              </div>
            )}
          </div>
          <p className="tutor-live-footnote">*Jumlah relasi siswa dihitung dari pertemuan yang dapat diakses akun ini; nama dan detail profil siswa tidak ditampilkan karena pembatasan RLS yang berlaku.</p>
        </>
      )}
    </section>
  );
}
