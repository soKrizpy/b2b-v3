import { useEffect, useState } from "react";
import logoLight from "../../logo-b2b-light.svg";
import logoDark from "../../logo-b2b-dark.svg";

type Role = { id: "admin" | "tutor" | "student"; icon: string; label: string; title: string; description: string; badgeClass: string; accentClass: string };
const roles: Role[] = [
 { id:"admin", icon:"👑", label:"Admin", title:"Ruang Admin", description:"Atur akun, tutor, siswa, jadwal belajar, dan materi.", badgeClass:"badge-warning", accentClass:"role-card--admin" },
 { id:"tutor", icon:"👩‍🏫", label:"Tutor", title:"Ruang Tutor", description:"Lihat siswa, periksa tugas, dan beri semangat serta masukan.", badgeClass:"badge-scratch", accentClass:"role-card--tutor" },
 { id:"student", icon:"🎒", label:"Siswa", title:"Ruang Belajarku", description:"Lanjutkan petualangan coding, kerjakan tantangan, dan lihat perkembangan belajarmu.", badgeClass:"badge-approved", accentClass:"role-card--student" }
];
function StudentDashboard({ onBack }: { onBack: () => void }) {
 return <section className="student-dashboard" aria-labelledby="student-welcome">
  <div className="student-welcome card"><div><span className="badge badge-approved">Siap belajar?</span><h2 id="student-welcome">Halo, teman belajar! 👋</h2><p>Yuk, lanjutkan petualangan coding-mu. Sedikit demi sedikit, kamu pasti makin jago!</p></div><div className="student-welcome-art" aria-hidden="true">🚀</div></div>
  <div className="student-dashboard-grid">
   <article className="card student-feature-card student-continue"><span className="student-card-icon">💻</span><div><span className="student-eyebrow">Ayo lanjutkan</span><h3>Petualangan coding</h3><p>Buka materi terakhirmu dan lanjutkan belajar dari bagian yang sudah kamu capai.</p></div><span className="student-card-hint">Materi belajar akan muncul di sini</span></article>
   <article className="card student-feature-card"><span className="student-card-icon">🗺️</span><div><span className="student-eyebrow">Perjalananmu</span><h3>Quest Map</h3><p>Lihat tantangan yang sudah kamu selesaikan dan petualangan berikutnya.</p></div><span className="student-card-hint">Peta belajar segera hadir</span></article>
   <article className="card student-feature-card"><span className="student-card-icon">🏆</span><div><span className="student-eyebrow">Keren!</span><h3>Pencapaian</h3><p>Kumpulan lencana dan hasil karya dari setiap usaha belajarmu.</p></div><span className="student-card-hint">Pencapaianmu akan tampil di sini</span></article>
   <article className="card student-feature-card student-parent-hub"><span className="student-card-icon">💛</span><div><span className="student-eyebrow">Untuk orang tua</span><h3>Parent Hub</h3><p>Orang tua bisa melihat laporan setiap pertemuan, ringkasan bulanan, dan riwayat tagihan di area khusus ini.</p></div><span className="student-card-hint">Bagian khusus di Ruang Belajarku</span></article>
  </div>
  <p className="student-dashboard-note">Belajar coding itu seperti bermain sambil memecahkan teka-teki. Tidak harus langsung bisa—yang penting terus mencoba! 🌟</p>
  <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>← Kembali ke pilihan ruang</button>
 </section>;
}
export default function App() {
 const [theme,setTheme] = useState<"light"|"dark">("light");
 const [selectedRole,setSelectedRole] = useState<Role["id"]|null>(null);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 const selected=roles.find(role=>role.id===selectedRole);
 return <div className="app-shell b2b-vite-shell">
  <aside className="app-sidebar" aria-label="Navigasi utama">
   <div className="sidebar-header"><picture><source srcSet={logoDark} media="(prefers-color-scheme: dark)"/><img src={theme==="dark"?logoDark:logoLight} alt="Bits2Bytes" className="brand-logo" width="36" height="36"/></picture><div><div className="brand-title">Bits2Bytes</div><div className="brand-subtitle">Tempat belajar coding</div></div></div>
   <nav className="sidebar-content" aria-label="Menu"><div><div className="nav-section-title">Menu utama</div><ul className="nav-list"><li className="nav-item"><a className="nav-link active" href="#portal" aria-current="page"><span className="nav-icon">🚪</span><span>Pilih Ruang</span></a></li></ul></div><div className="sidebar-footer b2b-vite-sidebar-note"><strong>Belajar, berkarya, dan bertumbuh!</strong><small>Temukan hal baru dan buat karya hebat bersama Bits2Bytes.</small></div></nav>
   <div className="sidebar-footer"><small>Bits2Bytes Learning</small></div>
  </aside>
  <div className="app-container">
   <header className="app-header"><div className="header-left"><h1 id="page-heading">{selectedRole==="student"?"Ruang Belajarku":"Bits2Bytes"}</h1></div><div className="header-right"><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setTheme(current=>current==="light"?"dark":"light")} aria-label={theme==="light"?"Ganti ke tampilan gelap":"Ganti ke tampilan terang"} aria-pressed={theme==="dark"}><span>{theme==="light"?"🌙":"☀️"}</span><span>{theme==="light"?"Tampilan gelap":"Tampilan terang"}</span></button></div></header>
   <main className="app-main" id="portal">
    {selectedRole==="student" ? <StudentDashboard onBack={()=>setSelectedRole(null)}/> : <section aria-labelledby="portal-title">
     <div className="b2b-vite-intro"><div><h2 id="portal-title">Selamat datang di Bits2Bytes!</h2><p>Pilih ruang sesuai kebutuhanmu untuk mulai beraktivitas.</p></div></div>
     <div className="b2b-vite-role-grid">{roles.map(role=><article className={"card b2b-vite-role-card "+role.accentClass} key={role.id}><div><div className="b2b-vite-role-meta"><span className="b2b-vite-role-icon">{role.icon}</span><span className={"badge "+role.badgeClass}>{role.label}</span></div><h3>{role.title}</h3><p>{role.description}</p></div><button type="button" className="btn btn-primary btn-sm b2b-vite-role-action" onClick={()=>setSelectedRole(role.id)}>Masuk <span>→</span></button></article>)}</div>
     {selected && <div className="card b2b-vite-notice" role="status" aria-live="polite"><div><strong>{selected.title} dipilih.</strong><p>Ruang ini sedang disiapkan. Fitur-fiturnya akan dibuka setelah selesai dibuat dan diperiksa.</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={()=>setSelectedRole(null)}>Tutup</button></div>}
    </section>}
   </main>
  </div>
 </div>;
}
