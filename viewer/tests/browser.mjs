// A real browser for the tests that judge layout: headless Chrome driven over
// the DevTools protocol, with no dependency beyond Node itself. Returns null
// when no Chrome is installed, so those tests skip instead of failing.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export const chromePath = () => CANDIDATES.find((p) => fs.existsSync(p)) || null;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// How long one step in the page may take before it fails on its own, rather
// than waiting for the whole test's time limit. Generous: a machine kept busy
// by other Chromes is slow, not broken.
const STEP_MS = 30000;

// Rejects, naming `what`, when `promise` has not settled within `ms`.
const within = (promise, ms, what) => {
  let timer;
  const late = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: tidak selesai dalam ${ms / 1000} detik`)), ms);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
};

// Resolves true once `proc` has exited, or false after `ms`.
const exited = (proc, ms) => new Promise((resolve) => {
  if (proc.exitCode !== null || proc.signalCode !== null) return resolve(true);
  const timer = setTimeout(() => resolve(false), ms);
  proc.once('exit', () => { clearTimeout(timer); resolve(true); });
});

// Chrome runs in a process group of its own, and is always stopped as a whole
// group: its helpers (network, renderers) outlive the main process otherwise,
// and keep writing into the profile after it has exited.
const killGroup = (proc) => {
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
};
const groupGone = (proc) => {
  try { process.kill(-proc.pid, 0); return false; } catch { return true; }
};

// Every Chrome this process started and has not closed yet. A test stopped by
// its time limit never reaches its `finally`; when the process then ends, by
// --test-force-exit or by a signal, this kills what it left, so no Chrome
// outlives the tests.
const live = new Set();
const killAll = () => {
  for (const b of live) killGroup(b.proc);
  for (const b of live) {
    try { fs.rmSync(b.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
  }
  live.clear();
};
process.on('exit', killAll);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.once(sig, () => { killAll(); process.kill(process.pid, sig); });
}

// Chrome may still be writing into its profile for a moment after it exits,
// more so on a busy machine: `rm` retries what is not empty yet.
const removeProfile = (dir) => fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

// Stops Chrome and all its helpers, and removes its profile. Never throws: a
// profile that still cannot be removed is left in the temp folder (and noted
// in `b.leftover`) rather than failing the test or keeping the viewer server
// open behind it. Nothing in the profile is kept, so there is no clean
// shutdown to wait for (Chrome takes seconds to exit after `Browser.close`).
async function shutDown(b) {
  killGroup(b.proc);
  await exited(b.proc, 5000);
  for (let i = 0; i < 50 && !groupGone(b.proc); i++) await wait(100);
  live.delete(b);
  try {
    await b.remove(b.profile);
  } catch (err) {
    b.leftover = err;
  }
}

export async function openBrowser({ dark = false } = {}) {
  const bin = chromePath();
  if (!bin || typeof WebSocket === 'undefined') return null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'];
  if (dark) args.push('--force-dark-mode', '--blink-settings=preferredColorScheme=0');
  const proc = spawn(bin, args, { stdio: 'ignore', detached: true });
  proc.on('error', () => {});
  // `stepMs` and `remove` change only in the tests of this file.
  const b = { proc, profile, dark, stepMs: STEP_MS, remove: removeProfile, leftover: null };
  live.add(b);
  const conn = { ws: null };
  try {
    return await connect(b, conn);
  } catch (err) {
    await shutDown(b);
    try { conn.ws?.close(); } catch {}
    throw err;
  }
}

async function connect(b, conn) {
  const portFile = path.join(b.profile, 'DevToolsActivePort');
  let port;
  // Chrome starts slowly when other Chromes keep the machine busy.
  for (let i = 0; i < 300 && !port && b.proc.exitCode === null; i++) {
    await wait(100);
    if (fs.existsSync(portFile)) port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  }
  if (!port) { await shutDown(b); return null; }
  const target = await within(fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()), b.stepMs, 'membuka tab');
  const ws = (conn.ws = new WebSocket(target.webSocketDebuggerUrl));
  await within(new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }), b.stepMs, 'menyambung ke Chrome');
  let seq = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  // Chrome gone: whatever still waits on it fails now instead of never.
  ws.onclose = () => {
    for (const { reject } of pending.values()) reject(new Error('Chrome tertutup'));
    pending.clear();
  };
  const send = (method, params = {}) => within(new Promise((resolve, reject) => {
    if (ws.readyState !== WebSocket.OPEN) return reject(new Error('Chrome tertutup'));
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  }), b.stepMs, method);
  await send('Page.enable');
  await send('Runtime.enable');
  // Light or dark as asked, whatever the machine's own appearance is (macOS
  // switches to dark in the evening, and Chrome follows it).
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: b.dark ? 'dark' : 'light' }] });

  let closing = null;
  const page = {
    send,
    // The Chrome behind this page, for the tests of this file.
    browser: b,
    async size(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    },
    async goto(url) {
      const loaded = new Promise((r) => listeners.push((m) => m.method === 'Page.loadEventFired' && r()));
      await send('Page.navigate', { url });
      await within(loaded, b.stepMs, `memuat ${url}`);
    },
    // Runs `fn` (a function's source) in the page and returns its value.
    async eval(fn, ...args) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fn})(...${JSON.stringify(args)})`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
      return res.result.value;
    },
    // Waits until `fn` returns something truthy in the page.
    async until(fn, ms = 15000) {
      const end = Date.now() + ms;
      for (;;) {
        const v = await page.eval(fn);
        if (v) return v;
        if (Date.now() > end) throw new Error(`tidak terjadi: ${fn}`);
        await wait(50);
      }
    },
    async screenshot(file) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    },
    // Never throws, and a second call waits for the first.
    close() {
      closing ??= shutDown(b).then(() => { try { ws.close(); } catch {} });
      return closing;
    },
  };
  return page;
}
