// The Chrome helper itself: closing never fails a test or leaves anything
// running, whatever state Chrome or its profile is in, and a page that stops
// answering fails the step instead of waiting forever.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openBrowser, chromePath } from './peramban.mjs';
import { tempRoot, startViewer } from './bantu.mjs';

const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), 'peramban.mjs');
const skip = { skip: !chromePath() && 'Chrome tidak ada' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// True while any process of Chrome's group (the main one or a helper) runs.
const groupAlive = (pid) => {
  try { process.kill(-pid, 0); return true; } catch { return false; }
};
// Chrome's helpers at the moment, so the test knows there were some to stop.
const helpers = (pid) => {
  try { return execFileSync('pgrep', ['-g', String(pid)]).toString().trim().split('\n').filter((p) => p && p !== String(pid)); } catch { return []; }
};

test('menutup: Chrome dan semua pembantunya berhenti, profil terhapus, menutup dua kali aman', skip, async () => {
  const page = await openBrowser();
  const { proc, profile } = page.browser;
  await page.goto('about:blank');
  assert.ok(helpers(proc.pid).length > 0, 'Chrome punya proses pembantu');
  await page.close();
  assert.equal(groupAlive(proc.pid), false, 'tidak ada proses Chrome yang tersisa');
  assert.equal(fs.existsSync(profile), false, 'profil terhapus');
  assert.equal(page.browser.leftover, null);
  await page.close();
});

test('profil yang tidak bisa dihapus: menutup tetap berhasil, Chrome tetap berhenti, server viewer tertutup', skip, async () => {
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
    assert.equal(v.server.listening, false, 'server viewer tertutup');
    assert.equal(groupAlive(proc.pid), false, 'tidak ada proses Chrome yang tersisa');
    assert.equal(page.browser.leftover?.code, 'ENOTEMPTY', 'kegagalan dicatat, bukan dilempar');
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

test('tema terang dan gelap sesuai permintaan, apa pun tampilan mesinnya', skip, async () => {
  for (const dark of [false, true]) {
    const page = await openBrowser({ dark });
    try {
      for (const url of ['about:blank', 'data:text/html,<p>x']) {
        await page.goto(url);
        assert.equal(await page.eval(() => matchMedia('(prefers-color-scheme: dark)').matches), dark, `${dark ? 'gelap' : 'terang'} di ${url}`);
      }
    } finally {
      await page.close();
    }
  }
});

test('langkah yang tidak pernah dijawab halaman gagal dengan pesan, tidak menunggu selamanya', skip, async () => {
  const page = await openBrowser();
  try {
    await page.goto('about:blank');
    page.browser.stepMs = 1500;
    const start = Date.now();
    await assert.rejects(page.eval(() => new Promise(() => {})), /Runtime\.evaluate: tidak selesai dalam 1\.5 detik/);
    assert.ok(Date.now() - start < 10000);
  } finally {
    await page.close();
  }
});

test('Chrome mati di tengah langkah: langkah itu langsung gagal', skip, async () => {
  const page = await openBrowser();
  try {
    await page.goto('about:blank');
    const pending = page.eval(() => new Promise(() => {}));
    process.kill(-page.browser.proc.pid, 'SIGKILL');
    await assert.rejects(pending, /Chrome tertutup/);
  } finally {
    await page.close();
  }
});

// A test file whose process ends with a Chrome still open: what happens when
// --test-timeout stops a test before its `finally` and --test-force-exit
// then ends the process, or when the run is interrupted.
for (const [how, end] of [
  ['proses selesai paksa (--test-force-exit)', (child) => child.stdin.end('exit\n')],
  ['proses dihentikan dengan SIGTERM', (child) => child.kill('SIGTERM')],
  ['proses dihentikan dengan SIGINT', (child) => child.kill('SIGINT')],
]) {
  test(`Chrome yang belum ditutup ikut berhenti saat ${how}`, skip, async () => {
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
    assert.ok(groupAlive(pid), 'Chrome berjalan sebelum proses berakhir');
    end(child);
    await gone;
    for (let i = 0; i < 50 && groupAlive(pid); i++) await wait(100);
    const alive = groupAlive(pid);
    if (alive) process.kill(-pid, 'SIGKILL');
    assert.equal(alive, false, 'tidak ada proses Chrome yang tersisa');
    assert.equal(fs.existsSync(profile), false, 'profil terhapus');
  });
}
