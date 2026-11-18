/**
 * B2B LEARNING ENGINE - APPLICATION CORE
 * Coordinator for navigation, theme management, modal/drawer triggers,
 * mock data, Entry Portal, and Admin Workspace (Phase 1-4.5).
 * Adheres strictly to PROJECT_RULES.md.
 */

import { Theme } from './theme.js';
import { showToast } from './components/toast.js';
import { Modal } from './components/modal.js';
import { Drawer } from './components/drawer.js';
import { MockService } from './services/mock-service.js';
import { LessonWorkspace } from './lesson-workspace.js';
import { TeacherWorkspace } from './teacher-workspace.js';
import { AdminWorkspace } from './admin/admin-workspace.js';
import { IdentityStore } from './services/identity-store.js';
import { AuthService } from './services/auth-service.js';
import { AccessControl } from './services/access-control.js';
import { DemoAccountSwitcher } from './components/demo-account-switcher.js';

class App {
  constructor() {
    this.currentView = 'view-entry';
    this.currentUser = null;
    this.lessonWorkspace = null;
    this.teacherWorkspace = null;
    this.adminWorkspace = null;
    this.demoSwitcher = null;
  }

  async init() {
    console.log('🚀 Initializing B2B Learning Engine Foundation (Phase 1-4.5)...');

    // 0. Expose global services immediately for reactive coordination & test runners
    if (typeof window !== 'undefined') {
      window.IdentityStore = IdentityStore;
      window.AuthService = AuthService;
      window.AccessControl = AccessControl;
    }

    // Ensure Identity Store is seeded
    IdentityStore.seedIfEmpty();

    // 1. Initialize Theme Engine (Light/Dark mode)
    Theme.init();
    Theme.initMobileMenu();
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = Theme.toggle();
        showToast({
          title: `Tema Diganti`,
          message: `Sekarang menggunakan tema ${nextTheme === 'dark' ? 'Gelap (Dark Mode)' : 'Terang (Light Mode)'}.`,
          type: 'info',
          duration: 2500
        });
      });
    }

    // 2. Initialize Overlay Handlers (Modal & Drawer)
    Modal.initGlobalTriggers();
    Drawer.initGlobalTriggers();

    // 3. Initialize Demo Account Switcher in Header (Entry Portal testing facility)
    const switcherMount = document.getElementById('demo-switcher-mount');
    if (switcherMount) {
      this.demoSwitcher = new DemoAccountSwitcher(switcherMount, {
        onSwitch: (session) => {
          this.currentUser = session ? session.user : null;
          this.updateUserDisplay();
          this.handleRoleSwitch(session ? session.role : null);
        }
      });
      this.demoSwitcher.init();
    }

    // 4. Bind Logout Button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AuthService.signOut();
        showToast({
          title: 'Sesi Selesai',
          message: 'Anda telah keluar dari akun.',
          type: 'info',
          duration: 2000
        });
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 300);
      });
    }

    // 5. Initialize Role Login Cards on Entry Screen
    this.initRoleLoginCards();

    // 6. Initialize Current Session & Auto-route
    const session = AuthService.getCurrentSession();
    this.currentUser = session ? session.user : null;

    // 7. Initialize Navigation Router
    this.initNavigation();

    // 8. Load Mock Data & initialize experiences (for legacy test compatibility)
    await this.initMockData();

    // 9. Initialize Admin Workspace
    this.initAdminExperience();

    // 10. Setup Interactive Verification Controls (Phase 1 Testing)
    this.setupVerificationControls();

    // 11. Initial View Selection based on auth state
    if (this.currentUser && this.currentUser.role === 'admin') {
      const adminLink = document.querySelector('[data-view-target="view-admin"]');
      this.switchView('view-admin', adminLink);
    } else if (window.location.hash === '#admin-accounts') {
      const adminLink = document.querySelector('[data-view-target="view-admin"]');
      if (adminLink) this.switchView('view-admin', adminLink);
    } else {
      const entryLink = document.querySelector('[data-view-target="view-entry"]');
      if (entryLink) this.switchView('view-entry', entryLink);
    }

    console.log('✅ B2B Learning Engine Core ready.');
  }

  initRoleLoginCards() {
    const roleButtons = document.querySelectorAll('[data-login-role]');
    roleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const role = btn.getAttribute('data-login-role');
        if (role === 'admin') {
          AuthService.signInDemo('usr_adm_001');
          this.currentUser = AuthService.getCurrentSession()?.user;
          this.updateUserDisplay();
          const adminLink = document.querySelector('[data-view-target="view-admin"]');
          if (adminLink) this.switchView('view-admin', adminLink);
          showToast({
            title: 'Masuk sebagai Admin',
            message: 'Selamat datang di Admin Workspace.',
            type: 'success',
            duration: 2500
          });
        } else if (role === 'tutor') {
          AuthService.signInDemo('usr_tea_001');
          window.location.href = 'teacher.html';
        } else if (role === 'student') {
          AuthService.signInDemo('usr_stu_001');
          window.location.href = 'student.html';
        } else if (role === 'parent') {
          AuthService.signInDemo('usr_par_001');
          window.location.href = 'parent.html';
        }
      });
    });
  }

  initNavigation() {
    const navLinks = document.querySelectorAll('[data-view-target]');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetViewId = link.getAttribute('data-view-target');
        this.switchView(targetViewId, link);
      });
    });

    // Hash navigation support
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'entry' || hash === 'portal') {
        const link = document.querySelector('[data-view-target="view-entry"]');
        if (link) this.switchView('view-entry', link);
      } else if (hash === 'admin-accounts') {
        const link = document.querySelector('[data-view-target="view-admin"]');
        if (link) this.switchView('view-admin', link);
      } else if (hash === 'foundation') {
        const link = document.querySelector('[data-view-target="view-foundation"]');
        if (link) this.switchView('view-foundation', link);
      } else if (hash === 'student-dashboard') {
        const link = document.querySelector('[data-view-target="view-student"]');
        if (link) this.switchView('view-student', link);
      } else if (hash === 'teacher-queue') {
        const link = document.querySelector('[data-view-target="view-teacher"]');
        if (link) this.switchView('view-teacher', link);
      }
    });
  }

  switchView(viewId, activeLinkEl) {
    const targetSection = document.getElementById(viewId);
    if (!targetSection) return;

    // Phase 4 RBAC Access Guard
    if (viewId === 'view-admin') {
      const check = AccessControl.canAccessView(this.currentUser, viewId);
      if (!check.allowed) {
        showToast({
          title: 'Akses Terbatas ⚠️',
          message: check.reason || 'Anda tidak memiliki hak akses ke halaman Administrator.',
          type: 'warning',
          duration: 4000
        });
        return;
      }
    }

    // Toggle active sections
    document.querySelectorAll('.view-section').forEach((sec) => sec.classList.remove('is-active'));
    targetSection.classList.add('is-active');
    this.currentView = viewId;

    // Update active nav link
    if (activeLinkEl) {
      document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
      activeLinkEl.classList.add('active');
    }

    // Update page heading
    const pageHeading = document.getElementById('page-heading');
    if (pageHeading) {
      if (viewId === 'view-entry') {
        pageHeading.textContent = 'Portal Masuk • Bits2Bytes Learning Engine';
      } else if (viewId === 'view-foundation') {
        pageHeading.textContent = 'Phase 1 • Design Tokens & Shell Foundation';
      } else if (viewId === 'view-student') {
        pageHeading.textContent = 'Ruang Belajar Siswa • Scratch Starter Adventure';
      } else if (viewId === 'view-teacher') {
        pageHeading.textContent = 'Teacher Workspace • Ringkasan Kelas & Antrean Submission';
        if (this.teacherWorkspace) {
          this.teacherWorkspace.render();
        }
      } else if (viewId === 'view-admin') {
        pageHeading.textContent = 'Admin Workspace • Manajemen Identitas & Hak Akses Pengguna';
        if (this.adminWorkspace) {
          this.adminWorkspace.render();
        }
      }
    }
  }

  handleRoleSwitch(role) {
    if (!role) return;
    if (role === 'admin') {
      const link = document.querySelector('[data-view-target="view-admin"]');
      if (link) this.switchView('view-admin', link);
    } else if (role === 'tutor' || role === 'teacher') {
      window.location.href = 'teacher.html';
    } else if (role === 'student') {
      window.location.href = 'student.html';
    } else if (role === 'parent') {
      window.location.href = 'parent.html';
    }
  }

  async initMockData() {
    try {
      this.updateUserDisplay();

      // Initialize Student Experience (for legacy test compatibility)
      const lessonData = await MockService.fetchSampleLesson();
      this.initStudentExperience(lessonData);

      // Initialize Teacher Experience (for legacy test compatibility)
      this.initTeacherExperience();
    } catch (err) {
      console.error('Gagal memuat mock data:', err);
    }
  }

  initStudentExperience(lessonData) {
    const studentContainer = document.getElementById('student-container');
    if (!studentContainer || !lessonData) return;

    this.lessonWorkspace = new LessonWorkspace(studentContainer, lessonData);
    this.lessonWorkspace.init();
  }

  initTeacherExperience() {
    const teacherContainer = document.getElementById('teacher-container');
    if (!teacherContainer) return;

    this.teacherWorkspace = new TeacherWorkspace(teacherContainer);
    this.teacherWorkspace.init();
  }

  initAdminExperience() {
    const adminContainer = document.getElementById('admin-container');
    if (!adminContainer) return;

    this.adminWorkspace = new AdminWorkspace(adminContainer);
    this.adminWorkspace.init();
  }

  updateUserDisplay() {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleLabelEl = document.getElementById('user-role-label');

    if (!this.currentUser) {
      if (nameEl) nameEl.textContent = 'Pilih Akun Demo';
      if (avatarEl) avatarEl.textContent = 'B2B';
      if (roleLabelEl) roleLabelEl.textContent = 'Simulasi Multiperan';
      return;
    }

    if (nameEl) nameEl.textContent = this.currentUser.displayName || this.currentUser.name || 'Pengguna';
    if (avatarEl) avatarEl.textContent = this.currentUser.avatar || 'U';
    if (roleLabelEl) {
      const roleMap = { student: 'Siswa', tutor: 'Tutor', teacher: 'Tutor', parent: 'Orang Tua', admin: 'Administrator' };
      roleLabelEl.textContent = roleMap[this.currentUser.role] || this.currentUser.role;
    }
  }

  setupVerificationControls() {
    // Toast Demo Triggers
    const btnSuccess = document.getElementById('btn-toast-success');
    const btnError = document.getElementById('btn-toast-error');
    const btnWarning = document.getElementById('btn-toast-warning');
    const btnInfo = document.getElementById('btn-toast-info');

    if (btnSuccess) {
      btnSuccess.addEventListener('click', () => {
        showToast({
          title: 'Praktik Selesai Disimpan',
          message: 'Checkpoint latihan berhasil divalidasi dan progres tersimpan.',
          type: 'success'
        });
      });
    }

    if (btnError) {
      btnError.addEventListener('click', () => {
        showToast({
          title: 'Submission Gagal',
          message: 'Tautan proyek Scratch tidak valid atau belum berstatus publik.',
          type: 'error'
        });
      });
    }

    if (btnWarning) {
      btnWarning.addEventListener('click', () => {
        showToast({
          title: 'Perhatian: Ada Perubahan Belum Disimpan',
          message: 'Pastikan kode blok pada Scratch telah sesuai instruksi sebelum lanjut.',
          type: 'warning'
        });
      });
    }

    if (btnInfo) {
      btnInfo.addEventListener('click', () => {
        showToast({
          title: 'Petunjuk Latihan',
          message: 'Gunakan blok "change x by 10" untuk menggerakkan sprite ke kanan.',
          type: 'info'
        });
      });
    }

    // Modal Confirmation Action
    const btnModalConfirm = document.getElementById('btn-modal-confirm');
    if (btnModalConfirm) {
      btnModalConfirm.addEventListener('click', () => {
        Modal.close('sample-modal');
        showToast({
          title: 'Aksi Dikonfirmasi',
          message: 'Dialog modal berhasil ditutup dan aksi dieksekusi.',
          type: 'success'
        });
      });
    }
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  if (typeof window !== 'undefined') {
    window.app = app;
  }
});

export { App };
