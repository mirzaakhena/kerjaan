// The Chrome helper itself: closing never fails a test or leaves anything
// running, whatever state Chrome or its profile is in, and a page that stops
// answering fails the step instead of waiting forever.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openBrowser, chromePath } from './browser.mjs';
import { tempRoot, startViewer } from './helpers.mjs';

const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), 'browser.mjs');
const skip = { skip: !chromePath() && 'Chrome is not installed' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// True while any process of Chrome's group (the main one or a helper) runs.
const groupAlive = (pid) => {
  try { process.kill(-pid, 0); return true; } catch { return false; }
};
// Chrome's helpers at the moment, so the test knows there were some to stop.
const helpers = (pid) => {
  try { return execFileSync('pgrep', ['-g', String(pid)]).toString().trim().split('\n').filter((p) => p && p !== String(pid)); } catch { return []; }
};

test('closing: Chrome and all its helpers stop, the profile is removed, closing twice is safe', skip, async () => {
  const page = await openBrowser();
  const { proc, profile } = page.browser;
  await page.goto('about:blank');
  assert.ok(helpers(proc.pid).length > 0, 'Chrome has helper processes');
  await page.close();
  assert.equal(groupAlive(proc.pid), false, 'no Chrome process is left');
  assert.equal(fs.existsSync(profile), false, 'the profile is removed');
  assert.equal(page.browser.leftover, null);
  await page.close();
});

test('a profile that cannot be removed: closing still succeeds, Chrome still stops, the viewer server is closed', skip, async () => {
  const v = await startViewer(tempRoot());
  const page = await openBrowser();
  const { proc, profile } = page.browser;
  // What a busy machine does to `rm` when it runs out of retries.
  page.browser.remove = () => Promise.reject(Object.assign(new Error(`ENOTEMPTY: directory not empty, rmdir '${profile}/Default/Cache'`), { code: 'ENOTEMPTY' }));
  try {
    await page.goto(`${v.base}/`);
    // The order every viewer test uses in its `finally`.
    await page.close();
    await v.close();
    assert.equal(v.server.listening, false, 'the viewer server is closed');
    assert.equal(groupAlive(proc.pid), false, 'no Chrome process is left');
    assert.equal(page.browser.leftover?.code, 'ENOTEMPTY', 'the failure is noted, not thrown');
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

test("light and dark theme as asked, whatever the machine's appearance", skip, async () => {
  for (const dark of [false, true]) {
    const page = await openBrowser({ dark });
    try {
      for (const url of ['about:blank', 'data:text/html,<p>x']) {
        await page.goto(url);
        assert.equal(await page.eval(() => matchMedia('(prefers-color-scheme: dark)').matches), dark, `${dark ? 'dark' : 'light'} at ${url}`);
      }
    } finally {
      await page.close();
    }
  }
});

test('a step the page never answers fails with a message instead of waiting forever', skip, async () => {
  const page = await openBrowser();
  try {
    await page.goto('about:blank');
    page.browser.stepMs = 1500;
    const start = Date.now();
    await assert.rejects(page.eval(() => new Promise(() => {})), /Runtime\.evaluate: not done within 1\.5 seconds/);
    assert.ok(Date.now() - start < 10000);
  } finally {
    await page.close();
  }
});

test('Chrome dies in the middle of a step: that step fails at once', skip, async () => {
  const page = await openBrowser();
  try {
    await page.goto('about:blank');
    const pending = page.eval(() => new Promise(() => {}));
    process.kill(-page.browser.proc.pid, 'SIGKILL');
    await assert.rejects(pending, /Chrome closed/);
  } finally {
    await page.close();
  }
});

// A test file whose process ends with a Chrome still open: what happens when
// --test-timeout stops a test before its `finally` and --test-force-exit
// then ends the process, or when the run is interrupted.
for (const [how, end] of [
  ['the process is forced to end (--test-force-exit)', (child) => child.stdin.end('exit\n')],
  ['the process is stopped with SIGTERM', (child) => child.kill('SIGTERM')],
  ['the process is stopped with SIGINT', (child) => child.kill('SIGINT')],
]) {
  test(`a Chrome not yet closed stops too when ${how}`, skip, async () => {
    const script = `
      import { openBrowser } from ${JSON.stringify(helper)};
      const page = await openBrowser();
      await page.goto('about:blank');
      console.log(JSON.stringify({ pid: page.browser.proc.pid, profile: page.browser.profile }));
      process.stdin.on('data', () => process.exit(0));
      // This test's own process gone (stopped by its time limit): go with it.
      process.stdin.on('end', () => process.exit(0));
      setInterval(() => {}, 1000);
    `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['pipe', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    const gone = new Promise((r) => child.once('exit', r));
    for (let i = 0; i < 300 && !out.includes('\n'); i++) await wait(100);
    const { pid, profile } = JSON.parse(out);
    assert.ok(groupAlive(pid), 'Chrome runs before the process ends');
    end(child);
    await gone;
    for (let i = 0; i < 50 && groupAlive(pid); i++) await wait(100);
    const alive = groupAlive(pid);
    if (alive) process.kill(-pid, 'SIGKILL');
    assert.equal(alive, false, 'no Chrome process is left');
    assert.equal(fs.existsSync(profile), false, 'the profile is removed');
  });
}
