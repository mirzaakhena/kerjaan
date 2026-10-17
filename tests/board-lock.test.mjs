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
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
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
Something.

## Request
Something.

## Done when
- [ ] An item

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

const ORDER = `**Group one: ${X} and ${Y} run side by side.**
- ${X} Ticket x
- ${Y} Ticket y

**Group two.**
- ${Z} Ticket z
`;

// X, Y and Z in todo, listed in order.md; `extra` lines go into settings.md.
function repo({ testCommand = '', extra = '', status = 'todo' } = {}) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-lock-')));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  fs.writeFileSync(path.join(k, 'settings.md'), `---
language: English
test_command: ${testCommand}
long_lived_branches: []
${extra}---
`);
  fs.writeFileSync(path.join(k, status, `${X} Ticket x.md`), ticket(status));
  fs.writeFileSync(path.join(k, status, `${Y} Ticket y.md`), ticket(status));
  fs.writeFileSync(path.join(k, 'todo', `${Z} Ticket z.md`), ticket('todo'));
  if (status === 'todo') fs.writeFileSync(path.join(k, 'order.md'), ORDER);
  fs.writeFileSync(path.join(root, 'code.txt'), 'code\n');
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
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
function hold(r, name, who = 'the test holding the lock') {
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

// A ticket's line leaves order.md when it finishes, not when it starts, so the
// race is two tickets of one group finishing at the same moment.
test('two tickets of one group finished at the same moment, again and again, both always leave order.md', async () => {
  for (let round = 1; round <= 8; round++) {
    const r = repo();
    const both = await Promise.all([
      runAsync(update, r.root, [X, '--status', 'done']),
      runAsync(update, r.root, [Y, '--status', 'done']),
    ]);
    for (const res of both) assert.equal(res.code, 0, res.err);
    assert.equal(statusOf(r, X), 'done');
    assert.equal(statusOf(r, Y), 'done');
    assert.equal(order(r), `**Group two.**\n- ${Z} Ticket z\n`, `round ${round}`);
    for (const id of [X, Y]) assert.match(read(r, id), /\n- [\d-]+ [\d:]+ (\S+ )?done\n/);
  }
});

test('a status move waits for the board lock: while it is held, the ticket and order.md stay as they were', async () => {
  const r = repo();
  const before = { ticket: read(r, X), order: order(r) };
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(update, r.root, [X, '--status', 'cancel']),
    () => ({ status: statusOf(r, X), ticket: read(r, X), order: order(r) }));
  assert.deepEqual(seen, { done: false, status: 'todo', ...before });
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the board lock, held by the test holding the lock/);
  assert.equal(statusOf(r, X), 'cancel');
  assert.doesNotMatch(order(r), new RegExp(`^- ${X} `, 'm'));
});

test('renaming a ticket and refreshing updated wait for the board lock too', async () => {
  for (const args of [[X, '--title', 'New title'], [X]]) {
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
  ['estimate', [X, 'code.txt'], /files estimated to change: `code.txt`/],
  ['ask', [X, 'A question?'], /open question: A question\?/],
]) {
  test(`queue.sh ${cmd} waits for the board lock before writing the ticket`, async () => {
    const r = repo();
    const { seen, res } = await whileHeld(r, 'board',
      () => runAsync(queue, r.root, [cmd, ...args]),
      () => ({ written: record.test(read(r, X)) }));
    assert.deepEqual(seen, { done: false, written: false });
    assert.equal(res.code, 0, res.err);
    assert.match(read(r, X), record);
  });
}

test('queue.sh answer waits for the board lock before writing the ticket', async () => {
  const r = repo();
  assert.equal(run(queue, r.root, ['ask', X, 'A question?']).code, 0);
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(queue, r.root, ['answer', X, '1', 'The answer']),
    () => ({ written: /answer, .*: The answer/.test(read(r, X)) }));
  assert.deepEqual(seen, { done: false, written: false });
  assert.equal(res.code, 0, res.err);
  assert.match(read(r, X), /answered question: A question\?\n {2}answer, [\d-]+ [\d:]+: The answer/);
});

// ---------------------------------------------------------------------------
// Test results recorded from worktrees

// A test command that finishes only once both tickets' runs have started, so
// the two runs record their results at the same moment.
function barrier(r) {
  const o = JSON.stringify(r.outside);
  return `touch ${o}/started-$KERJAAN_TICKET; while [ ! -e ${o}/started-${X} ] || [ ! -e ${o}/started-${Y} ]; do sleep 0.05; done`;
}

test('the results of two worktrees finishing at the same moment are each recorded in their own ticket', async () => {
  const r = repo({ status: 'in_progress', extra: 'parallel_tests: true\n' });
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8').replace('test_command: ', `test_command: ${barrier(r)}`));
  const wx = path.join(r.base, 'wt-x');
  const wy = path.join(r.base, 'wt-y');
  assert.equal(run(worktreeSh, r.root, ['add', X, wx]).code, 0);
  assert.equal(run(worktreeSh, r.root, ['add', Y, wy]).code, 0);
  for (let round = 1; round <= 3; round++) {
    for (const id of [X, Y]) fs.rmSync(path.join(r.outside, `started-${id}`), { force: true });
    const both = await Promise.all([runAsync(testRun, wx, [X]), runAsync(testRun, wy, [Y])]);
    for (const res of both) assert.equal(res.code, 0, res.err);
    for (const id of [X, Y]) {
      const runs = read(r, id).split('\n').filter((l) => l.includes(': test run — '));
      assert.equal(runs.length, round, `${id} after round ${round}:\n${read(r, id)}`);
    }
  }
});

test('a worktree\'s test result is still recorded while the same ticket is moved from the main tree at that moment', async () => {
  const r = repo({ status: 'in_progress', extra: 'parallel_tests: true\n' });
  const o = JSON.stringify(r.outside);
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8')
      .replace('test_command: ', `test_command: touch ${o}/started; while [ ! -e ${o}/go-on ]; do sleep 0.05; done`));
  const wx = path.join(r.base, 'wt-x');
  assert.equal(run(worktreeSh, r.root, ['add', X, wx]).code, 0);
  const t0 = Date.now();
  const testing = runAsync(testRun, wx, [X]);
  while (!fs.existsSync(path.join(r.outside, 'started'))) {
    assert.ok(Date.now() - t0 < 15000, 'the test run never started');
    await sleep(20);
  }
  // The run finishes while the foreman keeps refreshing the same ticket.
  fs.writeFileSync(path.join(r.outside, 'go-on'), '');
  const refreshes = [];
  for (let i = 0; i < 6; i++) refreshes.push(runAsync(update, r.root, [X]));
  const [res, ...others] = await Promise.all([testing, ...refreshes]);
  assert.equal(res.code, 0, res.err);
  for (const o2 of others) assert.equal(o2.code, 0, o2.err);
  assert.match(read(r, X), /: test run — .* exited 0 /);
});

test('a test result waits for the board lock before it is written to the ticket', async () => {
  const r = repo({ status: 'in_progress', testCommand: 'true' });
  const { seen, res } = await whileHeld(r, 'board',
    () => runAsync(testRun, r.root, [X]),
    () => ({ written: /test run — /.test(read(r, X)) }), 2500);
  assert.deepEqual(seen, { done: false, written: false });
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the board lock, held by the test holding the lock/);
  assert.match(read(r, X), /: test run — `true` exited 0 /);
  assert.equal(fs.existsSync(lockDir(r, 'board')), false, 'the board lock is released after the run');
});

// test-run.sh holds the board lock and runs update-ticket.sh, which takes it
// too: the child shares its parent's hold rather than waiting for itself.
test('update-ticket.sh run by test-run.sh does not wait for the lock test-run.sh itself holds', () => {
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

test('a wait for the board lock past lock_timeout stops with a message naming the holder, and changes nothing', () => {
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

test('a wait for the tests lock past test_lock_timeout stops with a message naming the holder, and the tests do not run', () => {
  const marker = (r) => path.join(r.outside, 'ran');
  const r = repo({ status: 'in_progress', extra: 'test_lock_timeout: 1\n' });
  fs.writeFileSync(path.join(r.k, 'settings.md'),
    fs.readFileSync(path.join(r.k, 'settings.md'), 'utf8').replace('test_command: ', `test_command: touch ${JSON.stringify(marker(r))}`));
  const before = read(r, X);
  const release = hold(r, 'tests', 'ticket 261016709999, slot 2, /some/where/else');
  try {
    const res = run(testRun, r.root, [X]);
    assert.equal(res.code, 2, res.err);
    assert.match(res.err, /Gave up waiting for the tests lock after 1s\. It is held by ticket 261016709999, slot 2, \/some\/where\/else/);
    assert.match(res.err, /test_lock_timeout in .*settings\.md/);
    assert.equal(fs.existsSync(marker(r)), false, 'the test command ran without the lock');
    assert.equal(read(r, X), before);
    assert.equal(fs.existsSync(lockDir(r, 'tests')), true, 'the waiter that gave up removed the holder\'s lock');
  } finally {
    release();
  }
});

test('a wait by test-run.sh for the board lock past lock_timeout: the result is still shown on screen, not recorded', () => {
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
test('KERJAAN_HELD_LOCKS counts only while the lock is still held by the process it names', () => {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-limit-'));
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

test('the lock time limits are read from settings.md, and the defaults the scripts use are written in SETTINGS.md', () => {
  const d = defaults();
  assert.deepEqual(d, { lock_timeout: '120', test_lock_timeout: '3600' });
  for (const key of ['lock_timeout', 'test_lock_timeout']) {
    assert.equal(timeoutOf('', key, d[key]), d[key]);
    assert.equal(timeoutOf(`${key}:\n`, key, d[key]), d[key]);
    assert.equal(timeoutOf(`${key}: long\n`, key, d[key]), d[key]);
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
