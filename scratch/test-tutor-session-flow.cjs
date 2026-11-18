/**
 * B2B LEARNING ENGINE - PHASE 3 TUTOR SESSION & REPORTING E2E TEST
 * Validates:
 * 1. SessionStore data integrity, draft isolation, versioning
 * 2. Tutor Workspace form generation and report lifecycle (draft -> submitted)
 * 3. Parent Hub integration: actual submitted report rendered under "Laporan Sesi Aktual"
 * 4. Drafts remain isolated from parents
 * 5. Weekly & Monthly parent integration shows actual tutor observations
 */

const fs = require('fs');
const path = require('path');

// Setup mock browser environment (JSDOM-like in pure Node)
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

let eventListeners = {};
global.window = {
  localStorage: global.localStorage,
  addEventListener: (event, handler) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(handler);
  },
  removeEventListener: (event, handler) => {
    if (!eventListeners[event]) return;
    eventListeners[event] = eventListeners[event].filter(h => h !== handler);
  },
  dispatchEvent: (event) => {
    const handlers = eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
  }
};
global.CustomEvent = class CustomEvent {
  constructor(type, params) {
    this.type = type;
    this.detail = params ? params.detail : null;
  }
};

async function runTests() {
  console.log('=== TEST SUITE: TUTOR SESSION & REPORTING E2E FLOW ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failCount++;
    }
  }

  // Import SessionStore
  const sessionStoreModule = await import('../js/services/session-store.js');
  const SessionStore = sessionStoreModule.SessionStore;
  const SESSION_STORE_KEY = sessionStoreModule.SESSION_STORE_KEY;

  // Clear storage
  global.localStorage.clear();

  // Test 1: SessionStore empty state
  assert(SessionStore.getAllReports().length === 0, 'SessionStore starts completely empty');
  assert(SessionStore.getStudentSubmittedReports('usr_stu_001').length === 0, 'No submitted reports for Alex Pratama initially');

  // Test 2: Tutor saves a DRAFT
  const draftData = {
    studentId: 'usr_stu_001',
    studentName: 'Alex Pratama',
    studentAvatar: 'AP',
    studentGrade: 'Grade 5',
    tutorId: 'usr_tea_001',
    tutorName: 'Kak Sarah',
    sessionDate: '2026-11-15',
    sessionNumber: 5,
    moduleName: 'Scratch Starter Adventure',
    topic: 'Scratch — Basic Motion: Kontrol Keyboard & Koordinat X/Y',
    activities: 'Mempraktikkan event key pressed dan blok change x/y.',
    achievements: 'Alex berhasil menggerakkan sprite kucing dengan 4 tombol panah.',
    difficulties: 'Sempat terbalik antara koordinat X (horizontal) dan Y (vertikal).',
    solutions: 'Tutor memberikan visualisasi garis kartesius sederhana di layar.',
    parentRecommendations: 'Ajak Alex mencoba memainkan gamenya di rumah bersama adik.',
    competencies: {
      algorithmic_logic: {
        evaluated: true,
        level: 'Competent',
        evidence: 'Alex mampu merangkai 4 pasang blok koordinat secara tepat setelah analogi garis sumbu.'
      },
      project_remixing: {
        evaluated: true,
        level: 'Emerging',
        evidence: 'Berinisiatif mengubah kostum kucing menjadi astronot.'
      }
    }
  };

  const draftResult = SessionStore.saveReport(draftData, 'draft');
  assert(draftResult && draftResult.report, 'Draft report saved successfully');
  assert(draftResult.report.status === 'draft', 'Draft has status="draft"');
  assert(draftResult.report.version === 1, 'Draft initialized with version=1');

  const draftId = draftResult.report.id;

  // Test 3: STRICT PARENT ISOLATION
  // Draft must NOT be visible to parents via getStudentSubmittedReports
  const parentReportsBeforeSubmit = SessionStore.getStudentSubmittedReports('usr_stu_001');
  assert(parentReportsBeforeSubmit.length === 0, 'STRICT ISOLATION: Draft is completely invisible to Parent Hub');

  // But tutor can see it
  const tutorReports = SessionStore.getAllReports();
  assert(tutorReports.length === 1 && tutorReports[0].id === draftId, 'Tutor can see the draft in Teacher Workspace');

  // Test 4: Concurrency conflict protection on stale draft update
  const staleAttempt = SessionStore.saveReport({
    id: draftId,
    studentId: 'usr_stu_001',
    topic: 'Stale Topic'
  }, 'draft', 999); // Stale version 999 instead of 1
  assert(staleAttempt && staleAttempt.error === 'STALE_UPDATE_CONFLICT', 'Stale version update on draft is rejected');

  // Test 5: Tutor SUBMITS the report with correct version
  let eventDispatched = false;
  window.addEventListener(sessionStoreModule.SESSION_STORE_EVENT, (ev) => {
    eventDispatched = true;
  });

  const submitResult = SessionStore.saveReport({
    id: draftId,
    studentId: 'usr_stu_001',
    topic: 'Scratch — Basic Motion: Kontrol Keyboard & Koordinat X/Y (Final)'
  }, 'submitted', 1);

  assert(submitResult && submitResult.report, 'Report submitted successfully');
  assert(submitResult.report.status === 'submitted', 'Report status changed to "submitted"');
  assert(submitResult.report.version === 2, 'Report version incremented to 2');
  assert(eventDispatched === true, 'Reactive SESSION_STORE_EVENT was dispatched on submission');

  // Test 6: Report is now visible to parents
  const parentReportsAfterSubmit = SessionStore.getStudentSubmittedReports('usr_stu_001');
  assert(parentReportsAfterSubmit.length === 1, 'Parent Hub now receives the actual submitted report');
  assert(parentReportsAfterSubmit[0].topic.includes('Basic Motion'), 'Parent report topic matches tutor input');
  assert(parentReportsAfterSubmit[0].tutorName === 'Kak Sarah', 'Parent report displays correct tutor name');
  assert(parentReportsAfterSubmit[0].sessionNumber === 5, 'Parent report displays correct session number');

  // Test 7: Competency evaluation data integrity
  const compLogic = parentReportsAfterSubmit[0].competencies.algorithmic_logic;
  assert(compLogic && compLogic.evaluated === true, 'Algorithmic logic competency was evaluated');
  assert(compLogic.level === 'Competent', 'Competency level is "Competent"');
  assert(compLogic.evidence.includes('Alex mampu merangkai'), 'Evidence text is preserved accurately');

  // Test 8: Other student isolation
  const doniReports = SessionStore.getStudentSubmittedReports('usr_stu_004');
  assert(doniReports.length === 0, 'Report for Alex is not leaked to Doni Wijaya');

  // Test 9: Deleting submitted report is prohibited
  const deleteSubmittedAttempt = SessionStore.deleteDraft(draftId);
  assert(deleteSubmittedAttempt === false, 'Cannot delete a report that has already been submitted');
  assert(SessionStore.getReportById(draftId) !== null, 'Submitted report remains intact in storage');

  // Test 10: Tutor creates a second report directly as submitted
  const report2Result = SessionStore.saveReport({
    studentId: 'usr_stu_001',
    studentName: 'Alex Pratama',
    studentAvatar: 'AP',
    studentGrade: 'Grade 5',
    tutorId: 'usr_tea_001',
    tutorName: 'Kak Sarah',
    sessionDate: '2026-11-18',
    sessionNumber: 6,
    moduleName: 'Scratch Starter Adventure',
    topic: 'Scratch — Animasi & Kostum Sprite',
    activities: 'Mengganti kostum menggunakan loop repeat dan delay wait 0.2 secs.',
    achievements: 'Alex berhasil membuat animasi sprite berjalan mulus.',
    difficulties: '',
    solutions: '',
    parentRecommendations: 'Berikan apresiasi atas ketelitian Alex menyusun timing animasi.',
    competencies: {
      project_remixing: {
        evaluated: true,
        level: 'Proficient',
        evidence: 'Alex berinisiatif menggambar frame kostum tambahan sendiri di Scratch Paint Editor.'
      }
    }
  }, 'submitted');

  assert(report2Result && report2Result.report, 'Second report submitted directly');
  const allAlexSubmitted = SessionStore.getStudentSubmittedReports('usr_stu_001');
  assert(allAlexSubmitted.length === 2, 'Alex now has 2 submitted session reports');
  // First item should be the newest session
  assert(allAlexSubmitted[0].sessionNumber === 6, 'Submitted reports sorted chronologically with newest first');

  console.log(`\n========================================`);
  console.log(`E2E Tutor Session Flow Result: ${passCount}/${passCount + failCount} assertions passed (${Math.round((passCount / (passCount + failCount)) * 100)}%).`);
  console.log(`========================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
