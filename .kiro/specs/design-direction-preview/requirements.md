# Requirements Document

## Introduction

Fitur **design-direction-preview** adalah prototype visual terpisah yang ditempatkan di `scratch/design-direction-preview/`. Prototype ini bertujuan mengeksplorasi arah desain baru "Soft Modern Learning Workspace" sebelum diterapkan pada aplikasi utama.

Latar belakangnya adalah bahwa tampilan aplikasi saat ini terasa kaku, padat, dan terlalu bergantung pada card komponen yang seragam di seluruh halaman — sehingga hierarki informasi lemah dan tidak ada karakter visual yang matang. Prototype ini memberi tim kemampuan untuk melihat dan merasakan arah desain baru tanpa menyentuh kode aplikasi yang sudah berjalan.

Prototype mencakup empat tampilan dashboard yang dapat dipilih dari navigasi:
1. **Admin Control Center** — manajemen platform yang bersih dan terstruktur.
2. **Tutor Teaching Workspace** — workspace berorientasi aksi mengajar.
3. **Student Learning Adventure** — pengalaman belajar dengan Quest Map sebagai focal point.
4. **Parent Progress & Insight** — laporan perkembangan yang tenang dan mudah dipahami.

---

## Glossary

- **Prototype**: Implementasi HTML/CSS/JS mandiri di `scratch/design-direction-preview/` yang tidak menyentuh file aplikasi utama.
- **Design_System**: Kumpulan CSS custom properties (design tokens) yang mendefinisikan palet warna, tipografi, spasi, bayangan, dan radius yang digunakan oleh Prototype.
- **Dashboard_View**: Satu dari empat tampilan (Admin, Tutor, Student, Parent) yang dapat dipilih dari navigasi Prototype.
- **Navigation_Bar**: Komponen navigasi horizontal atau sidebar di Prototype yang memungkinkan perpindahan antar Dashboard_View.
- **Theme_Toggle**: Kontrol UI yang memungkinkan pengguna berpindah antara light mode dan dark mode.
- **Light_Mode**: Skema warna dengan latar neutral terang, surface putih, dan aksen indigo.
- **Dark_Mode**: Skema warna dengan latar layered navy gelap dan aksen yang lebih cerah.
- **Hierarchy_Principle**: Prinsip desain yang mewajibkan elemen-elemen halaman memiliki bobot visual berbeda-beda — tidak semua elemen berukuran dan berbobot sama.
- **Composition_Rule**: Seperangkat aturan tata letak yang melarang penggunaan card berlebihan, melarang card bersarang, dan mewajibkan variasi layout per Dashboard_View.
- **Responsive_Breakpoint**: Lebar viewport tertentu tempat layout Prototype beradaptasi: 1440px, 1366px, 768px, dan 390px.
- **Isolation_Constraint**: Batasan mutlak yang melarang Prototype menyentuh file aplikasi utama, CSS asli, JavaScript asli, service layer, atau storage.

---

## Requirements

---

### Requirement 1: Prototype File Structure

**User Story:** Sebagai developer, saya ingin Prototype memiliki struktur file yang jelas dan mandiri, agar saya dapat membuka dan menjalankan eksplorasi desain tanpa mempengaruhi aplikasi utama.

#### Acceptance Criteria

1. THE Prototype SHALL ditempatkan sepenuhnya di dalam direktori `scratch/design-direction-preview/`, termasuk semua asset (gambar, font, ikon) yang direferensikan oleh file Prototype.
2. THE Prototype SHALL menyediakan file `index.html` sebagai titik masuk utama.
3. THE Prototype SHALL menyediakan file `styles.css` sebagai satu-satunya sumber styling untuk Design_System dan semua Dashboard_View, tanpa menggunakan inline `<style>` block atau atribut `style=""` di dalam `index.html`.
4. THE Prototype SHALL menyediakan file `app.js` sebagai satu-satunya sumber JavaScript untuk interaktivitas Prototype, tanpa menggunakan inline `<script>` block di dalam `index.html`.
5. THE Prototype SHALL menyertakan file `README.md` yang memuat minimal: (a) langkah-langkah untuk membuka Prototype di browser, dan (b) daftar minimal tiga perbedaan desain yang dapat diamati secara visual antara Prototype dan tampilan aplikasi saat ini.
6. IF file di luar direktori `scratch/design-direction-preview/` dimodifikasi, THEN THE Prototype SHALL dinyatakan tidak memenuhi Isolation_Constraint dan developer harus dapat memverifikasi hal ini dengan menjalankan `git diff --name-only` dan mengonfirmasi bahwa tidak ada path di luar direktori tersebut yang muncul dalam output.

---

### Requirement 2: Design System Tokens

**User Story:** Sebagai designer, saya ingin Design_System mendefinisikan palet warna, tipografi, dan spasi yang baru secara konsisten, agar seluruh Dashboard_View memiliki karakter visual yang seragam dan matang.

#### Acceptance Criteria

1. THE Design_System SHALL mendefinisikan palet warna untuk Light_Mode dengan token-token berikut: warna kanvas dalam rentang lightness 96–99% (HSL), surface `#ffffff`, warna primer indigo dalam rentang hue 240–250° dengan saturation ≥70% dan lightness 45–55%, aksen teal untuk progress dalam rentang hue 170–195°, dan aksen amber untuk achievement dalam rentang hue 35–50°.
2. WHERE Dark_Mode diaktifkan, THE Design_System SHALL mendefinisikan palet warna dengan tepat tiga level surface navy yang berbeda — canvas, surface, dan elevated surface — di mana setiap level memiliki lightness (HSL) lebih tinggi minimal 3% dari level sebelumnya.
3. THE Design_System SHALL mendefinisikan skala tipografi dengan minimum lima ukuran berbeda di mana setiap ukuran berselisih minimal 2px dari ukuran terdekat, serta mendefinisikan font-weight berbeda untuk setidaknya dua level hierarki (body vs heading).
4. THE Design_System SHALL mendefinisikan skala spasi berbasis 4px sebagai unit dasar dengan tepat delapan step bernilai kelipatan 4px (misalnya 4, 8, 12, 16, 24, 32, 48, 64px), di mana setiap token spasi yang digunakan di Dashboard_View harus merupakan salah satu dari kedelapan nilai tersebut.
5. THE Design_System SHALL mendefinisikan shadow tokens dengan tepat tiga level elevasi — low, medium, high — di mana shadow hanya diterapkan pada elemen container (card, modal, dropdown, tooltip) dan tidak pada elemen inline atau teks.
6. THE Design_System SHALL mendefinisikan border-radius tokens dengan variasi nilai antara 0px hingga 16px; nilai default untuk setiap komponen harus merupakan salah satu dari nilai token yang terdefinisi dalam range tersebut, dan nilai ≥20px tidak diperbolehkan sebagai nilai default maupun override komponen.
7. WHERE indigo dipilih sebagai warna primer, THE Design_System SHALL menggunakan token warna primer indigo secara konsisten di seluruh Dashboard_View untuk semua elemen interaktif (tombol, tautan, focus ring, indikator aktif), tanpa token warna lain yang digunakan untuk peran interaktif yang sama.

---

### Requirement 3: Light Mode dan Dark Mode

**User Story:** Sebagai pengguna Prototype, saya ingin dapat beralih antara Light_Mode dan Dark_Mode, agar saya dapat mengevaluasi arah desain di kedua kondisi pencahayaan.

#### Acceptance Criteria

1. THE Theme_Toggle SHALL tersedia dan terlihat di semua Dashboard_View tanpa pengguna harus menggulir atau menavigasi terlebih dahulu.
2. WHEN pengguna mengaktifkan Theme_Toggle, THE Prototype SHALL berpindah antara Light_Mode dan Dark_Mode dalam waktu tidak lebih dari 300 milidetik tanpa full-page reload.
3. WHILE Dark_Mode aktif, THE Design_System SHALL menerapkan minimal dua tingkat surface warna navy yang dapat dibedakan secara visual (lightness berbeda minimal 3% HSL antar tingkat), sehingga hierarki kedalaman surface terasa nyata — jumlah tingkat bersifat rekomendasi selama keterbedaan visual terpenuhi.
4. WHILE Light_Mode aktif, THE Design_System SHALL menerapkan warna canvas yang memiliki rasio kontras minimal 1.5:1 terhadap warna card, sehingga elevasi card dapat dibedakan secara visual dari latar belakang.
5. WHEN pengguna mengaktifkan Theme_Toggle, THE Prototype SHALL mempertahankan Dashboard_View yang sedang aktif tanpa berpindah ke view lain.
6. WHEN pengguna memuat ulang halaman, THE Prototype SHALL menampilkan tema terakhir yang dipilih pengguna sebelum halaman dimuat ulang.

---

### Requirement 4: Navigation Bar

**User Story:** Sebagai reviewer desain, saya ingin dapat berpindah antar Dashboard_View dari satu navigasi yang ringkas, agar saya dapat membandingkan keempat tampilan dengan mudah.

#### Acceptance Criteria

1. THE Navigation_Bar SHALL menampilkan tepat empat item navigasi, masing-masing berlabel dan mewakili satu Dashboard_View: Admin, Tutor, Student, dan Parent.
2. WHEN pengguna mengklik satu item di Navigation_Bar, THE Prototype SHALL menampilkan Dashboard_View yang dipilih tanpa full-page reload.
3. THE Navigation_Bar SHALL menandai Dashboard_View yang sedang aktif dengan indikator visual yang membedakan item aktif dari item tidak aktif melalui setidaknya dua atribut yang dapat diamati: warna teks menggunakan warna primer indigo dan garis bawah atau latar belakang yang terlihat pada item tersebut.
4. THE Navigation_Bar SHALL menggunakan ikon SVG inline yang konsisten untuk setiap Dashboard_View — bukan emoji.
5. WHILE viewport lebar 390px atau kurang, THE Navigation_Bar SHALL memastikan keempat item tetap dapat dijangkau tanpa overflow yang terpotong — baik menggunakan satu baris horizontal yang dapat di-scroll maupun multi-baris — selama tidak ada item yang tersembunyi atau terpotong.
6. WHILE Prototype aktif, THE Navigation_Bar SHALL hanya menampilkan keempat item Dashboard_View (Admin, Tutor, Student, Parent) dan tidak menampilkan item navigasi lain di luar keempat item tersebut.
7. THE Navigation_Bar (preview switcher) SHALL berfungsi khusus sebagai alat perpindahan antar Dashboard_View untuk keperluan review — terpisah secara visual dan fungsional dari navigasi internal yang mungkin ada di dalam masing-masing Dashboard_View. Navigasi internal setiap Dashboard_View bersifat kontekstual terhadap peran masing-masing (Admin, Tutor, Student, Parent) dan tidak harus identik satu sama lain.

---

### Requirement 5: Composition Rule dan Hierarchy Principle

**User Story:** Sebagai designer, saya ingin setiap Dashboard_View memiliki komposisi halaman yang berbeda-beda dan hierarki visual yang kuat, agar tampilan tidak terasa monoton dan setiap elemen memiliki bobot yang proporsional.

#### Acceptance Criteria

1. THE Prototype SHALL membatasi penggunaan card berdasar (elemen dengan kombinasi lengkap dari CSS border + box-shadow + border-radius) hanya untuk elemen yang memerlukan pemisahan visual akibat elevasi fisik — yaitu elemen yang mengapung di atas konten lain atau dapat di-dismiss — dan tidak untuk blok konten statis.
2. THE Prototype SHALL tidak menggunakan card bersarang, didefinisikan sebagai elemen yang memiliki kombinasi lengkap border + box-shadow + border-radius dan berada langsung di dalam elemen lain yang juga memiliki kombinasi lengkap border + box-shadow + border-radius. Elemen section wrapper yang hanya memiliki background-color tanpa border dan box-shadow TIDAK dianggap sebagai card dan TIDAK melanggar aturan ini.
3. THE Prototype SHALL menggunakan ukuran heading utama minimum 24px pada setiap Dashboard_View, di mana heading utama didefinisikan sebagai teks judul pertama yang muncul dalam hierarki konten setiap view.
4. THE Prototype SHALL menggunakan ukuran teks minimum 32px untuk setiap angka metrik pada tampilan statistik, di mana angka metrik didefinisikan sebagai nilai numerik yang merepresentasikan KPI atau ringkasan data kuantitatif pada Dashboard_View.
5. THE Prototype SHALL menerapkan whitespace vertikal minimum 32px di antara setiap dua section yang berurutan dalam satu Dashboard_View, di mana section didefinisikan sebagai kelompok konten bertema tunggal yang dipisahkan oleh pemisah visual atau spasi.
6. THE Prototype SHALL menggunakan ukuran teks body default minimal 14px pada semua Dashboard_View di semua breakpoint. Ukuran 12px hanya diperbolehkan untuk elemen teks pendukung (caption, metadata, timestamp, label sekunder) dan tidak boleh digunakan sebagai ukuran default konten utama.
7. THE Prototype SHALL memvariasikan komposisi layout sehingga setiap Dashboard_View memiliki komposisi yang mencerminkan karakter perannya, dengan minimal dua dari empat Dashboard_View menggunakan grid asimetris (rasio kolom 2:1 atau 3:1) pada area konten utama. Area konten utama didefinisikan sebagai region di luar header, Navigation_Bar, dan footer. Dashboard_View yang tidak menggunakan grid asimetris tetap harus memiliki komposisi yang berbeda dari view lainnya (misalnya full-width timeline, single-column focused, atau layout berbasis list).
8. THE Prototype SHALL membatasi penggunaan gradient sehingga setiap Dashboard_View memiliki maksimum dua elemen yang menggunakan gradient, dan setiap gradient yang digunakan harus berfungsi sebagai focal point (elemen pertama yang menarik perhatian pengguna) atau sebagai aksen dekoratif pendukung hierarki visual — bukan sebagai latar belakang konten fungsional.

---

### Requirement 6: Admin Control Center Dashboard

**User Story:** Sebagai reviewer desain, saya ingin melihat tampilan Admin Control Center yang modern dan terstruktur, agar saya dapat mengevaluasi apakah arah desain baru cocok untuk kebutuhan manajemen platform.

#### Acceptance Criteria

1. THE Admin Dashboard_View SHALL menampilkan tepat empat statistik platform (pengguna aktif, total siswa, total tutor, pendaftaran baru) menggunakan angka besar dengan label ringkas maksimum empat kata, dalam layout yang tidak menggunakan card dengan border + shadow yang identik untuk keempat metrik tersebut.
2. THE Admin Dashboard_View SHALL menampilkan tabel pengguna dengan minimal tiga kolom yang terlihat (nama, peran, status akun) di mana baris dipisahkan menggunakan divider horizontal, bukan card terpisah per baris.
3. THE Admin Dashboard_View SHALL menggunakan minimal dua level heading yang berbeda dalam hierarki konten, tanpa ilustrasi dekoratif, animasi latar belakang, atau gradient di area konten fungsional.
4. THE Admin Dashboard_View SHALL tidak menampilkan elemen gamifikasi apapun, termasuk XP, streak, badge RPG, atau poin reward.
5. IF data statistik gagal dimuat, THEN THE Admin Dashboard_View SHALL menampilkan placeholder teks "—" pada posisi angka metrik tanpa menyembunyikan label atau mengubah struktur layout.
6. THE Admin Dashboard_View MAY memiliki navigasi internal (misalnya tab atau section nav) yang kontekstual terhadap kebutuhan manajemen admin, terpisah dari Navigation_Bar prototype. Navigasi internal ini tidak harus identik dengan navigasi internal Dashboard_View lainnya.

---

### Requirement 7: Tutor Teaching Workspace Dashboard

**User Story:** Sebagai reviewer desain, saya ingin melihat tampilan Tutor Teaching Workspace yang berorientasi pada aksi mengajar, agar saya dapat mengevaluasi apakah arah desain baru mendukung alur kerja tutor yang efisien.

#### Acceptance Criteria

1. THE Tutor Dashboard_View SHALL menempatkan panel "tindakan berikutnya" — berisi submission yang menunggu review atau sesi yang akan datang — sebagai elemen pertama dalam urutan visual halaman (posisi teratas atau kolom utama), dengan ukuran heading atau kontainer yang lebih besar dari elemen lain di halaman yang sama.
2. THE Tutor Dashboard_View SHALL menampilkan daftar submission siswa yang tertunda, di mana setiap item menunjukkan status menggunakan badge dengan label teks yang termasuk dalam himpunan: "Menunggu Review", "Sudah Direview", dan "Disetujui", sehingga status dapat dibaca tanpa interaksi tambahan.
3. THE Tutor Dashboard_View SHALL menyusun layout menggunakan komponen berbasis daftar atau kartu tugas — bukan grid statistik angka yang setara bobot seperti pada Admin Dashboard_View — sehingga hierarki visual mencerminkan urutan tindakan, bukan ringkasan metrik.
4. THE Tutor Dashboard_View SHALL menerapkan design token warna aksen indigo pada tombol aksi utama tutor, yaitu tombol "Approve" dan tombol "Buka Review", sehingga kedua tombol tersebut secara visual berbeda dari tombol sekunder lain di halaman yang sama.
5. THE Tutor Dashboard_View MAY memiliki navigasi internal (misalnya tab antara "Submission Tertunda" dan "Jadwal") yang kontekstual terhadap alur kerja tutor, terpisah dari Navigation_Bar prototype. Navigasi internal ini tidak harus identik dengan navigasi internal Dashboard_View lainnya.

---

### Requirement 8: Student Learning Adventure Dashboard

**User Story:** Sebagai reviewer desain, saya ingin melihat tampilan Student Learning Adventure yang menyenangkan namun tidak kekanak-kanakan, agar saya dapat mengevaluasi apakah Quest Map sebagai focal point memberikan pengalaman belajar yang lebih engaging.

#### Acceptance Criteria

1. THE Student Dashboard_View SHALL menempatkan Quest Map sebagai elemen pertama dalam area konten utama (di luar header dan Navigation_Bar). WHEN lebar viewport ≥768px, THE Quest Map SHALL mencakup minimal 50% dari lebar area konten utama. WHEN lebar viewport <768px, THE Quest Map SHALL ditampilkan sebagai elemen full-width yang mendominasi layar secara vertikal — tidak disyaratkan 50% tetapi harus tetap menjadi elemen dengan bobot visual terbesar di halaman.
2. THE Student Dashboard_View SHALL menempatkan kontainer progress belajar (level, XP, atau streak) secara visual lebih kecil dari Quest Map dan di posisi adjacent atau di bawah Quest Map, bukan sebagai section terpisah dengan bobot visual yang setara.
3. THE Student Dashboard_View SHALL menampilkan tepat tiga kategori elemen gamifikasi: progress belajar (level/XP/streak), achievement terbaru, dan misi aktif — tanpa menampilkan kategori gamifikasi lain di luar ketiga kategori tersebut.
4. THE Student Dashboard_View SHALL menggunakan ukuran teks judul Quest Map minimal 1,5× ukuran teks body, dengan font-weight yang lebih tebal dari heading yang digunakan pada Tutor Dashboard_View.
5. THE Student Dashboard_View SHALL menggunakan layout asimetris di mana elemen-elemen pada halaman memiliki ukuran dan bobot visual yang berbeda-beda, tanpa baris berulang dari card berukuran seragam.

---

### Requirement 9: Parent Progress & Insight Dashboard

**User Story:** Sebagai reviewer desain, saya ingin melihat tampilan Parent Progress & Insight yang tenang dan informatif, agar saya dapat mengevaluasi apakah arah desain baru memudahkan orang tua memahami perkembangan anak tanpa kewalahan.

#### Acceptance Criteria

1. WHEN pengguna membuka Parent Dashboard_View, THE Dashboard SHALL menampilkan nama anak dan persentase penyelesaian pelajaran serta tanggal sesi terakhir di zona header utama (bagian paling atas, tanpa scroll).
2. THE Parent Dashboard_View SHALL menampilkan progress mingguan dan bulanan secara bersamaan menggunakan komponen visual seperti progress bar, indikator persentase, atau timeline — tanpa menggunakan tabel dengan baris dan kolom data mentah.
3. THE Parent Dashboard_View SHALL tidak menggunakan elemen dengan saturation warna di atas 80% (HSL), tidak menampilkan badge RPG atau ikon XP, dan tidak menggunakan animasi pulsa atau animasi berulang di manapun dalam tampilan.
4. THE Parent Dashboard_View SHALL menggunakan design token aksen teal (hue 170–195°) untuk semua elemen indikator progress, sehingga elemen progress secara visual berbeda dari elemen Admin (indigo dominan) dan elemen Student (campuran ekspresif).
5. THE Parent Dashboard_View SHALL menggunakan label dan deskripsi dalam bahasa yang tidak memerlukan pemahaman teknis, yaitu tidak menggunakan istilah seperti "API", "query", "render", "payload", atau terminologi teknis lainnya pada teks yang terlihat oleh pengguna.

---

### Requirement 10: Responsive Design

**User Story:** Sebagai reviewer desain, saya ingin Prototype dapat dilihat dengan nyaman di berbagai ukuran layar, agar saya dapat mengevaluasi arah desain baru di perangkat yang berbeda.

#### Acceptance Criteria

1. THE Prototype SHALL menampilkan semua konten tanpa horizontal scroll dan tanpa elemen yang terpotong atau tumpang tindih pada lebar viewport 1440px.
2. THE Prototype SHALL menampilkan semua konten tanpa horizontal scroll dan tanpa elemen yang terpotong atau tumpang tindih pada lebar viewport 1366px.
3. WHEN lebar viewport adalah 768px, THE Prototype SHALL menyesuaikan layout sehingga tidak ada konten yang terpotong atau tumpang tindih, dan semua tombol interaktif memiliki area klik minimal 44×44px.
4. WHEN lebar viewport adalah 390px, THE Prototype SHALL memastikan teks konten utama (body text, label, heading) berukuran minimal 14px; teks pendukung (caption, metadata, timestamp, label sekunder) berukuran minimal 12px; semua tombol memiliki area klik minimal 44×44px; dan Navigation_Bar menampilkan keempat item tanpa overflow yang tersembunyi.
5. THE Prototype SHALL memastikan `scrollWidth` elemen root tidak melebihi lebar viewport pada keempat Responsive_Breakpoint (1440px, 1366px, 768px, 390px).

---

### Requirement 11: Isolation dari Aplikasi Utama

**User Story:** Sebagai developer, saya ingin Prototype sepenuhnya terisolasi dari aplikasi utama, agar eksplorasi desain ini tidak mengganggu fungsionalitas yang sudah berjalan.

#### Acceptance Criteria

1. THE Prototype SHALL tidak mengimpor, memanggil, atau bergantung pada file JavaScript dari direktori `js/` aplikasi utama.
2. THE Prototype SHALL tidak mengimpor atau mengoverride CSS dari direktori `css/` aplikasi utama.
3. THE Prototype SHALL tidak membaca atau menulis ke localStorage menggunakan key yang diawali dengan prefix `b2b_`, `session_`, `user_`, atau `state_`; semua key localStorage yang digunakan oleh Prototype SHALL diawali dengan prefix `proto_`.
4. THE Prototype SHALL tidak menggunakan dependency pihak ketiga yang membutuhkan instalasi (npm, CDN library framework), dan tidak memuat asset dari URL eksternal melalui tag `<script src>` atau `<link>` yang merujuk ke domain di luar server lokal.
5. IF Prototype memerlukan data, THEN THE Prototype SHALL menggunakan data statis yang di-hardcode langsung di `app.js` atau dalam HTML — tidak ada fetch ke endpoint eksternal.
6. THE Prototype SHALL tidak menyentuh file `index.html`, `teacher.html`, `student.html`, `parent.html`, atau file apapun di luar `scratch/design-direction-preview/`; semua file Prototype harus berada di dalam direktori `scratch/design-direction-preview/`.

---

### Requirement 12: README dan Dokumentasi Prototype

**User Story:** Sebagai anggota tim yang akan mereview prototype, saya ingin tersedia panduan yang jelas tentang cara membuka dan apa yang dievaluasi, agar saya dapat langsung fokus menilai arah desain tanpa kebingungan teknis.

#### Acceptance Criteria

1. THE `README.md` di dalam `scratch/design-direction-preview/` SHALL mencantumkan minimal dua perintah alternatif untuk menjalankan server statis lokal (yaitu `python -m http.server` dan `npx serve`), beserta URL yang diakses setelah server berjalan.
2. THE `README.md` SHALL mencantumkan daftar perbedaan desain utama antara Prototype dan tampilan aplikasi saat ini, di mana setiap entri menyebutkan nama elemen yang berubah dan deskripsi perubahannya, minimal mencakup empat kategori: perubahan palet warna, perubahan pendekatan layout, pengurangan penggunaan card, dan perubahan hierarki tipografi.
3. THE `README.md` SHALL mencantumkan pernyataan eksplisit bahwa Prototype adalah eksplorasi visual saja dan belum diterapkan ke kode aplikasi utama.
4. WHEN reviewer membuka `README.md`, THE `README.md` SHALL memuat daftar file atau halaman yang dapat dibuka di browser beserta deskripsi singkat satu kalimat tentang apa yang ditampilkan oleh masing-masing file tersebut.
