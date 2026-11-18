import { useEffect, useRef, useState } from "react";
import lessonData from "../../data/mock/lesson-scratch-motion.json";
import submissions from "../../data/mock/submissions.json";
// @ts-ignore - Existing JavaScript controller is reused during incremental migration.
import { LessonWorkspace } from "../../js/lesson-workspace.js";
// @ts-ignore - Existing JavaScript data store is reused during incremental migration.
import { StateStore } from "../../js/services/state-store.js";

type WorkspaceController = { init: () => void; destroy: () => void };

export default function StudentExperience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<WorkspaceController | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      StateStore.seedSubmissionsIfEmpty(submissions);
      const controller = new LessonWorkspace(host, lessonData, {
        id: "usr_stu_001", name: "Alex Pratama", avatar: "AP", role: "student", gradeLevel: "Kelas 5"
      }) as WorkspaceController;
      controllerRef.current = controller;
      controller.init();
      setReady(true);
    } catch (error) {
      console.error("Student experience failed to initialize:", error);
      setFailed(true);
    }
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  return (
    <section className="student-experience" aria-label="Ruang Belajarku" aria-busy={!ready && !failed}>
      {!ready && !failed && <div className="card student-loading" role="status">Menyiapkan petualangan belajarmu…</div>}
      {failed && <div className="card student-loading" role="alert"><strong>Wah, petualangan belum bisa dibuka.</strong><p>Coba muat ulang halaman ini, ya.</p></div>}
      <div ref={hostRef} className="student-lesson-host" />
    </section>
  );
}
