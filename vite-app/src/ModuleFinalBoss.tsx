import { useEffect, useState } from "react";
import {
  loadStudentModuleAssessment,
  submitStudentModuleAssessment,
  type AssessmentOptionKey,
  type StudentAssessmentResult,
  type StudentModuleAssessment,
} from "./data/supabase-module-assessment-repository";
import { getCurrentAssessmentQuestion } from "./data/module-assessment-sequence";

const OPTION_KEYS: AssessmentOptionKey[] = ["A", "B", "C", "D"];

export default function ModuleFinalBoss({ assessmentId }: { assessmentId: number }) {
  const [assessment, setAssessment] = useState<StudentModuleAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<number, AssessmentOptionKey>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState<StudentAssessmentResult["result"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    void loadStudentModuleAssessment(assessmentId)
      .then((data) => { if (active) setAssessment(data); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Ujian belum dapat dimuat.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assessmentId]);

  const questions = assessment?.questions ?? [];
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const activeQuestion = getCurrentAssessmentQuestion(questions, currentQuestionIndex);
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercent = questions.length > 0
    ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100)
    : 0;
  const attemptsRemaining = assessment?.attemptsRemaining ?? 0;
  const canStart = Boolean(assessment && attemptsRemaining > 0);

  async function handleSubmit() {
    if (!assessment || !canStart || answeredCount !== questions.length || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const submission = await submitStudentModuleAssessment(assessment.assessment.id, questions.map((question) => ({
        questionId: question.id,
        selectedOption: answers[question.id]!,
      })));
      setResult(submission.result);
      setAnswers({});
      setCurrentQuestionIndex(0);
      const refreshed = await loadStudentModuleAssessment(assessment.assessment.id);
      setAssessment(refreshed);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Jawaban ujian gagal dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextQuestion() {
    if (!activeQuestion || !activeAnswer || isLastQuestion) return;
    setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  return (
    <section className="card module-final-boss" aria-labelledby="module-final-boss-title" aria-busy={loading || submitting}>
      <div className="module-final-boss__header">
        <div>
          <p className="module-final-boss__eyebrow">Ujian akhir modul</p>
          <h2 id="module-final-boss-title">{assessment?.assessment.title ?? "Final Boss"}</h2>
          <p>Uji pemahamanmu dari seluruh materi Basic Visual Web.</p>
        </div>
        <span className="module-final-boss__count">{questions.length || "—"} soal</span>
      </div>

      {loading && <p role="status">Memuat ujian dari Supabase…</p>}
      {!loading && error && <p className="module-final-boss__error" role="alert">{error}</p>}

      {!loading && assessment && <>
        <div className="module-final-boss__meta">
          <span>Sisa percobaan: <strong>{assessment.attemptsRemaining} dari 2</strong></span>
          <span>Terjawab: <strong>{answeredCount} dari {questions.length}</strong></span>
        </div>

        {result && <div className="module-final-boss__result" role="status">
          <strong>Percobaan {result.attemptNumber} selesai — nilai {result.score}/100</strong>
          <span>{result.correctCount} dari {result.totalQuestions} jawaban benar. Nilai terbaik: {result.bestScore}/100.</span>
        </div>}

        {assessment.attempts.length > 0 && <div className="module-final-boss__history">
          <strong>Riwayat ujian</strong>
          <ul>
            {assessment.attempts.map((attempt) => (
              <li key={attempt.attempt_number}>Percobaan {attempt.attempt_number}: {attempt.score}/100</li>
            ))}
          </ul>
        </div>}

        {canStart && activeQuestion ? <>
          <div className="module-final-boss__question-progress" aria-live="polite">
            <div className="module-final-boss__question-progress-label">
              <span>Soal {currentQuestionIndex + 1} dari {questions.length}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="module-final-boss__progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="module-final-boss__progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="module-final-boss__questions">
            <fieldset className="module-final-boss__question" disabled={submitting}>
              <legend>{currentQuestionIndex + 1}. {activeQuestion.questionText}</legend>
              {OPTION_KEYS.map((option) => (
                <label className="module-final-boss__option" key={option}>
                  <input
                    type="radio"
                    name={`assessment-question-${activeQuestion.id}`}
                    value={option}
                    checked={activeAnswer === option}
                    onChange={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: option }))}
                  />
                  <span><strong>{option}.</strong> {activeQuestion.options[option]}</span>
                </label>
              ))}
            </fieldset>
          </div>

          {isLastQuestion ? (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || answeredCount !== questions.length}>
              {submitting ? "Memeriksa jawaban…" : "Kirim jawaban Final Boss"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleNextQuestion} disabled={!activeAnswer || submitting}>
              Soal Berikutnya →
            </button>
          )}
          {answeredCount !== questions.length && isLastQuestion && <small className="module-final-boss__hint">Jawab semua soal sebelum mengirim.</small>}
        </> : canStart && questions.length === 0 ? (
          <p className="module-final-boss__closed">Belum ada soal ujian yang tersedia.</p>
        ) : !canStart ? (
          <p className="module-final-boss__closed">Semua percobaan ujian telah digunakan.</p>
        ) : null}
      </>}
    </section>
  );
}
