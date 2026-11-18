/* Design Direction Preview â€” app.js */
/* All interactivity and static mock data for the prototype */

(function() {
  'use strict';

  // ===== View Switching =====
  const navItems = document.querySelectorAll('.nav-item');
  const body = document.body;

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      
      // Update active nav item
      navItems.forEach(nav => nav.removeAttribute('aria-current'));
      item.setAttribute('aria-current', 'page');
      
      // Update active view
      body.setAttribute('data-active-view', target);
    });
  });

  // Set initial view to 'admin'
  body.setAttribute('data-active-view', 'admin');

  // ===== Theme Toggle =====
  const themeToggle = document.querySelector('.theme-toggle');
  
  // Initialize theme from localStorage or default to 'light'
  function initializeTheme() {
    const savedTheme = localStorage.getItem('proto_theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('proto_theme', next);
  }

  themeToggle.addEventListener('click', toggleTheme);

  // Initialize on load
  initializeTheme();
})();

/* ===== Tutor Submission Tab Filter ===== */
(function() {
  'use strict';

  /*
   * STATUS CLASSIFICATION (Bug 2 fix):
   * - 'pending'  → Menunggu Review  (not yet seen by tutor)
   * - 'reviewed' → Sudah Direview   (tutor opened, gave feedback, not yet approved)
   * - 'approved' → Sudah Direview   (approved IS the result of review — belongs in same tab)
   *
   * Rationale: a tutor searching "pekerjaan yang sudah saya tangani" expects both
   * 'reviewed' and 'approved' in the same tab. 'approved' is not a separate workflow
   * state from the tutor's perspective — it is the final outcome of a review action.
   */

  var TAB_FILTER = {
    'pending':  ['pending'],
    'reviewed': ['reviewed', 'approved'],  // Bug 2: approved is a reviewed outcome
    'all':      ['pending', 'reviewed', 'approved'],
    'jadwal':   []  // Bug 1: empty — Jadwal has no submission items
  };

  var tabBtns = document.querySelectorAll('[data-view="tutor"] .tab-btn[data-tab]');
  var submissionItems = document.querySelectorAll('[data-view="tutor"] .submission-item[data-submission-status]');
  var emptyState = document.querySelector('[data-view="tutor"] .submission-empty-state');

  function applyFilter(activeTab) {
    var allowed = TAB_FILTER[activeTab];

    // Show/hide submission items
    submissionItems.forEach(function(item) {
      var status = item.getAttribute('data-submission-status');
      if (allowed && allowed.indexOf(status) !== -1) {
        item.removeAttribute('hidden');
      } else {
        item.setAttribute('hidden', '');
      }
    });

    // Show empty state only for jadwal tab (which has no submissions)
    if (emptyState) {
      if (activeTab === 'jadwal') {
        emptyState.removeAttribute('hidden');
      } else {
        emptyState.setAttribute('hidden', '');
      }
    }
  }

  // Attach click listeners to ALL tabs that have data-tab
  tabBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Update active class
      document.querySelectorAll('[data-view="tutor"] .tab-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Apply filter
      var tab = btn.getAttribute('data-tab');
      applyFilter(tab);
    });
  });

  // On initial load: active tab is "pending" — show only pending
  applyFilter('pending');

})();