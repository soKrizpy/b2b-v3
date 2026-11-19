/**
 * B2B LEARNING ENGINE - TEACHER WORKSPACE CONTROLLER
 * Phase 3.1 — Teacher Dashboard & Summary Overview
 * Adheres strictly to Section 5, 10, 12, 13 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

import { MockService } from './services/mock-service.js';
import { LearningStateRepository } from './services/learning-state-repository.js';
import { SessionReportRepository, MonthlyEvaluationRepository } from './services/learning-record-repository.js';
import { IdentityRepository } from './services/identity-repository.js';
import { ClassSessionRepository } from './services/class-session-repository.js';
import { Drawer } from './components/drawer.js';
import { showToast } from './components/toast.js';
import {
  SVG_ICON_BADGE_SHIELD,
  SVG_ICON_TARGET,
  SVG_ICON_CHECK,
  SVG_ICON_TROPHY,
  SVG_ICON_STAR
} from './illustrations.js';

export class TeacherWorkspace {
  /**
   * @param {HTMLElement} container - Root element (#teacher-container)
   */
  constructor(container, user = null) {
    this.container = container;
    this.user = user;
    this.assignedStudentIds = null;
    this.assignedStudentNames = null;
    this.classSummary = null;
    this.submissions = [];
    this.students = [];
    this.tutorReports = [];
    this.monthlyEvaluations = [];
    this.scheduleSessions = [];
    this.usersById = new Map();
    this.activeTab = 'dashboard'; // 'dashboard' | 'students' | 'submissions' | 'session-reports'
    this.selectedSubmission = null;
    this.isCreatingReport = false;
    this.editingReport = null;
    this.reportsFilter = 'all'; // 'all' | 'submitted' | 'draft'
    this.isCreatingMonthlyEvaluation = false;
    this.editingMonthlyEvaluation = null;
    this.destroyed = false;
  }

  /**
   * Initialize data and render view
   */
  async init() {
    try {
      const [summary, rawSubmissions, students] = await Promise.all([
        MockService.fetchClassSummary(),
        MockService.fetchSubmissions(),
        MockService.fetchStudents()
      ]);
      if (this.destroyed) return;

      // Seed StateStore if empty/uninitialized
      await LearningStateRepository.seedSubmissionsIfEmpty(rawSubmissions);
      if (this.destroyed) return;

      this.user = this.user || { id: 'usr_tea_001', displayName: 'Kak Sarah', avatar: 'KS', role: 'tutor' };
      const [storeSubmissions, assignedUsers, scheduleSessions, tutorReports, monthlyEvaluations, allUsers] = await Promise.all([
        LearningStateRepository.getAllSubmissions(),
        IdentityRepository.getTutorStudents(this.user.id),
        ClassSessionRepository.getAllSessions(),
        SessionReportRepository.getTutorReports(this.user.id),
        MonthlyEvaluationRepository.getTutorEvaluations(this.user.id),
        IdentityRepository.getAllUsers()
      ]);
      if (this.destroyed) return;
      this.scheduleSessions = scheduleSessions;
      this.tutorReports = tutorReports;
      this.monthlyEvaluations = monthlyEvaluations;
      this.usersById = new Map(allUsers.map((user) => [user.id, user]));
      this.assignedStudentIds = new Set(assignedUsers.map((student) => student.id));
      this.assignedStudentNames = new Set(assignedUsers.map((student) => student.displayName));
      this.students = (students || []).filter((student) => this.assignedStudentIds.has(student.id));
      this.submissions = (storeSubmissions.length > 0 ? storeSubmissions : (rawSubmissions || [])).filter((submission) => this.assignedStudentIds.has(submission.studentId));
      this.classSummary = {
        ...summary,
        totalStudents: this.students.length,
        activeStudents: this.students.filter((student) => student.isActive).length,
        recentActivities: (summary.recentActivities || []).filter((activity) => this.assignedStudentNames.has(activity.studentName))
      };

      // Calculate dynamic metrics from active store
      this.syncMetricsFromSubmissions();

      this.render();
      this.bindDrawerActions();

      // Subscribe to reactive store changes (cross-tab & same-tab)
      if (!this._unsubscribeStore) {
        this._unsubscribeStore = LearningStateRepository.subscribe(() => {
          void this.handleExternalStoreUpdate();
        });
      }

      // Subscribe to operational class-session changes.
      if (!this._unsubscribeClassSessionStore) {
        this._unsubscribeClassSessionStore = ClassSessionRepository.subscribe(() => {
          void this.refreshSchedule();
        });
      }

      if (!this._unsubscribeMonthlyEvaluationStore) {
        this._unsubscribeMonthlyEvaluationStore = MonthlyEvaluationRepository.subscribe(() => {
          void this.refreshMonthlyEvaluations();
        });
      }

      // Subscribe to SessionStore mutations
      if (!this._unsubscribeSessionStore) {
        this._unsubscribeSessionStore = SessionReportRepository.subscribe(() => {
          void this.refreshTutorReports();
        });
      }
    } catch (err) {
      if (this.destroyed) return;
      console.error('Gagal memuat Teacher Workspace data:', err);
      if (this.container) {
        this.container.innerHTML = `
          <div class="card" style="padding: var(--space-6); text-align: center;">
            <p style="color: var(--color-danger);">Terjadi kesalahan saat memuat data Teacher Dashboard.</p>
          </div>
        `;
      }
    }
  }

  /**
   * Synchronize pending and approved metrics from active submissions
   */
  syncMetricsFromSubmissions() {
    if (!this.classSummary) return;
    const pendingCount = this.submissions.filter((s) => s.status === 'submitted').length;
    const approvedCount = this.submissions.filter((s) => s.status === 'approved').length;
    this.classSummary.pendingSubmissions = pendingCount;
    this.classSummary.approvedProjects = approvedCount;
  }

  /**
   * Reactive update handler for external changes (cross-tab or local)
   */
  async handleExternalStoreUpdate() {
    if (this.destroyed) return;
    const updated = await LearningStateRepository.getAllSubmissions();
    if (this.destroyed) return;
    this.submissions = updated.filter((submission) => this.assignedStudentIds?.has(submission.studentId));
    this.syncMetricsFromSubmissions();
    const drawer = document.getElementById('sample-drawer');
    const isDrawerOpen = drawer && drawer.classList.contains('is-open');
    if (!isDrawerOpen) this.render();
  }

  async refreshSchedule() {
    const sessions = await ClassSessionRepository.getAllSessions();
    if (this.destroyed) return;
    this.scheduleSessions = sessions;
    if (this.activeTab === 'schedule') this.render();
  }

  async refreshTutorReports() {
    const reports = await SessionReportRepository.getTutorReports(this.user.id);
    if (this.destroyed) return;
    this.tutorReports = reports;
    if (this.activeTab === 'session-reports') this.render();
    else this.updateReportsBadgePill();
  }

  async refreshMonthlyEvaluations() {
    const evaluations = await MonthlyEvaluationRepository.getTutorEvaluations(this.user.id);
    if (this.destroyed) return;
    this.monthlyEvaluations = evaluations;
    if (this.activeTab === 'monthly-evaluations') this.render();
  }

  /**
   * Main render function
   */
  render() {
    if (!this.container) return;

    const summary = this.classSummary || {
      totalStudents: 6,
      activeStudents: 4,
      pendingSubmissions: 2,
      approvedProjects: 1,
      recentActivities: []
    };

    const pendingSubs = this.submissions.filter((s) => s.status === 'submitted');
    const approvedSubs = this.submissions.filter((s) => s.status === 'approved');

    this.container.innerHTML = `
      <div class="teacher-workspace">
        <!-- 1. TEACHER HEADER BANNER -->
        <header class="teacher-header-banner">
          <div class="teacher-header-info">
            <div class="teacher-avatar-circle" aria-hidden="true">${this.user?.avatar || (this.user?.displayName || "Tutor").slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 class="teacher-greeting-title">Halo, ${this.user?.displayName || "Tutor"}! 👋</h2>
              <p class="teacher-greeting-sub">SDIT Al-Hikmah &bull; Kelas Scratch Starter (Semester Genap 2026)</p>
            </div>
          </div>
          <div class="teacher-class-badge">
            <span class="badge badge-in-progress" style="display: inline-flex; align-items: center; gap: var(--space-1);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-rpg-island-scratch); display: inline-block;"></span>
              Kelas Aktif &bull; Sesi 4
            </span>
          </div>
        </header>

        <!-- 2. SUB-NAVIGATION TABS (Contextual Content Filter — synced with sidebar) -->
        <nav class="teacher-subnav-tabs" aria-label="Navigasi Modul Guru">
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'dashboard' ? 'is-active' : ''}" data-teacher-tab="dashboard">
            <span>Dashboard Guru</span>
            <span class="tab-badge-pill">Utama</span>
          </button>
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'students' ? 'is-active' : ''}" data-teacher-tab="students">
            <span>Manajemen Siswa</span>
            <span class="tab-badge-pill">${this.students.length} Siswa</span>
          </button>
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'submissions' ? 'is-active' : ''}" data-teacher-tab="submissions">
            <span>Antrean Submission</span>
            <span class="tab-badge-pill">${pendingSubs.length} Menunggu</span>
          </button>
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'schedule' ? 'is-active' : ''}" data-teacher-tab="schedule">
            <span>Jadwal Mengajar</span>
            <span class="tab-badge-pill">${this.getAssignedScheduleCount()} Sesi</span>
          </button>
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'monthly-evaluations' ? 'is-active' : ''}" data-teacher-tab="monthly-evaluations">
            <span>Evaluasi Bulanan</span>
            <span class="tab-badge-pill">${this.getMonthlyEvaluationCount()} Laporan</span>
          </button>
          <button type="button" class="teacher-tab-btn ${this.activeTab === 'session-reports' ? 'is-active' : ''}" data-teacher-tab="session-reports">
            <span>Laporan Sesi Tutor</span>
            <span class="tab-badge-pill" id="teacher-reports-count-pill">${this.getReportsCountLabel()}</span>
          </button>
        </nav>

        <!-- 3. DYNAMIC TAB CONTENT -->
        <div id="teacher-tab-content">
          ${this.renderActiveTabContent(summary, pendingSubs, approvedSubs)}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  getReportsCountLabel() {
    try {
      return `${this.tutorReports.length} Laporan`;
    } catch {
      return '0 Laporan';
    }
  }

  updateReportsBadgePill() {
    const pill = document.getElementById('teacher-reports-count-pill');
    if (pill) {
      pill.textContent = this.getReportsCountLabel();
    }
  }

  /**
   * Render active tab body
   */
  renderActiveTabContent(summary, pendingSubs, approvedSubs) {
    if (this.activeTab === 'students') {
      return this.renderStudentsPlaceholder();
    }
    if (this.activeTab === 'submissions') {
      return this.renderSubmissionsPlaceholder(pendingSubs);
    }
    if (this.activeTab === 'schedule') {
      return this.renderScheduleTab();
    }
    if (this.activeTab === 'monthly-evaluations') return this.renderMonthlyEvaluationsTab();
    if (this.activeTab === 'session-reports') {
      return this.renderSessionReportsTab();
    }
    return this.renderDashboardTab(summary, pendingSubs, approvedSubs);
  }

  getAssignedScheduleSessions() {
    if (!this.user?.id || !this.assignedStudentIds) return [];
    return this.scheduleSessions
      .filter(session => session.tutorId === this.user.id && this.assignedStudentIds.has(session.studentId))
      .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());
  }

  getAssignedScheduleCount() {
    return this.getAssignedScheduleSessions().filter(session => session.status === 'scheduled').length;
  }

  renderScheduleTab() {
    const sessions = this.getAssignedScheduleSessions();
    const statusLabels = {
      scheduled: 'Terjadwal', held: 'Terlaksana', not_held: 'Tidak terlaksana',
      cancelled: 'Dibatalkan', soft_deleted: 'Dihapus administratif'
    };
    const attendanceLabels = {
      not_recorded: 'Belum dicatat', present: 'Hadir', late: 'Terlambat', absent: 'Tidak hadir'
    };

    return `
      <section style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="card" style="padding:var(--space-4);">
          <h3 style="margin-top:0;">Jadwal mengajar saya</h3>
          <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);">
            Hanya jadwal siswa yang ditugaskan kepada akun tutor ini yang ditampilkan. Catat kehadiran setelah sesi selesai. Siswa yang tidak hadir tidak masuk tagihan.
          </p>
        </div>
        ${sessions.length ? sessions.map(session => {
          const student = this.usersById.get(session.studentId);
          const canAct = session.status === 'scheduled';
          return `<article class="card" data-class-session-id="${escapeHtml(session.id)}" style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);">
            <div>
              <strong>Sesi ke-${Number(session.sessionNumber) || '-'} · ${escapeHtml(student?.displayName || session.studentId)}</strong>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
                ${escapeHtml(formatTutorSessionDate(session.scheduledStartAt))} · ${Number(session.durationMinutes)} menit
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                Status kelas: ${escapeHtml(statusLabels[session.status] || session.status)} · Kehadiran: ${escapeHtml(attendanceLabels[session.attendanceStatus] || session.attendanceStatus)}
              </div>
              ${session.meetingUrl ? `<a href="${escapeHtml(session.meetingUrl)}" target="_blank" rel="noopener noreferrer">Buka link kelas</a>` : ''}
              ${session.cancellation?.reason ? `<div>Alasan pembatalan: ${escapeHtml(session.cancellation.reason)}</div>` : ''}
              ${session.replacementRequired ? '<span class="badge badge-warning">Menunggu sesi pengganti dari Admin</span>' : ''}
            </div>
            ${canAct ? `
              <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
                <button type="button" class="btn btn-primary btn-sm" data-record-attendance="present" data-session-id="${escapeHtml(session.id)}">Hadir</button>
                <button type="button" class="btn btn-secondary btn-sm" data-record-attendance="late" data-session-id="${escapeHtml(session.id)}">Terlambat</button>
                <button type="button" class="btn btn-ghost btn-sm" data-record-attendance="absent" data-session-id="${escapeHtml(session.id)}">Siswa tidak hadir</button>
              </div>
              <form data-tutor-cancel-form="${escapeHtml(session.id)}" style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end;border-top:1px solid var(--color-border-subtle);padding-top:var(--space-3);">
                <label style="flex:1;min-width:200px;">Alasan pembatalan
                  <input name="reason" type="text" required maxlength="300" placeholder="Wajib diisi jika kelas dibatalkan" style="width:100%;">
                </label>
                <button type="submit" class="btn btn-ghost btn-sm">Batalkan kelas</button>
              </form>
            ` : ''}
          </article>`;
        }).join('') : '<div class="card" style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);">Belum ada jadwal untuk siswa yang ditugaskan kepada Anda.</div>'}
      </section>
    `;
  }

  /**
   * Render Dashboard Tab (Phase 3.1 Core)
   */
  renderDashboardTab(summary, pendingSubs, approvedSubs) {
    const activities = summary.recentActivities || [];

    return `
      <div style="display: flex; flex-direction: column; gap: var(--space-6);">
        <!-- 4 SUMMARY METRIC CARDS -->
        <div class="teacher-summary-grid">
          <!-- Card 1: Total Siswa -->
          <div class="summary-metric-card metric-card--total">
            <div class="metric-icon-box metric-icon--total" aria-hidden="true">
              ${SVG_ICON_BADGE_SHIELD}
            </div>
            <div class="metric-content">
              <span class="metric-value">${summary.totalStudents}</span>
              <span class="metric-label">Total Siswa</span>
              <span class="metric-subnote">Terdaftar di kelas</span>
            </div>
          </div>

          <!-- Card 2: Siswa Aktif -->
          <div class="summary-metric-card metric-card--active">
            <div class="metric-icon-box metric-icon--active" aria-hidden="true">
              ${SVG_ICON_TARGET}
            </div>
            <div class="metric-content">
              <span class="metric-value">${summary.activeStudents}</span>
              <span class="metric-label">Siswa Aktif</span>
              <span class="metric-subnote">Aktif belajar minggu ini</span>
            </div>
          </div>

          <!-- Card 3: Menunggu Review -->
          <div class="summary-metric-card metric-card--pending">
            <div class="metric-icon-box metric-icon--pending" aria-hidden="true">
              ${SVG_ICON_STAR}
            </div>
            <div class="metric-content">
              <span class="metric-value">${summary.pendingSubmissions}</span>
              <span class="metric-label">Menunggu Review</span>
              <span class="metric-subnote">Perlu evaluasi guru</span>
            </div>
          </div>

          <!-- Card 4: Proyek Disetujui -->
          <div class="summary-metric-card metric-card--approved">
            <div class="metric-icon-box metric-icon--approved" aria-hidden="true">
              ${SVG_ICON_TROPHY}
            </div>
            <div class="metric-content">
              <span class="metric-value">${summary.approvedProjects}</span>
              <span class="metric-label">Proyek Disetujui</span>
              <span class="metric-subnote">Memenuhi kriteria</span>
            </div>
          </div>
        </div>

        <!-- TWO-COLUMN CONTENT GRID -->
        <div class="teacher-content-grid">
          <!-- LEFT COLUMN: SUBMISSION QUEUE PREVIEW -->
          <div class="queue-preview-card">
            <div class="queue-preview-header">
              <div class="queue-title-group">
                <h3 class="queue-title">Antrean Submission Siswa</h3>
                <span class="badge badge-submitted">${pendingSubs.length} Menunggu Review</span>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" data-action="view-all-submissions" style="font-size: var(--font-size-xs);">
                Buka Antrean Lengkap &rarr;
              </button>
            </div>
            <p class="queue-subtitle">
              Submission proyek Scratch yang telah diserahkan siswa dan menunggu review evaluasi Anda.
            </p>

            <div class="queue-table-wrap">
              <table class="queue-table" aria-label="Tabel Antrean Submission">
                <thead>
                  <tr>
                    <th scope="col">Siswa</th>
                    <th scope="col">Materi & Waktu</th>
                    <th scope="col">Status & Validasi</th>
                    <th scope="col" style="text-align: right;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingSubs.length > 0 ? pendingSubs.map((sub) => `
                    <tr>
                      <td>
                        <div class="student-meta-cell">
                          <div class="student-avatar-cell" aria-hidden="true">${sub.studentAvatar || 'S'}</div>
                          <div>
                            <div class="student-name-text">${sub.studentName}</div>
                            <div class="student-grade-sub">${sub.studentGrade}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="lesson-title-cell">${sub.lessonTitle}</div>
                        <div class="submission-time-sub">⏰ ${sub.submittedAt}</div>
                      </td>
                      <td>
                        <div style="display: flex; flex-direction: column; gap: var(--space-1); align-items: flex-start;">
                          <span class="badge badge-submitted">Submitted</span>
                          <span style="font-size: 11px; color: var(--color-text-secondary);">
                            ✓ ${sub.checkpointsPassed}/${sub.checkpointsTotal} Checkpoints
                          </span>
                        </div>
                      </td>
                      <td style="text-align: right;">
                        <button type="button" class="btn btn-secondary btn-sm" data-open-review="${sub.id}">
                          Review Submission &rarr;
                        </button>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: var(--space-6);">
                        Tidak ada submission yang menunggu review saat ini.
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            <!-- Approved History Summary Note -->
            ${approvedSubs.length > 0 ? `
              <div style="background-color: var(--color-bg-surface-subtle); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); display: flex; align-items: center; justify-content: space-between; font-size: var(--font-size-xs);">
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <span style="color: var(--color-success); font-weight: var(--font-weight-bold);">✓</span>
                  <span><strong>1 Proyek Disetujui:</strong> Doni Wijaya (Scratch Basic Motion &bull; Skor 100%)</span>
                </div>
                <span class="badge badge-approved">Approved</span>
              </div>
            ` : ''}
          </div>

          <!-- RIGHT COLUMN: LIVE ACTIVITY STREAM -->
          <div class="activity-card">
            <div class="activity-header">
              <h3 class="activity-title">Aktivitas Siswa Terbaru</h3>
              <span style="font-size: 11px; color: var(--color-text-muted);">Real-time feed</span>
            </div>

            <div class="activity-list" aria-live="polite">
              ${activities.map((act) => `
                <div class="activity-item">
                  <div class="activity-avatar" aria-hidden="true">${act.avatar || 'S'}</div>
                  <div class="activity-info">
                    <div class="activity-text">
                      <strong>${act.studentName}</strong> ${act.action}
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                      <span class="activity-time">${act.timestamp}</span>
                      <span class="badge ${act.badgeClass}" style="font-size: 10px; padding: 1px 6px;">
                        ${act.badge}
                      </span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Placeholder for Student Management (Tahap 3.2)
   */
  renderStudentsPlaceholder() {
    return `
      <div class="module-placeholder-box">
        <div class="placeholder-icon" aria-hidden="true">
          ${SVG_ICON_BADGE_SHIELD}
        </div>
        <h3 class="placeholder-title">Manajemen Siswa (Tahap 3.2)</h3>
        <p class="placeholder-desc">
          Modul ini dijadwalkan pada Tahap 3.2. Anda akan dapat mencari, menyaring, dan memeriksa status detail
          dari <strong>${this.students.length} siswa yang ditugaskan kepada Anda</strong>: ${this.students.map((student) => student.name).join(", ") || "Belum ada siswa yang ditugaskan"}.
        </p>
        <button type="button" class="btn btn-secondary btn-sm" data-teacher-tab="dashboard" style="margin-top: var(--space-2);">
          &larr; Kembali ke Dashboard Guru
        </button>
      </div>
    `;
  }

  /**
   * Placeholder for Full Submission Queue (Tahap 3.3)
   */
  renderSubmissionsPlaceholder(pendingSubs) {
    return `
      <div class="module-placeholder-box">
        <div class="placeholder-icon" aria-hidden="true">
          ${SVG_ICON_TARGET}
        </div>
        <h3 class="placeholder-title">Antrean Submission Lengkap (Tahap 3.3)</h3>
        <p class="placeholder-desc">
          Modul evaluasi komprehensif dengan filter per materi, rubrik penilaian, dan riwayat feedback dijadwalkan pada Tahap 3.3.
          Saat ini terdapat <strong>${pendingSubs.length} submission menunggu</strong> yang dapat Anda review langsung melalui Dashboard Guru.
        </p>
        <button type="button" class="btn btn-primary btn-sm" data-teacher-tab="dashboard" style="margin-top: var(--space-2);">
          Buka Antrean di Dashboard &rarr;
        </button>
      </div>
    `;
  }

  /**
   * Phase 3: Render Tutor Session Reports Tab
   */
  renderSessionReportsTab() {
    if (this.isCreatingReport || this.editingReport) {
      return this.renderSessionReportForm();
    }
    return this.renderSessionReportsList();
  }

  /**
   * Render list of session reports created by tutor
   */
  renderSessionReportsList() {
    const allReports = this.tutorReports;
    const submittedCount = allReports.filter((r) => r.status === 'submitted').length;
    const draftCount = allReports.filter((r) => r.status === 'draft').length;

    let filteredReports = allReports;
    if (this.reportsFilter === 'submitted') {
      filteredReports = allReports.filter((r) => r.status === 'submitted');
    } else if (this.reportsFilter === 'draft') {
      filteredReports = allReports.filter((r) => r.status === 'draft');
    }

    return `
      <div class="session-reports-panel">
        <!-- TOP ACTIONS & SUMMARY BAR -->
        <div style="background-color: var(--color-bg-surface); border: 1.5px solid var(--color-border-subtle); border-radius: var(--radius-2xl); padding: var(--space-5) var(--space-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); box-shadow: var(--shadow-sm);">
          <div>
            <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Pencatatan Laporan Sesi Pembelajaran (Tahap 3)
            </h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Catat aktivitas, pencapaian, dan observasi kompetensi sesi untuk transparansi Parent Hub.
            </p>
          </div>

          <button type="button" class="btn btn-primary btn-sm" id="btn-open-create-report">
            ➕ Catat Sesi Baru
          </button>
        </div>

        <!-- FILTER CHIPS BAR -->
        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
          <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted); margin-right: var(--space-1);">Filter:</span>
          <button type="button" class="btn btn-sm ${this.reportsFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" data-filter-reports="all">
            Semua (${allReports.length})
          </button>
          <button type="button" class="btn btn-sm ${this.reportsFilter === 'submitted' ? 'btn-primary' : 'btn-ghost'}" data-filter-reports="submitted">
            Terkirim ke Ortu (${submittedCount})
          </button>
          <button type="button" class="btn btn-sm ${this.reportsFilter === 'draft' ? 'btn-primary' : 'btn-ghost'}" data-filter-reports="draft">
            Draf (${draftCount})
          </button>
        </div>

        <!-- REPORTS LIST -->
        <div class="report-list-container">
          ${filteredReports.length === 0 ? `
            <div class="reports-empty-box">
              <div style="font-size: var(--font-size-3xl);" aria-hidden="true">📝</div>
              <div>
                <h4 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
                  Belum Ada Laporan Sesi ${this.reportsFilter !== 'all' ? `(${this.reportsFilter})` : ''}
                </h4>
                <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0; max-width: 440px;">
                  Catat laporan sesi pertama Anda untuk memberikan kabar perkembangan anak kepada orang tua di Parent Hub.
                </p>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-open-create-report-empty">
                ➕ Mulai Catat Laporan Sesi Sekarang
              </button>
            </div>
          ` : filteredReports.map((report) => {
            const isDraft = report.status === 'draft';
            const badgeClass = isDraft ? 'badge-warning' : 'badge-approved';
            const badgeText = isDraft ? 'Draf (Belum Dikirim)' : 'Terkirim ke Parent Hub';

            // Extract evaluated competencies
            const compList = Object.entries(report.competencies || {})
              .filter(([_, data]) => data && data.evaluated)
              .map(([key, data]) => {
                const labels = {
                  algorithmic_logic: 'Logika & Algoritma',
                  project_remixing: 'Kreativitas Modifikasi',
                  debugging: 'Debugging & Solusi',
                  communication: 'Komunikasi',
                  persistence: 'Kemandirian'
                };
                return `${labels[key] || key} (${data.level || 'Cakap'})`;
              });

            return `
              <article class="report-item-card" aria-labelledby="report-card-title-${report.id}">
                <div class="report-item-header">
                  <div class="report-student-meta">
                    <div class="report-student-avatar" aria-hidden="true">${escapeHtml(report.studentAvatar || 'S')}</div>
                    <div>
                      <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
                        <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(report.studentName)}</strong>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                        ${report.sessionNumber ? `<span class="badge badge-scratch">Sesi ke-${report.sessionNumber}</span>` : ''}
                        <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">v${report.version || 1}</span>
                      </div>
                      <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                        🗓️ ${escapeHtml(report.sessionDate)} &bull; ${escapeHtml(report.studentGrade || 'Grade 5')} &bull; Tutor: <strong>${escapeHtml(report.tutorName || 'Kak Sarah')}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="report-actions-row">
                    ${isDraft ? `
                      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-report" data-report-id="${report.id}">
                        ✏️ Lanjutkan Edit
                      </button>
                      <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-danger);" data-action="delete-draft" data-report-id="${report.id}" aria-label="Hapus Draf">
                        🗑️ Hapus
                      </button>
                    ` : `
                      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-report" data-report-id="${report.id}">
                        ✏️ Perbarui Catatan
                      </button>
                    `}
                  </div>
                </div>

                <div>
                  <h4 id="report-card-title-${report.id}" style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
                    Topik: ${escapeHtml(report.topic || 'Belum ada topik')}
                  </h4>
                </div>

                <div class="report-grid-preview">
                  <div class="report-preview-box">
                    <span class="report-preview-title">📋 Aktivitas:</span>
                    <p class="report-preview-text">${escapeHtml(report.activities || '-')}</p>
                  </div>
                  <div class="report-preview-box">
                    <span class="report-preview-title">🌟 Pencapaian:</span>
                    <p class="report-preview-text">${escapeHtml(report.achievements || '-')}</p>
                  </div>
                  <div class="report-preview-box">
                    <span class="report-preview-title">💡 Rekomendasi Ortu:</span>
                    <p class="report-preview-text">${escapeHtml(report.parentRecommendations || '-')}</p>
                  </div>
                </div>

                ${compList.length > 0 ? `
                  <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--color-text-secondary); background: var(--color-bg-surface-elevated); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);">
                    <strong>Bukti Kompetensi Tercatat:</strong>
                    ${compList.map(c => `<span class="badge badge-level" style="font-size: 11px;">${escapeHtml(c)}</span>`).join(' ')}
                  </div>
                ` : ''}
              </article>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render session report editor form
   */
  renderSessionReportForm() {
    const report = this.editingReport || {};
    const isEdit = !!this.editingReport;
    const isDraft = report.status === 'draft';
    const today = new Date().toISOString().slice(0, 10);

    const competencies = report.competencies || {};

    return `
      <div class="session-reports-panel">
        <div class="session-form-card">
          <div class="session-form-header">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
                <span class="badge badge-scratch">${isEdit ? 'Mode Edit' : 'Sesi Baru'}</span>
                ${isEdit ? (isDraft ? '<span class="badge badge-warning">Draf Disimpan</span>' : '<span class="badge badge-approved">Laporan Terkirim (Pembaruan)</span>') : ''}
              </div>
              <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
                ${isEdit ? 'Edit Laporan Sesi Pembelajaran' : 'Pencatatan Laporan Sesi Pembelajaran Baru'}
              </h3>
              <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
                Laporan yang disubmit langsung terhubung dan dapat dibaca oleh orang tua di Parent Hub.
              </p>
            </div>

            <button type="button" class="btn btn-ghost btn-sm" id="btn-cancel-report-top">
              ✕ Batal
            </button>
          </div>

          <form id="tutor-session-report-form" onsubmit="return false;" style="display: flex; flex-direction: column; gap: var(--space-6);">
            <!-- BAGIAN 1: INFORMASI SESI -->
            <div class="session-form-section">
              <h4 class="session-section-title">
                <span>📌</span>
                <span>Bagian 1: Informasi Sesi &amp; Siswa</span>
              </h4>

              <div class="session-form-grid-2">
                <div class="session-field-group">
                  <label for="report-student-select" class="session-field-label">Pilih Siswa Terhubung *</label>
                  <select id="report-student-select" class="session-select" required>
                    <option value="">-- Pilih Siswa --</option>
                    ${this.students.map(s => `
                      <option value="${s.id}" ${s.id === (report.studentId || 'usr_stu_001') ? 'selected' : ''}>
                        ${escapeHtml(s.name)} &bull; ${escapeHtml(s.gradeLevel || 'Grade 5')}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="session-field-group">
                  <label for="report-date-input" class="session-field-label">Tanggal Sesi *</label>
                  <input type="date" id="report-date-input" class="session-input" value="${report.sessionDate || today}" required />
                </div>
              </div>

              <div class="session-form-grid-2">
                <div class="session-field-group">
                  <label for="report-session-number" class="session-field-label">Nomor Sesi</label>
                  <input type="number" id="report-session-number" class="session-input" min="1" max="50" placeholder="contoh: 5" value="${report.sessionNumber || ''}" />
                </div>

                <div class="session-field-group">
                  <label for="report-module-input" class="session-field-label">Nama Modul</label>
                  <input type="text" id="report-module-input" class="session-input" value="${report.moduleName || 'Scratch Starter Adventure'}" />
                </div>
              </div>

              <div class="session-field-group">
                <label for="report-topic-input" class="session-field-label">Materi / Topik Pembelajaran *</label>
                <input type="text" id="report-topic-input" class="session-input" placeholder="contoh: Scratch — Basic Motion: Kontrol Keyboard & Koordinat X/Y" value="${escapeHtml(report.topic || '')}" required />
              </div>
            </div>

            <!-- BAGIAN 2: CATATAN PEMBELAJARAN -->
            <div class="session-form-section">
              <h4 class="session-section-title">
                <span>📝</span>
                <span>Bagian 2: Catatan Pembelajaran (Bahasa Ramah Orang Tua)</span>
              </h4>

              <div class="session-field-group">
                <label for="report-activities-input" class="session-field-label">Aktivitas yang Dijalankan *</label>
                <textarea id="report-activities-input" class="session-textarea" placeholder="Uraikan apa saja yang dipelajari dan dipraktikkan siswa di sesi ini..." required>${escapeHtml(report.activities || '')}</textarea>
              </div>

              <div class="session-field-group">
                <label for="report-achievements-input" class="session-field-label">Pencapaian Siswa *</label>
                <textarea id="report-achievements-input" class="session-textarea" placeholder="Konsep atau tantangan koding apa yang berhasil dikuasai siswa..." required>${escapeHtml(report.achievements || '')}</textarea>
              </div>

              <div class="session-form-grid-2">
                <div class="session-field-group">
                  <label for="report-difficulties-input" class="session-field-label">Kendala / Kesulitan yang Ditemukan</label>
                  <textarea id="report-difficulties-input" class="session-textarea" placeholder="Kendala konsep atau bug koding yang sempat dihadapi siswa...">${escapeHtml(report.difficulties || '')}</textarea>
                </div>

                <div class="session-field-group">
                  <label for="report-solutions-input" class="session-field-label">Solusi &amp; Bantuan yang Diberikan Tutor</label>
                  <textarea id="report-solutions-input" class="session-textarea" placeholder="Bagaimana tutor membimbing atau memberikan analogi penyelesaian...">${escapeHtml(report.solutions || '')}</textarea>
                </div>
              </div>

              <div class="session-field-group">
                <label for="report-recommendations-input" class="session-field-label">Rekomendasi Latihan di Rumah (Untuk Orang Tua)</label>
                <textarea id="report-recommendations-input" class="session-textarea" placeholder="Saran praktis bagi Ayah/Bunda untuk mendampingi dan mengapresiasi anak di rumah...">${escapeHtml(report.parentRecommendations || '')}</textarea>
              </div>
            </div>

            <!-- BAGIAN 3: EVALUASI KOMPETENSI BERBASIS BUKTI (OPSIONAL) -->
            <div class="session-form-section">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-2);">
                <div>
                  <h4 class="session-section-title">
                    <span>💡</span>
                    <span>Bagian 3: Observasi Kompetensi Komputasional (Berbasis Bukti)</span>
                  </h4>
                  <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: var(--space-1) 0 0 0;">
                    Hanya tandai kompetensi yang benar-benar diobservasi dan memiliki bukti nyata di sesi ini. Tidak wajib menilai seluruh kompetensi setiap sesi.
                  </p>
                </div>
                <span class="badge badge-warning">Opsional Berbasis Bukti</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-2);">
                <!-- Comp 1: Algorithmic Logic -->
                <div class="competency-eval-card ${competencies.algorithmic_logic?.evaluated ? 'is-active' : ''}">
                  <div class="competency-eval-header">
                    <label class="competency-eval-checkbox-label">
                      <input type="checkbox" id="comp-check-logic" data-comp-key="algorithmic_logic" ${competencies.algorithmic_logic?.evaluated ? 'checked' : ''} />
                      <span>1. Logika &amp; Algoritma (Sequencing &amp; Logic)</span>
                    </label>
                    <select id="comp-level-logic" class="session-select" style="padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs);">
                      <option value="Emerging" ${competencies.algorithmic_logic?.level === 'Emerging' ? 'selected' : ''}>Berkembang (Emerging)</option>
                      <option value="Competent" ${(!competencies.algorithmic_logic?.level || competencies.algorithmic_logic?.level === 'Competent') ? 'selected' : ''}>Cakap (Competent)</option>
                      <option value="Proficient" ${competencies.algorithmic_logic?.level === 'Proficient' ? 'selected' : ''}>Mahir (Proficient)</option>
                    </select>
                  </div>
                  <div class="competency-eval-body">
                    <textarea id="comp-evidence-logic" class="session-textarea" style="min-height: 60px;" placeholder="Catatan bukti observasi konkret (contoh: Alex mampu menyusun urutan blok loop dan delay secara runut tanpa dibantu)...">${escapeHtml(competencies.algorithmic_logic?.evidence || '')}</textarea>
                  </div>
                </div>

                <!-- Comp 2: Project Remixing -->
                <div class="competency-eval-card ${competencies.project_remixing?.evaluated ? 'is-active' : ''}">
                  <div class="competency-eval-header">
                    <label class="competency-eval-checkbox-label">
                      <input type="checkbox" id="comp-check-remix" data-comp-key="project_remixing" ${competencies.project_remixing?.evaluated ? 'checked' : ''} />
                      <span>2. Kreativitas &amp; Modifikasi Proyek (Remixing)</span>
                    </label>
                    <select id="comp-level-remix" class="session-select" style="padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs);">
                      <option value="Emerging" ${competencies.project_remixing?.level === 'Emerging' ? 'selected' : ''}>Berkembang (Emerging)</option>
                      <option value="Competent" ${(!competencies.project_remixing?.level || competencies.project_remixing?.level === 'Competent') ? 'selected' : ''}>Cakap (Competent)</option>
                      <option value="Proficient" ${competencies.project_remixing?.level === 'Proficient' ? 'selected' : ''}>Mahir (Proficient)</option>
                    </select>
                  </div>
                  <div class="competency-eval-body">
                    <textarea id="comp-evidence-remix" class="session-textarea" style="min-height: 60px;" placeholder="Catatan bukti modifikasi kode (contoh: Berinisiatif menambah kontrol tombol spasi untuk lompat dan mengganti latar panggung)...">${escapeHtml(competencies.project_remixing?.evidence || '')}</textarea>
                  </div>
                </div>

                <!-- Comp 3: Troubleshooting / Debugging -->
                <div class="competency-eval-card ${competencies.debugging?.evaluated ? 'is-active' : ''}">
                  <div class="competency-eval-header">
                    <label class="competency-eval-checkbox-label">
                      <input type="checkbox" id="comp-check-debug" data-comp-key="debugging" ${competencies.debugging?.evaluated ? 'checked' : ''} />
                      <span>3. Pemecahan Masalah &amp; Debugging (Troubleshooting)</span>
                    </label>
                    <select id="comp-level-debug" class="session-select" style="padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs);">
                      <option value="Emerging" ${competencies.debugging?.level === 'Emerging' ? 'selected' : ''}>Berkembang (Emerging)</option>
                      <option value="Competent" ${(!competencies.debugging?.level || competencies.debugging?.level === 'Competent') ? 'selected' : ''}>Cakap (Competent)</option>
                      <option value="Proficient" ${competencies.debugging?.level === 'Proficient' ? 'selected' : ''}>Mahir (Proficient)</option>
                    </select>
                  </div>
                  <div class="competency-eval-body">
                    <textarea id="comp-evidence-debug" class="session-textarea" style="min-height: 60px;" placeholder="Catatan bukti pemecahan bug (contoh: Mampu menelusuri kenapa sprite bergerak terbalik dan memperbaiki nilai koordinatnya)...">${escapeHtml(competencies.debugging?.evidence || '')}</textarea>
                  </div>
                </div>

                <!-- Comp 4: Communication -->
                <div class="competency-eval-card ${competencies.communication?.evaluated ? 'is-active' : ''}">
                  <div class="competency-eval-header">
                    <label class="competency-eval-checkbox-label">
                      <input type="checkbox" id="comp-check-comm" data-comp-key="communication" ${competencies.communication?.evaluated ? 'checked' : ''} />
                      <span>4. Komunikasi &amp; Menjelaskan Hasil Karya</span>
                    </label>
                    <select id="comp-level-comm" class="session-select" style="padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs);">
                      <option value="Emerging" ${competencies.communication?.level === 'Emerging' ? 'selected' : ''}>Berkembang (Emerging)</option>
                      <option value="Competent" ${(!competencies.communication?.level || competencies.communication?.level === 'Competent') ? 'selected' : ''}>Cakap (Competent)</option>
                      <option value="Proficient" ${competencies.communication?.level === 'Proficient' ? 'selected' : ''}>Mahir (Proficient)</option>
                    </select>
                  </div>
                  <div class="competency-eval-body">
                    <textarea id="comp-evidence-comm" class="session-textarea" style="min-height: 60px;" placeholder="Catatan bukti komunikasi (contoh: Menjelaskan alur gamenya dengan percaya diri di hadapan teman dan tutor)...">${escapeHtml(competencies.communication?.evidence || '')}</textarea>
                  </div>
                </div>

                <!-- Comp 5: Persistence -->
                <div class="competency-eval-card ${competencies.persistence?.evaluated ? 'is-active' : ''}">
                  <div class="competency-eval-header">
                    <label class="competency-eval-checkbox-label">
                      <input type="checkbox" id="comp-check-persist" data-comp-key="persistence" ${competencies.persistence?.evaluated ? 'checked' : ''} />
                      <span>5. Kemandirian &amp; Kegigihan (Persistence)</span>
                    </label>
                    <select id="comp-level-persist" class="session-select" style="padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs);">
                      <option value="Emerging" ${competencies.persistence?.level === 'Emerging' ? 'selected' : ''}>Berkembang (Emerging)</option>
                      <option value="Competent" ${(!competencies.persistence?.level || competencies.persistence?.level === 'Competent') ? 'selected' : ''}>Cakap (Competent)</option>
                      <option value="Proficient" ${competencies.persistence?.level === 'Proficient' ? 'selected' : ''}>Mahir (Proficient)</option>
                    </select>
                  </div>
                  <div class="competency-eval-body">
                    <textarea id="comp-evidence-persist" class="session-textarea" style="min-height: 60px;" placeholder="Catatan bukti kegigihan (contoh: Tidak mudah menyerah saat kodenya gagal, mencoba 3 alternatif blok sampai berhasil)...">${escapeHtml(competencies.persistence?.evidence || '')}</textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- TOMBOL AKSI FORM -->
            <div class="session-form-actions">
              <button type="button" class="btn btn-ghost" id="btn-cancel-report">
                Batal
              </button>
              <button type="button" class="btn btn-secondary" id="btn-save-report-draft">
                💾 Simpan sebagai Draf
              </button>
              <button type="button" class="btn btn-primary" id="btn-submit-report">
                🚀 Kirim Laporan ke Parent Hub
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Attach interactive listeners
   */
  attachEventListeners() {
    // Tab switching
    const tabButtons = this.container.querySelectorAll('[data-teacher-tab]');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-teacher-tab');
        if (targetTab && targetTab !== this.activeTab) {
          this.activeTab = targetTab;
          this.render();
        }
      });
    });

    // "Buka Antrean Lengkap" shortcut button
    const viewAllBtn = this.container.querySelector('[data-action="view-all-submissions"]');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.activeTab = 'submissions';
        this.render();
      });
    }

    // Review Submission buttons
    const reviewButtons = this.container.querySelectorAll('[data-open-review]');
    reviewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const subId = btn.getAttribute('data-open-review');
        this.openReviewDrawer(subId);
      });
    });

    // Operational schedule attendance and tutor cancellation.
    this.bindClassScheduleEvents();
    this.bindMonthlyEvaluationEvents();

    // Phase 3: Bind session report events
    this.bindSessionReportEvents();
  }

  getMonthlyEvaluationCount() {
    return this.monthlyEvaluations.length;
  }

  renderMonthlyEvaluationsTab() {
    if (this.isCreatingMonthlyEvaluation) return this.renderMonthlyEvaluationForm();
    const evaluations = this.monthlyEvaluations;
    return `<section style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="card" style="padding:var(--space-4);display:flex;justify-content:space-between;gap:var(--space-3);align-items:center;flex-wrap:wrap;">
        <div><h3 style="margin:0 0 var(--space-1);">Evaluasi perkembangan bulanan</h3>
          <p style="margin:0;color:var(--color-text-muted);font-size:var(--font-size-sm);">Satu evaluasi per siswa setiap bulan. Hanya laporan yang dikirim terlihat di Parent Hub.</p></div>
        <button type="button" class="btn btn-primary" id="btn-create-monthly-evaluation">Buat evaluasi</button>
      </div>
      ${evaluations.length ? evaluations.map(item => {
        const student = this.students.find(entry => entry.id === item.studentId);
        return `<article class="card" data-tutor-monthly-evaluation="${escapeHtml(item.id)}" style="padding:var(--space-4);">
          <div style="display:flex;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;">
            <div><strong>${escapeHtml(student?.name || student?.displayName || item.studentName)}</strong>
              <div style="font-size:var(--font-size-sm);color:var(--color-text-muted);">${escapeHtml(item.period)} · ${item.status === 'published' ? 'Terkirim' : 'Draf'} · ${escapeHtml(item.rating || 'Belum dinilai')}</div></div>
            <button type="button" class="btn btn-secondary btn-sm" data-edit-monthly-evaluation="${escapeHtml(item.id)}">Edit evaluasi</button>
          </div><p>${escapeHtml(item.summary || 'Belum ada ringkasan.')}</p>
        </article>`;
      }).join('') : '<div class="card" style="padding:var(--space-5);">Belum ada evaluasi bulanan. Buat laporan untuk siswa yang Anda ajar.</div>'}
    </section>`;
  }

  renderMonthlyEvaluationForm() {
    const current = this.editingMonthlyEvaluation || {};
    const now = new Date();
    const period = current.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `<section class="card" style="padding:var(--space-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);">
        <h3 style="margin:0;">${current.id ? 'Perbarui' : 'Buat'} evaluasi bulanan</h3>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-cancel-monthly-evaluation">Kembali</button>
      </div>
      <form id="monthly-evaluation-form" style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-3);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--space-3);">
          <label>Siswa<select name="studentId" required style="width:100%;"><option value="">Pilih siswa</option>
            ${this.students.map(student => `<option value="${escapeHtml(student.id)}" ${student.id === current.studentId ? 'selected' : ''}>${escapeHtml(student.name || student.displayName)}</option>`).join('')}</select></label>
          <label>Periode bulan<input name="period" type="month" required value="${escapeHtml(period)}" style="width:100%;"></label>
          <label>Penilaian keseluruhan<select name="rating" required style="width:100%;"><option value="">Pilih penilaian</option>
            ${MonthlyEvaluationStore.ratings.map(rating => `<option value="${escapeHtml(rating)}" ${current.rating === rating ? 'selected' : ''}>${escapeHtml(rating)}</option>`).join('')}</select></label>
        </div>
        <label>Ringkasan perkembangan<textarea name="summary" rows="3" required maxlength="1500" style="width:100%;">${escapeHtml(current.summary || '')}</textarea></label>
        <label>Hal yang sudah dikuasai<textarea name="strengths" rows="3" required maxlength="1200" style="width:100%;">\${escapeHtml(current.strengths || '')}</textarea></label>
        <label>Target bulan berikutnya<textarea name="nextGoals" rows="3" required maxlength="1200" style="width:100%;">${escapeHtml(current.nextGoals || '')}</textarea></label>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" id="btn-save-monthly-draft">Simpan draf</button>
          <button type="submit" class="btn btn-primary">Kirim ke Parent Hub</button>
        </div>
      </form>
    </section>`;
  }

  bindMonthlyEvaluationEvents() {
    this.container.querySelector('#btn-create-monthly-evaluation')?.addEventListener('click', () => {
      this.isCreatingMonthlyEvaluation = true; this.editingMonthlyEvaluation = null; this.render();
    });
    this.container.querySelector('#btn-cancel-monthly-evaluation')?.addEventListener('click', () => {
      this.isCreatingMonthlyEvaluation = false; this.editingMonthlyEvaluation = null; this.render();
    });
    this.container.querySelectorAll('[data-edit-monthly-evaluation]').forEach(button => {
      button.addEventListener('click', () => {
        this.editingMonthlyEvaluation = this.monthlyEvaluations
          .find(item => item.id === button.getAttribute('data-edit-monthly-evaluation')) || null;
        if (this.editingMonthlyEvaluation) { this.isCreatingMonthlyEvaluation = true; this.render(); }
      });
    });
    const form = this.container.querySelector('#monthly-evaluation-form');
    if (!form) return;
    const save = async (status, button = null) => {
      if (button) button.disabled = true;
      const data = Object.fromEntries(new FormData(form).entries());
      const student = this.students.find(item => item.id === data.studentId);
      try {
        const result = await MonthlyEvaluationRepository.save({
          ...data, studentName: student?.name || student?.displayName || 'Siswa',
          tutorId: this.user.id, tutorName: this.user.displayName
        }, status);
        if (!result.success) {
          showToast({ title: 'Evaluasi belum tersimpan', message: result.message, type: 'error' });
          return;
        }
        showToast({ title: status === 'published' ? 'Evaluasi terkirim' : 'Draf tersimpan',
          message: status === 'published' ? 'Evaluasi sekarang terlihat di Parent Hub siswa.' : 'Draf hanya terlihat oleh tutor.', type: 'success' });
        this.isCreatingMonthlyEvaluation = false; this.editingMonthlyEvaluation = null; this.render();
      } catch (error) {
        showToast({ title: 'Evaluasi belum tersimpan', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan evaluasi.', type: 'error' });
      } finally {
        if (button && button.isConnected) button.disabled = false;
      }
    };
    const draftButton = this.container.querySelector('#btn-save-monthly-draft');
    draftButton?.addEventListener('click', () => save('draft', draftButton));
    form.addEventListener('submit', event => { event.preventDefault(); save('published', form.querySelector('button[type="submit"]')); });
  }

  bindClassScheduleEvents() {
    this.container.querySelectorAll('[data-record-attendance]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await ClassSessionRepository.recordAttendance(
            button.getAttribute('data-session-id'),
            button.getAttribute('data-record-attendance'),
            this.user
          );
          if (!result.success) {
            showToast({ title: 'Kehadiran gagal dicatat', message: result.message, type: 'error' });
          } else {
            showToast({ title: 'Kehadiran tersimpan', message: 'Status sesi diperbarui dan digunakan sebagai dasar tagihan.', type: 'success' });
            this.render();
          }
        } catch (error) {
          showToast({
            title: 'Kehadiran gagal dicatat',
            message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan kehadiran.',
            type: 'error'
          });
        } finally {
          button.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-tutor-cancel-form]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const reason = String(new FormData(form).get('reason') || '').trim();
        try {
          const result = await ClassSessionRepository.cancelSession(
            form.getAttribute('data-tutor-cancel-form'),
            this.user,
            reason
          );
          if (!result.success) {
            showToast({ title: 'Pembatalan gagal', message: result.message, type: 'error' });
          } else {
            showToast({ title: 'Kelas dibatalkan', message: 'Alasan tersimpan. Admin perlu menjadwalkan sesi pengganti.', type: 'success' });
            this.render();
          }
        } catch (error) {
          showToast({
            title: 'Pembatalan gagal',
            message: error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan kelas.',
            type: 'error'
          });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    });
  }

  /**
   * Phase 3: Bind interactive events for Tutor Session Reporting
   */
  bindSessionReportEvents() {
    // 1. Open create new report
    const btnCreate = this.container.querySelector('#btn-open-create-report');
    const btnCreateEmpty = this.container.querySelector('#btn-open-create-report-empty');
    const handleOpenCreate = () => {
      this.isCreatingReport = true;
      this.editingReport = null;
      this.render();
      const formEl = this.container.querySelector('#tutor-session-report-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    if (btnCreate) btnCreate.addEventListener('click', handleOpenCreate);
    if (btnCreateEmpty) btnCreateEmpty.addEventListener('click', handleOpenCreate);

    // 2. Cancel create/edit report
    const btnCancel = this.container.querySelector('#btn-cancel-report');
    const btnCancelTop = this.container.querySelector('#btn-cancel-report-top');
    const handleCancel = () => {
      this.isCreatingReport = false;
      this.editingReport = null;
      this.render();
    };
    if (btnCancel) btnCancel.addEventListener('click', handleCancel);
    if (btnCancelTop) btnCancelTop.addEventListener('click', handleCancel);

    // 3. Filter reports
    const filterButtons = this.container.querySelectorAll('[data-filter-reports]');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filterVal = btn.getAttribute('data-filter-reports');
        if (filterVal) {
          this.reportsFilter = filterVal;
          this.render();
        }
      });
    });

    // 4. Edit report (either draft or update submitted)
    const editButtons = this.container.querySelectorAll('[data-action="edit-report"]');
    editButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const reportId = btn.getAttribute('data-report-id');
        const report = this.tutorReports.find((item) => item.id === reportId);
        if (report) {
          this.editingReport = report;
          this.isCreatingReport = true;
          this.render();
          const formEl = this.container.querySelector('#tutor-session-report-form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // 5. Delete draft
    const deleteButtons = this.container.querySelectorAll('[data-action="delete-draft"]');
    deleteButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const success = await SessionReportRepository.deleteDraft(btn.getAttribute('data-report-id'));
          if (success) {
            showToast({ title: 'Draf Dihapus', message: 'Draf laporan sesi berhasil dihapus.', type: 'info', duration: 3000 });
            this.render();
          } else {
            showToast({ title: 'Gagal Menghapus', message: 'Laporan yang sudah terkirim tidak dapat dihapus.', type: 'warning', duration: 3500 });
          }
        } catch (error) {
          showToast({ title: 'Gagal Menghapus', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus draf.', type: 'error' });
        } finally {
          if (btn.isConnected) btn.disabled = false;
        }
      });
    });

    // 6. Interactive competency checkboxes (toggle card active class)
    const compCheckboxes = this.container.querySelectorAll('.competency-eval-checkbox-label input[type="checkbox"]');
    compCheckboxes.forEach((chk) => {
      chk.addEventListener('change', () => {
        const card = chk.closest('.competency-eval-card');
        if (card) {
          card.classList.toggle('is-active', chk.checked);
        }
      });
    });

    // Helper to gather form payload
    const getFormData = () => {
      const studentSelect = this.container.querySelector('#report-student-select');
      const dateInput = this.container.querySelector('#report-date-input');
      const sessionNumberInput = this.container.querySelector('#report-session-number');
      const moduleInput = this.container.querySelector('#report-module-input');
      const topicInput = this.container.querySelector('#report-topic-input');
      const activitiesInput = this.container.querySelector('#report-activities-input');
      const achievementsInput = this.container.querySelector('#report-achievements-input');
      const difficultiesInput = this.container.querySelector('#report-difficulties-input');
      const solutionsInput = this.container.querySelector('#report-solutions-input');
      const recommendationsInput = this.container.querySelector('#report-recommendations-input');

      const studentId = studentSelect ? studentSelect.value : '';
      const studentObj = this.students.find((s) => s.id === studentId) || {
        id: studentId || 'usr_stu_001',
        name: studentSelect?.selectedOptions?.[0]?.text?.split('•')?.[0]?.trim() || 'Alex Pratama',
        avatar: 'AP',
        gradeLevel: 'Grade 5'
      };

      const compKeys = [
        { key: 'algorithmic_logic', check: '#comp-check-logic', level: '#comp-level-logic', evidence: '#comp-evidence-logic' },
        { key: 'project_remixing', check: '#comp-check-remix', level: '#comp-level-remix', evidence: '#comp-evidence-remix' },
        { key: 'debugging', check: '#comp-check-debug', level: '#comp-level-debug', evidence: '#comp-evidence-debug' },
        { key: 'communication', check: '#comp-check-comm', level: '#comp-level-comm', evidence: '#comp-evidence-comm' },
        { key: 'persistence', check: '#comp-check-persist', level: '#comp-level-persist', evidence: '#comp-evidence-persist' }
      ];

      const competencies = {};
      compKeys.forEach(({ key, check, level, evidence }) => {
        const isChecked = this.container.querySelector(check)?.checked || false;
        competencies[key] = {
          evaluated: isChecked,
          level: this.container.querySelector(level)?.value || 'Competent',
          evidence: this.container.querySelector(evidence)?.value?.trim() || ''
        };
      });

      return {
        studentId,
        studentName: studentObj.name,
        studentAvatar: studentObj.avatar || 'S',
        studentGrade: studentObj.gradeLevel || 'Grade 5',
        tutorId: this.user?.id || 'usr_tea_001',
        tutorName: this.user?.displayName || 'Kak Sarah',
        sessionDate: dateInput?.value || '',
        sessionNumber: sessionNumberInput?.value ? parseInt(sessionNumberInput.value, 10) : null,
        moduleName: moduleInput?.value?.trim() || 'Scratch Starter Adventure',
        topic: topicInput?.value?.trim() || '',
        activities: activitiesInput?.value?.trim() || '',
        achievements: achievementsInput?.value?.trim() || '',
        difficulties: difficultiesInput?.value?.trim() || '',
        solutions: solutionsInput?.value?.trim() || '',
        parentRecommendations: recommendationsInput?.value?.trim() || '',
        competencies
      };
    };

    // 7. Save Draft
    const btnSaveDraft = this.container.querySelector('#btn-save-report-draft');
    if (btnSaveDraft) {
      btnSaveDraft.addEventListener('click', async () => {
        btnSaveDraft.disabled = true;
        const formData = getFormData();
        if (this.editingReport) {
          formData.id = this.editingReport.id;
        }
        const expectedVersion = this.editingReport && typeof this.editingReport.version === 'number'
          ? this.editingReport.version
          : null;

        try {
        const result = await SessionReportRepository.saveReport(formData, 'draft', expectedVersion);

        if (result.error) {
          showToast({
            title: result.error === 'STALE_UPDATE_CONFLICT' ? 'Konflik Versi Data! ⚠️' : 'Gagal Menyimpan Draf ⚠️',
            message: result.message || 'Terjadi kesalahan saat menyimpan draf.',
            type: 'error',
            duration: 4000
          });
          if (result.error === 'STALE_UPDATE_CONFLICT' && formData.id) {
            this.editingReport = await SessionReportRepository.getReportById(formData.id);
            this.render();
          }
          return;
        }

        showToast({
          title: 'Draf Disimpan 💾',
          message: 'Laporan sesi disimpan sebagai draf. Belum terlihat oleh orang tua.',
          type: 'success',
          duration: 3500
        });

        this.isCreatingReport = false;
        this.editingReport = null;
        this.render();
        } catch (error) {
          showToast({ title: 'Gagal Menyimpan Draf ⚠️', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan draf.', type: 'error' });
        } finally {
          if (btnSaveDraft.isConnected) btnSaveDraft.disabled = false;
        }
      });
    }

    // 8. Submit Report to Parent Hub
    const btnSubmit = this.container.querySelector('#btn-submit-report');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        const formData = getFormData();

        // Client-side validation for required fields
        if (!formData.studentId) {
          showToast({ title: 'Pilih Siswa', message: 'Harap pilih siswa sebelum mengirim laporan.', type: 'warning' });
          this.container.querySelector('#report-student-select')?.focus();
          return;
        }
        if (!formData.sessionDate) {
          showToast({ title: 'Isi Tanggal Sesi', message: 'Tanggal sesi wajib diisi.', type: 'warning' });
          this.container.querySelector('#report-date-input')?.focus();
          return;
        }
        if (!formData.topic) {
          showToast({ title: 'Isi Topik Materi', message: 'Topik pembelajaran sesi wajib diisi.', type: 'warning' });
          this.container.querySelector('#report-topic-input')?.focus();
          return;
        }
        if (!formData.activities) {
          showToast({ title: 'Isi Aktivitas', message: 'Uraian aktivitas sesi wajib diisi.', type: 'warning' });
          this.container.querySelector('#report-activities-input')?.focus();
          return;
        }
        if (!formData.achievements) {
          showToast({ title: 'Isi Pencapaian', message: 'Uraian pencapaian ananda wajib diisi.', type: 'warning' });
          this.container.querySelector('#report-achievements-input')?.focus();
          return;
        }

        btnSubmit.disabled = true;
        if (this.editingReport) {
          formData.id = this.editingReport.id;
        }
        const expectedVersion = this.editingReport && typeof this.editingReport.version === 'number'
          ? this.editingReport.version
          : null;

        try {
        const result = await SessionReportRepository.saveReport(formData, 'submitted', expectedVersion);

        if (result.error) {
          showToast({
            title: result.error === 'STALE_UPDATE_CONFLICT' ? 'Konflik Versi Data! ⚠️' : 'Gagal Mengirim Laporan ⚠️',
            message: result.message || 'Terjadi kesalahan saat memproses laporan.',
            type: 'error',
            duration: 4000
          });
          if (result.error === 'STALE_UPDATE_CONFLICT' && formData.id) {
            this.editingReport = await SessionReportRepository.getReportById(formData.id);
            this.render();
          }
          return;
        }

        showToast({
          title: 'Laporan Sesi Berhasil Dikirim! 🎉',
          message: `Laporan untuk ${formData.studentName} kini terbit dan dapat dibaca di Parent Hub.`,
          type: 'success',
          duration: 4000
        });

        this.isCreatingReport = false;
        this.editingReport = null;
        this.render();
        } catch (error) {
          showToast({ title: 'Gagal Mengirim Laporan ⚠️', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim laporan.', type: 'error' });
        } finally {
          if (btnSubmit.isConnected) btnSubmit.disabled = false;
        }
      });
    }
  }

  /**
   * Open contextual drawer for reviewing a submission
   * @param {string} submissionId
   */
  openReviewDrawer(submissionId) {
    const sub = this.submissions.find((s) => s.id === submissionId);
    if (!sub) return;

    this.selectedSubmission = sub;

    // Populate drawer elements in DOM
    const drawerTitle = document.getElementById('drawer-sample-title');
    const drawerLink = document.getElementById('drawer-project-link');
    const drawerNotes = document.getElementById('drawer-student-notes');
    const drawerQuiz = document.getElementById('drawer-quiz-score');
    const drawerCheckpoints = document.getElementById('drawer-checkpoints-info');
    const drawerFeedback = document.getElementById('teacher-feedback-input');

    if (drawerTitle) {
      drawerTitle.innerHTML = `${sub.studentName} &bull; ${sub.studentGrade}`;
    }

    if (drawerLink) {
      drawerLink.href = sub.projectUrl;
      drawerLink.textContent = `${sub.projectUrl} ↗`;
    }

    if (drawerNotes) {
      drawerNotes.textContent = sub.studentNotes || 'Tidak ada catatan siswa.';
    }

    if (drawerQuiz) {
      drawerQuiz.textContent = sub.quizScore || '-';
    }

    if (drawerCheckpoints) {
      drawerCheckpoints.textContent = `${sub.checkpointsPassed} dari ${sub.checkpointsTotal} Checkpoint Praktik Terpenuhi`;
    }

    if (drawerFeedback) {
      drawerFeedback.value = sub.teacherFeedback || '';
    }

    // Open drawer (Drawer component saves trigger element and preserves scroll position)
    Drawer.open('sample-drawer');
  }

  /**
   * Bind global drawer confirmation buttons
   * Phase 3.3 — Active Submission Review Workflow
   */
  bindDrawerActions() {
    const btnApprove = document.getElementById('btn-drawer-approve');
    const btnRevision = document.getElementById('btn-drawer-revision');

    if (btnApprove && !btnApprove._hasTeacherWorkspaceListener) {
      btnApprove._hasTeacherWorkspaceListener = true;
      btnApprove.addEventListener('click', async () => {
        if (!this.selectedSubmission) return;

        const sub = this.selectedSubmission;
        const feedbackInput = document.getElementById('teacher-feedback-input');
        const feedbackText = feedbackInput ? feedbackInput.value.trim() : '';

        // Update status in unified StateStore with mandatory version check
        const expectedVersion = typeof sub.version === 'number' ? sub.version : 1;
        const result = await LearningStateRepository.updateSubmissionStatus(sub.id, 'approved', {
          reviewerId: 'usr_tea_001',
          reviewerName: 'Kak Sarah',
          teacherFeedback: feedbackText
        }, expectedVersion);

        if (result && result.error) {
          showToast({
            title: result.error === 'STALE_UPDATE_CONFLICT' ? 'Konflik Versi Data! ⚠️' : 'Gagal Menyimpan Evaluasi ⚠️',
            message: result.message || 'Submission telah diperbarui di sesi lain. Menampilkan data terbaru.',
            type: 'error',
            duration: 5000
          });
          // Refresh data and reopen with latest version
          await this.handleExternalStoreUpdate();
          const latest = this.submissions.find((s) => s.id === sub.id);
          if (latest) {
            this.openReviewDrawer(latest);
          }
          return;
        }

        Drawer.close('sample-drawer');

        showToast({
          title: 'Proyek Disetujui! 🎉',
          message: `Proyek ${sub.studentName} berhasil disetujui. Status diperbarui ke Approved.`,
          type: 'success',
          duration: 3500
        });

        // Refresh submissions from store and re-render dashboard
        await this.handleExternalStoreUpdate();
        this.render();
        this.restoreFocusAfterReview();
      });
    }

    if (btnRevision && !btnRevision._hasTeacherWorkspaceListener) {
      btnRevision._hasTeacherWorkspaceListener = true;
      btnRevision.addEventListener('click', async () => {
        if (!this.selectedSubmission) return;

        const sub = this.selectedSubmission;
        const feedbackInput = document.getElementById('teacher-feedback-input');
        const feedbackText = feedbackInput ? feedbackInput.value.trim() : '';

        if (!feedbackText) {
          showToast({
            title: 'Catatan Diperlukan',
            message: 'Tuliskan catatan atau instruksi revisi untuk siswa sebelum meminta revisi.',
            type: 'warning',
            duration: 3500
          });
          if (feedbackInput) feedbackInput.focus();
          return;
        }

        // Update status in unified StateStore with mandatory version check
        const expectedVersion = typeof sub.version === 'number' ? sub.version : 1;
        const result = await LearningStateRepository.updateSubmissionStatus(sub.id, 'revision-required', {
          reviewerId: 'usr_tea_001',
          reviewerName: 'Kak Sarah',
          teacherFeedback: feedbackText
        }, expectedVersion);

        if (result && result.error) {
          showToast({
            title: result.error === 'STALE_UPDATE_CONFLICT' ? 'Konflik Versi Data! ⚠️' : 'Gagal Menyimpan Evaluasi ⚠️',
            message: result.message || 'Submission telah diperbarui di sesi lain. Menampilkan data terbaru.',
            type: 'error',
            duration: 5000
          });
          // Refresh data and reopen with latest version
          await this.handleExternalStoreUpdate();
          const latest = this.submissions.find((s) => s.id === sub.id);
          if (latest) {
            this.openReviewDrawer(latest);
          }
          return;
        }

        Drawer.close('sample-drawer');

        showToast({
          title: 'Revisi Diminta ⚠️',
          message: `Catatan revisi dikirimkan ke ${sub.studentName}. Status berubah ke Revision Required.`,
          type: 'warning',
          duration: 4000
        });

        // Refresh submissions from store and re-render dashboard
        await this.handleExternalStoreUpdate();
        this.render();
        this.restoreFocusAfterReview();
      });
    }
  }

  /**
   * Phase 1 Cleanup A1: Safe focus restoration when trigger row is removed from DOM
   */
  restoreFocusAfterReview() {
    requestAnimationFrame(() => {
      // If focus reverted to document.body or detached element, restore to queue item or heading
      if (!document.activeElement || document.activeElement === document.body || !document.body.contains(document.activeElement)) {
        const nextReviewBtn = document.querySelector('.queue-table [data-open-review]');
        const queueHeading = document.getElementById('queue-heading') || document.querySelector('.queue-title');
        const fallbackTarget = nextReviewBtn || queueHeading || document.getElementById('page-heading') || document.querySelector('h1, h2');
        if (fallbackTarget && typeof fallbackTarget.focus === 'function') {
          if (!fallbackTarget.hasAttribute('tabindex') && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(fallbackTarget.tagName)) {
            fallbackTarget.setAttribute('tabindex', '-1');
          }
          fallbackTarget.focus({ preventScroll: true });
        }
      }
    });
  }
  /**
   * Release subscriptions and close transient UI when the React workspace unmounts.
   */
  destroy() {
    this.destroyed = true;
    if (typeof this._unsubscribeStore === "function") this._unsubscribeStore();
    if (typeof this._unsubscribeSessionStore === "function") this._unsubscribeSessionStore();
    if (typeof this._unsubscribeClassSessionStore === "function") this._unsubscribeClassSessionStore();
    if (typeof this._unsubscribeMonthlyEvaluationStore === "function") this._unsubscribeMonthlyEvaluationStore();
    this._unsubscribeStore = null;
    this._unsubscribeSessionStore = null;
    this._unsubscribeClassSessionStore = null;
    this._unsubscribeMonthlyEvaluationStore = null;
    Drawer.close("sample-drawer");
    if (this.container) this.container.replaceChildren();
  }

}

function formatTutorSessionDate(value) {
  if (!value) return 'Waktu tidak diketahui';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
