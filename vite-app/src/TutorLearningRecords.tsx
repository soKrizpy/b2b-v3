import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabaseProductionCapabilities } from "./data/supabase-production-capabilities";
import type { MonthlyEvaluation, SessionReport, YearMonth } from "./data/domain-contracts";
import type { TutorAssignedStudent } from "./data/supabase-tutor-schedule-repository";
import type { TutorMeetingSummary } from "./data/supabase-tutor-schedule-repository";
import type { TutorPendingSubmission } from "./data/supabase-challenge-submission-repository";

type MeetingStudentLink = { meetingId: number; studentId: string };

type Props = {
  tutorId: string;
  meetings: TutorMeetingSummary[];
  meetingStudents: MeetingStudentLink[];
};

const ratings = [
  "Sangat baik",
  "Baik",
  "Berkembang sesuai proses",
  "Membutuhkan pendampingan lebih lanjut",
] as const;

function currentPeriod() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(date);
}

export default function TutorLearningRecords({ tutorId, meetings, meetingStudents }: Props) {
  const [students, setStudents] = useState<TutorAssignedStudent[]>([]);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [evaluations, setEvaluations] = useState<MonthlyEvaluation[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<TutorPendingSubmission[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [studentId, setStudentId] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [reportTopic, setReportTopic] = useState("");
  const [activities, setActivities] = useState("");
  const [achievements, setAchievements] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [solutions, setSolutions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [period, setPeriod] = useState<YearMonth>(currentPeriod() as YearMonth);
  const [rating, setRating] = useState<(typeof ratings)[number]>("Berkembang sesuai proses");
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [nextGoals, setNextGoals] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableMeetings = useMemo(
    () => meetings.filter((meeting) =>
      meetingStudents.some((link) => link.meetingId === meeting.id && link.studentId === studentId)
    ),
    [meetings, meetingStudents, studentId]
  );

  async function refresh() {
    const [assigned, tutorReports, tutorEvaluations, submissions] = await Promise.all([
      supabaseProductionCapabilities.tutorSchedule.listAssignedStudents(tutorId),
      supabaseProductionCapabilities.sessionReports.listTutorReports(tutorId),
      supabaseProductionCapabilities.monthlyEvaluations.listTutorEvaluations(tutorId),
      supabaseProductionCapabilities.challengeSubmissions.listPendingForCurrentTutor(tutorId),
    ]);
    setStudents(assigned);
    setReports(tutorReports);
    setEvaluations(tutorEvaluations);
    setPendingSubmissions(submissions);
    setStudentId((current) => current || assigned[0]?.id || "");
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [assigned, tutorReports, tutorEvaluations, submissions] = await Promise.all([
          supabaseProductionCapabilities.tutorSchedule.listAssignedStudents(tutorId),
          supabaseProductionCapabilities.sessionReports.listTutorReports(tutorId),
          supabaseProductionCapabilities.monthlyEvaluations.listTutorEvaluations(tutorId),
          supabaseProductionCapabilities.challengeSubmissions.listPendingForCurrentTutor(tutorId),
        ]);
        if (!active) return;
        setStudents(assigned);
        setReports(tutorReports);
        setEvaluations(tutorEvaluations);
        setPendingSubmissions(submissions);
        setStudentId(assigned[0]?.id ?? "");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Catatan belajar gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tutorId]);

  useEffect(() => {
    const selected = availableMeetings.find((meeting) => String(meeting.id) === meetingId);
    if (selected) setReportTopic(selected.title);
    else if (availableMeetings.length) setMeetingId(String(availableMeetings[0].id));
    else setMeetingId("");
  }, [studentId, availableMeetings, meetingId]);

  async function reviewSubmission(submissionId: number, status: "approved" | "needs_revision") {
    setSaving(true);
    setError("");
    setMessage("");
    const result = await supabaseProductionCapabilities.challengeSubmissions.reviewSubmission(
      tutorId,
      submissionId,
      status,
      reviewNotes[submissionId] ?? ""
    );
    setSaving(false);
    if (!result.success) {
      setError(result.message ?? "Review proyek gagal disimpan.");
      return;
    }
    setMessage(status === "approved" ? "Proyek berhasil disetujui." : "Catatan revisi berhasil dikirim ke siswa.");
    await refresh();
  }

  async function saveReport(event: FormEvent<HTMLFormElement>, status: "draft" | "submitted") {
    event.preventDefault();
    const meeting = availableMeetings.find((item) => String(item.id) === meetingId);
    if (!studentId || !meeting) {
      setError("Pilih siswa dan pertemuan yang benar-benar terhubung ke akun tutor.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const existingReport = reports.find((report) => report.studentId === studentId && report.sessionId === String(meeting.id));
    const result = await supabaseProductionCapabilities.sessionReports.saveReport({
      id: existingReport?.id,
      expectedVersion: existingReport?.version,
      studentId,
      tutorId,
      sessionId: String(meeting.id),
      sessionDate: (meeting.meeting_date ?? new Date().toISOString()).slice(0, 10),
      sessionNumber: meeting.session_number,
      topic: reportTopic.trim() || meeting.title,
      moduleName: undefined,
      activities,
      achievements,
      difficulties,
      solutions,
      parentRecommendations: recommendations,
      competencies: {},
      status,
      submittedAt: null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setMessage(status === "submitted" ? "Laporan sudah diterbitkan untuk siswa." : "Draft laporan tersimpan.");
    setActivities("");
    setAchievements("");
    setDifficulties("");
    setSolutions("");
    setRecommendations("");
    await refresh();
  }

  async function saveEvaluation(event: FormEvent<HTMLFormElement>, status: "draft" | "published") {
    event.preventDefault();
    if (!studentId) {
      setError("Pilih siswa yang ditugaskan kepada akun tutor ini.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const existingEvaluation = evaluations.find((item) => item.studentId === studentId && item.period === period);
    const result = await supabaseProductionCapabilities.monthlyEvaluations.saveEvaluation({
      id: existingEvaluation?.id,
      expectedVersion: existingEvaluation?.version,
      studentId,
      tutorId,
      period,
      rating,
      summary,
      strengths,
      nextGoals,
      status,
      publishedAt: null,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setMessage(status === "published" ? "Evaluasi bulanan berhasil dipublikasikan." : "Draft evaluasi tersimpan.");
    await refresh();
  }

  return (
    <section className="card tutor-records" aria-label="Laporan sesi dan evaluasi siswa">
      <header>
        <p className="tutor-live-eyebrow">CATATAN PEMBELAJARAN</p>
        <h3>Laporan Sesi &amp; Evaluasi Bulanan</h3>
        <p>Laporan yang diterbitkan dapat dibaca siswa. Evaluasi bulanan hanya tampil setelah dipublikasikan.</p>
      </header>

      {loading && <p role="status">Memuat data siswa dan catatan…</p>}
      {error && <p role="alert" className="tutor-live-error">{error}</p>}
      {message && <p role="status" className="tutor-record-success">{message}</p>}

      {!loading && students.length === 0 && (
        <p className="tutor-live-empty">Belum ada siswa yang ditugaskan ke akun tutor ini. Admin perlu membuat penugasan aktif terlebih dahulu.</p>
      )}

      {!loading && students.length > 0 && (
        <>
          <label>
            Siswa
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.fullName}{student.grade ? " · " + student.grade : ""}</option>
              ))}
            </select>
          </label>

          <div className="tutor-record-grid">
            <form onSubmit={(event) => void saveReport(event, "draft")}>
              <h4>Laporan Pertemuan</h4>
              <label>Pertemuan
                <select value={meetingId} onChange={(event) => setMeetingId(event.target.value)} required>
                  {availableMeetings.map((meeting) => (
                    <option key={meeting.id} value={String(meeting.id)}>
                      {dateLabel(meeting.meeting_date ?? "")} · Sesi {meeting.session_number ?? "—"} · {meeting.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>Topik
                <input value={reportTopic} onChange={(event) => setReportTopic(event.target.value)} maxLength={180} required />
              </label>
              <label>Aktivitas pembelajaran
                <textarea value={activities} onChange={(event) => setActivities(event.target.value)} required rows={2} />
              </label>
              <label>Pencapaian
                <textarea value={achievements} onChange={(event) => setAchievements(event.target.value)} rows={2} />
              </label>
              <label>Kesulitan
                <textarea value={difficulties} onChange={(event) => setDifficulties(event.target.value)} rows={2} />
              </label>
              <label>Solusi / tindak lanjut
                <textarea value={solutions} onChange={(event) => setSolutions(event.target.value)} rows={2} />
              </label>
              <label>Rekomendasi untuk orang tua
                <textarea value={recommendations} onChange={(event) => setRecommendations(event.target.value)} rows={2} />
              </label>
              <div className="tutor-record-actions">
                <button type="submit" disabled={saving || !availableMeetings.length}>Simpan Draft</button>
                <button type="button" disabled={saving || !availableMeetings.length} onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form) void saveReport({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>, "submitted");
                }}>Terbitkan Laporan</button>
              </div>
              {!availableMeetings.length && <small>Belum ada pertemuan siswa ini yang terhubung ke jadwal tutor.</small>}
            </form>

            <form onSubmit={(event) => void saveEvaluation(event, "draft")}>
              <h4>Evaluasi Bulanan</h4>
              <label>Periode
                <input type="month" value={period} onChange={(event) => setPeriod(event.target.value as YearMonth)} required />
              </label>
              <label>Penilaian
                <select value={rating} onChange={(event) => setRating(event.target.value as (typeof ratings)[number])}>
                  {ratings.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Ringkasan perkembangan
                <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} required />
              </label>
              <label>Kekuatan siswa
                <textarea value={strengths} onChange={(event) => setStrengths(event.target.value)} rows={3} />
              </label>
              <label>Target bulan berikutnya
                <textarea value={nextGoals} onChange={(event) => setNextGoals(event.target.value)} rows={3} />
              </label>
              <div className="tutor-record-actions">
                <button type="submit" disabled={saving}>Simpan Draft</button>
                <button type="button" disabled={saving} onClick={() => {
                  void saveEvaluation({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>, "published");
                }}>Publikasikan</button>
              </div>
            </form>
          </div>

          <div className="tutor-record-history">
            <h4>Proyek menunggu review ({pendingSubmissions.length})</h4>
            {pendingSubmissions.length === 0 && <p className="tutor-live-empty">Tidak ada proyek yang menunggu review dari siswa yang ditugaskan.</p>}
            {pendingSubmissions.map((submission) => (
              <article className="tutor-pending-submission" key={submission.id}>
                <div>
                  <strong>{submission.challengeTitle}</strong>
                  <span>{submission.studentName}{submission.studentGrade ? " · " + submission.studentGrade : ""} · {submission.topicTitle}</span>
                  <a href={submission.projectUrl} target="_blank" rel="noreferrer">Buka proyek siswa</a>
                  {submission.studentNotes && <p>{submission.studentNotes}</p>}
                </div>
                <label>Catatan review
                  <textarea
                    rows={2}
                    value={reviewNotes[submission.id] ?? ""}
                    onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
                    placeholder="Catatan untuk siswa; wajib jika meminta revisi"
                  />
                </label>
                <div className="tutor-record-actions">
                  <button type="button" disabled={saving} onClick={() => void reviewSubmission(submission.id, "approved")}>Setujui</button>
                  <button type="button" disabled={saving} onClick={() => void reviewSubmission(submission.id, "needs_revision")}>Minta Revisi</button>
                </div>
              </article>
            ))}
          </div>

          <div className="tutor-record-history">
            <h4>Riwayat laporan ({reports.length})</h4>
            {reports.map((report) => (
              <article key={report.id}>
                <strong>{report.topic}</strong>
                <span>{report.sessionDate} · {report.status === "submitted" ? "Terbit" : "Draft"} · v{report.version}</span>
              </article>
            ))}
            <h4>Evaluasi bulanan ({evaluations.length})</h4>
            {evaluations.map((evaluation) => (
              <article key={evaluation.id}>
                <strong>{evaluation.period} · {evaluation.rating ?? "Belum dinilai"}</strong>
                <span>{evaluation.status === "published" ? "Dipublikasikan" : "Draft"} · v{evaluation.version}</span>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
