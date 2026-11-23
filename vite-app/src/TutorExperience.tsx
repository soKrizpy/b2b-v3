import { useEffect, useMemo, useState } from "react";
import {
  supabaseTutorScheduleRepository,
  type TutorMeetingSummary
} from "./data/supabase-tutor-schedule-repository";

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

function statusLabel(meeting: TutorMeetingSummary) {
  if (meeting.is_completed || meeting.completion_status === "completed" || meeting.completion_status === "held") return "Selesai";
  if (meeting.completion_status === "cancelled" || meeting.completion_status === "soft_deleted") return "Dibatalkan";
  if (meeting.completion_status === "not_held") return "Tidak terlaksana";
  return "Terjadwal";
}

export default function TutorExperience({ user }: { user: TutorUser }) {
  const [meetings, setMeetings] = useState<TutorMeetingSummary[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const snapshot = await supabaseTutorScheduleRepository.listForCurrentTutor(user.id);
        if (!active) return;
        setMeetings(snapshot.meetings);
        setStudentCounts(snapshot.studentCounts);
      } catch (cause) {
        console.error("Jadwal tutor gagal dimuat:", cause);
        if (active) {
          setMeetings([]);
          setStudentCounts({});
          setError(cause instanceof Error ? cause.message : "Jadwal Supabase tidak dapat dimuat.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user.id]);

  const totalStudentLinks = useMemo(
    () => Object.values(studentCounts).reduce((sum, count) => sum + count, 0),
    [studentCounts]
  );

  const upcoming = meetings.filter((meeting) => {
    if (!meeting.meeting_date || statusLabel(meeting) !== "Terjadwal") return false;
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
          <div className="card tutor-live-list">
            <div className="tutor-live-list-heading">
              <div><h3>Jadwal Mengajar</h3><p>100 pertemuan terbaru yang ditautkan ke akun guru ini, diurutkan dari jadwal terdekat.</p></div>
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
