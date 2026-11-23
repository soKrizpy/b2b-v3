import { useEffect, useRef, useState } from "react";
import { supabaseProductionCapabilities } from "./data/supabase-production-capabilities";
// @ts-ignore - Existing Admin controller is reused during incremental migration.
import { AdminWorkspace } from "../../js/admin/admin-workspace.js";

type AdminController = { init: () => Promise<void>; destroy: () => void };

export default function AdminExperience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("Sesi Admin belum aktif. Silakan masuk menggunakan akun Admin.");

  useEffect(() => {
    let active = true;
    let controller: AdminController | null = null;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        // Selecting the Admin workspace must not silently authenticate or elevate a user.
        const session = await supabaseProductionCapabilities.auth.getSession();
        if (!active) return;
        if (session?.user?.role !== "admin") {
          throw new Error("Sesi Admin belum aktif. Silakan masuk menggunakan akun Admin.");
        }

        controller = new AdminWorkspace(host, session.user, { identity: supabaseProductionCapabilities.adminIdentity }, { productionMode: true }) as AdminController;
        await controller.init();
        if (active) setStatus("ready");
      } catch (error) {
        console.error("Ruang Admin gagal dibuka:", error);
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan saat membuka Ruang Admin.");
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      controller?.destroy();
    };
  }, []);

  return (
    <section className="admin-experience" aria-label="Ruang Admin" aria-busy={status === "loading"}>
      {status === "loading" && <div className="card admin-loading" role="status">Menyiapkan ruang admin…</div>}
      {status === "error" && <div className="card admin-loading" role="alert"><strong>Ruang Admin tidak dapat dibuka.</strong><p>{errorMessage}</p></div>}
      <div ref={hostRef} className="admin-workspace-host" />
    </section>
  );
}
