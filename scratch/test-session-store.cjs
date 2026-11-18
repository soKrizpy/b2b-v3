/**
 * B2B LEARNING ENGINE - SESSION STORE UNIT TEST SUITE (PHASE 3)
 */

const assert = require('assert');

// Mock localStorage and window in pure Node
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
global.CustomEvent = class {
  constructor(type, opt) {
    this.type = type;
    this.detail = opt ? opt.detail : null;
  }
};

async function runTests() {
  console.log('=== TEST SUITE: SESSION STORE UNIT & LIFECYCLE ===\n');

  const { SessionStore } = await import('../js/services/session-store.js');

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

  localStorage.clear();

  test('isAvailable returns true', () => {
    assert.strictEqual(SessionStore.isAvailable(), true);
  });

  // Test 1: Save Draft
  let draftId = null;
  test('Save Draft creates a draft report with status="draft" and version=1', () => {
    const res = SessionStore.saveReport({
      studentId: 'usr_stu_001',
      studentName: 'Alex Pratama',
      sessionDate: '2026-11-15',
      topic: 'Scratch — Basic Motion Part 2',
      activities: 'Eksplorasi koordinat X dan Y',
      achievements: 'Membuat karakter bergerak ke segala arah'
    }, 'draft');

    assert.ok(res.success);
    assert.ok(res.report.id);
    assert.strictEqual(res.report.status, 'draft');
    assert.strictEqual(res.report.version, 1);
    draftId = res.report.id;
  });

  // Test 2: Draft Visibility Isolation (Parent Hub safety)
  test('Draft reports are visible in getStudentReports but EXCLUDED from getStudentSubmittedReports', () => {
    const all = SessionStore.getStudentReports('usr_stu_001');
    const submittedOnly = SessionStore.getStudentSubmittedReports('usr_stu_001');

    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].id, draftId);
    assert.strictEqual(submittedOnly.length, 0, 'Draft MUST NOT appear in submitted reports for parents');
  });

  // Test 3: Validation on Submit
  test('Submitting report validates required fields (topic, activities, achievements)', () => {
    const invalid = SessionStore.saveReport({
      studentId: 'usr_stu_001',
      sessionDate: '2026-11-15'
      // missing topic, activities, achievements!
    }, 'submitted');

    assert.strictEqual(invalid.success, false);
    assert.strictEqual(invalid.error, 'VALIDATION_ERROR');
  });

  // Test 4: Submit Draft to Final
  test('Submitting existing draft updates status to "submitted" and increments version to 2', () => {
    const res = SessionStore.saveReport({
      id: draftId,
      studentId: 'usr_stu_001',
      studentName: 'Alex Pratama',
      sessionDate: '2026-11-15',
      topic: 'Scratch — Basic Motion Part 2',
      activities: 'Eksplorasi koordinat X dan Y serta tombol keyboard',
      achievements: 'Membuat karakter melompat dengan tombol spasi',
      difficulties: 'Sempat tertukar sumbu X dan Y',
      solutions: 'Diberikan analogi mobil dan lift',
      parentRecommendations: 'Ajak ananda mencoba gamenya di laptop rumah'
    }, 'submitted', 1); // expectedVersion 1

    assert.ok(res.success);
    assert.strictEqual(res.report.status, 'submitted');
    assert.strictEqual(res.report.version, 2);

    // Verify it is now visible to parents
    const submittedReports = SessionStore.getStudentSubmittedReports('usr_stu_001');
    assert.strictEqual(submittedReports.length, 1);
    assert.strictEqual(submittedReports[0].id, draftId);
  });

  // Test 5: Stale Concurrency Protection on Update
  test('Updating with stale expectedVersion is aborted with STALE_UPDATE_CONFLICT', () => {
    const staleRes = SessionStore.saveReport({
      id: draftId,
      topic: 'Judul Baru dari Tab Lain'
    }, 'submitted', 1); // Stale version 1 (current is 2)

    assert.strictEqual(staleRes.success, false);
    assert.strictEqual(staleRes.error, 'STALE_UPDATE_CONFLICT');
  });

  // Test 6: Safety - Cannot delete submitted report
  test('deleteDraft rejects deleting a submitted report', () => {
    const ok = SessionStore.deleteDraft(draftId);
    assert.strictEqual(ok, false);
    assert.ok(SessionStore.getReport(draftId), 'Submitted report must remain intact');
  });

  // Test 7: Can delete draft report
  test('deleteDraft deletes unsubmitted draft', () => {
    const draftRes = SessionStore.saveReport({
      studentId: 'usr_stu_002',
      studentName: 'Budi Santoso',
      sessionDate: '2026-11-15',
      topic: 'Draft Sesi Budi'
    }, 'draft');

    const tempId = draftRes.report.id;
    assert.ok(SessionStore.getReport(tempId));

    const deleted = SessionStore.deleteDraft(tempId);
    assert.strictEqual(deleted, true);
    assert.strictEqual(SessionStore.getReport(tempId), null);
  });

  console.log(`\n========================================`);
  console.log(`SessionStore Suite Result: ${passed}/${total} assertions passed (100%).`);
  console.log(`========================================\n`);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
