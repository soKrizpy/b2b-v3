/**
 * B2B LEARNING ENGINE - TEACHER APPLICATION ENTRYPOINT
 * Multi-page architecture (Stage 3: Teacher Migration).
 * Phase 4: Integrated AuthService + DemoAccountSwitcher + AccessControl.
 * Adheres strictly to Section 4, 5, 10, 12, 13 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

import { Theme } from '../theme.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { Drawer } from '../components/drawer.js';
import { MockService } from '../services/mock-service.js';
import { TeacherWorkspace } from '../teacher-workspace.js';
import { StateStore } from '../services/state-store.js';
import { SessionStore } from '../services/session-store.js';
import { IdentityStore } from '../services/identity-store.js';
import { AuthService } from '../services/auth-service.js';
import { AccessControl } from '../services/access-control.js';
import { DemoAccountSwitcher } from '../components/demo-account-switcher.js';

class TeacherApp {
  constructor() {
    this.currentUser = null;
    this.teacherWorkspace = null;
    this.demoSwitcher = null;
  }

  async init() {
    console.log('🚀 Initializing Standalone Teacher Experience (teacher.html)...');

    // 1. Seed IdentityStore before anything else
    IdentityStore.seedIfEmpty();

    // 2. Initialize Theme Engine (Light/Dark mode)
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

    // 3. Initialize Overlay Handlers (Modal & Contextual Review Drawer)
    Modal.initGlobalTriggers();
    Drawer.initGlobalTriggers();

    // 4. Bind Logout Button (Phase 4.5 Clean Navigation)
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

    // 5. Load Teacher User & Workspace Data
    await this.initTeacherData();

    // 6. Initialize Teacher Sidebar Navigation
    this.initSidebarNavigation();

    // 7. Hash navigation support
    this.initHashRouting();

    // 8. Expose globals for debugging & test runners
    if (typeof window !== 'undefined') {
      window.IdentityStore = IdentityStore;
      window.AuthService = AuthService;
      window.AccessControl = AccessControl;
      window.StateStore = StateStore;
      window.SessionStore = SessionStore;
    }

    console.log('✅ Standalone Teacher Experience ready.');
  }

  async initTeacherData() {
    // Resolve current user from AuthService session (Phase 4)
    let sessionData = null;
    try { sessionData = AuthService.getCurrentSession(); } catch (e) { /* ignore */ }

    if (sessionData && sessionData.user) {
      const role = sessionData.user.role;
      // Guard: only tutor/admin can access teacher workspace
      if (role !== 'tutor' && role !== 'teacher' && role !== 'admin') {
        const teacherContainer = document.getElementById('teacher-container');
        if (teacherContainer) {
          teacherContainer.innerHTML = `
            <div class="card" style="padding: var(--space-8); text-align: center; max-width: 480px; margin: var(--space-8) auto;">
              <div style="font-size: 48px; margin-bottom: var(--space-4);" aria-hidden="true">⛔</div>
              <h2 style="color: var(--color-error); font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Akses Ditolak</h2>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
                Halaman ini hanya dapat diakses oleh <strong>Tutor</strong>.<br>
                Anda sedang masuk sebagai <strong>${sessionData.user.displayName}</strong> (${role}).
              </p>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-xs);">
                Silakan beralih akun melalui DEMO MODE switcher di atas.
              </p>
            </div>
          `;
        }
        this.currentUser = {
          id: sessionData.user.id,
          name: sessionData.user.displayName || sessionData.user.name || 'Pengguna',
          avatar: sessionData.user.avatar || '??',
          role: sessionData.user.role
        };
        this.updateUserDisplay();
        return;
      }

      this.currentUser = {
        id: sessionData.user.id,
        name: sessionData.user.displayName || sessionData.user.name || 'Tutor',
        avatar: sessionData.user.avatar || (sessionData.user.displayName || 'TU').substring(0, 2).toUpperCase(),
        role: sessionData.user.role,
        email: sessionData.user.email
      };
    } else {
      // No active session: sign in as default tutor for teacher page
      AuthService.signInDemo('usr_tea_001');
      const fallbackSession = AuthService.getCurrentSession();
      if (fallbackSession && fallbackSession.user) {
        this.currentUser = {
          id: fallbackSession.user.id,
          name: fallbackSession.user.displayName || 'Kak Sarah',
          avatar: fallbackSession.user.avatar || 'KS',
          role: fallbackSession.user.role || 'tutor',
          email: fallbackSession.user.email
        };
      } else {
        this.currentUser = { id: 'usr_tea_001', name: 'Kak Sarah', avatar: 'KS', role: 'tutor' };
      }
    }

    this.updateUserDisplay();

    try {
      // Seed Unified State Store if empty
      try {
        const rawSubmissions = await MockService.fetchSubmissions();
        StateStore.seedSubmissionsIfEmpty(rawSubmissions);
      } catch (seedErr) {
        console.warn('TeacherApp: Seed submission store dilewati:', seedErr);
      }

      // Mount Teacher Workspace
      const teacherContainer = document.getElementById('teacher-container');
      if (teacherContainer) {
        // Destroy previous instance if re-initializing
        if (this.teacherWorkspace && typeof this.teacherWorkspace.destroy === 'function') {
          this.teacherWorkspace.destroy();
        }
        teacherContainer.innerHTML = '';
        this.teacherWorkspace = new TeacherWorkspace(teacherContainer, {
          currentUser: this.currentUser
        });
        await this.teacherWorkspace.init();
      }
    } catch (err) {
      console.error('Gagal memuat data guru:', err);
      const teacherContainer = document.getElementById('teacher-container');
      if (teacherContainer) {
        teacherContainer.innerHTML = `
          <div class="card" style="padding: var(--space-6); text-align: center;">
            <p style="color: var(--color-error);">Terjadi kesalahan saat memuat Teacher Workspace.</p>
          </div>
        `;
      }
    }
  }

  updateUserDisplay() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleLabelEl = document.getElementById('user-role-label');

    const displayName = this.currentUser.name || this.currentUser.displayName || 'Tutor';
    const avatar = this.currentUser.avatar || displayName.substring(0, 2).toUpperCase();
    const role = this.currentUser.role;

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = avatar;
    if (roleLabelEl) {
      roleLabelEl.textContent = role === 'admin'
        ? 'Admin • B2B Platform'
        : 'Guru • Scratch Starter';
    }
  }

  initSidebarNavigation() {
    const navDashboard = document.querySelector('[data-teacher-nav="dashboard"]');
    const navStudents = document.querySelector('[data-teacher-nav="students"]');
    const navSubmissions = document.querySelector('[data-teacher-nav="submissions"]');
    const navSessionReports = document.querySelector('[data-teacher-nav="session-reports"]');

    if (navDashboard) {
      navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'dashboard';
          this.teacherWorkspace.render();
          this.updateActiveNav(navDashboard);
          this.updatePageHeading('Teacher Workspace • Ringkasan Kelas & Antrean Submission');
        }
      });
    }

    if (navStudents) {
      navStudents.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'students';
          this.teacherWorkspace.render();
          this.updateActiveNav(navStudents);
          this.updatePageHeading('Teacher Workspace • Manajemen Siswa');
        }
      });
    }

    if (navSubmissions) {
      navSubmissions.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'submissions';
          this.teacherWorkspace.render();
          this.updateActiveNav(navSubmissions);
          this.updatePageHeading('Teacher Workspace • Antrean Submission Lengkap');
        }
      });
    }

    if (navSessionReports) {
      navSessionReports.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'session-reports';
          this.teacherWorkspace.render();
          this.updateActiveNav(navSessionReports);
          this.updatePageHeading('Teacher Workspace • Pencatatan Laporan Sesi Pembelajaran');
        }
      });
    }
  }

  initHashRouting() {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const navDashboard = document.querySelector('[data-teacher-nav="dashboard"]');
      const navStudents = document.querySelector('[data-teacher-nav="students"]');
      const navSubmissions = document.querySelector('[data-teacher-nav="submissions"]');
      const navSessionReports = document.querySelector('[data-teacher-nav="session-reports"]');

      if (hash === 'session-reports' || hash === 'reports' || hash === 'laporan') {
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'session-reports';
          this.teacherWorkspace.render();
          this.updateActiveNav(navSessionReports);
          this.updatePageHeading('Teacher Workspace • Pencatatan Laporan Sesi Pembelajaran');
        }
      } else if (hash === 'students' || hash === 'siswa') {
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'students';
          this.teacherWorkspace.render();
          this.updateActiveNav(navStudents);
          this.updatePageHeading('Teacher Workspace • Manajemen Siswa');
        }
      } else if (hash === 'submissions' || hash === 'queue' || hash === 'antrean') {
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'submissions';
          this.teacherWorkspace.render();
          this.updateActiveNav(navSubmissions);
          this.updatePageHeading('Teacher Workspace • Antrean Submission Lengkap');
        }
      } else if (hash === 'dashboard' || hash === 'ringkasan') {
        if (this.teacherWorkspace) {
          this.teacherWorkspace.activeTab = 'dashboard';
          this.teacherWorkspace.render();
          this.updateActiveNav(navDashboard);
          this.updatePageHeading('Teacher Workspace • Ringkasan Kelas & Antrean Submission');
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    if (window.location.hash) {
      handleHash();
    }
  }

  updateActiveNav(activeEl) {
    document.querySelectorAll('.app-sidebar .nav-link').forEach((link) => {
      link.classList.remove('active');
    });
    if (activeEl) {
      activeEl.classList.add('active');
    }
  }

  updatePageHeading(title) {
    const pageHeading = document.getElementById('page-heading');
    if (pageHeading) {
      pageHeading.textContent = title;
    }
  }
}

// Auto-boot application
document.addEventListener('DOMContentLoaded', () => {
  const app = new TeacherApp();
  app.init();
  window.teacherApp = app;
});

export { TeacherApp };
