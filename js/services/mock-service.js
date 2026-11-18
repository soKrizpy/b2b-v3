/**
 * B2B LEARNING ENGINE - MOCK SERVICE LAYER
 * Abstracts local JSON mock data fetching.
 * Designed to mirror future Supabase query interfaces (Section 15).
 */

const FALLBACK_USER = {
  id: "usr_stu_001",
  name: "Alex Pratama",
  email: "alex.pratama@example.edu",
  role: "student",
  avatar: "AP",
  gradeLevel: "Grade 5"
};

const FALLBACK_ROLES = [
  { id: "student", name: "Student", defaultUser: { id: "usr_stu_001", name: "Alex Pratama", avatar: "AP", role: "student" } },
  { id: "teacher", name: "Teacher", defaultUser: { id: "usr_tea_001", name: "Kak Sarah", avatar: "KS", role: "teacher" } },
  { id: "admin",   name: "Admin",   defaultUser: { id: "usr_adm_001", name: "Admin B2B",  avatar: "AD", role: "admin" } }
];

export const MockService = {
  async fetchUsers() {
    try {
      const response = await fetch('./data/mock/user.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data user fallback (akses local file tanpa HTTP server):', err.message);
      return {
        currentUser: FALLBACK_USER,
        roles: FALLBACK_ROLES
      };
    }
  },

  async fetchSampleLesson() {
    try {
      const response = await fetch('./data/mock/lesson-scratch-motion.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data lesson fallback:', err.message);
      return {
        id: "les_scratch_motion_01",
        title: "Scratch — Basic Motion: Membuat Karakter Bergerak",
        status: "published",
        skillLevel: "Beginner",
        estimatedDurationMinutes: 45
      };
    }
  },

  async fetchStudents() {
    try {
      const response = await fetch('./data/mock/students.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data students fallback:', err.message);
      return [
        { id: "usr_stu_001", name: "Alex Pratama", gradeLevel: "Grade 5", avatar: "AP", status: "submitted", isActive: true, currentLesson: "Scratch — Basic Motion", progressPct: 100, checkpoints: "4/4", quizScore: "3/3", lastActive: "10 menit yang lalu" },
        { id: "usr_stu_002", name: "Budi Santoso", gradeLevel: "Grade 5", avatar: "BS", status: "submitted", isActive: true, currentLesson: "Scratch — Basic Motion", progressPct: 100, checkpoints: "4/4", quizScore: "2/3", lastActive: "35 menit yang lalu" },
        { id: "usr_stu_003", name: "Citra Lestari", gradeLevel: "Grade 5", avatar: "CL", status: "in-progress", isActive: true, currentLesson: "Scratch — Basic Motion", progressPct: 60, checkpoints: "2/4", quizScore: "Belum kuis", lastActive: "2 jam yang lalu" },
        { id: "usr_stu_004", name: "Doni Wijaya", gradeLevel: "Grade 5", avatar: "DW", status: "approved", isActive: false, currentLesson: "Scratch — Basic Motion", progressPct: 100, checkpoints: "4/4", quizScore: "3/3", lastActive: "Kemarin" },
        { id: "usr_stu_005", name: "Eva Rahma", gradeLevel: "Grade 5", avatar: "ER", status: "practice-completed", isActive: true, currentLesson: "Scratch — Basic Motion", progressPct: 75, checkpoints: "4/4", quizScore: "3/3", lastActive: "4 jam yang lalu" },
        { id: "usr_stu_006", name: "Fajar Ramadhan", gradeLevel: "Grade 5", avatar: "FR", status: "not-started", isActive: false, currentLesson: "Scratch — Basic Motion", progressPct: 0, checkpoints: "0/4", quizScore: "-", lastActive: "3 hari yang lalu" }
      ];
    }
  },

  async fetchSubmissions() {
    try {
      const response = await fetch('./data/mock/submissions.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data submissions fallback:', err.message);
      return [
        {
          id: "sub_001",
          studentId: "usr_stu_001",
          studentName: "Alex Pratama",
          studentGrade: "Grade 5",
          studentAvatar: "AP",
          lessonId: "les_scratch_motion_01",
          lessonTitle: "Scratch — Basic Motion: Membuat Karakter Bergerak",
          submittedAt: "Hari ini, 16:30",
          projectUrl: "https://scratch.mit.edu/projects/1098273645",
          studentNotes: "Saya membuat karakter kucing berjalan bolak-balik saat tombol spasi ditekan dan berputar saat tombol panah ditekan.",
          status: "submitted",
          checkpointsPassed: 4,
          checkpointsTotal: 4,
          quizScore: "3/3 (100%)",
          feedbackHistory: []
        },
        {
          id: "sub_002",
          studentId: "usr_stu_002",
          studentName: "Budi Santoso",
          studentGrade: "Grade 5",
          studentAvatar: "BS",
          lessonId: "les_scratch_motion_01",
          lessonTitle: "Scratch — Basic Motion: Membuat Karakter Bergerak",
          submittedAt: "Hari ini, 15:45",
          projectUrl: "https://scratch.mit.edu/projects/1098278891",
          studentNotes: "Karakter kucing sudah bisa bergerak ke kanan dan kiri dengan tombol panah. Saya menambahkan efek suara saat menabrak tepi.",
          status: "submitted",
          checkpointsPassed: 4,
          checkpointsTotal: 4,
          quizScore: "2/3 (67%)",
          feedbackHistory: []
        }
      ];
    }
  },

  async fetchClassSummary() {
    try {
      const response = await fetch('./data/mock/class-summary.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data class summary fallback:', err.message);
      return {
        totalStudents: 6,
        activeStudents: 4,
        pendingSubmissions: 2,
        approvedProjects: 1,
        recentActivities: [
          { id: "act_001", studentName: "Alex Pratama", avatar: "AP", action: "mengirimkan proyek Scratch — Basic Motion", timestamp: "10 menit yang lalu", type: "submission", badge: "Submitted", badgeClass: "badge-submitted" },
          { id: "act_002", studentName: "Budi Santoso", avatar: "BS", action: "mengirimkan proyek Scratch — Basic Motion", timestamp: "35 menit yang lalu", type: "submission", badge: "Submitted", badgeClass: "badge-submitted" },
          { id: "act_003", studentName: "Citra Lestari", avatar: "CL", action: "menyelesaikan Checkpoint 2 (Gerak Sumbu X)", timestamp: "2 jam yang lalu", type: "checkpoint", badge: "In Progress", badgeClass: "badge-in-progress" },
          { id: "act_004", studentName: "Eva Rahma", avatar: "ER", action: "menyelesaikan 4 Checkpoint Praktik Terbimbing", timestamp: "4 jam yang lalu", type: "practice", badge: "Practice Done", badgeClass: "badge-practice-completed" },
          { id: "act_005", studentName: "Doni Wijaya", avatar: "DW", action: "proyek disetujui oleh Kak Sarah (Skor 100%)", timestamp: "Kemarin", type: "approval", badge: "Approved", badgeClass: "badge-approved" }
        ]
      };
    }
  },

  /* ==========================================================================
     PHASE 2: PARENT HUB MOCK SERVICE LOADERS
     ========================================================================== */
  async fetchParentSessionReports() {
    try {
      const response = await fetch('./data/mock/parent-hub/session-reports.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data session-reports fallback:', err.message);
      return [
        {
          id: "ses_004",
          studentId: "usr_stu_001",
          studentName: "Alex Pratama",
          sessionNumber: 4,
          date: "2026-11-14",
          formattedDate: "Sabtu, 14 November 2026",
          time: "15:30 - 17:00 WIB",
          tutorId: "usr_tea_001",
          tutorName: "Kak Sarah",
          tutorAvatar: "KS",
          topic: "Gerak & Animasi Karakter Scratch (Basic Motion & Key Event)",
          moduleName: "Modul 1: Petualangan Dasar Sprite Scratch",
          attendance: "Hadir Tepat Waktu",
          activities: [
            "Mempelajari sistem koordinat X dan Y pada kanvas panggung Scratch",
            "Menghubungkan event blok 'when [key] pressed' dengan pergerakan 'change x by' dan 'change y by'",
            "Membuat kontrol 4 arah (panah atas, bawah, kanan, kiri) untuk karakter Cat",
            "Menyelesaikan tantangan checkpoint praktik mandiri dan kuis logika koordinat"
          ],
          achievements: [
            "Memahami dengan baik hubungan nilai positif/negatif pada sumbu X (kiri/kanan) dan Y (atas/bawah)",
            "Berhasil membuat karakter kucing bergerak fleksibel dan memantul ketika menyentuh dinding panggung",
            "Meraih skor sempurna 3/3 pada kuis pemahaman konsep logika gerak"
          ],
          difficulties: "Alex sempat tertukar antara sumbu X dan Y saat membuat sprite bergerak ke bawah. Setelah diberikan analogi lift (naik-turun = Y) dan mobil (maju-mundur = X), Alex langsung paham dan memperbaiki kodenya sendiri tanpa dibantu.",
          parentRecommendations: "Ayah/Bunda dapat meminta Alex mendemonstrasikan hasil proyek geraknya di laptop rumah. Tanyakan: 'Bagaimana caranya agar kucingnya bisa bergerak mundur?'. Melatih anak menjelaskan proses logika buatannya sendiri akan memperkuat kepercayaan diri dan pemahaman komputasionalnya."
        },
        {
          id: "ses_003",
          studentId: "usr_stu_001",
          studentName: "Alex Pratama",
          sessionNumber: 3,
          date: "2026-11-07",
          formattedDate: "Sabtu, 7 November 2026",
          time: "15:30 - 17:00 WIB",
          tutorId: "usr_tea_001",
          tutorName: "Kak Sarah",
          tutorAvatar: "KS",
          topic: "Kostum Sprite & Efek Animasi Sederhana",
          moduleName: "Modul 1: Petualangan Dasar Sprite Scratch",
          attendance: "Hadir Tepat Waktu",
          activities: [
            "Mengenal tab Costumes dan cara mengganti tampilan sprite secara berurutan",
            "Menggunakan blok 'next costume' di dalam perulangan 'repeat' dan 'wait 0.2 seconds'",
            "Menambahkan efek suara 'meow' dan efek visual perubahan warna saat sprite disentuh"
          ],
          achievements: [
            "Mampu membuat efek berjalan yang terlihat natural dengan kombinasi kostum dan jeda waktu",
            "Mengeksplorasi palet warna kostum secara kreatif sesuai imajinasi Alex"
          ],
          difficulties: "Animasi awalnya bergerak terlalu cepat seperti kilat karena Alex lupa menambahkan jeda blok waktu. Alex berhasil menemukan bug ini setelah melihat kode bersama Kak Sarah.",
          parentRecommendations: "Ajak Alex memperhatikan kartun atau animasi favoritnya di TV dan diskusikan bagaimana gambar diam yang diganti cepat bisa menjadi gerakan hidup."
        }
      ];
    }
  },

  async fetchParentWeeklyProgress() {
    try {
      const response = await fetch('./data/mock/parent-hub/weekly-progress.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data weekly-progress fallback:', err.message);
      return [
        {
          id: "week_004",
          weekNumber: 4,
          dateRange: "10 - 16 November 2026",
          studentId: "usr_stu_001",
          studentName: "Alex Pratama",
          topic: "Gerak Berarah & Interaktivitas Keyboard",
          moduleName: "Modul 1: Petualangan Dasar Sprite Scratch",
          sessionsHeld: 1,
          totalSessionsInWeek: 1,
          moduleProgressPct: 50,
          status: "Aktif / Berjalan Lancar",
          strengths: [
            "Daya tangkap logika koordinat matematika (X dan Y) berkembang sangat pesat",
            "Kemandirian tinggi: mampu men-debug kesalahan arah gerak sprite secara mandiri",
            "Kreativitas modifikasi: berinisiatif menambahkan kontrol tombol lompat tanpa diminta"
          ],
          areasToPractice: [
            "Konsistensi memberi nama variabel atau sprite agar proyek yang kompleks tetap rapi",
            "Membiasakan membaca instruksi tantangan secara menyeluruh sebelum mulai merangkai blok"
          ],
          tutorNotes: "Alex menunjukkan lompatan pemahaman yang sangat membanggakan di minggu ke-4 ini. Belajar koding bukan sekadar menghafal blok, melainkan melatih cara berpikir runtut. Alex sudah mulai menunjukkan pola pikir analitis saat memecahkan masalah. Pertahankan semangat belajarnya ya Ayah/Bunda!"
        }
      ];
    }
  },

  async fetchParentMonthlyEvaluations() {
    try {
      const response = await fetch('./data/mock/parent-hub/monthly-evaluations.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn('MockService: Menggunakan data monthly-evaluations fallback:', err.message);
      return [
        {
          id: "eval_2026_11",
          month: "November 2026",
          periodLabel: "Evaluasi Bulan ke-1 (Periode Fondasi Scratch)",
          evaluationDate: "15 November 2026",
          studentId: "usr_stu_001",
          studentName: "Alex Pratama",
          gradeLevel: "Grade 5 SD",
          track: "Scratch Starter",
          evaluatorId: "usr_tea_001",
          evaluatorName: "Kak Sarah",
          evaluatorAvatar: "KS",
          overallScore: 88,
          overallMasteryLabel: "Sangat Baik (Mastery Level 3: Proficient)",
          completionVsMastery: {
            taskCompletionRate: 100,
            taskCompletionLabel: "100% Tugas & Kuis Tuntas",
            taskCompletionDescription: "Seluruh checkpoint modul dan kuis checkpoint diselesaikan tanpa tertinggal.",
            conceptualMasteryRate: 85,
            conceptualMasteryLabel: "85% Penguasaan Pola Pikir Komputasional",
            conceptualMasteryDescription: "Kemandirian mengaplikasikan konsep logika, merancang variasi kode baru, dan menganalisis kesalahan.",
            parentExplanation: "Ayah dan Bunda, di Bits2Bytes kami membedakan antara 'Menyelesaikan Tugas' dengan 'Menguasai Pola Pikir Komputasional'. Seorang anak dapat menyelesaikan seluruh modul (Task Completion: 100%) dengan mengikuti panduan, namun Penguasaan Konseptual (Conceptual Mastery) mengukur apakah anak benar-benar paham logika di balik kode tersebut dan dapat menggunakannya kembali untuk menyelesaikan masalah baru secara mandiri."
          },
          competencies: [
            {
              key: "algorithmic_logic",
              name: "Logika & Algoritma (Sequencing & Logic)",
              score: 90,
              maxScore: 100,
              level: "Mahir (Proficient)",
              badgeColor: "success",
              friendlyExplanation: "Kemampuan menyusun urutan instruksi langkah demi langkah secara logis agar komputer mengerti tanpa kesalahan alur.",
              observedBehavior: "Alex mampu memetakan sistem koordinat X dan Y secara presisi untuk menggerakkan sprite ke segala arah, serta memahami fungsi blok pengulangan dengan tepat."
            },
            {
              key: "project_remixing",
              name: "Kreativitas & Modifikasi Proyek (Remixing)",
              score: 85,
              maxScore: 100,
              level: "Berkembang Pesat (Advancing)",
              badgeColor: "primary",
              friendlyExplanation: "Keberanian anak untuk tidak hanya menyalin kode contoh dari guru, melainkan mengembangkan fitur baru, mengubah cerita game, dan bereksperimen dengan imajinasinya sendiri.",
              observedBehavior: "Ketika diminta membuat karakter kucing berjalan, Alex berinisiatif menambahkan tombol spasi untuk membuat kucing melompat dan mengganti backdrop dengan suasana luar angkasa."
            },
            {
              key: "debugging",
              name: "Pemecahan Masalah & Debugging (Troubleshooting)",
              score: 82,
              maxScore: 100,
              level: "Mandiri & Tenang (Competent)",
              badgeColor: "info",
              friendlyExplanation: "Kecakapan anak dalam menemukan 'kenapa programnya macet atau tidak bergerak sesuai rencana' dan memperbaikinya dengan tenang tanpa panik.",
              observedBehavior: "Ketika kodenya bergerak ke arah berlawanan, Alex memeriksa ulang blok nilai negatif pada sumbu Y secara tenang dan mengoreksi nilainya sendiri."
            },
            {
              key: "communication_persistence",
              name: "Kegigihan & Komunikasi (Persistence & Inquiry)",
              score: 95,
              maxScore: 100,
              level: "Sangat Unggul (Exemplary)",
              badgeColor: "success",
              friendlyExplanation: "Daya tahan mental tidak mudah putus asa saat kodenya belum berjalan, serta keberanian bertanya dan menceritakan cara kerja kreasinya.",
              observedBehavior: "Alex sangat sopan, mendengarkan tutor dengan saksama, dan selalu aktif bertanya tentang cara kerja blok yang belum pernah ia lihat."
            }
          ],
          tutorSummary: "Alex memiliki potensi luar biasa dalam logika berpikir runtut dan rasa ingin tahu yang sangat positif. Di bulan pertamanya, Alex tidak hanya tuntas menyelesaikan seluruh materi dasar, tetapi juga membuktikan kemampuan adaptasi logika matematika koordinat dengan sangat cepat. Sikap belajarnya yang antusias dan pantang menyerah adalah pondasi terbaik untuk menjadi pencipta teknologi masa depan.",
          nextMonthTargets: [
            "Mempelajari logika Percabangan (If - Then - Else) untuk mendeteksi benturan objek dan sensor dinding",
            "Membangun game interaktif pertama: 'Mini Labirin Scratch' yang dilengkapi sistem skor dan nyawa",
            "Melatih perapian struktur kode menggunakan blok khusus (My Blocks) agar proyek mudah dikembangkan"
          ]
        }
      ];
    }
  }
};

