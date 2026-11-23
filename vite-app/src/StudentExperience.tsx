import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseProductionCapabilities } from "./data/supabase-production-capabilities";
import { adaptSupabaseTopicToLegacyLesson } from "./data/supabase-lesson-adapter";

import type { CurriculumModule, CurriculumTopic } from "./data/domain-contracts";
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
type CurriculumEntry = { module: CurriculumModule; topic: CurriculumTopic };

export default function StudentExperience({ user }: { user: StudentUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [catalogue, setCatalogue] = useState<CurriculumEntry[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCatalogueLoading(true);
    setCatalogue([]);
    setSelectedModuleId(null);
    setSelectedTopicId(null);
    setFailed(null);

    void (async () => {
      try {
        const session = await supabaseProductionCapabilities.auth.getSession();
        if (!active) return;
        if (user.role !== "student" || session?.user?.id !== user.id || session?.user?.role !== "student") {
          throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
        }

        const modules = await supabaseProductionCapabilities.studentLearning.curriculum.listModules();
        if (!active) return;
        if (modules.length === 0) {
          throw new Error("Belum ada modul aktif yang ditugaskan ke akun siswa ini.");
        }

        const entries: CurriculumEntry[] = [];
        for (const module of modules) {
          const topics = await supabaseProductionCapabilities.studentLearning.curriculum.listTopics(module.id);
          if (!active) return;
          for (const topic of topics) entries.push({ module, topic });
        }
        if (entries.length === 0) {
          throw new Error("Modul aktif belum memiliki topik berstatus published.");
        }

        setCatalogue(entries);
        setSelectedModuleId(entries[0].module.id);
        setSelectedTopicId(entries[0].topic.id);
      } catch (error) {
        console.error("Student curriculum failed to load:", error);
        if (active) setFailed(error instanceof Error ? error.message : "Kurikulum gagal dimuat.");
      } finally {
        if (active) setCatalogueLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user.id, user.role]);

  const availableModules = useMemo(
    () => Array.from(new Map(catalogue.map(({ module }) => [module.id, module])).values()),
    [catalogue]
  );
  const availableTopics = useMemo(
    () => catalogue.filter(({ module }) => module.id === selectedModuleId),
    [catalogue, selectedModuleId]
  );
  const selectedEntry = catalogue.find(({ topic }) => topic.id === selectedTopicId) ?? null;

  useEffect(() => {
    let active = true;
    let controller: WorkspaceController | null = null;
    const host = hostRef.current;
    if (!host || !selectedEntry) return;

    setReady(false);
    setFailed(null);
    host.replaceChildren();

    void (async () => {
      try {
        const session = await supabaseProductionCapabilities.auth.getSession();
        if (!active) return;
        if (user.role !== "student" || session?.user?.id !== user.id || session?.user?.role !== "student") {
          throw new Error("Sesi siswa tidak valid. Silakan masuk kembali.");
        }

        const lesson = adaptSupabaseTopicToLegacyLesson(selectedEntry.module, selectedEntry.topic);
        controller = new LessonWorkspace(host, lesson, {
          id: user.id,
          name: user.displayName,
          avatar: user.avatar || user.displayName.slice(0, 2).toUpperCase(),
          role: "student",
          gradeLevel: user.gradeLevel || "Siswa"
        }, { learning: supabaseProductionCapabilities.studentLearning.createLessonBridge() }) as WorkspaceController;

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
      host.replaceChildren();
    };
  }, [user.id, user.displayName, user.avatar, user.gradeLevel, user.role, selectedEntry?.topic.id]);

  function handleModuleChange(value: string) {
    const moduleId = Number(value);
    const firstTopic = catalogue.find(({ module, topic }) => module.id === moduleId && topic)?.topic;
    setSelectedModuleId(moduleId);
    setSelectedTopicId(firstTopic?.id ?? null);
  }

  return (
    <section className="student-experience" aria-label="Ruang Belajarku" aria-busy={catalogueLoading || (!ready && !failed)}>
      <div className="card student-curriculum-selector" aria-label="Pilih materi belajar">
        <label htmlFor="student-module-select">Modul belajar</label>
        <select
          id="student-module-select"
          value={selectedModuleId ?? ""}
          onChange={(event) => handleModuleChange(event.target.value)}
          disabled={catalogueLoading || availableModules.length === 0}
        >
          {availableModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
        </select>
        <label htmlFor="student-topic-select">Topik</label>
        <select
          id="student-topic-select"
          value={selectedTopicId ?? ""}
          onChange={(event) => setSelectedTopicId(Number(event.target.value))}
          disabled={catalogueLoading || availableTopics.length === 0}
        >
          {availableTopics.map(({ topic }) => <option key={topic.id} value={topic.id}>{topic.sortOrder}. {topic.title}</option>)}
        </select>
      </div>
      {catalogueLoading && <div className="card student-loading" role="status">Memuat modul dan topik dari Supabase…</div>}
      {!catalogueLoading && !ready && !failed && <div className="card student-loading" role="status">Memuat materi dan progres belajar…</div>}
      {failed && <div className="card student-loading" role="alert"><strong>Ruang belajar belum bisa dibuka.</strong><p>{failed}</p></div>}
      <div ref={hostRef} className="student-lesson-host" />
    </section>
  );
}
