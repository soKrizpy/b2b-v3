/**
 * B2B LEARNING ENGINE - TOAST COMPONENT
 * Lightweight, non-intrusive toast notification system.
 * Adheres strictly to Section 5.11 of PROJECT_RULES.md.
 */

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.title - Toast header title
 * @param {string} options.message - Toast description message
 * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Severity level
 * @param {number} [options.duration=3500] - Duration in ms before auto-dismiss
 */
export function showToast({ title, message = '', type = 'info', duration = 3500 }) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const iconText = ICONS[type] || ICONS.info;

  toast.innerHTML = `
    <span class="toast-icon-symbol" aria-hidden="true" style="font-weight: bold; font-size: 1rem;">${iconText}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" type="button" aria-label="Tutup notifikasi">×</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const dismiss = () => {
    toast.classList.remove('toast-visible');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 200);
  };

  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);

  // Trigger animation frame for transition
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { dismiss };
}

