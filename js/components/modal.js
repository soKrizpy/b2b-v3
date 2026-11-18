/**
 * B2B LEARNING ENGINE - ACCESSIBLE MODAL COMPONENT
 * Focused dialog system adhering to Section 5.10, 5.12, 13 of PROJECT_RULES.md.
 */

let activeModal = null;
let lastFocusedElement = null;

export const Modal = {
  /**
   * Open modal by DOM element or ID
   * @param {string|HTMLElement} target
   */
  open(target) {
    const modalEl = typeof target === 'string' ? document.getElementById(target) : target;
    if (!modalEl) return;

    if (activeModal && activeModal !== modalEl) {
      this.close(activeModal);
    }

    lastFocusedElement = document.activeElement;
    activeModal = modalEl;

    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');

    // Focus the first focusable element inside modal
    const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.handleKeyDown);
  },

  /**
   * Close modal by DOM element or ID
   * @param {string|HTMLElement} [target]
   */
  close(target) {
    const modalEl = target
      ? (typeof target === 'string' ? document.getElementById(target) : target)
      : activeModal;

    if (!modalEl) return;

    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');

    document.removeEventListener('keydown', this.handleKeyDown);
    document.body.style.overflow = '';

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }

    if (activeModal === modalEl) {
      activeModal = null;
    }
  },

  handleKeyDown(e) {
    if (e.key === 'Escape' && activeModal) {
      Modal.close(activeModal);
    }
  },

  initGlobalTriggers() {
    // Backdrop click dismiss
    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal-backdrop')) {
        Modal.close(e.target);
      } else if (e.target.closest('[data-modal-close]')) {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) Modal.close(modal);
      } else if (e.target.closest('[data-modal-target]')) {
        const trigger = e.target.closest('[data-modal-target]');
        const targetId = trigger.getAttribute('data-modal-target');
        Modal.open(targetId);
      }
    });
  }
};

