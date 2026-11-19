import { useEffect, useRef, useState } from "react";
// @ts-ignore - Legacy tutor controller is reused while its UI is migrated incrementally.
import { TeacherWorkspace } from "../../js/teacher-workspace.js";

type TutorController = { init: () => Promise<void>; destroy: () => void };

export default function TutorExperience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<TutorController | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (!host) return;

    const controller = new TeacherWorkspace(host) as TutorController;
    controllerRef.current = controller;
    void controller.init().then(() => {
      if (active) setStatus("ready");
      else controller.destroy();
    }).catch((error: unknown) => {
      console.error("Tutor workspace gagal dibuka:", error);
      if (active) setStatus("error");
    });

    return () => {
      active = false;
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  return (
    <section className="tutor-experience" aria-label="Ruang Tutor" aria-busy={status === "loading"}>
      {status === "loading" && <div className="card tutor-loading" role="status">Menyiapkan ruang tutor…</div>}
      {status === "error" && <div className="card tutor-loading" role="alert"><strong>Ruang tutor belum bisa dibuka.</strong><p>Silakan muat ulang halaman.</p></div>}
      <div ref={hostRef} className="tutor-workspace-host" />
      <div className="drawer-backdrop" id="sample-drawer" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="drawer-sample-title">
        <aside className="drawer">
          <div className="drawer-header">
            <div><span className="badge badge-submitted">Tinjau hasil karya</span><h3 className="drawer-title" id="drawer-sample-title">Hasil karya siswa</h3></div>
            <button type="button" className="btn btn-ghost btn-sm" data-drawer-close aria-label="Tutup">✕</button>
          </div>
          <div className="drawer-body">
            <div className="tutor-drawer-section"><strong>Link hasil karya</strong><a id="drawer-project-link" href="https://scratch.mit.edu/" target="_blank" rel="noopener noreferrer">Buka proyek siswa ↗</a></div>
            <div className="tutor-drawer-section"><strong>Catatan siswa</strong><p id="drawer-student-notes">Belum ada catatan.</p></div>
            <div className="tutor-drawer-stats"><div><small>Latihan selesai</small><strong id="drawer-checkpoints-info">-</strong></div><div><small>Nilai kuis</small><strong id="drawer-quiz-score">-</strong></div></div>
            <div className="form-group"><label className="form-label" htmlFor="teacher-feedback-input">Catatan untuk siswa</label><textarea id="teacher-feedback-input" className="form-control" rows={4} placeholder="Tulis pujian atau saran perbaikan…" /></div>
          </div>
          <div className="drawer-footer"><button type="button" className="btn btn-secondary" id="btn-drawer-revision">Minta diperbaiki</button><button type="button" className="btn btn-primary" id="btn-drawer-approve">Setujui karya</button></div>
        </aside>
      </div>
    </section>
  );
}
