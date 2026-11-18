/**
 * B2B LEARNING ENGINE - STANDALONE TEACHER EXPERIENCE TEST SUITE
 * Validates teacher.html running independently via Chrome Headless.
 * Complete coverage of Stage 3: Teacher Multi-Page Migration.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'teacher_standalone_runner.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Teacher Standalone Verification</title>
</head>
<body>
  <iframe id="app" src="file:///E:/BITES2BYTES/b2b-learning-engine/teacher.html" style="width: 1440px; height: 900px; border: none;"></iframe>
  <div id="results"></div>
  <script>
    const iframe = document.getElementById('app');
    const logs = [];
    const errors = [];

    function log(msg, pass = true, detail = '') {
      logs.push({ msg, pass: !!pass, detail });
    }

    iframe.onload = () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;

      const origErr = win.console.error;
      win.console.error = function(...args) {
        errors.push(args.join(' '));
        origErr.apply(win.console, args);
      };

      setTimeout(() => {
        try {
          // --- 1. ASSET & DOM ISOLATION ---
          const lessonCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).some(l => l.href.includes('lesson.css'));
          log('Modul CSS Student (lesson.css) TIDAK dimuat pada teacher.html', !lessonCss);

          const studentContainer = doc.getElementById('student-container');
          const studentView = doc.getElementById('view-student');
          log('DOM bebas dari elemen Student (#student-container & #view-student)', !studentContainer && !studentView);

          const teacherCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).some(l => l.href.includes('teacher.css'));
          log('Modul CSS Teacher (teacher.css) dimuat dengan benar', teacherCss);

          // --- 2. HEADER & BANNER ---
          const greeting = doc.querySelector('.teacher-greeting-title');
          log('Header banner guru menampilkan sapaan "Halo, Kak Sarah!"', !!greeting && greeting.textContent.includes('Kak Sarah'), greeting ? greeting.textContent : '');

          const userBadge = doc.getElementById('user-badge');
          const userName = doc.getElementById('user-name') ? doc.getElementById('user-name').textContent : '';
          const userAvatar = doc.getElementById('user-avatar') ? doc.getElementById('user-avatar').textContent : '';
          log('User Profile Badge menampilkan data Kak Sarah (KS)', userName.includes('Kak Sarah') && userAvatar.includes('KS'), userName + ' [' + userAvatar + ']');

          // --- 3. 4 SUMMARY METRIC CARDS ---
          const metricCards = doc.querySelectorAll('.summary-metric-card');
          log('Summary Metric Cards berjumlah 4 kartu elevated', metricCards.length === 4, metricCards.length + ' kartu');

          const metricValues = Array.from(doc.querySelectorAll('.summary-metric-card .metric-value')).map(el => el.textContent.trim());
          const expectedMetrics = ['6', '4', '2', '1'];
          const metricsMatch = JSON.stringify(metricValues) === JSON.stringify(expectedMetrics);
          log('Metrik [Total: 6, Aktif: 4, Pending: 2, Disetujui: 1] akurat dan konsisten', metricsMatch, 'Nilai: ' + metricValues.join(', '));

          // --- 4. SUB-NAVIGATION TABS ---
          const subnavTabs = doc.querySelectorAll('.teacher-tab-btn');
          log('Sub-navigation tabs berjumlah 3 (Dashboard, Siswa, Submission)', subnavTabs.length === 3, subnavTabs.length + ' tabs');

          // --- 5. SUBMISSION QUEUE PREVIEW TABLE ---
          const queueRows = doc.querySelectorAll('.queue-table tbody tr');
          log('Antrean submission menampilkan 2 submission siswa yang menunggu', queueRows.length === 2, queueRows.length + ' baris');

          const studentNames = Array.from(doc.querySelectorAll('.queue-table .student-name-text')).map(el => el.textContent.trim());
          log('Siswa dalam antrean adalah Alex Pratama dan Budi Santoso', studentNames.includes('Alex Pratama') && studentNames.includes('Budi Santoso'), studentNames.join(', '));

          // --- 6. LIVE ACTIVITY STREAM ---
          const activityItems = doc.querySelectorAll('.activity-item');
          log('Aktivitas Siswa Terbaru menampilkan 5 entri activity feed', activityItems.length === 5, activityItems.length + ' aktivitas');

          // --- 7. HORIZONTAL OVERFLOW CHECK (1440px) ---
          const hasHOverflow = doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
          log('Bebas horizontal overflow pada viewport desktop 1440px', !hasHOverflow);

          // --- 8. THEME TOGGLE TEST ---
          const themeBtn = doc.getElementById('btn-theme-toggle');
          log('Tombol toggle tema #btn-theme-toggle ditemukan', !!themeBtn);
          if (themeBtn) {
            const initialTheme = doc.documentElement.getAttribute('data-theme') || 'light';
            themeBtn.click();
            const toggledTheme = doc.documentElement.getAttribute('data-theme');
            log('Theme toggle: Berhasil mengubah tema (' + initialTheme + ' -> ' + toggledTheme + ')', toggledTheme !== initialTheme);
            themeBtn.click();
            const restoredTheme = doc.documentElement.getAttribute('data-theme');
            log('Theme toggle: Berhasil kembali ke tema semula (' + restoredTheme + ')', restoredTheme === initialTheme);
          }

          // --- 9. CONTEXTUAL REVIEW DRAWER INTERACTION ---
          const reviewBtn = doc.querySelector('[data-open-review="sub_001"]');
          log('Tombol "Review Submission ->" tersedia untuk Alex Pratama', !!reviewBtn);
          if (reviewBtn) {
            reviewBtn.focus();
            reviewBtn.click();
          }

          setTimeout(() => {
            const drawer = doc.getElementById('sample-drawer');
            const isDrawerOpen = drawer && drawer.classList.contains('is-open');
            const drawerTitle = doc.getElementById('drawer-sample-title') ? doc.getElementById('drawer-sample-title').textContent : '';
            log('Contextual Review Drawer terbuka dengan data Alex Pratama', isDrawerOpen && drawerTitle.includes('Alex Pratama'), drawerTitle);

            // Check visibility chain fix
            const drawerAside = drawer ? drawer.querySelector('.drawer') : null;
            const asideVis = drawerAside ? win.getComputedStyle(drawerAside).visibility : '';
            log('Drawer aside visibility="visible" (fix inheritance)', asideVis === 'visible', asideVis);

            // Check focus shift to close button
            const closeBtn = drawer ? drawer.querySelector('[data-drawer-close]') : null;
            const isCloseFocused = doc.activeElement === closeBtn;
            log('Fokus berpindah otomatis ke tombol tutup drawer via rAF', isCloseFocused, doc.activeElement ? doc.activeElement.tagName : 'null');

            // Check drawer content details
            const projectLink = doc.getElementById('drawer-project-link') ? doc.getElementById('drawer-project-link').href : '';
            const reflectionNotes = doc.getElementById('drawer-student-notes') ? doc.getElementById('drawer-student-notes').textContent : '';
            const checkpointsInfo = doc.getElementById('drawer-checkpoints-info') ? doc.getElementById('drawer-checkpoints-info').textContent : '';
            const quizScore = doc.getElementById('drawer-quiz-score') ? doc.getElementById('drawer-quiz-score').textContent : '';
            const detailsValid = projectLink.includes('scratch.mit.edu') &&
                                 reflectionNotes.length > 10 &&
                                 checkpointsInfo.includes('4') &&
                                 quizScore.includes('3/3');
            log('Detail submission (Scratch URL, refleksi, checkpoints 4/4, kuis 3/3) akurat', detailsValid);

            // Test focus trap: Tab from last element
            const focusables = Array.from(
              drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
            ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
            log('Focus trap: Elemen focusable terdeteksi di dalam drawer', focusables.length >= 3, focusables.length + ' elemen');

            // --- 10. PREVIEW-ONLY ACTIONS (APPROVE & REVISION) ---
            const approveBtn = doc.getElementById('btn-drawer-approve');
            if (approveBtn) approveBtn.click();

            setTimeout(() => {
              // Verify Approve is preview-only: metrics unchanged, toast displayed
              const pendingAfter = doc.querySelectorAll('.summary-metric-card .metric-value')[2].textContent.trim();
              const approvedAfter = doc.querySelectorAll('.summary-metric-card .metric-value')[3].textContent.trim();
              const toastContainer = doc.getElementById('toast-container');
              const approveToastOk = toastContainer && toastContainer.textContent.includes('Simulasi Evaluasi (Preview Tahap 3.1)');
              const metricsUnchanged = pendingAfter === '2' && approvedAfter === '1';
              log('Aksi Setujui Proyek preview-only: metrik tidak berubah & toast muncul', metricsUnchanged && approveToastOk, 'Pending=' + pendingAfter + ', Approved=' + approvedAfter);

              // Test Escape to close drawer and focus restoration
              if (reviewBtn) reviewBtn.click(); // Re-open

              setTimeout(() => {
                const escEvt = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
                doc.dispatchEvent(escEvt);

                setTimeout(() => {
                  const isClosedAfterEsc = drawer && !drawer.classList.contains('is-open');
                  log('Escape key menutup drawer secara instan', isClosedAfterEsc);

                  const focusRestored = doc.activeElement === reviewBtn;
                  log('Fokus dikembalikan tepat ke tombol trigger semula (Section 5.13)', focusRestored, doc.activeElement ? doc.activeElement.tagName + '.' + doc.activeElement.className : '');

                  // --- 11. SIDEBAR NAVIGATION ---
                  const sidebarStudentsLink = doc.querySelector('[data-teacher-nav="students"]');
                  log('Sidebar link [data-teacher-nav="students"] tersedia', !!sidebarStudentsLink);
                  if (sidebarStudentsLink) sidebarStudentsLink.click();

                  setTimeout(() => {
                    const placeholderTitle = doc.querySelector('.placeholder-title') ? doc.querySelector('.placeholder-title').textContent : '';
                    log('Sidebar navigasi: Tab Manajemen Siswa aktif menampilkan placeholder Tahap 3.2', placeholderTitle.includes('Manajemen Siswa'), placeholderTitle);

                    const sidebarDashboardLink = doc.querySelector('[data-teacher-nav="dashboard"]');
                    if (sidebarDashboardLink) sidebarDashboardLink.click();

                    setTimeout(() => {
                      const returnGreeting = doc.querySelector('.teacher-greeting-title');
                      log('Sidebar navigasi: Kembali ke Dashboard Guru berfungsi sempurna', !!returnGreeting);

                      const resEl = document.getElementById('results');
                      resEl.textContent = JSON.stringify({ logs, errors, complete: true });
                    }, 300);
                  }, 300);
                }, 300);
              }, 300);
            }, 300);
          }, 450);

        } catch (e) {
          log('Eksepsi pengujian: ' + e.message, false, e.stack);
          document.getElementById('results').textContent = JSON.stringify({ logs, errors: [e.message], complete: true });
        }
      }, 800);
    };
  </script>
</body>
</html>`;

fs.writeFileSync(RUNNER_PATH, testHtml, 'utf8');

const proc = spawn(CHROME_PATH, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1440,900',
  '--virtual-time-budget=20000',
  '--allow-file-access-from-files',
  '--dump-dom',
  'file:///' + RUNNER_PATH.replace(/\\/g, '/')
]);

let domOutput = '';
proc.stdout.on('data', d => domOutput += d.toString());
proc.on('exit', () => {
  const match = domOutput.match(/<div id="results">([\s\S]*?)<\/div>/);
  if (match && match[1]) {
    try {
      const clean = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const data = JSON.parse(clean);
      console.log('=== HASIL AUDIT STANDALONE TEACHER EXPERIENCE (teacher.html) ===\n');
      let passCount = 0;
      let failCount = 0;
      data.logs.forEach(l => {
        if (l.pass) passCount++; else failCount++;
        console.log((l.pass ? '✓ PASS: ' : '✗ FAIL: ') + l.msg + (l.detail ? ' [' + l.detail + ']' : ''));
      });
      console.log('\nTotal Pengujian:', passCount + failCount, `(${passCount} Lulus, ${failCount} Gagal)`);
      console.log('Error Console Browser:', data.errors.length === 0 ? '0 Error (Konsol Bersih)' : data.errors);
    } catch (e) {
      console.log('Output parsing error:', e.message);
    }
  } else {
    console.log('Results div not found. Raw DOM tail:\n', domOutput.substring(domOutput.length - 800));
  }
});
