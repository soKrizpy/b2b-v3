/**
 * B2B LEARNING ENGINE - CONTEXTUAL DRAWER COMPONENT
 * Slide-in drawer for contextual tasks (e.g. Teacher Submission Review).
 * Adheres strictly to Section 5.9, 5.13, 10 of PROJECT_RULES.md.
 */

let activeDrawer = null;
let lastFocusedElement = null;

export const Drawer = {
  /**
   * Open drawer by DOM element or ID
   * @param {string|HTMLElement} target
   */
  open(target) {
    const drawerEl = typeof target === 'string' ? document.getElementById(target) : target;
    if (!drawerEl) return;

    if (activeDrawer && activeDrawer !== drawerEl) {
      this.close(activeDrawer);
    }

    lastFocusedElement = document.activeElement;
    activeDrawer = drawerEl;

    drawerEl.classList.add('is-open');
    drawerEl.setAttribute('aria-hidden', 'false');

    // Focus close or primary action inside drawer (Section 5.9 & 13)
    const setDrawerFocus = () => {
      const closeBtn = drawerEl.querySelector('[data-drawer-close]');
      if (closeBtn && typeof closeBtn.focus === 'function') {
        closeBtn.focus();
      } else {
        const firstFocusable = drawerEl.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
          firstFocusable.focus();
        }
      }
    };

    // Use rAF to focus after style recalc; fallback timer for headless/slow environments
    requestAnimationFrame(() => {
      setDrawerFocus();
      // Secondary attempt after CSS transitions are likely resolved
      setTimeout(setDrawerFocus, 100);
    });

    // Do NOT reset main window scroll - preserve queue position (Section 5.13)
    document.addEventListener('keydown', this.handleKeyDown);
  },

  /**
   * Close drawer
   * @param {string|HTMLElement} [target]
   * @param {HTMLElement} [fallbackEl] Optional fallback element if trigger is detached
   */
  close(target, fallbackEl) {
    const drawerEl = target
      ? (typeof target === 'string' ? document.getElementById(target) : target)
      : activeDrawer;

    if (!drawerEl) return;

    drawerEl.classList.remove('is-open');
    drawerEl.setAttribute('aria-hidden', 'true');

    document.removeEventListener('keydown', this.handleKeyDown);

    // Return focus to trigger element without scrolling page if still in DOM
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function' && document.body.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    } else {
      // Safe Detached Fallback (Phase 1 Cleanup A1)
      const fallbackTarget = (fallbackEl && document.body.contains(fallbackEl))
        ? fallbackEl
        : (document.querySelector('.queue-table [data-open-review]')
           || document.getElementById('queue-heading')
           || document.querySelector('.queue-title')
           || document.getElementById('page-heading')
           || document.querySelector('main h1, main h2'));
      if (fallbackTarget && typeof fallbackTarget.focus === 'function') {
        if (!fallbackTarget.hasAttribute('tabindex') && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(fallbackTarget.tagName)) {
          fallbackTarget.setAttribute('tabindex', '-1');
        }
        fallbackTarget.focus({ preventScroll: true });
      }
    }

    if (activeDrawer === drawerEl) {
      activeDrawer = null;
    }
  },

  handleKeyDown(e) {
    if (!activeDrawer) return;

    if (e.key === 'Escape') {
      Drawer.close(activeDrawer);
      return;
    }

    // Accessible Focus Trap within Drawer dialog
    if (e.key === 'Tab') {
      const focusables = Array.from(
        activeDrawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }
  },

  initGlobalTriggers() {
    document.addEventListener('click', (e) => {
      // Click on backdrop outside drawer container
      if (e.target.matches('.drawer-backdrop')) {
        Drawer.close(e.target);
      } else if (e.target.closest('[data-drawer-close]')) {
        const backdrop = e.target.closest('.drawer-backdrop');
        if (backdrop) Drawer.close(backdrop);
      } else if (e.target.closest('[data-drawer-target]')) {
        const trigger = e.target.closest('[data-drawer-target]');
        const targetId = trigger.getAttribute('data-drawer-target');
        Drawer.open(targetId);
      }
    });
  }
};

