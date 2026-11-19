/**
 * B2B LEARNING ENGINE - LESSON WORKSPACE & STUDENT CONTROLLER
 * Controls the Student Dashboard, Peta Petualangan, and 6-stage continuous Lesson Workspace.
 * Adheres strictly to Section 4, 5, 6, 7, 8, 9, 14 of PROJECT_RULES.md.
 */

import { renderContentBlocks, renderQuiz, attachInteractions } from './content-renderer.js';
import { showToast } from './components/toast.js';
import { LearningStateRepository } from './services/workspace-repositories.js';
import { ParentHubView } from './student/parent-hub.js';
import {
  SVG_MASCOT,
  SVG_ISLAND_SCRATCH, SVG_ISLAND_ROBLOX, SVG_ISLAND_PYTHON, SVG_ISLAND_GAMEDEV,
  SVG_ICON_SCRATCH_CAT, SVG_ICON_LOCK, SVG_ICON_CHEST,
  SVG_ICON_STAR, SVG_ICON_TROPHY, SVG_ICON_STREAK,
  SVG_ICON_TARGET, SVG_ICON_BADGE_SHIELD, SVG_ICON_CHECK,
  SVG_QUEST_MAP_BG,
  // GAS low-poly island assets (260×260 isometric hex)
  SVG_GAS_ISLAND_SCRATCH_FOREST,
  SVG_GAS_ISLAND_LOGIC_MAZE,
  SVG_GAS_ISLAND_CREATIVE_CODING,
  SVG_GAS_ISLAND_APP_DEVELOPMENT,
  SVG_GAS_ISLAND_PYTHON_ICE_KINGDOM,
  SVG_GAS_ISLAND_WEB_HARBOR,
  SVG_GAS_ISLAND_ROBLOX_OBBY
} from './illustrations.js';

export class LessonWorkspace {
  /**
   * @param {HTMLElement} container - The container element (#view-student)
   * @param {Object} lessonData - Parsed lesson JSON
   * @param {Object} [currentUser=null] - Student user object
   */
  constructor(container, lessonData, currentUser = null) {
    this.container = container;
    this.lesson = lessonData;
    this.stages = lessonData.stages || [];
    this.currentUser = currentUser || { id: 'usr_stu_001', name: 'Alex Pratama', avatar: 'AP' };

    // Current State
    this.currentScreen = 'dashboard'; // 'dashboard' | 'workspace'
    this.currentStageIndex = 0;
    this.destroyed = false;

    // Initialize with defaults; init() loads student-scoped progress from its repository.
    const saved = this.loadProgress();
    this.progressState = saved.state;
    this.checkpointStates = saved.checkpoints || {};
    this.submissionData = saved.submission || null;
    this.currentSlideIndex = typeof saved.slideIndex === 'number' ? saved.slideIndex : 0;
    this.visitedSlides = new Set([0, this.currentSlideIndex]);

    this.activeStoreSubmission = null;
  }

  async init() {
    // Read only progress already scoped to this student and lesson. The legacy
    // global key is intentionally not imported because its owner is unknown.
    this._lessonProgress = await LearningStateRepository.getLessonProgress(this.currentUser.id, this.lesson.id);
    if (this.destroyed) return;
    const savedProgress = this.loadProgress();
    this.progressState = savedProgress.state;
    this.checkpointStates = savedProgress.checkpoints || {};
    this.submissionData = savedProgress.submission || null;
    this.currentSlideIndex = typeof savedProgress.slideIndex === 'number' ? savedProgress.slideIndex : 0;
    this.visitedSlides = new Set([0, this.currentSlideIndex]);
    const activeSub = await LearningStateRepository.getStudentLessonSubmission(this.currentUser.id, this.lesson.id);
    if (this.destroyed) return;
    this.activeStoreSubmission = activeSub || null;
    if (activeSub && ['approved', 'revision-required', 'submitted'].includes(activeSub.status)) {
      this.progressState = activeSub.status;
      this.saveProgress({ state: this.progressState });
    }
    this.render();
    this.bindKeyboardNav();
    if (!this._unsubscribeStore) {
      this._unsubscribeStore = LearningStateRepository.subscribe(() => {
        void this.handleExternalStoreUpdate();
      });
    }
    console.log(`📘 Student Experience initialized: "${this.lesson.title}" (Status: ${this.progressState})`);
  }

  /**
   * Reactive update handler for external store changes (e.g. Teacher approves/requests revision in another tab)
   */
  async handleExternalStoreUpdate() {
    if (this.destroyed) return;
    const [activeSub, savedProgress] = await Promise.all([
      LearningStateRepository.getStudentLessonSubmission(this.currentUser.id, this.lesson.id),
      LearningStateRepository.getLessonProgress(this.currentUser.id, this.lesson.id)
    ]);
    if (this.destroyed) return;

    let changed = false;
    const currentVersion = Number(this._lessonProgress?.version) || 0;
    if (savedProgress && (Number(savedProgress.version) || 0) > currentVersion) {
      this._lessonProgress = savedProgress;
      const progress = this.loadProgress();
      this.progressState = progress.state;
      this.checkpointStates = progress.checkpoints || {};
      this.submissionData = progress.submission || null;
      this.currentSlideIndex = progress.slideIndex;
      this.visitedSlides = new Set([0, this.currentSlideIndex]);
      changed = true;
    }

    if (activeSub) {
      if (activeSub.version !== this.activeStoreSubmission?.version) changed = true;
      this.activeStoreSubmission = activeSub;
      const nextState = ['approved', 'revision-required', 'submitted'].includes(activeSub.status)
        ? activeSub.status
        : null;
      if (nextState && this.progressState !== nextState) {
        this.progressState = nextState;
        this.saveProgress({ state: nextState });
        changed = true;
      }
    }
    if (!changed) return;

    // Re-render appropriate view
    if (this.currentScreen === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentScreen === 'parent-hub') {
      if (this.parentHubView) this.parentHubView.handleStoreChange();
    } else {
      this.renderStageContent();
      const badgeEl = this.container.querySelector('.workspace-top-bar .badge');
      if (badgeEl) {
        const badgeClass = this.progressState === 'approved'
          ? 'badge-approved'
          : (this.progressState === 'revision-required' ? 'badge-revision-required' : 'badge-submitted');
        badgeEl.className = `badge ${badgeClass}`;
        badgeEl.textContent = `Status: ${this.formatProgressState(this.progressState)}`;
      }
    }
  }

  bindKeyboardNav() {
    this._keyboardNavHandler = (e) => {
      if (this.currentScreen !== 'workspace') return;
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const stage = this.stages[this.currentStageIndex];
      if (!stage || stage.id !== 'materials') return;
      if (e.key === 'ArrowRight' && this.currentSlideIndex < (stage.slides || []).length - 1) {
        this.goToSlide(this.currentSlideIndex + 1);
      } else if (e.key === 'ArrowLeft' && this.currentSlideIndex > 0) {
        this.goToSlide(this.currentSlideIndex - 1);
      }
    };
    document.addEventListener('keydown', this._keyboardNavHandler);
  }

  destroy() {
    this.destroyed = true;
    if (this._keyboardNavHandler) {
      document.removeEventListener('keydown', this._keyboardNavHandler);
      this._keyboardNavHandler = null;
    }
    if (this._unsubscribeStore) {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
    if (this.parentHubView) {
      this.parentHubView.destroy();
      this.parentHubView = null;
    }
  }

  loadProgress() {
    const saved = this._lessonProgress || {};
    return {
      state: saved.state || 'in-progress',
      checkpoints: saved.checkpoints || {},
      submission: saved.submissionDraft || null,
      slideIndex: Number.isInteger(saved.slideIndex) ? saved.slideIndex : 0
    };
  }

  saveProgress(updates = {}) {
    if (typeof updates === 'string') updates = { state: updates };
    const current = this.loadProgress();
    const merged = { ...current, ...updates };
    this.progressState = merged.state;
    this.checkpointStates = merged.checkpoints || {};
    this.submissionData = merged.submission || null;

    const progressUpdates = {
      state: merged.state,
      checkpoints: merged.checkpoints || {},
      submissionDraft: merged.submission || null,
      slideIndex: Number.isInteger(merged.slideIndex) ? merged.slideIndex : 0,
      topicId: this.lesson.topicId ?? null
    };
    this._lessonProgress = {
      ...(this._lessonProgress || {}),
      ...progressUpdates,
      studentId: this.currentUser.id,
      lessonKey: this.lesson.id,
      version: (Number(this._lessonProgress?.version) || 0) + 1
    };
    void LearningStateRepository.saveLessonProgress(
      this.currentUser.id,
      this.lesson.id,
      progressUpdates
    ).catch(error => {
      console.error('LessonWorkspace: progres gagal disimpan.', error);
      showToast({
        title: 'Progres belum tersimpan',
        message: 'Periksa koneksi penyimpanan lalu coba lagi.',
        type: 'error'
      });
    });
  }

  isValidUrl(string) {
    if (!string || typeof string !== 'string') return false;
    try {
      const url = new URL(string.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  render() {
    if (this.currentScreen === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentScreen === 'parent-hub') {
      this.renderParentHub();
    } else {
      this.renderWorkspace();
    }
  }

  /**
   * Phase 2: Render Parent Hub View
   */
  renderParentHub() {
    if (!this.parentHubView) {
      this.parentHubView = new ParentHubView(this.container, this.currentUser, () => {
        this.parentHubView?.destroy();
        this.parentHubView = null;
        this.currentScreen = 'dashboard';
        this.render();
      });
      this.parentHubView.init();
    } else {
      this.parentHubView.container = this.container;
      this.parentHubView.render();
    }
  }

  /* ==========================================================================
     1. STUDENT DASHBOARD & QUEST MAP (Remembero + Bright RPG Adventure)
     ========================================================================== */
  renderDashboard() {
    const progressLabels = {
      'not-started':          { text: 'Belum dimulai',         badgeClass: 'badge-not-started',       pct: '0%' },
      'in-progress':          { text: 'Sedang berjalan',         badgeClass: 'badge-in-progress',        pct: '35%' },
      'practice-completed':   { text: 'Latihan selesai',  badgeClass: 'badge-practice-completed', pct: '75%' },
      'submitted':            { text: 'Sudah dikirim',           badgeClass: 'badge-submitted',          pct: '100%' },
      'revision-required':    { text: 'Perlu diperbaiki',   badgeClass: 'badge-revision-required',  pct: '85%' },
      'approved':             { text: 'Disetujui',            badgeClass: 'badge-approved',           pct: '100%' }
    };
    const cp = progressLabels[this.progressState] || progressLabels['in-progress'];

    this.container.innerHTML = `
      <div class="student-dashboard">

        <!-- ════════════════════════════════
             HERO PROFILE CARD
             ════════════════════════════════ -->
        <div class="dashboard-hero-card">
          <div class="hero-mascot-col" aria-hidden="true">
            <div class="hero-mascot-wrap">${SVG_MASCOT}</div>
          </div>
          <div class="hero-profile-info">
            <div class="hero-badge-row">
              <span class="badge badge-level">Level 3 • Jago Scratch</span>
              <span class="badge badge-scratch">Jalur: Scratch Starter</span>
            </div>
            <h2 class="hero-greeting-title">Halo, Alex! Siap Lanjut Berpetualang? 🚀</h2>
            <p class="hero-greeting-sub">Jelajahi kepulauan koding, kumpulkan bintang, dan kuasai logika pemrograman!</p>
            <div class="hero-xp-container">
              <div class="hero-xp-label">
                <span>Poin menuju level berikutnya: <strong>450 / 600 poin</strong></span>
                <span class="hero-xp-pct">75% → Level 4</span>
              </div>
              <div class="hero-xp-bar-bg" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
                <div class="hero-xp-bar-fill" style="width: 75%;"></div>
              </div>
            </div>
          </div>

          <!-- Stat Pills -->
          <div class="hero-stat-pills">
            <div class="stat-pill stat-pill--fire">
              <div class="stat-pill-icon" aria-hidden="true">${SVG_ICON_STREAK}</div>
              <div class="stat-pill-data">
                <span class="stat-pill-value">5 Hari</span>
                <span class="stat-pill-label">Hari belajar</span>
              </div>
            </div>
            <div class="stat-pill stat-pill--gold">
              <div class="stat-pill-icon" aria-hidden="true">${SVG_ICON_STAR}</div>
              <div class="stat-pill-data">
                <span class="stat-pill-value">450 poin</span>
                <span class="stat-pill-label">Total Poin</span>
              </div>
            </div>
            <div class="stat-pill stat-pill--red">
              <div class="stat-pill-icon" aria-hidden="true">${SVG_ICON_TARGET}</div>
              <div class="stat-pill-data">
                <span class="stat-pill-value">1 / 2</span>
                <span class="stat-pill-label">Target Harian</span>
              </div>
            </div>
            <div class="stat-pill stat-pill--purple">
              <div class="stat-pill-icon" aria-hidden="true">${SVG_ICON_TROPHY}</div>
              <div class="stat-pill-data">
                <span class="stat-pill-value">4 Dibuka</span>
                <span class="stat-pill-label">Lencana</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════
             MAIN CONTENT GRID
             ════════════════════════════════ -->
        <div class="dashboard-content-grid">

          <!-- LEFT: Active Mission + Realms -->
          <div class="dashboard-col-main">

            <!-- ACTIVE MISSION CARD -->
            <div class="active-mission-card">
              <div class="active-mission-header">
                <div class="active-mission-eyebrow">
                  <span class="badge badge-scratch">Misi Utama Aktif</span>
                  <span class="badge ${cp.badgeClass}">${cp.text}</span>
                </div>
                <span class="mission-duration-tag">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  ${this.lesson.estimatedDurationMinutes} Menit
                </span>
              </div>

              <div class="active-mission-body">
                <div class="active-mission-icon-box" aria-hidden="true">
                  <div class="active-mission-icon">${SVG_ICON_SCRATCH_CAT}</div>
                  <span class="icon-ring-pulse"></span>
                </div>
                <div class="active-mission-details">
                  <h3 class="active-mission-title">${escapeHtml(this.lesson.title)}</h3>
                  <p class="active-mission-desc">${escapeHtml(this.lesson.subtitle || this.lesson.description)}</p>
                  <div class="active-mission-meta">
                    <span class="meta-tag">Alat: Scratch 3.0 MIT</span>
                    <span class="meta-tag">Tingkat: Pemula</span>
                    <span class="meta-tag reward-tag">+50 poin</span>
                  </div>
                </div>
              </div>

              <div class="active-mission-footer">
                <div class="mission-progress-box">
                  <div class="mission-progress-text">
                    <span>Kelengkapan Misi</span>
                    <span>${cp.pct}</span>
                  </div>
                  <div class="progress-bar-bg" role="progressbar"
                       aria-valuenow="${cp.pct.replace('%', '')}" aria-valuemin="0" aria-valuemax="100">
                    <div class="progress-bar-fill" style="width: ${cp.pct};"></div>
                  </div>
                </div>
                <button type="button" class="btn btn-primary btn-enter-lesson" id="btn-enter-lesson">
                  Lanjutkan Misi →
                </button>
              </div>
            </div>

            <!-- REALM OVERVIEW: 7 GAS Islands -->
            <div class="realms-card">
              <div class="realms-header">
                <div>
                  <h4 class="realms-title">Kepulauan Koding</h4>
                  <p class="realms-sub">Jelajahi setiap pulau untuk menguasai teknologi baru.</p>
                </div>
                <span class="badge badge-scratch">7 Wilayah</span>
              </div>
              <div class="realms-grid realms-grid--gas">
                <div class="realm-item is-active" role="button" tabindex="0" aria-label="Scratch Forest — Modul Aktif">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_SCRATCH_FOREST}</div>
                  <div class="realm-info">
                    <h5>Scratch Forest</h5>
                    <p>Visual &amp; Blok Koding &bull; Modul Aktif</p>
                  </div>
                  <span class="badge badge-success">Aktif</span>
                </div>
                <div class="realm-item is-locked" aria-label="Logic Maze — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_LOGIC_MAZE}</div>
                  <div class="realm-info">
                    <h5>Logic Maze</h5>
                    <p>Logika &amp; Algoritma &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
                <div class="realm-item is-locked" aria-label="Creative Coding Realm — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_CREATIVE_CODING}</div>
                  <div class="realm-info">
                    <h5>Creative Coding</h5>
                    <p>Animasi &amp; Seni Digital &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
                <div class="realm-item is-locked" aria-label="App Development Island — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_APP_DEVELOPMENT}</div>
                  <div class="realm-info">
                    <h5>App Development</h5>
                    <p>Pembuatan Aplikasi &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
                <div class="realm-item is-locked" aria-label="Python Ice Kingdom — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_PYTHON_ICE_KINGDOM}</div>
                  <div class="realm-info">
                    <h5>Python Ice Kingdom</h5>
                    <p>Python &amp; Data &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
                <div class="realm-item is-locked" aria-label="Web Development Harbor — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_WEB_HARBOR}</div>
                  <div class="realm-info">
                    <h5>Web Harbor</h5>
                    <p>HTML, CSS &amp; JS &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
                <div class="realm-item is-locked" aria-label="Roblox Obby Fortress — Terkunci">
                  <div class="realm-island-art realm-island-art--gas" aria-hidden="true">${SVG_GAS_ISLAND_ROBLOX_OBBY}</div>
                  <div class="realm-info">
                    <h5>Roblox Obby</h5>
                    <p>3D &amp; Game Design &bull; Terkunci</p>
                  </div>
                  <span class="badge badge-not-started">Terkunci</span>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Daily Goals + Achievements -->
          <div class="dashboard-col-side">

            <!-- DAILY GOALS -->
            <div class="daily-goals-card">
              <div class="daily-goals-header">
                <div class="daily-icon-wrap" aria-hidden="true">${SVG_ICON_TARGET}</div>
                <div>
                  <h4 class="daily-title">Target Hari Ini</h4>
                  <span class="badge badge-xp">1 / 2 Selesai</span>
                </div>
              </div>
              <p class="daily-sub">Capai target harian untuk mempertahankan streak kodingmu!</p>
              <div class="daily-checklist">
                <div class="daily-task is-done">
                  <div class="task-check-icon" aria-hidden="true">${SVG_ICON_CHECK}</div>
                  <div class="task-info">
                    <span class="task-title">Buka 1 Materi Modul Koding</span>
                    <span class="task-xp">+20 poin didapatkan</span>
                  </div>
                </div>
                <div class="daily-task">
                  <div class="task-check-empty" aria-hidden="true"></div>
                  <div class="task-info">
                    <span class="task-title">Kirim 1 Tantangan Proyek</span>
                    <span class="task-xp">+50 poin saat dikirim</span>
                  </div>
                </div>
              </div>
              <div class="daily-footer">
                <small>Reset otomatis setiap tengah malam.</small>
              </div>
            </div>

            <!-- ACHIEVEMENTS -->
            <div class="achievements-card">
              <div class="achievements-header">
                <div class="achieve-icon-wrap" aria-hidden="true">${SVG_ICON_BADGE_SHIELD}</div>
                <div>
                  <h4 class="achieve-title">Lencana Petualang</h4>
                  <span class="badge badge-level">4 / 8</span>
                </div>
              </div>
              <div class="achievements-grid">
                <div class="achievement-badge-item" title="Langkah Pertama: Memulai modul pertama">
                  <div class="badge-icon-circle is-unlocked">${SVG_ICON_CHECK}</div>
                  <span class="badge-name">Langkah 1</span>
                </div>
                <div class="achievement-badge-item" title="Penjelajah Koordinat: Memahami sumbu X dan Y">
                  <div class="badge-icon-circle is-unlocked">${SVG_ICON_STAR}</div>
                  <span class="badge-name">Koordinat</span>
                </div>
                <div class="achievement-badge-item" title="Speed Coder: Menyelesaikan praktik tepat waktu">
                  <div class="badge-icon-circle is-unlocked">${SVG_ICON_TROPHY}</div>
                  <span class="badge-name">Speed Coder</span>
                </div>
                <div class="achievement-badge-item is-locked" title="Master Gerak: Kumpulkan proyek tantangan">
                  <div class="badge-icon-circle is-locked">${SVG_ICON_LOCK}</div>
                  <span class="badge-name">Master Gerak</span>
                </div>
              </div>
            </div>

            <!-- PARENT HUB: parent-facing area remains inside Student Workspace -->
            <section class="card parent-hub-entry-card" aria-labelledby="parent-hub-entry-title">
              <div class="achievements-header">
                <div class="achieve-icon-wrap" aria-hidden="true">💛</div>
                <div>
                  <h4 class="achieve-title" id="parent-hub-entry-title">Ruang Khusus Ayah/Bunda</h4>
                  <span class="badge badge-in-progress">Lihat laporan belajar</span>
                </div>
              </div>
              <p class="daily-sub">Lihat laporan pertemuan, perkembangan bulanan, dan riwayat tagihan belajar ananda.</p>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-open-parent-hub">Buka Ruang Ayah/Bunda →</button>
            </section>
          </div>
        </div>

        <!-- ════════════════════════════════
             BRIGHT RPG QUEST MAP
             ════════════════════════════════ -->
        <div class="quest-map-card">
          <div class="quest-map-header">
            <div>
              <div class="quest-map-eyebrow">
                <span class="badge badge-scratch">Peta Petualangan RPG</span>
                <span class="badge badge-xp">⭐ 7 / 12 Bintang</span>
              </div>
              <h3 class="quest-map-title">Peta Petualangan: Kepulauan Koding</h3>
              <p class="quest-map-sub">Jelajahi 7 pulau, selesaikan misi, dan buka wilayah baru!</p>
            </div>
            <span class="badge ${cp.badgeClass}">Status: ${cp.text}</span>
          </div>

          <!-- GAS Island Peta Petualangan — 7-island grid with status overlays -->
          <div class="gas-quest-map" aria-label="Peta kepulauan koding — 7 wilayah">

            <!-- Island 1: Scratch Forest — ACTIVE -->
            <div class="gas-island-cell is-active" data-island="scratch-forest">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_SCRATCH_FOREST}</div>
              <div class="gas-island-status gas-island-status--active">
                <span class="node-pulse-glow"></span>
                <span class="gas-island-badge badge badge-success">Aktif</span>
              </div>
              <div class="gas-island-label">
                <strong>Scratch Forest</strong>
                <span>Visual &amp; Blok Koding</span>
              </div>
            </div>

            <!-- Island 2: Logic Maze — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="logic-maze">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_LOGIC_MAZE}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>Logic Maze</strong>
                <span>Logika &amp; Algoritma</span>
              </div>
            </div>

            <!-- Island 3: Creative Coding — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="creative-coding">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_CREATIVE_CODING}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>Creative Coding</strong>
                <span>Animasi &amp; Seni Digital</span>
              </div>
            </div>

            <!-- Island 4: App Development — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="app-development">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_APP_DEVELOPMENT}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>App Development</strong>
                <span>Pembuatan Aplikasi</span>
              </div>
            </div>

            <!-- Island 5: Python Ice Kingdom — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="python-ice-kingdom">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_PYTHON_ICE_KINGDOM}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>Python Ice Kingdom</strong>
                <span>Python &amp; Data</span>
              </div>
            </div>

            <!-- Island 6: Web Harbor — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="web-harbor">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_WEB_HARBOR}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>Web Harbor</strong>
                <span>HTML, CSS &amp; JS</span>
              </div>
            </div>

            <!-- Island 7: Roblox Obby Fortress — LOCKED -->
            <div class="gas-island-cell is-locked" data-island="roblox-obby">
              <div class="gas-island-art" aria-hidden="true">${SVG_GAS_ISLAND_ROBLOX_OBBY}</div>
              <div class="gas-island-status gas-island-status--locked">
                <div class="gas-lock-icon" aria-label="Terkunci">${SVG_ICON_LOCK}</div>
              </div>
              <div class="gas-island-label">
                <strong>Roblox Obby</strong>
                <span>3D &amp; Game Design</span>
              </div>
            </div>

          </div>

          <!-- Quest Track List (detailed cards below map) -->
          <div class="quest-track-list">
            <!-- Node 1: Active -->
            <div class="quest-node is-active">
              <div class="quest-node-badge-tag">
                <span class="badge badge-scratch">Misi 1</span>
                <span class="badge ${cp.badgeClass}">${cp.text}</span>
              </div>
              <div class="quest-node-left">
                <div class="quest-node-icon-wrapper" aria-hidden="true">
                  <div class="quest-node-icon">${SVG_ICON_SCRATCH_CAT}</div>
                  <span class="node-pulse-glow"></span>
                </div>
                <div class="quest-node-info">
                  <h4>${escapeHtml(this.lesson.title)}</h4>
                  <p>${escapeHtml(this.lesson.subtitle || this.lesson.description)}</p>
                  <div class="node-reward-chips">
                    <span class="chip-item chip-time">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      ${this.lesson.estimatedDurationMinutes} Menit
                    </span>
                    <span class="chip-item chip-xp">${SVG_ICON_STAR} +50 poin</span>
                    <span class="chip-item chip-badge">${SVG_ICON_BADGE_SHIELD} Lencana Gerak</span>
                  </div>
                </div>
              </div>
              <div class="quest-node-action">
                <button type="button" class="btn btn-primary btn-enter-lesson" id="btn-enter-lesson-node">
                  Mulai Misi →
                </button>
              </div>
            </div>

            <!-- Bonus Checkpoint -->
            <div class="quest-bonus-node">
              <div class="bonus-node-icon" aria-hidden="true">${SVG_ICON_CHEST}</div>
              <div class="bonus-node-info">
                <span class="badge badge-xp">Peti Harta Karun</span>
                <h5>Tantangan Kuis Sempurna (Skor 3/3)</h5>
                <p>Dapatkan +30 poin dan status Akurasi Emas jika menjawab kuis tanpa kesalahan.</p>
              </div>
              <span class="bonus-status-pill">${SVG_ICON_STAR} Bonus +30 poin</span>
            </div>

            <!-- Node 2: Locked -->
            <div class="quest-node is-locked">
              <div class="quest-node-badge-tag">
                <span class="badge badge-not-started">Misi 2 &bull; Terkunci</span>
              </div>
              <div class="quest-node-left">
                <div class="quest-node-icon-wrapper" aria-hidden="true">
                  <div class="quest-node-icon">${SVG_ICON_LOCK}</div>
                </div>
                <div class="quest-node-info">
                  <h4>Scratch — Looks &amp; Costumes: Animasi Karakter</h4>
                  <p>Pelajari pergantian kostum dan efek visual pada sprite.</p>
                  <div class="node-reward-chips">
                    <span class="chip-item">Syarat: Selesaikan Misi 1</span>
                    <span class="chip-item chip-xp">${SVG_ICON_STAR} +60 poin</span>
                  </div>
                </div>
              </div>
              <div class="quest-node-action">
                <button type="button" class="btn btn-secondary btn-sm" disabled>Terkunci</button>
              </div>
            </div>

            <!-- Node 3: Locked -->
            <div class="quest-node is-locked">
              <div class="quest-node-badge-tag">
                <span class="badge badge-not-started">Misi 3 &bull; Terkunci</span>
              </div>
              <div class="quest-node-left">
                <div class="quest-node-icon-wrapper" aria-hidden="true">
                  <div class="quest-node-icon">${SVG_ICON_LOCK}</div>
                </div>
                <div class="quest-node-info">
                  <h4>Scratch — Loops &amp; Forever: Gerakan Otomatis</h4>
                  <p>Gunakan blok perulangan agar karakter berpatroli bolak-balik.</p>
                  <div class="node-reward-chips">
                    <span class="chip-item">Syarat: Selesaikan Misi 2</span>
                    <span class="chip-item chip-xp">${SVG_ICON_STAR} +75 poin</span>
                  </div>
                </div>
              </div>
              <div class="quest-node-action">
                <button type="button" class="btn btn-secondary btn-sm" disabled>Terkunci</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    const parentHubButton = this.container.querySelector('#btn-open-parent-hub');
    if (parentHubButton) {
      parentHubButton.addEventListener('click', () => {
        this.currentScreen = 'parent-hub';
        this.render();
      });
    }

    // Bind all lesson-enter buttons
    this.container.querySelectorAll('.btn-enter-lesson').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentScreen = 'workspace';
        this.render();
      });
    });
  }

  /* ==========================================================================
     2. LESSON WORKSPACE SHELL
     ========================================================================== */
  renderWorkspace() {
    const lesson = this.lesson;
    const currentStage = this.stages[this.currentStageIndex];

    const progressBadges = {
      'not-started': 'badge-not-started',
      'in-progress': 'badge-in-progress',
      'practice-completed': 'badge-practice-completed',
      'submitted': 'badge-submitted',
      'approved': 'badge-approved'
    };

    const objectivesHtml = (lesson.learningObjectives || []).map(obj =>
      `<li>${escapeHtml(obj)}</li>`
    ).join('');

    this.container.innerHTML = `
      <div class="lesson-workspace">
        <!-- Top Workspace Bar (Back to Peta Petualangan) -->
        <div class="workspace-top-bar">
          <button type="button" class="btn btn-ghost btn-sm" id="btn-back-to-quest">
            ← Kembali ke Peta Petualangan
          </button>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="badge ${progressBadges[this.progressState] || 'badge-in-progress'}">
              Status: ${this.formatProgressState(this.progressState)}
            </span>
            <a href="${lesson.requiredTool ? lesson.requiredTool.url : '#'}" target="_blank" rel="noopener noreferrer"
               class="btn btn-secondary btn-sm">
              🔗 Buka Scratch ↗
            </a>
          </div>
        </div>

        <!-- Lesson Header Card -->
        <div class="lesson-header">
          <div class="lesson-header-top">
            <div>
              <div class="lesson-meta-badges">
                <span class="badge badge-in-progress">${escapeHtml(lesson.skillLevel || 'Beginner')}</span>
                <span class="badge badge-not-started">${escapeHtml(lesson.category || '')}</span>
                <span class="badge badge-practice-completed">${lesson.estimatedDurationMinutes} Menit</span>
              </div>
              <h2 class="lesson-title">${escapeHtml(lesson.title)}</h2>
              <p class="lesson-subtitle">${escapeHtml(lesson.subtitle || '')}</p>
            </div>
          </div>

          <div class="lesson-objectives">
            <div class="lesson-objectives-title">Tujuan Pembelajaran</div>
            <ul class="lesson-objectives-list">${objectivesHtml}</ul>
          </div>
        </div>

        <!-- Stage Navigation Tabs (Section 5.8) -->
        <nav class="stage-nav" id="stage-nav" aria-label="Navigasi Tahapan Pembelajaran"></nav>

        <!-- Stage Content Area -->
        <div id="stage-content-area"></div>
      </div>
    `;

    // Bind back to quest button
    const backBtn = this.container.querySelector('#btn-back-to-quest');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentScreen = 'dashboard';
        this.render();
      });
    }

    this.renderStageNav();
    this.renderStageContent();
  }

  renderStageNav() {
    const navEl = this.container.querySelector('#stage-nav');
    if (!navEl) return;

    navEl.innerHTML = this.stages.map((stage, idx) => {
      const isActive = idx === this.currentStageIndex;
      const isPast = idx < this.currentStageIndex;
      let cls = 'stage-nav-item';
      if (isActive) cls += ' active';
      if (isPast) cls += ' completed';

      return `
        <button type="button" class="${cls}" data-stage-index="${idx}"
                aria-current="${isActive ? 'step' : 'false'}">
          <span class="stage-nav-number">${isPast ? '✓' : stage.number}</span>
          <span>${escapeHtml(stage.title)}</span>
        </button>`;
    }).join('');

    navEl.querySelectorAll('.stage-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-stage-index'), 10);
        this.goToStage(idx);
      });
    });
  }

  goToStage(index) {
    if (index < 0 || index >= this.stages.length) return;
    this.currentStageIndex = index;
    this.currentSlideIndex = 0;
    this.renderStageNav();
    this.renderStageContent();
  }

  renderStageContent() {
    const area = this.container.querySelector('#stage-content-area');
    if (!area) return;

    const stage = this.stages[this.currentStageIndex];
    if (!stage) return;

    let bodyHtml = '';
    switch (stage.id) {
      case 'brief':      bodyHtml = this.renderBrief(stage); break;
      case 'materials':   bodyHtml = this.renderMaterials(stage); break;
      case 'practice':    bodyHtml = this.renderPractice(stage); break;
      case 'check':       bodyHtml = this.renderComprehensionCheck(stage); break;
      case 'challenge':   bodyHtml = this.renderChallenge(stage); break;
      case 'submission':  bodyHtml = this.renderSubmission(stage); break;
      default:            bodyHtml = `<p>Tahap belum tersedia.</p>`;
    }

    area.innerHTML = `
      <div class="stage-content">
        <div class="stage-content-header">
          <span class="badge badge-in-progress">${escapeHtml(stage.badge || stage.title)}</span>
          <h3 class="stage-content-title">${escapeHtml(stage.title)}</h3>
        </div>
        <div id="stage-body">${bodyHtml}</div>
        ${this.renderStageFooter()}
      </div>
    `;

    // Attach interactive listeners
    const bodyEl = area.querySelector('#stage-body');
    if (bodyEl) {
      attachInteractions(bodyEl, (cpId, isChecked) => {
        this.checkpointStates[cpId] = isChecked;
        this.evaluateCheckpointsProgress();
      });
    }

    this.attachStageEvents();
  }

  /* ==========================================================================
     STAGE BODY RENDERERS
     ========================================================================== */
  renderBrief(stage) {
    const c = stage.content || {};
    const stepsHtml = (c.keySteps || []).map((s, i) =>
      `<li><strong>Langkah ${i + 1}:</strong> ${escapeHtml(s)}</li>`
    ).join('');

    return `
      <div class="content-block cb-text" style="font-size: var(--font-size-base); line-height: var(--line-height-relaxed);">
        ${escapeHtml(c.overview || '')}
      </div>
      ${c.toolNotice ? `
      <div class="content-block cb-callout cb-callout-info">
        <div class="cb-callout-title">🔧 Alat Koding Asli</div>
        <div class="cb-callout-text">${escapeHtml(c.toolNotice)}</div>
      </div>` : ''}
      ${stepsHtml ? `
      <div class="content-block" style="margin-top: var(--space-5);">
        <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); font-size: var(--font-size-sm);">
          Rencana langkah dalam misi ini:
        </div>
        <ol style="padding-left: var(--space-5); display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
          ${stepsHtml}
        </ol>
      </div>` : ''}
    `;
  }

  renderMaterials(stage) {
    const slides = stage.slides || [];
    if (slides.length === 0) return '<p>Belum ada slide materi.</p>';

    this.visitedSlides.add(this.currentSlideIndex);
    const slide = slides[this.currentSlideIndex];
    const total = slides.length;
    const current = this.currentSlideIndex + 1;

    let slideBodyHtml = '';
    if (slide.type === 'interactive-quiz') {
      slideBodyHtml = renderQuiz(slide);
    } else {
      slideBodyHtml = renderContentBlocks(slide.content || []);
    }

    const dotsHtml = slides.map((_, i) => {
      let cls = 'slide-dot';
      if (i === this.currentSlideIndex) cls += ' active';
      else if (this.visitedSlides.has(i)) cls += ' visited';
      return `<button type="button" class="${cls}" data-slide-index="${i}" aria-label="Ke slide ${i + 1}"></button>`;
    }).join('');

    return `
      <div>
        <h4 style="margin-bottom: var(--space-4); font-size: var(--font-size-base);">${escapeHtml(slide.title)}</h4>
        <div class="slide-content" id="slide-body">
          ${slideBodyHtml}
        </div>
        <div class="slide-nav" style="margin-top: var(--space-6);">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-slide-prev"
                  ${this.currentSlideIndex === 0 ? 'disabled' : ''}>
            ← Sebelumnya
          </button>
          <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-1);">
            <span class="slide-counter">Slide ${current} / ${total}</span>
            <div class="slide-dots">${dotsHtml}</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-slide-next"
                  ${this.currentSlideIndex === total - 1 ? 'disabled' : ''}>
            Selanjutnya →
          </button>
        </div>
      </div>
    `;
  }

  renderPractice(stage) {
    const c = stage.content || {};
    const checkpoints = c.checkpoints || [];

    const toolBtnHtml = c.toolButton
      ? `<div class="practice-tool-bar">
           <span class="practice-tool-label">${escapeHtml(c.instructions || 'Ikuti langkah berikut:')}</span>
           <a href="${c.toolButton.url}" target="_blank" rel="noopener noreferrer"
              class="btn btn-primary btn-sm">
              🔗 ${escapeHtml(c.toolButton.text)} ↗
           </a>
         </div>`
      : '';

    const checkpointsHtml = checkpoints.map(cp => {
      const isChecked = this.checkpointStates[cp.id] || false;
      return `
        <div class="checkpoint ${isChecked ? 'checked' : ''}" data-checkpoint-id="${cp.id}">
          <div class="checkpoint-header">
            <div class="checkpoint-check" role="checkbox" aria-checked="${isChecked}"
                 tabindex="0" aria-label="Tandai ${cp.title} selesai">
              ${isChecked ? '✓' : ''}
            </div>
            <div style="flex: 1;">
              <div class="checkpoint-title">${escapeHtml(cp.title)}</div>
              <div class="checkpoint-desc">${escapeHtml(cp.description)}</div>
              ${cp.expectedResult ? `
              <div class="checkpoint-expected">
                <strong>Hasil yang Diharapkan:</strong> ${escapeHtml(cp.expectedResult)}
              </div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="practice-container">
        ${toolBtnHtml}
        ${checkpointsHtml}
      </div>
    `;
  }

  evaluateCheckpointsProgress() {
    const stage = this.stages.find(s => s.id === 'practice');
    if (!stage || !stage.content || !stage.content.checkpoints) return;

    const total = stage.content.checkpoints.length;
    const checkedCount = Object.values(this.checkpointStates).filter(Boolean).length;

    // Persist checkpoint states
    this.saveProgress({ checkpoints: this.checkpointStates });

    if (checkedCount === total && this.progressState !== 'submitted' && this.progressState !== 'approved') {
      this.saveProgress({ state: 'practice-completed', checkpoints: this.checkpointStates });
      showToast({
        title: 'Status Diperbarui 🎉',
        message: 'Semua langkah latihan selesai! Status: Latihan selesai.',
        type: 'success',
        duration: 3500
      });
      // Re-render header badge
      const badgeEl = this.container.querySelector('.workspace-top-bar .badge');
      if (badgeEl) {
        badgeEl.className = 'badge badge-practice-completed';
        badgeEl.textContent = 'Status: Latihan selesai';
      }
    }
  }

  renderComprehensionCheck(stage) {
    const questions = stage.questions || [];
    if (questions.length === 0) return '<p>Belum ada soal evaluasi.</p>';

    return questions.map(q => renderQuiz({
      id: q.id,
      quizType: q.type || 'mcq',
      question: q.prompt,
      options: q.options,
      hint: null
    })).join('<div style="margin: var(--space-5) 0; border-top: 1px solid var(--color-border-subtle);"></div>');
  }

  renderChallenge(stage) {
    const ch = stage.challenge || {};
    const reqHtml = (ch.requirements || []).map(r =>
      `<li>${escapeHtml(r)}</li>`
    ).join('');

    const rubricHtml = (ch.evaluationRubric || []).map(r =>
      `<tr><td style="font-weight: var(--font-weight-semibold);">${escapeHtml(r.criteria)}</td>
           <td>${escapeHtml(r.description)}</td></tr>`
    ).join('');

    return `
      <div class="challenge-container">
        <h4 style="font-size: var(--font-size-base); margin: 0;">${escapeHtml(ch.title || 'Tantangan Proyek')}</h4>
        <div class="challenge-story">${escapeHtml(ch.story || '')}</div>

        <div class="challenge-requirements">
          <div class="challenge-req-title">Persyaratan Proyek:</div>
          <ul class="challenge-req-list">${reqHtml}</ul>
        </div>

        ${ch.bonusMission ? `
        <div class="challenge-bonus">
          ⭐ <strong>Misi Bonus:</strong> ${escapeHtml(ch.bonusMission)}
        </div>` : ''}

        ${rubricHtml ? `
        <div class="challenge-rubric">
          <table>
            <thead><tr><th>Kriteria Penilaian</th><th>Deskripsi Pencapaian</th></tr></thead>
            <tbody>${rubricHtml}</tbody>
          </table>
        </div>` : ''}
      </div>
    `;
  }

  renderSubmission(stage) {
    const sub = stage.submission || {};
    const methodsHtml = (sub.allowedMethods || []).map(m =>
      `<li>${escapeHtml(m)}</li>`
    ).join('');

    // Read latest submission from unified StateStore
    const storeSub = this.activeStoreSubmission;
    const status = (storeSub && storeSub.status) || this.progressState;

    const isSubmitted = status === 'submitted';
    const isApproved = status === 'approved';
    const isRevision = status === 'revision-required';

    const projectUrl = (storeSub && storeSub.projectUrl) || (this.submissionData && this.submissionData.link) || '';
    const studentNotes = (storeSub && storeSub.studentNotes) || (this.submissionData && this.submissionData.notes) || '';
    const teacherFeedback = (storeSub && storeSub.teacherFeedback) || '';
    const reviewerName = (storeSub && storeSub.reviewerName) || 'Kak Sarah';

    let statusCardHtml = '';
    if (isApproved) {
      statusCardHtml = `
        <div class="submission-status-card submission-status-card--approved">
          <div class="submission-status-card-header">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <span style="font-size: 1.5rem;">🏆</span>
              <div>
                <strong style="font-size: var(--font-size-sm); color: var(--color-success);">Proyek Disetujui!</strong>
                <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0;">Selamat! Karyamu telah diperiksa dan disetujui oleh ${escapeHtml(reviewerName)}.</p>
              </div>
            </div>
            <span class="badge badge-approved">Disetujui</span>
          </div>
          ${teacherFeedback ? `
            <div class="submission-feedback-box">
              <div class="submission-feedback-author">💬 Catatan Guru (${escapeHtml(reviewerName)}):</div>
              <div class="submission-feedback-body">${escapeHtml(teacherFeedback)}</div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (isRevision) {
      statusCardHtml = `
        <div class="submission-status-card submission-status-card--revision">
          <div class="submission-status-card-header">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <span style="font-size: 1.5rem;">⚠️</span>
              <div>
                <strong style="font-size: var(--font-size-sm); color: var(--color-danger);">Revisi Diperlukan</strong>
                <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0;">Guru telah memeriksa karyamu dan memberikan catatan perbaikan di bawah ini.</p>
              </div>
            </div>
            <span class="badge badge-revision-required">Perlu diperbaiki</span>
          </div>
          ${teacherFeedback ? `
            <div class="submission-feedback-box">
              <div class="submission-feedback-author">💬 Instruksi Revisi Guru (${escapeHtml(reviewerName)}):</div>
              <div class="submission-feedback-body">${escapeHtml(teacherFeedback)}</div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (isSubmitted) {
      statusCardHtml = `
        <div class="submission-status-card">
          <div class="submission-status-card-header">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <span style="font-size: 1.5rem;">🎉</span>
              <div>
                <strong style="font-size: var(--font-size-sm); color: var(--color-success);">Proyek Berhasil Dikumpulkan!</strong>
                <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin: 0;">Karyamu saat ini berada di antrean review guru.</p>
              </div>
            </div>
            <span class="badge badge-submitted">Sudah dikirim</span>
          </div>
        </div>
      `;
    }

    // Input fields are disabled only when submitted or approved (re-enabled on revision-required so student can update!)
    const isFormDisabled = isSubmitted || isApproved;
    const submitBtnText = isApproved
      ? '✓ Proyek Telah Disetujui'
      : (isSubmitted ? '✓ Sudah Dikumpulkan' : (isRevision ? 'Kirim Ulang Hasil Revisi →' : 'Kirim Proyek ke Guru →'));

    return `
      <div class="submission-container">
        <div class="cb-text">${escapeHtml(sub.instructions || 'Kumpulkan hasil karyamu.')}</div>

        <div class="submission-methods">
          <div class="submission-methods-title">Metode Pengumpulan yang Diterima:</div>
          <ul class="submission-methods-list">${methodsHtml}</ul>
        </div>

        ${statusCardHtml}

        <div class="submission-form">
          <div class="form-group">
            <label for="submission-link" class="form-label">Link Proyek Scratch Publik (URL)</label>
            <input type="url" id="submission-link" class="form-control"
                   placeholder="https://scratch.mit.edu/projects/..."
                   ${isFormDisabled ? 'disabled' : ''}
                   value="${escapeHtml(projectUrl || (this.submissionData && this.submissionData.link) || '')}">
          </div>
          <div class="form-group">
            <label for="submission-notes" class="form-label">Catatan Refleksi Belajar (Opsional)</label>
            <textarea id="submission-notes" class="form-control" rows="3"
                      placeholder="Ceritakan pengalamanmu mengerjakan proyek ini..."
                      ${isFormDisabled ? 'disabled' : ''}>${escapeHtml(studentNotes)}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: var(--space-3);">
            <button type="button" class="btn btn-secondary" id="btn-save-draft" ${isFormDisabled ? 'disabled' : ''}>Simpan Draf</button>
            <button type="button" class="btn btn-primary" id="btn-submit-project" ${isFormDisabled ? 'disabled' : ''}>
              ${submitBtnText}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderStageFooter() {
    const isFirst = this.currentStageIndex === 0;
    const isLast = this.currentStageIndex === this.stages.length - 1;
    const prevStage = !isFirst ? this.stages[this.currentStageIndex - 1] : null;
    const nextStage = !isLast ? this.stages[this.currentStageIndex + 1] : null;

    return `
      <div class="stage-footer">
        ${prevStage
          ? `<button type="button" class="btn btn-secondary" id="btn-stage-prev">
               ← ${escapeHtml(prevStage.title)}
             </button>`
          : '<span></span>'}
        ${nextStage
          ? `<button type="button" class="btn btn-primary" id="btn-stage-next">
               ${escapeHtml(nextStage.title)} →
             </button>`
          : '<span></span>'}
      </div>`;
  }

  attachStageEvents() {
    const area = this.container.querySelector('#stage-content-area');
    if (!area) return;

    // Stage navigation buttons
    const prevBtn = area.querySelector('#btn-stage-prev');
    const nextBtn = area.querySelector('#btn-stage-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToStage(this.currentStageIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToStage(this.currentStageIndex + 1));

    // Slide navigation buttons
    const slidePrev = area.querySelector('#btn-slide-prev');
    const slideNext = area.querySelector('#btn-slide-next');
    if (slidePrev) slidePrev.addEventListener('click', () => this.goToSlide(this.currentSlideIndex - 1));
    if (slideNext) slideNext.addEventListener('click', () => this.goToSlide(this.currentSlideIndex + 1));

    area.querySelectorAll('.slide-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-slide-index'), 10);
        this.goToSlide(idx);
      });
    });

    // Submission form actions
    const submitBtn = area.querySelector('#btn-submit-project');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const linkInput = area.querySelector('#submission-link');
        const notesInput = area.querySelector('#submission-notes');
        const link = linkInput ? linkInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        if (!link) {
          showToast({
            title: 'Tautan Diperlukan',
            message: 'Masukkan tautan link proyek Scratch kamu sebelum mengirim.',
            type: 'warning'
          });
          if (linkInput) linkInput.focus();
          return;
        }

        if (!this.isValidUrl(link)) {
          showToast({
            title: 'Tautan Tidak Valid',
            message: 'Harap masukkan URL yang sah (diawali https:// atau http://).',
            type: 'error'
          });
          if (linkInput) linkInput.focus();
          return;
        }

        submitBtn.disabled = true;
        try {
          const submittedAt = new Date().toISOString();
          const subRecord = await LearningStateRepository.saveSubmission({
            studentId: this.currentUser.id,
            studentName: this.currentUser.name,
            studentAvatar: this.currentUser.avatar || 'AP',
            lessonId: this.lesson.id,
            lessonTitle: this.lesson.title,
            projectUrl: link,
            studentNotes: notes,
            status: 'submitted',
            checkpointsPassed: 4,
            checkpointsTotal: 4,
            quizScore: '3/3 (100%)',
            submittedAt
          });
          if (!subRecord) throw new Error('Data proyek belum berhasil disimpan.');
          this.activeStoreSubmission = subRecord;
          this.saveProgress({ state: 'submitted', submission: { link, notes, submittedAt } });
          showToast({
            title: 'Proyek Berhasil Dikumpulkan! 🎉',
            message: 'Status berubah menjadi Sudah dikirim. Guru akan segera memeriksa karyamu.',
            type: 'success',
            duration: 4000
          });
          this.renderStageContent();
        } catch (error) {
          showToast({
            title: 'Proyek Belum Terkirim',
            message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan proyek.',
            type: 'error'
          });
        } finally {
          if (submitBtn.isConnected) submitBtn.disabled = false;
        }
      });
    }

    const draftBtn = area.querySelector('#btn-save-draft');
    if (draftBtn) {
      draftBtn.addEventListener('click', () => {
        const linkInput = area.querySelector('#submission-link');
        const notesInput = area.querySelector('#submission-notes');
        const link = linkInput ? linkInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        this.saveProgress({
          submission: { link, notes, isDraft: true }
        });

        showToast({
          title: 'Draf Disimpan',
          message: 'Tautan dan catatan belajar tersimpan secara lokal.',
          type: 'info'
        });
      });
    }
  }

  goToSlide(index) {
    const stage = this.stages[this.currentStageIndex];
    if (!stage || stage.id !== 'materials') return;
    const slides = stage.slides || [];
    if (index < 0 || index >= slides.length) return;

    this.currentSlideIndex = index;
    this.visitedSlides.add(index);
    this.saveProgress({ slideIndex: index });

    this.renderStageContent();
  }

  formatProgressState(state) {
    const map = {
      'not-started': 'Belum dimulai',
      'in-progress': 'Sedang berjalan',
      'practice-completed': 'Latihan selesai',
      'submitted': 'Sudah dikirim',
      'revision-required': 'Perlu diperbaiki',
      'approved': 'Disetujui'
    };
    return map[state] || state;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
