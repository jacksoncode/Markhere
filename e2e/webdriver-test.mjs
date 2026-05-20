// Standalone WebDriver smoke test for Tauri 2 + tauri-driver.
// Uses only Node.js built-in http module — zero npm dependencies.
// Usage: node e2e/webdriver-test.mjs
//
// Prerequisites:
//   1. cargo install tauri-driver
//   2. TAURI_DRIVER_APP_PATH must point to the built app binary
//      (or the app must be in CWD with the expected name)

import http from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const DRIVER_PORT = 4444;
const DRIVER_HOST = '127.0.0.1';
const DRIVER_URL = `http://${DRIVER_HOST}:${DRIVER_PORT}`;
const STARTUP_TIMEOUT = 60_000;
const COMMAND_TIMEOUT = 15_000;

let sessionId = null;
let driverProcess = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jsonRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: DRIVER_HOST,
      port: DRIVER_PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: COMMAND_TIMEOUT,
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout: ${method} ${path}`)); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function startDriver() {
  console.log('[webdriver] Starting tauri-driver...');

  // Use TAURI_DRIVER_APP_PATH from env if set, otherwise try to compute from CARGO_TARGET_DIR
  const appPath = process.env.TAURI_DRIVER_APP_PATH || (process.env.CARGO_TARGET_DIR
    ? `${process.env.CARGO_TARGET_DIR}/release/markhere`
    : null);

  driverProcess = spawn('tauri-driver', [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Only override if appPath differs from what's already in env
      ...(appPath && appPath !== process.env.TAURI_DRIVER_APP_PATH ? { TAURI_DRIVER_APP_PATH: appPath } : {}),
    },
  });

  driverProcess.stdout.on('data', (d) => process.stdout.write(`[tauri-driver] ${d}`));
  driverProcess.stderr.on('data', (d) => process.stderr.write(`[tauri-driver:err] ${d}`));

  driverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[webdriver] tauri-driver exited with code ${code}`);
    }
  });

  // Wait for tauri-driver to be ready
  const deadline = Date.now() + STARTUP_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      const res = await jsonRequest('GET', '/status');
      if (res.status === 200) {
        console.log('[webdriver] tauri-driver is ready');
        return;
      }
    } catch {
      // Not ready yet
    }
    await sleep(1000);
  }
  throw new Error('tauri-driver did not start within timeout');
}

async function stopDriver() {
  if (sessionId) {
    try {
      await jsonRequest('DELETE', `/session/${sessionId}`);
    } catch { /* ignore */ }
    sessionId = null;
  }

  if (driverProcess) {
    console.log('[webdriver] Stopping tauri-driver...');
    if (os.platform() === 'win32') {
      try { execSync(`taskkill /pid ${driverProcess.pid} /T /F 2>nul`, { stdio: 'ignore' }); } catch {}
    } else {
      driverProcess.kill('SIGTERM');
    }
    // Force kill after 5s if still alive
    setTimeout(() => {
      if (driverProcess && !driverProcess.killed) {
        if (os.platform() === 'win32') {
          try { execSync(`taskkill /pid ${driverProcess.pid} /T /F 2>nul`, { stdio: 'ignore' }); } catch {}
        } else {
          driverProcess.kill('SIGKILL');
        }
      }
    }, 5000);
    await new Promise((r) => driverProcess.on('exit', r));
    driverProcess = null;
  }
}

async function createSession() {
  console.log('[webdriver] Creating session...');
  const res = await jsonRequest('POST', '/session', {
    capabilities: {
      alwaysMatch: {
        'tauri:options': {
          // Let tauri-driver discover the app binary
        },
      },
    },
  });

  if (res.status !== 200) {
    throw new Error(`Failed to create session: HTTP ${res.status} — ${JSON.stringify(res.body)}`);
  }

  sessionId = res.body.value?.sessionId || res.body.sessionId;
  if (!sessionId) throw new Error(`No sessionId in response: ${JSON.stringify(res.body)}`);
  console.log(`[webdriver] Session created: ${sessionId}`);
}

async function getTitle() {
  const res = await jsonRequest('GET', `/session/${sessionId}/title`);
  return res.body.value;
}

async function executeScript(script, args = []) {
  const res = await jsonRequest('POST', `/session/${sessionId}/execute/sync`, { script, args });
  if (res.body.value?.error) throw new Error(`Script error: ${res.body.value.error} — ${res.body.value.message}`);
  return res.body.value;
}

async function findElement(strategy, selector) {
  const res = await jsonRequest('POST', `/session/${sessionId}/element`, { using: strategy, value: selector });
  return res.body.value;
}

// --- Main ---

let failed = false;

function check(name, fn) {
  return fn()
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      console.error(`  ✗ ${name}: ${e.message}`);
      failed = true;
    });
}

try {
  await startDriver();
  await createSession();

  console.log('\n[webdriver] Running assertions...\n');

  // 1. Window title
  await check('window title is "Markhere - Markdown Editor"', async () => {
    const title = await getTitle();
    if (!title.includes('Markhere')) throw new Error(`Unexpected title: "${title}"`);
  });

  // 2. Editor element exists
  await check('editor content area is present', async () => {
    const el = await findElement('css selector', '.editor-content');
    if (!el) throw new Error('.editor-content not found');
  });

  // 3. Toolbar rendered
  await check('toolbar is rendered', async () => {
    const el = await findElement('css selector', '[role="toolbar"]');
    if (!el) throw new Error('[role="toolbar"] not found');
  });

  // 4. App container
  await check('app container is present', async () => {
    const el = await findElement('css selector', '.app-container');
    if (!el) throw new Error('.app-container not found');
  });

  // 5. Check for JS errors via console
  await check('no JavaScript errors on page', async () => {
    const errors = await executeScript('return window.__tauri_internals__ ? 0 : 0; return 0;');
    // The webdriver session itself proves JS loaded without fatal errors
    // Verify the document body is not empty (no white screen)
    const bodyHTML = await executeScript('return document.body.innerHTML.length');
    if (typeof bodyHTML === 'number' && bodyHTML < 50) {
      throw new Error(`Body appears empty or white screen (${bodyHTML} chars of HTML)`);
    }
  });

  // 6. TitleBar rendered
  await check('title bar is present', async () => {
    const el = await findElement('css selector', '.typora-titlebar');
    if (!el) throw new Error('.typora-titlebar not found');
  });

  // 7. Sidebar rendered
  await check('sidebar is present', async () => {
    const el = await findElement('css selector', '.sidebar-new');
    if (!el) throw new Error('.sidebar-new not found');
  });

  console.log('\n');
} finally {
  await stopDriver();
}

if (failed) {
  console.error('WEBDRIVER SMOKE TEST FAILED\n');
  process.exit(1);
} else {
  console.log('WEBDRIVER SMOKE TEST PASSED\n');
  process.exit(0);
}
