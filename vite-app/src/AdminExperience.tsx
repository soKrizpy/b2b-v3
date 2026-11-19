import { useEffect, useRef, useState } from "react";
// @ts-ignore - Reuse the existing local identity management during incremental migration.
import { AdminWorkspace } from "../../js/admin/admin-workspace.js";
// @ts-ignore - Existing demo identity store remains the source of truth for this stage.
import { IdentityStore } from "../../js/services/identity-store.js";
// @ts-ignore - Read the active local session; never grant a role during workspace initialization.
import { AuthService } from "../../js/services/auth-service.js";

type AdminController = { init: () => void; destroy: () => void };

export default function AdminExperience() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("Sesi Admin belum aktif. Silakan masuk menggunakan akun Admin.");

  useEffect(() => {
    let active = true;
    const host = hostRef.current;
    if (!host) return;

    let controller: AdminController | null = null;
    try {
      IdentityStore.seedIfEmpty();
      const session = AuthService.getCurrentSession();

      // Selecting the Admin workspace must not silently authenticate or elevate a user.
      if (session?.user?.role !== "admin") {
        throw new Error("Sesi Admin belum aktif. Silakan masuk menggunakan akun Admin.");
      }

      controller = new AdminWorkspace(host) as AdminController;
      controller.init();
      if (active) setStatus("ready");
    } catch (error) {
      console.error("Ruang Admin gagal dibuka:", error);
      if (active) {
        setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan saat membuka Ruang Admin.");
        setStatus("error");
      }
    }

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
