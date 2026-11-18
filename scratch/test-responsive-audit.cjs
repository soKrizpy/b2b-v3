/**
 * B2B LEARNING ENGINE - RESPONSIVE & HORIZONTAL OVERFLOW AUDIT
 * Headless Chrome test runner across 4 viewports:
 * - Desktop: 1440 x 900
 * - Laptop:  1366 x 768
 * - Tablet:   768 x 1024
 * - Mobile:   390 x 844
 * Tests all 4 pages in both Light & Dark modes.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_DIR = 'C:\\Users\\HP\\AppData\\Local\\Temp';
const RUNNER_PATH = path.join(TEMP_DIR, 'responsive_audit_runner.html');

const pages = [
  { name: 'Admin (index.html)', url: 'file:///E:/BITES2BYTES/b2b-learning-engine/index.html#admin-accounts', role: 'usr_adm_001', container: '#admin-container' },
  { name: 'Tutor (teacher.html)', url: 'file:///E:/BITES2BYTES/b2b-learning-engine/teacher.html', role: 'usr_tea_001', container: '#teacher-container' },
  { name: 'Student (student.html)', url: 'file:///E:/BITES2BYTES/b2b-learning-engine/student.html', role: 'usr_stu_001', container: '#student-container' },
  { name: 'Parent (parent.html)', url: 'file:///E:/BITES2BYTES/b2b-learning-engine/parent.html', role: 'usr_par_001', container: '#parent-container' }
];

const viewports = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 390, height: 844 }
];

const runnerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Responsive Viewport Audit</title>
</head>
<body>
  <div id="results"></div>
  <script>
    const logs = [];
    const errors = [];

    window.addEventListener('error', (e) => {
      errors.push(e.message || String(e));
    });

    const pages = ${JSON.stringify(pages)};
    const viewports = ${JSON.stringify(viewports)};

    async function runTestMatrix() {
      for (const p of pages) {
        for (const vp of viewports) {
          await testPageViewport(p, vp);
        }
      }

      const resDiv = document.getElementById('results');
      resDiv.setAttribute('data-done', 'true');
      resDiv.setAttribute('data-logs', JSON.stringify(logs));
      resDiv.setAttribute('data-errors', JSON.stringify(errors));
    }

    function testPageViewport(page, vp) {
      return new Promise((resolve) => {
        const frame = document.createElement('iframe');
        frame.style.width = vp.width + 'px';
        frame.style.height = vp.height + 'px';
        frame.style.border = 'none';
        frame.style.position = 'fixed';
        frame.style.top = '0';
        frame.style.left = '0';
        frame.style.visibility = 'hidden';
        document.body.appendChild(frame);

        frame.onload = () => {
          setTimeout(() => {
            try {
              const doc = frame.contentDocument;
              const win = frame.contentWindow;

              // Sign in as appropriate role
              if (win.AuthService && page.role) {
                win.AuthService.signInDemo(page.role);
              }

              // Check theme light
              win.document.documentElement.setAttribute('data-theme', 'light');

              // Check container presence
              const container = doc.querySelector(page.container);
              const hasContainer = !!container;

              // Check horizontal overflow
              // The root html or body scrollWidth should not meaningfully exceed clientWidth
              const htmlScrollW = doc.documentElement.scrollWidth;
              const htmlClientW = doc.documentElement.clientWidth;
              const bodyScrollW = doc.body.scrollWidth;
              const bodyClientW = doc.body.clientWidth;

              // Allow up to 2px subpixel rounding tolerance
              const noHtmlOverflow = (htmlScrollW - htmlClientW) <= 2;
              const noBodyOverflow = (bodyScrollW - bodyClientW) <= 2;
              const isResponsive = noHtmlOverflow && noBodyOverflow;

              logs.push({
                page: page.name,
                viewport: vp.name + ' (' + vp.width + 'px)',
                hasContainer,
                isResponsive,
                htmlScrollW,
                htmlClientW,
                bodyScrollW,
                bodyClientW,
                pass: hasContainer && isResponsive
              });

              // Test Dark Mode as well
              win.document.documentElement.setAttribute('data-theme', 'dark');
              const darkHtmlScrollW = doc.documentElement.scrollWidth;
              const darkHtmlClientW = doc.documentElement.clientWidth;
              const darkResponsive = (darkHtmlScrollW - darkHtmlClientW) <= 2;

              logs.push({
                page: page.name + ' [Dark Mode]',
                viewport: vp.name + ' (' + vp.width + 'px)',
                hasContainer,
                isResponsive: darkResponsive,
                pass: hasContainer && darkResponsive
              });

            } catch (err) {
              logs.push({
                page: page.name,
                viewport: vp.name,
                pass: false,
                error: err.message
              });
            } finally {
              document.body.removeChild(frame);
              resolve();
            }
          }, 400);
        };

        frame.src = page.url;
      });
    }

    setTimeout(runTestMatrix, 500);
  </script>
</body>
</html>`;

fs.writeFileSync(RUNNER_PATH, runnerHtml, 'utf8');

async function main() {
  console.log('═'.repeat(65));
  console.log('📱 RUNNING RESPONSIVE VIEWPORT & HORIZONTAL OVERFLOW AUDIT');
  console.log('═'.repeat(65));

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9223',
    '--allow-file-access-from-files',
    '--user-data-dir=' + path.join(TEMP_DIR, 'chrome_audit_profile'),
    `file:///${RUNNER_PATH.replace(/\\\\/g, '/')}`
  ]);

  let stdout = '';
  let stderr = '';

  const cleanup = () => {
    try { chromeProc.kill(); } catch (e) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  // Poll until done or timeout
  const startTime = Date.now();
  let done = false;
  let results = null;

  while (Date.now() - startTime < 35000) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const http = require('http');
      const getJson = (url) => new Promise((resolve, reject) => {
        http.get(url, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
          });
        }).on('error', reject);
      });

      const targets = await getJson('http://127.0.0.1:9223/json');
      if (targets && targets.length > 0) {
        const pageTarget = targets.find(t => t.url.includes('responsive_audit_runner.html')) || targets[0];
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          const WebSocket = require('ws'); // If ws not installed, we can evaluate through CDP or dump DOM
        }
      }
    } catch (e) {
      // ignore
    }
  }

  cleanup();
}

// Fallback direct execution using spawnSync to dump DOM if WebSocket not present
async function runDirectEvaluation() {
  console.log('═'.repeat(65));
  console.log('📱 RUNNING RESPONSIVE VIEWPORT & HORIZONTAL OVERFLOW AUDIT');
  console.log('═'.repeat(65));

  const runnerHtmlUrl = `file:///${RUNNER_PATH.replace(/\\\\/g, '/')}`;
  
  // Launch Chrome headless with --dump-dom after delay
  const { execSync } = require('child_process');
  
  // We can write a self-contained node evaluation script that queries each file's CSS/DOM or uses Chrome remote debugging protocol via simple http/ws
  // Let's run chrome with virtual-time-budget to dump the final HTML with results!
  const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --no-sandbox --allow-file-access-from-files --run-all-compositor-stages-before-draw --virtual-time-budget=20000 --dump-dom "${runnerHtmlUrl}"`;
  
  const domOutput = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  
  const matchLogs = domOutput.match(/data-logs="([^"]+)"/);
  const matchErrors = domOutput.match(/data-errors="([^"]+)"/);
  
  if (!matchLogs) {
    console.error('❌ Failed to extract test results from headless runner output.');
    process.exit(1);
  }
  
  const rawLogs = matchLogs[1].replace(/&quot;/g, '"');
  const logs = JSON.parse(rawLogs);
  
  let totalTests = logs.length;
  let passCount = 0;
  let failCount = 0;

  console.log('\\n' + '─'.repeat(65));
  console.log('  HASIL AUDIT VIEWPORT (RESPONSIVE & OVERFLOW)');
  console.log('─'.repeat(65));

  logs.forEach(l => {
    if (l.pass) {
      passCount++;
      console.log(`  ✓ PASS: ${l.page} @ ${l.viewport} — No overflow (W: ${l.htmlScrollW || '-'}px)`);
    } else {
      failCount++;
      console.log(`  ✗ FAIL: ${l.page} @ ${l.viewport} — Overflow detected: scrollW=${l.htmlScrollW}, clientW=${l.htmlClientW}`);
    }
  });

  console.log('─'.repeat(65));
  console.log(`Total Viewport Tests : ${totalTests}`);
  console.log(`✅ Lulus            : ${passCount}`);
  console.log(`❌ Gagal            : ${failCount}`);
  console.log('═'.repeat(65));

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 SELURUH AUDIT VIEWPORT RESPONSIVE BERHASIL (ZERO OVERFLOW)!');
  }
}

runDirectEvaluation().catch(err => {
  console.error(err);
  process.exit(1);
});
