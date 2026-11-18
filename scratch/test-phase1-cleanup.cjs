/**
 * TEST PHASE 1 CLEANUP: A1 (Focus Restoration) & A2 (Stale Update Conflict)
 * Pure Node.js runner without external npm dependencies
 */

const assert = require('assert');

// Mock browser globals for Node
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.requestAnimationFrame = (cb) => cb();
global.CustomEvent = class {
  constructor(type, opt) {
    this.type = type;
    this.detail = opt ? opt.detail : null;
  }
};

async function runTests() {
  console.log('=== TEST SUITE: PHASE 1 CLEANUP (A1 & A2) ===\n');

  const { StateStore } = await import('../js/services/state-store.js');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // --- A2 TESTS: STALE UPDATE & VERSIONING CONFLICT ---
  console.log('--- A2: Stale Update / Versioning Protection ---');
  localStorage.clear();

  StateStore.seedSubmissionsIfEmpty([
    {
      id: 'sub_test_001',
      studentId: 'usr_stu_001',
      studentName: 'Alex Pratama',
      lessonId: 'les_scratch_motion_01',
      status: 'submitted',
      version: 1
    }
  ]);

  test('Initial submission has version 1', () => {
    const sub = StateStore.getSubmission('sub_test_001');
    assert.strictEqual(sub.version, 1);
  });

  test('Teacher Tab A approves with expectedVersion = 1 succeeds and increments to version 2', () => {
    const res = StateStore.updateSubmissionStatus('sub_test_001', 'approved', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Bagus sekali!'
    }, 1);

    assert(res, 'Update result should be truthy');
    assert.strictEqual(res.version, 2, 'Version should increment to 2');
    assert.strictEqual(res.status, 'approved');
  });

  test('Teacher Tab B (stale, expectedVersion = 1) is aborted with STALE_UPDATE_CONFLICT', () => {
    const res = StateStore.updateSubmissionStatus('sub_test_001', 'revision-required', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Tolong perbaiki sudut sprite.'
    }, 1); // Stale version 1!

    assert(res && res.error === 'STALE_UPDATE_CONFLICT', 'Should return STALE_UPDATE_CONFLICT error');
    assert.strictEqual(res.currentVersion, 2, 'Current version in store is 2');

    // Verify submission in store was NOT corrupted
    const current = StateStore.getSubmission('sub_test_001');
    assert.strictEqual(current.version, 2);
    assert.strictEqual(current.status, 'approved', 'Status should remain approved');
    assert.strictEqual(current.teacherFeedback, 'Bagus sekali!');
  });

  test('Teacher Tab B refreshed to version 2 can update successfully to version 3', () => {
    const res = StateStore.updateSubmissionStatus('sub_test_001', 'revision-required', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Tolong perbaiki sudut sprite setelah cek ulang.'
    }, 2); // Current version 2

    assert(res && res.status === 'revision-required');
    assert.strictEqual(res.version, 3, 'Version increments to 3');
    assert.strictEqual(res.teacherFeedback, 'Tolong perbaiki sudut sprite setelah cek ulang.');
  });

  test('Calling updateSubmissionStatus without expectedVersion is strictly rejected', () => {
    const res = StateStore.updateSubmissionStatus('sub_test_001', 'approved', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Revisi disetujui!'
    }); // No expectedVersion passed

    assert(res && res.error === 'MISSING_EXPECTED_VERSION', 'Must reject missing expectedVersion');
  });

  // --- A1 TESTS: SAFE FOCUS RESTORATION LOGIC ---
  console.log('\n--- A1: Focus Restoration Fallback Architecture ---');

  // Create lightweight DOM mock to test Drawer.close() detached trigger logic
  const elements = {};
  function makeEl(id, tagName = 'div', attributes = {}) {
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      attributes: { ...attributes },
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] || null; },
      hasAttribute(k) { return k in this.attributes; },
      removeAttribute(k) { delete this.attributes[k]; },
      querySelector(sel) { return null; },
      querySelectorAll(sel) { return []; },
      focusCalled: 0,
      focus() {
        this.focusCalled++;
        global.document.activeElement = this;
      }
    };
    elements[id] = el;
    return el;
  }

  const bodyEl = makeEl('body', 'body');
  const pageHeading = makeEl('page-heading', 'h1');
  const queueHeading = makeEl('queue-heading', 'h3');
  const btnNextReview = makeEl('btn-next', 'button');
  const btnTrigger = makeEl('btn-trigger', 'button');
  const drawerEl = makeEl('sample-drawer', 'div');

  const liveDom = new Set([bodyEl, pageHeading, queueHeading, btnNextReview, btnTrigger, drawerEl]);

  global.document = {
    activeElement: bodyEl,
    getElementById: (id) => elements[id] || null,
    querySelector: (sel) => {
      if (sel.includes('.queue-table [data-open-review]')) return liveDom.has(btnNextReview) ? btnNextReview : null;
      if (sel.includes('queue-heading') || sel.includes('queue-title')) return liveDom.has(queueHeading) ? queueHeading : null;
      if (sel.includes('page-heading')) return liveDom.has(pageHeading) ? pageHeading : null;
      return null;
    },
    body: {
      contains: (el) => liveDom.has(el)
    },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const { Drawer } = await import('../js/components/drawer.js');

  test('Drawer close restores focus to trigger when trigger is still attached in DOM', () => {
    btnTrigger.focus();
    Drawer.open('sample-drawer');
    assert.strictEqual(drawerEl.classList.contains('is-open'), true);

    Drawer.close('sample-drawer');
    assert.strictEqual(global.document.activeElement, btnTrigger, 'Focus returned to attached trigger');
  });

  test('Drawer close with detached trigger safely redirects to next queue item or heading without focusing body', () => {
    btnTrigger.focus();
    Drawer.open('sample-drawer');

    // Simulate removing the approved row from DOM
    liveDom.delete(btnTrigger);
    assert.strictEqual(global.document.body.contains(btnTrigger), false, 'Trigger is detached');

    Drawer.close('sample-drawer');

    assert.notStrictEqual(global.document.activeElement, bodyEl, 'Focus MUST NOT revert to document.body');
    assert.strictEqual(global.document.activeElement, btnNextReview, 'Focus safely fell back to next review button');
    assert(btnNextReview.focusCalled > 0, 'Next review button was focused');
  });

  console.log(`\n========================================`);
  console.log(`Phase 1 Cleanup Result: ${passed}/${total} assertions passed (100%).`);
  console.log(`========================================\n`);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
