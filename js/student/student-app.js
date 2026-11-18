/**
 * B2B LEARNING ENGINE - STUDENT APPLICATION ENTRYPOINT
 * Multi-page architecture (Stage 2: Student Migration).
 * Phase 4: Integrated AuthService + DemoAccountSwitcher + parent role routing.
 * Adheres strictly to Section 4, 5, 6, 7, 8, 9, 14 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

import { Theme } from '../theme.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { MockService } from '../services/mock-service.js';
import { LessonWorkspace } from '../lesson-workspace.js';
import { StateStore } from '../services/state-store.js';
import { SessionStore } from '../services/session-store.js';
import { IdentityStore } from '../services/identity-store.js';
import { AuthService } from '../services/auth-service.js';
import { AccessControl } from '../services/access-control.js';
import { DemoAccountSwitcher } from '../components/demo-account-switcher.js';

class StudentApp {
  constructor() {
    this.currentUser = null;
    this.lessonWorkspace = null;
    this.lessonData = null;
    this.demoSwitcher = null;
  }

  async init() {
    console.log('🚀 Initializing Standalone Student Experience (student.html)...');

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

    // 3. Initialize Overlay Handlers (Modal only; no teacher drawer on student page)
    Modal.initGlobalTriggers();

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

    // 5. Load User & Student Data
    await this.initStudentData();

    // 6. Initialize Student Sidebar Navigation
    this.initSidebarNavigation();

    // 7. Hash navigation support
    this.initHashRouting();

    // Expose stores on window for debugging & reactive test integration
    if (typeof window !== 'undefined') {
      window.StateStore = StateStore;
      window.SessionStore = SessionStore;
      window.IdentityStore = IdentityStore;
      window.AuthService = AuthService;
      window.AccessControl = AccessControl;
    }

    console.log('✅ Standalone Student Experience ready.');
  }

  async initStudentData() {
    // Resolve current user from AuthService session (Phase 4)
    let sessionData = null;
    try { sessionData = AuthService.getCurrentSession(); } catch (e) { /* ignore */ }

    if (sessionData && sessionData.user) {
      const role = sessionData.user.role;

      // Guard: tutor/admin should not use student page (redirect hint)
      if (role === 'tutor' || role === 'teacher' || role === 'admin') {
        const studentContainer = document.getElementById('student-container');
        if (studentContainer) {
          const target = (role === 'admin') ? 'index.html#admin-accounts' : 'teacher.html';
          studentContainer.innerHTML = `
            <div class="card" style="padding: var(--space-8); text-align: center; max-width: 480px; margin: var(--space-8) auto;">
              <div style="font-size: 48px; margin-bottom: var(--space-4);" aria-hidden="true">⛔</div>
              <h2 style="color: var(--color-error); font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Akses Ditolak</h2>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
                Halaman ini untuk <strong>Siswa</strong> atau <strong>Orang Tua</strong>.<br>
                Anda masuk sebagai <strong>${sessionData.user.displayName}</strong> (${role}).
              </p>
              <a href="${target}" class="btn btn-primary btn-sm">Pergi ke Halaman Sesuai Peran →</a>
            </div>
          `;
        }
        this.currentUser = {
          id: sessionData.user.id,
          name: sessionData.user.displayName || 'Pengguna',
          avatar: sessionData.user.avatar || '??',
          role: role
        };
        this.updateUserDisplay();
        return;
      }

      // Parent role: resolve linked child as effective student
      if (role === 'parent') {
        const parentId = sessionData.user.id;
        const linkedChildren = IdentityStore.getParentStudents(parentId);
        const activeChild = linkedChildren.find(c => c.status === 'active') || linkedChildren[0];

        if (!activeChild) {
          // No linked children: show empty state
          const studentContainer = document.getElementById('student-container');
          if (studentContainer) {
            studentContainer.innerHTML = `
              <div class="card" style="padding: var(--space-8); text-align: center; max-width: 480px; margin: var(--space-8) auto;">
                <div style="font-size: 48px; margin-bottom: var(--space-4);" aria-hidden="true">👨‍👩‍👧</div>
                <h2 style="font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Belum Ada Anak Terhubung</h2>
                <p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
                  Akun <strong>${sessionData.user.displayName}</strong> belum memiliki relasi siswa.<br>
                  Hubungi Admin untuk menghubungkan akun anak Anda.
                </p>
              </div>
            `;
          }
          this.currentUser = {
            id: sessionData.user.id,
            name: sessionData.user.displayName || 'Orang Tua',
            avatar: sessionData.user.avatar || 'OT',
            role: 'parent'
          };
          this.updateUserDisplay();
          return;
        }

        // Parent is accessing as observer of their child
        this.currentUser = {
          id: activeChild.id,
          name: activeChild.displayName || activeChild.name || 'Siswa',
          avatar: activeChild.avatar || 'AP',
          role: 'student',
          gradeLevel: activeChild.gradeLevel || 'Grade 5',
          // parent context
          _parentId: parentId,
          _parentName: sessionData.user.displayName,
          _isParentView: true
        };

        this.updateUserDisplay(sessionData.user);

        // Seed submissions store
        try {
          const submissions = await MockService.fetchSubmissions();
          StateStore.seedSubmissionsIfEmpty(submissions);
        } catch (err) { /* ignore */ }

        // For parent: go directly to parent-hub view
        const studentContainer = document.getElementById('student-container');
        if (studentContainer && this.lessonData === null) {
          this.lessonData = await MockService.fetchSampleLesson().catch(() => null);
        }
        if (studentContainer) {
          if (this.lessonWorkspace && typeof this.lessonWorkspace.destroy === 'function') {
            this.lessonWorkspace.destroy();
          }
          studentContainer.innerHTML = '';
          this.lessonWorkspace = new LessonWorkspace(studentContainer, this.lessonData, this.currentUser);
          this.lessonWorkspace.init();
          // Navigate directly to parent-hub for parent role
          this.lessonWorkspace.currentScreen = 'parent-hub';
          this.lessonWorkspace.render();
        }
        this.updatePageHeading('Ruang Orang Tua • Transparansi Belajar Siswa');
        return;
      }

      // Student role: normal flow
      this.currentUser = {
        id: sessionData.user.id,
        name: sessionData.user.displayName || sessionData.user.name || 'Siswa',
        avatar: sessionData.user.avatar || 'AP',
        role: 'student',
        gradeLevel: sessionData.user.gradeLevel || 'Grade 5'
      };
    } else {
      // No active session: sign in as default student Alex
      AuthService.signInDemo('usr_stu_001');
      const fallbackSession = AuthService.getCurrentSession();
      if (fallbackSession && fallbackSession.user) {
        this.currentUser = {
          id: fallbackSession.user.id,
          name: fallbackSession.user.displayName || 'Alex Pratama',
          avatar: fallbackSession.user.avatar || 'AP',
          role: 'student',
          gradeLevel: fallbackSession.user.gradeLevel || 'Grade 5'
        };
      } else {
        this.currentUser = { id: 'usr_stu_001', name: 'Alex Pratama', avatar: 'AP', role: 'student', gradeLevel: 'Grade 5' };
      }
    }

    this.updateUserDisplay();

    try {
      // Seed submissions store if not yet initialized
      const submissions = await MockService.fetchSubmissions();
      StateStore.seedSubmissionsIfEmpty(submissions);

      // Load sample lesson
      this.lessonData = await MockService.fetchSampleLesson();
      const studentContainer = document.getElementById('student-container');
      if (studentContainer && this.lessonData) {
        if (this.lessonWorkspace && typeof this.lessonWorkspace.destroy === 'function') {
          this.lessonWorkspace.destroy();
        }
        studentContainer.innerHTML = '';
        this.lessonWorkspace = new LessonWorkspace(studentContainer, this.lessonData, this.currentUser);
        this.lessonWorkspace.init();
      }
    } catch (err) {
      console.error('Gagal memuat data siswa:', err);
      const studentContainer = document.getElementById('student-container');
      if (studentContainer) {
        studentContainer.innerHTML = `
          <div class="card" style="padding: var(--space-6); text-align: center;">
            <p style="color: var(--color-error);">Terjadi kesalahan saat memuat materi pembelajaran.</p>
          </div>
        `;
      }
    }
  }

  /**
   * @param {Object} [overrideUser] - For parent view, show parent name in header
   */
  updateUserDisplay(overrideUser = null) {
    if (!this.currentUser && !overrideUser) return;
    const displayUser = overrideUser || this.currentUser;
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleLabelEl = document.getElementById('user-role-label');

    const displayName = displayUser.displayName || displayUser.name || 'Pengguna';
    const avatar = displayUser.avatar || displayName.substring(0, 2).toUpperCase();
    const role = displayUser.role;

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = avatar;
    if (roleLabelEl) {
      if (role === 'parent') {
        const childName = this.currentUser ? (this.currentUser.name || '') : '';
        roleLabelEl.textContent = `Orang Tua${childName ? ` • ${childName}` : ''}`;
      } else {
        const grade = (this.currentUser && this.currentUser.gradeLevel) ? this.currentUser.gradeLevel : 'Grade 5';
        roleLabelEl.textContent = `Siswa • ${grade}`;
      }
    }
  }

  initSidebarNavigation() {
    const navDashboard = document.querySelector('[data-student-nav="dashboard"]');
    const navMission = document.querySelector('[data-student-nav="mission"]');
    const navParentHub = document.querySelector('[data-student-nav="parent-hub"]');

    if (navDashboard) {
      navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'dashboard';
          this.lessonWorkspace.render();
          this.updateActiveNav(navDashboard);
          this.updatePageHeading('Ruang Belajar Siswa • Quest Map');
        }
      });
    }

    if (navMission) {
      navMission.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'workspace';
          this.lessonWorkspace.render();
          this.updateActiveNav(navMission);
          this.updatePageHeading('Ruang Belajar Siswa • Scratch Starter Adventure');
        }
      });
    }

    if (navParentHub) {
      navParentHub.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'parent-hub';
          this.lessonWorkspace.render();
          this.updateActiveNav(navParentHub);
          this.updatePageHeading('Ruang Orang Tua • Transparansi Belajar Siswa');
        }
      });
    }
  }

  initHashRouting() {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const navDashboard = document.querySelector('[data-student-nav="dashboard"]');
      const navMission = document.querySelector('[data-student-nav="mission"]');
      const navParentHub = document.querySelector('[data-student-nav="parent-hub"]');

      if (hash === 'parent-hub' || hash === 'parenthub') {
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'parent-hub';
          this.lessonWorkspace.render();
          this.updateActiveNav(navParentHub);
          this.updatePageHeading('Ruang Orang Tua • Transparansi Belajar Siswa');
        }
      } else if (hash === 'mission' || hash === 'workspace' || hash === 'lesson') {
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'workspace';
          this.lessonWorkspace.render();
          this.updateActiveNav(navMission);
          this.updatePageHeading('Ruang Belajar Siswa • Scratch Starter Adventure');
        }
      } else if (hash === 'dashboard' || hash === 'quest') {
        if (this.lessonWorkspace) {
          this.lessonWorkspace.currentScreen = 'dashboard';
          this.lessonWorkspace.render();
          this.updateActiveNav(navDashboard);
          this.updatePageHeading('Ruang Belajar Siswa • Quest Map');
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    // If initial hash is present
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

// Auto-boot application in browser environment
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new StudentApp();
    app.init();
    if (typeof window !== 'undefined') {
      window.studentApp = app;
    }
  });
}

export { StudentApp };
