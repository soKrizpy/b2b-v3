/**
 * Parent Hub embedded in the Student Workspace.
 * Loads submitted reports, published monthly evaluations, and issued invoices
 * through asynchronous repositories. Production repositories provide student-scoped, read-only data.
 */

import { createScopedWorkspaceRepositories, WorkspaceRepositories } from '../services/workspace-repositories.js';

const TABS = [
  { id: 'summary', label: 'Ringkasan Belajar' },
  { id: 'topics', label: 'Progres Topik' },
  { id: 'projects', label: 'Portofolio Karya' },
  { id: 'final', label: 'Final Boss & Sertifikat' },
  { id: 'sessions', label: 'Laporan Sesi' },
  { id: 'monthly', label: 'Perkembangan Bulanan' },
  { id: 'invoices', label: 'Riwayat Tagihan' }
];

export class ParentHubView {
  constructor(container, studentUser, onBack = () => {}, repositories = WorkspaceRepositories, moduleId = null) {
    this.container = container;
    this.studentUser = studentUser || {};
    this.repositories = createScopedWorkspaceRepositories(repositories, ['sessionReports', 'monthlyEvaluations', 'billing', 'parentHub']);
    this.moduleId = Number(moduleId);
    this.onBack = onBack;
    this.activeTab = 'summary';
    this.learningOverview = null;
    this.unsubscribeSessionStore = null;
    this.unsubscribeBillingStore = null;
    this.unsubscribeMonthlyEvaluationStore = null;
    this.sessionReports = [];
    this.monthlyEvaluations = [];
    this.invoices = [];
    this.isLoading = true;
    this.loadRequest = 0;
    this.destroyed = false;
  }

  init() {
    this.unsubscribeSessionStore = this.repositories.sessionReports.subscribe(() => {
      if (this.activeTab === 'sessions') void this.refreshActiveTab();
    });
    this.unsubscribeBillingStore = this.repositories.billing.subscribe(() => {
      if (this.activeTab === 'invoices') void this.refreshActiveTab();
    });
    this.unsubscribeMonthlyEvaluationStore = this.repositories.monthlyEvaluations.subscribe(() => {
      if (this.activeTab === 'monthly') void this.refreshActiveTab();
    });
    this.render();
  }

  destroy() {
    this.destroyed = true;
    this.loadRequest += 1;
    if (this.unsubscribeSessionStore) {
      this.unsubscribeSessionStore();
      this.unsubscribeSessionStore = null;
    }
    if (this.unsubscribeBillingStore) {
      this.unsubscribeBillingStore();
      this.unsubscribeBillingStore = null;
    }
    if (this.unsubscribeMonthlyEvaluationStore) {
      this.unsubscribeMonthlyEvaluationStore();
      this.unsubscribeMonthlyEvaluationStore = null;
    }
  }

  render() {
    if (!this.container) return;
    const studentName = this.studentUser.displayName || this.studentUser.name || 'Siswa';
    const tabs = TABS.map(tab => `
      <button type="button" class="parent-tab-btn ${this.activeTab === tab.id ? 'is-active' : ''}"
        data-parent-tab="${tab.id}" aria-pressed="${this.activeTab === tab.id}">
        ${tab.label}
      </button>
    `).join('');

    this.container.innerHTML = `
      <section class="parent-hub-container" aria-label="Ruang Orang Tua">
        <header class="parent-hub-banner">
          <div class="parent-hub-banner-info">
            <div class="parent-hub-avatar" aria-hidden="true">${escapeHtml(this.studentUser.avatar || studentName.slice(0, 2).toUpperCase())}</div>
            <div>
              <h2 class="parent-hub-title">Laporan Belajar ${escapeHtml(studentName)}</h2>
              <p class="parent-hub-subtitle">Pantau laporan pertemuan, perkembangan, dan tagihan belajar.</p>
            </div>
          </div>
          <span class="badge badge-in-progress">Akun siswa</span>
        </header>

        <div class="parent-demo-notice-banner" role="note">
          Data dibaca langsung dari Supabase. Hanya laporan yang diterbitkan, evaluasi yang dipublikasikan, dan tagihan yang sudah diterbitkan yang ditampilkan.
        </div>

        <div class="parent-hub-toolbar">
          <button type="button" class="btn btn-secondary" id="btn-parent-hub-back">← Kembali ke Ruang Belajar</button>
        </div>

        <nav class="parent-hub-tabs" aria-label="Laporan belajar">
          ${tabs}
        </nav>
        <div class="parent-hub-content" id="parent-hub-tab-content" role="region" aria-live="polite"></div>
      </section>
    `;

    this.container.querySelector('#btn-parent-hub-back')?.addEventListener('click', () => this.onBack());
    this.container.querySelectorAll('[data-parent-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-parent-tab');
        if (!TABS.some(item => item.id === tab) || tab === this.activeTab) return;
        this.activeTab = tab;
        this.isLoading = true;
        this.render();
      });
    });
    this.renderContent();
    void this.refreshActiveTab();
  }

  async refreshActiveTab() {
    const request = ++this.loadRequest;
    this.isLoading = true;
    this.renderContent();
    try {
      if (['summary', 'topics', 'projects', 'final'].includes(this.activeTab)) {
        this.learningOverview = await this.repositories.parentHub.getMyModule(this.moduleId);
      } else if (this.activeTab === 'sessions') {
        this.sessionReports = await this.repositories.sessionReports.listStudentSubmittedReports(this.studentUser.id);
      } else if (this.activeTab === 'monthly') {
        this.monthlyEvaluations = await this.repositories.monthlyEvaluations.listStudentPublished(this.studentUser.id);
      } else {
        this.invoices = await this.repositories.billing.getStudentInvoiceHistory(this.studentUser.id);
      }
      if (this.destroyed || request !== this.loadRequest) return;
      this.isLoading = false;
      this.renderContent();
    } catch (error) {
      console.error('Parent Hub gagal memuat data:', error);
      if (this.destroyed || request !== this.loadRequest) return;
      this.isLoading = false;
      const content = this.container?.querySelector('#parent-hub-tab-content');
      if (content) content.innerHTML = this.renderEmptyState('Data belum dapat dimuat', 'Silakan coba buka kembali tab ini.');
    }
  }

  handleStoreChange() {
    void this.refreshActiveTab();
  }

  renderContent() {
    const content = this.container?.querySelector('#parent-hub-tab-content');
    if (!content) return;
    if (this.isLoading) {
      content.innerHTML = '<div class="card parent-empty-state" role="status">Memuat data…</div>';
      return;
    }
    if (this.activeTab === 'summary') content.innerHTML = this.renderSummary();
    else if (this.activeTab === 'topics') content.innerHTML = this.renderTopics();
    else if (this.activeTab === 'projects') content.innerHTML = this.renderProjects();
    else if (this.activeTab === 'final') content.innerHTML = this.renderFinalBoss();
    else if (this.activeTab === 'sessions') content.innerHTML = this.renderSessionReports();
    else if (this.activeTab === 'monthly') content.innerHTML = this.renderMonthlyEvaluations();
    else content.innerHTML = this.renderInvoices();
  }

  renderSummary() {
    const topics = this.learningOverview?.topics || [];
    const complete = topics.filter(topic => topic.stages?.submission === 'completed' || topic.stages?.submission === 'skipped').length;
    const quizzes = topics.flatMap(topic => topic.quizAttempts || []);
    const average = quizzes.length ? Math.round(quizzes.reduce((sum, item) => sum + Number(item.score || 0), 0) / quizzes.length) : null;
    return `<div class="parent-summary-grid">
      <article class="card"><span class="session-box-title">Topik diselesaikan</span><strong>${complete} dari ${topics.length}</strong></article>
      <article class="card"><span class="session-box-title">Rata-rata Kuis Singkat</span><strong>${average === null ? 'Belum ada nilai' : `${average}%`}</strong></article>
      <article class="card"><span class="session-box-title">Karya terkirim</span><strong>${topics.reduce((sum, topic) => sum + (topic.projects?.length || 0), 0)}</strong></article>
    </div>`;
  }

  renderTopics() {
    const topics = this.learningOverview?.topics || [];
    if (!topics.length) return this.renderEmptyState('Belum ada progres topik', 'Topik yang terbuka akan muncul sesuai jadwal kelas.');
    return `<div class="parent-session-report-list">${topics.map(topic => {
      const attempts = topic.quizAttempts || [];
      const score = attempts.length
        ? `${Math.max(...attempts.map(attempt => Number(attempt.score) || 0))}%`
        : 'Belum dikerjakan';
      const stages = Object.keys(topic.stages || {}).length;
      return `<article class="session-report-card"><div class="session-report-header"><div><span class="badge badge-in-progress">Topik ${Number(topic.order) + 1}</span><h3>${escapeHtml(topic.title)}</h3><div class="session-meta-row">${stages}/6 tahap tercatat · Kuis: ${escapeHtml(score)}</div></div></div></article>`;
    }).join('')}</div>`;
  }

  renderProjects() {
    const projects = (this.learningOverview?.topics || []).flatMap(topic => (topic.projects || []).map(project => ({ ...project, topicTitle: topic.title })));
    if (!projects.length) return this.renderEmptyState('Belum ada karya terkirim', 'Tautan karya akan tampil setelah siswa mengirimkan proyek.');
    return `<div class="parent-session-report-list">${projects.map(project => `<article class="session-report-card"><div class="session-report-header"><div><span class="badge badge-in-progress">${escapeHtml(project.status)}</span><h3>${escapeHtml(project.title)}</h3><div class="session-meta-row">${escapeHtml(project.topicTitle)} · ${escapeHtml(formatDate(project.submittedAt))}</div></div></div>${project.url ? `<a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">Buka karya</a>` : ''}${project.reviewNote ? `<p class="session-narrative-text">Catatan tutor: ${escapeHtml(project.reviewNote)}</p>` : ''}</article>`).join('')}</div>`;
  }

  renderFinalBoss() {
    const finalBoss = this.learningOverview?.finalBoss;
    const certificate = this.learningOverview?.certificate;
    if (!finalBoss) return this.renderEmptyState('Final Boss belum dikerjakan', 'Hasil akan muncul setelah seluruh topik selesai dan Final Boss dikirim.');
    return `<article class="session-report-card"><span class="badge badge-approved">Final Boss selesai</span><h3>Nilai ${Number(finalBoss.score)}%</h3><p class="session-narrative-text">Dikirim ${escapeHtml(formatDate(finalBoss.submittedAt))}</p>${certificate ? `<div class="session-box"><span class="session-box-title">Sertifikat ${escapeHtml(certificate.tier)}</span><p>Nomor: ${escapeHtml(certificate.number)} · diterbitkan ${escapeHtml(formatDate(certificate.issuedAt))}</p></div>` : '<p class="session-narrative-text">Sertifikat belum diterbitkan.</p>'}</article>`;
  }

  renderMonthlyEvaluations() {
    const evaluations = this.monthlyEvaluations;
    if (!evaluations.length) return this.renderEmptyState(
      'Belum ada evaluasi bulanan',
      'Evaluasi akan muncul setelah tutor mengirim laporan perkembangan untuk bulan tersebut.'
    );
    return `<div class="parent-session-report-list">
      ${evaluations.map(item => {
        const [year, month] = item.period.split('-').map(Number);
        const periodLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
          .format(new Date(Date.UTC(year, month - 1, 1)));
        return `<article class="session-report-card" data-parent-monthly-evaluation="${escapeHtml(item.id)}">
          <div class="session-report-header">
            <div class="session-title-group">
              <span class="badge badge-approved">Evaluasi tutor terkirim</span>
              <h3>Perkembangan ${escapeHtml(periodLabel)}</h3>
              <div class="session-meta-row">Tutor: <strong>${escapeHtml(item.tutorName || "Tutor")}</strong></div>
            </div>
            <strong>${escapeHtml(item.rating)}</strong>
          </div>
          <div class="session-box"><span class="session-box-title">Ringkasan perkembangan</span><p class="session-narrative-text">${escapeHtml(item.summary)}</p></div>
          <div class="session-sections-grid">
            <div class="session-box"><span class="session-box-title">Hal yang sudah dikuasai</span><p class="session-narrative-text">${escapeHtml(item.strengths)}</p></div>
            <div class="session-box"><span class="session-box-title">Target bulan berikutnya</span><p class="session-narrative-text">${escapeHtml(item.nextGoals)}</p></div>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  }

  renderInvoices() {
    const invoices = this.invoices;
    if (!invoices.length) {
      return this.renderEmptyState(
        'Belum ada riwayat tagihan',
        'Riwayat tagihan akan muncul setelah admin membuat tagihan untuk pertemuan yang memenuhi ketentuan.'
      );
    }

    return `
      <div class="parent-session-report-list">
        ${invoices.map(invoice => `
          <article class="session-report-card" data-parent-invoice-id="${escapeHtml(invoice.id)}">
            <div class="session-report-header">
              <div class="session-title-group">
                <span class="badge ${invoice.status === 'paid' ? 'badge-approved' : 'badge-in-progress'}">${invoice.status === 'paid' ? 'Lunas' : 'Belum dibayar'}</span>
                <h3>Tagihan ${escapeHtml(formatInvoicePeriod(invoice.period))}</h3>
                <div class="session-meta-row">
                  <span>${Number(invoice.totalSessions) || 0} pertemuan</span>
                  <span>Tarif per pertemuan: <strong>${formatRupiah(invoice.rateSnapshot)}</strong></span>
                </div>
              </div>
              <strong>${formatRupiah(invoice.totalAmount)}</strong>
            </div>
            <div class="session-box">
              <span class="session-box-title">Rincian tagihan</span>
              <div class="session-meta-row"><span>Subtotal</span><strong>${formatRupiah(invoice.subtotalAmount ?? invoice.totalAmount)}</strong></div>
              ${Number(invoice.discountAmount) > 0 ? `<div class="session-meta-row"><span>Diskon khusus</span><strong>−${formatRupiah(invoice.discountAmount)}</strong></div>` : ''}
              ${Number(invoice.additionalCharges) > 0 ? `<div class="session-meta-row"><span>Biaya tambahan</span><strong>+${formatRupiah(invoice.additionalCharges)}</strong></div>` : ''}
              ${invoice.adjustmentNote ? `<p class="session-narrative-text">Catatan penyesuaian: ${escapeHtml(invoice.adjustmentNote)}</p>` : ''}
              <div class="session-meta-row"><strong>Total tagihan</strong><strong>${formatRupiah(invoice.totalAmount)}</strong></div>
              <span class="session-box-title" style="display:block;margin-top:var(--space-3);">Rincian pertemuan</span>
              ${(invoice.items || []).length ? `
                <ul>
                  ${invoice.items.map(item => `
                    <li>Sesi ke-${Number(item.sessionNumber) || '-'} · ${escapeHtml(formatDate(item.sessionDate))} · ${formatRupiah(item.amount)}</li>
                  `).join('')}
                </ul>
              ` : `<p class="session-narrative-text">Rincian sesi untuk tagihan historis ini belum dapat diverifikasi dari jadwal dan presensi yang tersimpan. Total tagihan lama tetap dipertahankan.</p>`}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderSessionReports() {
    const reports = this.sessionReports;
    if (!reports.length) {
      return this.renderEmptyState(
        'Belum ada laporan sesi',
        'Laporan akan muncul di sini setelah tutor mengirim laporan pertemuan untuk siswa ini.'
      );
    }

    return `
      <div class="parent-session-report-list">
        ${reports.map(report => `
          <article class="session-report-card">
            <div class="session-report-header">
              <div class="session-title-group">
                <span class="badge badge-approved">Laporan tutor terkirim</span>
                ${report.sessionNumber ? `<span class="badge badge-scratch">Sesi ke-${Number(report.sessionNumber)}</span>` : ''}
                <h3>${escapeHtml(report.topic || 'Sesi Pembelajaran')}</h3>
                <div class="session-meta-row">
                  <span>${escapeHtml(formatDate(report.sessionDate))}</span>
                  <span>Tutor: <strong>${escapeHtml(report.tutorName || 'Tutor')}</strong></span>
                </div>
              </div>
            </div>
            <div class="session-sections-grid">
              <div class="session-box">
                <span class="session-box-title">Aktivitas Pembelajaran</span>
                <p class="session-narrative-text">${escapeHtml(formatList(report.activities))}</p>
              </div>
              <div class="session-box">
                <span class="session-box-title">Pencapaian Siswa</span>
                <p class="session-narrative-text">${escapeHtml(formatList(report.achievements))}</p>
              </div>
            </div>
            ${report.difficulties || report.solutions ? `
              <div class="session-box">
                <span class="session-box-title">Tantangan dan Pendampingan</span>
                ${report.difficulties ? `<p class="session-narrative-text"><strong>Tantangan:</strong> ${escapeHtml(report.difficulties)}</p>` : ''}
                ${report.solutions ? `<p class="session-narrative-text"><strong>Solusi:</strong> ${escapeHtml(report.solutions)}</p>` : ''}
              </div>
            ` : ''}
            ${report.parentRecommendations ? `
              <div class="parent-tip-box">
                <div class="parent-tip-content">
                  <h4>Rekomendasi untuk Ayah/Bunda</h4>
                  <p>${escapeHtml(report.parentRecommendations)}</p>
                </div>
              </div>
            ` : ''}
          </article>
        `).join('')}
      </div>
    `;
  }

  renderEmptyState(title, description) {
    return `
      <div class="card parent-empty-state" role="status">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
    `;
  }
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function formatInvoicePeriod(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return value || 'Periode tidak diketahui';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' • ');
  return value || 'Belum ada catatan.';
}

function formatDate(value) {
  if (!value) return 'Tanggal belum dicatat';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}
