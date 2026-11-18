/**
 * B2B LEARNING ENGINE - PHASE 3.1 VERIFICATION SUITE
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('  B2B LEARNING ENGINE — SUITE PENGUJIAN PHASE 3.1 (TEACHER)');
console.log('================================================================\n');

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

// 1. Aset dan Integritas File
console.log('--- TEST GROUP 1: INTEGRITAS FILE PHASE 3.1 ---');
const requiredFiles = [
  'css/teacher.css',
  'js/teacher-workspace.js',
  'data/mock/students.json',
  'data/mock/submissions.json',
  'data/mock/class-summary.json'
];

requiredFiles.forEach((file) => {
  assert(fs.existsSync(file), `File ada di disk: ${file}`);
  if (file.endsWith('.js')) {
    try {
      execSync(`node --check ${file}`);
      assert(true, `Sintaksis valid: ${file}`);
    } catch (e) {
      assert(false, `Sintaksis gagal: ${file} (${e.message})`);
    }
  }
});

// 2. Konsistensi Matematis Dataset (Section 2 & 9)
console.log('\n--- TEST GROUP 2: KONSISTENSI MATEMATIS DATASET 6 SISWA ---');
const students = JSON.parse(fs.readFileSync('data/mock/students.json', 'utf8'));
const submissions = JSON.parse(fs.readFileSync('data/mock/submissions.json', 'utf8'));
const summary = JSON.parse(fs.readFileSync('data/mock/class-summary.json', 'utf8'));

assert(students.length === 6, `Total siswa tepat 6 (aktual: ${students.length})`);
assert(summary.totalStudents === 6, `Class summary totalStudents tepat 6 (aktual: ${summary.totalStudents})`);

const activeInStudents = students.filter(s => s.status === 'active' || s.status === 'in_progress').length;
assert(summary.activeStudents === 4, `Class summary activeStudents = 4 (aktual: ${summary.activeStudents})`);

const pendingInSubs = submissions.filter(s => s.status === 'submitted').length;
assert(summary.pendingSubmissions === pendingInSubs, `Class summary pendingSubmissions (${summary.pendingSubmissions}) konsisten dengan submissions.json (${pendingInSubs})`);

const approvedInSubs = submissions.filter(s => s.status === 'approved').length;
assert(summary.approvedProjects === approvedInSubs, `Class summary approvedProjects (${summary.approvedProjects}) konsisten dengan submissions.json (${approvedInSubs})`);

// Validasi ID siswa
submissions.forEach(sub => {
  const exists = students.some(s => s.id === sub.studentId && s.name === sub.studentName);
  assert(exists, `Submission ${sub.id} merujuk ke siswa valid di students.json (${sub.studentName})`);
});

// 3. Audit Zero Color Leaks (Token-Based CSS)
console.log('\n--- TEST GROUP 3: AUDIT DESIGN TOKENS (ZERO COLOR LEAKS) ---');
const teacherCss = fs.readFileSync('css/teacher.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const teacherJs = fs.readFileSync('js/teacher-workspace.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const hexCss = teacherCss.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
const rgbCss = teacherCss.match(/rgba?\([^)]+\)/g) || [];
const hexJs = teacherJs.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
const rgbJs = teacherJs.match(/rgba?\([^)]+\)/g) || [];

assert(hexCss.length === 0, `css/teacher.css 0 Hex literal (aktual: ${hexCss.length})`);
assert(rgbCss.length === 0, `css/teacher.css 0 Rgb literal (aktual: ${rgbCss.length})`);
assert(hexJs.length === 0, `js/teacher-workspace.js 0 Hex literal (aktual: ${hexJs.length})`);
assert(rgbJs.length === 0, `js/teacher-workspace.js 0 Rgb literal (aktual: ${rgbJs.length})`);

// 4. Index.html & Components Verification
console.log('\n--- TEST GROUP 4: INTEGRASI SHELL & DRAWER ---');
const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('css/teacher.css'), 'index.html memuat css/teacher.css');
assert(indexHtml.includes('id="teacher-container"'), 'index.html memiliki #teacher-container');
assert(indexHtml.includes('id="sample-drawer"'), 'index.html memiliki contextual drawer #sample-drawer');
assert(indexHtml.includes('id="drawer-sample-title"'), 'index.html memiliki title drawer dinamis');
assert(indexHtml.includes('id="drawer-project-link"'), 'index.html memiliki link proyek Scratch dinamis');
assert(indexHtml.includes('id="drawer-student-notes"'), 'index.html memiliki catatan refleksi siswa');

// 5. Isolasi b2b-v2
console.log('\n--- TEST GROUP 5: ISOLASI b2b-v2 ---');
const b2bV2Path = 'E:/BITES2BYTES/b2b-v2';
if (fs.existsSync(b2bV2Path)) {
  const stat = fs.statSync(b2bV2Path);
  const mtimeIso = stat.mtime.toISOString();
  assert(mtimeIso.startsWith('2026-11-07T07:44:17'), `Folder b2b-v2 terisolasi (Last modified tetap: ${mtimeIso})`);
}

console.log('\n================================================================');
console.log(`  HASIL SUITE VERIFIKASI: ${passCount}/${passCount + failCount} PENGUJIAN LULUS (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
console.log('================================================================\n');

if (failCount > 0) process.exit(1);
