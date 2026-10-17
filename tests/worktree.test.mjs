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
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
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
Something.

## Request
${title}.

## Done when
- [ ] Something can be tried.

## History
- 2026-10-16 20:00:00 in_progress

## Notes
(none yet)
`;
}

function settings({ testCommand = '', parallel, setup = '', teardown = '', extra = '' } = {}) {
  return `---
language: English
test_command: ${testCommand}
long_lived_branches: []
${extra}${parallel === undefined ? '' : `parallel_tests: ${parallel}\n`}worktree_setup: ${setup}
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
  const outside = path.join(base, 'outside');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  fs.writeFileSync(path.join(k, 'settings.md'), settings(opts));
  fs.writeFileSync(path.join(k, 'in_progress', `${A} First ticket.md`), ticket('First ticket'));
  fs.writeFileSync(path.join(k, 'in_progress', `${B} Second ticket.md`), ticket('Second ticket'));
  fs.writeFileSync(path.join(root, 'code.txt'), 'code\n');
  fs.writeFileSync(path.join(root, '.gitignore'), '.env\n.setup-ran\n');
  fs.writeFileSync(path.join(root, '.env'), 'RAHASIA=1\n');
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
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
  const file = path.join(r.outside, 'test.cjs');
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
const end = Date.now() + Number(e.TEST_MS || 1500);
if (e.TEST_TOGETHER) {
  const others = e.TEST_TOGETHER.split(',');
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

test('with no setting, the tests of two worktrees take turns and the second is recorded as waiting', async () => {
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

test('tests in the main tree and in a worktree take turns too', async () => {
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

test('parallel_tests: true makes the tests of two worktrees run at the same time', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r), parallel: 'true' });
  const a = add(r, A);
  const b = add(r, B);
  const env = { TEST_TOGETHER: `${A},${B}`, TEST_MS: '8000' };
  const [ra, rb] = await Promise.all([
    runAsync(testRun, a.path, [A], env),
    runAsync(testRun, b.path, [B], env),
  ]);
  // Each run only ends well once it has seen the other one running.
  assert.equal(ra.code, 0, ra.err);
  assert.equal(rb.code, 0, rb.err);
  assert.doesNotMatch(notes(r, A) + notes(r, B), /Waited/);
});

test('parallel_tests: false still takes turns', async () => {
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

test('the tests read their slot number and ticket ID; two worktrees never share a number', async () => {
  const r = repo();
  setSettings(r, { testCommand: helper(r), parallel: 'true' });
  const a = add(r, A);
  const b = add(r, B);
  assert.equal(run(testRun, a.path, [A], { TEST_MS: '1' }).code, 0);
  assert.equal(run(testRun, b.path, [B], { TEST_MS: '1' }).code, 0);
  assert.equal(run(testRun, r.root, [A], { TEST_MS: '1' }).code, 0);
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

test('worktrees created at the same moment and one created by hand still get different numbers', async () => {
  const r = repo();
  const ids = ['261016200011', '261016200012', '261016200013', '261016200014', '261016200015'];
  for (const id of ids) {
    fs.writeFileSync(path.join(r.k, 'in_progress', `${id} Ticket ${id}.md`), ticket(id));
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

test('the setup command runs every time a worktree is created, inside that worktree', () => {
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
  assert.match(git(r.root, 'worktree', 'list', '--porcelain'), new RegExp(`branch refs/heads/ticket-${A}`));
});

test('a failed setup leaves the worktree unused: it is removed again, and the teardown runs too', () => {
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
  assert.equal(git(r.root, 'branch', '--list', `ticket-${A}`), '');
  assert.equal(fs.readFileSync(log, 'utf8').trim(), A);
});

test('the teardown command runs every time a worktree is removed, with that worktree\'s ticket and slot', () => {
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
  // The branch is a decision about merging, not the script's, and both say so.
  assert.notEqual(git(r.root, 'branch', '--list', `ticket-${A}`), '');
  assert.notEqual(git(r.root, 'branch', '--list', `ticket-${B}`), '');
  assert.match(ra.err, new RegExp(`Branch ticket-${A} is kept; merge or delete it\\.`));
  assert.match(rb.err, new RegExp(`Branch ticket-${B} is kept; merge or delete it\\.`));
});

test('a failed teardown, or a worktree that is not clean, refuses the removal', () => {
  const r = repo();
  const log = path.join(r.outside, 'teardown');
  setSettings(r, { teardown: `echo ran >> ${JSON.stringify(log)}; exit 4` });
  const a = add(r, A);
  const failed = run(worktreeSh, r.root, ['remove', A]);
  assert.equal(failed.code, 1);
  assert.match(failed.err, /REFUSED: worktree_teardown failed/);
  assert.equal(fs.existsSync(a.path), true);

  setSettings(r, { teardown: `echo ran >> ${JSON.stringify(log)}` });
  fs.writeFileSync(path.join(a.path, 'code.txt'), 'changed\n');
  const dirty = run(worktreeSh, r.root, ['remove', A]);
  assert.equal(dirty.code, 1);
  assert.match(dirty.err, /REFUSED: .* not committed/);
  assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, 1, 'teardown ran on a dirty worktree');
  assert.equal(fs.existsSync(a.path), true);
});

test('worktree.sh refuses to run from a linked worktree', () => {
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
  test(`test data outside the repo: ticket ${order[0].slice(-1)} then ${order[1].slice(-1)}, the first teardown before the second run`, () => {
    const r = repo();
    const data = path.join(r.outside, 'data');
    fs.mkdirSync(path.join(data, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(data, 'shared', 'seed.txt'), 'seed\n');
    fs.chmodSync(path.join(data, 'shared', 'seed.txt'), 0o444);
    const d = JSON.stringify(data);
    setSettings(r, {
      setup: `mkdir -p ${d}/ticket-$KERJAAN_TICKET && cp ${d}/shared/seed.txt ${d}/ticket-$KERJAAN_TICKET/db.txt && chmod u+w ${d}/ticket-$KERJAAN_TICKET/db.txt`,
      teardown: `rm -rf ${d}/ticket-$KERJAAN_TICKET`,
      testCommand: `echo test >> ${d}/ticket-$KERJAAN_TICKET/db.txt && grep -q seed ${d}/shared/seed.txt`,
    });
    const trees = Object.fromEntries([A, B].map((id) => [id, add(r, id)]));
    for (const id of [A, B]) assert.equal(trees[id].code, 0, trees[id].err);

    const [first, second] = order;
    assert.equal(run(testRun, trees[first].path, [first]).code, 0);
    assert.equal(run(worktreeSh, r.root, ['remove', first]).code, 0);
    assert.equal(fs.existsSync(path.join(data, `ticket-${first}`)), false);
    const res = run(testRun, trees[second].path, [second]);
    assert.equal(res.code, 0, res.err);
    assert.equal(fs.readFileSync(path.join(data, `ticket-${second}`, 'db.txt'), 'utf8'), 'seed\ntest\n');
    assert.equal(run(worktreeSh, r.root, ['remove', second]).code, 0);
    assert.deepEqual(fs.readdirSync(data), ['shared']);
  });
}

test('a lock left by a process that has died is taken over', () => {
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
  fs.writeFileSync(lock + '/owner', `${process.pid}\tthe test holding the lock\n`);
  let done = false;
  const running = start().then((res) => { done = true; return res; });
  await sleep(1200);
  const waitedWhileHeld = !done;
  fs.rmSync(lock, { recursive: true });
  return { waitedWhileHeld, res: await running };
}

test('handing out a slot number waits for the slots lock', async () => {
  const r = repo();
  git(r.root, 'worktree', 'add', '-q', '-b', 'tangan', path.join(r.base, 'tangan'));
  const { waitedWhileHeld, res } = await heldLock(r, 'slots',
    () => runAsync(worktreeSh, path.join(r.base, 'tangan'), ['slot']));
  assert.equal(waitedWhileHeld, true, 'slot was handed out while the lock was held');
  assert.equal(res.out.trim(), '1', res.err);
});

test('the git steps of creating and removing a worktree wait for the worktrees lock', async () => {
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

// ---------------------------------------------------------------------------
// The limit on tickets worked side by side (261017113002): max_parallel in
// settings.md, or one at a time under chain: ticket. Each ticket running
// beside another has its own linked worktree, so add counts them and refuses
// past the limit, creating nothing.

const C = '261016200003';
const D = '261016200004';

function limitRepo(extra) {
  const r = repo({ extra });
  for (const [id, title] of [[C, 'Third ticket'], [D, 'Fourth ticket']]) {
    fs.writeFileSync(path.join(r.k, 'in_progress', `${id} ${title}.md`), ticket(title));
  }
  return r;
}

// Asserts that `res`, an add for <id>, was refused by the limit with nothing
// created: no folder, no worktree, no branch.
function refusedByLimit(r, res, id, count, limit, why) {
  assert.equal(res.code, 1, res.err);
  assert.match(res.err, new RegExp(`REFUSED: no worktree for ${id}\\. ${count} ticket\\(s\\) already run side by side, and\\nsettings\\.md allows ${limit} \\(${why}\\)\\. Worktrees in use:`));
  assert.match(res.err, /a higher limit is the owner's to set in settings\.md/);
  assert.equal(res.out, '');
  assert.equal(fs.existsSync(res.path), false);
  assert.doesNotMatch(git(r.root, 'worktree', 'list', '--porcelain'), new RegExp(`wt-${id}`));
  assert.equal(git(r.root, 'branch', '--list', `ticket-${id}`), '');
}

for (const n of [1, 2, 3]) {
  test(`max_parallel: ${n} allows ${n} worktree(s) at once and refuses the next, naming those in use`, () => {
    const r = limitRepo(`max_parallel: ${n}\n`);
    const ids = [A, B, C, D];
    const made = ids.slice(0, n).map((id) => add(r, id));
    for (const m of made) assert.equal(m.code, 0, m.err);
    const over = add(r, ids[n]);
    refusedByLimit(r, over, ids[n], n, n, `max_parallel: ${n}`);
    for (const m of made) assert.ok(over.err.includes(`  ${m.path}\n`), over.err);
    // Once one has gone, the next is made.
    assert.equal(run(worktreeSh, r.root, ['remove', ids[0]]).code, 0);
    const next = add(r, ids[n]);
    assert.equal(next.code, 0, next.err);
  });
}

test('chain: ticket allows one worktree at a time, whatever max_parallel says', () => {
  for (const extra of ['chain: ticket\n', 'chain: ticket\nmax_parallel: 3\n', 'max_parallel:\nchain: ticket\n']) {
    const r = limitRepo(extra);
    const a = add(r, A);
    assert.equal(a.code, 0, `${extra}${a.err}`);
    refusedByLimit(r, add(r, B), B, 1, 1, 'chain: ticket runs one ticket at a time');
  }
});

test('with no limit set, chain queue or group, or max_parallel empty, worktrees are not counted', () => {
  for (const extra of ['', 'chain:\nmax_parallel:\n', 'chain: queue\n', 'chain: group\n', 'chain: group\nmax_parallel: 4\n']) {
    const r = limitRepo(extra);
    for (const id of [A, B, C, D]) {
      const m = add(r, id);
      assert.equal(m.code, 0, `${extra}${id}: ${m.err}`);
    }
  }
});

test('a worktree whose folder is gone no longer counts against the limit', () => {
  const r = limitRepo('max_parallel: 1\n');
  const a = add(r, A);
  assert.equal(a.code, 0, a.err);
  refusedByLimit(r, add(r, B), B, 1, 1, 'max_parallel: 1');
  fs.rmSync(a.path, { recursive: true, force: true });
  const b = add(r, B);
  assert.equal(b.code, 0, b.err);
});

test('a limit or chain it cannot read is refused with the value and what to write, creating nothing', () => {
  for (const [extra, said] of [
    ['max_parallel: 0\n', /max_parallel in settings\.md is '0': write a whole number from 1 up, or leave it empty \(no limit\)\./],
    ['max_parallel: two\n', /max_parallel in settings\.md is 'two'/],
    ['max_parallel: -1\n', /max_parallel in settings\.md is '-1'/],
    ['max_parallel: 1.5\n', /max_parallel in settings\.md is '1\.5'/],
    ['chain: tickets\n', /chain in settings\.md is 'tickets': write queue, group or ticket, or leave it empty \(queue\)\./],
    ['chain: Ticket\nmax_parallel: 2\n', /chain in settings\.md is 'Ticket'/],
  ]) {
    const r = limitRepo(extra);
    const a = add(r, A);
    assert.equal(a.code, 2, `${extra}${a.err}`);
    assert.match(a.err, said, extra);
    assert.equal(fs.existsSync(a.path), false);
    assert.equal(git(r.root, 'branch', '--list', `ticket-${A}`), '');
  }
});

test('two adds at the same moment cannot both take the last place', async () => {
  const r = limitRepo('max_parallel: 2\n');
  assert.equal(add(r, A).code, 0);
  const tries = await Promise.all([B, C, D].map((id) => runAsync(worktreeSh, r.root, ['add', id, path.join(r.base, `wt-${id}`)])));
  assert.deepEqual(tries.map((t) => t.code).sort(), [0, 1, 1], tries.map((t) => t.err).join('\n'));
  const linked = git(r.root, 'worktree', 'list', '--porcelain').match(/^worktree /gm).length - 1;
  assert.equal(linked, 2);
});
