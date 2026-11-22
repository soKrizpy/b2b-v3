import { useEffect, useState, type FormEvent } from "react";
import logoLight from "../../logo-b2b-light.svg";
import logoDark from "../../logo-b2b-dark.svg";
import StudentExperience from "./StudentExperience";
import TutorExperience from "./TutorExperience";
import AdminExperience from "./AdminExperience";
import { supabaseAuthRepository } from "./data/supabase-auth-repository";
import type { AuthSession } from "./data/domain-contracts";

const workspaceTitles = {
  admin: "Ruang Admin",
  tutor: "Ruang Tutor",
  student: "Ruang Belajarku"
} as const;

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<"student" | "staff">("student");
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let active = true;
    const unsubscribe = supabaseAuthRepository.subscribe((next) => {
      if (active) setSession(next);
    });

    void supabaseAuthRepository.getSession()
      .then((current) => {
        if (active) setSession(current);
      })
      .catch((error: unknown) => {
        console.error("Pemulihan sesi Supabase gagal:", error);
        if (active) setLoginError("Sesi tidak dapat dipulihkan. Silakan masuk kembali.");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    if (loginMode === "student" && (!phone.trim() || !/^\d{6}$/.test(mpin))) {
      setLoginError("Masukkan nomor WhatsApp dan MPIN 6 digit.");
      return;
    }
    if (loginMode === "staff" && (!email.trim() || !password)) {
      setLoginError("Masukkan email dan password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = loginMode === "student"
        ? await supabaseAuthRepository.signInStudent({ phone: phone.trim(), mpin })
        : await supabaseAuthRepository.signIn({ email: email.trim(), password });

      if (!result.success) {
        setLoginError(result.error.message);
        return;
      }
      setSession(result.data);
      setPassword("");
      setMpin("");
    } catch (error) {
      console.error("Login Supabase gagal:", error);
      setLoginError("Terjadi kendala saat masuk. Periksa koneksi lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    setLoginError("");
    try {
      await supabaseAuthRepository.signOut();
      setSession(null);
      setPassword("");
    } catch (error) {
      console.error("Logout Supabase gagal:", error);
      setLoginError("Tidak dapat mengakhiri sesi. Silakan coba lagi.");
    }
  }

  const user = session?.user ?? null;
  const workspaceTitle = user ? workspaceTitles[user.role] : "Bits2Bytes";

  return (
    <div className="app-shell b2b-vite-shell">
      <aside className="app-sidebar" aria-label="Navigasi utama">
        <div className="sidebar-header">
          <img src={theme === "dark" ? logoDark : logoLight} alt="Bits2Bytes" className="brand-logo" width="36" height="36" />
          <div><div className="brand-title">Bits2Bytes</div><div className="brand-subtitle">Tempat belajar coding</div></div>
        </div>
        <nav className="sidebar-content" aria-label="Menu">
          <div><div className="nav-section-title">Menu utama</div><ul className="nav-list"><li className="nav-item"><a className="nav-link active" href="#portal" aria-current="page"><span className="nav-icon" aria-hidden="true">🚪</span><span>{user ? workspaceTitle : "Masuk"}</span></a></li></ul></div>
          <div className="sidebar-footer b2b-vite-sidebar-note"><strong>Belajar, berkarya, dan bertumbuh!</strong><small>Temukan hal baru dan buat karya hebat bersama Bits2Bytes.</small></div>
        </nav>
        <div className="sidebar-footer"><small>Bits2Bytes Learning</small></div>
      </aside>

      <div className="app-container">
        <header className="app-header">
          <div className="header-left"><h1 id="page-heading">{workspaceTitle}</h1></div>
          <div className="header-right">
            {user && <button type="button" className="btn btn-secondary btn-sm" onClick={signOut}>Keluar</button>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Ganti ke tampilan gelap" : "Ganti ke tampilan terang"} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "light" ? "🌙" : "☀️"}</span><span>{theme === "light" ? "Tampilan gelap" : "Tampilan terang"}</span></button>
          </div>
        </header>

        <main className="app-main" id="portal">
          {authLoading && <section className="card student-loading" role="status">Memeriksa sesi Bits2Bytes…</section>}

          {!authLoading && !user && <section className="b2b-login-panel card" aria-labelledby="login-title">
            <div className="b2b-vite-intro">
              <h2 id="login-title">Selamat datang di Bits2Bytes!</h2>
              <p>Masuk menggunakan akun Bits2Bytes yang sudah terdaftar.</p>
            </div>
            {!supabaseAuthRepository.isConfigured && <p className="b2b-login-error" role="alert">Konfigurasi Supabase belum lengkap. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY pada environment aplikasi.</p>}
            <form onSubmit={signIn}>
              <div className="b2b-login-mode" role="group" aria-label="Jenis akun">
                <button type="button" className={loginMode === "student" ? "btn btn-primary" : "btn btn-secondary"} aria-pressed={loginMode === "student"} onClick={() => { setLoginMode("student"); setLoginError(""); }}>Siswa</button>
                <button type="button" className={loginMode === "staff" ? "btn btn-primary" : "btn btn-secondary"} aria-pressed={loginMode === "staff"} onClick={() => { setLoginMode("staff"); setLoginError(""); }}>Guru / Admin</button>
              </div>
              {loginMode === "student" ? <>
                <label className="form-label" htmlFor="login-phone">Nomor WhatsApp</label>
                <input id="login-phone" className="form-control" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contoh: 08xxxxxxxxxx" required disabled={!supabaseAuthRepository.isConfigured || submitting} />
                <label className="form-label" htmlFor="login-mpin">MPIN (6 digit)</label>
                <input id="login-mpin" className="form-control" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={mpin} onChange={(event) => setMpin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Masukkan MPIN" required disabled={!supabaseAuthRepository.isConfigured || submitting} />
              </> : <>
                <label className="form-label" htmlFor="login-email">Email</label>
                <input id="login-email" className="form-control" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required disabled={!supabaseAuthRepository.isConfigured || submitting} />
                <label className="form-label" htmlFor="login-password">Password</label>
                <input id="login-password" className="form-control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" required disabled={!supabaseAuthRepository.isConfigured || submitting} />
              </>}
              {loginError && <p className="b2b-login-error" role="alert">{loginError}</p>}
              <button type="submit" className="btn btn-primary" disabled={!supabaseAuthRepository.isConfigured || submitting}>{submitting ? "Memeriksa akun…" : "Masuk"}</button>
            </form>
          </section>}

          {!authLoading && user?.role === "student" && <StudentExperience user={{ ...user, avatar: user.avatar ?? undefined, gradeLevel: user.gradeLevel ?? undefined }} />}
          {!authLoading && user?.role === "tutor" && <TutorExperience user={user} />}
          {!authLoading && user?.role === "admin" && <AdminExperience />}
        </main>
      </div>
    </div>
  );
}
