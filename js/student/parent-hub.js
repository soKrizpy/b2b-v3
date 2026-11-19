/**
 * Parent Hub embedded in the Student Workspace.
 * Local demo implementation: only actual submitted session reports are shown.
 * Monthly evaluations and invoices remain empty until their real workflows exist.
 */

import { SessionStore } from '../services/session-store.js';

const TABS = [
  { id: 'sessions', label: 'Laporan Sesi' },
  { id: 'monthly', label: 'Perkembangan Bulanan' },
  { id: 'invoices', label: 'Riwayat Tagihan' }
];

export class ParentHubView {
  constructor(container, studentUser, onBack = () => {}) {
    this.container = container;
    this.studentUser = studentUser || {};
    this.onBack = onBack;
    this.activeTab = 'sessions';
    this.unsubscribeSessionStore = null;
  }

  init() {
    this.unsubscribeSessionStore = SessionStore.subscribe(() => {
      if (this.activeTab === 'sessions') this.renderContent();
    });
    this.render();
  }

  destroy() {
    if (this.unsubscribeSessionStore) {
      this.unsubscribeSessionStore();
      this.unsubscribeSessionStore = null;
    }
  }

  render() {
    if (!this.container) return;
    const studentName = this.studentUser.name || 'Siswa';
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
          Ruang ini masih menggunakan penyimpanan demo lokal. Hanya laporan sesi yang sudah dikirim tutor yang ditampilkan.
          Data bulanan dan tagihan akan muncul setelah fitur pencatatannya tersedia.
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
        this.render();
      });
    });
    this.renderContent();
  }

  renderContent() {
    const content = this.container?.querySelector('#parent-hub-tab-content');
    if (!content) return;
    if (this.activeTab === 'sessions') content.innerHTML = this.renderSessionReports();
    else if (this.activeTab === 'monthly') content.innerHTML = this.renderEmptyState(
      'Belum ada evaluasi bulanan',
      'Evaluasi perkembangan bulanan akan tampil setelah tutor mengisi dan mengirim laporan evaluasi.'
    );
    else content.innerHTML = this.renderEmptyState(
      'Belum ada riwayat tagihan',
      'Riwayat tagihan akan tampil setelah admin membuat tagihan untuk sesi belajar yang memenuhi ketentuan.'
    );
  }

  renderSessionReports() {
    const reports = SessionStore.getStudentSubmittedReports(this.studentUser.id);
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
