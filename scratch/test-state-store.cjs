/**
 * B2B LEARNING ENGINE - STATE STORE UNIT & RECOVERY SUITE
 */

const fs = require('fs');
const assert = require('assert');

// Mock localStorage in Node
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.CustomEvent = class { constructor(type, opt) { this.type = type; this.detail = opt ? opt.detail : null; } };

async function runTests() {
  console.log('=== TEST SUITE: STATE STORE UNIT & RECOVERY ===');
  let passCount = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passCount++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${name} -> ${e.message}`);
      process.exit(1);
    }
  }

  // Import StateStore module dynamically
  const { StateStore, SUBMISSION_STORE_KEY, LEGACY_PROGRESS_KEY } = await import('../js/services/state-store.js');

  // Test 1: isAvailable
  test('isAvailable returns true with working storage', () => {
    assert.strictEqual(StateStore.isAvailable(), true);
  });

  // Test 2: Seed only once
  test('seedSubmissionsIfEmpty seeds initial data when store is empty', () => {
    localStorage.clear();
    const seed = [
      { id: 'sub_001', studentId: 'usr_stu_001', status: 'submitted', projectUrl: 'https://scratch.mit.edu/1' },
      { id: 'sub_002', studentId: 'usr_stu_002', status: 'submitted', projectUrl: 'https://scratch.mit.edu/2' }
    ];
    const ok = StateStore.seedSubmissionsIfEmpty(seed);
    assert.strictEqual(ok, true);
    const all = StateStore.getAllSubmissions();
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all.find(s => s.id === 'sub_001').projectUrl, 'https://scratch.mit.edu/1');
  });

  test('seedSubmissionsIfEmpty does NOT overwrite existing active data', () => {
    // Attempt second seed with different data
    const ok = StateStore.seedSubmissionsIfEmpty([{ id: 'sub_999', studentId: 'usr_stu_999' }]);
    assert.strictEqual(ok, false);
    const all = StateStore.getAllSubmissions();
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all.some(s => s.id === 'sub_999'), false);
  });

  // Test 3: Save new submission
  test('saveSubmission saves new record with generated UUID-based ID', () => {
    const sub = StateStore.saveSubmission({
      studentId: 'usr_stu_005',
      lessonId: 'les_scratch_motion_01',
      projectUrl: 'https://scratch.mit.edu/projects/55555',
      studentNotes: 'Catatan proyek Eva'
    });
    assert.ok(sub.id.startsWith('sub_'));
    assert.strictEqual(sub.studentId, 'usr_stu_05' ? 'usr_stu_005' : sub.studentId);
    assert.strictEqual(sub.status, 'submitted');
    assert.strictEqual(StateStore.getAllSubmissions().length, 3);
  });

  // Test 4: Update status - Approve (with mandatory expectedVersion)
  test('updateSubmissionStatus allows approve with optional feedback when expectedVersion provided', () => {
    const sub0 = StateStore.getSubmission('sub_001');
    const res = StateStore.updateSubmissionStatus('sub_001', 'approved', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Bagus sekali!'
    }, sub0.version || 1);
    assert.ok(res);
    assert.strictEqual(res.status, 'approved');
    assert.strictEqual(res.teacherFeedback, 'Bagus sekali!');
    assert.strictEqual(res.feedbackHistory.length, 1);
    assert.strictEqual(res.feedbackHistory[0].status, 'approved');
  });

  // Test: Rejects when expectedVersion is missing
  test('updateSubmissionStatus rejects update when expectedVersion is missing', () => {
    const res = StateStore.updateSubmissionStatus('sub_002', 'approved', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Bagus!'
    }); // No version!
    assert.ok(res && res.error === 'MISSING_EXPECTED_VERSION');
  });

  // Test 5: Update status - Revision requires feedback
  test('updateSubmissionStatus rejects revision-required without feedback', () => {
    const sub2 = StateStore.getSubmission('sub_002');
    const res = StateStore.updateSubmissionStatus('sub_002', 'revision-required', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: '' // empty feedback!
    }, sub2.version || 1);
    assert.strictEqual(res, null);
    const sub = StateStore.getSubmission('sub_002');
    assert.strictEqual(sub.status, 'submitted'); // unchanged!
  });

  test('updateSubmissionStatus accepts revision-required with written feedback', () => {
    const sub2 = StateStore.getSubmission('sub_002');
    const res = StateStore.updateSubmissionStatus('sub_002', 'revision-required', {
      reviewerId: 'usr_tea_001',
      reviewerName: 'Kak Sarah',
      teacherFeedback: 'Sprite masih terbalik saat belok kiri.'
    }, sub2.version || 1);
    assert.ok(res);
    assert.strictEqual(res.status, 'revision-required');
    assert.strictEqual(res.teacherFeedback, 'Sprite masih terbalik saat belok kiri.');
    assert.strictEqual(res.feedbackHistory.length, 1);
  });

  // Test 6: Legacy migration
  test('migrateFromLegacyProgress links existing legacy progress to store', () => {
    localStorage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({
      state: 'submitted',
      checkpoints: { cp_1: true, cp_2: true },
      submission: {
        link: 'https://scratch.mit.edu/projects/legacy_link',
        notes: 'Legacy reflection',
        submittedAt: '2026-11-14T10:00:00.000Z'
      },
      slideIndex: 5
    }));

    const migrated = StateStore.migrateFromLegacyProgress({ id: 'usr_stu_001', name: 'Alex Pratama' });
    assert.ok(migrated);
    assert.strictEqual(migrated.id, 'sub_001');

    // Check legacy progress has marker and link, but untouched fields
    const updatedLegacy = JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY));
    assert.strictEqual(updatedLegacy.isMigrated, true);
    assert.strictEqual(updatedLegacy.submissionId, 'sub_001');
    assert.strictEqual(updatedLegacy.submission.link, 'https://scratch.mit.edu/projects/legacy_link');
    assert.strictEqual(updatedLegacy.slideIndex, 5);
  });

  // Test 7: Corruption resilience
  test('StateStore gracefully handles corrupted JSON in localStorage', () => {
    localStorage.setItem(SUBMISSION_STORE_KEY, 'INVALID_JSON{{{');
    const all = StateStore.getAllSubmissions();
    assert.deepStrictEqual(all, []);
  });

  console.log(`\nAll ${passCount} StateStore unit tests passed successfully!\n`);
}

runTests();
