// Tests from several worktrees of one repository do not get in each other's
// way: runs take turns unless the board says they may overlap, every worktree
// gets its own slot number and its ticket ID, the board's setup and teardown
// commands run whenever worktree.sh creates or removes a worktree, and test
// data kept outside the repo survives another ticket's teardown.
//
// Every test builds a throwaway git repository with a board and runs the real
// scripts against it, the way the foreman and the workers run them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const worktreeSh = path.join(scripts, 'worktree.sh');
const testRun = path.join(scripts, 'test-run.sh');

const A = '261016200001';
const B = '261016200002';

const gitEnv = {
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
  KERJAAN_LOCK_POLL: '0.2',
};

function ticket(title) {
  return `---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-16 20:00:00
updated: 2026-10-16 20:00:00
related: []
blocked_by: []
---

## Background
Sesuatu.

## Request
${title}.

## Done when
- [ ] Sesuatu bisa dicoba.

## History
- 2026-10-16 20:00:00 in_progress

## Notes
(none yet)
`;
}

function settings({ testCommand = '', parallel, setup = '', teardown = '' } = {}) {
  return `---
language: Bahasa Indonesia
test_command: ${testCommand}
long_lived_branches: []
owner_explanation: off
explanation_translation: false
${parallel === undefined ? '' : `parallel_tests: ${parallel}\n`}worktree_setup: ${setup}
worktree_teardown: ${teardown}
---
`;
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

// A repository with tickets A and B in in_progress. `outside` is a folder
// beside it for logs, helpers and test data that live outside the repo.
function repo(opts = {}) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-wt-')));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'luar');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  fs.writeFileSync(path.join(k, 'settings.md'), settings(opts));
  fs.writeFileSync(path.join(k, 'in_progress', `${A} Tiket pertama.md`), ticket('Tiket pertama'));
  fs.writeFileSync(path.join(k, 'in_progress', `${B} Tiket kedua.md`), ticket('Tiket kedua'));
  fs.writeFileSync(path.join(root, 'kode.txt'), 'kode\n');
  fs.writeFileSync(path.join(root, '.gitignore'), '.env\n.setup-ran\n');
  fs.writeFileSync(path.join(root, '.env'), 'RAHASIA=1\n');
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return { base, root, outside, k };
}

function setSettings(r, opts) {
  fs.writeFileSync(path.join(r.k, 'settings.md'), settings(opts));
}

function run(script, cwd, args, env = {}) {
  const r = spawnSync('bash', [script, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv, ...env }, timeout: 60000,
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function runAsync(script, cwd, args, env = {}) {
  return new Promise((resolve) => {
    const p = spawn('bash', [script, ...args], { cwd, env: { ...process.env, ...gitEnv, ...env } });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

function add(r, id, env) {
  const p = path.join(r.base, `wt-${id}`);
  const res = run(worktreeSh, r.root, ['add', id, p], env);
  return { ...res, path: p };
}

const notes = (r, id) => {
  for (const s of fs.readdirSync(r.k)) {
    const dir = path.join(r.k, s);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(id)) return fs.readFileSync(path.join(dir, f), 'utf8').split('## Notes')[1];
    }
  }
  throw new Error(`no ticket ${id}`);
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function until(check, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (check()) return;
    await sleep(50);
  }
  throw new Error('timed out waiting');
}

// The test command used throughout: records when it ran and what it was
// told, then either sleeps (to be overlapped) or waits for the other ticket to
// start too (which only succeeds when runs really overlap).
function helper(r) {
  const file = path.join(r.outside, 'uji.cjs');
  fs.writeFileSync(file, `
const fs = require('fs');
const path = require('path');
const log = ${JSON.stringify(path.join(r.outside, 'log'))};
const e = process.env;
const say = (what) => fs.appendFileSync(log, JSON.stringify({ what, t: Date.now(), ticket: e.KERJAAN_TICKET, slot: e.KERJAAN_SLOT, worktree: e.KERJAAN_WORKTREE, main: e.KERJAAN_MAIN_TREE, cwd: process.cwd() }) + '\\n');
// Sleeps without spinning, so these runs do not slow the rest of the suite.
const nap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
say('start');
fs.writeFileSync(path.join(${JSON.stringify(r.outside)}, 'started-' + e.KERJAAN_TICKET), '');
const end = Date.now() + Number(e.UJI_MS || 1500);
if (e.UJI_TOGETHER) {
  const others = e.UJI_TOGETHER.split(',');
  while (!others.every((t) => fs.existsSync(path.join(${JSON.stringify(r.outside)}, 'started-' + t)))) {
    if (Date.now() > end) { say('alone'); process.exit(1); }
    nap(20);
  }
} else {
  nap(Math.max(0, end - Date.now()));
}
say('end');
`);
  return `node ${JSON.stringify(file)}`;
}

const logOf = (r) => fs.readFileSync(path.join(r.outside, 'log'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

// ---------------------------------------------------------------------------

test('tanpa pengaturan, uji dari dua worktree bergiliran dan yang kedua tercatat menunggu', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r) });
  const a = add(r, A);
  const b = add(r, B);
  assert.equal(a.code, 0, a.err);
  assert.equal(b.code, 0, b.err);

  const first = runAsync(testRun, a.path, [A]);
  await until(() => fs.existsSync(path.join(r.outside, `started-${A}`)));
  const second = runAsync(testRun, b.path, [B]);
  const [ra, rb] = await Promise.all([first, second]);
  assert.equal(ra.code, 0, ra.err);
  assert.equal(rb.code, 0, rb.err);

  const log = logOf(r);
  const endA = log.find((l) => l.ticket === A && l.what === 'end').t;
  const startB = log.find((l) => l.ticket === B && l.what === 'start').t;
  assert.ok(startB >= endA, `B started at ${startB}, before A ended at ${endA}`);

  assert.match(rb.err, /Waiting for the tests lock, held by ticket 261016200001/);
  assert.match(notes(r, B), /test run — .* exited 0 .* Waited \dm\d+s for the test lock first, held by another run \(ticket 261016200001, slot 1, /);
  assert.doesNotMatch(notes(r, A), /Waited/);

  // A run whose fingerprint is recorded with the wait sentence still counts.
  const check = run(testRun, b.path, ['--check', B]);
  assert.equal(check.code, 0, check.out + check.err);
});

test('uji di main tree dan di worktree juga bergiliran', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r) });
  const b = add(r, B);
  const first = runAsync(testRun, r.root, [A]);
  await until(() => fs.existsSync(path.join(r.outside, `started-${A}`)));
  const rb = await runAsync(testRun, b.path, [B]);
  assert.equal((await first).code, 0);
  assert.equal(rb.code, 0, rb.err);
  assert.match(notes(r, B), /Waited .* \(ticket 261016200001, slot 0, /);
});

test('parallel_tests: true membuat uji dari dua worktree berjalan berbarengan', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r), parallel: 'true' });
  const a = add(r, A);
  const b = add(r, B);
  const env = { UJI_TOGETHER: `${A},${B}`, UJI_MS: '8000' };
  const [ra, rb] = await Promise.all([
    runAsync(testRun, a.path, [A], env),
    runAsync(testRun, b.path, [B], env),
  ]);
  // Each run only ends well once it has seen the other one running.
  assert.equal(ra.code, 0, ra.err);
  assert.equal(rb.code, 0, rb.err);
  assert.doesNotMatch(notes(r, A) + notes(r, B), /Waited/);
});

test('parallel_tests: false tetap bergiliran', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r), parallel: 'false' });
  const a = add(r, A);
  const b = add(r, B);
  const first = runAsync(testRun, a.path, [A]);
  await until(() => fs.existsSync(path.join(r.outside, `started-${A}`)));
  const rb = await runAsync(testRun, b.path, [B]);
  assert.equal((await first).code, 0);
  assert.equal(rb.code, 0);
  assert.match(notes(r, B), /Waited/);
});

test('uji membaca nomor slot dan ID tiketnya; dua worktree tidak pernah bernomor sama', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r), parallel: 'true' });
  const a = add(r, A);
  const b = add(r, B);
  assert.equal(run(testRun, a.path, [A], { UJI_MS: '1' }).code, 0);
  assert.equal(run(testRun, b.path, [B], { UJI_MS: '1' }).code, 0);
  assert.equal(run(testRun, r.root, [A], { UJI_MS: '1' }).code, 0);
  const starts = logOf(r).filter((l) => l.what === 'start');
  assert.deepEqual(starts.map((l) => [l.ticket, l.slot, l.worktree, l.main]), [
    [A, '1', a.path, r.root],
    [B, '2', b.path, r.root],
    [A, '0', r.root, r.root],
  ]);
  assert.equal(starts[0].cwd, a.path);

  // The same number again on later asks, from anywhere inside the worktree.
  fs.mkdirSync(path.join(b.path, 'sub'));
  assert.equal(run(worktreeSh, path.join(b.path, 'sub'), ['slot']).out.trim(), '2');
  assert.equal(run(worktreeSh, r.root, ['slot']).out.trim(), '0');
});

test('worktree yang dibuat bersamaan dan yang dibuat dengan tangan tetap mendapat nomor berbeda', async () => {
  const r = repo();
  const ids = ['261016200011', '261016200012', '261016200013', '261016200014', '261016200015'];
  for (const id of ids) {
    fs.writeFileSync(path.join(r.k, 'in_progress', `${id} Tiket ${id}.md`), ticket(id));
  }
  setSettings(r, { setup: 'echo "$KERJAAN_SLOT" > .setup-ran' });
  const made = await Promise.all(ids.map((id) =>
    runAsync(worktreeSh, r.root, ['add', id, path.join(r.base, `wt-${id}`)])));
  made.forEach((m) => assert.equal(m.code, 0, m.err));
  const slots = ids.map((id) => fs.readFileSync(path.join(r.base, `wt-${id}`, '.setup-ran'), 'utf8').trim());
  assert.deepEqual([...slots].sort(), ['1', '2', '3', '4', '5']);

  // Worktrees made without worktree.sh get a number when first asked, and
  // several asking at the same moment still get different ones.
  const hands = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  for (const h of hands) git(r.root, 'worktree', 'add', '-q', '-b', h, path.join(r.base, h));
  const asked = await Promise.all(hands.map((h) => runAsync(worktreeSh, path.join(r.base, h), ['slot'])));
  assert.deepEqual(asked.map((a) => a.out.trim()).sort(), ['10', '11', '6', '7', '8', '9']);
  for (const h of hands) git(r.root, 'worktree', 'remove', path.join(r.base, h));

  // A worktree made by hand gets the lowest free number.
  git(r.root, 'worktree', 'add', '-q', '-b', 'tangan', path.join(r.base, 'tangan'));
  const hand = run(worktreeSh, path.join(r.base, 'tangan'), ['slot']).out.trim();
  assert.equal(hand, '6');

  // A removed worktree frees its number; the live ones keep theirs.
  assert.equal(run(worktreeSh, r.root, ['remove', ids[2]]).code, 0);
  const again = run(worktreeSh, r.root, ['add', ids[2], path.join(r.base, 'lagi')]);
  assert.equal(again.code, 0, again.err);
  const now = [...ids.map((id, i) => (i === 2 ? path.join(r.base, 'lagi') : path.join(r.base, `wt-${id}`))), path.join(r.base, 'tangan')]
    .map((p) => run(worktreeSh, p, ['slot']).out.trim());
  assert.equal(new Set(now).size, now.length, `slots ${now}`);
});

test('perintah persiapan berjalan setiap kali worktree dibuat, di dalam worktree itu', () => {
  const r = repo({ setup: 'cp "$KERJAAN_MAIN_TREE/.env" .env && echo "$KERJAAN_TICKET $KERJAAN_SLOT $PWD" > .setup-ran' });
  const a = add(r, A);
  const b = add(r, B);
  assert.equal(a.code, 0, a.err);
  assert.equal(b.code, 0, b.err);
  assert.equal(a.out.trim(), a.path);
  assert.equal(fs.readFileSync(path.join(a.path, '.setup-ran'), 'utf8').trim(), `${A} 1 ${a.path}`);
  assert.equal(fs.readFileSync(path.join(b.path, '.setup-ran'), 'utf8').trim(), `${B} 2 ${b.path}`);
  assert.equal(fs.readFileSync(path.join(b.path, '.env'), 'utf8'), 'RAHASIA=1\n');
  // The board stays out of the worktree's checkout.
  assert.equal(fs.existsSync(path.join(a.path, '.kerjaan')), false);
  assert.match(git(r.root, 'worktree', 'list', '--porcelain'), new RegExp(`branch refs/heads/tiket-${A}`));
});

test('persiapan yang gagal membuat worktree tidak dipakai: dihapus lagi, pembersihan ikut jalan', () => {
  const r = repo();
  const log = path.join(r.outside, 'teardown');
  setSettings(r, { setup: 'touch .setup-ran; exit 3', teardown: `echo "$KERJAAN_TICKET" >> ${JSON.stringify(log)}` });
  const a = add(r, A);
  assert.equal(a.code, 1);
  assert.match(a.err, /worktree_setup failed/);
  assert.match(a.err, /FAILED: no worktree for 261016200001/);
  assert.equal(a.out, '');
  assert.equal(fs.existsSync(a.path), false);
  assert.doesNotMatch(git(r.root, 'worktree', 'list', '--porcelain'), new RegExp(`wt-${A}`));
  assert.equal(git(r.root, 'branch', '--list', `tiket-${A}`), '');
  assert.equal(fs.readFileSync(log, 'utf8').trim(), A);
});

test('perintah pembersihan berjalan setiap kali worktree dihapus, dengan tiket dan slot worktree itu', () => {
  const r = repo();
  const log = path.join(r.outside, 'teardown');
  setSettings(r, { teardown: `echo "$KERJAAN_TICKET $KERJAAN_SLOT $PWD" >> ${JSON.stringify(log)}` });
  const a = add(r, A);
  const b = add(r, B);
  // A caller's own environment does not decide whose data is removed.
  const ra = run(worktreeSh, r.root, ['remove', A], { KERJAAN_TICKET: B, KERJAAN_SLOT: '9' });
  assert.equal(ra.code, 0, ra.err);
  const rb = run(worktreeSh, r.root, ['remove', b.path], { KERJAAN_TICKET: A, KERJAAN_SLOT: '9' });
  assert.equal(rb.code, 0, rb.err);
  assert.deepEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), [`${A} 1 ${a.path}`, `${B} 2 ${b.path}`]);
  assert.equal(fs.existsSync(a.path), false);
  assert.equal(fs.existsSync(b.path), false);
  // The branch is a decision about merging, not the script's.
  assert.notEqual(git(r.root, 'branch', '--list', `tiket-${A}`), '');
});

test('pembersihan yang gagal, atau worktree yang belum bersih, menolak penghapusan', () => {
  const r = repo();
  const log = path.join(r.outside, 'teardown');
  setSettings(r, { teardown: `echo ran >> ${JSON.stringify(log)}; exit 4` });
  const a = add(r, A);
  const failed = run(worktreeSh, r.root, ['remove', A]);
  assert.equal(failed.code, 1);
  assert.match(failed.err, /REFUSED: worktree_teardown failed/);
  assert.equal(fs.existsSync(a.path), true);

  setSettings(r, { teardown: `echo ran >> ${JSON.stringify(log)}` });
  fs.writeFileSync(path.join(a.path, 'kode.txt'), 'diubah\n');
  const dirty = run(worktreeSh, r.root, ['remove', A]);
  assert.equal(dirty.code, 1);
  assert.match(dirty.err, /REFUSED: .* not committed/);
  assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1, 'teardown ran on a dirty worktree');
  assert.equal(fs.existsSync(a.path), true);
});

test('worktree.sh menolak berjalan dari worktree tertaut', () => {
  const r = repo();
  const a = add(r, A);
  const res = run(worktreeSh, a.path, ['add', B, path.join(r.base, 'x')]);
  assert.equal(res.code, 1);
  assert.match(res.err, /linked git worktree/);
});

// Test data outside the repo, owned per ticket: each ticket's setup copies the
// shared seed (read only) into a folder named after the ticket, its tests use
// only that, and its teardown removes only that.
for (const order of [[A, B], [B, A]]) {
  test(`data uji di luar repo: tiket ${order[0].slice(-1)} lalu ${order[1].slice(-1)}, pembersihan pertama sebelum uji kedua`, () => {
    const r = repo();
    const data = path.join(r.outside, 'data');
    fs.mkdirSync(path.join(data, 'bersama'), { recursive: true });
    fs.writeFileSync(path.join(data, 'bersama', 'benih.txt'), 'benih\n');
    fs.chmodSync(path.join(data, 'bersama', 'benih.txt'), 0o444);
    const d = JSON.stringify(data);
    setSettings(r, {
      setup: `mkdir -p ${d}/tiket-$KERJAAN_TICKET && cp ${d}/bersama/benih.txt ${d}/tiket-$KERJAAN_TICKET/db.txt && chmod u+w ${d}/tiket-$KERJAAN_TICKET/db.txt`,
      teardown: `rm -rf ${d}/tiket-$KERJAAN_TICKET`,
      testCommand: `echo uji >> ${d}/tiket-$KERJAAN_TICKET/db.txt && grep -q benih ${d}/bersama/benih.txt`,
    });
    const trees = Object.fromEntries([A, B].map((id) => [id, add(r, id)]));
    for (const id of [A, B]) assert.equal(trees[id].code, 0, trees[id].err);

    const [first, second] = order;
    assert.equal(run(testRun, trees[first].path, [first]).code, 0);
    assert.equal(run(worktreeSh, r.root, ['remove', first]).code, 0);
    assert.equal(fs.existsSync(path.join(data, `tiket-${first}`)), false);
    const res = run(testRun, trees[second].path, [second]);
    assert.equal(res.code, 0, res.err);
    assert.equal(fs.readFileSync(path.join(data, `tiket-${second}`, 'db.txt'), 'utf8'), 'benih\nuji\n');
    assert.equal(run(worktreeSh, r.root, ['remove', second]).code, 0);
    assert.deepEqual(fs.readdirSync(data), ['bersama']);
  });
}

test('kunci yang ditinggal proses yang sudah mati diambil alih', () => {
  const r = repo({ testCommand: 'true' });
  const dead = spawnSync('bash', ['-c', 'echo $$']).stdout.toString().trim();
  const lock = path.join(r.root, '.git', 'kerjaan-locks', 'tests.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${dead}\tticket 261016209999, slot 3, /hilang\n`);
  const res = run(testRun, r.root, [A]);
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, new RegExp(`left by process ${dead}, which no longer runs`));
  assert.equal(fs.existsSync(lock), false, 'the lock is released after the run');
});

// The races above are real but narrow, so the locks behind them are also
// checked directly: while another live process holds the lock, the step waits.
async function heldLock(r, name, start) {
  const lock = path.join(r.root, '.git', 'kerjaan-locks', `${name}.lock`);
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${process.pid}\tuji yang memegang kunci\n`);
  let done = false;
  const running = start().then((res) => { done = true; return res; });
  await sleep(1200);
  const waitedWhileHeld = !done;
  fs.rmSync(lock, { recursive: true });
  return { waitedWhileHeld, res: await running };
}

test('pemberian nomor slot menunggu kunci slots', async () => {
  const r = repo();
  git(r.root, 'worktree', 'add', '-q', '-b', 'tangan', path.join(r.base, 'tangan'));
  const { waitedWhileHeld, res } = await heldLock(r, 'slots',
    () => runAsync(worktreeSh, path.join(r.base, 'tangan'), ['slot']));
  assert.equal(waitedWhileHeld, true, 'slot was handed out while the lock was held');
  assert.equal(res.out.trim(), '1', res.err);
});

test('langkah git pembuatan dan penghapusan worktree menunggu kunci worktrees', async () => {
  const r = repo();
  const p = path.join(r.base, `wt-${A}`);
  const made = await heldLock(r, 'worktrees', () => runAsync(worktreeSh, r.root, ['add', A, p]));
  assert.equal(made.waitedWhileHeld, true, 'worktree created while the lock was held');
  assert.equal(made.res.code, 0, made.res.err);
  const gone = await heldLock(r, 'worktrees', () => runAsync(worktreeSh, r.root, ['remove', A]));
  assert.equal(gone.waitedWhileHeld, true, 'worktree removed while the lock was held');
  assert.equal(gone.res.code, 0, gone.res.err);
  assert.equal(fs.existsSync(p), false);
});
