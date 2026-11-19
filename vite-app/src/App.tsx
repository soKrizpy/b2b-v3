import { useEffect, useMemo, useState } from "react";
import logoLight from "../../logo-b2b-light.svg";
import logoDark from "../../logo-b2b-dark.svg";
import StudentExperience from "./StudentExperience";
import TutorExperience from "./TutorExperience";
import AdminExperience from "./AdminExperience";
import { localDemoRepositories } from "./data/local-demo-repositories";
import type { DemoSession, DemoUser, RoleId } from "./data/repositories";

type Role = { id: RoleId; icon: string; label: string; title: string; description: string; badgeClass: string; accentClass: string };
const roles: Role[] = [
  { id: "admin", icon: "👑", label: "Admin", title: "Ruang Admin", description: "Atur akun, tutor, siswa, jadwal belajar, dan materi.", badgeClass: "badge-warning", accentClass: "role-card--admin" },
  { id: "tutor", icon: "👩‍🏫", label: "Tutor", title: "Ruang Tutor", description: "Lihat siswa, periksa hasil karya, dan kirim laporan belajar.", badgeClass: "badge-scratch", accentClass: "role-card--tutor" },
  { id: "student", icon: "🎒", label: "Siswa", title: "Ruang Belajarku", description: "Lanjutkan petualangan coding, kerjakan tantangan, dan lihat perkembangan belajarmu.", badgeClass: "badge-approved", accentClass: "role-card--student" }
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [session, setSession] = useState<DemoSession>(null);
  const [accounts, setAccounts] = useState<DemoUser[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    const unsubscribe = localDemoRepositories.auth.subscribe((next) => {
      if (!active) return;
      setSession(next);
      if (next && ["admin", "tutor", "student"].includes(next.user.role)) {
        setSelectedRole(next.user.role as RoleId);
      }
      if (!next) setSelectedRole(null);
    });

    void (async () => {
      await localDemoRepositories.identity.initializeDemo();
      const activeSession = await localDemoRepositories.auth.getSession();
      if (!active) return;
      setSession(activeSession);
      if (activeSession && ["admin", "tutor", "student"].includes(activeSession.user.role)) {
        setSelectedRole(activeSession.user.role as RoleId);
      }
    })().catch((error: unknown) => {
      console.error("Portal demo gagal diinisialisasi:", error);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedRole) {
      setAccounts([]);
      return;
    }
    void localDemoRepositories.identity.listActiveAccounts(selectedRole)
      .then((activeAccounts) => {
        if (active) setAccounts(activeAccounts);
      })
      .catch((error: unknown) => {
        console.error("Daftar akun demo gagal dimuat:", error);
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, [selectedRole]);

  const selectedRoleInfo = roles.find((role) => role.id === selectedRole);
  const roleAccounts = useMemo(
    () => accounts.filter((account) => account.role === selectedRole && account.status === "active"),
    [accounts, selectedRole]
  );

  function chooseRole(role: RoleId) {
    setLoginError("");
    setSelectedRole(role);
    setSelectedAccountId("");
  }

  async function signIn() {
    setLoginError("");
    if (!selectedRole || !selectedAccountId) {
      setLoginError("Pilih akun terlebih dahulu.");
      return;
    }
    const account = roleAccounts.find((item) => item.id === selectedAccountId);
    if (!account || account.role !== selectedRole || account.status !== "active") {
      setLoginError("Akun tidak sesuai atau sedang tidak aktif.");
      return;
    }
    const result = await localDemoRepositories.auth.signIn(selectedAccountId);
    if (!result.success) {
      setLoginError(result.message || "Akun demo tidak dapat digunakan.");
      return;
    }
    setSession(result.session);
  }

  async function signOut() {
    await localDemoRepositories.auth.signOut();
    setSession(null);
    setSelectedRole(null);
    setSelectedAccountId("");
    setLoginError("");
  }

  const authenticated = Boolean(session && selectedRole && session.user.role === selectedRole);
  const workspaceTitle = selectedRole === "student" ? "Ruang Belajarku" : selectedRole === "tutor" ? "Ruang Tutor" : selectedRole === "admin" ? "Ruang Admin" : "Bits2Bytes";

  return (
    <div className="app-shell b2b-vite-shell">
      <aside className="app-sidebar" aria-label="Navigasi utama">
        <div className="sidebar-header">
          <picture><source srcSet={logoDark} media="(prefers-color-scheme: dark)" /><img src={theme === "dark" ? logoDark : logoLight} alt="Bits2Bytes" className="brand-logo" width="36" height="36" /></picture>
          <div><div className="brand-title">Bits2Bytes</div><div className="brand-subtitle">Tempat belajar coding</div></div>
        </div>
        <nav className="sidebar-content" aria-label="Menu">
          <div><div className="nav-section-title">Menu utama</div><ul className="nav-list"><li className="nav-item"><a className="nav-link active" href="#portal" aria-current="page"><span className="nav-icon" aria-hidden="true">🚪</span><span>{authenticated ? workspaceTitle : "Pilih Ruang"}</span></a></li></ul></div>
          <div className="sidebar-footer b2b-vite-sidebar-note"><strong>Belajar, berkarya, dan bertumbuh!</strong><small>Temukan hal baru dan buat karya hebat bersama Bits2Bytes.</small></div>
        </nav>
        <div className="sidebar-footer"><small>Bits2Bytes Learning</small></div>
      </aside>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left"><h1 id="page-heading">{workspaceTitle}</h1></div>
          <div className="header-right">
            {authenticated && <button type="button" className="btn btn-secondary btn-sm" onClick={signOut}>Keluar</button>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Ganti ke tampilan gelap" : "Ganti ke tampilan terang"} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span><span>{theme === "light" ? "Tampilan gelap" : "Tampilan terang"}</span></button>
          </div>
        </header>
        <main className="app-main" id="portal">
          {!selectedRole && <section aria-labelledby="portal-title">
            <div className="b2b-vite-intro"><h2 id="portal-title">Selamat datang di Bits2Bytes!</h2><p>Pilih ruang sesuai kebutuhanmu untuk mulai beraktivitas.</p></div>
            <div className="b2b-vite-role-grid">{roles.map((role) => <article className={`card b2b-vite-role-card ${role.accentClass}`} key={role.id}>
              <div><div className="b2b-vite-role-meta"><span className="b2b-vite-role-icon" aria-hidden="true">{role.icon}</span><span className={`badge ${role.badgeClass}`}>{role.label}</span></div><h3>{role.title}</h3><p>{role.description}</p></div>
              <button type="button" className="btn btn-primary btn-sm b2b-vite-role-action" onClick={() => chooseRole(role.id)}>Pilih ruang <span aria-hidden="true">→</span></button>
            </article>)}</div>
            <p className="b2b-vite-demo-note">Mode uji coba: masuk menggunakan akun demo yang tersedia.</p>
          </section>}

          {selectedRole && !authenticated && <section className="b2b-login-panel card" aria-labelledby="login-title">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedRole(null); setLoginError(""); }}>← Kembali</button>
            <div className="b2b-vite-intro"><h2 id="login-title">Masuk ke {selectedRoleInfo?.title}</h2><p>Pilih akun demo yang ingin digunakan.</p></div>
            <label className="form-label" htmlFor="demo-account">Akun {selectedRoleInfo?.label}</label>
            <select id="demo-account" className="form-control" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
              <option value="">Pilih akun…</option>
              {roleAccounts.map((account) => <option value={account.id} key={account.id}>{account.displayName} — {account.email}</option>)}
            </select>
            {loginError && <p className="b2b-login-error" role="alert">{loginError}</p>}
            <p className="b2b-login-disclaimer">Ini akun simulasi untuk pengujian. Belum menggunakan password atau autentikasi produksi.</p>
            <button type="button" className="btn btn-primary" onClick={signIn} disabled={!selectedAccountId}>Masuk sebagai {selectedRoleInfo?.label}</button>
          </section>}

          {authenticated && selectedRole === "student" && <StudentExperience user={session!.user} />}
          {authenticated && selectedRole === "tutor" && <TutorExperience user={session!.user} />}
          {authenticated && selectedRole === "admin" && <AdminExperience />}
          {session && selectedRole && !authenticated && <p className="b2b-login-error" role="alert">Peran akun tidak cocok dengan ruang yang dipilih. Silakan keluar dan masuk kembali.</p>}
        </main>
      </div>
    </div>
  );
}
