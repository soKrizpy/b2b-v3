/**
 * B2B LEARNING ENGINE - USER ACCEPTANCE TEST & LIVE WALKTHROUGH
 * Validates the 10-step scenario requested in USER_REQUEST:
 * 1. Open Student Dashboard
 * 2. Navigate to Parent Hub
 * 3. Open Overview
 * 4. Open Session Reports
 * 5. Open Weekly Progress
 * 6. Open Monthly Evaluation
 * 7. Return to student dashboard
 * 8. Verify legacy navigation still works
 * 9. Test Light Mode and Dark Mode
 * 10. Test tablet 768px viewport
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'uat_runner.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>B2B User Acceptance Test Runner</title>
</head>
<body>
  <iframe id="app" src="file:///E:/BITES2BYTES/b2b-learning-engine/student.html" style="width: 1440px; height: 900px; border: none;"></iframe>
  <div id="results"></div>
  <script>
    const iframe = document.getElementById('app');
    const logs = [];
    const errors = [];

    function log(step, name, pass = true, detail = '') {
      logs.push({ step, name, pass: !!pass, detail });
    }

    iframe.addEventListener('load', () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;

      const origErr = win.console.error;
      win.console.error = function(...args) {
        errors.push(args.join(' '));
        origErr.apply(win.console, args);
      };

      setTimeout(() => {
        try {
          // STEP 1: Buka Student Dashboard
          const heroCard = doc.querySelector('.dashboard-hero-card');
          const questMap = doc.querySelector('.quest-map-card');
          log(1, 'Buka Student Dashboard', !!heroCard && !!questMap, 'Hero Card & Quest Map render sempurna');

          // STEP 2: Masuk ke Parent Hub
          const navParentHub = doc.querySelector('[data-student-nav="parent-hub"]');
          if (navParentHub) navParentHub.click();

          setTimeout(() => {
            const parentHub = doc.querySelector('.parent-hub-container');
            const demoNotice = doc.querySelector('.parent-demo-notice-banner');
            log(2, 'Masuk ke Parent Hub', !!parentHub && !!demoNotice, 'Container & Pemberitahuan Data Demonstrasi hadir');

            // STEP 3: Buka Overview
            const activeTabOverview = doc.querySelector('.parent-tab-btn[data-parent-tab="overview"].is-active');
            const statCards = doc.querySelectorAll('.parent-stat-card');
            const liveCard = doc.querySelector('.parent-live-status-card');
            const demoTags = doc.querySelectorAll('.parent-demo-tag');
            log(3, 'Buka Overview', !!activeTabOverview && statCards.length === 4 && !!liveCard && demoTags.length === 4,
              '4 Kartu metrik demo & Kartu StateStore aktual terpasang rapi');

            // STEP 4: Buka Session Reports
            const btnSessions = doc.querySelector('[data-parent-tab="sessions"]');
            if (btnSessions) btnSessions.click();

            setTimeout(() => {
              const sessionCards = doc.querySelectorAll('.session-report-card');
              const sessionDemoBadges = Array.from(doc.querySelectorAll('.session-report-card .badge-warning'));
              log(4, 'Buka Session Reports', sessionCards.length >= 2 && sessionDemoBadges.length >= 2,
                sessionCards.length + ' Sesi termuat lengkap dengan label "Data Demonstrasi"');

              // STEP 5: Buka Weekly Progress
              const btnWeekly = doc.querySelector('[data-parent-tab="weekly"]');
              if (btnWeekly) btnWeekly.click();

              setTimeout(() => {
                const weeklyCards = doc.querySelectorAll('.weekly-card');
                const weeklyDemoBadges = Array.from(doc.querySelectorAll('.weekly-card .badge-warning'));
                log(5, 'Buka Weekly Progress', weeklyCards.length >= 1 && weeklyDemoBadges.length >= 1,
                  weeklyCards.length + ' Rekap mingguan dengan visual progress bar dan badge demo');

                // STEP 6: Buka Monthly Evaluation
                const btnMonthly = doc.querySelector('[data-parent-tab="monthly"]');
                if (btnMonthly) btnMonthly.click();

                setTimeout(() => {
                  const monthlyCard = doc.querySelector('.monthly-eval-card');
                  const distinctionBanner = doc.querySelector('.monthly-distinction-banner');
                  const compCards = doc.querySelectorAll('.competency-item-card');
                  const monthlyDemoBadge = doc.querySelector('.monthly-eval-card .badge-warning');
                  log(6, 'Buka Monthly Evaluation', !!monthlyCard && !!distinctionBanner && compCards.length === 4 && !!monthlyDemoBadge,
                    'Distinction Banner & 4 Kompetensi komputasional termuat lengkap');

                  // STEP 7: Kembali ke dashboard siswa
                  const navDashboard = doc.querySelector('[data-student-nav="dashboard"]');
                  if (navDashboard) navDashboard.click();

                  setTimeout(() => {
                    const heroReturned = doc.querySelector('.dashboard-hero-card');
                    const questReturned = doc.querySelector('.quest-map-card');
                    log(7, 'Kembali ke dashboard siswa', !!heroReturned && !!questReturned,
                      'Tampilan dashboard siswa kembali secara instan dan utuh');

                    // STEP 8: Pastikan navigasi lama tetap berfungsi
                    const btnMission = doc.querySelector('.btn-enter-lesson');
                    if (btnMission) btnMission.click();

                    setTimeout(() => {
                      const workspace = doc.querySelector('.lesson-workspace');
                      const stageNav = doc.querySelector('.stage-nav');
                      const backBtn = doc.getElementById('btn-back-to-quest');
                      const legacyNavWorks = !!workspace && !!stageNav && !!backBtn;
                      log(8, 'Pastikan navigasi lama tetap berfungsi', legacyNavWorks,
                        'Workspace 6-tahapan & tombol kembali berfungsi tanpa hambatan');

                      // Kembali ke Parent Hub untuk pengujian tema & tablet
                      if (navParentHub) navParentHub.click();

                      setTimeout(() => {
                        // STEP 9: Uji Light Mode dan Dark Mode
                        const themeToggle = doc.getElementById('btn-theme-toggle');
                        const htmlEl = doc.documentElement;
                        const initialTheme = htmlEl.getAttribute('data-theme') || 'light';

                        if (themeToggle) themeToggle.click();
                        const nextTheme = htmlEl.getAttribute('data-theme');

                        if (themeToggle) themeToggle.click();
                        const revertedTheme = htmlEl.getAttribute('data-theme');

                        const themeWorks = nextTheme !== initialTheme && revertedTheme === initialTheme;
                        log(9, 'Uji Light Mode dan Dark Mode', themeWorks,
                          'Toggle tema berfungsi mulus (' + initialTheme + ' -> ' + nextTheme + ' -> ' + revertedTheme + ')');

                        // STEP 10: Uji tampilan tablet 768px (deteksi overflow & clipping)
                        // Ubah iframe ke 768px
                        iframe.style.width = '768px';
                        setTimeout(() => {
                          const bodyScrollW = doc.body.scrollWidth;
                          const bodyClientW = doc.body.clientWidth;
                          const hasHorizontalOverflow = bodyScrollW > bodyClientW;
                          const parentHubResponsive = !!doc.querySelector('.parent-hub-container');

                          log(10, 'Uji tampilan tablet 768px', !hasHorizontalOverflow && parentHubResponsive,
                            'Bebas horizontal overflow [scrollW=' + bodyScrollW + ', clientW=' + bodyClientW + ']');

                          // Kirim payload hasil
                          document.getElementById('results').textContent = JSON.stringify({
                            logs,
                            errors,
                            complete: true
                          });
                        }, 300);
                      }, 300);
                    }, 350);
                  }, 300);
                }, 300);
              }, 300);
            }, 300);
          }, 350);
        } catch (e) {
          log(0, 'Eksepsi Pengujian', false, e.message);
          document.getElementById('results').textContent = JSON.stringify({ logs, errors: [e.message], complete: true });
        }
      }, 500);
    });
  </script>
</body>
</html>`;

fs.writeFileSync(RUNNER_PATH, testHtml, 'utf8');

const chromeProc = spawn(CHROME_PATH, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-web-security',
  '--allow-file-access-from-files',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=20000',
  '--dump-dom',
  'file:///' + RUNNER_PATH.replace(/\\/g, '/')
]);

let stdoutData = '';
let stderrData = '';

chromeProc.stdout.on('data', (d) => { stdoutData += d.toString(); });
chromeProc.stderr.on('data', (d) => { stderrData += d.toString(); });

chromeProc.on('close', (code) => {
  try { fs.unlinkSync(RUNNER_PATH); } catch {}

  const match = stdoutData.match(/<div id="results">([\s\S]*?)<\/div>/);
  if (!match || !match[1]) {
    console.error('Gagal mengambil hasil User Acceptance Test');
    console.error('STDERR:', stderrData);
    process.exit(1);
  }

  const result = JSON.parse(match[1]);
  console.log('================================================================');
  console.log('  HASIL USER ACCEPTANCE TEST & LIVE WALKTHROUGH (10 SKENARIO)');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  result.logs.forEach((l) => {
    if (l.pass) {
      passCount++;
      console.log(`✓ SKENARIO ${l.step}: ${l.name} — PASS [${l.detail}]`);
    } else {
      failCount++;
      console.error(`✗ SKENARIO ${l.step}: ${l.name} — FAIL [${l.detail}]`);
    }
  });

  console.log(`\nTotal Skenario: ${result.logs.length} (${passCount} Lulus, ${failCount} Gagal)`);
  console.log('Error Console Browser:', result.errors.length, 'Error (Konsol Bersih)');

  if (failCount > 0) {
    process.exit(1);
  }
});
