import { useEffect, useRef, useState } from "react";
// @ts-ignore - Legacy tutor controller is reused while its UI is migrated incrementally.
import { TeacherWorkspace } from "../../js/teacher-workspace.js";
// @ts-ignore - Validate the active role again at the workspace boundary.
import { AuthService } from "../../js/services/auth-service.js";

type TutorUser = { id: string; displayName: string; role: string };
type TutorController = { init: () => Promise<void>; destroy: () => void };

export default function TutorExperience({ user }: { user: TutorUser }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (!host) return;

    let controller: TutorController | null = null;
    try {
      const session = AuthService.getCurrentSession();
      if ((user.role !== "tutor" && user.role !== "teacher") || session?.user?.id !== user.id ||
          (session?.user?.role !== "tutor" && session?.user?.role !== "teacher")) {
        throw new Error("Sesi tutor tidak valid. Silakan masuk kembali.");
      }
      controller = new TeacherWorkspace(host) as TutorController;
      void controller.init().then(() => {
        if (active) setStatus("ready");
        else controller?.destroy();
      }).catch((error: unknown) => {
        console.error("Tutor workspace gagal dibuka:", error);
        if (active) setStatus("error");
      });
    } catch (error) {
      console.error("Tutor workspace gagal dibuka:", error);
      setStatus("error");
    }

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
