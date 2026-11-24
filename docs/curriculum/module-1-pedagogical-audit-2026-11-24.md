# Audit Pedagogis Modul 1 — BASIC VISUAL WEB HTML

Tanggal audit: 24 November 2026  
Repository: `soKrizpy/b2b-v3`  
Branch: `preview`  
Sumber kurikulum: Supabase aktif `enfqoofluceqrlcjemfu`  
Modul: ID 10 — BASIC VISUAL WEB — HTML & Struktur Halaman

## Ringkasan keputusan

**Status: BELUM LULUS untuk persetujuan pedagogis.**  
Audit ini bersifat baca-saja. Tidak ada perubahan pada kurikulum, quiz, challenge, atau progres siswa.

Aplikasi memilih modul berdasarkan ID menaik (repository mengurutkan `modules.id` ascending). Modul pertama yang muncul adalah ID 10, bukan ID 1.

## Pemeriksaan struktur

- 16 topik terbit, urutan 1–16.
- Seluruh topik memiliki 11 learning nodes.
- Seluruh topik memiliki 5 quiz di `topics.lesson_content.quiz`.
- Seluruh topik memiliki satu challenge terkait.
- Ini hanya lulus pemeriksaan kuantitas; belum membuktikan kualitas isi.

## Temuan prioritas tinggi

### P1 — Urutan dan batas materi bercampur

Urutan saat ini:
1. Struktur Dokumen HTML dan Tag Dasar
2. Heading dan Paragraf
3. Hyperlink
4. Menambahkan Gambar: src dan alt
5. Daftar HTML: Unordered dan Ordered List
6. Tabel HTML
7. Formulir HTML
8. HTML Semantik
9. Figure dan Caption
10. Daftar Bertingkat
11. Margin dan Padding
12. Navigasi Bar
13. Build Your First Web Page
14. Halaman Biodata
15. Halaman About
16. Mini Project: Halaman Profil Sederhana

Masalah:
- Figure dan caption diletakkan setelah tabel, formulir, dan semantik, padahal merupakan pendalaman langsung dari topik gambar.
- Daftar bertingkat diletakkan setelah topik tabel/formulir/semantik, padahal lebih tepat sebagai pendalaman dari list.
- Margin dan padding serta navigasi bar dengan CSS berada di modul HTML. Ini mencampur lingkup HTML dan CSS sebelum modul CSS & JavaScript lanjutan.
- Topik 13 sudah merupakan proyek halaman web, lalu topik 14 dan 15 kembali membuat halaman biodata/About, sehingga progres proyek berpotensi terasa mundur atau repetitif sebelum proyek akhir.

Rekomendasi: susun ulang agar fondasi HTML → teks/tautan/media/list → tabel/formulir → semantik → integrasi halaman → proyek biodata/profil. Pindahkan topik CSS ke modul CSS & JavaScript atau ganti menjadi topik HTML yang masih hilang. Jangan mengubah ID topik; hanya ubah urutan setelah mapping dan dampak progres diperiksa.

### P1 — Quiz JSONB memiliki sisa judul dan konteks dari kurikulum lama

Contoh:
- Topik 1 berjudul Struktur Dokumen HTML dan Tag Dasar, tetapi pertanyaan pertama menyebut “Topik 8 - Struktur dan Basik Tag”.
- Topik 2 menyebut “Topik 9 - Heading dan Paragraf”.
- Topik 3 menyebut “Topik 10 - Link dan Navigasi Bar”.
- Topik 4 menyebut “Topik 4 - Picture”.
- Topik 5 menyebut “Topik 3 - List”.
- Topik 11 dan 12 masih menyebut penomoran lama “Topik 5” dan “Topik 6”.

Selain penamaan lama, pola quiz pada beberapa topik mengulang pertanyaan tujuan materi dan cara menguji perubahan dengan distractor generik. Pola ini kurang menguji penerapan konsep secara spesifik.

Rekomendasi: tulis ulang quiz agar menguji pemahaman dan penerapan topik yang sedang dibuka. Setiap soal harus memiliki satu jawaban terbaik, empat opsi yang masuk akal, dan penjelasan yang mengajar. Hilangkan referensi nomor topik lama.

### P1 — Learning nodes duplikatif dan penjelasan lintas-topik

Pada topik 1–4, terdapat 11 node, tetapi empat node awal mengulang kembali fungsi node konsep, contoh kode, praktik, dan pengujian. Node tambahan memakai judul berbeda, tetapi contoh dan penjelasannya banyak mengulang isi yang sama.

Contoh lintas-topik:
- Penjelasan konsep berulang kali menyuruh siswa menghubungkan HTML, CSS, dan JavaScript meskipun materi sedang membahas satu konsep HTML.
- Template persiapan, langkah praktik, pengujian, dan debugging masih menyebut CSS, selector, JavaScript, Console, dan layout secara umum meski tidak relevan untuk semua topik.
- Beberapa node ber-ID lama seperti `web-8-*`, `web-9-*`, dan `web-4-*` masih berada di topik yang urutan dan judulnya sudah berubah. Ini mengindikasikan sisa migrasi konten lama.

Rekomendasi: konsolidasikan menjadi 10–12 node yang masing-masing punya fungsi belajar berbeda: tujuan, konsep, demonstrasi, latihan terpandu, praktik mandiri, uji hasil, troubleshooting khusus topik, refleksi, quiz, dan challenge. Jangan mempertahankan node hanya untuk memenuhi hitungan.

### P1 — Quiz yang dibaca aplikasi berbeda dari tabel quiz relasional

Kode `vite-app/src/data/supabase-lesson-adapter.ts` membangun pertanyaan lesson dari `topics.lesson_content.quiz`. Repository kurikulum mengambil `topics.lesson_content`, bukan tabel `quizzes/quiz_questions`. Pengiriman jawaban dilakukan melalui Edge Function `student-submit-topic-quiz`.

Karena itu, tabel `quizzes/quiz_questions` bukan sumber pertanyaan yang dipakai adapter lesson ini. Pemeriksaan awal menemukan pertanyaan terpisah yang tidak sesuai dengan topik, misalnya bank untuk topik gambar berisi pertanyaan tentang `border-radius`, `margin`, dan `display`. Jangan menyalin atau mengganti sumber relasional ini secara otomatis sebelum kontrak Edge Function/admin quiz diperiksa.

Rekomendasi: pastikan seluruh jalur admin, lesson siswa, dan penilaian menggunakan satu sumber kebenaran yang jelas. Untuk lesson siswa yang sekarang, audit utama harus memeriksa `lesson_content.quiz`; tabel relasional perlu audit integrasi tersendiri.

## Pemeriksaan quiz dan challenge

- Kelima quiz JSONB per topik tersedia secara struktural.
- Banyak soal pertama dan keempat mengulang sasaran topik dengan distractor yang terlalu mudah/generik.
- Soal ketiga tentang “cara paling aman menguji perubahan” muncul sebagai pola lintas topik, dan jawabannya sering memasukkan pemeriksaan Console JavaScript walaupun topiknya hanya HTML.
- Beberapa pertanyaan menyebut nomor/topik lama yang tidak sesuai dengan posisi sekarang.
- Challenge tampak lebih spesifik daripada sebagian quiz, tetapi rubrik penilaian dan kriteria keberhasilan perlu diperjelas agar guru dapat menilai hasil siswa secara konsisten.

## Kesesuaian usia/kelas

Tabel `modules` hanya menyediakan level `beginner`; metadata modul tidak menyatakan rentang kelas atau usia. Dengan data yang tersedia, audit ini belum dapat menyatakan modul sesuai untuk kelas tertentu. Perlu menetapkan target kelas/usia secara eksplisit sebelum menyetujui beban konsep dan istilah teknis.

## Pemeriksaan implementasi aplikasi

File yang diperiksa:
- `vite-app/src/data/supabase-curriculum-repository.ts`
- `vite-app/src/data/supabase-lesson-adapter.ts`
- `vite-app/src/data/supabase-quiz-repository.ts`
- `vite-app/src/data/quiz-contract.ts`

Kesimpulan: tampilan lesson dibentuk dari `topics.lesson_content.learningPath`, `topics.lesson_content.quiz`, dan `topics.lesson_content.challenge`. Perubahan konten harus menjaga bentuk JSON ini. Quiz submit menerima indeks pertanyaan dan indeks opsi; perubahan urutan opsi harus menjaga `answer_index` agar tidak salah menilai.

## Rencana perbaikan sebelum Modul 1 dinyatakan lulus

1. Tetapkan batas lingkup dan urutan akhir 16 topik, termasuk keputusan atas dua topik CSS.
2. Revisi topik 1–10 untuk menghapus duplikasi node dan memperkuat demonstrasi/praktik spesifik HTML.
3. Revisi topik 11–12 setelah keputusan apakah CSS dipindahkan atau diganti.
4. Revisi topik 13–16 agar tiap proyek punya peningkatan keterampilan yang jelas dan tidak mengulang deliverable.
5. Audit ulang seluruh 80 soal JSONB: relevansi, satu jawaban terbaik, empat opsi masuk akal, answer index, penjelasan, dan kesesuaian dengan materi.
6. Perjelas challenge dan rubrik penilaian per topik.
7. Validasi schema JSON, jumlah node/quiz, dan integritas ID serta riwayat progres.
8. Setelah perbaikan konten, lakukan smoke test halaman siswa di preview dengan akun siswa asli (deployment tetap menunggu persetujuan).

## Batas audit ini

Audit ini meninjau isi dan struktur Modul ID 10 dari database aktif serta kontrak pembaca lesson pada source branch `preview`. Belum dilakukan browser smoke test, belum diverifikasi tampilan aktual untuk siswa, dan belum dilakukan perubahan data.
