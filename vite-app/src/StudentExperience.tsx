import { useEffect, useRef, useState } from "react";
import { supabaseAuthRepository } from "./data/supabase-auth-repository";
import { supabaseCurriculumRepository } from "./data/supabase-curriculum-repository";
import { adaptSupabaseTopicToLegacyLesson } from "./data/supabase-lesson-adapter";
import { createSupabaseLegacyLearningBridge } from "./data/supabase-legacy-learning-bridge";
// @ts-ignore - Existing JavaScript lesson renderer is reused during migration.
import { LessonWorkspace } from "../../js/lesson-workspace.js";

type StudentUser = {
  id: string;
  displayName: string;
  avatar?: string;
  gradeLevel?: string;
  role: string;
};
type WorkspaceController = { init: () => Promise<void>; destroy: () => void };

export default function StudentExperience({ user }: { user: StudentUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: WorkspaceController | null = null;
    const host = hostRef.current;
    if (!host) return;

    setReady(false);
    setFailed(null);

    void (async () => {
      try {
        const session = await supabaseAuthRepository.getSession();
        if (!active) return;
        if (user.role !== "student" || session?.user?.id !== user.id || session?.user?.role !== "student") {
          throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
        }

        // Load the first module/topic the authenticated student is enrolled in.
        // No local JSON, demo seed, or hard-coded student identity is used.
        const modules = await supabaseCurriculumRepository.listModules();
        if (!active) return;
        if (modules.length === 0) {
          throw new Error("Belum ada modul aktif yang ditugaskan ke akun siswa ini.");
        }

        let selected: { module: (typeof modules)[number]; topic: Awaited<ReturnType<typeof supabaseCurriculumRepository.listTopics>>[number] } | null = null;
        for (const module of modules) {
          const topics = await supabaseCurriculumRepository.listTopics(module.id);
          if (!active) return;
          const topic = topics[0];
          if (topic) {
            selected = { module, topic };
            break;
          }
        }
        if (!selected) throw new Error("Modul aktif belum memiliki topik berstatus published.");

        const lesson = adaptSupabaseTopicToLegacyLesson(selected.module, selected.topic);
        const learning = createSupabaseLegacyLearningBridge();
        controller = new LessonWorkspace(host, lesson, {
          id: user.id,
          name: user.displayName,
          avatar: user.avatar || user.displayName.slice(0, 2).toUpperCase(),
          role: "student",
          gradeLevel: user.gradeLevel || "Siswa"
        }, { learning }) as WorkspaceController;

        await controller.init();
        if (active) setReady(true);
      } catch (error) {
        console.error("Student experience failed to initialize:", error);
        if (active) setFailed(error instanceof Error ? error.message : "Ruang belajar gagal dimuat.");
      }
    })();

    return () => {
      active = false;
      controller?.destroy();
    };
  }, [user.id, user.displayName, user.avatar, user.gradeLevel, user.role]);

  return (
    <section className="student-experience" aria-label="Ruang Belajarku" aria-busy={!ready && !failed}>
      {!ready && !failed && <div className="card student-loading" role="status">Memuat kurikulum dan progres dari Bits2Bytes…</div>}
      {failed && <div className="card student-loading" role="alert"><strong>Ruang belajar belum bisa dibuka.</strong><p>{failed}</p></div>}
      <div ref={hostRef} className="student-lesson-host" />
    </section>
  );
}
