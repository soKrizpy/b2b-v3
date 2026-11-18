/**
 * B2B LEARNING ENGINE - PARENT HUB VIEW COMPONENT (PHASE 2 MVP)
 * Dedicated read-only parental transparency hub.
 * Adheres strictly to Section 5, 8, 12, 13, 14 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

import { MockService } from '../services/mock-service.js';
import { StateStore, STATE_STORE_EVENT } from '../services/state-store.js';
import { SessionStore, SESSION_STORE_EVENT } from '../services/session-store.js';

export class ParentHubView {
  /**
   * @param {HTMLElement} container
   * @param {Object} studentUser
   */
  constructor(container, studentUser = null) {
    this.container = container;
    this.studentUser = studentUser || {
      id: 'usr_stu_001',
      name: 'Alex Pratama',
      avatar: 'AP',
      gradeLevel: 'Grade 5'
    };
    this.activeTab = 'overview'; // 'overview' | 'sessions' | 'weekly' | 'monthly'

    this.sessionReports = [];
    this.weeklyProgress = [];
    this.monthlyEvaluations = [];
    this.isLoading = true;

    this.handleStoreChange = this.handleStoreChange.bind(this);
    this.handleSessionStoreChange = this.handleSessionStoreChange.bind(this);
  }

  async init() {
    this.isLoading = true;
    try {
      const [sessions, weekly, monthly] = await Promise.all([
        MockService.fetchParentSessionReports(),
        MockService.fetchParentWeeklyProgress(),
        MockService.fetchParentMonthlyEvaluations()
      ]);

      this.sessionReports = Array.isArray(sessions) ? sessions : [];
      this.weeklyProgress = Array.isArray(weekly) ? weekly : [];
      this.monthlyEvaluations = Array.isArray(monthly) ? monthly : [];
    } catch (err) {
      console.error('ParentHubView: Gagal memuat data parent hub:', err);
    } finally {
      this.isLoading = false;
      this.render();
      this.bindStoreEvents();
    }
  }

  bindStoreEvents() {
    window.removeEventListener(STATE_STORE_EVENT, this.handleStoreChange);
    window.addEventListener(STATE_STORE_EVENT, this.handleStoreChange);

    window.removeEventListener(SESSION_STORE_EVENT, this.handleSessionStoreChange);
    window.addEventListener(SESSION_STORE_EVENT, this.handleSessionStoreChange);
  }

  handleStoreChange() {
    // If active tab is overview, re-render live submission card reactively
    if (this.activeTab === 'overview' && this.container) {
      const liveStatusWrapper = this.container.querySelector('#parent-live-submission-wrapper');
      if (liveStatusWrapper) {
        liveStatusWrapper.innerHTML = this.renderLiveSubmissionContent();
      }
    }
  }

  handleSessionStoreChange() {
    if (this.container) {
      // Re-render active tab content if on sessions, weekly, or monthly
      const contentEl = this.container.querySelector('#parent-hub-tab-content');
      if (contentEl && this.activeTab !== 'overview') {
        contentEl.innerHTML = this.renderActiveTabContent();
      }
      // Update session tab badge pill
      const sessionTabBadge = this.container.querySelector('[data-parent-tab="sessions"] .parent-tab-badge');
      if (sessionTabBadge) {
        const studentId = this.studentUser.id || 'usr_stu_001';
        const actualSubmitted = SessionStore.getStudentSubmittedReports(studentId);
        sessionTabBadge.textContent = actualSubmitted.length > 0
          ? `${actualSubmitted.length} Aktual`
          : `${this.sessionReports.length} Sesi`;
      }
    }
  }

  /**
   * Main render method
   */
  render() {
    if (!this.container) return;

    if (this.isLoading) {
      this.container.innerHTML = `
        <div class="card" style="text-align: center; padding: var(--space-12);">
          <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Memuat Ruang Orang Tua...</p>
        </div>
      `;
      return;
    }

    const student = this.studentUser;
    const actualSubmitted = SessionStore.getStudentSubmittedReports(student.id || 'usr_stu_001');
    const sessionBadgeText = actualSubmitted.length > 0
      ? `${actualSubmitted.length} Aktual`
      : `${this.sessionReports.length} Sesi`;

    this.container.innerHTML = `
      <div class="parent-hub-container">
        <!-- 1. PARENT HUB BANNER -->
        <header class="parent-hub-banner" role="region" aria-label="Informasi Siswa Ruang Orang Tua">
          <div class="parent-hub-banner-info">
            <div class="parent-hub-avatar" aria-hidden="true">${escapeHtml(student.avatar || 'AP')}</div>
            <div>
              <h2 class="parent-hub-title">Ruang Orang Tua • ${escapeHtml(student.name || 'Alex Pratama')}</h2>
              <p class="parent-hub-subtitle">Transparansi Pembelajaran &bull; Portofolio Perkembangan Komputasional Siswa</p>
            </div>
          </div>
          <div class="parent-hub-badges">
            <span class="badge badge-warning">Data Demonstrasi Kurikulum</span>
            <span class="badge badge-scratch">Jalur: Scratch Starter</span>
            <span class="badge badge-in-progress">Kelas Aktif &bull; Smt Genap 2026</span>
            <span class="badge badge-approved">${escapeHtml(student.gradeLevel || 'Grade 5 SD')}</span>
          </div>
        </header>

        <!-- DEMO NOTICE BANNER (Parental Transparency) -->
        <div class="parent-demo-notice-banner" role="status" aria-label="Pemberitahuan Data Demonstrasi">
          <span class="parent-demo-icon" aria-hidden="true">💡</span>
          <div>
            <strong>Transparansi Portofolio Belajar:</strong> Laporan sesi tatap muka dan proyek tantangan siswa terhubung secara dinamis dengan <strong>Data Aktual</strong> yang dicatat oleh tutor dan dikerjakan siswa. Format rekap mingguan dan rubrik bulanan berlabel <em>Data Demonstrasi</em> disajikan sebagai contoh format transparansi kurikulum Bits2Bytes.
          </div>
        </div>

        <!-- 2. SUB-NAVIGATION TABS -->
        <nav class="parent-hub-tabs" aria-label="Navigasi Laporan Orang Tua">
          <button type="button" class="parent-tab-btn ${this.activeTab === 'overview' ? 'is-active' : ''}" data-parent-tab="overview">
            <span>Ringkasan Perkembangan</span>
            <span class="parent-tab-badge">Utama</span>
          </button>
          <button type="button" class="parent-tab-btn ${this.activeTab === 'sessions' ? 'is-active' : ''}" data-parent-tab="sessions">
            <span>Laporan Sesi Tatap Muka</span>
            <span class="parent-tab-badge">${sessionBadgeText}</span>
          </button>
          <button type="button" class="parent-tab-btn ${this.activeTab === 'weekly' ? 'is-active' : ''}" data-parent-tab="weekly">
            <span>Kemajuan Mingguan</span>
            <span class="parent-tab-badge">Minggu ke-4</span>
          </button>
          <button type="button" class="parent-tab-btn ${this.activeTab === 'monthly' ? 'is-active' : ''}" data-parent-tab="monthly">
            <span>Evaluasi &amp; Kompetensi Bulanan</span>
            <span class="parent-tab-badge">Nov 2026</span>
          </button>
        </nav>

        <!-- 3. ACTIVE TAB CONTENT -->
        <div class="parent-hub-content" id="parent-hub-tab-content" role="region" aria-live="polite">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.bindTabEvents();
  }

  /**
   * Render dynamic tab content
   */
  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'sessions':
        return this.renderSessionReportsView();
      case 'weekly':
        return this.renderWeeklyProgressView();
      case 'monthly':
        return this.renderMonthlyEvaluationView();
      case 'overview':
      default:
        return this.renderOverviewView();
    }
  }

  /* ==========================================================================
     TAB 1: RINGKASAN PERKEMBANGAN (OVERVIEW)
     ========================================================================== */
  renderOverviewView() {
    return `
      <!-- TOP OVERVIEW STATS (Data Demonstrasi) -->
      <div class="parent-stats-grid">
        <div class="parent-stat-card">
          <div class="parent-stat-icon parent-stat-icon--blue">📅</div>
          <div class="parent-stat-info">
            <span class="parent-demo-tag">Data Demonstrasi</span>
            <span class="parent-stat-value">4 / 8</span>
            <span class="parent-stat-label">Sesi Selesai (50%)</span>
          </div>
        </div>

        <div class="parent-stat-card">
          <div class="parent-stat-icon parent-stat-icon--green">✅</div>
          <div class="parent-stat-info">
            <span class="parent-demo-tag">Data Demonstrasi</span>
            <span class="parent-stat-value">100%</span>
            <span class="parent-stat-label">Tingkat Kehadiran</span>
          </div>
        </div>

        <div class="parent-stat-card">
          <div class="parent-stat-icon parent-stat-icon--amber">⭐</div>
          <div class="parent-stat-info">
            <span class="parent-demo-tag">Data Demonstrasi</span>
            <span class="parent-stat-value">450 XP</span>
            <span class="parent-stat-label">Poin Belajar Terkumpul</span>
          </div>
        </div>

        <div class="parent-stat-card">
          <div class="parent-stat-icon parent-stat-icon--purple">🏆</div>
          <div class="parent-stat-info">
            <span class="parent-demo-tag">Data Demonstrasi</span>
            <span class="parent-stat-value">4 Lencana</span>
            <span class="parent-stat-label">Penghargaan Diraih</span>
          </div>
        </div>
      </div>

      <!-- LIVE SUBMISSION & TEACHER FEEDBACK CARD (StateStore Reactive) -->
      <div id="parent-live-submission-wrapper">
        ${this.renderLiveSubmissionContent()}
      </div>

      <!-- LEARNING TRACK ROADMAP OVERVIEW -->
      <div class="card" style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Modul Aktif: Scratch Starter Adventure
            </h3>
            <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0;">
              Membangun pemahaman logika algoritma, koordinat matematika, dan interaktivitas program.
            </p>
          </div>
          <span class="badge badge-in-progress">Progres Modul: 50%</span>
        </div>

        <div class="weekly-progress-bar-wrap">
          <div class="weekly-progress-bar" style="height: 10px;">
            <div class="weekly-progress-fill" style="width: 50%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-1);">
            <span>Misi 1: Gerak Dasar (Selesai)</span>
            <span>Misi 2: Animasi Kostum (Selesai)</span>
            <span>Misi 3: Logika Perulangan (Sedang Berjalan)</span>
            <span>Misi 4: Tantangan Game Labirin</span>
          </div>
        </div>

        <div class="parent-tip-box" style="margin-top: var(--space-2);">
          <div class="parent-tip-icon" aria-hidden="true">💡</div>
          <div class="parent-tip-content">
            <h4>Catatan Pendampingan Ayah/Bunda</h4>
            <p>
              Ananda Alex sedang mempelajari bagaimana instruksi tombol keyboard dapat menggerakkan karakter di layar.
              Dukungan terbaik di rumah adalah memberikan kesempatan ananda memamerkan hasil karyanya dan menceritakan cara kodenya bekerja.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Helper to render live submission & feedback from StateStore
   */
  renderLiveSubmissionContent() {
    const studentId = this.studentUser.id || 'usr_stu_001';
    const sub = StateStore.getStudentLessonSubmission(studentId, 'les_scratch_motion_01')
      || (StateStore.getStudentSubmissions(studentId)[0])
      || null;

    if (!sub) {
      return `
        <div class="parent-live-status-card">
          <div class="parent-live-header">
            <h3 class="parent-live-title">Status Proyek Tantangan Terakhir</h3>
            <span class="badge badge-not-started">Belum Ada Pengumpulan</span>
          </div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0;">
            Ananda belum mengumpulkan proyek tantangan untuk modul ini. Pembelajaran saat ini masih berlangsung di tahap latihan praktik.
          </p>
        </div>
      `;
    }

    const isApproved = sub.status === 'approved';
    const isRevision = sub.status === 'revision-required';

    let badgeClass = 'badge-submitted';
    let badgeText = 'Menunggu Review Tutor';
    let boxClass = 'is-submitted';
    let statusTitle = 'Proyek Sedang Ditinjau Tutor ⏳';

    if (isApproved) {
      badgeClass = 'badge-approved';
      badgeText = 'Disetujui • Memenuhi Kriteria';
      boxClass = 'is-approved';
      statusTitle = 'Proyek Telah Disetujui! 🎉';
    } else if (isRevision) {
      badgeClass = 'badge-revision-required';
      badgeText = 'Perlu Revisi';
      boxClass = 'is-revision';
      statusTitle = 'Tutor Memberikan Catatan Revisi ⚠️';
    }

    const reviewerName = sub.reviewerName || 'Kak Sarah (Tutor)';
    const feedbackText = sub.teacherFeedback || (isApproved ? 'Proyek disetujui memenuhi seluruh kriteria logika gerak Scratch!' : 'Menunggu review dari tutor.');

    return `
      <div class="parent-live-status-card">
        <div class="parent-live-header">
          <div>
            <h3 class="parent-live-title">
              <span>Status Proyek Tantangan Terakhir</span>
              <span class="badge badge-scratch" style="font-size: 10px;">Data Aktual Siswa</span>
              <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-regular); color: var(--color-text-muted);">(Sinkronisasi Langsung)</span>
            </h3>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Tugas: ${escapeHtml(sub.lessonTitle || 'Scratch — Basic Motion')}
            </span>
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="parent-feedback-box ${boxClass}">
          <div class="parent-feedback-meta">
            <strong style="color: var(--color-text-primary);">${statusTitle}</strong>
            <span>&bull;</span>
            <span>Reviewer: ${escapeHtml(reviewerName)}</span>
            <span>&bull;</span>
            <span>Versi Data: v${sub.version || 1}</span>
          </div>

          <p class="parent-feedback-text">
            "${escapeHtml(feedbackText)}"
          </p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); font-size: var(--font-size-xs); color: var(--color-text-muted);">
          <span>Tautan Proyek Siswa: <a href="${escapeHtml(sub.projectUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); font-weight: var(--font-weight-medium);">${escapeHtml(sub.projectUrl || 'Belum ada tautan')} ↗</a></span>
          <span>Checkpoint Praktik: ${sub.checkpointsPassed || 4}/${sub.checkpointsTotal || 4} Terpenuhi &bull; Kuis: ${escapeHtml(sub.quizScore || '3/3')}</span>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     TAB 2: LAPORAN SESI TATAP MUKA (SESSION REPORTS)
     Phase 3: Displays Actual Submitted Reports from SessionStore + Demo Fallback
     ========================================================================== */
  renderSessionReportsView() {
    const studentId = this.studentUser.id || 'usr_stu_001';
    const actualReports = SessionStore.getStudentSubmittedReports(studentId);

    const compLabels = {
      algorithmic_logic: 'Logika & Algoritma',
      project_remixing: 'Kreativitas Modifikasi',
      debugging: 'Debugging & Solusi',
      communication: 'Komunikasi',
      persistence: 'Kemandirian & Kegigihan'
    };

    const actualReportsHtml = actualReports.map((report) => {
      const compEntries = Object.entries(report.competencies || {})
        .filter(([_, data]) => data && data.evaluated);

      return `
        <article class="session-report-card" aria-labelledby="actual-report-title-${report.id}" style="border-left: 4px solid var(--color-success);">
          <div class="session-report-header">
            <div class="session-title-group">
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); flex-wrap: wrap;">
                <span class="badge badge-approved" style="font-weight: var(--font-weight-bold);">Laporan Aktual Tutor</span>
                ${report.sessionNumber ? `<span class="badge badge-scratch">Sesi ke-${report.sessionNumber}</span>` : ''}
                <span class="badge badge-in-progress">Terkirim ke Ortu</span>
              </div>
              <h3 id="actual-report-title-${report.id}">${escapeHtml(report.topic || 'Sesi Pembelajaran')}</h3>
              <div class="session-meta-row">
                <span>🗓️ ${escapeHtml(report.sessionDate)}</span>
                <span>👩‍🏫 Tutor: <strong>${escapeHtml(report.tutorName || 'Kak Sarah')}</strong></span>
                <span>🎯 Siswa: <strong>${escapeHtml(report.studentName || this.studentUser.name)}</strong></span>
              </div>
            </div>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); background: var(--color-bg-surface-elevated); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); border: 1px solid var(--color-border-subtle);">
              ${escapeHtml(report.moduleName || 'Scratch Starter Adventure')}
            </span>
          </div>

          <div class="session-sections-grid">
            <!-- Activities -->
            <div class="session-box">
              <span class="session-box-title">📋 Aktivitas Pembelajaran</span>
              <p class="session-narrative-text">${escapeHtml(report.activities || '-')}</p>
            </div>

            <!-- Achievements -->
            <div class="session-box">
              <span class="session-box-title">🌟 Pencapaian Ananda</span>
              <p class="session-narrative-text">${escapeHtml(report.achievements || '-')}</p>
            </div>
          </div>

          ${(report.difficulties || report.solutions) ? `
            <div class="session-box" style="background: var(--color-bg-surface-subtle);">
              <span class="session-box-title">🔍 Tantangan Belajar &amp; Bantuan Tutor</span>
              ${report.difficulties ? `<p class="session-narrative-text"><strong>Tantangan:</strong> ${escapeHtml(report.difficulties)}</p>` : ''}
              ${report.solutions ? `<p class="session-narrative-text" style="margin-top: var(--space-1);"><strong>Solusi Tutor:</strong> ${escapeHtml(report.solutions)}</p>` : ''}
            </div>
          ` : ''}

          ${report.parentRecommendations ? `
            <div class="parent-tip-box">
              <div class="parent-tip-icon" aria-hidden="true">💡</div>
              <div class="parent-tip-content">
                <h4>Rekomendasi untuk Ayah/Bunda di Rumah</h4>
                <p>${escapeHtml(report.parentRecommendations)}</p>
              </div>
            </div>
          ` : ''}

          ${compEntries.length > 0 ? `
            <div class="session-box" style="border-left: 3px solid var(--color-primary);">
              <span class="session-box-title" style="color: var(--color-primary);">💡 Observasi Kompetensi Komputasional Tercatat</span>
              <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-1);">
                ${compEntries.map(([key, comp]) => `
                  <div style="background: var(--color-bg-surface); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                      <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${compLabels[key] || key}</strong>
                      <span class="badge badge-level" style="font-size: 10px;">${escapeHtml(comp.level || 'Cakap')}</span>
                    </div>
                    ${comp.evidence ? `<p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0;">${escapeHtml(comp.evidence)}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    const demoReportsHtml = this.sessionReports.map((report) => `
      <article class="session-report-card" aria-labelledby="report-title-${report.id}">
        <div class="session-report-header">
          <div class="session-title-group">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge badge-warning">Data Demonstrasi</span>
              <span class="badge badge-scratch">Sesi ke-${report.sessionNumber}</span>
              <span class="badge badge-approved">${escapeHtml(report.attendance)}</span>
            </div>
            <h3 id="report-title-${report.id}">${escapeHtml(report.topic)}</h3>
            <div class="session-meta-row">
              <span>🗓️ ${escapeHtml(report.formattedDate || report.date)}</span>
              <span>⏰ ${escapeHtml(report.time)}</span>
              <span>👩‍🏫 Tutor: <strong>${escapeHtml(report.tutorName)}</strong></span>
            </div>
          </div>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted); background: var(--color-bg-surface-elevated); padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); border: 1px solid var(--color-border-subtle);">
            ${escapeHtml(report.moduleName)}
          </span>
        </div>

        <div class="session-sections-grid">
          <!-- Activities -->
          <div class="session-box">
            <span class="session-box-title">📋 Aktivitas Pembelajaran</span>
            <ul class="session-bullet-list">
              ${(report.activities || []).map(act => `<li>${escapeHtml(act)}</li>`).join('')}
            </ul>
          </div>

          <!-- Achievements -->
          <div class="session-box">
            <span class="session-box-title">🌟 Pencapaian Ananda</span>
            <ul class="session-bullet-list">
              ${(report.achievements || []).map(ach => `<li>${escapeHtml(ach)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Difficulties & Resolution -->
        <div class="session-box" style="background: var(--color-bg-surface-subtle);">
          <span class="session-box-title">🔍 Tantangan Belajar &amp; Solusi di Kelas</span>
          <p class="session-narrative-text">${escapeHtml(report.difficulties)}</p>
        </div>

        <!-- Recommendation for Parent -->
        <div class="parent-tip-box">
          <div class="parent-tip-icon" aria-hidden="true">💡</div>
          <div class="parent-tip-content">
            <h4>Rekomendasi untuk Ayah/Bunda di Rumah</h4>
            <p>${escapeHtml(report.parentRecommendations)}</p>
          </div>
        </div>
      </article>
    `).join('');

    return `
      <!-- BAGIAN 1: LAPORAN SESI AKTUAL (TUTOR LANGSUNG) -->
      <section style="margin-bottom: var(--space-8);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); border-bottom: 2px solid var(--color-border-subtle); padding-bottom: var(--space-3);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
              <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0; color: var(--color-text-primary);">
                Laporan Sesi Aktual (Tutor Langsung)
              </h3>
              <span class="badge badge-approved" style="font-size: 10px;">Data Aktual Live</span>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Laporan tatap muka resmi yang dicatat langsung oleh tutor pengajar di kelas ananda.
            </p>
          </div>
          <span class="badge badge-scratch">${actualReports.length} Laporan Diterbitkan</span>
        </div>

        ${actualReports.length === 0 ? `
          <div class="card" style="padding: var(--space-6); text-align: center; background: var(--color-bg-surface-elevated); border: 1.5px dashed var(--color-border-subtle); border-radius: var(--radius-xl);">
            <div style="font-size: var(--font-size-3xl); margin-bottom: var(--space-2);" aria-hidden="true">📝</div>
            <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Belum Ada Laporan Sesi Aktual yang Diterbitkan
            </h4>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0 auto; max-width: 480px; line-height: var(--line-height-relaxed);">
              Tutor akan mencatat aktivitas belajar, pencapaian, dan observasi kompetensi setiap selesai sesi. Laporan akan otomatis tampil di sini segera setelah dikirimkan oleh tutor melalui Teacher Workspace.
            </p>
          </div>
        ` : `
          <div class="session-reports-list">
            ${actualReportsHtml}
          </div>
        `}
      </section>

      <!-- BAGIAN 2: DATA DEMONSTRASI KURIKULUM -->
      <section style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px dashed var(--color-border-default);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
              <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin: 0; color: var(--color-text-secondary);">
                Contoh Format Laporan Kurikulum
              </h4>
              <span class="badge badge-warning" style="font-size: 10px;">Data Demonstrasi</span>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Contoh dokumentasi sesi pembelajaran reguler sebagai referensi format transparansi laporan.
            </p>
          </div>
        </div>

        <div class="session-reports-list">
          ${demoReportsHtml}
        </div>
      </section>
    `;
  }

  /* ==========================================================================
     TAB 3: KEMAJUAN MINGGUAN (WEEKLY PROGRESS)
     Phase 3: Connects actual session highlights without faking numeric scores
     ========================================================================== */
  renderWeeklyProgressView() {
    const studentId = this.studentUser.id || 'usr_stu_001';
    const actualReports = SessionStore.getStudentSubmittedReports(studentId);

    // Dynamic actual highlight if tutor has submitted reports
    const actualWeeklyHighlight = actualReports.length > 0 ? `
      <div class="card" style="padding: var(--space-5); margin-bottom: var(--space-6); border-left: 4px solid var(--color-primary); background: var(--color-bg-surface-elevated);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
              <span class="badge badge-approved" style="font-size: 10px;">Sorotan Sesi Aktual</span>
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">Catatan Sesi Terbaru dari Tutor (${escapeHtml(actualReports[0].sessionDate)})</strong>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Topik: <strong>${escapeHtml(actualReports[0].topic)}</strong> &bull; Tutor: <strong>${escapeHtml(actualReports[0].tutorName || 'Kak Sarah')}</strong>
            </p>
          </div>
          <span class="badge badge-scratch">Sesi Terverifikasi</span>
        </div>
        <div class="session-sections-grid">
          <div class="session-box" style="background: var(--color-bg-surface);">
            <span class="session-box-title" style="color: var(--color-success-text);">🌟 Pencapaian Konkret:</span>
            <p class="session-narrative-text">${escapeHtml(actualReports[0].achievements)}</p>
          </div>
          <div class="session-box" style="background: var(--color-bg-surface);">
            <span class="session-box-title" style="color: var(--color-info-text);">💡 Rekomendasi di Rumah:</span>
            <p class="session-narrative-text">${escapeHtml(actualReports[0].parentRecommendations || '-')}</p>
          </div>
        </div>
      </div>
    ` : '';

    if (this.weeklyProgress.length === 0 && !actualWeeklyHighlight) {
      return `
        <div class="card" style="padding: var(--space-8); text-align: center;">
          <p style="color: var(--color-text-muted);">Belum ada rekap mingguan yang diterbitkan.</p>
        </div>
      `;
    }

    const weeklyHtml = this.weeklyProgress.map((w) => `
      <article class="weekly-card" aria-labelledby="week-title-${w.id}">
        <div class="weekly-header">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge badge-warning">Data Demonstrasi</span>
              <span class="badge badge-scratch">Minggu ke-${w.weekNumber}</span>
              <span class="badge badge-in-progress">${escapeHtml(w.status || 'Aktif')}</span>
            </div>
            <h3 id="week-title-${w.id}" style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              ${escapeHtml(w.topic)}
            </h3>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Rentang: ${escapeHtml(w.dateRange)} &bull; ${escapeHtml(w.moduleName)}
            </span>
          </div>

          <div style="text-align: right;">
            <span style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${w.moduleProgressPct}%</span>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Progres Modul</div>
          </div>
        </div>

        <div class="weekly-progress-bar-wrap">
          <div class="weekly-progress-bar">
            <div class="weekly-progress-fill" style="width: ${w.moduleProgressPct}%;"></div>
          </div>
        </div>

        <div class="session-sections-grid">
          <!-- Strengths -->
          <div class="session-box">
            <span class="session-box-title" style="color: var(--color-success-text);">💪 Kekuatan Belajar Minggu Ini</span>
            <ul class="session-bullet-list">
              ${(w.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>

          <!-- Areas to Practice -->
          <div class="session-box">
            <span class="session-box-title" style="color: var(--color-warning-text);">🎯 Area yang Terus Dilatih</span>
            <ul class="session-bullet-list">
              ${(w.areasToPractice || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}
            </ul>
          </div>
        </div>

        <!-- Tutor Warm Note -->
        <div class="session-box" style="background: var(--color-info-bg); border-color: var(--color-info-border);">
          <span class="session-box-title" style="color: var(--color-info-text);">💌 Pesan Personal Tutor untuk Orang Tua</span>
          <p class="session-narrative-text" style="color: var(--color-text-primary);">
            "${escapeHtml(w.tutorNotes)}"
          </p>
        </div>
      </article>
    `).join('');

    return `
      ${actualWeeklyHighlight}
      <div class="weekly-progress-list">
        ${weeklyHtml}
      </div>
    `;
  }

  /* ==========================================================================
     TAB 4: EVALUASI & KOMPETENSI BULANAN (MONTHLY EVALUATION)
     Phase 3: Connects actual evidence-based competencies without fabricating scores
     ========================================================================== */
  renderMonthlyEvaluationView() {
    const studentId = this.studentUser.id || 'usr_stu_001';
    const actualReports = SessionStore.getStudentSubmittedReports(studentId);

    // Collect all unique evaluated competencies across actual reports
    const actualCompetencies = [];
    const compLabels = {
      algorithmic_logic: 'Logika & Algoritma',
      project_remixing: 'Kreativitas Modifikasi',
      debugging: 'Debugging & Solusi',
      communication: 'Komunikasi',
      persistence: 'Kemandirian & Kegigihan'
    };

    actualReports.forEach((rep) => {
      Object.entries(rep.competencies || {}).forEach(([key, val]) => {
        if (val && val.evaluated) {
          actualCompetencies.push({
            compKey: key,
            compName: compLabels[key] || key,
            level: val.level || 'Cakap',
            evidence: val.evidence,
            sessionDate: rep.sessionDate,
            sessionNumber: rep.sessionNumber,
            tutorName: rep.tutorName
          });
        }
      });
    });

    const actualCompBlock = actualCompetencies.length > 0 ? `
      <!-- OBSERVASI KOMPETENSI AKTUAL DARI TUTOR -->
      <div class="card" style="padding: var(--space-5); margin-bottom: var(--space-6); border-left: 4px solid var(--color-success); background: var(--color-bg-surface-elevated);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
              <span class="badge badge-approved" style="font-size: 10px;">Bukti Observasi Aktual</span>
              <h4 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0; color: var(--color-text-primary);">
                Observasi Kompetensi Berbasis Bukti Nyata (Sesi Tatap Muka)
              </h4>
            </div>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Catatan kualitatif langsung dari tutor selama sesi pembelajaran, independen dari skor kuis otomatis.
            </p>
          </div>
          <span class="badge badge-scratch">${actualCompetencies.length} Bukti Diobservasi</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${actualCompetencies.map(ac => `
            <div style="background: var(--color-bg-surface); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-1); flex-wrap: wrap; gap: var(--space-2);">
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(ac.compName)}</strong>
                  <span class="badge badge-level">${escapeHtml(ac.level)}</span>
                </div>
                <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                  🗓️ ${escapeHtml(ac.sessionDate)} &bull; Tutor: <strong>${escapeHtml(ac.tutorName || 'Kak Sarah')}</strong>
                </span>
              </div>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0; line-height: var(--line-height-relaxed);">
                <strong>Bukti Perilaku:</strong> "${escapeHtml(ac.evidence || 'Perilaku komputasional teramati aktif di kelas.')}"
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    if (this.monthlyEvaluations.length === 0 && !actualCompBlock) {
      return `
        <div class="card" style="padding: var(--space-8); text-align: center;">
          <p style="color: var(--color-text-muted);">Belum ada evaluasi bulanan yang diterbitkan.</p>
        </div>
      `;
    }

    const ev = this.monthlyEvaluations[0] || {};
    const cm = ev.completionVsMastery || {};

    return `
      ${actualCompBlock}

      <div class="monthly-eval-card">
        <!-- MONTHLY HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3); border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-4);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge badge-warning">Data Demonstrasi (Format Evaluasi)</span>
              <span class="badge badge-scratch">${escapeHtml(ev.month || 'Nov 2026')}</span>
              <span class="badge badge-level">${escapeHtml(ev.track || 'Scratch')}</span>
            </div>
            <h3 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              ${escapeHtml(ev.periodLabel || 'Evaluasi Bulanan')}
            </h3>
            <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
              Tanggal Terbit: ${escapeHtml(ev.evaluationDate || '-')} &bull; Evaluator: <strong>${escapeHtml(ev.evaluatorName || 'Tim Akademik')}</strong>
            </span>
          </div>

          <div style="background: var(--color-bg-surface-elevated); border: 1px solid var(--color-primary-border); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-5); text-align: center;">
            <span style="font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary);">${ev.overallScore || 88}</span>
            <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">/ 100</span>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-success-text); margin-top: var(--space-1);">
              ${escapeHtml(ev.overallMasteryLabel || 'Sangat Baik')}
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════
             COMPETENCY BREAKDOWN VS TASK COMPLETION DISTINCTION
             Explains clearly to parents that finishing lessons != CT mastery
             ═══════════════════════════════════════════════════════════════════ -->
        <div class="monthly-distinction-banner" role="region" aria-label="Penjelasan Penyelesaian Tugas vs Penguasaan Konseptual">
          <div class="monthly-distinction-header">
            <span style="font-size: var(--font-size-xl);" aria-hidden="true">💡</span>
            <div>
              <h4 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0; color: var(--color-text-primary);">
                Penyelesaian Tugas vs Penguasaan Pola Pikir Komputasional
              </h4>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
                Memahami metrik evaluasi Bits2Bytes dalam mendampingi tumbuh kembang anak.
              </p>
            </div>
          </div>

          <div class="distinction-grid">
            <!-- Box 1: Task Completion -->
            <div class="distinction-box distinction-task">
              <span style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-info-text); font-weight: var(--font-weight-semibold);">
                1. Penyelesaian Tugas (Task Completion)
              </span>
              <div class="distinction-rate">${cm.taskCompletionRate}%</div>
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(cm.taskCompletionLabel)}</strong>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; line-height: var(--line-height-normal);">
                ${escapeHtml(cm.taskCompletionDescription)}
              </p>
            </div>

            <!-- Box 2: Conceptual Mastery -->
            <div class="distinction-box distinction-mastery">
              <span style="font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-success-text); font-weight: var(--font-weight-semibold);">
                2. Penguasaan Konsep (Conceptual Mastery)
              </span>
              <div class="distinction-rate" style="color: var(--color-success);">${cm.conceptualMasteryRate}%</div>
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(cm.conceptualMasteryLabel)}</strong>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; line-height: var(--line-height-normal);">
                ${escapeHtml(cm.conceptualMasteryDescription)}
              </p>
            </div>
          </div>

          <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); margin: 0; background: var(--color-bg-surface); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border-left: 3px solid var(--color-primary);">
            ${escapeHtml(cm.parentExplanation)}
          </p>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════
             4 COMPETENCIES DETAILED BREAKDOWN
             ═══════════════════════════════════════════════════════════════════ -->
        <div>
          <h4 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-4) 0; color: var(--color-text-primary);">
            Rincian Penguasaan Kompetensi Komputasional
          </h4>

          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            ${(ev.competencies || []).map(comp => `
              <div class="competency-item-card">
                <div class="competency-header">
                  <div>
                    <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(comp.name)}</strong>
                    <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: var(--space-1) 0 0 0;">
                      ${escapeHtml(comp.friendlyExplanation)}
                    </p>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${comp.score}</span>
                    <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">/ 100</span>
                    <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-${comp.badgeColor || 'primary'});">${escapeHtml(comp.level)}</div>
                  </div>
                </div>

                <div class="competency-meter-track">
                  <div class="competency-meter-fill meter-${comp.badgeColor || 'primary'}" style="width: ${comp.score}%;"></div>
                </div>

                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); background: var(--color-bg-surface); padding: var(--space-3); border-radius: var(--radius-md);">
                  <strong>Pengamatan Tutor:</strong> ${escapeHtml(comp.observedBehavior)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TUTOR SUMMARY -->
        <div class="session-box" style="background: var(--color-bg-surface-elevated);">
          <span class="session-box-title" style="color: var(--color-primary);">📝 Kesimpulan Menyeluruh Tutor</span>
          <p class="session-narrative-text" style="font-size: var(--font-size-sm); line-height: var(--line-height-relaxed);">
            "${escapeHtml(ev.tutorSummary)}"
          </p>
        </div>

        <!-- NEXT MONTH TARGETS -->
        <div class="next-targets-box">
          <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary); display: flex; align-items: center; gap: var(--space-2);">
            <span>🎯 Target Pembelajaran Bulan Berikutnya</span>
          </strong>
          <ul class="session-bullet-list">
            ${(ev.nextMonthTargets || []).map(target => `<li>${escapeHtml(target)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Bind navigation tab buttons
   */
  bindTabEvents() {
    const tabButtons = this.container.querySelectorAll('[data-parent-tab]');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-parent-tab');
        if (!targetTab || targetTab === this.activeTab) return;

        this.activeTab = targetTab;

        // Update tab buttons
        tabButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        // Update content container
        const contentEl = this.container.querySelector('#parent-hub-tab-content');
        if (contentEl) {
          contentEl.innerHTML = this.renderActiveTabContent();
        }
      });
    });
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
