/**
 * B2B LEARNING ENGINE - PHASE 2 PARENT HUB MVP VERIFICATION
 * Uses headless Chrome with --dump-dom and --virtual-time-budget
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'parent_hub_runner.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Parent Hub MVP Verification</title>
</head>
<body>
  <iframe id="app" src="file:///E:/BITES2BYTES/b2b-learning-engine/student.html" style="width: 1440px; height: 900px; border: none;"></iframe>
  <div id="results"></div>
  <script>
    const iframe = document.getElementById('app');
    const logs = [];
    const errors = [];

    function log(msg, pass = true, detail = '') {
      logs.push({ msg, pass: !!pass, detail });
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
          // 1. Check sidebar nav link exists
          const navParentHub = doc.querySelector('[data-student-nav="parent-hub"]');
          log('Sidebar navigation "Parent Hub" link exists', !!navParentHub);

          // 2. Click to navigate to Parent Hub
          if (navParentHub) {
            navParentHub.click();
          }

          // Wait for view to mount
          setTimeout(() => {
            const parentHub = doc.querySelector('.parent-hub-container');
            log('Parent Hub container is rendered in DOM', !!parentHub);

            const title = doc.querySelector('.parent-hub-title');
            log('Parent Hub banner displays student name (Alex Pratama)', title && title.textContent.includes('Alex Pratama'), title ? title.textContent : '');

            // 3. Tab 1: Overview verification
            const activeTab = doc.querySelector('.parent-tab-btn.is-active');
            log('Default active tab is Overview (Ringkasan)', activeTab && activeTab.getAttribute('data-parent-tab') === 'overview');

            const statCards = doc.querySelectorAll('.parent-stat-card');
            log('Overview displays 4 key metric stat cards', statCards.length === 4, 'Found: ' + statCards.length);

            const liveCard = doc.querySelector('.parent-live-status-card');
            log('Live submission & feedback status card is rendered', !!liveCard);

            // 4. Read-only safety check (no text input or submit buttons inside parent hub)
            const inputs = doc.querySelectorAll('.parent-hub-container input:not([type="hidden"]), .parent-hub-container textarea, .parent-hub-container button[type="submit"]');
            log('Strictly Read-Only: No user input forms or edit buttons inside Parent Hub', inputs.length === 0, 'Found input elements: ' + inputs.length);

            // 5. Test Tab 2: Session Reports
            const btnSessions = doc.querySelector('[data-parent-tab="sessions"]');
            if (btnSessions) btnSessions.click();

            setTimeout(() => {
              const sessionCards = doc.querySelectorAll('.session-report-card');
              log('Tab 2: Session reports render multiple sessions', sessionCards.length >= 2, 'Found: ' + sessionCards.length);

              const firstSessionTip = doc.querySelector('.session-report-card .parent-tip-box');
              log('Session reports include dedicated recommendations for parents at home', !!firstSessionTip);

              // 6. Test Tab 3: Weekly Progress
              const btnWeekly = doc.querySelector('[data-parent-tab="weekly"]');
              if (btnWeekly) btnWeekly.click();

              setTimeout(() => {
                const weeklyCards = doc.querySelectorAll('.weekly-card');
                log('Tab 3: Weekly progress renders weekly summaries', weeklyCards.length >= 1, 'Found: ' + weeklyCards.length);

                const progressBar = doc.querySelector('.weekly-progress-fill');
                log('Weekly progress includes module progress visual bar', !!progressBar);

                // 7. Test Tab 4: Monthly Evaluation & Competency Distinction
                const btnMonthly = doc.querySelector('[data-parent-tab="monthly"]');
                if (btnMonthly) btnMonthly.click();

                setTimeout(() => {
                  const distinctionBanner = doc.querySelector('.monthly-distinction-banner');
                  log('Tab 4: Distinctly separates Task Completion vs Conceptual Mastery', !!distinctionBanner);

                  const compCards = doc.querySelectorAll('.competency-item-card');
                  log('Tab 4: Renders 4 detailed computational thinking competencies', compCards.length === 4, 'Found: ' + compCards.length);

                  const nextTargets = doc.querySelector('.next-targets-box');
                  log('Tab 4: Includes actionable next month targets for student', !!nextTargets);

                  // 8. Test Reactive StateStore binding on Overview
                  const btnOverview = doc.querySelector('[data-parent-tab="overview"]');
                  if (btnOverview) btnOverview.click();

                  setTimeout(() => {
                    // Update state store directly with mandatory expectedVersion
                    if (win.StateStore) {
                      const currentSub = win.StateStore.getSubmission('sub_001');
                      const v = currentSub ? (currentSub.version || 1) : 1;
                      win.StateStore.updateSubmissionStatus('sub_001', 'approved', {
                        reviewerId: 'usr_tea_001',
                        reviewerName: 'Kak Sarah',
                        teacherFeedback: 'Proyek gerak Scratch luar biasa rapi, Alex!'
                      }, v);
                    }

                    setTimeout(() => {
                      const feedbackBox = doc.querySelector('.parent-feedback-box');
                      const isApproved = feedbackBox && feedbackBox.classList.contains('is-approved');
                      log('Reactive Store Binding: Overview dynamically updates to "Disetujui" upon StateStore change', !!isApproved);

                      document.getElementById('results').textContent = JSON.stringify({
                        logs,
                        errors
                      });
                    }, 300);
                  }, 300);
                }, 300);
              }, 300);
            }, 300);
          }, 300);
        } catch (e) {
          log('Exception: ' + e.message, false);
          document.getElementById('results').textContent = JSON.stringify({ logs, errors: [e.message] });
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
  '--virtual-time-budget=15000',
  '--dump-dom',
  'file:///' + RUNNER_PATH.replace(/\\/g, '/')
]);

let stdoutData = '';
let stderrData = '';

chromeProc.stdout.on('data', (d) => { stdoutData += d.toString(); });
chromeProc.stderr.on('data', (d) => { stderrData += d.toString(); });

chromeProc.on('close', (code) => {
  try {
    fs.unlinkSync(RUNNER_PATH);
  } catch {}

  const match = stdoutData.match(/<div id="results">([\s\S]*?)<\/div>/);
  if (!match || !match[1]) {
    console.error('Gagal mengambil hasil audit Parent Hub MVP');
    console.error('STDERR:', stderrData);
    process.exit(1);
  }

  const result = JSON.parse(match[1]);
  console.log('=== HASIL AUDIT PARENT HUB MVP (student.html - Phase 2) ===\n');

  let passCount = 0;
  let failCount = 0;

  result.logs.forEach((l) => {
    if (l.pass) {
      passCount++;
      console.log('✓ PASS: ' + l.msg + (l.detail ? ' [' + l.detail + ']' : ''));
    } else {
      failCount++;
      console.error('✗ FAIL: ' + l.msg + (l.detail ? ' [' + l.detail + ']' : ''));
    }
  });

  console.log('\nTotal Pengujian Parent Hub MVP:', passCount + failCount, `(${passCount} Lulus, ${failCount} Gagal)`);
  console.log('Error Console Browser:', result.errors.length, 'Error');

  if (failCount > 0) {
    process.exit(1);
  }
});
