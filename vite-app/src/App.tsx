import { useEffect, useState } from "react";
import logoLight from "../../logo-b2b-light.svg";
import logoDark from "../../logo-b2b-dark.svg";

type Role = {
  id: "admin" | "tutor" | "student";
  icon: string;
  label: string;
  title: string;
  description: string;
  badgeClass: string;
  accentClass: string;
};

const roles: Role[] = [
  {
    id: "admin",
    icon: "👑",
    label: "Administrator",
    title: "Admin Workspace",
    description: "Kelola akun, penugasan tutor-siswa, kurikulum, jadwal, dan operasional platform.",
    badgeClass: "badge-warning",
    accentClass: "role-card--admin"
  },
  {
    id: "tutor",
    icon: "👩‍🏫",
    label: "Tutor",
    title: "Teacher Workspace",
    description: "Kelola siswa, tinjau submission, berikan umpan balik, dan catat laporan sesi.",
    badgeClass: "badge-scratch",
    accentClass: "role-card--tutor"
  },
  {
    id: "student",
    icon: "🎒",
    label: "Siswa",
    title: "Student Workspace",
    description: "Ikuti Quest Map, pelajari materi, kerjakan proyek, dan akses Parent Hub untuk laporan sesi, evaluasi bulanan, serta riwayat invoice anak.",
    badgeClass: "badge-approved",
    accentClass: "role-card--student"
  }
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedRole, setSelectedRole] = useState<Role["id"] | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const selected = roles.find((role) => role.id === selectedRole);

  return (
    <div className="app-shell b2b-vite-shell">
      <aside className="app-sidebar" aria-label="Navigasi utama">
        <div className="sidebar-header">
          <picture>
            <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
            <img
              src={theme === "dark" ? logoDark : logoLight}
              alt="Bits2Bytes"
              className="brand-logo"
              width="36"
              height="36"
            />
          </picture>
          <div>
            <div className="brand-title">Learning Engine</div>
            <div className="brand-subtitle">Vite + React</div>
          </div>
        </div>

        <nav className="sidebar-content" aria-label="Menu">
          <div>
            <div className="nav-section-title">Portal</div>
            <ul className="nav-list">
              <li className="nav-item">
                <a className="nav-link active" href="#portal" aria-current="page">
                  <span className="nav-icon" aria-hidden="true">🚪</span>
                  <span>Pilih Workspace</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="sidebar-footer b2b-vite-sidebar-note">
            <strong>Model Vite</strong>
            <small>Versi React sedang dimigrasikan bertahap. Aplikasi Vanilla tetap dipertahankan.</small>
          </div>
        </nav>

        <div className="sidebar-footer">
          <small>Bits2Bytes Learning Engine · Vite 0.1.0</small>
        </div>
      </aside>

      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <h1 id="page-heading">Portal Workspace · Bits2Bytes</h1>
          </div>
          <div className="header-right">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "Aktifkan dark mode" : "Aktifkan light mode"}
              aria-pressed={theme === "dark"}
            >
              <span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span>
              <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
            </button>
          </div>
        </header>

        <main className="app-main" id="portal">
          <section aria-labelledby="portal-title">
            <div className="b2b-vite-intro">
              <div>
                <span className="badge badge-completed">Vite + React + TypeScript</span>
                <h2 id="portal-title">Selamat datang di Bits2Bytes</h2>
                <p>
                  Pilih workspace untuk melihat pengalaman sesuai peran. Ini adalah tahap pertama
                  migrasi dari Vanilla JavaScript ke React; desain dan data lama tetap dijaga.
                </p>
              </div>
            </div>

            <div className="b2b-vite-role-grid">
              {roles.map((role) => (
                <article className={`card b2b-vite-role-card ${role.accentClass}`} key={role.id}>
                  <div>
                    <div className="b2b-vite-role-meta">
                      <span className="b2b-vite-role-icon" aria-hidden="true">{role.icon}</span>
                      <span className={`badge ${role.badgeClass}`}>{role.label}</span>
                    </div>
                    <h3>{role.title}</h3>
                    <p>{role.description}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm b2b-vite-role-action"
                    onClick={() => setSelectedRole(role.id)}
                  >
                    Buka workspace <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>

            {selected && (
              <div className="card b2b-vite-notice" role="status" aria-live="polite">
                <div>
                  <strong>{selected.title} dipilih.</strong>
                  <p>
                    Workspace ini sedang dalam antrean migrasi. Fitur belum dinyatakan selesai
                    sebelum alur aslinya dipindahkan dan diuji.
                  </p>
                  {selected.id === "student" && (
                    <p>
                      Parent Hub menjadi bagian dari Student Workspace, bukan workspace atau role
                      terpisah. Akses laporan orang tua akan memakai area khusus di akun siswa.
                    </p>
                  )}
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedRole(null)}>
                  Tutup
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
