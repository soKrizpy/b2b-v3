/**
 * B2B LEARNING ENGINE - DEMO ACCOUNT SWITCHER COMPONENT (PHASE 4)
 * Allows instant role-switching between Admin, Tutor, Student, and Parent.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - 100% Semantic Design Tokens (Zero hardcoded colors).
 * - Clear "DEMO MODE" labeling to prevent misleading production claims.
 * - Accessible Modal Dialog for account selection.
 */

import { IdentityStore } from '../services/identity-store.js';
import { AuthService } from '../services/auth-service.js';
import { showToast } from './toast.js';

export class DemoAccountSwitcher {
  /**
   * @param {HTMLElement} targetEl - Container where switcher trigger is rendered
   * @param {Object} [options]
   * @param {Function} [options.onSwitch] - Callback when user switches account
   */
  constructor(targetEl, options = {}) {
    this.targetEl = targetEl;
    this.options = options;
    this.modalId = 'b2b-demo-switcher-modal';
  }

  init() {
    IdentityStore.seedIfEmpty();

    // If no active session, sign in as student Alex by default
    let session = AuthService.getCurrentSession();
    if (!session) {
      AuthService.signInDemo('usr_stu_001');
      session = AuthService.getCurrentSession();
    }

    this.renderTrigger();
    this.ensureModalInDOM();
    this.bindEvents();

    AuthService.subscribe((updatedSession) => {
      this.renderTrigger();
      if (this.options.onSwitch) {
        this.options.onSwitch(updatedSession);
      }
    });
  }

  renderTrigger() {
    if (!this.targetEl) return;
    const session = AuthService.getCurrentSession();
    const user = session ? session.user : { displayName: 'Tamu', role: 'none', avatar: '?' };

    const roleBadges = {
      admin: '<span class="badge badge-warning" style="font-size: 10px;">Admin</span>',
      tutor: '<span class="badge badge-scratch" style="font-size: 10px;">Tutor</span>',
      teacher: '<span class="badge badge-scratch" style="font-size: 10px;">Tutor</span>',
      student: '<span class="badge badge-approved" style="font-size: 10px;">Siswa</span>',
      parent: '<span class="badge badge-in-progress" style="font-size: 10px;">Orang Tua</span>'
    };

    const roleLabel = roleBadges[user.role] || `<span class="badge">${user.role}</span>`;

    this.targetEl.innerHTML = `
      <div class="demo-switcher-pill-wrapper" style="display: flex; align-items: center; gap: var(--space-2);">
        <span class="badge badge-warning" style="font-size: 10px; font-weight: var(--font-weight-bold); letter-spacing: 0.05em;">
          DEMO MODE
        </span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-open-demo-switcher" aria-haspopup="dialog" style="display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3);">
          <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: var(--radius-full); background: var(--color-primary); color: var(--color-text-inverse); text-align: center; font-size: 10px; font-weight: bold;">
            ${user.avatar || 'U'}
          </span>
          <span style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-xs); color: var(--color-text-primary);">
            ${escapeHtml(user.displayName)}
          </span>
          ${roleLabel}
          <span style="font-size: 10px; color: var(--color-text-muted);" aria-hidden="true">▼</span>
        </button>
      </div>
    `;

    const openBtn = this.targetEl.querySelector('#btn-open-demo-switcher');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openModal());
    }
  }

  ensureModalInDOM() {
    let modal = document.getElementById(this.modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this.modalId;
      modal.className = 'modal-backdrop';
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', `${this.modalId}-title`);
      document.body.appendChild(modal);
    }
  }

  openModal() {
    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    const currentSession = AuthService.getCurrentSession();
    const currentUserId = currentSession?.user?.id;
    const users = IdentityStore.getAllUsers();

    // Group users by role
    const admins = users.filter((u) => u.role === 'admin');
    const tutors = users.filter((u) => u.role === 'tutor' || u.role === 'teacher');
    const students = users.filter((u) => u.role === 'student');
    const parents = users.filter((u) => u.role === 'parent');

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 640px; width: 92%; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
              <span class="badge badge-warning" style="font-size: 10px;">Simulasi Akses Lokal</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Phase 4 RBAC</span>
            </div>
            <h3 class="modal-title" id="${this.modalId}-title">Pilih Akun Demo Bits2Bytes</h3>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-close-demo-modal" aria-label="Tutup dialog">✕</button>
        </div>

        <div class="modal-body" style="overflow-y: auto; padding: var(--space-4) var(--space-6); display: flex; flex-direction: column; gap: var(--space-4);">
          <div style="background: var(--color-bg-surface-subtle); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); font-size: var(--font-size-xs); color: var(--color-text-secondary); border-left: 3px solid var(--color-warning);">
            ℹ️ <strong>Pemberitahuan:</strong> Mode demo lokal menyimulasikan hak akses berbasis peran (RBAC) tanpa sistem password. Setiap peran memiliki batasan data dan navigasi sesuai perannya.
          </div>

          <!-- ROLE 1: ADMIN -->
          <div>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-warning-text); margin-bottom: var(--space-2);">
              👑 1. Administrator (Akses Penuh Manajemen Akun)
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${admins.map(u => this.renderUserCard(u, currentUserId)).join('')}
            </div>
          </div>

          <!-- ROLE 2: TUTOR -->
          <div>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); margin-bottom: var(--space-2);">
              👩‍🏫 2. Tutor / Guru (Antrean Review &amp; Laporan Sesi)
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${tutors.map(u => this.renderUserCard(u, currentUserId)).join('')}
            </div>
          </div>

          <!-- ROLE 3: STUDENT -->
          <div>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-success-text); margin-bottom: var(--space-2);">
              👦 3. Siswa (Quest Map, Materi &amp; Pengumpulan Proyek)
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${students.map(u => this.renderUserCard(u, currentUserId)).join('')}
            </div>
          </div>

          <!-- ROLE 4: PARENT -->
          <div>
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-scratch-motion); margin-bottom: var(--space-2);">
              👨‍👩‍👧 4. Orang Tua (Transparansi Parent Hub &amp; Laporan Anak)
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${parents.map(u => this.renderUserCard(u, currentUserId)).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-ghost btn-sm" id="btn-demo-signout" style="color: var(--color-danger);">
            🚪 Keluar dari Sesi
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-close-demo-modal-footer">
            Tutup
          </button>
        </div>
      </div>
    `;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    // Bind item selection
    const userButtons = modal.querySelectorAll('[data-switch-user-id]');
    userButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-switch-user-id');
        this.selectUser(uid);
      });
    });

    // Close handlers
    const closeBtn1 = modal.querySelector('#btn-close-demo-modal');
    const closeBtn2 = modal.querySelector('#btn-close-demo-modal-footer');
    const handleClose = () => this.closeModal();
    if (closeBtn1) closeBtn1.addEventListener('click', handleClose);
    if (closeBtn2) closeBtn2.addEventListener('click', handleClose);

    // Sign out handler
    const signOutBtn = modal.querySelector('#btn-demo-signout');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        AuthService.signOut();
        showToast({ title: 'Sesi Selesai', message: 'Anda telah keluar dari akun demo.', type: 'info' });
        this.closeModal();
        this.renderTrigger();
      });
    }
  }

  renderUserCard(u, currentUserId) {
    const isCurrent = u.id === currentUserId;
    const isInactive = u.status === 'inactive';

    let extraMeta = '';
    if (u.role === 'student') {
      extraMeta = `&bull; ${escapeHtml(u.gradeLevel || 'Grade 5')}`;
    } else if (u.role === 'parent') {
      const kids = IdentityStore.getParentStudents(u.id);
      const kidNames = kids.map(k => k.displayName).join(', ');
      extraMeta = kids.length > 0 ? `&bull; Anak: <strong>${escapeHtml(kidNames)}</strong>` : '&bull; Belum terhubung anak';
    } else if (u.role === 'tutor' || u.role === 'teacher') {
      const students = IdentityStore.getTutorStudents(u.id);
      extraMeta = `&bull; ${students.length} Siswa Terhubung`;
    }

    return `
      <div style="background: ${isCurrent ? 'var(--color-bg-surface-elevated)' : 'var(--color-bg-surface)'}; border: 1.5px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border-subtle)'}; border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); transition: border-color var(--transition-fast);">
        <div style="display: flex; align-items: center; gap: var(--space-3); min-width: 0;">
          <div style="width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--color-bg-surface-subtle); border: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: var(--font-size-xs); color: var(--color-text-primary); flex-shrink: 0;">
            ${escapeHtml(u.avatar || 'U')}
          </div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
              <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(u.displayName)}
              </strong>
              ${isCurrent ? '<span class="badge badge-approved" style="font-size: 10px;">Akun Aktif</span>' : ''}
              ${isInactive ? '<span class="badge badge-warning" style="font-size: 10px;">Nonaktif</span>' : ''}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(u.email)} ${extraMeta}
            </div>
          </div>
        </div>

        <div>
          ${isCurrent ? `
            <button type="button" class="btn btn-ghost btn-sm" disabled style="opacity: 0.6;">
              Sedang Digunakan
            </button>
          ` : isInactive ? `
            <button type="button" class="btn btn-secondary btn-sm" disabled style="opacity: 0.5;" title="Akun nonaktif tidak dapat masuk demo">
              Nonaktif
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" data-switch-user-id="${u.id}">
              Pilih &rarr;
            </button>
          `}
        </div>
      </div>
    `;
  }

  selectUser(userId) {
    const result = AuthService.signInDemo(userId);
    if (result.error) {
      showToast({
        title: 'Gagal Masuk',
        message: result.message || 'Tidak dapat masuk ke akun ini.',
        type: 'error'
      });
      return;
    }

    const user = result.session.user;
    showToast({
      title: 'Peran Akun Beralih',
      message: `Masuk sebagai ${user.displayName} (${user.role.toUpperCase()}).`,
      type: 'success',
      duration: 3500
    });

    this.closeModal();
    this.renderTrigger();

    // Contextual auto-navigation based on role (Phase 4.5 Dashboard Separation)
    const currentPath = window.location.pathname;
    if (user.role === 'admin') {
      if (!currentPath.includes('index.html')) {
        window.location.href = 'index.html#admin-accounts';
      } else {
        const adminTab = document.querySelector('[data-view-target="view-admin"]');
        if (adminTab) adminTab.click();
      }
    } else if (user.role === 'tutor' || user.role === 'teacher') {
      window.location.href = 'teacher.html';
    } else if (user.role === 'student') {
      window.location.href = 'student.html';
    } else if (user.role === 'parent') {
      window.location.href = 'parent.html';
    }
  }

  closeModal() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  bindEvents() {
    // Backdrop click and escape close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    document.addEventListener('click', (e) => {
      const modal = document.getElementById(this.modalId);
      if (modal && modal.classList.contains('is-open') && e.target === modal) {
        this.closeModal();
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
