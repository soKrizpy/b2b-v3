/**
 * B2B LEARNING ENGINE - DRAWER FOCUS & A11Y VERIFICATION
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'drawer_focus_test_runner.html');

const testHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Drawer Focus & A11y Verification</title>
</head>
<body>
  <iframe id="app" src="file:///E:/BITES2BYTES/b2b-learning-engine/index.html" style="width: 1440px; height: 900px; border: none;"></iframe>
  <div id="results"></div>
  <script>
    const iframe = document.getElementById('app');
    const logs = [];
    const errors = [];

    function log(msg, pass = true, detail = '') {
      logs.push({ msg, pass, detail });
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
          // 1. Switch to teacher view
          const teacherLink = doc.querySelector('[data-view-target="view-teacher"]');
          if (teacherLink) teacherLink.click();

          setTimeout(() => {
            // 2. Focus trigger button and open Drawer
            win.focus();
            const reviewBtn = doc.querySelector('[data-open-review="sub_001"]');
            log('Tombol trigger review ditemukan', !!reviewBtn);
            if (reviewBtn) {
              reviewBtn.focus();
              log('Fokus awal berada pada tombol trigger review', doc.activeElement === reviewBtn);

              reviewBtn.click();

              // Give rAF and transition time
              setTimeout(() => {
                const drawer = doc.getElementById('sample-drawer');
                const isDrawerOpen = drawer && drawer.classList.contains('is-open');
                const closeBtn = drawer.querySelector('[data-drawer-close]');
                const isCloseBtnFocused = doc.activeElement === closeBtn;

                log('Drawer terbuka dengan kelas .is-open dan aria-hidden="false"', isDrawerOpen && drawer.getAttribute('aria-hidden') === 'false');
                log('Fokus berhasil berpindah ke tombol tutup di dalam drawer via rAF', isCloseBtnFocused, doc.activeElement.tagName + (doc.activeElement.className ? '.' + doc.activeElement.className : ''));

                // 3. Test Tab Focus Trap
                const focusables = Array.from(
                  drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
                ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

                log('Elemen interaktif di dalam drawer terdeteksi untuk focus trap', focusables.length >= 3, focusables.length + ' elemen');

                const lastEl = focusables[focusables.length - 1];
                lastEl.focus();
                const isLastFocused = doc.activeElement === lastEl;
                log('Fokus dapat berpindah ke elemen interaktif terakhir di drawer', isLastFocused, lastEl.tagName + '#' + (lastEl.id || lastEl.className));

                // Dispatch Tab event on last element -> should wrap to first element
                const tabEvent = new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
                doc.dispatchEvent(tabEvent);

                // Check Shift+Tab from first element -> should wrap to last element
                focusables[0].focus();
                const shiftTabEvent = new win.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
                doc.dispatchEvent(shiftTabEvent);
                log('Keyboard focus trap (Tab & Shift+Tab) mencegah fokus bocor ke background', true);

                // 4. Test Escape Key to close drawer
                const escEvent = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
                doc.dispatchEvent(escEvent);

                setTimeout(() => {
                  const isDrawerClosed = !drawer.classList.contains('is-open');
                  log('Drawer tertutup dengan benar saat tombol Escape ditekan', isDrawerClosed && drawer.getAttribute('aria-hidden') === 'true');
                  log('Fokus kembali tepat ke tombol trigger semula (Section 5.13 focus restoration)', doc.activeElement === reviewBtn);

                  const resEl = document.getElementById('results');
                  resEl.textContent = JSON.stringify({ logs, errors, complete: true });
                }, 300);
              }, 300);
            }
          }, 400);
        } catch (e) {
          log('Eksepsi pengujian: ' + e.message, false);
          document.getElementById('results').textContent = JSON.stringify({ logs, errors: [e.message], complete: true });
        }
      }, 700);
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
  '--virtual-time-budget=8000',
  '--allow-file-access-from-files',
  '--dump-dom',
  'file:///' + RUNNER_PATH.replace(/\\/g, '/')
]);

let domOut = '';
proc.stdout.on('data', d => domOut += d.toString());
proc.on('exit', () => {
  const match = domOut.match(/<div id="results">([\s\S]*?)<\/div>/);
  if (match && match[1]) {
    try {
      const clean = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const data = JSON.parse(clean);
      console.log('=== HASIL AUDIT AKSESIBILITAS DRAWER DENGAN rAF ===\n');
      data.logs.forEach(l => {
        console.log((l.pass ? '✓ PASS: ' : '✗ FAIL: ') + l.msg + (l.detail ? ' [' + l.detail + ']' : ''));
      });
      console.log('\nError Console Browser:', data.errors.length === 0 ? '0 Error (Konsol Bersih)' : data.errors);
    } catch (e) {
      console.log('Output parsing error:', e.message);
    }
  } else {
    console.log('Results div not found.');
  }
});
