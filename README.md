# B2B Learning Engine

> Platform pembelajaran koding interaktif terbimbing (*External Tool Guided Learning*) untuk Bits2Bytes.

---

## 🚀 Ringkasan Proyek

Bits2Bytes Learning Engine dirancang untuk membimbing siswa dalam belajar pemrograman dengan prinsip:
1. **Instruksi Terbimbing**: Platform menyediakan panduan langkah demi langkah, materi visual, kode acuan, dan prompt AI.
2. **Koding Nyata di Tool Eksternal**: Siswa mempraktikkan langsung materi menggunakan alat asli (Scratch, Roblox Studio, Godot, Unity, VS Code, web browser, dsb.).
3. **Validasi & Kemajuan**: Guru memvalidasi hasil belajar melalui antrean review yang cepat dan terstruktur, serta merekam progres siswa secara akurat.

---

## 🛠️ Stack Teknologi (Tahap Prototype)

- **Markup**: Semantic HTML5
- **Styling**: Modular CSS3 dengan CSS Custom Properties (*Design Tokens*) untuk Light/Dark Mode
- **Interaksi**: Vanilla JavaScript (ES6+ modular, tanpa dependency pihak ketiga)
- **Data**: JSON Mock Data dengan service abstraction layer (siap dimigrasikan ke Supabase di masa depan)

---

## 📁 Struktur Proyek (Multi-Page Architecture v0.3.2)

```text
b2b-learning-engine/
├── PROJECT_RULES.md      # Standar dan aturan pengembangan ketat
├── README.md             # Gambaran umum proyek dan panduan
├── CHANGELOG.md          # Riwayat perubahan dan checkpoint
├── index.html            # Portal peran utama / Landing launcher
├── student.html          # Standalone Student Experience (Dashboard, Quest Map, Workspace)
├── teacher.html          # Standalone Teacher Experience (Dashboard, Antrean, Review Drawer)
├── css/
│   ├── design-tokens.css # Variabel desain terpusat (warna, tema, tipografi, elevasi)
│   ├── base.css          # Reset, layout dasar, aksesibilitas, dan scrollbar
│   ├── components.css    # Komponen bersama (tombol, kartu, badge, modal, drawer, toast)
│   ├── views.css         # Tata letak shell, sidebar, dan header navigasi
│   ├── lesson.css        # Student Workspace, Quest Map & stage stepper
│   └── teacher.css       # Teacher Workspace, summary cards, activity stream & queue
├── js/
│   ├── app.js            # Inisialisasi router tampilan portal monolitik (legacy/fallback)
│   ├── theme.js          # Pengelola tema (Light/Dark mode)
│   ├── illustrations.js  # Perpustakaan ilustrasi SVG 2D (Remembero & RPG islands)
│   ├── lesson-workspace.js # Controller alur belajar siswa 6 tahap
│   ├── teacher-workspace.js # Controller dashboard guru (Phase 3.1)
│   ├── content-renderer.js # Renderer blok konten terbimbing & sanitasi XSS
│   ├── student/
│   │   └── student-app.js  # Entrypoint mandiri khusus student.html
│   ├── teacher/
│   │   └── teacher-app.js  # Entrypoint mandiri khusus teacher.html
│   ├── components/       # Komponen UI interaktif vanilla
│   │   ├── toast.js      # Notifikasi toast non-intrusif
│   │   ├── modal.js      # Dialog modal terfokus
│   │   └── drawer.js     # Drawer kontekstual (review submission guru)
│   └── services/
│       └── mock-service.js # Lapisan akses data mock
└── data/
    └── mock/             # Mock data lokal (Dataset terpadu 6 siswa)
        ├── users.json
        ├── students.json
        ├── submissions.json
        ├── class-summary.json
        └── lesson-scratch-motion.json
```

---

## 🏁 Memulai & Menjalankan

Aplikasi ini menggunakan HTML/CSS/JS murni tanpa build step. Jalankan menggunakan server statis lokal:

### Menggunakan Python:
```bash
python -m http.server 3000
```
Akses halaman:
- **Ruang Siswa**: `http://localhost:3000/student.html`
- **Ruang Guru**: `http://localhost:3000/teacher.html`
- **Portal Utama**: `http://localhost:3000/index.html`

### Menggunakan Node / npx:
```bash
npx serve .
```

---

## 📌 Status Fase Pengembangan

- [x] **Phase 1 — Project Foundation**: Fondasi struktur, design tokens, sistem tema light/dark, navigasi utama, shared components (toast, modal, drawer).
- [x] **Phase 2 — Student Experience**: Student Dashboard, Quest Map, Lesson Workspace & Content Block Renderer (External Tool Guided Learning) untuk materi *"Scratch — Basic Motion"*.
- [x] **v0.3.0 — Visual Redesign (Remembero-Inspired Bright Adventure)**: Redesain visual menyeluruh: sky-blue canvas, elevated white cards, gamification stats, Bright RPG Quest Map dengan dotted path, realm tabs, pulsing quest node.
- [x] **v0.3.1 — Visual Quality Improvement**: Penggantian seluruh emoji dengan pustaka aset vektor SVG inline (`js/illustrations.js`), ilustrasi 4 pulau realm terperinci, peta panorama kepulauan 2D RPG dengan pin overlay interaktif, maskot koder "Byte", dan konsistensi visual 100% token semantik (44/44 tes pass).
- [x] **Phase 3.1 — Teacher Dashboard & Summary Overview**: 4 summary metric cards elevated, real-time student activity feed, submission queue preview table, contextual review drawer dengan focus management & rAF timing, dataset matematis konsisten 6 siswa.
- [x] **v0.3.2 Stage 2 — Multi-Page Student Migration**: Pemisahan `student.html` dan `js/student/student-app.js` sebagai aplikasi mandiri tanpa modul teacher (29/29 standalone suite, 6/6 tablet suite pass).
- [x] **v0.3.2 Stage 3 — Multi-Page Teacher Migration**: Pemisahan `teacher.html` dan `js/teacher/teacher-app.js` sebagai aplikasi mandiri tanpa modul student (27/27 standalone suite, 7/7 tablet suite, 13/13 asset isolation pass).
- [ ] **Phase 3.2 — Student Management**: Daftar siswa lengkap dengan pencarian, filter, detail progres per checkpoint dan kuis.
- [ ] **Phase 3.3 — Submission Review Workflow**: Alur evaluasi penuh, persetujuan proyek, permintaan revisi, feedback tersimpan ke mock store.
- [ ] **Phase 4 — Progress & Achievements**: Tracking progress riil dan riwayat aktivitas.
- [ ] **Phase 5 — Admin Experience**: Manajemen kurikulum, authoring modul & lesson berbasis data JSON.
- [ ] **Phase 6 — Verification & QA**: Audit performa, responsive test, aksesibilitas keyboard, dan uji alur end-to-end.



---

## 🧭 Track Migrasi React

Repository ini sekarang mempertahankan aplikasi Vanilla sebagai **legacy reference**, sekaligus menyediakan aplikasi baru **Vite + React + TypeScript** di folder `vite-app/`.

### Menjalankan aplikasi Vite

Persyaratan: Node.js 20 atau lebih baru.

```bash
cd vite-app
npm install
npm run dev
```

Buka `http://localhost:5173`.

Perintah lain:
- `npm run typecheck` — pemeriksaan tipe TypeScript.
- `npm run build` — pemeriksaan tipe dan production build.
- `npm run preview` — menjalankan hasil build secara lokal.

### Status migrasi

- [x] Fondasi Vite, React, dan TypeScript.
- [x] React entry point dan portal pemilihan workspace.
- [x] Reuse design tokens, stylesheet, dan logo dari aplikasi Vanilla.
- [ ] Migrasi Admin Workspace.
- [ ] Migrasi Teacher Workspace.
- [x] Student Workspace awal memakai kembali Lesson Engine dan data contoh yang sudah ada; penyempurnaan React bertahap.
- [ ] Integrasi akses Parent Hub yang aman sebagai area khusus di dalam Student Workspace (bukan workspace/role terpisah).
- [ ] Integrasi backend setelah desain data dan keamanan disetujui.

Aplikasi Vanilla tidak dihapus atau ditimpa. Aplikasi Next.js yang berada di repository/proyek terpisah juga tidak disentuh oleh perubahan ini. Belum ada koneksi ke Supabase produksi.
