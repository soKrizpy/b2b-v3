import { useEffect, useRef, useState } from "react";
import lessonData from "../../data/mock/lesson-scratch-motion.json";
import submissions from "../../data/mock/submissions.json";
import { localDemoRepositories } from "./data/local-demo-repositories";
// @ts-ignore - Existing JavaScript controller is reused during incremental migration.
import { LessonWorkspace } from "../../js/lesson-workspace.js";
// @ts-ignore - Async repository boundary wraps the local demo submission store.
import { LearningStateRepository } from "../../js/services/learning-state-repository.js";

type StudentUser = { id: string; displayName: string; avatar?: string; gradeLevel?: string; role: string };
type WorkspaceController = { init: () => Promise<void>; destroy: () => void };

export default function StudentExperience({ user }: { user: StudentUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<WorkspaceController | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let controller: WorkspaceController | null = null;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        // Re-read identity through the same repository boundary used by portal login.
        const session = await localDemoRepositories.auth.getSession();
        if (!active) return;
        if (user.role !== "student" || session?.user?.id !== user.id || session?.user?.role !== "student") {
          throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
        }

        await LearningStateRepository.seedSubmissionsIfEmpty(submissions);
        controller = new LessonWorkspace(host, lessonData, {
          id: user.id, name: user.displayName, avatar: user.avatar || user.displayName.slice(0, 2).toUpperCase(),
          role: "student", gradeLevel: user.gradeLevel || "Siswa"
        }) as WorkspaceController;
        controllerRef.current = controller;
        await controller.init();
        if (active) setReady(true);
      } catch (error) {
        console.error("Student experience failed to initialize:", error);
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
      controller?.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
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
