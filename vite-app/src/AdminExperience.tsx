import { useEffect, useRef, useState } from "react";
// @ts-ignore - Reuse the existing local identity management during incremental migration.
import { AdminWorkspace } from "../../js/admin/admin-workspace.js";
// @ts-ignore - Existing demo identity store remains the source of truth for this stage.
import { IdentityStore } from "../../js/services/identity-store.js";
// @ts-ignore - Existing local demo session service enforces the legacy admin access guard.
import { AuthService } from "../../js/services/auth-service.js";

type AdminController = { init: () => void; destroy: () => void };

export default function AdminExperience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (!host) return;

    let controller: AdminController | null = null;
    try {
      IdentityStore.seedIfEmpty();
      const session = AuthService.getCurrentSession();
      if (session?.user?.role !== "admin") {
        const result = AuthService.signInDemo("usr_adm_001");
        if (!result?.success) throw new Error(result?.message || "Akun demo admin tidak tersedia.");
      }

      controller = new AdminWorkspace(host) as AdminController;
      controller.init();
      setStatus("ready");
    } catch (error) {
      console.error("Ruang Admin gagal dibuka:", error);
      if (active) setStatus("error");
    }

    return () => {
      active = false;
      controller?.destroy();
    };
  }, []);

  return (
    <section className="admin-experience" aria-label="Ruang Admin" aria-busy={status === "loading"}>
      {status === "loading" && <div className="card admin-loading" role="status">Menyiapkan ruang admin…</div>}
      {status === "error" && <div className="card admin-loading" role="alert"><strong>Ruang Admin belum bisa dibuka.</strong><p>Pastikan akun demo Admin tersedia, lalu muat ulang halaman.</p></div>}
      <div ref={hostRef} className="admin-workspace-host" />
    </section>
  );
}
