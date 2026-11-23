/**
 * B2B LEARNING ENGINE - ADMIN ACCOUNT MANAGEMENT WORKSPACE (PHASE 4)
 * Governance console for Users, Roles, and Tutor Assignments.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - 100% Semantic Design Tokens - Zero Hardcoded Colors.
 * - Accessible Modals for Create/Edit User & Relations.
 * - Real-time sync with IdentityStore.
 */

import { AccessControl } from '../services/access-control.js';
import { showToast } from '../components/toast.js';
import { createScopedWorkspaceRepositories, createWorkspaceRepositories, WorkspaceRepositories } from '../services/workspace-repositories.js';

export class AdminWorkspace {
  /**
   * @param {HTMLElement} container
   */
  constructor(container, currentUser = null, repositories = null, options = {}) {
    this.container = container;
    this.currentUser = currentUser;
    this.productionMode = options.productionMode === true;
    if (options.productionMode === true) {
      if (!repositories) throw new Error('Repository Admin produksi wajib diberikan secara eksplisit.');
      this.repositories = createScopedWorkspaceRepositories(repositories, ['identity', 'billing']);
    } else {
      this.repositories = createWorkspaceRepositories(repositories || WorkspaceRepositories);
    }
    this.activeTab = 'users'; // 'users' | 'tutor-relations' | 'billing'
    this.roleFilter = 'all';
    this.statusFilter = 'all';
    this.editingUser = null;
    this.isCreatingUser = false;
    this.isCreatingTutorRel = false;
    this.users = [];
    this.assignments = [];
    this.sessions = [];
    this.invoices = [];
    this.usersById = new Map();
    this.ratesByStudent = new Map();
    this.refreshSequence = 0;
    this.destroyed = false;

    this.handleStoreChange = this.handleStoreChange.bind(this);
  }

  async init() {
    await this.repositories.identity.initializeDemo();
    if (this.destroyed) return;
    await this.refreshData({ render: false });
    if (this.destroyed) return;
    if (!this._unsub) {
      this._unsub = this.repositories.identity.subscribe(() => { void this.refreshData(); });
    }
    this.render();
  }

  async refreshData({ render = true } = {}) {
    const request = ++this.refreshSequence;
    const users = await this.repositories.identity.getAllUsers();
    if (this.destroyed || request !== this.refreshSequence) return;
    const assignments = typeof this.repositories.identity.getAllAssignments === 'function'
      ? await this.repositories.identity.getAllAssignments()
      : [];
    const invoices = this.productionMode ? await this.repositories.billing.getInvoices() : [];
    const rateEntries = this.productionMode
      ? await Promise.all(users.filter(user => user.role === 'student').map(async user => [user.id, await this.repositories.billing.getRate(user.id)]))
      : [];
    if (this.destroyed || request !== this.refreshSequence) return;
    this.users = users;
    this.assignments = Array.isArray(assignments) ? assignments : [];
    this.invoices = Array.isArray(invoices) ? invoices : [];
    this.usersById = new Map(users.map(user => [user.id, user]));
    this.ratesByStudent = new Map(rateEntries.filter((entry) => entry[1] != null));
    if (render && this.container) this.render();
  }

  render() {
    if (!this.container) return;

    const currentUser = this.currentUser;

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
          <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">Silakan masuk menggunakan akun Admin Supabase.</p>
        </div>
      `;

      return;
    }

    const allUsers = this.users;
    const totalCount = allUsers.length;
    const activeCount = allUsers.filter(u => u.status === 'active').length;

    this.container.innerHTML = `
      <div class="admin-workspace-wrap" style="display: flex; flex-direction: column; gap: var(--space-6);">
        <!-- ADMIN HEADER BANNER -->
        <header style="background: var(--color-bg-surface); border: 1.5px solid var(--color-border-subtle); border-radius: var(--radius-2xl); padding: var(--space-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); box-shadow: var(--shadow-sm);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge badge-warning" style="font-weight: var(--font-weight-bold);">ADMIN CONSOLE</span>
              <span class="badge badge-scratch">Phase 4 RBAC</span>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Data akun Supabase</span>
            </div>
            <h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin: 0 0 var(--space-1) 0; color: var(--color-text-primary);">
              Manajemen Identitas &amp; Hak Akses Pengguna
            </h2>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;">
              Data akun Admin, Tutor, dan Siswa yang dibaca langsung dari Supabase.
            </p>
            ${this.productionMode ? `
              <p class="admin-readonly-notice" role="status" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin: var(--space-2) 0 0;">
                Akun dikelola melalui Supabase Auth. Pembuatan siswa juga menyiapkan WhatsApp dan MPIN terenkripsi; role akun dikunci setelah dibuat untuk menjaga relasi dan histori.
              </p>
            ` : ''}
          </div>

          <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
            <div style="text-align: right;">
              <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--color-text-primary);">${activeCount} / ${totalCount}</span>
              <div style="font-size: 11px; color: var(--color-text-muted);">Akun Aktif</div>
            </div>
          </div>
        </header>

        <!-- SUB-NAVIGATION TABS -->
        <nav style="display: flex; gap: var(--space-2); border-bottom: 2px solid var(--color-border-subtle); padding-bottom: var(--space-2); flex-wrap: wrap;" aria-label="Navigasi Manajemen Admin">
          <button type="button" class="btn btn-sm ${this.activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}" data-admin-tab="users">
            👥 Daftar Pengguna (${totalCount})
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
    // Only production-backed admin views are exposed here.
    return this.renderUsersView();
  }

  /* --------------------------------------------------------------------------
     TAB 1: USERS LIST VIEW
     -------------------------------------------------------------------------- */
  renderUsersView() {
    let users = this.users;

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
              Belum ada akun Supabase yang sesuai dengan filter ini.
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
                    <span class="badge badge-scratch">Data Supabase</span>
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
    const assignments = this.assignments;
    const tutors = this.users.filter(user => user.role === 'tutor');
    const students = this.users.filter(user => user.role === 'student');

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
            const tutor = this.usersById.get(a.tutorId);
            const student = this.usersById.get(a.studentId);

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

                ${a.status === 'active' ? `
                  <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-danger);" data-action="delete-tutor-rel" data-tutor-id="${a.tutorId}" data-student-id="${a.studentId}">
                    🗑️ Lepas Relasi
                  </button>
                ` : '<span class="badge badge-muted">Riwayat</span>'}
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
     TAB: CLASS SCHEDULING
     -------------------------------------------------------------------------- */
  renderScheduleView() {
    const students = this.users.filter(user => user.role === 'student').filter(user => user.status === 'active');
    const tutors = this.users.filter(user => user.role === 'tutor').filter(user => user.status === 'active');
    const usersById = new Map(this.users.map(user => [user.id, user]));
    const sessions = this.sessions.sort((a, b) =>
      new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime()
    );
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const today = `${todayParts.find(part => part.type === 'year')?.value}-${todayParts.find(part => part.type === 'month')?.value}-${todayParts.find(part => part.type === 'day')?.value}`;
    const weekdays = [
      { value: 1, label: 'Senin' }, { value: 2, label: 'Selasa' },
      { value: 3, label: 'Rabu' }, { value: 4, label: 'Kamis' },
      { value: 5, label: 'Jumat' }, { value: 6, label: 'Sabtu' },
      { value: 0, label: 'Minggu' }
    ];
    const statusLabels = {
      scheduled: 'Terjadwal', held: 'Terlaksana', not_held: 'Tidak terlaksana',
      cancelled: 'Dibatalkan', soft_deleted: 'Dihapus administratif'
    };

    return `
      <section style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div class="card" style="padding:var(--space-4);">
          <h3 style="margin-top:0;">Buat seri jadwal kelas</h3>
          <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);">
            Pilih beberapa hari dan jumlah pertemuan. Jika tutor atau siswa bentrok, tanggal tersebut dilewati dan sistem mencari hari pilihan berikutnya sampai jumlah sesi terpenuhi. Waktu menggunakan WIB.
          </p>
          <form id="admin-create-series-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--space-3);">
              <label>Siswa
                <select name="studentId" required style="width:100%;">
                  <option value="">Pilih siswa</option>
                  ${students.map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.displayName)}</option>`).join('')}
                </select>
              </label>
              <label>Tutor
                <select name="tutorId" required style="width:100%;">
                  <option value="">Pilih tutor</option>
                  ${tutors.map(user => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.displayName)}</option>`).join('')}
                </select>
              </label>
              <label>Tanggal mulai
                <input name="startDate" type="date" min="${today}" value="${today}" required style="width:100%;">
              </label>
              <label>Jam mulai (WIB)
                <input name="startTime" type="time" value="16:00" required style="width:100%;">
              </label>
              <label>Jumlah pertemuan
                <input name="targetCount" type="number" min="1" max="100" value="12" required style="width:100%;">
              </label>
              <label>Durasi pertemuan (menit)
                <input name="durationMinutes" type="number" min="1" max="480" value="60" required style="width:100%;">
              </label>
            </div>
            <fieldset style="border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);padding:var(--space-3);">
              <legend>Hari kelas berulang</legend>
              <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
                ${weekdays.map(day => `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" name="weekdays" value="${day.value}"> ${day.label}</label>`).join('')}
              </div>
            </fieldset>
            <label>Link Meet / Zoom utama (opsional)
              <input name="meetingUrl" type="url" placeholder="https://meet.google.com/..." style="width:100%;">
            </label>
            <button class="btn btn-primary" type="submit">Buat seri jadwal</button>
          </form>
        </div>

        <div class="card" style="padding:var(--space-4);">
          <h3 style="margin-top:0;">Daftar sesi</h3>
          ${sessions.length ? `<div style="display:flex;flex-direction:column;gap:var(--space-3);">
            ${sessions.map(session => {
              const student = usersById.get(session.studentId);
              const tutor = usersById.get(session.tutorId);
              const status = statusLabels[session.status] || session.status;
              const replacementPending = session.replacementRequired && !session.replacementSessionId &&
                ['cancelled', 'soft_deleted'].includes(session.status);
              return `<article class="card" style="padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);">
                <div style="display:flex;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;">
                  <div>
                    <strong>Sesi ke-${Number(session.sessionNumber) || '-' } · ${escapeHtml(student ? student.displayName : session.studentId)}</strong>
                    <div style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
                      ${escapeHtml(tutor ? tutor.displayName : session.tutorId)} · ${escapeHtml(formatSessionDateTime(session.scheduledStartAt))} · ${Number(session.durationMinutes)} menit
                    </div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                      Status: ${escapeHtml(status)} · Kehadiran: ${escapeHtml(session.attendanceStatus || 'belum dicatat')}
                    </div>
                    ${session.meetingUrl ? `<a href="${escapeHtml(session.meetingUrl)}" target="_blank" rel="noopener noreferrer">Buka link kelas</a>` : ''}
                    ${session.cancellation?.reason ? `<div>Alasan pembatalan: ${escapeHtml(session.cancellation.reason)}</div>` : ''}
                  </div>
                  <div style="display:flex;gap:var(--space-2);align-items:start;flex-wrap:wrap;">
                    ${session.status === 'scheduled' ? `
                      <button type="button" class="btn btn-secondary btn-sm" data-cancel-session="${escapeHtml(session.id)}">Batalkan</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-soft-delete-session="${escapeHtml(session.id)}">Hapus administratif</button>
                    ` : ''}
                    ${session.replacementSessionId ? '<span class="badge badge-approved">Pengganti terhubung</span>' : ''}
                  </div>
                </div>
                ${replacementPending ? `
                  <form data-replacement-form="${escapeHtml(session.id)}" style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end;border-top:1px solid var(--color-border-subtle);padding-top:var(--space-2);">
                    <label>Waktu sesi pengganti (WIB)
                      <input type="datetime-local" name="replacementStartAt" required>
                    </label>
                    <button type="submit" class="btn btn-primary btn-sm">Buat &amp; hubungkan pengganti</button>
                  </form>
                ` : ''}
              </article>`;
            }).join('')}
          </div>` : '<p style="color:var(--color-text-muted);">Belum ada jadwal sesi.</p>'}
        </div>
      </section>
    `;
  }

  /* --------------------------------------------------------------------------
     TAB 4: STUDENT RATES & INVOICES
     -------------------------------------------------------------------------- */
  renderBillingView() {
    const students = this.users.filter(user => user.role === 'student' && user.status === 'active');
    const invoices = this.invoices;
    const usersById = new Map(this.users.map(user => [user.id, user]));
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultPeriod = previousMonth.getFullYear() + '-' + String(previousMonth.getMonth() + 1).padStart(2, '0');

    return [
      '<section style="display:flex;flex-direction:column;gap:var(--space-5);">',
      '<div class="card" style="padding:var(--space-4);">',
      '<h3>Tarif per siswa</h3>',
      '<p>Admin menentukan tarif per pertemuan untuk setiap siswa. Perubahan tarif hanya berlaku pada draft/tagihan baru; tagihan lama menyimpan nominalnya sendiri.</p>',
      students.length ? students.map(student => {
        const rate = this.ratesByStudent.get(student.id);
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
    const createSeriesForm = this.container.querySelector('#admin-create-series-form');
    if (createSeriesForm) {
      createSeriesForm.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = createSeriesForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const formData = new FormData(createSeriesForm);
        try {
        const result = await this.repositories.classSessions.createRecurringSessionSeries({
          studentId: String(formData.get('studentId') || ''),
          tutorId: String(formData.get('tutorId') || ''),
          startDate: String(formData.get('startDate') || ''),
          startTime: String(formData.get('startTime') || ''),
          weekdays: formData.getAll('weekdays').map(Number),
          targetCount: Number(formData.get('targetCount')),
          durationMinutes: Number(formData.get('durationMinutes')),
          meetingUrl: String(formData.get('meetingUrl') || '')
        });
        if (!result.success) {
          showToast({ title: 'Jadwal gagal dibuat', message: result.message, type: 'error' });
        } else {
          const skipped = result.skippedSlots.filter(slot => slot.reason === 'CONFLICT').length;
          showToast({
            title: 'Seri jadwal berhasil dibuat',
            message: `${result.sessions.length} sesi dibuat.${skipped ? ` ${skipped} slot bentrok dilewati.` : ''}`,
            type: 'success'
          });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Jadwal gagal dibuat', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat jadwal.', type: 'error' });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    }

    this.container.querySelectorAll('[data-cancel-session]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await this.repositories.classSessions.cancelSession(
            button.getAttribute('data-cancel-session'),
            this.currentUser
          );
          if (!result.success) showToast({ title: 'Pembatalan gagal', message: result.message, type: 'error' });
          else {
            showToast({ title: 'Sesi dibatalkan', message: 'Sesi tidak masuk tagihan.', type: 'success' });
            this.render();
          }
        } catch (error) {
          showToast({ title: 'Pembatalan gagal', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan sesi.', type: 'error' });
        } finally {
          if (button.isConnected) button.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-soft-delete-session]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await this.repositories.classSessions.softDeleteSession(
            button.getAttribute('data-soft-delete-session'),
            this.currentUser
          );
          if (!result.success) showToast({ title: 'Penghapusan gagal', message: result.message, type: 'error' });
          else {
            showToast({ title: 'Sesi dihapus administratif', message: 'Riwayat tetap tersimpan dan sesi pengganti diperlukan.', type: 'success' });
            this.render();
          }
        } catch (error) {
          showToast({ title: 'Penghapusan gagal', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus sesi.', type: 'error' });
        } finally {
          if (button.isConnected) button.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-replacement-form]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        const localStart = String(formData.get('replacementStartAt') || '');
        const [localDate, localTime] = localStart.split('T');
        const start = localDate && localTime ? new Date(`${localDate}T${localTime}:00+07:00`) : new Date(NaN);
        if (!localStart || Number.isNaN(start.getTime())) {
          showToast({ title: 'Waktu tidak valid', message: 'Pilih waktu sesi pengganti terlebih dahulu.', type: 'error' });
          return;
        }
        if (submitButton) submitButton.disabled = true;
        try {
          const result = await this.repositories.classSessions.createReplacementSession(
            form.getAttribute('data-replacement-form'),
            { scheduledStartAt: start.toISOString() },
            this.currentUser
          );
          if (!result.success) showToast({ title: 'Sesi pengganti gagal dibuat', message: result.message, type: 'error' });
          else {
            showToast({ title: 'Sesi pengganti terhubung', message: 'Riwayat sesi asal tetap tersimpan.', type: 'success' });
            this.render();
          }
        } catch (error) {
          showToast({ title: 'Sesi pengganti gagal dibuat', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat sesi pengganti.', type: 'error' });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-rate-form]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const studentId = form.getAttribute('data-rate-form');
        const amount = Number(new FormData(form).get('amountPerSession'));
        const actor = this.currentUser;
        try {
        const result = await this.repositories.billing.setRate(studentId, amount, actor);
        if (!result.success) {
          showToast({ title: 'Tarif gagal disimpan', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tarif tersimpan', message: 'Tarif siswa berhasil diperbarui.', type: 'success' });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Tarif gagal disimpan', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan tarif.', type: 'error' });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    });

    // Generate invoice from billable operational sessions
    const invoiceForm = this.container.querySelector('#admin-create-invoice-form');
    if (invoiceForm) {
      invoiceForm.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = invoiceForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const formData = new FormData(invoiceForm);
        const actor = this.currentUser;
        try {
        const result = await this.repositories.billing.createInvoice(String(formData.get('studentId') || ''), String(formData.get('period') || ''), actor);
        if (!result.success) {
          showToast({ title: 'Tagihan tidak dibuat', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Draft tagihan dibuat', message: `${result.invoice.totalSessions} pertemuan siap diperiksa sebelum diterbitkan.`, type: 'success' });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Tagihan tidak dibuat', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat tagihan.', type: 'error' });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    }

    this.container.querySelectorAll('[data-draft-form]').forEach(form => {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        const invoiceId = form.getAttribute('data-draft-form');
        const formData = new FormData(form);
        try {
        const result = await this.repositories.billing.updateDraftInvoice(invoiceId, {
          sessionIds: formData.getAll('sessionIds').map(String),
          discountAmount: Number(formData.get('discountAmount')),
          additionalCharges: Number(formData.get('additionalCharges')),
          totalAmount: Number(formData.get('totalAmount')),
          adjustmentNote: String(formData.get('adjustmentNote') || '')
        }, this.currentUser);
        if (!result.success) {
          showToast({ title: 'Koreksi draft gagal', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Draft diperbarui', message: 'Koreksi tagihan berhasil disimpan.', type: 'success' });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Koreksi draft gagal', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui draft.', type: 'error' });
        } finally {
          if (submitButton && submitButton.isConnected) submitButton.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-issue-invoice]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
        const result = await this.repositories.billing.issueInvoice(button.getAttribute('data-issue-invoice'), this.currentUser);
        if (!result.success) {
          showToast({ title: 'Tagihan belum diterbitkan', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tagihan diterbitkan', message: 'Tagihan sekarang tampil di riwayat Parent Hub.', type: 'success' });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Tagihan belum diterbitkan', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat menerbitkan tagihan.', type: 'error' });
        } finally {
          if (button.isConnected) button.disabled = false;
        }
      });
    });

    this.container.querySelectorAll('[data-mark-invoice-paid]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const actor = this.currentUser;
        try {
        const result = await this.repositories.billing.markPaid(button.getAttribute('data-mark-invoice-paid'), actor);
        if (!result.success) {
          showToast({ title: 'Pembayaran gagal diperbarui', message: result.message, type: 'error' });
        } else {
          showToast({ title: 'Tagihan lunas', message: 'Status tagihan berhasil diperbarui.', type: 'success' });
          this.render();
        }
        } catch (error) {
          showToast({ title: 'Pembayaran gagal diperbarui', message: error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui pembayaran.', type: 'error' });
        } finally {
          if (button.isConnected) button.disabled = false;
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
        const user = this.usersById.get(uid);
        if (user) this.openUserModal(user);
      });
    });

    // Toggle status buttons (activate / deactivate)
    const toggleBtns = this.container.querySelectorAll('[data-action="toggle-status"]');
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = btn.getAttribute('data-user-id');
        const targetStatus = btn.getAttribute('data-target-status');
        const res = targetStatus === 'active'
          ? await this.repositories.identity.activateUser(uid)
          : await this.repositories.identity.deactivateUser(uid);

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
      btn.addEventListener('click', async () => {
        const tid = btn.getAttribute('data-tutor-id');
        const sid = btn.getAttribute('data-student-id');
        const removed = await this.repositories.identity.removeTutorStudentAssignment(tid, sid);
        if (!removed) {
          showToast({ title: 'Penugasan Tidak Berubah', message: 'Relasi aktif tidak ditemukan atau akses ditolak.', type: 'warning' });
          return;
        }
        showToast({ title: 'Penugasan Diakhiri', message: 'Riwayat relasi disimpan di Supabase.', type: 'info' });
        await this.refreshData();
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
          <h3 class="modal-title">${isEdit ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}</h3>
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
              <select id="admin-select-role" class="form-control" ${isEdit ? 'disabled' : ''}>
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
          <div class="form-group" id="admin-student-login-group" style="${user.role === 'student' || !isEdit ? '' : 'display: none;'}">
            <label for="admin-input-whatsapp" class="form-label">Nomor WhatsApp Siswa *</label>
            <input type="tel" id="admin-input-whatsapp" class="form-control" value="${escapeHtml(user.whatsapp || '')}" placeholder="contoh: 081234567890" autocomplete="tel" />
            <label for="admin-input-mpin" class="form-label">MPIN 6 Digit ${isEdit ? '(kosongkan jika tidak diubah)' : '*'}</label>
            <input type="password" id="admin-input-mpin" class="form-control" value="" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" placeholder="6 digit angka" />
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
    const studentLoginGroup = modal.querySelector('#admin-student-login-group');
    if (roleSelect && gradeGroup && studentLoginGroup) {
      roleSelect.addEventListener('change', () => {
        const isStudent = roleSelect.value === 'student';
        gradeGroup.style.display = isStudent ? '' : 'none';
        studentLoginGroup.style.display = isStudent ? '' : 'none';
      });
    }

    const closeModal = () => modal.classList.remove('is-open');
    modal.querySelector('#btn-close-user-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-user-modal')?.addEventListener('click', closeModal);

    modal.querySelector('#btn-save-user-modal')?.addEventListener('click', async () => {
      const name = modal.querySelector('#admin-input-name')?.value.trim();
      const email = modal.querySelector('#admin-input-email')?.value.trim();
      const role = modal.querySelector('#admin-select-role')?.value;
      const status = modal.querySelector('#admin-select-status')?.value;
      const grade = modal.querySelector('#admin-input-grade')?.value.trim();
      const whatsapp = modal.querySelector('#admin-input-whatsapp')?.value.trim();
      const mpin = modal.querySelector('#admin-input-mpin')?.value.trim();

      if (!name || !email) {
        showToast({ title: 'Data Kurang', message: 'Nama dan email wajib diisi.', type: 'warning' });
        return;
      }
      if (role === 'student' && (!whatsapp || (!isEdit && !/^[0-9]{6}$/.test(mpin || '')) || (mpin && !/^[0-9]{6}$/.test(mpin)))) {
        showToast({ title: 'Data Login Siswa Belum Lengkap', message: 'Siswa memerlukan nomor WhatsApp dan MPIN tepat 6 digit. Saat edit, MPIN boleh dikosongkan jika tidak diubah.', type: 'warning' });
        return;
      }

      let res;
      if (isEdit) {
        res = await this.repositories.identity.updateUser(user.id, {
          displayName: name,
          email,
          role,
          status,
          gradeLevel: role === 'student' ? grade : undefined,
          whatsapp: role === 'student' ? whatsapp : undefined,
          mpin: role === 'student' && mpin ? mpin : undefined
        });
      } else {
        res = await this.repositories.identity.createUser({
          displayName: name,
          email,
          role,
          status,
          gradeLevel: role === 'student' ? grade : undefined,
          whatsapp: role === 'student' ? whatsapp : undefined,
          mpin: role === 'student' ? mpin : undefined
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
        await this.refreshData();
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

    const tutors = this.users.filter(user => user.role === 'tutor');
    const students = this.users.filter(user => user.role === 'student');

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

    modal.querySelector('#btn-save-tutor-rel-modal')?.addEventListener('click', async () => {
      const tid = modal.querySelector('#select-rel-tutor')?.value;
      const sid = modal.querySelector('#select-rel-student')?.value;

      const res = await this.repositories.identity.assignStudentToTutor(tid, sid);
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
    this.destroyed = true;
    this.refreshSequence += 1;
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
    void this.refreshData();
  }
}

function formatSessionDateTime(value) {
  if (!value) return 'Waktu tidak diketahui';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
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
