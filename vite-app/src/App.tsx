import { useEffect, useState } from "react";
import logoLight from "../../logo-b2b-light.svg";
import logoDark from "../../logo-b2b-dark.svg";
import StudentExperience from "./StudentExperience";
import TutorExperience from "./TutorExperience";

type Role = { id: "admin" | "tutor" | "student"; icon: string; label: string; title: string; description: string; badgeClass: string; accentClass: string };
const roles: Role[] = [
  { id: "admin", icon: "👑", label: "Admin", title: "Ruang Admin", description: "Atur akun, tutor, siswa, jadwal belajar, dan materi.", badgeClass: "badge-warning", accentClass: "role-card--admin" },
  { id: "tutor", icon: "👩‍🏫", label: "Tutor", title: "Ruang Tutor", description: "Lihat siswa, periksa hasil karya, dan kirim laporan belajar.", badgeClass: "badge-scratch", accentClass: "role-card--tutor" },
  { id: "student", icon: "🎒", label: "Siswa", title: "Ruang Belajarku", description: "Lanjutkan petualangan coding, kerjakan tantangan, dan lihat perkembangan belajarmu.", badgeClass: "badge-approved", accentClass: "role-card--student" }
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedRole, setSelectedRole] = useState<Role["id"] | null>(null);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const selected = roles.find((role) => role.id === selectedRole);
  const workspaceTitle = selectedRole === "student" ? "Ruang Belajarku" : selectedRole === "tutor" ? "Ruang Tutor" : "Bits2Bytes";

  return (
    <div className="app-shell b2b-vite-shell">
      <aside className="app-sidebar" aria-label="Navigasi utama">
        <div className="sidebar-header">
          <picture><source srcSet={logoDark} media="(prefers-color-scheme: dark)" /><img src={theme === "dark" ? logoDark : logoLight} alt="Bits2Bytes" className="brand-logo" width="36" height="36" /></picture>
          <div><div className="brand-title">Bits2Bytes</div><div className="brand-subtitle">Tempat belajar coding</div></div>
        </div>
        <nav className="sidebar-content" aria-label="Menu">
          <div><div className="nav-section-title">Menu utama</div><ul className="nav-list"><li className="nav-item"><a className="nav-link active" href="#portal" aria-current="page"><span className="nav-icon" aria-hidden="true">🚪</span><span>Pilih Ruang</span></a></li></ul></div>
          <div className="sidebar-footer b2b-vite-sidebar-note"><strong>Belajar, berkarya, dan bertumbuh!</strong><small>Temukan hal baru dan buat karya hebat bersama Bits2Bytes.</small></div>
        </nav>
        <div className="sidebar-footer"><small>Bits2Bytes Learning</small></div>
      </aside>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left"><h1 id="page-heading">{workspaceTitle}</h1></div>
          <div className="header-right"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Ganti ke tampilan gelap" : "Ganti ke tampilan terang"} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span><span>{theme === "light" ? "Tampilan gelap" : "Tampilan terang"}</span></button></div>
        </header>
        <main className="app-main" id="portal">
          {selectedRole === "student" && <StudentExperience />}
          {selectedRole === "tutor" && <TutorExperience />}
          {!selectedRole && <section aria-labelledby="portal-title">
            <div className="b2b-vite-intro"><h2 id="portal-title">Selamat datang di Bits2Bytes!</h2><p>Pilih ruang sesuai kebutuhanmu untuk mulai beraktivitas.</p></div>
            <div className="b2b-vite-role-grid">{roles.map((role) => <article className={`card b2b-vite-role-card ${role.accentClass}`} key={role.id}>
              <div><div className="b2b-vite-role-meta"><span className="b2b-vite-role-icon" aria-hidden="true">{role.icon}</span><span className={`badge ${role.badgeClass}`}>{role.label}</span></div><h3>{role.title}</h3><p>{role.description}</p></div>
              <button type="button" className="btn btn-primary btn-sm b2b-vite-role-action" onClick={() => setSelectedRole(role.id)}>Masuk <span aria-hidden="true">→</span></button>
            </article>)}</div>
          </section>}
          {selectedRole && <button type="button" className="btn btn-secondary btn-sm workspace-portal-back" onClick={() => setSelectedRole(null)}>← Kembali ke pilihan ruang</button>}
          {selectedRole === "admin" && <div className="card b2b-vite-notice" role="status"><div><strong>Ruang Admin sedang disiapkan.</strong><p>Menu admin akan dibuka setelah alur pengelolaan data selesai diperiksa.</p></div></div>}
        </main>
      </div>
    </div>
  );
}
