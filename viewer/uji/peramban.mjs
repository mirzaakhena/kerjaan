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

export async function openBrowser({ dark = false } = {}) {
  const bin = chromePath();
  if (!bin || typeof WebSocket === 'undefined') return null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'];
  if (dark) args.push('--force-dark-mode', '--blink-settings=preferredColorScheme=0');
  const proc = spawn(bin, args, { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    await wait(100);
    if (fs.existsSync(portFile)) port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  }
  if (!port) { proc.kill(); return null; }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');

  const page = {
    send,
    async size(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    },
    async goto(url) {
      const loaded = new Promise((r) => listeners.push((m) => m.method === 'Page.loadEventFired' && r()));
      await send('Page.navigate', { url });
      await loaded;
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
    async until(fn, ms = 5000) {
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
    async close() {
      try { ws.close(); } catch {}
      proc.kill();
      await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
      fs.rmSync(profile, { recursive: true, force: true });
    },
  };
  return page;
}
