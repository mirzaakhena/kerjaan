// new-ticket.sh: the first ## History line of a new ticket names the Claude
// Code session that created it, and only when there is one; IDs stay unique
// when tickets are created at once, a minute holds at most 99, and the lock it
// chooses the ID under is the board lock every other script takes (lib.sh): a
// lock left behind by a dead process does not block the board forever, and
// one held by a live process is waited on, then given up on out loud.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const create = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'new-ticket.sh');
const SESSION = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const TIME = String.raw`\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}`;

function board(settings = '') {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-new-')));
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), `---\nlanguage: English\n${settings}---\n`);
  return root;
}

// Outside git the board lock lives in the board folder itself (lib.sh,
// kerjaan_locks_dir); these boards are not git repositories.
const boardLock = (root) => path.join(root, '.kerjaan', '.locks', 'board.lock');

function create1(root, session, status = 'backlog') {
  const env = { ...process.env };
  if (session === undefined) delete env.CLAUDE_CODE_SESSION_ID;
  else env.CLAUDE_CODE_SESSION_ID = session;
  const r = spawnSync('bash', [create, status, 'Sebuah tiket'], { cwd: root, encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  const text = fs.readFileSync(r.stdout.trim(), 'utf8');
  const created = text.match(/^created: (.*)$/m)[1];
  const history = text.split('## History\n')[1].split('\n\n## Notes')[0].split('\n');
  return { created, history };
}

test('inside a Claude Code session the first line is "- <created> <session-id> <status>"', () => {
  const { created, history } = create1(board(), SESSION, 'todo');
  assert.deepEqual(history, [`- ${created} ${SESSION} todo`]);
});

for (const [where, session] of [['with no CLAUDE_CODE_SESSION_ID', undefined], ['with it empty', ''], ['with a value that is not one word', 'dua kata']]) {
  test(`${where} the first line is "- <created> <status>"`, () => {
    const { created, history } = create1(board(), session);
    assert.match(created, new RegExp(`^${TIME}$`));
    assert.deepEqual(history, [`- ${created} backlog`]);
  });
}

// Choosing the ID. The minute an ID starts with is pinned by a `date` on PATH
// that answers new-ticket.sh's one question about it with a fixed minute and
// passes everything else to the real one, so a test never straddles a minute
// boundary.
const MINUTE = '2610161200';

function pinnedEnv() {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-date-'));
  const real = spawnSync('bash', ['-c', 'command -v date'], { encoding: 'utf8' }).stdout.trim();
  fs.writeFileSync(path.join(bin, 'date'),
    `#!/bin/sh\nif [ "$1" = "+%y%m%d%H%M" ]; then echo ${MINUTE}; else exec ${real} "$@"; fi\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  delete env.CLAUDE_CODE_SESSION_ID;
  return env;
}

function createPinned(root, title = 'Sebuah tiket', status = 'backlog') {
  const r = spawnSync('bash', [create, status, title], { cwd: root, encoding: 'utf8', env: pinnedEnv() });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}

function createPinnedAsync(root, title, env) {
  return new Promise((resolve) => {
    const child = spawn('bash', [create, 'todo', title], { cwd: root, env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => resolve({ code, out: out.trim(), err }));
  });
}

const allTickets = (root) => ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']
  .flatMap((s) => fs.readdirSync(path.join(root, '.kerjaan', s)).filter((f) => f.endsWith('.md')));
const placeholder = (root, status, name) => fs.writeFileSync(path.join(root, '.kerjaan', status, name), '');

// new-ticket.sh waits up to lock_timeout for the board lock and then gives up
// out loud; on a machine under heavy load some of the creations below could
// reach that limit. Giving up that way is allowed. Anything else is not:
// another failure, two tickets sharing an ID, or a gap in the numbering.
test('tickets created at the same moment each get their own ID, numbered on from 01', async () => {
  for (let round = 0; round < 3; round++) {
    const root = board();
    const env = pinnedEnv();
    const n = 8;
    const runs = await Promise.all(Array.from({ length: n }, (_, i) => createPinnedAsync(root, `Tiket ${i}`, env)));
    const made = runs.filter((r) => r.code === 0);
    for (const r of runs.filter((x) => x.code !== 0)) {
      assert.equal(r.code, 1, r.err);
      assert.match(r.err, /Gave up waiting for the board lock/, r.err);
      assert.equal(r.out, '');
    }
    assert.ok(made.length >= 2, `only ${made.length} of ${n} creations got through in round ${round}`);
    const ids = made.map((r) => path.basename(r.out).slice(0, 12)).sort();
    const want = Array.from({ length: made.length }, (_, i) => `${MINUTE}${String(i + 1).padStart(2, '0')}`);
    assert.deepEqual(ids, want, `round ${round}`);
    assert.equal(allTickets(root).length, made.length);
    assert.equal(fs.existsSync(boardLock(root)), false, 'the lock is released');
  }
});

test('the next number is counted across every status folder, so an ID that moved on is not reused', () => {
  const root = board();
  placeholder(root, 'done', `${MINUTE}05 Sudah selesai.md`);
  placeholder(root, 'cancel', `${MINUTE}03 Batal.md`);
  placeholder(root, 'todo', '261016115999 Menit sebelumnya.md');
  const r = createPinned(root);
  assert.equal(r.code, 0, r.err);
  assert.equal(path.basename(r.out), `${MINUTE}06 Sebuah tiket.md`);
});

test('the 99th ticket of a minute is created; the 100th is refused, with nothing written', () => {
  const root = board();
  placeholder(root, 'cancel', `${MINUTE}98 Hampir penuh.md`);
  const ok = createPinned(root);
  assert.equal(ok.code, 0, ok.err);
  assert.equal(path.basename(ok.out), `${MINUTE}99 Sebuah tiket.md`);
  const before = allTickets(root).sort();
  const full = createPinned(root, 'Satu lagi');
  assert.equal(full.code, 1);
  assert.equal(full.out, '');
  assert.match(full.err, new RegExp(`Minute ${MINUTE} already holds 99 tickets`));
  assert.deepEqual(allTickets(root).sort(), before);
  assert.equal(fs.existsSync(boardLock(root)), false, 'the lock is released');
});

// A process that has exited: its PID names nobody any more.
function deadPid() {
  return spawnSync('bash', ['-c', 'echo $$'], { encoding: 'utf8' }).stdout.trim();
}

test('a board lock left behind by a process that no longer runs is taken over', () => {
  const root = board();
  const lock = boardLock(root);
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'owner'), `${deadPid()}\tupdate-ticket.sh, killed\n`);
  const r = createPinned(root);
  assert.equal(r.code, 0, r.err);
  assert.equal(path.basename(r.out), `${MINUTE}01 Sebuah tiket.md`);
  assert.match(r.err, /no longer runs; taking it over/);
  assert.equal(fs.existsSync(lock), false);
});

test('a board lock held by a live process is waited on up to lock_timeout, then refused: no ticket, and the lock is left to its holder', () => {
  const root = board('lock_timeout: 1\n');
  const lock = boardLock(root);
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'owner'), `${process.pid}\tupdate-ticket.sh 261016120001, process ${process.pid}\n`);
  const r = createPinned(root);
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  assert.match(r.err, /Waiting for the board lock, held by update-ticket\.sh 261016120001/);
  assert.match(r.err, /Gave up waiting for the board lock after 1s/);
  assert.match(r.err, /lock_timeout/);
  assert.deepEqual(allTickets(root), []);
  assert.equal(fs.existsSync(path.join(lock, 'owner')), true);
});

// One design: in a git repository the lock is the one in git's common
// directory that update-ticket.sh, queue.sh, merge.sh and test-run.sh take,
// not a second one of new-ticket.sh's own.
test('in a git repository, new-ticket.sh waits for the same board lock as update-ticket.sh', () => {
  const root = board('lock_timeout: 1\n');
  spawnSync('git', ['init', '-q'], { cwd: root });
  const lock = path.join(root, '.git', 'kerjaan-locks', 'board.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'owner'), `${process.pid}\tupdate-ticket.sh, process ${process.pid}\n`);
  const held = createPinned(root);
  assert.equal(held.code, 1);
  assert.match(held.err, /Gave up waiting for the board lock/);
  assert.deepEqual(allTickets(root), []);
  fs.rmSync(lock, { recursive: true });
  const free = createPinned(root);
  assert.equal(free.code, 0, free.err);
  assert.equal(fs.existsSync(lock), false, 'the lock is released');
  assert.equal(fs.existsSync(path.join(root, '.kerjaan', '.lock')), false, 'no lock of its own');
});
