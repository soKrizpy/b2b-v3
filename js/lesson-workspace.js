/**
 * B2B LEARNING ENGINE - LESSON WORKSPACE & STUDENT CONTROLLER
 * Controls the Student Dashboard, Peta Petualangan, and 6-stage continuous Lesson Workspace.
 * Adheres strictly to Section 4, 5, 6, 7, 8, 9, 14 of PROJECT_RULES.md.
 */

import { renderContentBlocks, renderQuiz, attachInteractions } from './content-renderer.js';
import { showToast } from './components/toast.js';
import { createScopedWorkspaceRepositories, createWorkspaceRepositories, WorkspaceRepositories } from './services/workspace-repositories.js';
import { ParentHubView } from './student/parent-hub.js';
import {
  SVG_MASCOT,
  SVG_ISLAND_SCRATCH, SVG_ISLAND_ROBLOX, SVG_ISLAND_PYTHON, SVG_ISLAND_GAMEDEV,
  SVG_ICON_SCRATCH_CAT, SVG_ICON_LOCK, SVG_ICON_CHEST,
  SVG_ICON_BADGE_SHIELD, SVG_ICON_CHECK,
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
  constructor(container, lessonData, currentUser = null, repositories = null, options = {}) {
    this.container = container;
    this.lesson = lessonData;
    if (options.repositoryMode === 'production') {
      if (!repositories) throw new Error('Repository produksi wajib diberikan secara eksplisit.');
      const requiredCapabilities = ['learning'];
      if (options.parentHubEnabled) requiredCapabilities.push('sessionReports', 'monthlyEvaluations', 'billing', 'parentHub');
      this.repositories = createScopedWorkspaceRepositories(repositories, requiredCapabilities);
    } else {
      this.repositories = createWorkspaceRepositories(repositories || WorkspaceRepositories);
    }
    // Production React portal can disable Parent Hub until its data adapters are production-backed.
    this.parentHubEnabled = options.parentHubEnabled !== false;
    this.submissionEnabled = options.submissionEnabled !== false;
    this.serverValidatedStages = options.repositoryMode === 'production';
    this.stages = lessonData.stages || [];
    if (!currentUser?.id) throw new Error('Sesi siswa diperlukan untuk membuka ruang belajar.');
    this.currentUser = currentUser;

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
    this.maxSlideIndex = Number.isInteger(saved.maxSlideIndex) ? saved.maxSlideIndex : this.currentSlideIndex;
    this.visitedSlides = new Set([0, this.currentSlideIndex]);
    this.stageProgress = {};

    this.activeStoreSubmission = null;
    this.quizAnswers = {};
    this.quizAttemptHistory = [];
    this.quizSubmitted = false;
    this.quizSubmissionPromise = null;
    this.currentCheckQuestionIndex = 0;
    this.checkedQuizQuestionIndexes = new Set();
  }

  async init() {
    // Read only progress already scoped to this student and lesson. The legacy
    // global key is intentionally not imported because its owner is unknown.
    this._lessonProgress = await this.repositories.learning.getLessonProgress(this.currentUser.id, this.lesson.id);
    if (this.destroyed) return;
    const savedProgress = this.loadProgress();
    this.progressState = savedProgress.state;
    this.checkpointStates = savedProgress.checkpoints || {};
    this.submissionData = savedProgress.submission || null;
    this.currentSlideIndex = typeof savedProgress.slideIndex === 'number' ? savedProgress.slideIndex : 0;
    this.maxSlideIndex = Number.isInteger(savedProgress.maxSlideIndex) ? savedProgress.maxSlideIndex : this.currentSlideIndex;
    this.visitedSlides = new Set([0, this.currentSlideIndex]);
    if (this.serverValidatedStages) {
      const progress = await this.repositories.learning.getTopicStageProgress(this.currentUser.id, this.lesson.id);
      if (this.destroyed) return;
      this.stageProgress = Object.fromEntries(progress.map(item => [item.stageKey, item.status]));
      this.quizAttemptHistory = await this.repositories.learning.getTopicQuizAttempts(this.currentUser.id, this.lesson.id);
      if (this.destroyed) return;
      this.quizSubmitted = this.quizAttemptHistory.length > 0;
    }
    const activeSub = await this.repositories.learning.getStudentLessonSubmission(this.currentUser.id, this.lesson.id);
    if (this.destroyed) return;
    this.activeStoreSubmission = activeSub || null;
    if (activeSub && ['approved', 'revision-required', 'submitted'].includes(activeSub.status)) {
      this.progressState = activeSub.status;
    }
    this.render();
    this.bindKeyboardNav();
    if (!this._unsubscribeStore) {
      this._unsubscribeStore = this.repositories.learning.subscribe(() => {
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
      this.repositories.learning.getStudentLessonSubmission(this.currentUser.id, this.lesson.id),
      this.repositories.learning.getLessonProgress(this.currentUser.id, this.lesson.id)
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
      this.maxSlideIndex = Number.isInteger(progress.maxSlideIndex) ? progress.maxSlideIndex : this.currentSlideIndex;
      this.visitedSlides = new Set([0, this.currentSlideIndex]);
      changed = true;
    }

    if (activeSub) {
      if (activeSub.version !== this.activeStoreSubmission?.version) changed = true;
      this.activeStoreSubmission = activeSub;
      if (this.serverValidatedStages && changed) {
        const progress = await this.repositories.learning.getTopicStageProgress(this.currentUser.id, this.lesson.id);
        if (this.destroyed) return;
        this.stageProgress = Object.fromEntries(progress.map(item => [item.stageKey, item.status]));
      }
      const nextState = ['approved', 'revision-required', 'submitted'].includes(activeSub.status)
        ? activeSub.status
        : null;
      if (nextState && this.progressState !== nextState) {
        this.progressState = nextState;
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
      // A new student/topic starts at zero; never invent demo progress.
      state: saved.state || 'not-started',
      checkpoints: saved.checkpoints || {},
      submission: saved.submissionDraft || null,
      slideIndex: Number.isInteger(saved.slideIndex) ? saved.slideIndex : 0,
      maxSlideIndex: Number.isInteger(saved.maxSlideIndex) ? saved.maxSlideIndex : (Number.isInteger(saved.slideIndex) ? saved.slideIndex : 0)
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
    return this.repositories.learning.saveLessonProgress(
      this.currentUser.id,
      this.lesson.id,
      progressUpdates
    ).then(saved => {
      if (Number.isInteger(saved?.maxSlideIndex)) {
        const previousMaxSlideIndex = this.maxSlideIndex;
        this.maxSlideIndex = saved.maxSlideIndex;
        this._lessonProgress = { ...this._lessonProgress, maxSlideIndex: saved.maxSlideIndex };
        if (
          this.maxSlideIndex !== previousMaxSlideIndex
          && this.currentScreen === 'workspace'
          && this.stages[this.currentStageIndex]?.id === 'materials'
        ) {
          this.renderStageContent();
        }
      }
      return true;
    }).catch(error => {
      console.error('LessonWorkspace: progres gagal disimpan.', error);
      showToast({
        title: 'Progres belum tersimpan',
        message: 'Periksa koneksi penyimpanan lalu coba lagi.',
        type: 'error'
      });
      return false;
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
      if (!this.parentHubEnabled) {
        this.currentScreen = 'dashboard';
        this.renderDashboard();
        return;
      }
      this.renderParentHub();
    } else {
      this.renderWorkspace();
    }
  }

  /**
   * Phase 2: Render Parent Hub View
   */
  renderParentHub() {
    if (!this.parentHubEnabled) {
      this.currentScreen = 'dashboard';
      this.renderDashboard();
      return;
    }
    if (!this.parentHubView) {
      this.parentHubView = new ParentHubView(this.container, this.currentUser, () => {
        this.parentHubView?.destroy();
        this.parentHubView = null;
        this.currentScreen = 'dashboard';
        this.render();
      }, this.repositories, this.lesson.moduleId);
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
      'not-started':          { text: 'Belum dimulai',         badgeClass: 'badge-not-started' },
      'in-progress':          { text: 'Sedang berjalan',         badgeClass: 'badge-in-progress' },
      'practice-completed':   { text: 'Latihan selesai',  badgeClass: 'badge-practice-completed' },
      'submitted':            { text: 'Sudah dikirim',           badgeClass: 'badge-submitted' },
      'revision-required':    { text: 'Perlu diperbaiki',   badgeClass: 'badge-revision-required' },
      'approved':             { text: 'Disetujui',            badgeClass: 'badge-approved' }
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
              <span class="badge badge-level">Petualang Koding</span>
              <span class="badge badge-scratch">Jalur: ${escapeHtml(this.lesson.trackTitle || this.lesson.category || "Kurikulum Bits2Bytes")}</span>
            </div>
            <h2 class="hero-greeting-title">Halo, ${escapeHtml(this.currentUser.name || "Teman")}! Siap Lanjut Berpetualang? 🚀</h2>
            <p class="hero-greeting-sub">Jelajahi kepulauan koding, kumpulkan bintang, dan kuasai logika pemrograman!</p>
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
                    <span class="meta-tag">Alat: ${escapeHtml(this.lesson.requiredTool?.name || "Sesuai materi")}</span>
                    <span class="meta-tag">Tingkat: ${escapeHtml(this.lesson.skillLevel || "Belum ditentukan")}</span>
                  </div>
                </div>
              </div>

              <div class="active-mission-footer">
                <button type="button" class="btn btn-primary btn-enter-lesson" id="btn-enter-lesson">
                  Lanjutkan Misi →
                </button>
              </div>
            </div>

            <div class="card student-map-pending">
              <h4 class="realms-title">Peta Petualangan</h4>
              <p class="realms-sub">Peta wilayah dan status buka modul akan ditampilkan setelah progres kurikulum setiap siswa terhubung sepenuhnya. Materi yang tersedia tetap dapat dipilih melalui menu Modul dan Topik di atas.</p>
            </div>
          </div>

          <!-- RIGHT: Production-backed gamification is not available yet. -->
          <div class="dashboard-col-side">
            <div class="achievements-card">
              <div class="achievements-header">
                <div class="achieve-icon-wrap" aria-hidden="true">${SVG_ICON_BADGE_SHIELD}</div>
                <div>
                  <h4 class="achieve-title">Gamifikasi</h4>
                  <span class="badge badge-not-started">Belum tersedia</span>
                </div>
              </div>
              <p class="daily-sub">Target harian, streak, total poin, dan lencana akan ditampilkan setelah pencatatan gamifikasi terhubung ke data akun. Saat ini Bits2Bytes tidak menampilkan angka contoh sebagai progres asli.</p>
            </div>

            <!-- Parent Hub is hidden from production until its repositories are production-backed. -->
            ${this.parentHubEnabled ? `
            <section class="card parent-hub-entry-card" aria-labelledby="parent-hub-entry-title">
              <div class="achievements-header">
                <div class="achieve-icon-wrap" aria-hidden="true">💛</div>
                <div>
                  <h4 class="achieve-title" id="parent-hub-entry-title">Ruang Khusus Ayah/Bunda</h4>
                  <span class="badge badge-in-progress">Lihat laporan belajar</span>
                </div>
              </div>
              <p class="parent-hub-access-note">Orang tua dapat melihat laporan pertemuan, perkembangan bulanan, dan riwayat tagihan dari sini. Tidak ada akun orang tua terpisah.</p>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-open-parent-hub">Buka Ruang Ayah/Bunda →</button>
            </section>` : `
            <section class="card parent-hub-entry-card" aria-labelledby="parent-hub-entry-title">
              <div class="achievements-header">
                <div class="achieve-icon-wrap" aria-hidden="true">💛</div>
                <div>
                  <h4 class="achieve-title" id="parent-hub-entry-title">Ruang Khusus Ayah/Bunda</h4>
                  <span class="badge badge-not-started">Belum tersedia</span>
                </div>
              </div>
              <p class="daily-sub">Laporan, evaluasi, dan tagihan belum tersambung ke data produksi. Bits2Bytes tidak menampilkan data contoh pada akun asli.</p>
            </section>`}
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
              🔗 ${escapeHtml(lesson.requiredTool?.name || "Buka alat belajar")} ↗
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
      const isComplete = this.isStageComplete(stage.id);
      const isLocked = this.serverValidatedStages
        && this.stages.slice(0, idx).some(previous => !this.isStageComplete(previous.id));
      let cls = 'stage-nav-item';
      if (isActive) cls += ' active';
      if (isComplete) cls += ' completed';

      return `
        <button type="button" class="${cls}" data-stage-index="${idx}"
                aria-current="${isActive ? 'step' : 'false'}" ${isLocked ? 'disabled' : ''}>
          <span class="stage-nav-number">${isComplete ? '✓' : stage.number}</span>
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
    if (this.serverValidatedStages
      && this.stages.slice(0, index).some(stage => !this.isStageComplete(stage.id))) return;
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
      }, (questionIndex, selectedIndex) => {
        this.checkedQuizQuestionIndexes.add(questionIndex);
        void this.handleQuizAnswer(questionIndex, selectedIndex);
        const nextButton = bodyEl.querySelector('[data-quiz-next]');
        if (nextButton) {
          nextButton.hidden = false;
          nextButton.disabled = false;
        }
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
      const isLocked = this.serverValidatedStages && i > this.maxSlideIndex + 1;
      return `<button type="button" class="${cls}" data-slide-index="${i}" aria-label="Ke slide ${i + 1}" ${isLocked ? 'disabled' : ''}></button>`;
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

    const checkpoints = stage.content.checkpoints;
    const total = checkpoints.length;
    const checkedCount = checkpoints.filter(checkpoint => this.checkpointStates[checkpoint.id] === true).length;
    const previousState = this.progressState;
    let nextState = previousState;

    if (checkedCount === total && !['submitted', 'approved'].includes(previousState)) {
      nextState = 'practice-completed';
    } else if (checkedCount < total && previousState === 'practice-completed') {
      nextState = 'in-progress';
    }

    // Persist checkpoint and derived practice status together.
    this.saveProgress({ state: nextState, checkpoints: this.checkpointStates });
    this.updateStageNextButton();

    if (nextState !== previousState) {
      const badgeEl = this.container.querySelector('.workspace-top-bar .badge');
      if (badgeEl) {
        const badgeClass = nextState === 'practice-completed'
          ? 'badge-practice-completed'
          : 'badge-in-progress';
        badgeEl.className = `badge ${badgeClass}`;
        badgeEl.textContent = `Status: ${this.formatProgressState(nextState)}`;
      }
    }

    if (nextState === 'practice-completed' && previousState !== 'practice-completed') {
      showToast({
        title: 'Status Diperbarui 🎉',
        message: 'Semua langkah latihan selesai! Status: Latihan selesai.',
        type: 'success',
        duration: 3500
      });
    }
  }

  renderComprehensionCheck(stage) {
    const questions = stage.questions || [];
    if (this.quizSubmitted && this.quizAttemptHistory.length > 0) {
      const bestScore = Math.max(...this.quizAttemptHistory.map(attempt => attempt.score));
      const attemptsHtml = this.quizAttemptHistory.map(attempt =>
        `<li>Percobaan ${attempt.attemptNumber}: <strong>${attempt.score}/100</strong></li>`
      ).join('');
      const attemptsUsed = this.quizAttemptHistory.length;
      return `
        <section class="quiz-result-summary" role="status" aria-live="polite">
          <h4>Hasil Kuis Tersimpan</h4>
          <p>Nilai terbaik: <strong>${bestScore}/100</strong></p>
          <p>Percobaan digunakan: ${attemptsUsed} dari 2</p>
          <ul>${attemptsHtml}</ul>
          <p>Riwayat ini diambil dari akun Supabase kamu. Kamu bisa melanjutkan setelah tahap sebelumnya tersimpan.</p>
        </section>`;
    }
    if (questions.length === 0) return '<p>Belum ada soal evaluasi.</p>';

    const questionIndex = Math.min(this.currentCheckQuestionIndex, questions.length - 1);
    const question = questions[questionIndex];
    const isLastQuestion = questionIndex === questions.length - 1;
    const progress = Math.round(((questionIndex + 1) / questions.length) * 100);

    return `
      <section class="comprehension-check" aria-label="Kuis pemahaman">
        <div class="quiz-progress" aria-live="polite">
          <div class="quiz-progress-label">Soal ${questionIndex + 1} dari ${questions.length}</div>
          <div class="progress-bar-bg" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
          </div>
        </div>
        ${renderQuiz({
          id: question.id,
          questionIndex,
          quizType: question.type || 'mcq',
          question: question.prompt,
          options: question.options,
          hint: null
        })}
        ${isLastQuestion
          ? '<p class="quiz-completion-note" role="status">Soal terakhir. Periksa jawaban untuk menyelesaikan kuis.</p>'
          : '<button type="button" class="btn btn-primary" data-quiz-next hidden disabled>Soal Berikutnya →</button>'}
      </section>`;
  }

  async handleQuizAnswer(questionIndex, selectedIndex) {
    if (this.quizSubmitted || !Number.isInteger(this.lesson.topicId)) return;
    this.quizAnswers[questionIndex] = selectedIndex;
    const questions = this.stages.find(stage => stage.id === 'check')?.questions || [];
    if (questions.length === 0 || Object.keys(this.quizAnswers).length !== questions.length) return;

    const submitAttempt = this.repositories.learning.submitTopicQuizAttempt;
    if (typeof submitAttempt !== 'function') {
      showToast({ title: 'Kuis belum tersambung', message: 'Penyimpanan hasil kuis belum tersedia.', type: 'warning' });
      return;
    }

    if (this.quizSubmissionPromise) return;
    this.quizSubmissionPromise = submitAttempt.call(
      this.repositories.learning,
      this.lesson.topicId,
      questions.map((_, index) => ({ questionIndex: index, selectedIndex: this.quizAnswers[index] }))
    ).then(result => {
      this.quizSubmitted = true;
      this.quizAttemptHistory = [
        ...this.quizAttemptHistory,
        {
          attemptNumber: result.attemptNumber,
          score: result.score,
          submittedAt: new Date().toISOString()
        }
      ];
      this.updateStageNextButton();
      this.renderStageContent();
      showToast({
        title: 'Hasil kuis tersimpan',
        message: `Nilai kamu ${result.score}/100 (percobaan ${result.attemptNumber} dari 2).`,
        type: 'success',
        duration: 4500
      });
    }).catch(error => {
      console.error('Quiz result could not be saved:', error);
      showToast({
        title: 'Hasil kuis belum tersimpan',
        message: error instanceof Error ? error.message : 'Silakan coba lagi.',
        type: 'error',
        duration: 4500
      });
    }).finally(() => {
      this.quizSubmissionPromise = null;
    });
    await this.quizSubmissionPromise;
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
    if (!this.submissionEnabled) {
      return `
        <div class="submission-container">
          <div class="cb-callout cb-callout-info" role="status">
            <div class="cb-callout-title">Pengumpulan belum tersedia</div>
            <div class="cb-callout-text">Materi dan progres belajar sudah terhubung. Pengiriman proyek serta review guru belum memiliki jalur produksi yang aman, jadi tombol pengumpulan dinonaktifkan agar karya tidak hilang atau masuk ke penyimpanan demo.</div>
          </div>
        </div>
      `;
    }

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
    const reviewerName = (storeSub && storeSub.reviewerName) || 'Guru';

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
            <label for="submission-link" class="form-label">Link Proyek ${escapeHtml(this.lesson.requiredTool?.name || 'Karya')} (URL)</label>
            <input type="url" id="submission-link" class="form-control"
                   placeholder="${escapeHtml(this.lesson.requiredTool?.url || 'https://tautan-proyek-kamu.example/')}"
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
    const currentStage = this.stages[this.currentStageIndex];
    const isComplete = this.isStageComplete(currentStage?.id);
    const canComplete = this.canCompleteCurrentStage();
    const isOptional = currentStage?.id === 'challenge' || currentStage?.id === 'submission';

    return `
      <div class="stage-footer">
        ${prevStage
          ? `<button type="button" class="btn btn-secondary" id="btn-stage-prev">
               ← ${escapeHtml(prevStage.title)}
             </button>`
          : '<span></span>'}
        ${nextStage
          ? `<button type="button" class="btn btn-primary" id="btn-stage-next" ${this.serverValidatedStages && !isComplete && !canComplete ? 'disabled' : ''}>
               ${isComplete ? 'Lanjut ke' : 'Selesaikan & lanjut ke'} ${escapeHtml(nextStage.title)} →
             </button>`
          : '<span></span>'}
        ${isOptional && !isComplete
          ? '<button type="button" class="btn btn-secondary" id="btn-stage-skip">Lewati tahapan opsional</button>'
          : ''}
      </div>`;
  }

  isStageComplete(stageId) {
    return ['completed', 'skipped'].includes(this.stageProgress?.[stageId]);
  }

  canCompleteCurrentStage() {
    const stage = this.stages[this.currentStageIndex];
    if (!stage) return false;
    switch (stage.id) {
      case 'brief':
        return true;
      case 'materials':
        return (stage.slides || []).length > 0
          && this.maxSlideIndex >= (stage.slides || []).length - 1;
      case 'practice': {
        const checkpoints = stage.content?.checkpoints || [];
        return checkpoints.length > 0
          && checkpoints.every(checkpoint => this.checkpointStates[checkpoint.id] === true);
      }
      case 'check':
        return this.quizSubmitted || this.quizAttemptHistory.length > 0;
      case 'challenge':
        return Boolean(this.activeStoreSubmission);
      case 'submission':
        return Boolean(this.activeStoreSubmission);
      default:
        return false;
    }
  }

  updateStageNextButton() {
    const button = this.container.querySelector('#btn-stage-next');
    const stage = this.stages[this.currentStageIndex];
    if (!button || !stage || !this.serverValidatedStages) return;
    button.disabled = !this.isStageComplete(stage.id) && !this.canCompleteCurrentStage();
  }

  async refreshStageProgress() {
    if (!this.serverValidatedStages) return;
    const progress = await this.repositories.learning.getTopicStageProgress(this.currentUser.id, this.lesson.id);
    this.stageProgress = Object.fromEntries(progress.map(item => [item.stageKey, item.status]));
  }

  async completeCurrentStage(status = 'completed') {
    const stage = this.stages[this.currentStageIndex];
    if (!stage) return;
    if (stage.id === 'check' && this.quizSubmissionPromise) await this.quizSubmissionPromise;
    if (status === 'completed' && !this.canCompleteCurrentStage() && !this.isStageComplete(stage.id)) {
      showToast({
        title: 'Tahapan belum selesai',
        message: 'Selesaikan semua aktivitas tahap ini sebelum melanjutkan.',
        type: 'warning'
      });
      return;
    }

    try {
      if (this.serverValidatedStages) {
        await this.repositories.learning.completeTopicStage(this.currentUser.id, this.lesson.id, stage.id, status);
        await this.refreshStageProgress();
      } else {
        this.stageProgress[stage.id] = status;
      }
      this.renderStageNav();
      if (status === 'skipped') {
        showToast({ title: 'Tahapan dilewati', message: 'Tahapan opsional ditandai dilewati.', type: 'info' });
      }
      if (this.currentStageIndex < this.stages.length - 1) {
        this.goToStage(this.currentStageIndex + 1);
      } else {
        this.renderStageContent();
      }
    } catch (error) {
      console.error('Topic stage completion failed:', error);
      showToast({
        title: 'Tahapan belum tersimpan',
        message: error instanceof Error ? error.message : 'Tahapan belajar gagal disimpan.',
        type: 'error'
      });
    }
  }

  attachStageEvents() {
    const area = this.container.querySelector('#stage-content-area');
    if (!area) return;

    // Stage navigation buttons
    const prevBtn = area.querySelector('#btn-stage-prev');
    const nextBtn = area.querySelector('#btn-stage-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToStage(this.currentStageIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => { void this.completeCurrentStage(); });
    const skipBtn = area.querySelector('#btn-stage-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => { void this.completeCurrentStage('skipped'); });

    // Sequential comprehension quiz navigation: reveal the next question only
    // after the current answer has been checked.
    const quizNext = area.querySelector('[data-quiz-next]');
    if (quizNext) {
      quizNext.addEventListener('click', () => {
        const questions = this.stages.find(stage => stage.id === 'check')?.questions || [];
        if (!this.checkedQuizQuestionIndexes.has(this.currentCheckQuestionIndex)) return;
        const nextIndex = this.currentCheckQuestionIndex + 1;
        if (nextIndex >= questions.length) return;
        this.currentCheckQuestionIndex = nextIndex;
        this.renderStageContent();
      });
    }

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
            message: `Masukkan tautan proyek ${this.lesson.requiredTool?.name || ''} sebelum mengirim.`.trim(),
            type: 'warning'
          });
          if (linkInput) linkInput.focus();
          return;
        }

        if (!this.isValidSubmissionUrl(link)) {
          showToast({
            title: 'Tautan Tidak Valid',
            message: this.lesson.requiredTool?.name
              ? `Gunakan tautan proyek dari ${this.lesson.requiredTool.name} yang diawali https:// atau http://.`
              : 'Harap masukkan URL yang sah (diawali https:// atau http://).',
            type: 'error'
          });
          if (linkInput) linkInput.focus();
          return;
        }

        submitBtn.disabled = true;
        try {
          const submittedAt = new Date().toISOString();
          const practiceStage = this.stages.find(stage => stage.id === 'practice');
          const practiceCheckpoints = practiceStage?.content?.checkpoints || [];
          const checkpointsTotal = practiceCheckpoints.length;
          const checkpointsPassed = practiceCheckpoints.filter(checkpoint => this.checkpointStates[checkpoint.id] === true).length;
          const subRecord = await this.repositories.learning.saveSubmission({
            studentId: this.currentUser.id,
            studentName: this.currentUser.name,
            studentAvatar: this.currentUser.avatar || 'AP',
            lessonId: this.lesson.id,
            lessonTitle: this.lesson.title,
            projectUrl: link,
            studentNotes: notes,
            status: 'submitted',
            checkpointsPassed,
            checkpointsTotal,
            // The authoritative quiz score is stored in topic_quiz_attempts.
            quizScore: this.quizAttemptHistory.length
              ? Math.max(...this.quizAttemptHistory.map(attempt => attempt.score))
              : null,
            submittedAt
          });
          if (!subRecord) throw new Error('Data proyek belum berhasil disimpan.');
          this.activeStoreSubmission = subRecord;
          this.submissionData = { link, notes, submittedAt }; 
          this.progressState = 'submitted';
          await this.refreshStageProgress();
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
      draftBtn.addEventListener('click', async () => {
        const linkInput = area.querySelector('#submission-link');
        const notesInput = area.querySelector('#submission-notes');
        const link = linkInput ? linkInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        draftBtn.disabled = true;
        try {
          const saved = await this.saveProgress({
            submission: { link, notes, isDraft: true }
          });
          if (!saved) return;

          showToast({
            title: 'Draf Disimpan',
            message: 'Tautan dan catatan belajar tersimpan pada akun Supabase ini.',
            type: 'info'
          });
        } finally {
          if (draftBtn.isConnected) draftBtn.disabled = false;
        }
      });
    }
  }

  goToSlide(index) {
    const stage = this.stages[this.currentStageIndex];
    if (!stage || stage.id !== 'materials') return;
    const slides = stage.slides || [];
    if (index < 0 || index >= slides.length) return;
    if (this.serverValidatedStages && index > this.maxSlideIndex + 1) return;

    this.currentSlideIndex = index;
    this.visitedSlides.add(index);
    this.saveProgress({ slideIndex: index });

    this.renderStageContent();
  }

  isValidSubmissionUrl(value) {
    try {
      const submitted = new URL(value);
      if (!['http:', 'https:'].includes(submitted.protocol)) return false;
      const requiredToolUrl = this.lesson.requiredTool?.url;
      if (!requiredToolUrl) return true;
      const requiredHost = new URL(requiredToolUrl).hostname.replace(/^www\\./i, '').toLowerCase();
      const submittedHost = submitted.hostname.replace(/^www\\./i, '').toLowerCase();
      return submittedHost === requiredHost || submittedHost.endsWith(`.${requiredHost}`);
    } catch {
      return false;
    }
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
