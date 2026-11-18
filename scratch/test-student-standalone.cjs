/**
 * B2B LEARNING ENGINE - STANDALONE STUDENT EXPERIENCE TEST SUITE
 * Validates student.html running independently via Chrome Headless.
 * Complete coverage of Phase 2 features in the new multi-page architecture.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'student_standalone_runner_v2.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Standalone Verification</title>
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
          // 1. Isolation: Teacher modules NOT loaded
          const teacherCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).some(l => l.href.includes('teacher.css'));
          log('Modul CSS Teacher tidak dimuat pada student.html', !teacherCss);

          const teacherContainer = doc.getElementById('teacher-container');
          const teacherDrawer = doc.getElementById('sample-drawer');
          log('DOM bebas dari elemen Teacher (#teacher-container & #sample-drawer)', !teacherContainer && !teacherDrawer);

          // 2. Student Dashboard Elements
          const heroCard = doc.querySelector('.dashboard-hero-card');
          log('Student Dashboard: Hero Profile Card ditemukan', !!heroCard);

          const mascot = doc.querySelector('.hero-mascot-wrap svg');
          log('Student Dashboard: Maskot Byte SVG dirender', !!mascot);

          const statPills = doc.querySelectorAll('.hero-stat-pills .stat-pill');
          log('Student Dashboard: 4 Stat Counter Pills (Streak, XP, Target, Lencana)', statPills.length === 4, statPills.length + ' pills');

          const activeMission = doc.querySelector('.active-mission-card');
          log('Student Dashboard: Active Mission Card ("Scratch — Basic Motion") hadir', !!activeMission && activeMission.textContent.includes('Scratch'));

          // 3. Realms & RPG Quest Map
          const realmItems = doc.querySelectorAll('.realms-grid .realm-item');
          log('Student Dashboard: 4 Wilayah Kepulauan Koding (Scratch, Roblox, Python, GameDev)', realmItems.length === 4, realmItems.length + ' wilayah');

          const questMapCard = doc.querySelector('.quest-map-card');
          log('Quest Map: Card petualangan RPG dirender', !!questMapCard);

          const mapNodes = doc.querySelectorAll('.map-node-overlay');
          log('Quest Map: Node kepulauan koding pada peta RPG', mapNodes.length >= 3, mapNodes.length + ' nodes');

          const scratchNode = doc.querySelector('.map-node-scratch .map-node-active');
          log('Quest Map: Node Scratch aktif dengan indikator pulse glow', !!scratchNode);

          // 4. Horizontal Overflow Check (1440px)
          const hasHOverflow = doc.documentElement.scrollWidth > doc.documentElement.clientWidth;
          log('Bebas horizontal overflow pada viewport desktop 1440px', !hasHOverflow);

          // 5. Theme Toggle Test
          const themeBtn = doc.getElementById('btn-theme-toggle');
          log('Tombol toggle tema #btn-theme-toggle ditemukan', !!themeBtn);
          if (themeBtn) {
            const initialTheme = doc.documentElement.getAttribute('data-theme') || 'light';
            themeBtn.click();
            const toggledTheme = doc.documentElement.getAttribute('data-theme');
            log('Theme toggle: Berhasil mengubah tema (' + initialTheme + ' -> ' + toggledTheme + ')', toggledTheme !== initialTheme);
            // Toggle back
            themeBtn.click();
            const restoredTheme = doc.documentElement.getAttribute('data-theme');
            log('Theme toggle: Berhasil kembali ke tema semula (' + restoredTheme + ')', restoredTheme === initialTheme);
          }

          // 6. Navigation to Lesson Workspace
          const enterLessonBtn = doc.querySelector('.btn-enter-lesson');
          log('Tombol "Lanjutkan Misi" / "Buka Workspace" ditemukan', !!enterLessonBtn);
          if (enterLessonBtn) enterLessonBtn.click();

          setTimeout(() => {
            const workspace = doc.querySelector('.lesson-workspace');
            log('Lesson Workspace: Berhasil dimuat dan menggantikan tampilan dashboard', !!workspace);

            const stageNavItems = doc.querySelectorAll('.stage-nav-item');
            log('Lesson Workspace: 6 Tahapan Pembelajaran lengkap di stage-nav', stageNavItems.length === 6, stageNavItems.length + ' tahapan');

            // Stage 0: Brief
            const briefContent = doc.querySelector('#stage-content-area .cb-text') || doc.getElementById('stage-content-area');
            log('Tahap 1 (Mission Brief): Konten brief awal dirender', !!briefContent && briefContent.textContent.length > 20);

            // Stage 1: Materials (Slides & Content Blocks)
            const stage1Btn = doc.querySelector('[data-stage-index="1"]');
            if (stage1Btn) stage1Btn.click();

            setTimeout(() => {
              const slideBody = doc.getElementById('slide-body');
              const slideCounter = doc.querySelector('.slide-counter');
              const slideDots = doc.querySelector('.slide-dots');
              log('Tahap 2 (Learning Materials): Slide presenter & konten materi dirender', !!slideBody && !!slideCounter && !!slideDots, slideCounter ? slideCounter.textContent : '');

              // Stage 2: Guided Practice
              const stage2Btn = doc.querySelector('[data-stage-index="2"]');
              if (stage2Btn) stage2Btn.click();

              setTimeout(() => {
                const checkpoints = doc.querySelectorAll('.practice-container .checkpoint');
                log('Tahap 3 (Guided Practice): 4 Checkpoints praktik terbimbing hadir', checkpoints.length === 4, checkpoints.length + ' checkpoints');

                // Stage 3: Comprehension Check (Quiz)
                const stage3Btn = doc.querySelector('[data-stage-index="3"]');
                if (stage3Btn) stage3Btn.click();

                setTimeout(() => {
                  const quizContainers = doc.querySelectorAll('.quiz-container');
                  log('Tahap 4 (Comprehension Check): Kuis konsep interaktif hadir', quizContainers.length >= 1, quizContainers.length + ' soal kuis');

                  // Stage 4: Project Challenge
                  const stage4Btn = doc.querySelector('[data-stage-index="4"]');
                  if (stage4Btn) stage4Btn.click();

                  setTimeout(() => {
                    const projectBrief = doc.querySelector('.project-brief') || doc.getElementById('stage-content-area');
                    log('Tahap 5 (Project Challenge): Instruksi tantangan proyek hadir', !!projectBrief);

                    // Stage 5: Project Submission Form
                    const stage5Btn = doc.querySelector('[data-stage-index="5"]');
                    if (stage5Btn) stage5Btn.click();

                    setTimeout(() => {
                      const urlInput = doc.getElementById('submission-link');
                      const notesInput = doc.getElementById('submission-notes');
                      const submitBtn = doc.getElementById('btn-submit-project');
                      log('Tahap 6 (Project Submission): Form URL, catatan, dan tombol submit hadir', !!urlInput && !!notesInput && !!submitBtn);

                      // Test Submission Interaction
                      if (urlInput && submitBtn && !submitBtn.disabled) {
                        urlInput.value = 'https://scratch.mit.edu/projects/1098273645';
                        if (notesInput) notesInput.value = 'Proyek koding kucing bergerak otomatis.';
                        submitBtn.click();
                      }

                      setTimeout(() => {
                        const statusCard = doc.querySelector('.submission-status-card');
                        const isSubmitted = statusCard || (submitBtn && submitBtn.textContent.includes('Sudah Dikumpulkan'));
                        log('Interaksi Submission: Proyek berhasil disubmit dengan status submitted', !!isSubmitted);

                        // Back to Quest / Dashboard Button
                        const backBtn = doc.getElementById('btn-back-to-quest');
                        log('Tombol "← Kembali ke Peta Petualangan" tersedia', !!backBtn);
                        if (backBtn) backBtn.click();

                        setTimeout(() => {
                          const heroReturned = doc.querySelector('.dashboard-hero-card');
                          log('Navigasi kembali ke Dashboard berfungsi sempurna', !!heroReturned);

                          // Sidebar navigation test
                          const sidebarMissionLink = doc.querySelector('[data-student-nav="mission"]');
                          log('Sidebar link [data-student-nav="mission"] tersedia', !!sidebarMissionLink);
                          if (sidebarMissionLink) sidebarMissionLink.click();

                          setTimeout(() => {
                            const workspaceViaSidebar = doc.querySelector('.lesson-workspace');
                            log('Sidebar navigasi: Berhasil membuka Workspace via menu samping', !!workspaceViaSidebar);

                            // LocalStorage Persistence
                            const progressKey = 'b2b_student_lesson_progress';
                            const savedRaw = win.localStorage.getItem(progressKey);
                            log('Progres tersimpan di localStorage (' + progressKey + ')', !!savedRaw);

                            const resEl = document.getElementById('results');
                            resEl.textContent = JSON.stringify({ logs, errors, complete: true });
                          }, 300);
                        }, 300);
                      }, 400);
                    }, 350);
                  }, 350);
                }, 350);
              }, 350);
            }, 350);
          }, 400);

        } catch (e) {
          log('Eksepsi pengujian: ' + e.message, false, e.stack);
          document.getElementById('results').textContent = JSON.stringify({ logs, errors: [e.message], complete: true });
        }
      }, 800);
    });
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
      console.log('=== HASIL AUDIT STANDALONE STUDENT EXPERIENCE (student.html) ===\n');
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
      console.log('Raw output snippet:', domOutput.substring(domOutput.length - 1000));
    }
  } else {
    console.log('Results div not found. Raw DOM tail:\n', domOutput.substring(domOutput.length - 800));
  }
});
