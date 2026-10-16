// Board changes made by several workers at once never overwrite each other.
// Every script that rewrites a ticket or order.md does so under the `board`
// lock (lib.sh); a wait for any lock that runs past its limit ends with a
// message naming the holder, and both limits are settings with documented
// defaults.
//
// Every test builds a throwaway git repository with a board and runs the real
// scripts against it, the way the foreman and the workers run them. The races
// are real but narrow, so beside the tests that really start things together,
// each place the lock is taken is also checked directly: while another live
// process holds the lock, nothing is written.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const skill = path.join(here, '..', 'skills', 'kerjaan');
const scripts = path.join(skill, 'scripts');
const update = path.join(scripts, 'update-ticket.sh');
const testRun = path.join(scripts, 'test-run.sh');
const queue = path.join(scripts, 'queue.sh');
const worktreeSh = path.join(scripts, 'worktree.sh');
const lib = path.join(scripts, 'lib.sh');

const X = '261016700001';
const Y = '261016700002';
const Z = '261016700003';

const gitEnv = {
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function ticket(status) {
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
Sesuatu.

## Done when
- [ ] Butir

## History
- 2026-10-16 20:00:00 ${status}

## Notes
(none yet)
`;
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

const ORDER = `**Grup satu: ${X} dan ${Y} berjalan berdampingan.**
- ${X} Tiket x
- ${Y} Tiket y

**Grup dua.**
- ${Z} Tiket z
`;

// X, Y and Z in todo, listed in order.md; `extra` lines go into settings.md.
function repo({ testCommand = '', extra = '', status = 'todo' } = {}) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-kunci-')));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'luar');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  fs.writeFileSync(path.join(k, 'settings.md'), `---
language: Bahasa Indonesia
test_command: ${testCommand}
long_lived_branches: []
owner_explanation: off
explanation_translation: false
${extra}---
`);
  fs.writeFileSync(path.join(k, status, `${X} Tiket x.md`), ticket(status));
  fs.writeFileSync(path.join(k, status, `${Y} Tiket y.md`), ticket(status));
  fs.writeFileSync(path.join(k, 'todo', `${Z} Tiket z.md`), ticket('todo'));
  if (status === 'todo') fs.writeFileSync(path.join(k, 'order.md'), ORDER);
  fs.writeFileSync(path.join(root, 'kode.txt'), 'kode\n');
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return { base, root, outside, k };
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

const fileOf = (r, id) => {
  for (const s of fs.readdirSync(r.k)) {
    const dir = path.join(r.k, s);
    if (!fs.statSync(dir).isDirectory()) continue;
    const f = fs.readdirSync(dir).find((n) => n.startsWith(id));
    if (f) return path.join(dir, f);
  }
  throw new Error(`no ticket ${id}`);
};
const statusOf = (r, id) => path.basename(path.dirname(fileOf(r, id)));
const read = (r, id) => fs.readFileSync(fileOf(r, id), 'utf8');
const order = (r) => fs.readFileSync(path.join(r.k, 'order.md'), 'utf8');

const lockDir = (r, name) => path.join(r.root, '.git', 'kerjaan-locks', `${name}.lock`);

// Holds <name> the way another live process would — this test's own process,
// so the PID check finds it alive — until the returned function is called.
function hold(r, name, who = 'uji yang memegang kunci') {
  const lock = lockDir(r, name);
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${process.pid}\t${who}\n`);
  return () => fs.rmSync(lock, { recursive: true, force: true });
}

// Starts a step while <name> is held, looks after `ms` whether it finished and
// what `look` sees, then lets the lock go and waits for the step.
async function whileHeld(r, name, start, look, ms = 1500) {
  const release = hold(r, name);
  let done = false;
  const running = start().then((res) => { done = true; return res; });
  await sleep(ms);
  const seen = { done, ...look() };
  release();
  return { seen, res: await running };
}

// ---------------------------------------------------------------------------
// Moves started at the same moment

test('dua tiket dari grup yang sama dimulai bersamaan berulang kali, dan keduanya selalu hilang dari order.md', async () => {
  for (let round = 1; round <= 8; round++) {
    const r = repo();
    const both = await Promise.all([
      runAsync(update, r.root, [X, '--status', 'in_progress']),
      runAsync(update, r.root, [Y, '--status', 'in_progress']),
    ]);
    for (const res of both) assert.equal(res.code, 0, res.err);
    assert.equal(statusOf(r, X), 'in_progress');
    assert.equal(statusOf(r, Y), 'in_progress');
    assert.equal(order(r), `**Grup dua.**\n- ${Z} Tiket z\n`, `round ${round}`);
    for (const id of [X, Y]) assert.match(read(r, id), /\n- [\d-]+ [\d:]+ (\S+ )?in_progress\n/);
  }
});

test('pindah status menunggu kunci papan: selama dipegang, tiket dan order.md belum berubah', async () => {
  const r = repo();
  const before = { ticket: read(r, X), order: order(r) };
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(update, r.root, [X, '--status', 'in_progress']),
    () => ({ status: statusOf(r, X), ticket: read(r, X), order: order(r) }));
  assert.deepEqual(seen, { done: false, status: 'todo', ...before });
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the board lock, held by uji yang memegang kunci/);
  assert.equal(statusOf(r, X), 'in_progress');
  assert.doesNotMatch(order(r), new RegExp(`^- ${X} `, 'm'));
});

test('mengganti judul dan menyegarkan updated juga menunggu kunci papan', async () => {
  for (const args of [[X, '--title', 'Judul baru'], [X]]) {
    const r = repo();
    const before = read(r, X);
    const { seen, res } = await whileHeld(r, 'board',
      () => runAsync(update, r.root, args),
      () => ({ ticket: read(r, X), order: order(r) }));
    assert.deepEqual(seen, { done: false, ticket: before, order: ORDER }, args.join(' '));
    assert.equal(res.code, 0, res.err);
  }
});

for (const [cmd, args, record] of [
  ['estimate', [X, 'kode.txt'], /files estimated to change: `kode.txt`/],
  ['ask', [X, 'Pertanyaan?'], /open question: Pertanyaan\?/],
]) {
  test(`queue.sh ${cmd} menunggu kunci papan sebelum menulis tiket`, async () => {
    const r = repo();
    const { seen, res } = await whileHeld(r, 'board',
      () => runAsync(queue, r.root, [cmd, ...args]),
      () => ({ written: record.test(read(r, X)) }));
    assert.deepEqual(seen, { done: false, written: false });
    assert.equal(res.code, 0, res.err);
    assert.match(read(r, X), record);
  });
}

test('queue.sh answer menunggu kunci papan sebelum menulis tiket', async () => {
  const r = repo();
  assert.equal(run(queue, r.root, ['ask', X, 'Pertanyaan?']).code, 0);
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(queue, r.root, ['answer', X, '1', 'Jawaban']),
    () => ({ written: /answer, .*: Jawaban/.test(read(r, X)) }));
  assert.deepEqual(seen, { done: false, written: false });
  assert.equal(res.code, 0, res.err);
  assert.match(read(r, X), /answered question: Pertanyaan\?\n {2}answer, [\d-]+ [\d:]+: Jawaban/);
});

// ---------------------------------------------------------------------------
// Test results recorded from worktrees

// A test command that finishes only once both tickets' runs have started, so
// the two runs record their results at the same moment.
function barrier(r) {
  const o = JSON.stringify(r.outside);
  return `touch ${o}/mulai-$KERJAAN_TICKET; while [ ! -e ${o}/mulai-${X} ] || [ ! -e ${o}/mulai-${Y} ]; do sleep 0.05; done`;
}

test('hasil uji dua worktree yang selesai bersamaan sama-sama tercatat di tiketnya masing-masing', async () => {
  const r = repo({ status: 'in_progress', extra: 'parallel_tests: true\n' });
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8').replace('test_command: ', `test_command: ${barrier(r)}`));
  const wx = path.join(r.base, 'wt-x');
  const wy = path.join(r.base, 'wt-y');
  assert.equal(run(worktreeSh, r.root, ['add', X, wx]).code, 0);
  assert.equal(run(worktreeSh, r.root, ['add', Y, wy]).code, 0);
  for (let round = 1; round <= 3; round++) {
    for (const id of [X, Y]) fs.rmSync(path.join(r.outside, `mulai-${id}`), { force: true });
    const both = await Promise.all([runAsync(testRun, wx, [X]), runAsync(testRun, wy, [Y])]);
    for (const res of both) assert.equal(res.code, 0, res.err);
    for (const id of [X, Y]) {
      const runs = read(r, id).split('\n').filter((l) => l.includes(': test run — '));
      assert.equal(runs.length, round, `${id} after round ${round}:\n${read(r, id)}`);
    }
  }
});

test('hasil uji dari worktree tetap tercatat saat tiket yang sama dipindah dari main tree pada saat itu', async () => {
  const r = repo({ status: 'in_progress', extra: 'parallel_tests: true\n' });
  const o = JSON.stringify(r.outside);
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8')
      .replace('test_command: ', `test_command: touch ${o}/mulai; while [ ! -e ${o}/lanjut ]; do sleep 0.05; done`));
  const wx = path.join(r.base, 'wt-x');
  assert.equal(run(worktreeSh, r.root, ['add', X, wx]).code, 0);
  const t0 = Date.now();
  const testing = runAsync(testRun, wx, [X]);
  while (!fs.existsSync(path.join(r.outside, 'mulai'))) {
    assert.ok(Date.now() - t0 < 15000, 'the test run never started');
    await sleep(20);
  }
  // The run finishes while the foreman keeps refreshing the same ticket.
  fs.writeFileSync(path.join(r.outside, 'lanjut'), '');
  const refreshes = [];
  for (let i = 0; i < 6; i++) refreshes.push(runAsync(update, r.root, [X]));
  const [res, ...others] = await Promise.all([testing, ...refreshes]);
  assert.equal(res.code, 0, res.err);
  for (const o2 of others) assert.equal(o2.code, 0, o2.err);
  assert.match(read(r, X), /: test run — .* exited 0 /);
});

test('hasil uji menunggu kunci papan sebelum ditulis ke tiket', async () => {
  const r = repo({ status: 'in_progress', testCommand: 'true' });
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(testRun, r.root, [X]),
    () => ({ written: /test run — /.test(read(r, X)) }), 2500);
  assert.deepEqual(seen, { done: false, written: false });
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the board lock, held by uji yang memegang kunci/);
  assert.match(read(r, X), /: test run — `true` exited 0 /);
  assert.equal(fs.existsSync(lockDir(r, 'board')), false, 'the board lock is released after the run');
});

// test-run.sh holds the board lock and runs update-ticket.sh, which takes it
// too: the child shares its parent's hold rather than waiting for itself.
test('update-ticket.sh yang dijalankan test-run.sh tidak menunggu kunci yang dipegang test-run.sh sendiri', () => {
  const r = repo({ status: 'in_progress', testCommand: 'true', extra: 'lock_timeout: 2\n' });
  const t0 = Date.now();
  const res = run(testRun, r.root, [X]);
  assert.equal(res.code, 0, res.err);
  assert.ok(Date.now() - t0 < 2000 + 1500, `took ${Date.now() - t0}ms`);
  assert.doesNotMatch(res.err, /Waiting for the board lock/);
  assert.match(read(r, X), /\nupdated: 2026-10-1\d \d\d:\d\d:\d\d\n/);
  assert.doesNotMatch(read(r, X), /\nupdated: 2026-10-16 20:00:00\n/);
});

// ---------------------------------------------------------------------------
// Waits that run out

test('kunci papan yang ditunggu melewati lock_timeout: berhenti dengan pesan yang menyebut pemegangnya, tanpa mengubah apa pun', () => {
  const r = repo({ extra: 'lock_timeout: 1\n' });
  const before = { ticket: read(r, X), order: order(r) };
  const release = hold(r, 'board', 'update-ticket.sh 261016709999 --status review, process 4242');
  try {
    const t0 = Date.now();
    const res = run(update, r.root, [X, '--status', 'in_progress']);
    assert.ok(Date.now() - t0 < 10000, `took ${Date.now() - t0}ms`);
    assert.equal(res.code, 1, res.err);
    assert.match(res.err, /Gave up waiting for the board lock after 1s\. It is held by update-ticket\.sh 261016709999 --status review, process 4242/);
    assert.match(res.err, new RegExp(`\\(process ${process.pid}, still running\\)`));
    assert.match(res.err, /lock_timeout in .*settings\.md/);
    assert.equal(statusOf(r, X), 'todo');
    assert.deepEqual({ ticket: read(r, X), order: order(r) }, before);
    assert.equal(fs.existsSync(lockDir(r, 'board')), true, 'the waiter that gave up removed the holder\'s lock');
  } finally {
    release();
  }
});

test('kunci uji yang ditunggu melewati test_lock_timeout: berhenti dengan pesan yang menyebut pemegangnya, uji tidak dijalankan', () => {
  const marker = (r) => path.join(r.outside, 'jalan');
  const r = repo({ status: 'in_progress', extra: 'test_lock_timeout: 1\n' });
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8').replace('test_command: ', `test_command: touch ${JSON.stringify(marker(r))}`));
  const before = read(r, X);
  const release = hold(r, 'tests', 'ticket 261016709999, slot 2, /tempat/lain');
  try {
    const res = run(testRun, r.root, [X]);
    assert.equal(res.code, 2, res.err);
    assert.match(res.err, /Gave up waiting for the tests lock after 1s\. It is held by ticket 261016709999, slot 2, \/tempat\/lain/);
    assert.match(res.err, /test_lock_timeout in .*settings\.md/);
    assert.equal(fs.existsSync(marker(r)), false, 'the test command ran without the lock');
    assert.equal(read(r, X), before);
    assert.equal(fs.existsSync(lockDir(r, 'tests')), true, 'the waiter that gave up removed the holder\'s lock');
  } finally {
    release();
  }
});

test('kunci papan yang ditunggu test-run.sh melewati lock_timeout: hasilnya tetap tampil di layar, tidak tercatat', () => {
  const r = repo({ status: 'in_progress', testCommand: 'true', extra: 'lock_timeout: 1\n' });
  const before = read(r, X);
  const release = hold(r, 'board', 'queue.sh answer 261016709999');
  try {
    const res = run(testRun, r.root, [X]);
    assert.equal(res.code, 2, res.err);
    assert.match(res.err, /Gave up waiting for the board lock after 1s\. It is held by queue\.sh answer 261016709999/);
    assert.match(res.err, /The run was not recorded in 261016700001/);
    assert.match(res.err, /: test run — `true` exited 0 /);
    assert.equal(read(r, X), before);
    assert.equal(fs.existsSync(lockDir(r, 'board')), true, 'the waiter that gave up removed the holder\'s lock');
    assert.equal(fs.existsSync(lockDir(r, 'tests')), false, 'the test lock was kept after giving up');
  } finally {
    release();
  }
});

// A child shares a hold only when the lock it inherited is still owned by the
// process it names; a stale or foreign entry makes it wait like anyone else.
test('KERJAAN_HELD_LOCKS hanya berlaku bila kunci itu masih dipegang proses yang disebutnya', () => {
  const r = repo({ extra: 'lock_timeout: 1\n' });
  const release = hold(r, 'board');
  const lock = fs.realpathSync(lockDir(r, 'board'));
  try {
    const foreign = run(update, r.root, [X], { KERJAAN_HELD_LOCKS: `${lock}=999999` });
    assert.equal(foreign.code, 1, foreign.err);
    assert.match(foreign.err, /Gave up waiting for the board lock/);
    const other = run(update, r.root, [X], { KERJAAN_HELD_LOCKS: `/elsewhere/board.lock=${process.pid}` });
    assert.equal(other.code, 1, other.err);
    const shared = run(update, r.root, [X], { KERJAAN_HELD_LOCKS: `/elsewhere/x.lock=1\n${lock}=${process.pid}` });
    assert.equal(shared.code, 0, shared.err);
    assert.equal(fs.existsSync(lock), true, 'a child released the lock its parent holds');
  } finally {
    release();
  }
});

// ---------------------------------------------------------------------------
// The limits are settings, and their defaults are the ones the guide states

function timeoutOf(settingsBody, key, dflt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-batas-'));
  fs.writeFileSync(path.join(dir, 'settings.md'), `---\n${settingsBody}---\n`);
  const r = spawnSync('bash', ['-c', `. "$1"; kerjaan_lock_timeout "$2" "$3" "$4"`, '_', lib, dir, key, dflt],
    { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

const defaults = () => {
  const text = fs.readFileSync(lib, 'utf8');
  return {
    lock_timeout: text.match(/kerjaan_lock_timeout "\$board" lock_timeout (\d+)/)[1],
    test_lock_timeout: text.match(/kerjaan_lock_timeout "\$board" test_lock_timeout (\d+)/)?.[1]
      ?? fs.readFileSync(testRun, 'utf8').match(/kerjaan_lock_timeout "\$board" test_lock_timeout (\d+)/)[1],
  };
};

test('batas waktu kunci dibaca dari settings.md, dan nilai bawaannya yang dipakai skrip tertulis di SETTINGS.md', () => {
  const d = defaults();
  assert.deepEqual(d, { lock_timeout: '120', test_lock_timeout: '3600' });
  for (const key of ['lock_timeout', 'test_lock_timeout']) {
    assert.equal(timeoutOf('', key, d[key]), d[key]);
    assert.equal(timeoutOf(`${key}:\n`, key, d[key]), d[key]);
    assert.equal(timeoutOf(`${key}: lama\n`, key, d[key]), d[key]);
    assert.equal(timeoutOf(`${key}: 45\n`, key, d[key]), '45');
    assert.equal(timeoutOf(`${key}: 0\n`, key, d[key]), '0');
  }
  const guide = fs.readFileSync(path.join(skill, 'SETTINGS.md'), 'utf8');
  for (const key of ['lock_timeout', 'test_lock_timeout']) {
    assert.match(guide, new RegExp(`^${key}:`, 'm'), `${key} is missing from the template`);
    const bullet = guide.split(`- \`${key}\``)[1];
    assert.ok(bullet, `${key} is not explained`);
    assert.match(bullet.split('\n- ')[0], new RegExp(`\\b${d[key]}\\b`), `${key}'s default is not stated`);
  }
});
