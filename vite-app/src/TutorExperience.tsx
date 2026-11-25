import { useEffect, useMemo, useState } from "react";
import { supabaseProductionCapabilities } from "./data/supabase-production-capabilities";
import type { TutorMeetingSummary, TutorAssignedStudent } from "./data/supabase-tutor-schedule-repository";
import TutorLearningRecords from "./TutorLearningRecords";
import { getTutorMeetingStatusLabel } from "./data/tutor-meeting-status";

type TutorUser = { id: string; displayName: string; role: "admin" | "tutor" | "student" };

function formatMeetingDate(value: string | null) {
  if (!value) return "Waktu belum ditentukan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu belum valid";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
  }).format(date) + " WIB";
}

export default function TutorExperience({ user }: { user: TutorUser }) {
  const [meetings, setMeetings] = useState<TutorMeetingSummary[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [meetingStudents, setMeetingStudents] = useState<Array<{ meetingId: number; studentId: string; attendanceStatus: "hadir" | "telat" | "absen"; attendanceRecordedAt: string | null }>>([]);
  const [assignedStudents, setAssignedStudents] = useState<TutorAssignedStudent[]>([]);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [snapshot, assigned] = await Promise.all([
          supabaseProductionCapabilities.tutorSchedule.listForCurrentTutor(user.id),
          supabaseProductionCapabilities.tutorSchedule.listAssignedStudents(user.id)
        ]);
        if (!active) return;
        setMeetings(snapshot.meetings);
        setStudentCounts(snapshot.studentCounts);
        setMeetingStudents(snapshot.meetingStudents);
        setAssignedStudents(assigned);
      } catch (cause) {
        console.error("Jadwal tutor gagal dimuat:", cause);
        if (active) {
          setMeetings([]);
          setStudentCounts({});
          setMeetingStudents([]);
          setAssignedStudents([]);
          setError(cause instanceof Error ? cause.message : "Jadwal Supabase tidak dapat dimuat.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user.id]);

  async function markAttendance(meetingId: number, studentId: string, status: "hadir" | "telat" | "absen") {
    setAttendanceSaving(true);
    setError("");
    try {
      const result = await supabaseProductionCapabilities.tutorSchedule.recordAttendance(user.id, meetingId, studentId, status);
      if (!result.success) {
        setError(result.message ?? "Kehadiran gagal disimpan.");
        return;
      }
      const snapshot = await supabaseProductionCapabilities.tutorSchedule.listForCurrentTutor(user.id);
      setMeetings(snapshot.meetings);
      setStudentCounts(snapshot.studentCounts);
      setMeetingStudents(snapshot.meetingStudents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kehadiran gagal disimpan karena koneksi bermasalah.");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function completeMeeting(meetingId: number) {
    setAttendanceSaving(true);
    setError("");
    try {
      const result = await supabaseProductionCapabilities.tutorSchedule.completeSession(user.id, meetingId);
      if (!result.success) {
        setError(result.message ?? "Sesi belum dapat diselesaikan.");
        return;
      }
      const snapshot = await supabaseProductionCapabilities.tutorSchedule.listForCurrentTutor(user.id);
      setMeetings(snapshot.meetings);
      setStudentCounts(snapshot.studentCounts);
      setMeetingStudents(snapshot.meetingStudents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sesi gagal diselesaikan karena koneksi bermasalah.");
    } finally {
      setAttendanceSaving(false);
    }
  }

  const totalStudentLinks = useMemo(
    () => Object.values(studentCounts).reduce((sum, count) => sum + count, 0),
    [studentCounts]
  );

  const upcoming = meetings.filter((meeting) => {
    if (!meeting.meeting_date || getTutorMeetingStatusLabel(meeting) !== "Terjadwal") return false;
    return new Date(meeting.meeting_date).getTime() >= Date.now();
  });

  return (
    <section className="tutor-experience" aria-label="Dashboard Guru Bits2Bytes" aria-busy={loading}>
      <div className="tutor-live-header card">
        <div>
          <p className="tutor-live-eyebrow">DASHBOARD GURU · BITS2BYTES</p>
          <h2>Halo, {user.displayName}!</h2>
          <p>Ringkasan jadwal mengajar dari akun guru Bits2Bytes yang sedang masuk.</p>
        </div>
        <span className="tutor-live-source">Terhubung ke Supabase</span>
      </div>

      {loading && <div className="card tutor-loading" role="status">Memuat jadwal mengajar dari Supabase…</div>}
      {error && <div className="card tutor-live-error" role="alert">{error}</div>}

      {!loading && !error && (
        <>
          <div className="tutor-live-stats">
            <article className="card tutor-live-stat"><span>Jadwal terbaru ditampilkan</span><strong>{meetings.length}</strong></article>
            <article className="card tutor-live-stat"><span>Jadwal mendatang</span><strong>{upcoming.length}</strong></article>
            <article className="card tutor-live-stat"><span>Total relasi siswa pada jadwal*</span><strong>{totalStudentLinks}</strong></article>
          </div>
          <div className="card tutor-live-list" id="tutor-schedule" aria-labelledby="tutor-schedule-heading">
            <div className="tutor-live-list-heading">
              <div><h3 id="tutor-schedule-heading">Jadwal Mengajar</h3><p>20 riwayat terbaru dan hingga 100 jadwal mendatang yang ditautkan ke akun guru ini.</p></div>
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
                        <span className={"tutor-live-status " + (getTutorMeetingStatusLabel(meeting) === "Selesai" ? "is-done" : getTutorMeetingStatusLabel(meeting) === "Dibatalkan" ? "is-cancelled" : "")}>{getTutorMeetingStatusLabel(meeting)}</span>
                      </div>
                      <p>{formatMeetingDate(meeting.meeting_date)}</p>
                      <small>Sesi {meeting.session_number ?? "—"} dari {meeting.session_count ?? "—"} · {studentCounts[meeting.id] ?? 0} siswa terhubung</small>
                      {meeting.notes && <p className="tutor-live-notes">{meeting.notes}</p>}
                      {meetingStudents.some((link) => link.meetingId === meeting.id) && (
                        <div className="tutor-attendance-list" aria-label="Presensi siswa">
                          <strong>Presensi siswa</strong>
                          {meetingStudents.filter((link) => link.meetingId === meeting.id).map((link) => {
                            const student = assignedStudents.find((item) => item.id === link.studentId);
                            const label = link.attendanceStatus === "hadir" ? "Hadir"
                              : link.attendanceStatus === "telat" ? "Terlambat"
                              : link.attendanceRecordedAt ? "Tidak hadir" : "Belum dicatat";
                            const attendanceLocked = ["selesai", "terlewat", "cancelled", "soft_deleted"].includes(meeting.completion_status ?? "");
                            return (
                              <div className="tutor-attendance-row" key={link.studentId}>
                                <span>{student?.fullName ?? "Siswa terhubung"} · <small>{label}</small></span>
                                <div>
                                  <button type="button" disabled={attendanceSaving || attendanceLocked} onClick={() => void markAttendance(meeting.id, link.studentId, "hadir")}>Hadir</button>
                                  <button type="button" disabled={attendanceSaving || attendanceLocked} onClick={() => void markAttendance(meeting.id, link.studentId, "telat")}>Telat</button>
                                  <button type="button" disabled={attendanceSaving || attendanceLocked} onClick={() => void markAttendance(meeting.id, link.studentId, "absen")}>Absen</button>
                                </div>
                              </div>
                            );
                          })}
                          {meeting.completion_status !== "selesai" && meeting.completion_status !== "cancelled" && meeting.completion_status !== "soft_deleted" && (
                            <button
                              type="button"
                              className="tutor-complete-session-button"
                              disabled={attendanceSaving || !meetingStudents.filter((link) => link.meetingId === meeting.id).every((link) => link.attendanceStatus !== "absen" || Boolean(link.attendanceRecordedAt))}
                              onClick={() => void completeMeeting(meeting.id)}
                            >
                              Tandai Sesi Selesai
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {meeting.link_url && <a className="btn btn-secondary btn-sm" href={meeting.link_url} target="_blank" rel="noreferrer">Buka pertemuan</a>}
                  </article>
                ))}
              </div>
            )}
          </div>
          <p className="tutor-live-footnote">*Jumlah relasi siswa dihitung dari pertemuan yang dapat diakses akun ini.</p>
          <TutorLearningRecords tutorId={user.id} meetings={meetings} meetingStudents={meetingStudents} />
        </>
      )}
    </section>
  );
}
