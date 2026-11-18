/**
 * B2B LEARNING ENGINE - END-TO-END LEARNING CYCLE SUITE
 * Complete lifecycle verification:
 * 1. Student submits Scratch project -> recorded in StateStore
 * 2. Teacher evaluates and approves submission -> reactive event dispatched
 * 3. Student UI updates dynamically: shows Approved card + teacher feedback
 * 4. Teacher requests revision -> Student UI shows Revision Required card + instructions
 * 5. Student can re-edit and re-submit after revision request
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'e2e_cycle_runner.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>End-to-End Learning Cycle Verification</title>
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

      // Reset storage for clean test run
      win.localStorage.clear();

      setTimeout(() => {
        try {
          // 1. Enter Workspace -> Go to Stage 6 (Submission)
          const enterBtn = doc.getElementById('btn-enter-lesson');
          log('Membuka Lesson Workspace dari Dashboard', !!enterBtn);
          if (enterBtn) enterBtn.click();

          setTimeout(() => {
            const stageNavItems = doc.querySelectorAll('.stage-nav-item');
            const subStageBtn = stageNavItems[stageNavItems.length - 1];
            log('Menavigasi ke Tahap 6 (Project Submission)', !!subStageBtn);
            if (subStageBtn) subStageBtn.click();

            setTimeout(() => {
              // 2. Student submits project
              const linkInput = doc.getElementById('submission-link');
              const notesInput = doc.getElementById('submission-notes');
              const submitBtn = doc.getElementById('btn-submit-project');

              if (linkInput) linkInput.value = 'https://scratch.mit.edu/projects/1098273645';
              if (notesInput) notesInput.value = 'Sprite kucing bergerak bolak-balik dan memantul di tepi.';

              log('Mengisi form pengumpulan proyek Scratch', !!linkInput && !!notesInput && !!submitBtn);
              if (submitBtn) submitBtn.click();

              setTimeout(() => {
                // Verify Submitted state in Student UI
                const submittedCard = doc.querySelector('.submission-status-card');
                const submittedBadge = doc.querySelector('.submission-status-card .badge-submitted');
                log('Student UI: Menampilkan status "Submitted" setelah pengumpulan', !!submittedCard && !!submittedBadge);

                // Verify saved in StateStore
                const rawStore = win.localStorage.getItem('b2b_submissions_store');
                const store = rawStore ? JSON.parse(rawStore) : {};
                const alexSub = store['sub_001'] || Object.values(store).find(s => s.studentId === 'usr_stu_001');
                log('StateStore: Submission tercatat dengan status "submitted"', !!alexSub && alexSub.status === 'submitted');

                // 3. Simulate Teacher Approval via StateStore API (as would happen from teacher tab)
                import('file:///E:/BITES2BYTES/b2b-learning-engine/js/services/state-store.js').then(({ StateStore }) => {
                  const approvedSub = StateStore.updateSubmissionStatus(alexSub.id, 'approved', {
                    reviewerId: 'usr_tea_001',
                    reviewerName: 'Kak Sarah',
                    teacherFeedback: 'Luar biasa Alex! Animasi sprite memantul bekerja sempurna dan logika gerak rapi.'
                  }, alexSub.version || 1);

                  log('Teacher Aksi: Proyek disetujui oleh Kak Sarah melalui StateStore', !!approvedSub && approvedSub.status === 'approved');

                  setTimeout(() => {
                    // 4. Verify Student UI dynamically reflects Approval + Feedback
                    const approvedCard = doc.querySelector('.submission-status-card--approved');
                    const approvedBadge = doc.querySelector('.submission-status-card .badge-approved');
                    const feedbackBox = doc.querySelector('.submission-feedback-box');
                    const feedbackBody = doc.querySelector('.submission-feedback-body');

                    log('Student UI Reaktif: Card status berubah menjadi "Proyek Disetujui!" (.submission-status-card--approved)',
                      !!approvedCard && !!approvedBadge
                    );
                    log('Student UI Reaktif: Menampilkan teks feedback guru secara lengkap',
                      !!feedbackBox && feedbackBody && feedbackBody.textContent.includes('Luar biasa Alex')
                    );

                    // 5. Simulate Teacher Requesting Revision
                    const revSub = StateStore.updateSubmissionStatus(alexSub.id, 'revision-required', {
                      reviewerId: 'usr_tea_001',
                      reviewerName: 'Kak Sarah',
                      teacherFeedback: 'Sprite masih terbalik saat belok ke kiri. Tambahkan blok set rotation style left-right.'
                    }, approvedSub.version);

                    log('Teacher Aksi: Minta revisi dengan catatan instruksi perbaikan', !!revSub && revSub.status === 'revision-required');

                    setTimeout(() => {
                      // 6. Verify Student UI reflects Revision Required
                      const revCard = doc.querySelector('.submission-status-card--revision');
                      const revBadge = doc.querySelector('.submission-status-card .badge-revision-required');
                      const revFeedbackBody = doc.querySelector('.submission-feedback-body');
                      const linkInputAfterRev = doc.getElementById('submission-link');
                      const submitBtnAfterRev = doc.getElementById('btn-submit-project');

                      log('Student UI Reaktif: Card status berubah menjadi "Revisi Diperlukan"', !!revCard && !!revBadge);
                      log('Student UI Reaktif: Menampilkan instruksi perbaikan dari guru',
                        revFeedbackBody && revFeedbackBody.textContent.includes('rotation style')
                      );
                      log('Student UI Reaktif: Form diaktifkan kembali untuk pengiriman ulang (tidak disabled)',
                        linkInputAfterRev && !linkInputAfterRev.disabled
                      );
                      log('Student UI Reaktif: Tombol berubah menjadi "Kirim Ulang Hasil Revisi ->"',
                        submitBtnAfterRev && submitBtnAfterRev.textContent.includes('Kirim Ulang')
                      );

                      // 7. Student re-submits after revision
                      if (linkInputAfterRev) linkInputAfterRev.value = 'https://scratch.mit.edu/projects/1098273645_v2';
                      if (submitBtnAfterRev) submitBtnAfterRev.click();

                      setTimeout(() => {
                        const rawStoreFinal = win.localStorage.getItem('b2b_submissions_store');
                        const storeFinal = rawStoreFinal ? JSON.parse(rawStoreFinal) : {};
                        const alexFinal = storeFinal[alexSub.id];

                        log('Student Re-submit: Proyek revisi berhasil dikirim ulang (status="submitted")',
                          alexFinal && alexFinal.status === 'submitted' && alexFinal.projectUrl.includes('_v2')
                        );

                        document.getElementById('results').textContent = JSON.stringify({ logs, errors });
                      }, 250);
                    }, 250);
                  }, 250);
                });
              }, 250);
            }, 250);
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
  '--virtual-time-budget=10000',
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
    console.error('Gagal mengambil hasil End-to-End Cycle Test');
    console.error('STDERR:', stderrData);
    process.exit(1);
  }

  const result = JSON.parse(match[1]);
  console.log('=== HASIL AUDIT END-TO-END LEARNING CYCLE (STUDENT <-> TEACHER) ===\n');

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

  console.log('\nTotal Pengujian E2E Cycle:', passCount + failCount, `(${passCount} Lulus, ${failCount} Gagal)`);
  if (result.errors && result.errors.length > 0) {
    console.error('Error Console:', result.errors);
  } else {
    console.log('Error Console Browser: 0 Error (Konsol Bersih)');
  }

  if (failCount > 0) process.exit(1);
});
