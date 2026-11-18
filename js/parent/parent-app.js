/**
 * B2B LEARNING ENGINE - PARENT HUB APPLICATION ENTRYPOINT (PHASE 4.5)
 * Dedicated, read-only Parent Transparency Hub.
 * Adheres strictly to Section 4, 5, 8, 12, 13, 14 of PROJECT_RULES.md.
 * 100% Semantic Design Tokens - Zero Hardcoded Colors.
 */

import { Theme } from '../theme.js';
import { showToast } from '../components/toast.js';
import { IdentityStore } from '../services/identity-store.js';
import { AuthService } from '../services/auth-service.js';
import { AccessControl } from '../services/access-control.js';
import { ParentHubView } from '../student/parent-hub.js';

class ParentApp {
  constructor() {
    this.currentUser = null;
    this.linkedChild = null;
    this.parentHubView = null;
  }

  async init() {
    console.log('🚀 Initializing Standalone Parent Hub (parent.html)...');

    // 0. Expose global services for test runners
    if (typeof window !== 'undefined') {
      window.IdentityStore = IdentityStore;
      window.AuthService = AuthService;
      window.AccessControl = AccessControl;
    }

    // 1. Ensure IdentityStore is seeded
    IdentityStore.seedIfEmpty();

    // 2. Initialize Theme Engine (Light/Dark mode)
    Theme.init();
    Theme.initMobileMenu();
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = Theme.toggle();
        showToast({
          title: 'Tema Diganti',
          message: `Sekarang menggunakan tema ${nextTheme === 'dark' ? 'Gelap (Dark Mode)' : 'Terang (Light Mode)'}.`,
          type: 'info',
          duration: 2500
        });
      });
    }

    // 3. Bind Logout button
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

    // 4. Initialize Data & Access Control Guard
    await this.initParentData();

    // 5. Initialize Sidebar Navigation
    this.initSidebarNavigation();

    // 6. Support Hash Routing
    this.initHashRouting();

    console.log('✅ Standalone Parent Hub ready.');
  }

  async initParentData() {
    const parentContainer = document.getElementById('parent-container');
    const session = AuthService.getCurrentSession();
    this.currentUser = session ? session.user : null;

    // RBAC Guard: only parent (and admin) can access parent.html
    const check = AccessControl.canAccessView(this.currentUser, 'parent.html');
    if (!check.allowed) {
      if (parentContainer) {
        parentContainer.innerHTML = `
          <div class="card" style="padding: var(--space-8); text-align: center; max-width: 480px; margin: var(--space-8) auto;">
            <div style="font-size: 48px; margin-bottom: var(--space-4);" aria-hidden="true">⛔</div>
            <h2 style="color: var(--color-error); font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Akses Ditolak</h2>
            <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
              ${check.reason || 'Halaman ini khusus untuk Orang Tua.'}<br>
              ${this.currentUser ? `Anda masuk sebagai <strong>${this.currentUser.displayName}</strong> (${this.currentUser.role}).` : 'Silakan masuk terlebih dahulu.'}
            </p>
            <a href="index.html" class="btn btn-primary btn-sm">Kembali ke Halaman Masuk →</a>
          </div>
        `;
      }
      return;
    }

    // Resolve linked children
    if (this.currentUser.role === 'parent') {
      const children = IdentityStore.getParentStudents(this.currentUser.id);
      this.linkedChild = children.find((c) => c.status === 'active') || children[0] || null;

      if (!this.linkedChild) {
        if (parentContainer) {
          parentContainer.innerHTML = `
            <div class="card" style="padding: var(--space-8); text-align: center; max-width: 480px; margin: var(--space-8) auto;">
              <div style="font-size: 48px; margin-bottom: var(--space-4);" aria-hidden="true">👨‍👩‍👧</div>
              <h2 style="font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Belum Ada Anak Terhubung</h2>
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
                Akun <strong>${this.currentUser.displayName}</strong> belum memiliki relasi siswa terdaftar.<br>
                Silakan hubungi Administrator untuk menghubungkan akun anak Anda.
              </p>
              <a href="index.html" class="btn btn-secondary btn-sm">Kembali ke Portal →</a>
            </div>
          `;
        }
        this.updateHeaderDisplay();
        return;
      }
    } else if (this.currentUser.role === 'admin') {
      // Admin preview mode
      this.linkedChild = IdentityStore.getUserById('usr_stu_001') || {
        id: 'usr_stu_001',
        name: 'Alex Pratama',
        gradeLevel: 'Grade 5'
      };
    }

    this.updateHeaderDisplay();

    // Mount ParentHubView
    if (parentContainer && this.linkedChild) {
      parentContainer.innerHTML = '';
      this.parentHubView = new ParentHubView(parentContainer, {
        id: this.linkedChild.id,
        name: this.linkedChild.displayName || this.linkedChild.name || 'Siswa',
        avatar: this.linkedChild.avatar || 'AP',
        gradeLevel: this.linkedChild.gradeLevel || 'Grade 5'
      });
      await this.parentHubView.init();
    }
  }

  updateHeaderDisplay() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleLabelEl = document.getElementById('user-role-label');

    if (nameEl) nameEl.textContent = this.currentUser.displayName || this.currentUser.name || 'Orang Tua';
    if (avatarEl) avatarEl.textContent = this.currentUser.avatar || 'OT';
    if (roleLabelEl) {
      const childName = this.linkedChild ? (this.linkedChild.displayName || this.linkedChild.name || '') : '';
      roleLabelEl.textContent = childName ? `Orang Tua • ${childName}` : 'Orang Tua';
    }
  }

  initSidebarNavigation() {
    const navOverview = document.querySelector('[data-parent-nav="overview"]');
    const navSessions = document.querySelector('[data-parent-nav="sessions"]');
    const navWeekly = document.querySelector('[data-parent-nav="weekly"]');
    const navMonthly = document.querySelector('[data-parent-nav="monthly"]');

    const handleTabSwitch = (tab, linkEl) => {
      if (this.parentHubView) {
        this.parentHubView.activeTab = tab;
        this.parentHubView.render();
      }
      document.querySelectorAll('.app-sidebar .nav-link').forEach((l) => l.classList.remove('active'));
      if (linkEl) linkEl.classList.add('active');
    };

    if (navOverview) {
      navOverview.addEventListener('click', (e) => {
        e.preventDefault();
        handleTabSwitch('overview', navOverview);
      });
    }
    if (navSessions) {
      navSessions.addEventListener('click', (e) => {
        e.preventDefault();
        handleTabSwitch('sessions', navSessions);
      });
    }
    if (navWeekly) {
      navWeekly.addEventListener('click', (e) => {
        e.preventDefault();
        handleTabSwitch('weekly', navWeekly);
      });
    }
    if (navMonthly) {
      navMonthly.addEventListener('click', (e) => {
        e.preventDefault();
        handleTabSwitch('monthly', navMonthly);
      });
    }
  }

  initHashRouting() {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const navOverview = document.querySelector('[data-parent-nav="overview"]');
      const navSessions = document.querySelector('[data-parent-nav="sessions"]');
      const navWeekly = document.querySelector('[data-parent-nav="weekly"]');
      const navMonthly = document.querySelector('[data-parent-nav="monthly"]');

      if (hash === 'sessions' || hash === 'laporan') {
        if (this.parentHubView) {
          this.parentHubView.activeTab = 'sessions';
          this.parentHubView.render();
        }
        this.updateActiveNav(navSessions);
      } else if (hash === 'weekly' || hash === 'progres') {
        if (this.parentHubView) {
          this.parentHubView.activeTab = 'weekly';
          this.parentHubView.render();
        }
        this.updateActiveNav(navWeekly);
      } else if (hash === 'monthly' || hash === 'evaluasi') {
        if (this.parentHubView) {
          this.parentHubView.activeTab = 'monthly';
          this.parentHubView.render();
        }
        this.updateActiveNav(navMonthly);
      } else if (hash === 'overview' || hash === 'ringkasan') {
        if (this.parentHubView) {
          this.parentHubView.activeTab = 'overview';
          this.parentHubView.render();
        }
        this.updateActiveNav(navOverview);
      }
    };

    window.addEventListener('hashchange', handleHash);
    if (window.location.hash) {
      handleHash();
    }
  }

  updateActiveNav(activeEl) {
    document.querySelectorAll('.app-sidebar .nav-link').forEach((l) => l.classList.remove('active'));
    if (activeEl) activeEl.classList.add('active');
  }
}

// Auto-boot in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ParentApp();
    app.init();
    if (typeof window !== 'undefined') {
      window.parentApp = app;
    }
  });
}

export { ParentApp };
