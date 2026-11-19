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
- [x] Admin Workspace awal terhubung ke React melalui controller lama; daftar akun, filter, edit/status akun, penugasan tutor-siswa, dan tautan orang tua-anak tetap memakai IdentityStore lokal.
- [x] Teacher Workspace awal terhubung ke React melalui controller lama; antrean review dan laporan sesi tetap memakai alur data yang sudah ada.
- [x] Student Workspace awal memakai kembali Lesson Engine dan data contoh yang sudah ada; penyempurnaan React bertahap.
- [x] Role yang didukung hanya Admin, Tutor, dan Siswa. Parent Hub berada di Student Workspace dan diakses melalui akun siswa; tidak ada akun atau role Parent terpisah.

Parent Hub versi demo terintegrasi sebagai area di dalam Student Workspace; siswa membukanya dari dashboard tanpa role atau portal orang tua terpisah.
- [x] Laporan sesi Parent Hub hanya mengambil laporan berstatus terkirim milik ID siswa yang sedang masuk.
- [x] Tab laporan mingguan dihapus; area Parent Hub menampilkan laporan sesi, perkembangan bulanan, dan riwayat tagihan.
- [x] Admin dapat menentukan tarif per pertemuan secara manual untuk setiap siswa aktif; perubahan tarif tidak mengubah tagihan yang sudah diterbitkan.
- [x] Admin dapat membuat tagihan bulanan dari sesi operasional yang benar-benar terlaksana dengan status kehadiran hadir/terlambat; nominal per item disimpan sebagai snapshot.
- [x] Admin dapat menandai tagihan lunas tanpa memasukkan tanggal atau metode pembayaran; tagihan tidak dihapus.
- [x] Parent Hub menampilkan riwayat tagihan milik siswa yang sedang masuk, termasuk tagihan lunas; data siswa lain tidak ditampilkan.
- [x] Tutor dapat menyimpan draf evaluasi bulanan dan mengirim evaluasi berisi penilaian, ringkasan, hal yang sudah dikuasai, serta target bulan berikutnya.
- [x] Parent Hub menampilkan hanya evaluasi berstatus terkirim milik siswa yang sedang masuk; draf dan evaluasi siswa lain tidak ditampilkan.
- [ ] Penyimpanan evaluasi masih demo localStorage; validasi penugasan tutor dan akses Parent Hub harus ditegakkan di backend sebelum produksi.
- [x] Audit kesiapan backend produksi dan rancangan keamanan awal didokumentasikan di [`docs/production-backend-readiness.md`](docs/production-backend-readiness.md). Dokumen ini belum menerapkan perubahan pada database atau Supabase.
- [ ] Implementasi backend, autentikasi produksi, RLS, dan migrasi data masih menunggu persetujuan lingkungan development serta pengujian keamanan.

Aplikasi Vanilla tidak dihapus atau ditimpa. Aplikasi Next.js yang berada di repository/proyek terpisah juga tidak disentuh oleh perubahan ini. Belum ada koneksi ke Supabase produksi.


### Portal masuk & pemeriksaan build (19 November 2026)

- [x] Portal memiliki alur masuk demo eksplisit: pilih peran, pilih akun aktif sesuai peran, lalu tekan tombol masuk.
- [x] Tidak ada auto-login atau peningkatan hak akses saat pengguna memilih ruang.
- [x] Ruang Admin, Tutor, dan Siswa memeriksa ulang identitas serta peran sesi melalui repository auth sebelum memuat workspace; Admin juga memakai identity repository untuk inisialisasi akun demo.
- [x] Tombol keluar mengakhiri sesi demo dan kembali ke pemilihan ruang.
- [x] GitHub Actions menjalankan `npm run build` (TypeScript check + Vite production build) pada perubahan track Vite.
- [ ] Autentikasi ini masih simulasi lokal berbasis `localStorage`, bukan autentikasi produksi dan belum memakai password.
- [x] Pengujian browser lintas peran menggunakan Playwright dijalankan melalui GitHub Actions; hasil tiap perubahan diverifikasi pada workflow terkait.
- [ ] Autentikasi produksi, otorisasi server-side, dan integrasi backend masih belum tersedia.


### Jadwal sesi dan seri pertemuan (19 November 2026)

- Admin dapat membuat seri kelas dengan memilih siswa, tutor, tanggal mulai, jam WIB, satu atau beberapa hari dalam seminggu, jumlah pertemuan, durasi, dan link Meet/Zoom utama.
- Jika tanggal pilihan bentrok dengan jadwal tutor atau siswa, sistem melewati tanggal tersebut dan melanjutkan ke hari pilihan berikutnya sampai jumlah sesi terpenuhi.
- Pembuatan seri tetap atomik: jika slot bebas tidak mencukupi dalam rentang pencarian, tidak ada sesi yang disimpan.
- Daftar sesi menampilkan status, kehadiran, tutor, siswa, waktu, durasi, dan link kelas.
- Tutor melihat jadwal hanya untuk siswa yang ditugaskan kepadanya, lalu mencatat hadir, terlambat, atau tidak hadir dari tab **Jadwal Mengajar**.
- Pembatalan oleh tutor mewajibkan alasan dan menandai sesi membutuhkan pengganti; pengganti dibuat dan dihubungkan oleh Admin.
- Admin dapat membatalkan sesi atau menghapusnya secara administratif. Penghapusan administratif mempertahankan riwayat dan mewajibkan sesi pengganti.
- Untuk sesi yang memerlukan pengganti, Admin dapat memasukkan waktu baru; layanan memeriksa bentrok dan menghubungkan pengganti dengan sesi asal.
- Fitur jadwal masih berjalan dalam mode demo localStorage; belum menjadi kalender produksi dan belum memiliki otorisasi server-side.

### Tarif, tagihan, dan riwayat pembayaran (19 November 2026)

- Pengaturan tarif berada di tab **Tarif & Tagihan** pada Admin Workspace.
- Tarif ditentukan manual oleh admin per siswa, dalam rupiah per pertemuan.
- Invoice dibuat setelah bulan berakhir; admin memilih periode bulan/tahun secara manual.
- Pembuatan invoice memerlukan tarif siswa dan periode yang sudah ditutup.
- Invoice awal berstatus draft dan hanya terlihat oleh admin sampai diterbitkan.
- Sebelum menerbitkan, admin dapat mengoreksi jumlah sesi, memberi diskon nominal khusus per invoice, menambahkan biaya opsional, dan mengoreksi total dengan catatan alasan.
- Sumber tagihan hanya `ClassSessionStore`: sesi berstatus terlaksana dengan kehadiran `present` atau `late`.
- Sesi absen, dibatalkan, belum terlaksana, atau dihapus lunak tidak masuk tagihan.
- Setiap sesi hanya dapat masuk ke satu tagihan; sesi yang sudah ditagihkan tidak dihitung ulang.
- Tarif pada invoice disimpan sebagai snapshot, sehingga perubahan tarif berikutnya tidak mengubah tagihan lama.
- Admin hanya menandai status lunas; tidak ada input tanggal/metode pembayaran dan invoice tidak dapat dihapus.
- Parent Hub menampilkan invoice yang sudah diterbitkan sesuai ID siswa yang sedang masuk, termasuk invoice lunas; draft admin tidak ditampilkan.
- Rincian Parent Hub mencakup periode, jumlah sesi, tarif snapshot, subtotal, diskon, biaya tambahan, catatan koreksi, total, dan rincian pertemuan.
- Store tagihan menggunakan `localStorage` untuk demo. Ini belum aman untuk produksi, belum sinkron antarperangkat, dan belum memakai otorisasi server-side.
- Pengujian alur tarif, pembuatan invoice, penandaan lunas, dan isolasi Parent Hub dijalankan melalui Playwright di GitHub Actions.

### Kontrak frontend–backend

- [x] Kontrak repository async dan aturan keamanan backend terdokumentasi di [docs/frontend-backend-repository-contract.md](docs/frontend-backend-repository-contract.md).
- [x] Repository auth, identity, learning-state, class-session, learning-record, dan billing tersedia; local demo tetap menjadi adapter/persistence sementara.
- [x] Operasi baca/tulis Student, Tutor, dan Admin pada domain tersebut sudah melewati repository async.
- [ ] Supabase development, schema, Auth, RLS, transaksi tepercaya, dan remote adapter belum dibuat. Tidak ada perubahan ke Supabase production.


### Migrasi repository domain (19 November 2026)

- [x] Student: validasi sesi melalui `AuthRepository`; seed, lookup, dan pengiriman submission melalui `LearningStateRepository`.
- [x] Student Parent Hub: laporan terkirim, evaluasi bulanan terpublikasi, dan invoice siswa dibaca melalui repository async.
- [x] Tutor: jadwal, laporan sesi, evaluasi bulanan, serta submission review dibaca melalui repository; attendance, cancellation, report save/delete, dan evaluation save/publish memakai operasi async.
- [x] Admin: daftar pengguna, relasi tutor-siswa, jadwal, tarif, dan invoice dimuat melalui repository; CRUD identitas/assignment dan seluruh mutasi jadwal/billing menggunakan operasi async.
- [x] Repository read methods mengembalikan Promise; subscription disposer tetap sinkron agar store demo dapat memicu refresh UI.
- [x] GitHub Actions memverifikasi typecheck, production build, dan Playwright browser QA untuk perubahan bertahap. Run terbaru sedang diverifikasi pada commit branch `preview`.
- [ ] Penyimpanan checkpoint/progress lesson masih menggunakan localStorage demo; belum ada sinkronisasi antarperangkat.
- [ ] Repository lokal masih memakai localStorage dan pemeriksaan client-side. Belum aman untuk data siswa/tagihan produksi.

### Catatan batas migrasi repository

- [x] Semua pembacaan dan mutasi domain Student, Tutor, dan Admin pada store yang sudah dipetakan melewati repository async.
- [x] Subscription store tetap sinkron sebagai mekanisme notifikasi lokal; setiap pembacaan data tetap melalui metode repository async.
- [x] Siklus hidup controller dilindungi agar proses pemuatan async yang selesai setelah workspace ditutup tidak memasang subscription atau merender ulang UI.
- [ ] Checkpoint, slide progress, dan draf lokal lesson masih menggunakan localStorage langsung.
- [ ] Repository saat ini adalah adapter local demo. Supabase Auth, schema, RLS, transaksi server, remote adapter, dan pengujian keamanan belum dikerjakan.
