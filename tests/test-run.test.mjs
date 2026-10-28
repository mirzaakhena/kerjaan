// test-run.sh: the record it writes into a ticket names the command exactly as
// settings.md has it, so --check — what the reviewer and merge.sh ask — can
// recognise the run as evidence.
//
// Every test builds a throwaway repository with a board and runs the real
// script against it, the way the skill runs it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testRun = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'test-run.sh');

const A = '261016600001';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function ticketText(notes) {
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
- 2026-10-16 20:00:00 in_progress

## Notes
${notes}
`;
}

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function repo(testCommand, notes) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-testrun-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), `---
language: English
test_command: ${testCommand}
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(root, '.kerjaan', 'in_progress', `${A} A ticket.md`), ticketText(notes));
  fs.writeFileSync(path.join(root, 'a.js'), 'a\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
  return root;
}

function run(root, ...args) {
  const r = spawnSync('bash', [testRun, ...args], { cwd: root, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// awk -v reads its value as a string literal: `\d` became `d` and `\t` a tab,
// so the recorded command no longer matched settings.md and --check said
// NO EVIDENCE.
const command = String.raw`true pattern \d+ in C:\temp`;

for (const [where, notes] of [
  ['the first note, replacing "(none yet)"', '(none yet)'],
  ['a note after earlier ones', '- 2026-10-16 20:00:01: another note'],
]) {
  test(`a test_command with backslashes is recorded whole as ${where}, and --check accepts it`, () => {
    const root = repo(command, notes);
    const r = run(root, A);
    assert.equal(r.code, 0, r.err);
    const file = path.join(root, '.kerjaan', 'in_progress', `${A} A ticket.md`);
    const rec = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.includes(': test run — '));
    assert.ok(rec.includes(`\`${command}\` exited 0 `), rec);
    const chk = run(root, '--check', A);
    assert.equal(chk.code, 0, chk.out);
    assert.match(chk.out, /^SAME: /);
  });
}

// The fingerprint covers untracked files too — the checks usually run before
// anything is added to git — while ignored files and .kerjaan/ stay outside
// it, and building it never touches the real index.
const ticketFile = (root) => path.join(root, '.kerjaan', 'in_progress', `${A} A ticket.md`);
const records = (root) => fs.readFileSync(ticketFile(root), 'utf8').split('\n').filter((l) => l.includes(': test run — '));

test('an untracked file is part of what the run vouches for: changing it, or adding one, is DIFFERENT', () => {
  const root = repo('true', '(none yet)');
  fs.writeFileSync(path.join(root, 'new.js'), 'one\n');
  assert.equal(run(root, A).code, 0);
  assert.match(records(root)[0], /on content fingerprint [0-9a-f]{40,64} \(the same before and after the run/);
  assert.equal(git(root, 'status', '--porcelain', '--', 'new.js'), '?? new.js', 'the real index is not touched');
  let chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);

  fs.writeFileSync(path.join(root, 'new.js'), 'two\n');
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /^DIFFERENT: /);
  assert.match(chk.out, /\n {2}M\tnew\.js\n/);

  fs.writeFileSync(path.join(root, 'new.js'), 'one\n');
  fs.writeFileSync(path.join(root, 'other.js'), 'x\n');
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /\n {2}A\tother\.js\n/);

  fs.rmSync(path.join(root, 'other.js'));
  fs.rmSync(path.join(root, 'new.js'));
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /\n {2}D\tnew\.js\n/);
});

test('ignored files and the board are outside the fingerprint', () => {
  const root = repo('true', '(none yet)');
  fs.writeFileSync(path.join(root, '.gitignore'), '*.log\n');
  git(root, 'add', '.gitignore');
  git(root, 'commit', '-q', '-m', 'abaikan log');
  assert.equal(run(root, A).code, 0);
  fs.writeFileSync(path.join(root, 'trace.log'), 'anything\n');
  fs.writeFileSync(path.join(root, '.kerjaan', 'in_progress', '261016600002 Another.md'), 'another ticket\n');
  const chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);
  assert.match(chk.out, /^SAME: /);
});

// A run that changes the content it is testing vouches for no version: the
// record says what changed, the exit status is still the command's own, and
// --check gives NO EVIDENCE.
for (const [what, setup, cmd, changed] of [
  ['writes a new untracked file', () => {}, 'echo x > written.js; exit 3', 'written.js'],
  ['edits an untracked file that was there before', (root) => fs.writeFileSync(path.join(root, 'new.js'), 'a\n'), 'echo b >> new.js; exit 3', 'new.js'],
  ['edits a tracked file', () => {}, 'echo b >> a.js; exit 3', 'a.js'],
  ['deletes a tracked file', () => {}, 'rm a.js; exit 3', 'a.js'],
]) {
  test(`a run that ${what} is recorded as vouching for nothing, and --check says NO EVIDENCE`, () => {
    const root = repo(cmd, '(none yet)');
    setup(root);
    const r = run(root, A);
    assert.equal(r.code, 3, r.err);
    assert.match(r.err, new RegExp(`The content changed while the checks ran: ${changed.replace('.', '\\.')}`));
    const rec = records(root);
    assert.equal(rec.length, 1);
    assert.ok(rec[0].includes(`\`${cmd}\` exited 3 after `), rec[0]);
    assert.ok(rec[0].includes(`but the content changed during the run (${changed}), so it vouches for no version.`), rec[0]);
    assert.doesNotMatch(rec[0], /fingerprint/);
    const chk = run(root, '--check', A);
    assert.equal(chk.code, 2, chk.out);
    assert.match(chk.out, /^NO EVIDENCE: the latest run \(.*\) saw the content change while it ran\./);
  });
}

test('a run that writes only ignored files keeps its fingerprint', () => {
  const root = repo('echo x > result.log', '(none yet)');
  fs.writeFileSync(path.join(root, '.gitignore'), '*.log\n');
  git(root, 'add', '.gitignore');
  git(root, 'commit', '-q', '-m', 'abaikan log');
  assert.equal(run(root, A).code, 0);
  assert.match(records(root)[0], /the same before and after the run/);
  assert.equal(run(root, '--check', A).code, 0);
});

test('a later clean run supersedes one whose content changed', () => {
  const root = repo('test -e written.js || echo x > written.js', '(none yet)');
  assert.equal(run(root, A).code, 0);
  assert.equal(run(root, '--check', A).code, 2);
  assert.equal(run(root, A).code, 0);
  assert.equal(records(root).length, 2);
  const chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);
});

// A run of `node --test` that ends before every test has run, though the file
// that stopped exited 0, is recorded as failed (261017222801): the guard the
// board's own test_command loads makes the run exit non-zero, and the record
// carries that, so --check gives no evidence and the move to review of a
// ticket on a branch is refused (merge.sh check --gate).
test('a node --test run that stops half-way is recorded as failed, and --check says NO EVIDENCE', () => {
  const guard = path.join(here, 'complete-runs.mjs');
  const root = repo(`node --test --test-timeout=60000 --import=${guard}`, '(none yet)');
  fs.writeFileSync(path.join(root, 'half.test.mjs'), `import test from 'node:test';
test('first', () => {});
test('second, which ends the process', () => { process.exit(0); });
test('third, never run', () => {});
`);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'half');
  // Without this variable the inner run believes it is part of this one.
  const env = { ...gitEnv };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync('bash', [testRun, A], { cwd: root, encoding: 'utf8', env });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(records(root)[0], /` exited [1-9]\d* after /);
  const chk = run(root, '--check', A);
  assert.equal(chk.code, 2, chk.out);
  assert.match(chk.out, /^NO EVIDENCE: the latest run \(.*\) exited [1-9]/m);
});

// ---------------------------------------------------------------------------
// The copy of a run's output, for the viewer's Progress section (261028112701)
// ---------------------------------------------------------------------------
// While a run goes, test-run.sh copies what it prints to
// <git common dir>/kerjaan-progress/<id>.<pid>.log, beside a .json saying whose
// run it is, and removes both when it ends. The copy must never change what
// the run reports: its exit status, and what reaches stdout and stderr.

const progressDir = (root) => path.join(root, '.git', 'kerjaan-progress');
const progressFiles = (root) => (fs.existsSync(progressDir(root)) ? fs.readdirSync(progressDir(root)).sort() : []);

// A test command that, half-way, copies what the progress folder holds to
// <seen>, outside the repository, so the test can read it afterwards.
const peek = (seen, tail = 'exit 7') =>
  `echo to-out-1; echo to-err-1 >&2; sleep 0.3; d="$KERJAAN_MAIN_TREE/.git/kerjaan-progress"; ls "$d" > ${seen}/ls; cat "$d"/*.json > ${seen}/json; cat "$d"/*.log > ${seen}/log; echo to-out-2; ${tail}`;

const scratch = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-seen-')));

test('a worker\'s run: its output is copied as it comes, under .git/, and the copy is gone once it ends', () => {
  const seen = scratch();
  const cmd = peek(seen);
  const root = repo(cmd, '(none yet)');
  const r = run(root, A);
  assert.equal(r.code, 7, r.err);
  assert.ok(records(root)[0].includes(`\`${cmd}\` exited 7 after `), records(root)[0]);
  const names = fs.readFileSync(path.join(seen, 'ls'), 'utf8').trim().split('\n');
  assert.equal(names.length, 2, names.join(' '));
  assert.match(names[0], new RegExp(`^${A}\\.\\d+\\.json$`));
  assert.equal(names[1], names[0].replace(/json$/, 'log'));
  const meta = JSON.parse(fs.readFileSync(path.join(seen, 'json'), 'utf8'));
  assert.deepEqual([meta.ticket, meta.who, meta.command], [A, 'worker', cmd]);
  assert.equal(`${A}.${meta.pid}.json`, names[0]);
  assert.ok(Math.abs(meta.startedAt - Date.now()) < 60000, String(meta.startedAt));
  const log = fs.readFileSync(path.join(seen, 'log'), 'utf8');
  assert.match(log, /to-out-1\n/);
  assert.match(log, /to-err-1\n/);
  assert.deepEqual(progressFiles(root), [], 'nothing is kept');
  // What the run printed still reaches the same streams as before.
  assert.match(r.out, /to-out-1\n[^]*to-out-2\n/);
  assert.doesNotMatch(r.out, /to-err-1/);
  assert.match(r.err, /to-err-1\n/);
  assert.doesNotMatch(r.err, /^to-out-1$/m);
  // The command's last line comes out before the script's own record line.
  assert.ok(r.out.endsWith('to-out-2\n'), JSON.stringify(r.out.slice(-40)));
});

test('a reviewer\'s run, sabotage included: copied as the reviewer\'s, its exit status its own, the copy gone after', () => {
  const seen = scratch();
  const root = repo('true', '(none yet)');
  const copy = scratch();
  fs.writeFileSync(path.join(copy, 'a.js'), 'broken on purpose\n');
  const cmd = peek(seen, 'exit 5');
  const r = run(root, '--review', A, '--dir', copy, '--', cmd);
  assert.equal(r.code, 5, r.err);
  assert.match(r.err, /Reviewer's run in .*exited 5 after/);
  const meta = JSON.parse(fs.readFileSync(path.join(seen, 'json'), 'utf8'));
  assert.deepEqual([meta.ticket, meta.who, meta.command], [A, 'reviewer', cmd]);
  assert.match(fs.readFileSync(path.join(seen, 'log'), 'utf8'), /to-out-1\n[^]*to-err-1\n|to-err-1\n[^]*to-out-1\n/);
  assert.deepEqual(progressFiles(root), []);
  assert.equal(records(root).length, 0, 'the reviewer\'s run records nothing');
  // And a passing one, with test_command itself.
  const ok = run(root, '--review', A);
  assert.equal(ok.code, 0, ok.err);
  assert.deepEqual(progressFiles(root), []);
});

// The exit status is what every review relies on: no way the copy can fail
// may turn a failing run into a passing one, or change its status at all.
for (const [what, setup, cmd] of [
  ['the copy cannot be made (the folder is taken by a file)', (root) => fs.writeFileSync(progressDir(root), 'not a folder\n'), 'echo out; echo err >&2; exit 7'],
  ['the command removes the copy while it runs', () => {}, 'echo out; rm -rf "$(git rev-parse --git-common-dir)/kerjaan-progress"; echo more; exit 7'],
  ['the command closes its own output and fails', () => {}, 'echo out; exec 1>&- 2>&-; exit 7'],
  ['the command fails without printing anything', () => {}, 'exit 7'],
  ['the command is killed by a signal', () => {}, 'echo out; kill -9 $$'],
]) {
  test(`a failing run stays failed, with its own status, when ${what}`, () => {
    const root = repo(cmd, '(none yet)');
    setup(root);
    const r = run(root, A);
    const want = cmd.includes('kill -9') ? 137 : 7;
    assert.equal(r.code, want, r.err);
    assert.ok(records(root)[0].includes(` exited ${want} after `), records(root)[0]);
    const chk = run(root, '--check', A);
    assert.equal(chk.code, 2, chk.out);
    assert.match(chk.out, new RegExp(`^NO EVIDENCE: the latest run \\(.*\\) exited ${want}\\.`, 'm'));
    const rv = run(root, '--review', A);
    assert.equal(rv.code, want, rv.err);
    if (fs.statSync(progressDir(root), { throwIfNoEntry: false })?.isDirectory()) assert.deepEqual(progressFiles(root), []);
  });
}

test('a passing run passes, with the copy made', () => {
  const root = repo('echo fine', '(none yet)');
  const r = run(root, A);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, 'fine\n');
  assert.equal(run(root, '--check', A).code, 0);
});

test('a copy left by a run that was killed is removed by the next run; a live run\'s copy is left alone', () => {
  const root = repo('true', '(none yet)');
  fs.mkdirSync(progressDir(root));
  const dead = spawnSync('true').pid;
  const live = process.pid;
  for (const pid of [dead, live]) {
    fs.writeFileSync(path.join(progressDir(root), `${A}.${pid}.json`), JSON.stringify({ ticket: A, pid }));
    fs.writeFileSync(path.join(progressDir(root), `${A}.${pid}.log`), 'x\n');
  }
  assert.equal(run(root, A).code, 0);
  assert.deepEqual(progressFiles(root), [`${A}.${live}.json`, `${A}.${live}.log`]);
});

test('a process the command leaves behind, holding its output open, does not keep the run waiting', () => {
  const seen = scratch();
  const root = repo(`sleep 30 & echo $! > ${seen}/pid; echo started; exit 3`, '(none yet)');
  const out = fs.openSync(path.join(seen, 'out'), 'w');
  const t0 = Date.now();
  const r = spawnSync('bash', [testRun, A], { cwd: root, env: gitEnv, stdio: ['ignore', out, out] });
  const took = Date.now() - t0;
  fs.closeSync(out);
  try { process.kill(Number(fs.readFileSync(path.join(seen, 'pid'), 'utf8')), 'SIGKILL'); } catch {}
  assert.equal(r.status, 3);
  assert.ok(took < 20000, `${took} ms`);
  assert.match(fs.readFileSync(path.join(seen, 'out'), 'utf8'), /started\n/);
  assert.deepEqual(progressFiles(root), []);
});
