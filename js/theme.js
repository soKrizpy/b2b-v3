/**
 * B2B LEARNING ENGINE - THEME CONTROLLER
 * Manages Light / Dark mode switching, persistent storage, and OS theme sync.
 * Adheres strictly to Section 12 of PROJECT_RULES.md.
 */

const THEME_STORAGE_KEY = 'b2b_theme_preference';

export const Theme = {
  current: 'light',

  init() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    this.setTheme(initialTheme, false);

    // Listen to OS system theme changes if user hasn't explicitly set a preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          this.setTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  },

  setTheme(theme, persist = true) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    // Update toggle buttons if present
    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    toggleButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', theme === 'dark');
      btn.setAttribute('title', `Ganti ke tema ${theme === 'dark' ? 'terang' : 'gelap'}`);
      const icon = btn.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
      const label = btn.querySelector('.theme-label');
      if (label) {
        label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
      }
    });

    // Dispatch custom event for listeners
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },

  toggle() {
    const nextTheme = this.current === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme, true);
    return nextTheme;
  },

  /**
   * Initialize mobile sidebar toggle button (hamburger menu).
   * Call once after Theme.init() on pages that have a sidebar.
   */
  initMobileMenu() {
    const toggleBtn = document.getElementById('btn-sidebar-toggle');
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!toggleBtn || !sidebarNav) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = sidebarNav.classList.toggle('mobile-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.innerHTML = isOpen
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    });
  }
};

