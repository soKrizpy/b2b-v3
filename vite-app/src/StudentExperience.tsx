import { useEffect, useRef, useState } from "react";
import lessonData from "../../data/mock/lesson-scratch-motion.json";
import submissions from "../../data/mock/submissions.json";
// @ts-ignore - Existing JavaScript controller is reused during incremental migration.
import { LessonWorkspace } from "../../js/lesson-workspace.js";
// @ts-ignore - Existing JavaScript data store is reused during incremental migration.
import { StateStore } from "../../js/services/state-store.js";
// @ts-ignore - Validate the active role again at the workspace boundary.
import { AuthService } from "../../js/services/auth-service.js";

type StudentUser = { id: string; displayName: string; avatar?: string; gradeLevel?: string; role: string };
type WorkspaceController = { init: () => void; destroy: () => void };

export default function StudentExperience({ user }: { user: StudentUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<WorkspaceController | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    try {
      const session = AuthService.getCurrentSession();
      if (user.role !== "student" || session?.user?.id !== user.id || session?.user?.role !== "student") {
        throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
      }
      StateStore.seedSubmissionsIfEmpty(submissions);
      const controller = new LessonWorkspace(host, lessonData, {
        id: user.id, name: user.displayName, avatar: user.avatar || user.displayName.slice(0, 2).toUpperCase(),
        role: "student", gradeLevel: user.gradeLevel || "Siswa"
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
  }, [user]);

  return (
    <section className="student-experience" aria-label="Ruang Belajarku" aria-busy={!ready && !failed}>
      {!ready && !failed && <div className="card student-loading" role="status">Menyiapkan petualangan belajarmu…</div>}
      {failed && <div className="card student-loading" role="alert"><strong>Wah, petualangan belum bisa dibuka.</strong><p>Sesi siswa tidak valid. Silakan keluar dan masuk kembali.</p></div>}
      <div ref={hostRef} className="student-lesson-host" />
    </section>
  );
}
