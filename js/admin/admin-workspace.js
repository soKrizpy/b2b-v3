/**
 * B2B LEARNING ENGINE - ADMIN ACCOUNT MANAGEMENT WORKSPACE (PHASE 4)
 * Governance console for Users, Roles, and Tutor Assignments.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - 100% Semantic Design Tokens - Zero Hardcoded Colors.
 * - Accessible Modals for Create/Edit User & Relations.
 * - Real-time sync with IdentityStore.
 */

import { IdentityStore, VALID_ROLES } from '../services/identity-store.js';
import { AuthService } from '../services/auth-service.js';
import { AccessControl } from '../services/access-control.js';
import { showToast } from '../components/toast.js';
import { BillingStore } from '../services/billing-store.js';
import { ClassSessionStore } from '../services/class-session-store.js';

export class AdminWorkspace {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.activeTab = 'users'; // 'users' | 'tutor-relations' | 'billing'
    this.roleFilter = 'all';
    this.statusFilter = 'all';
    this.editingUser = null;
    this.isCreatingUser = false;
    this.isCreatingTutorRel = false;

    this.handleStoreChange = this.handleStoreChange.bind(this);
  }

  init() {
    IdentityStore.seedIfEmpty();
    this.render();

    if (!this._unsub) {
      this._unsub = IdentityStore.subscribe(() => this.render());
      this._unsubBilling = BillingStore.subscribe(() => this.render());
      this._unsubSessions = ClassSessionStore.subscribe(() => this.render());
    }
  }

  render() {
    if (!this.container) return;

    const session = AuthService.getCurrentSession();
    const currentUser = session ? session.user : null;

    // Access guard: only admin can view this workspace
    if (!AccessControl.canManageUsers(currentUser)) {
      this.container.innerHTML = `
        <div class="card" style="padding: var(--space-8); text-align: center; border-left: 4px solid var(--color-danger);">
          <div style="font-size: var(--font-size-3xl); margin-bottom: var(--space-2);" aria-hidden="true">🚫</div>
          <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-danger-text);">
            Akses Ditolak (403 Forbidden)
          </h3>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-muted); max-width: 500px; margin: 0 auto var(--space-4) auto;">
            Halaman ini khusus untuk peran <strong>Administrator</strong>. Akun Anda saat ini (<strong>${escapeHtml(currentUser?.displayName || 'Tamu')}</strong> - role: <em>${escapeHtml(currentUser?.role || 'none')}</em>) tidak memiliki hak akses manajemen pengguna.
          </p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-admin-switch-account">
            Buka Demo Switcher &rarr;
          </button>
        </div>
      `;

      const switchBtn = this.container.querySelector('#btn-admin-switch-account');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          const switcherBtn = document.getElementById('btn-open-demo-switcher');
          if (switcherBtn) switcherBtn.click();
        });
      }
      return;
    }

    const allUsers = IdentityStore.getAllUsers();
    const totalCount = allUsers.length;
    const activeCount = allUsers.filter(u => u.status === 'active').length;
    const assignments = IdentityStore.getAllAssignments();

    this.container.innerHTML = `
      <div class="admin-workspace-wrap" style="display: flex; flex-direction: column; gap: var(--space-6);">
        <!-- ADMIN HEADER BANNER -->
        <header style="background: var(--color-bg-surface); border: 1.5px solid var(--color-border-subtle); border-radius: var(--radius-2xl); padding: var(--space-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); box-shadow: var(--shadow-sm);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge badge-warning" style="font-weight: var(--font-weight-bold);">ADMIN CONSOLE</span>
              <span class="badge badge-scratch">Phase 4 RBAC</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Simulasi Akses Lokal</span>
            </div>
            <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Manajemen Identitas &amp; Hak Akses Pengguna
            </h2>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Kelola akun Admin, Tutor, dan Siswa, status aktif/nonaktif, serta penugasan tutor-siswa.
            </p>
          </div>

          <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
            <div style="text-align: right;">
              <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${activeCount} / ${totalCount}</span>
              <div style="font-size: 11px; color: var(--color-text-muted);">Akun Aktif</div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-admin-add-user">
              ➕ Tambah Akun Demo
            </button>
          </div>
        </header>

        <!-- SUB-NAVIGATION TABS -->
        <nav style="display: flex; gap: var(--space-2); border-bottom: 2px solid var(--color-border-subtle); padding-bottom: var(--space-2); flex-wrap: wrap;" aria-label="Navigasi Manajemen Admin">
          <button type="button" class="btn btn-sm ${this.activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}" data-admin-tab="users">
            👥 Daftar Pengguna (${totalCount})
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'tutor-relations' ? 'btn-primary' : 'btn-ghost'}" data-admin-tab="tutor-relations">
            👩‍🏫 Relasi Tutor &amp; Siswa (${assignments.length})
          </button>
          <button type="button" class="btn btn-sm ${this.activeTab === 'billing' ? 'btn-primary' : 'btn-ghost'}" data-admin-tab="billing">
            💳 Tarif &amp; Tagihan
          </button>
        </nav>

        <!-- ACTIVE TAB BODY -->
        <div id="admin-tab-body">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.bindTabEvents();
    this.bindActionEvents();
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'tutor-relations':
        return this.renderTutorRelationsView();
      case 'billing':
        return this.renderBillingView();
      case 'users':
      default:
        return this.renderUsersView();
    }
  }

  /* --------------------------------------------------------------------------
     TAB 1: USERS LIST VIEW
     -------------------------------------------------------------------------- */
  renderUsersView() {
    let users = IdentityStore.getAllUsers();

    if (this.roleFilter !== 'all') {
      const norm = this.roleFilter === 'teacher' ? 'tutor' : this.roleFilter;
      users = users.filter(u => u.role === norm || (norm === 'tutor' && u.role === 'teacher'));
    }
    if (this.statusFilter !== 'all') {
      users = users.filter(u => u.status === this.statusFilter);
    }

    return `
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <!-- FILTERS BAR -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); background: var(--color-bg-surface-elevated); padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
          <!-- Role Filter -->
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted);">Role:</span>
            <button type="button" class="btn btn-sm ${this.roleFilter === 'all' ? 'btn-primary' : 'btn-ghost'}" data-filter-role="all">Semua</button>
            <button type="button" class="btn btn-sm ${this.roleFilter === 'admin' ? 'btn-primary' : 'btn-ghost'}" data-filter-role="admin">Admin</button>
            <button type="button" class="btn btn-sm ${this.roleFilter === 'tutor' ? 'btn-primary' : 'btn-ghost'}" data-filter-role="tutor">Tutor</button>
            <button type="button" class="btn btn-sm ${this.roleFilter === 'student' ? 'btn-primary' : 'btn-ghost'}" data-filter-role="student">Siswa</button>
          </div>

          <!-- Status Filter -->
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-muted);">Status:</span>
            <button type="button" class="btn btn-sm ${this.statusFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}" data-filter-status="all">Semua</button>
            <button type="button" class="btn btn-sm ${this.statusFilter === 'active' ? 'btn-secondary' : 'btn-ghost'}" data-filter-status="active">Aktif</button>
            <button type="button" class="btn btn-sm ${this.statusFilter === 'inactive' ? 'btn-secondary' : 'btn-ghost'}" data-filter-status="inactive">Nonaktif</button>
          </div>
        </div>

        <!-- USERS TABLE / CARDS -->
        ${users.length === 0 ? `
          <div class="card" style="padding: var(--space-8); text-align: center;">
            <div style="font-size: var(--font-size-3xl);" aria-hidden="true">🔍</div>
            <h4 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: var(--space-1) 0; color: var(--color-text-primary);">
              Tidak Ada Pengguna Sesuai Filter
            </h4>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Coba reset filter atau tambahkan akun demo baru melalui tombol di atas.
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${users.map((u) => {
              const isInactive = u.status === 'inactive';
              const roleBadges = {
                admin: '<span class="badge badge-warning">Admin</span>',
                tutor: '<span class="badge badge-scratch">Tutor</span>',
                teacher: '<span class="badge badge-scratch">Tutor</span>',
                student: '<span class="badge badge-approved">Siswa</span>',
              };
              const roleBadge = roleBadges[u.role] || `<span class="badge">${u.role}</span>`;
              const statusBadge = isInactive
                ? '<span class="badge badge-danger">Nonaktif</span>'
                : '<span class="badge badge-approved">Aktif</span>';

              return `
                <div class="card" style="padding: var(--space-4) var(--space-5); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); border-left: 4px solid ${isInactive ? 'var(--color-danger)' : 'var(--color-primary)'};">
                  <div style="display: flex; align-items: center; gap: var(--space-3);">
                    <div style="width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--color-bg-surface-subtle); border: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--color-text-primary);">
                      ${escapeHtml(u.avatar || 'U')}
                    </div>
                    <div>
                      <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: 2px;">
                        <strong style="font-size: var(--font-size-sm); color: var(--color-text-primary);">${escapeHtml(u.displayName)}</strong>
                        ${roleBadge}
                        ${statusBadge}
                        ${u.gradeLevel ? `<span class="badge badge-scratch">${escapeHtml(u.gradeLevel)}</span>` : ''}
                      </div>
                      <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                        ID: <code>${escapeHtml(u.id)}</code> &bull; Email: <strong>${escapeHtml(u.email)}</strong> &bull; Terdaftar: ${escapeHtml(u.createdAt.slice(0, 10))}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: var(--space-2); align-items: center;">
                    <button type="button" class="btn btn-secondary btn-sm" data-action="edit-user" data-user-id="${u.id}">
                      ✏️ Edit
                    </button>
                    ${isInactive ? `
                      <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-success-text);" data-action="toggle-status" data-user-id="${u.id}" data-target-status="active">
                        ✅ Aktifkan
                      </button>
                    ` : `
                      <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-danger);" data-action="toggle-status" data-user-id="${u.id}" data-target-status="inactive">
                        ⏸️ Nonaktifkan
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     TAB 2: TUTOR-STUDENT RELATIONS VIEW
     -------------------------------------------------------------------------- */
  renderTutorRelationsView() {
    const assignments = IdentityStore.getAllAssignments();
    const tutors = IdentityStore.getAllUsers({ role: 'tutor' });
    const students = IdentityStore.getAllUsers({ role: 'student' });

    return `
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3); background: var(--color-bg-surface-elevated); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle);">
          <div>
            <h3 style="font-size: var(--font-size-md); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Penugasan Siswa ke Tutor
            </h3>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Tutor hanya dapat melihat dan membuat laporan sesi untuk siswa yang terdaftar pada penugasan aktif.
            </p>
          </div>

          <button type="button" class="btn btn-primary btn-sm" id="btn-add-tutor-rel">
            ➕ Tambah Penugasan Tutor
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${assignments.length === 0 ? `
            <div class="card" style="padding: var(--space-6); text-align: center;">
              <p style="color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0;">Belum ada penugasan tutor-siswa.</p>
            </div>
          ` : assignments.map(a => {
            const tutor = IdentityStore.getUserById(a.tutorId);
            const student = IdentityStore.getUserById(a.studentId);

            return `
              <div class="card" style="padding: var(--space-4) var(--space-5); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <div style="font-size: var(--font-size-xl);">👩‍🏫 ➔ 👦</div>
                  <div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-primary);">
                      Tutor: <strong>${escapeHtml(tutor ? tutor.displayName : a.tutorId)}</strong> &bull; Siswa: <strong>${escapeHtml(student ? student.displayName : a.studentId)}</strong>
                    </div>
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
                      ID Penugasan: <code>${escapeHtml(a.id)}</code> &bull; Status: <span class="badge badge-approved" style="font-size: 10px;">${escapeHtml(a.status)}</span>
                    </div>
                  </div>
                </div>

                <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-danger);" data-action="delete-tutor-rel" data-tutor-id="${a.tutorId}" data-student-id="${a.studentId}">
                  🗑️ Lepas Relasi
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     EVENT BINDING & ACTIONS
     -------------------------------------------------------------------------- */
  bindTabEvents() {
    const tabs = this.container.querySelectorAll('[data-admin-tab]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-admin-tab');
        if (target && target !== this.activeTab) {
          this.activeTab = target;
          this.render();
        }
      });
    });

    const roleFilters = this.container.querySelectorAll('[data-filter-role]');
    roleFilters.forEach((rf) => {
      rf.addEventListener('click', () => {
        this.roleFilter = rf.getAttribute('data-filter-role');
        this.render();
      });
    });

    const statusFilters = this.container.querySelectorAll('[data-filter-status]');
    statusFilters.forEach((sf) => {
      sf.addEventListener('click', () => {
        this.statusFilter = sf.getAttribute('data-filter-status');
        this.render();
      });
    });
  }

  /* --------------------------------------------------------------------------
     TAB 4: STUDENT RATES & INVOICES
     -------------------------------------------------------------------------- */
  renderBillingView() {
    const students = IdentityStore.getAllUsers().filter(user => user.role === 'student' && user.status === 'active');
    const invoices = BillingStore.getInvoices();
    const usersById = new Map(IdentityStore.getAllUsers().map(user => [user.id, user]));
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultPeriod = previousMonth.getFullYear() + '-' + String(previousMonth.getMonth() + 1).padStart(2, '0');

    return [
      '<section style="display:flex;flex-direction:column;gap:var(--space-5);">',
      '<div class="card" style="padding:var(--space-4);">',
      '<h3>Tarif per siswa</h3>',
      '<p>Admin menentukan tarif per pertemuan untuk setiap siswa. Perubahan tarif hanya berlaku pada draft/tagihan baru; tagihan lama menyimpan nominalnya sendiri.</p>',
      students.length ? students.map(student => {
        const rate = BillingStore.getRate(student.id);
        return '<form data-rate-form="' + escapeHtml(student.id) + '" style="display:flex;align-items:end;gap:var(--space-3);flex-wrap:wrap;padding:var(--space-3) 0;border-top:1px solid var(--color-border-subtle);">' +
          '<div style="flex:1;min-width:180px;"><label for="rate-' + escapeHtml(student.id) + '">' + escapeHtml(student.displayName) + '</label>' +
          '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">' + (rate ? 'Tarif saat ini: ' + formatRupiah(rate.amountPerSession) : 'Tarif belum ditentukan') + '</div></div>' +
          '<div style="min-width:190px;"><label for="rate-' + escapeHtml(student.id) + '">Tarif per pertemuan (Rp)</label>' +
          '<input id="rate-' + escapeHtml(student.id) + '" name="amountPerSession" type="number" min="1" step="1" required value="' + (rate ? rate.amountPerSession : '') + '" placeholder="Contoh: 75000" style="width:100%;"></div>' +
          '<button class="btn btn-primary btn-sm" type="submit">Simpan tarif</button></form>';
      }).join('') : '<p>Belum ada akun siswa aktif.</p>',
      '</div>',
      '<div class="card" style="padding:var(--space-4);">',
      '<h3>Buat draft tagihan bulanan</h3>',
      '<p>Tagihan dibuat setelah bulan berakhir. Periksa jumlah pertemuan, diskon, biaya tambahan, dan total sebelum menerbitkannya.</p>',
      '<form id="admin-create-invoice-form" style="display:flex;align-items:end;gap:var(--space-3);flex-wrap:wrap;">',
      '<div style="flex:1;min-width:180px;"><label for="invoice-student">Siswa</label><select id="invoice-student" name="studentId" required style="width:100%;"><option value="">Pilih siswa</option>' +
        students.map(student => '<option value="' + escapeHtml(student.id) + '">' + escapeHtml(student.displayName) + '</option>').join('') +
      '</select></div>',
      '<div><label for="invoice-period">Periode bulan</label><input id="invoice-period" name="period" type="month" required value="' + defaultPeriod + '" max="' + defaultPeriod + '"></div>',
      '<button class="btn btn-primary" type="submit">Buat draft</button></form></div>',
      '<div class="card" style="padding:var(--space-4);"><h3>Riwayat tagihan</h3>',
      invoices.length ? '<div style="display:flex;flex-direction:column;gap:var(--space-3);">' + invoices.map(invoice => {
        const student = usersById.get(invoice.studentId);
        const statusLabel = invoice.status === 'draft' ? 'Draft' : invoice.status === 'paid' ? 'Lunas' : 'Belum dibayar';
        const statusClass = invoice.status === 'draft' ? 'badge-in-progress' : invoice.status === 'paid' ? 'badge-success' : 'badge-warning';
        let html = '<article style="border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-3);">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);flex-wrap:wrap;"><div><strong>' + escapeHtml(student ? student.displayName : invoice.studentId) + '</strong>' +
          '<div>Periode ' + escapeHtml(invoice.period) + ' · ' + invoice.totalSessions + ' pertemuan · ' + formatRupiah(invoice.rateSnapshot) + '/pertemuan</div>' +
          '<strong>' + formatRupiah(invoice.totalAmount) + '</strong></div><div><span class="badge ' + statusClass + '">' + statusLabel + '</span>' +
          (invoice.status === 'unpaid' ? '<button type="button" class="btn btn-secondary btn-sm" data-mark-invoice-paid="' + escapeHtml(invoice.id) + '">Tandai lunas</button>' : '') +
          '</div></div>';
        if (invoice.status === 'draft') {
          html += '<form data-draft-form="' + escapeHtml(invoice.id) + '" style="border-top:1px solid var(--color-border-subtle);padding-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-3);">' +
            '<strong>Koreksi draft sebelum diterbitkan</strong><span>Pilih pertemuan yang akan ditagihkan:</span>' +
            (invoice.items || []).map(item => '<label style="display:flex;align-items:center;gap:var(--space-2);"><input type="checkbox" name="sessionIds" value="' + escapeHtml(item.sessionId) + '" checked> Sesi ke-' + (Number(item.sessionNumber) || '-') + ' · ' + escapeHtml(formatInvoiceDate(item.sessionDate)) + ' · ' + formatRupiah(item.amount) + '</label>').join('') +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3);">' +
            '<label>Diskon (Rp)<input name="discountAmount" type="number" min="0" step="1" value="' + (Number(invoice.discountAmount) || 0) + '" style="width:100%;"></label>' +
            '<label>Biaya tambahan (Rp, opsional)<input name="additionalCharges" type="number" min="0" step="1" value="' + (Number(invoice.additionalCharges) || 0) + '" style="width:100%;"></label>' +
            '<label>Total akhir (Rp)<input name="totalAmount" type="number" min="0" step="1" value="' + (Number(invoice.totalAmount) || 0) + '" required style="width:100%;"></label></div>' +
            '<label>Catatan koreksi total (wajib jika total berbeda dari perhitungan otomatis)<input name="adjustmentNote" type="text" value="' + escapeHtml(invoice.adjustmentNote || '') + '" maxlength="300" style="width:100%;"></label>' +
            '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;"><button class="btn btn-secondary btn-sm" type="submit">Simpan koreksi</button>' +
            '<button class="btn btn-primary btn-sm" type="button" data-issue-invoice="' + escapeHtml(invoice.id) + '">Terbitkan tagihan</button></div></form>';
        } else {
          html += '<div>Subtotal: ' + formatRupiah(invoice.subtotalAmount ?? invoice.totalAmount) + ' · Diskon: ' + formatRupiah(invoice.discountAmount || 0) +
            ' · Biaya tambahan: ' + formatRupiah(invoice.additionalCharges || 0) +
            (invoice.adjustmentNote ? '<div>Catatan koreksi: ' + escapeHtml(invoice.adjustmentNote) + '</div>' : '') + '</div>';
        }
        return html + '</article>';
      }).join('') + '</div>' : '<p style="color:var(--color-text-muted);">Belum ada tagihan. Atur tarif siswa dan catat kehadiran sesi terlebih dahulu.</p>',
      '</div></section>'
    ].join('');
  }

  bindActionEvents() {
    // Save per-student rates
    this.container.querySelectorAll('[data-rate-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const studentId = form.getAttribute('data-rate-form');
        const amount = Number(new FormData(form).get('amountPerSession'));
        const actor = AuthService.getCurrentSession()?.user;
        const result = BillingStore.setRate(studentId, amount, actor);
        if (!result.success) {
          showToast({ title: 'Tarif gagal disimpan', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tarif tersimpan', message: 'Tarif siswa berhasil diperbarui.', type: 'success' });
          this.render();
        }
      });
    });

    // Generate invoice from billable operational sessions
    const invoiceForm = this.container.querySelector('#admin-create-invoice-form');
    if (invoiceForm) {
      invoiceForm.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(invoiceForm);
        const actor = AuthService.getCurrentSession()?.user;
        const result = BillingStore.createInvoice(String(formData.get('studentId') || ''), String(formData.get('period') || ''), actor);
        if (!result.success) {
          showToast({ title: 'Tagihan tidak dibuat', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Draft tagihan dibuat', message: `${result.invoice.totalSessions} pertemuan siap diperiksa sebelum diterbitkan.`, type: 'success' });
          this.render();
        }
      });
    }

    this.container.querySelectorAll('[data-draft-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const invoiceId = form.getAttribute('data-draft-form');
        const formData = new FormData(form);
        const result = BillingStore.updateDraftInvoice(invoiceId, {
          sessionIds: formData.getAll('sessionIds').map(String),
          discountAmount: Number(formData.get('discountAmount')),
          additionalCharges: Number(formData.get('additionalCharges')),
          totalAmount: Number(formData.get('totalAmount')),
          adjustmentNote: String(formData.get('adjustmentNote') || '')
        }, AuthService.getCurrentSession()?.user);
        if (!result.success) {
          showToast({ title: 'Koreksi draft gagal', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Draft diperbarui', message: 'Koreksi tagihan berhasil disimpan.', type: 'success' });
          this.render();
        }
      });
    });

    this.container.querySelectorAll('[data-issue-invoice]').forEach(button => {
      button.addEventListener('click', () => {
        const result = BillingStore.issueInvoice(button.getAttribute('data-issue-invoice'), AuthService.getCurrentSession()?.user);
        if (!result.success) {
          showToast({ title: 'Tagihan belum diterbitkan', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tagihan diterbitkan', message: 'Tagihan sekarang tampil di riwayat Parent Hub.', type: 'success' });
          this.render();
        }
      });
    });

    this.container.querySelectorAll('[data-mark-invoice-paid]').forEach(button => {
      button.addEventListener('click', () => {
        const actor = AuthService.getCurrentSession()?.user;
        const result = BillingStore.markPaid(button.getAttribute('data-mark-invoice-paid'), actor);
        if (!result.success) {
          showToast({ title: 'Pembayaran gagal diperbarui', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tagihan lunas', message: 'Status tagihan berhasil diperbarui.', type: 'success' });
          this.render();
        }
      });
    });

    // Add user button
    const btnAddUser = this.container.querySelector('#btn-admin-add-user');
    if (btnAddUser) {
      btnAddUser.addEventListener('click', () => this.openUserModal());
    }

    // Edit user buttons
    const editBtns = this.container.querySelectorAll('[data-action="edit-user"]');
    editBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-user-id');
        const user = IdentityStore.getUserById(uid);
        if (user) this.openUserModal(user);
      });
    });

    // Toggle status buttons (activate / deactivate)
    const toggleBtns = this.container.querySelectorAll('[data-action="toggle-status"]');
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-user-id');
        const targetStatus = btn.getAttribute('data-target-status');
        const res = targetStatus === 'active'
          ? IdentityStore.activateUser(uid)
          : IdentityStore.deactivateUser(uid);

        if (res.error) {
          showToast({ title: 'Gagal', message: res.message, type: 'error' });
        } else {
          showToast({
            title: targetStatus === 'active' ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan',
            message: `Status akun ${res.user.displayName} diubah menjadi ${targetStatus}.`,
            type: 'info'
          });
          this.render();
        }
      });
    });

    // Add tutor relation
    const btnAddTutorRel = this.container.querySelector('#btn-add-tutor-rel');
    if (btnAddTutorRel) {
      btnAddTutorRel.addEventListener('click', () => this.openTutorRelationModal());
    }

    // Delete tutor relation
    const deleteTutorRelBtns = this.container.querySelectorAll('[data-action="delete-tutor-rel"]');
    deleteTutorRelBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-tutor-id');
        const sid = btn.getAttribute('data-student-id');
        IdentityStore.removeTutorStudentAssignment(tid, sid);
        showToast({ title: 'Penugasan Dihapus', message: 'Relasi tutor dan siswa telah dilepas.', type: 'info' });
        this.render();
      });
    });


  }

  /* --------------------------------------------------------------------------
     MODALS FOR USER CREATE/EDIT & RELATIONS
     -------------------------------------------------------------------------- */
  openUserModal(existingUser = null) {
    const isEdit = !!existingUser;
    const user = existingUser || {};
    const modalId = 'admin-user-editor-modal';

    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px; width: 92%;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Akun Pengguna' : 'Tambah Akun Demo Baru'}</h3>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-close-user-modal">✕</button>
        </div>

        <form id="admin-user-form" onsubmit="return false;" style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4) var(--space-6);">
          <div class="form-group">
            <label for="admin-input-name" class="form-label">Nama Lengkap / Display Name *</label>
            <input type="text" id="admin-input-name" class="form-control" value="${escapeHtml(user.displayName || '')}" placeholder="contoh: Sarah Nabila" required />
          </div>

          <div class="form-group">
            <label for="admin-input-email" class="form-label">Alamat Email *</label>
            <input type="email" id="admin-input-email" class="form-control" value="${escapeHtml(user.email || '')}" placeholder="contoh: sarah@b2b.edu" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <div class="form-group">
              <label for="admin-select-role" class="form-label">Peran / Role *</label>
              <select id="admin-select-role" class="form-control">
                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Siswa (Student)</option>
                <option value="tutor" ${(user.role === 'tutor' || user.role === 'teacher') ? 'selected' : ''}>Tutor / Guru</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
              </select>
            </div>

            <div class="form-group">
              <label for="admin-select-status" class="form-label">Status Akun *</label>
              <select id="admin-select-status" class="form-control">
                <option value="active" ${(!user.status || user.status === 'active') ? 'selected' : ''}>Aktif (Active)</option>
                <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Nonaktif (Inactive)</option>
              </select>
            </div>
          </div>

          <div class="form-group" id="admin-grade-group" style="${user.role === 'student' || !isEdit ? '' : 'display: none;'}">
            <label for="admin-input-grade" class="form-label">Tingkat Kelas (Khusus Siswa)</label>
            <input type="text" id="admin-input-grade" class="form-control" value="${escapeHtml(user.gradeLevel || 'Grade 5')}" placeholder="contoh: Grade 5" />
          </div>

          <div class="modal-footer" style="padding: var(--space-4) 0 0 0; margin-top: var(--space-2);">
            <button type="button" class="btn btn-secondary" id="btn-cancel-user-modal">Batal</button>
            <button type="button" class="btn btn-primary" id="btn-save-user-modal">
              ${isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('is-open');

    const roleSelect = modal.querySelector('#admin-select-role');
    const gradeGroup = modal.querySelector('#admin-grade-group');
    if (roleSelect && gradeGroup) {
      roleSelect.addEventListener('change', () => {
        gradeGroup.style.display = roleSelect.value === 'student' ? '' : 'none';
      });
    }

    const closeModal = () => modal.classList.remove('is-open');
    modal.querySelector('#btn-close-user-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-user-modal')?.addEventListener('click', closeModal);

    modal.querySelector('#btn-save-user-modal')?.addEventListener('click', () => {
      const name = modal.querySelector('#admin-input-name')?.value.trim();
      const email = modal.querySelector('#admin-input-email')?.value.trim();
      const role = modal.querySelector('#admin-select-role')?.value;
      const status = modal.querySelector('#admin-select-status')?.value;
      const grade = modal.querySelector('#admin-input-grade')?.value.trim();

      if (!name || !email) {
        showToast({ title: 'Data Kurang', message: 'Nama dan email wajib diisi.', type: 'warning' });
        return;
      }

      let res;
      if (isEdit) {
        res = IdentityStore.updateUser(user.id, {
          displayName: name,
          email,
          role,
          status,
          gradeLevel: role === 'student' ? grade : undefined
        });
      } else {
        res = IdentityStore.createUser({
          displayName: name,
          email,
          role,
          status,
          gradeLevel: role === 'student' ? grade : undefined
        });
      }

      if (res.error) {
        showToast({ title: 'Gagal Menyimpan', message: res.message, type: 'error' });
      } else {
        showToast({
          title: isEdit ? 'Akun Diperbarui' : 'Akun Baru Dibuat 🎉',
          message: `Akun ${res.user.displayName} (${res.user.role}) berhasil disimpan.`,
          type: 'success'
        });
        closeModal();
        this.render();
      }
    });
  }

  openTutorRelationModal() {
    const modalId = 'admin-tutor-rel-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    const tutors = IdentityStore.getAllUsers({ role: 'tutor' });
    const students = IdentityStore.getAllUsers({ role: 'student' });

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px; width: 92%;">
        <div class="modal-header">
          <h3 class="modal-title">Tambah Penugasan Tutor-Siswa</h3>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-close-tutor-rel-modal">✕</button>
        </div>

        <form onsubmit="return false;" style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4) var(--space-6);">
          <div class="form-group">
            <label for="select-rel-tutor" class="form-label">Pilih Tutor / Guru *</label>
            <select id="select-rel-tutor" class="form-control">
              ${tutors.map(t => `<option value="${t.id}">${escapeHtml(t.displayName)} (${escapeHtml(t.email)})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="select-rel-student" class="form-label">Pilih Siswa *</label>
            <select id="select-rel-student" class="form-control">
              ${students.map(s => `<option value="${s.id}">${escapeHtml(s.displayName)} &bull; ${escapeHtml(s.gradeLevel || 'Grade 5')}</option>`).join('')}
            </select>
          </div>

          <div class="modal-footer" style="padding: var(--space-4) 0 0 0;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-tutor-rel-modal">Batal</button>
            <button type="button" class="btn btn-primary" id="btn-save-tutor-rel-modal">Tugaskan</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('is-open');
    const closeModal = () => modal.classList.remove('is-open');
    modal.querySelector('#btn-close-tutor-rel-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-tutor-rel-modal')?.addEventListener('click', closeModal);

    modal.querySelector('#btn-save-tutor-rel-modal')?.addEventListener('click', () => {
      const tid = modal.querySelector('#select-rel-tutor')?.value;
      const sid = modal.querySelector('#select-rel-student')?.value;

      const res = IdentityStore.assignStudentToTutor(tid, sid);
      if (res.error) {
        showToast({ title: 'Gagal Menugaskan', message: res.message, type: 'error' });
      } else {
        showToast({ title: 'Penugasan Berhasil! 🎉', message: 'Siswa berhasil ditugaskan ke tutor.', type: 'success' });
        closeModal();
        this.render();
      }
    });
  }

  /**
   * Release the IdentityStore subscription and transient dialogs when React unmounts.
   */
  destroy() {
    if (typeof this._unsub === 'function') this._unsub();
    if (typeof this._unsubBilling === 'function') this._unsubBilling();
    if (typeof this._unsubSessions === 'function') this._unsubSessions();
    this._unsub = null;
    this._unsubBilling = null;
    this._unsubSessions = null;
    ['admin-user-editor-modal', 'admin-tutor-rel-modal'].forEach((id) => {
      document.getElementById(id)?.remove();
    });
    if (this.container) this.container.replaceChildren();
  }

  handleStoreChange() {
    this.render();
  }
}

function formatInvoiceDate(value) {
  if (!value) return 'Tanggal tidak diketahui';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
