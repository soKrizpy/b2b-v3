import { useEffect, useRef, useState } from "react";
import { supabaseAuthRepository } from "./data/supabase-auth-repository";
// @ts-ignore - Legacy tutor controller is reused while its UI is migrated incrementally.
import { TeacherWorkspace } from "../../js/teacher-workspace.js";

type TutorUser = { id: string; displayName: string; role: "admin" | "tutor" | "student" };
type TutorController = { init: () => Promise<void>; destroy: () => void };

export default function TutorExperience({ user }: { user: TutorUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    let controller: TutorController | null = null;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        // Re-read the active session through the portal auth repository before mounting.
        const session = await supabaseAuthRepository.getSession();
        if (!active) return;
        if (user.role !== "tutor" ||
            session?.user?.id !== user.id ||
            session?.user?.role !== "tutor") {
          throw new Error("Sesi tutor tidak valid. Silakan masuk kembali.");
        }

        controller = new TeacherWorkspace(host, user) as TutorController;
        await controller.init();
        if (active) setStatus("ready");
        else controller.destroy();
      } catch (error) {
        console.error("Tutor workspace gagal dibuka:", error);
        if (active) setStatus("error");
      }
    })();

    return () => {
      active = false;
      controller?.destroy();
    };
  }, [user]);

  return (
    <section className="tutor-experience" aria-label="Ruang Tutor" aria-busy={status === "loading"}>
      {status === "loading" && <div className="card tutor-loading" role="status">Menyiapkan ruang tutor…</div>}
      {status === "error" && <div className="card tutor-loading" role="alert"><strong>Ruang tutor belum bisa dibuka.</strong><p>Sesi tutor tidak valid atau ruang sedang bermasalah. Silakan muat ulang halaman.</p></div>}
      <div ref={hostRef} className="tutor-workspace-host" />
    </section>
  );
}
