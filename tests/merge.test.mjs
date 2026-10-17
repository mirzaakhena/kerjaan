// Work done side by side reaches main only after it has been tested together
// with everything main already holds: the worker brings main into its branch
// before review, the move to review is refused until the branch holds all of
// main's code and the latest test run covers exactly that content, and
// merge.sh land merges one ticket at a time, sending a ticket back when main
// moved and holding only that ticket for the owner when the merge fails.
//
// Every test builds a throwaway repository with a board and a tiny "program":
// code.txt defines names, uses*.txt use them, and check.sh — the test command —
// fails when a name is used but not defined. Renaming a name in one ticket and
// using the old name in another is the break git cannot see.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const mergeSh = path.join(scripts, 'merge.sh');
const worktreeSh = path.join(scripts, 'worktree.sh');
const testRun = path.join(scripts, 'test-run.sh');
const updateTicket = path.join(scripts, 'update-ticket.sh');

const A = '261016300001';
const B = '261016300002';
const C = '261016300003';
const D = '261016300004';

const gitEnv = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  KERJAAN_LOCK_POLL: '0.2',
};

function ticket(title, blockedBy = []) {
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
blocked_by: [${blockedBy.join(', ')}]
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

const check = `#!/bin/sh
for f in uses*.txt; do
  [ -e "$f" ] || continue
  while read -r n; do
    grep -qx "def $n" code.txt || { echo "$n is used in $f but not defined"; exit 1; }
  done < "$f"
done
`;

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

// A repository with tickets A and B in in_progress, and C and D in todo (D is
// blocked_by A). Every test run appends a line to outside/runs, so a test can
// count how often the suite really ran.
function repo() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-merge-')));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  const runs = path.join(outside, 'runs');
  const sequence = path.join(outside, 'sequence');
  fs.writeFileSync(path.join(k, 'settings.md'), `---
language: English
test_command: echo "$KERJAAN_TICKET" >> ${JSON.stringify(runs)} && echo "start $KERJAAN_TICKET" >> ${JSON.stringify(sequence)} && sh check.sh && sleep $\{TEST_SLEEP:-0} && echo "end $KERJAAN_TICKET" >> ${JSON.stringify(sequence)} && [ -z "$TEST_FAIL" ]
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(k, 'in_progress', `${A} First ticket.md`), ticket('First ticket'));
  fs.writeFileSync(path.join(k, 'in_progress', `${B} Second ticket.md`), ticket('Second ticket'));
  fs.writeFileSync(path.join(k, 'todo', `${C} Third ticket.md`), ticket('Third ticket'));
  fs.writeFileSync(path.join(k, 'todo', `${D} Fourth ticket.md`), ticket('Fourth ticket', [A]));
  fs.writeFileSync(path.join(root, 'code.txt'), 'def one\ndef two\n');
  fs.writeFileSync(path.join(root, 'uses.txt'), 'one\n');
  fs.writeFileSync(path.join(root, 'check.sh'), check);
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
  return { base, root, outside, k, runs, sequence };
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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function add(r, id) {
  const p = path.join(r.base, `wt-${id}`);
  const res = run(worktreeSh, r.root, ['add', id, p]);
  assert.equal(res.code, 0, res.err);
  return p;
}

// What a worker does in its worktree: change files, commit.
function work(wt, files, msg = 'work') {
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(wt, name), body);
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '-m', msg);
}

const where = (r, id) => {
  for (const s of fs.readdirSync(r.k)) {
    const dir = path.join(r.k, s);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.readdirSync(dir).some((f) => f.startsWith(id))) return s;
  }
  throw new Error(`no ticket ${id}`);
};
const notes = (r, id) => {
  const dir = path.join(r.k, where(r, id));
  const f = fs.readdirSync(dir).find((n) => n.startsWith(id));
  return fs.readFileSync(path.join(dir, f), 'utf8').split('## Notes')[1];
};
const move = (r, id, status, extra = []) => run(updateTicket, r.root, [id, '--status', status, ...extra]);
const runCount = (r) => (fs.existsSync(r.runs) ? fs.readFileSync(r.runs, 'utf8').trim().split('\n').length : 0);
const head = (r) => git(r.root, 'rev-parse', 'HEAD').trim();
const show = (r, rev, file) => git(r.root, 'show', `${rev}:${file}`);

// Worker hands over and reviewer passes: the two moves around a review.
function toReview(r, id) {
  const res = move(r, id, 'review');
  assert.equal(res.code, 0, res.err);
  assert.equal(where(r, id), 'review');
}
function passReview(r, id) {
  const res = move(r, id, 'done');
  assert.equal(res.code, 0, res.err);
}

// ---------------------------------------------------------------------------

test('two tickets changing the same line end up in main with the tests passing, without the owner', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);

  // A renames one to single; B, at the same time, adds three right below one
  // and uses one in a new file.
  work(wa, { 'code.txt': 'def single\ndef two\n', 'uses.txt': 'single\n' });
  work(wb, { 'code.txt': 'def one\ndef three\ndef two\n', 'uses-b.txt': 'one\nthree\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    const t = run(testRun, wt, [id]);
    assert.equal(t.code, 0, t.err);
    toReview(r, id);
    passReview(r, id);
  }
  assert.equal(runCount(r), 2);

  const first = run(mergeSh, r.root, ['land', A]);
  assert.equal(first.code, 0, first.out + first.err);
  assert.match(first.out, /LANDED: ticket 261016300001 is in main/);
  assert.match(first.out, /tests carried from the run on this exact content, not run again/);
  assert.equal(runCount(r), 2, 'landing the first ticket ran the tests again');

  const before = head(r);
  const second = run(mergeSh, r.root, ['land', B]);
  assert.equal(second.code, 3, second.out + second.err);
  assert.match(second.out, /MERGE POSTPONED: ticket 261016300002/);
  assert.equal(head(r), before, 'main changed although the second ticket was sent back');
  assert.equal(where(r, B), 'in_progress');
  assert.match(notes(r, B), /merge postponed — main changed since ticket-261016300002 last took it in \(code\.txt uses\.txt\)/);

  // The worker brings main in, resolves the conflict, tests, commits.
  const sync = run(mergeSh, wb, ['sync', B]);
  assert.equal(sync.code, 1, sync.out + sync.err);
  assert.match(sync.out, /CONFLICT: .*\n {2}code\.txt/);
  work(wb, { 'code.txt': 'def single\ndef three\ndef two\n', 'uses-b.txt': 'single\nthree\n' }, 'resolve the conflict');
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);

  // The re-review reads exactly how the conflict was resolved.
  const res = run(mergeSh, r.root, ['resolution', B]);
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /^-<<<<<<< HEAD\n-def one\n-def three\n-=======\n def single\n->>>>>>> [0-9a-f]{40}\n\+def three$/m);
  assert.match(res.out, /^-one\n\+single\n three$/m);
  // What main brought in by itself is not part of it.
  assert.deepEqual([...res.out.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]), ['code.txt', 'uses-b.txt']);

  passReview(r, B);
  const third = run(mergeSh, r.root, ['land', B]);
  assert.equal(third.code, 0, third.out + third.err);
  assert.match(third.out, /LANDED/);

  // Main holds both, and its tests pass.
  assert.equal(show(r, 'HEAD', 'code.txt'), 'def single\ndef three\ndef two\n');
  const checkMain = spawnSync('sh', ['check.sh'], { cwd: r.root, encoding: 'utf8' });
  assert.equal(checkMain.status, 0, checkMain.stdout);
  // Nobody acknowledged anything, and nothing is left behind.
  assert.doesNotMatch(notes(r, A) + notes(r, B), /ack-unmerged|held for the owner/);
  assert.equal(git(r.root, 'branch', '--list', 'ticket-*'), '');
  assert.equal(fs.existsSync(wa) || fs.existsSync(wb), false);
});

test('bringing up to date that changes nothing beyond the automatic merge reads as empty to the reviewer', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'code.txt': 'def single\ndef two\n', 'uses.txt': 'single\n' });
  work(wb, { 'uses-b.txt': 'two\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  const first = run(mergeSh, r.root, ['resolution', B]);
  assert.match(first.out, /FIRST REVIEW/);
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);
  assert.equal(run(mergeSh, r.root, ['land', B]).code, 3);
  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  assert.match(run(mergeSh, wb, ['sync', B]).out, /UP TO DATE/);
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  const res = run(mergeSh, r.root, ['resolution', B]);
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /EMPTY: the branch is exactly the automatic merge; the worker changed no code\./);
  assert.doesNotMatch(res.out, /^diff /m);
});

test('a merge with no text conflict that makes the tests fail never reaches main', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'code.txt': 'def single\ndef two\n', 'uses.txt': 'single\n' });
  work(wb, { 'uses-b.txt': 'one\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);

  // Git would merge B without a word; land does not.
  const afterA = head(r);
  const land = run(mergeSh, r.root, ['land', B]);
  assert.equal(land.code, 3, land.out);
  assert.equal(head(r), afterA);
  assert.throws(() => show(r, 'HEAD', 'uses-b.txt'));

  // Brought up to date, the branch merges cleanly and its tests fail.
  const sync = run(mergeSh, wb, ['sync', B]);
  assert.equal(sync.code, 0, sync.out + sync.err);
  assert.match(sync.out, /MERGED/);
  const red = run(testRun, wb, [B]);
  assert.equal(red.code, 1);
  const refused = move(r, B, 'review');
  assert.equal(refused.code, 1);
  assert.match(refused.err, /UNTESTED: .*\n.*exited 1/);
  assert.match(refused.err, /REFUSED: 261016300002 was not moved to review/);
  assert.equal(where(r, B), 'in_progress');

  work(wb, { 'uses-b.txt': 'single\n' }, 'use the new name');
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  passReview(r, B);
  assert.equal(run(mergeSh, r.root, ['land', B]).code, 0);
  const checkMain = spawnSync('sh', ['check.sh'], { cwd: r.root, encoding: 'utf8' });
  assert.equal(checkMain.status, 0, checkMain.stdout);
});

test('to review only when the branch holds all of main\'s code and the latest test run tested that content', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'code.txt': 'def single\ndef two\n', 'uses.txt': 'single\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);

  // B was tested on the old main: refused, and the reason names what moved.
  work(wb, { 'uses-b.txt': 'two\n' });
  assert.equal(run(testRun, wb, [B]).code, 0);
  const stale = move(r, B, 'review');
  assert.equal(stale.code, 1);
  assert.match(stale.err, /STALE: main has changed since ticket-261016300002 last took it in:\n {2}code\.txt\n {2}uses\.txt/);
  assert.equal(where(r, B), 'in_progress');

  // Brought up to date but not tested again: refused.
  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  const untested = move(r, B, 'review');
  assert.equal(untested.code, 1);
  assert.match(untested.err, /UNTESTED/);

  // Tested, then changed and committed after the run: refused.
  assert.equal(run(testRun, wb, [B]).code, 0);
  work(wb, { 'uses-b.txt': 'two\nsingle\n' }, 'one more line');
  const changed = move(r, B, 'review');
  assert.equal(changed.code, 1);
  assert.match(changed.err, /UNTESTED: .*\n.*DIFFERENT/);

  // Tested on exactly what is committed: accepted, and the commit recorded.
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  const tip = git(r.root, 'rev-parse', `ticket-${B}`).trim();
  const mainNow = head(r);
  assert.match(notes(r, B), new RegExp(`review covers branch ticket-${B} at ${tip}, which holds main at ${mainNow} \\(code outside \\.kerjaan/\\); the latest test run passed on exactly this content\\.`));
});

test('the first ticket landed with no code change on main is not tested again, also when main changed only on the board', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  // The board is committed on main meanwhile; that is not main moving.
  git(r.root, 'add', '-A', '.kerjaan');
  git(r.root, 'commit', '-q', '-m', 'Board: A passed review');
  const boardOnly = head(r);
  const runs = runCount(r);

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.equal(runCount(r), runs, 'land ran the tests');
  // HEAD is land's commit of the ticket's note; the merge sits right under it.
  const merge = git(r.root, 'rev-parse', 'HEAD^').trim();
  assert.equal(git(r.root, 'rev-parse', `${merge}^1`).trim(), boardOnly);
  assert.equal(show(r, 'HEAD', 'uses.txt'), 'one\ntwo\n');
  assert.match(notes(r, A), new RegExp(`landed on main as ${merge}, merging ticket-${A} at [0-9a-f]{40}; tests carried`));
});

test('a branch changed after it went to review is sent back, not merged', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\none\n' }, 'quietly after review');
  assert.equal(run(testRun, wa, [A]).code, 0);
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 3, land.out + land.err);
  assert.match(notes(r, A), /merge postponed — ticket-261016300001 changed after it went to review/);
  assert.equal(where(r, A), 'in_progress');
  assert.equal(head(r), before);
});

test('without a note of the commit that went to review, the ticket is held for the owner', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const file = path.join(r.k, 'done', `${A} First ticket.md`);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^- .*review covers branch .*\n/m, ''));
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 1, land.out + land.err);
  assert.match(notes(r, A), /merge held for the owner — its Notes record no move to review covering a commit/);
  assert.equal(head(r), before);
});

test('a latest test run that failed after review holds the ticket for the owner', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  assert.equal(run(testRun, wa, [A], { TEST_FAIL: '1' }).code, 1);
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 1, land.out + land.err);
  assert.match(land.out, /HELD: ticket 261016300001/);
  assert.match(notes(r, A), /merge held for the owner — the latest test run does not vouch for ticket-261016300001 .*exited 1/);
  assert.equal(head(r), before);
});

test('main changing in the middle of a merge sends the ticket back instead of merging it', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);

  // A git that lets somebody commit to main just before land's merge runs.
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const bin = path.join(r.outside, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh
if [ "$1" = merge ] && [ "$3" = --no-commit ] && [ ! -e "$TEST_SNEAK" ]; then
  touch "$TEST_SNEAK"
  printf 'def sneak\\n' > "$TEST_MAIN/sneak.txt"
  ${JSON.stringify(realGit)} -C "$TEST_MAIN" add sneak.txt
  ${JSON.stringify(realGit)} -C "$TEST_MAIN" commit -q -m sneak
fi
exec ${JSON.stringify(realGit)} "$@"
`, { mode: 0o755 });
  const land = run(mergeSh, r.root, ['land', A], {
    PATH: `${bin}:${process.env.PATH}`, TEST_SNEAK: path.join(r.outside, 'sneak'), TEST_MAIN: r.root,
  });
  assert.ok(fs.existsSync(path.join(r.outside, 'sneak')), 'the race did not happen');
  assert.equal(land.code, 3, land.out + land.err);
  assert.match(notes(r, A), /merge postponed — main changed while the merge was being prepared \(sneak\.txt\)/);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), 'sneak');
  assert.equal(git(r.root, 'status', '--porcelain', '--untracked-files=no', '--', '.', ':(exclude).kerjaan'), '');
});

test('a failed merge holds only that ticket, gives the reason, and other tickets go on', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  work(wb, { 'uses-b.txt': 'two\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  // Somebody's uncommitted edit in the main tree sits on the file A changes.
  fs.writeFileSync(path.join(r.root, 'uses.txt'), 'one\n# owner note\n');
  const before = head(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /HELD: ticket 261016300001 was not merged into main and waits for the owner\.\nReason: git refused the merge: .*uses\.txt/);
  assert.match(notes(r, A), /merge held for the owner — git refused the merge: .*uses\.txt/);
  assert.equal(where(r, A), 'done');
  assert.equal(head(r), before);
  assert.equal(fs.readFileSync(path.join(r.root, 'uses.txt'), 'utf8'), 'one\n# owner note\n');

  // The other ticket lands; a new ticket starts without anyone acknowledging
  // A's branch; the ticket that depends on A waits.
  const other = run(mergeSh, r.root, ['land', B]);
  assert.equal(other.code, 0, other.out + other.err);
  const start = move(r, C, 'in_progress');
  assert.equal(start.code, 0, start.err);
  assert.match(start.err, /ticket-261016300001 is not in HEAD, but its merge is held for the owner/);
  const dependent = move(r, D, 'in_progress');
  assert.equal(dependent.code, 1);
  assert.match(dependent.err, /blocked_by 261016300001, whose merge into main is held/);
  assert.equal(where(r, D), 'todo');

  // Once the owner clears the way, the same command takes it on: main has
  // moved meanwhile (B landed), so it goes back to its worker first.
  fs.writeFileSync(path.join(r.root, 'uses.txt'), 'one\n');
  const again = run(mergeSh, r.root, ['land', A]);
  assert.equal(again.code, 3, again.out + again.err);
  assert.equal(run(mergeSh, wa, ['sync', A]).code, 0);
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const last = run(mergeSh, r.root, ['land', A]);
  assert.equal(last.code, 0, last.out + last.err);
  assert.equal(show(r, 'HEAD', 'uses.txt'), 'one\ntwo\n');
  assert.equal(show(r, 'HEAD', 'uses-b.txt'), 'two\n');
  assert.equal(move(r, D, 'in_progress').code, 0);
});

test('a ticket coming back from review or done is not a new start: not refused over another branch', () => {
  const r = repo();
  git(r.root, 'checkout', '-q', '-b', 'experiment');
  fs.writeFileSync(path.join(r.root, 'trial.txt'), 'trial\n');
  git(r.root, 'add', 'trial.txt');
  git(r.root, 'commit', '-q', '-m', 'trial');
  git(r.root, 'checkout', '-q', 'main');
  assert.equal(move(r, A, 'review').code, 0);
  const back = move(r, A, 'in_progress');
  assert.equal(back.code, 0, back.err);
  const start = move(r, C, 'in_progress');
  assert.equal(start.code, 1);
  assert.match(start.err, /experiment/);
});

test('a ticket worked directly in the main tree is not affected', () => {
  const r = repo();
  fs.writeFileSync(path.join(r.root, 'uses.txt'), 'one\ntwo\n');
  toReview(r, A);
  assert.doesNotMatch(notes(r, A), /review covers/);
  passReview(r, A);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.err);
  assert.match(land.out, /NOTHING TO LAND/);
  assert.match(run(mergeSh, r.root, ['check', B]).out, /NOTHING SEPARATE/);
});

test('sync runs only in that ticket\'s worktree, with every change committed', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  const inMain = run(mergeSh, r.root, ['sync', A]);
  assert.equal(inMain.code, 1);
  assert.match(inMain.err, /inside the ticket's worktree/);
  const wrong = run(mergeSh, wb, ['sync', A]);
  assert.equal(wrong.code, 1);
  assert.match(wrong.err, /not on a branch carrying 261016300001/);
  fs.writeFileSync(path.join(wa, 'uses.txt'), 'not yet\n');
  const dirty = run(mergeSh, wa, ['sync', A]);
  assert.equal(dirty.code, 1);
  assert.match(dirty.err, /REFUSED: this worktree has changes that are not committed/);
});

test('only a ticket in done is merged, and only from the main tree', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  const early = run(mergeSh, r.root, ['land', A]);
  assert.equal(early.code, 2);
  assert.match(early.err, /REFUSED: 261016300001 is in review/);
  passReview(r, A);
  const fromWorktree = run(mergeSh, wa, ['land', A]);
  assert.equal(fromWorktree.code, 1);
  assert.match(fromWorktree.err, /linked git worktree/);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  // The branch is gone, and nothing on the way said it was kept.
  assert.equal(git(r.root, 'branch', '--list', `ticket-${A}`).trim(), '');
  assert.equal(fs.existsSync(wa), false);
  assert.doesNotMatch(land.out + land.err, /kept/);
  assert.match(land.out, new RegExp(`Branch ticket-${A} is merged into main and deleted\\.`));
});

// Holds a lock the way another live process would, and reports whether the
// step under test was still waiting when the lock was let go.
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

test('landing waits for the merge lock', async () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const before = head(r);
  const { waitedWhileHeld, res } = await heldLock(r, 'merge', () => runAsync(mergeSh, r.root, ['land', A]));
  assert.equal(waitedWhileHeld, true, 'land merged while the merge lock was held');
  assert.equal(res.code, 0, res.out + res.err);
  assert.notEqual(head(r), before);
});

// Every note land writes is made under the board lock, with the refresh of the
// ticket after it, so a ticket being moved from elsewhere at that moment cannot
// write its copy back over the note. Checked per kind of note: while another
// live process holds the lock, the note is not there yet.
async function noteWaitsForBoard(r, record) {
  const lock = path.join(r.root, '.git', 'kerjaan-locks', 'board.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${process.pid}\tthe test holding the board lock\n`);
  let done = false;
  const running = runAsync(mergeSh, r.root, ['land', A]).then((res) => { done = true; return res; });
  await sleep(2500);
  const whileHeld = { done, written: record.test(notes(r, A)) };
  fs.rmSync(lock, { recursive: true });
  return { whileHeld, res: await running };
}

for (const [kind, prepare, record, code] of [
  ['"landed on"', () => {}, /landed on main as /, 0],
  ['"merge postponed"', (r, wa) => {
    work(wa, { 'uses.txt': 'one\ntwo\none\n' }, 'quietly after review');
    assert.equal(run(testRun, wa, [A]).code, 0);
  }, /merge postponed — /, 3],
  ['"merge held for the owner"', (r) => {
    const file = path.join(r.k, 'done', `${A} First ticket.md`);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^- .*review covers branch .*\n/m, ''));
  }, /merge held for the owner — /, 1],
]) {
  test(`land's ${kind} note waits for the board lock`, async () => {
    const r = repo();
    const wa = add(r, A);
    work(wa, { 'uses.txt': 'one\ntwo\n' });
    assert.equal(run(testRun, wa, [A]).code, 0);
    toReview(r, A);
    passReview(r, A);
    prepare(r, wa);
    const { whileHeld, res } = await noteWaitsForBoard(r, record);
    assert.deepEqual(whileHeld, { done: false, written: false }, 'land wrote its note while the board lock was held');
    assert.equal(res.code, code, res.out + res.err);
    assert.match(res.err, /Waiting for the board lock, held by the test holding the board lock/);
    assert.match(notes(r, A), record);
  });
}

test('two landings started at the same moment take turns', async () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  work(wb, { 'uses-b.txt': 'two\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  const both = await Promise.all([runAsync(mergeSh, r.root, ['land', A]), runAsync(mergeSh, r.root, ['land', B])]);
  // Whichever went first changed main's code, so the other is sent back.
  assert.deepEqual(both.map((x) => x.code).sort(), [0, 3], both.map((x) => x.out + x.err).join('\n'));
  assert.equal(git(r.root, 'log', '--merges', '--format=%s').trim().split('\n').length, 1);
});

test('the reviewer\'s tests queue on the same tests lock as the worker\'s, and are not recorded', async () => {
  const r = repo();
  const wa = add(r, A);
  const { waitedWhileHeld, res } = await heldLock(r, 'tests',
    () => runAsync(testRun, r.root, ['--review', A, '--dir', wa]));
  assert.equal(waitedWhileHeld, true, 'the reviewer ran its tests while the test lock was held');
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the tests lock, held by the test holding the lock/);
  assert.match(res.err, new RegExp(`Reviewer's run in ${wa}: .* exited 0`));
  assert.doesNotMatch(notes(r, A), /test run/);

  // A worker's run and a reviewer's run started together never overlap.
  fs.rmSync(r.sequence, { force: true });
  const worker = runAsync(testRun, wa, [A], { TEST_SLEEP: '1' });
  const t0 = Date.now();
  while (!(fs.existsSync(r.sequence) && fs.readFileSync(r.sequence, 'utf8').includes(`start ${A}`))) {
    assert.ok(Date.now() - t0 < 15000, 'the worker run never started');
    await sleep(50);
  }
  const reviewer = runAsync(testRun, r.root, ['--review', B], { TEST_SLEEP: '1' });
  const [rw, rr] = await Promise.all([worker, reviewer]);
  assert.equal(rw.code, 0, rw.err);
  assert.equal(rr.code, 0, rr.err);
  assert.match(rr.err, /Waiting for the tests lock, held by ticket 261016300001/);
  assert.deepEqual(fs.readFileSync(r.sequence, 'utf8').trim().split('\n'), [`start ${A}`, `end ${A}`, `start ${B}`, `end ${B}`]);
  assert.match(notes(r, A), /test run — .* exited 0/);
  assert.doesNotMatch(notes(r, B), /test run/);

  // A command of its own, in another directory, still takes its turn.
  const own = await heldLock(r, 'tests',
    () => runAsync(testRun, r.root, ['--review', A, '--dir', r.outside, '--', 'pwd > pwd.txt && echo "$KERJAAN_WORKTREE" >> pwd.txt']));
  assert.equal(own.waitedWhileHeld, true);
  assert.equal(own.res.code, 0, own.res.err);
  assert.equal(fs.readFileSync(path.join(r.outside, 'pwd.txt'), 'utf8'), `${r.outside}\n${r.outside}\n`);

  // Its command fails the way the suite does.
  const red = run(testRun, wa, ['--review', A], { TEST_FAIL: '1' });
  assert.equal(red.code, 1);
});

// ---------------------------------------------------------------------------
// Every note land writes into a ticket is committed by land itself, in a
// commit holding only that ticket's file, so the main tree is left as clean as
// land found it — and nothing else uncommitted there is swept into that commit.

// What the foreman does after each board move: commit the board.
function commitBoard(r, msg = 'Board') {
  git(r.root, 'add', '-A', '--', '.kerjaan');
  git(r.root, 'commit', '-q', '-m', msg);
}
const status = (r) => git(r.root, 'status', '--porcelain', '--untracked-files=all');
const lastFiles = (r) => git(r.root, 'show', '--no-renames', '--name-status', '--format=', 'HEAD').trim().split('\n');
const ticketPath = (r, id) => {
  const s = where(r, id);
  const f = fs.readdirSync(path.join(r.k, s)).find((n) => n.startsWith(id));
  return `.kerjaan/${s}/${f}`;
};

test('landing commits its own "landed on main" note, and the next landing runs right away', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'code.txt': 'def single\ndef two\n', 'uses.txt': 'single\n' });
  work(wb, { 'uses-b.txt': 'two\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  commitBoard(r, 'Board: A and B passed review');
  assert.equal(status(r), '');

  const first = run(mergeSh, r.root, ['land', A]);
  assert.equal(first.code, 0, first.out + first.err);
  const merge = git(r.root, 'rev-parse', 'HEAD^').trim();
  // Step 3: the main tree is clean.
  assert.equal(status(r), '', 'land left the main tree dirty');
  // The note is in the ticket, and history shows when it was committed: the
  // commit right after the merge, holding only the ticket's file.
  const fileA = ticketPath(r, A);
  assert.match(show(r, 'HEAD', fileA), new RegExp(`landed on main as ${merge}, merging ticket-${A}`));
  assert.doesNotMatch(show(r, 'HEAD^', fileA), /landed on main/);
  assert.deepEqual(lastFiles(r), [`M\t${fileA}`]);
  assert.match(git(r.root, 'log', '-1', '--format=%s').trim(), new RegExp(`^Board: ${A} landed on main as ${merge.slice(0, 12)}$`));
  assert.match(first.out, new RegExp(`Note committed: [0-9a-f]+ Board: ${A} landed on main`));

  // Step 4: the second landing runs with nobody in between. Main's code moved,
  // so it is sent back — the move recorded in a commit of its own as well.
  const second = run(mergeSh, r.root, ['land', B]);
  assert.equal(second.code, 3, second.out + second.err);
  assert.equal(status(r), '', 'sending back left the main tree dirty');
  assert.deepEqual(lastFiles(r).sort(), [`A\t${ticketPath(r, B)}`, `D\t.kerjaan/done/${B} Second ticket.md`].sort());
  assert.match(show(r, 'HEAD', ticketPath(r, B)), /merge postponed — main changed/);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Board: ${B} back to in_progress, merge postponed`);

  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  passReview(r, B);
  commitBoard(r, 'Board: B passed review again');
  const third = run(mergeSh, r.root, ['land', B]);
  assert.equal(third.code, 0, third.out + third.err);
  assert.match(third.out, /LANDED/);
  assert.equal(status(r), '');
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, B)}`]);
  assert.doesNotMatch(notes(r, A) + notes(r, B), /held for the owner/);
});

test('a "held" note is committed by itself too, without taking along changes already in the main tree', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  // Somebody's staged change, which makes git refuse the merge, and an
  // unstaged one beside it.
  fs.writeFileSync(path.join(r.root, 'code.txt'), 'def one\ndef two\ndef staged\n');
  git(r.root, 'add', 'code.txt');
  fs.writeFileSync(path.join(r.root, 'check.sh'), `${check}# not yet committed\n`);
  const before = status(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /HELD: ticket 261016300001/);
  assert.match(show(r, 'HEAD', ticketPath(r, A)), /merge held for the owner — git refused the merge/);
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, A)}`]);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Board: ${A} merge held for the owner`);
  // Everything that was uncommitted is still uncommitted, staged as before.
  assert.equal(status(r), before);
  assert.equal(git(r.root, 'diff', '--cached', '--name-only').trim(), 'code.txt');
  assert.equal(fs.readFileSync(path.join(r.root, 'code.txt'), 'utf8'), 'def one\ndef two\ndef staged\n');
});

test('other changes in the main tree are not committed along with the "landed on main" note', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  // Uncommitted work of every kind the merge does not touch: a changed code
  // file, a new file, another ticket edited, a new ticket.
  fs.writeFileSync(path.join(r.root, 'check.sh'), `${check}# not yet committed\n`);
  fs.writeFileSync(path.join(r.root, 'new.txt'), 'new\n');
  const fileC = path.join(r.k, 'todo', `${C} Third ticket.md`);
  fs.appendFileSync(fileC, '- owner note not yet committed\n');
  fs.writeFileSync(path.join(r.k, 'backlog', '261016300009 Idea.md'), ticket('Idea'));
  const before = status(r);
  assert.equal(before.trim().split('\n').length, 4);

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED/);
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, A)}`]);
  assert.match(show(r, 'HEAD', ticketPath(r, A)), /landed on main as/);
  assert.equal(status(r), before);
  assert.match(fs.readFileSync(fileC, 'utf8'), /owner note not yet committed/);
  assert.doesNotMatch(show(r, 'HEAD', `.kerjaan/todo/${C} Third ticket.md`), /owner note/);
});

test('a ticket that already had uncommitted changes is not committed along with its note', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  const fileA = path.join(r.root, ticketPath(r, A));
  fs.appendFileSync(fileA, '- owner note not yet committed\n');

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED/);
  assert.match(land.out, /NOTE NOT COMMITTED: \.kerjaan\/done\/261016300001 First ticket\.md already had uncommitted changes/);
  // HEAD is the merge itself; the ticket's file, with both lines, waits.
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Merge ticket-${A} into main (ticket ${A})`);
  assert.doesNotMatch(show(r, 'HEAD', ticketPath(r, A)), /owner note|landed on main/);
  const body = fs.readFileSync(fileA, 'utf8');
  assert.match(body, /owner note not yet committed/);
  assert.match(body, /landed on main as/);
});

test('in a main tree on no branch, the "held" note is not committed onto the detached HEAD', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  git(r.root, 'checkout', '-q', '--detach');
  const before = head(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /NOTE NOT COMMITTED: the main tree is on no branch/);
  assert.match(held.out, /HELD: ticket 261016300001/);
  assert.equal(head(r), before);
  assert.match(notes(r, A), /merge held for the owner — the main tree is on no branch/);
});

// --- shortcuts the owner takes (261016141908) --------------------------------

// The reviewer's rejection: the move back that a sent-back verdict makes.
function rejectReview(r, id) {
  const res = move(r, id, 'in_progress');
  assert.equal(res.code, 0, res.err);
}

test('a ticket the owner accepted after two rejections lands on main like one that passed', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  rejectReview(r, A);
  work(wa, { 'uses.txt': 'one\ntwo\none\n' }, 'round 2 fix');
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  rejectReview(r, A);
  // The owner accepts it over the findings; the foreman moves it to done.
  const accept = move(r, A, 'done');
  assert.equal(accept.code, 0, accept.err);
  assert.equal(where(r, A), 'done');

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED: ticket 261016300001 is in main/);
  assert.equal(show(r, 'HEAD', 'uses.txt'), 'one\ntwo\none\n');
  assert.equal(git(r.root, 'branch', '--list', `ticket-${A}`).trim(), '');
  assert.equal(fs.existsSync(wa), false);
});

test('a ticket the owner accepted after main moved is postponed, brought up to date, and still reaches main', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'uses.txt': 'one\ntwo\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  rejectReview(r, A);
  toReview(r, A);
  rejectReview(r, A);
  // Meanwhile B passes and lands: main's code moves.
  work(wb, { 'uses-b.txt': 'two\n' });
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  passReview(r, B);
  assert.equal(run(mergeSh, r.root, ['land', B]).code, 0);

  assert.equal(move(r, A, 'done').code, 0);
  const postponed = run(mergeSh, r.root, ['land', A]);
  assert.equal(postponed.code, 3, postponed.out + postponed.err);
  assert.equal(where(r, A), 'in_progress');
  // The worker brings main in, tests, hands over; the review after the merge
  // postponed passes it, and it lands.
  assert.equal(run(mergeSh, wa, ['sync', A]).code, 0);
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.equal(show(r, 'HEAD', 'uses.txt'), 'one\ntwo\n');
  assert.equal(show(r, 'HEAD', 'uses-b.txt'), 'two\n');
});

test('"mark it done" on a ticket in todo: straight to review is refused, through in_progress and the tests is accepted', () => {
  const r = repo();
  // The foreman's shortcut the guide used to give: tick and move to review.
  const direct = move(r, C, 'review');
  assert.equal(direct.code, 1);
  assert.match(direct.err, /REFUSED: 261016300003 was not moved to review/);
  assert.equal(where(r, C), 'todo');

  // The path the guide gives now: start, the worker's checks, review, done.
  // A and B are in in_progress too, with no branches, so the start is clean.
  const start = move(r, C, 'in_progress');
  assert.equal(start.code, 0, start.err);
  const t = run(testRun, r.root, [C]);
  assert.equal(t.code, 0, t.err);
  toReview(r, C);
  assert.match(notes(r, C), /test run — `.*` exited 0 after .*, on content fingerprint [0-9a-f]+/);
  passReview(r, C);
  assert.equal(where(r, C), 'done');
});
