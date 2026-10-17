// Every board change of a chain is committed by whoever made it, and one
// ticket worked in the main tree takes at most three commits: the foreman's
// start, the worker's work together with its move to review, and the
// reviewer's verdict. Side by side, the code is committed on the branch and the
// ticket's file in the main tree, and land finds nothing left uncommitted.
//
// The git commands are not written here: each test takes them from the code
// block of the document the agent follows (SKILL.md, foreman.md, the worker
// and reviewer definitions), fills in the placeholders and runs them, so a
// document whose commands leave something behind turns these tests red.
//
// Every test builds a throwaway repository with a board, and the work of
// somebody else in it — a staged file and a ticket edited by hand — that no
// commit of the chain may take along.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const updateTicket = path.join(scripts, 'update-ticket.sh');
const worktreeSh = path.join(scripts, 'worktree.sh');
const mergeSh = path.join(scripts, 'merge.sh');
const testRun = path.join(scripts, 'test-run.sh');

const doc = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');

const T = '261017100001'; // the ticket worked
const X = '261017100002'; // cancelled by the foreman, no code behind it
const Y = '261017100003'; // edited by hand by somebody else
const N = '261017100004'; // moved from backlog to todo by the foreman

const gitEnv = {
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
  KERJAAN_LOCK_POLL: '0.2',
};

function ticket(title, status) {
  return `---
type: feature
priority: medium
review: quick
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-17 08:00:00
updated: 2026-10-17 08:00:00
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
- 2026-10-17 08:00:00 ${status}

## Notes
(none yet)
`;
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

function run(script, cwd, args) {
  const r = spawnSync('bash', [script, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv }, timeout: 60000,
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function repo(testCommand = '', staged = true) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-commit-')));
  const root = path.join(base, 'repo');
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  fs.writeFileSync(path.join(k, 'settings.md'), `---
language: Bahasa Indonesia
test_command: ${testCommand}
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(k, 'todo', `${T} Tiket yang dikerjakan.md`), ticket('Tiket yang dikerjakan', 'todo'));
  fs.writeFileSync(path.join(k, 'todo', `${X} Tiket yang dibatalkan.md`), ticket('Tiket yang dibatalkan', 'todo'));
  fs.writeFileSync(path.join(k, 'backlog', `${Y} Tiket orang lain.md`), ticket('Tiket orang lain', 'backlog'));
  fs.writeFileSync(path.join(k, 'backlog', `${N} Tiket baru ke todo.md`), ticket('Tiket baru ke todo', 'backlog'));
  fs.writeFileSync(path.join(k, 'order.md'), `**Grup.**\n\n- ${T} Tiket yang dikerjakan\n- ${X} Tiket yang dibatalkan\n`);
  fs.writeFileSync(path.join(root, 'kode.txt'), 'satu\n');
  fs.writeFileSync(path.join(root, 'lain.txt'), 'punya orang lain\n');
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  // Somebody else's work in the tree: a staged change (none when land is to
  // merge, which git refuses over a staged index), and a ticket edited by hand.
  if (staged) {
    fs.appendFileSync(path.join(root, 'lain.txt'), 'diubah dan di-stage\n');
    git(root, 'add', 'lain.txt');
  }
  fs.appendFileSync(path.join(k, 'backlog', `${Y} Tiket orang lain.md`), '- Catatan tangan.\n');
  return { base, root, k, staged, start: git(root, 'rev-parse', 'HEAD').trim() };
}

// The first ```bash block after `anchor` in a document.
function block(text, anchor) {
  const at = text.indexOf(anchor);
  assert.ok(at >= 0, `anchor not found: ${anchor}`);
  const m = text.slice(at).match(/```bash\n([\s\S]*?)```/);
  assert.ok(m, `no bash block after: ${anchor}`);
  return m[1];
}

// Fill the placeholders of a documented block and run it in `cwd`.
function perform(cwd, commands, { id, files = '', message, others = [], mainTree = '' }) {
  const otherPatterns = others.map((o) => `'.kerjaan/*/${o} *'`).join(' ');
  const script = commands
    .replace(/ \['\.kerjaan\/\*\/<other id> \*' \.\.\.\]/g, otherPatterns ? ` ${otherPatterns}` : '')
    .replaceAll('<main tree>', `'${mainTree}'`)
    .replaceAll('<files>', files)
    .replaceAll('<message>', message)
    .replaceAll('<id>', id);
  assert.doesNotMatch(script, /<[a-z ]+>/, `a placeholder is left: ${script}`);
  const r = spawnSync('bash', ['-euc', script], { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `${script}\n${r.stdout}${r.stderr}`);
}

const foremanStart = () => block(doc('skills', 'kerjaan', 'references', 'foreman.md'), 'Then commit the start');
const workerMain = () => block(doc('agents', 'kerjaan-worker.md'), 'In the main tree — no worktree — code and ticket go in one commit');
const workerWorktree = () => block(doc('agents', 'kerjaan-worker.md'), 'The ticket\'s file is committed in the\nmain tree');
const reviewerVerdict = () => block(doc('agents', 'kerjaan-reviewer.md'), '**Commit your verdict**');

const move = (r, id, status) => {
  const res = run(updateTicket, r.root, [id, '--status', status]);
  assert.equal(res.code, 0, res.out + res.err);
};
const appendNote = (r, id, line) => {
  for (const s of fs.readdirSync(r.k)) {
    const dir = path.join(r.k, s);
    if (!fs.statSync(dir).isDirectory()) continue;
    const f = fs.readdirSync(dir).find((n) => n.startsWith(id));
    if (f) { fs.appendFileSync(path.join(dir, f), `${line}\n`); return; }
  }
  throw new Error(`no ticket ${id}`);
};
const filesOf = (r, rev) => git(r.root, 'show', '--name-status', '--format=', '--no-renames', rev)
  .trim().split('\n').filter(Boolean).sort();
// Everything uncommitted in the tree must be exactly the other person's work.
const othersOnly = (r) => {
  const st = git(r.root, 'status', '--porcelain', '--untracked-files=all').trimEnd().split('\n').sort();
  const expected = [` M ".kerjaan/backlog/${Y} Tiket orang lain.md"`];
  if (r.staged) expected.push('M  lain.txt');
  assert.deepEqual(st, expected.sort());
};

// The foreman's part before the worker: a cancel, a ticket moved into todo,
// the start move, then the start commit carrying all of its own.
function foremanStarts(r) {
  move(r, X, 'cancel');
  move(r, N, 'todo');
  move(r, T, 'in_progress');
  perform(r.root, foremanStart(), { id: T, message: `Papan: ${T} mulai dikerjakan`, others: [X, N] });
  othersOnly(r);
  return git(r.root, 'rev-parse', 'HEAD').trim();
}

// The worker in the main tree: code, the move to review, one commit.
function workerHandsOver(r, body) {
  fs.writeFileSync(path.join(r.root, 'kode.txt'), body);
  fs.writeFileSync(path.join(r.root, `baru-${body.length}.txt`), 'berkas baru\n');
  move(r, T, 'review');
  perform(r.root, workerMain(), { id: T, files: `kode.txt baru-${body.length}.txt`, message: `${T}: kerja` });
  othersOnly(r);
}

function reviewerDecides(r, verdict) {
  appendNote(r, T, `- 2026-10-17: Reviewed at level quick, round 1, at commit abc: ${verdict}.`);
  move(r, T, verdict === 'passed' ? 'done' : 'in_progress');
  perform(r.root, reviewerVerdict(), { id: T, message: `Papan: ${T} ${verdict}` });
  othersOnly(r);
}

test('satu tiket biasa di main tree, dari mulai sampai done, menjadi tiga commit dan tidak meninggalkan perubahan papan', () => {
  const r = repo();
  const started = foremanStarts(r);
  // Start: the ticket's move, order.md, and the foreman's own moves with no code.
  assert.deepEqual(filesOf(r, started), [
    `A\t.kerjaan/cancel/${X} Tiket yang dibatalkan.md`,
    `A\t.kerjaan/in_progress/${T} Tiket yang dikerjakan.md`,
    `A\t.kerjaan/todo/${N} Tiket baru ke todo.md`,
    `D\t.kerjaan/backlog/${N} Tiket baru ke todo.md`,
    `D\t.kerjaan/todo/${T} Tiket yang dikerjakan.md`,
    `D\t.kerjaan/todo/${X} Tiket yang dibatalkan.md`,
    'M\t.kerjaan/order.md',
  ].sort());

  workerHandsOver(r, 'dua\n');
  // Work: code and ticket in one commit, the ticket already in review.
  assert.deepEqual(filesOf(r, 'HEAD'), [
    `A\t.kerjaan/review/${T} Tiket yang dikerjakan.md`,
    'A\tbaru-4.txt',
    `D\t.kerjaan/in_progress/${T} Tiket yang dikerjakan.md`,
    'M\tkode.txt',
  ].sort());

  reviewerDecides(r, 'passed');
  // Verdict: the ticket's file, and order.md, which loses its line once it is done.
  assert.deepEqual(filesOf(r, 'HEAD'), [
    `A\t.kerjaan/done/${T} Tiket yang dikerjakan.md`,
    `D\t.kerjaan/review/${T} Tiket yang dikerjakan.md`,
    'M\t.kerjaan/order.md',
  ].sort());
  assert.equal(git(r.root, 'show', 'HEAD:.kerjaan/order.md'), '');
  assert.match(git(r.root, 'show', `HEAD:.kerjaan/done/${T} Tiket yang dikerjakan.md`), /Reviewed at level quick, round 1, at commit abc: passed\./);

  assert.equal(Number(git(r.root, 'rev-list', '--count', `${r.start}..HEAD`).trim()), 3);
});

test('tiket yang dikembalikan peninjau: putusan itu juga tersimpan, dan tiap putaran menambah satu commit kerja dan satu putusan', () => {
  const r = repo();
  foremanStarts(r);
  workerHandsOver(r, 'dua\n');
  reviewerDecides(r, 'sent back');
  assert.deepEqual(filesOf(r, 'HEAD'), [
    `A\t.kerjaan/in_progress/${T} Tiket yang dikerjakan.md`,
    `D\t.kerjaan/review/${T} Tiket yang dikerjakan.md`,
  ].sort());
  workerHandsOver(r, 'dua\ntiga\n');
  reviewerDecides(r, 'passed');
  assert.equal(Number(git(r.root, 'rev-list', '--count', `${r.start}..HEAD`).trim()), 5);
});

test('kerja berdampingan: kode di cabang, berkas tiket di main tree, putusan tersimpan, dan land menyimpan catatannya sendiri', () => {
  const r = repo('true', false);
  foremanStarts(r);
  const wt = path.join(r.base, `wt-${T}`);
  const add = run(worktreeSh, r.root, ['add', T, wt]);
  assert.equal(add.code, 0, add.out + add.err);
  assert.equal(fs.existsSync(path.join(wt, '.kerjaan')), false);

  // The worker: code committed on its branch, tested, moved, then the ticket
  // committed in the main tree with the command its definition gives.
  fs.writeFileSync(path.join(wt, 'kode.txt'), 'dua\n');
  git(wt, 'add', '--', 'kode.txt');
  git(wt, 'commit', '-q', '-m', `${T}: kerja`);
  const t = run(testRun, wt, [T]);
  assert.equal(t.code, 0, t.out + t.err);
  move(r, T, 'review');
  perform(wt, workerWorktree(), { id: T, message: `Papan: ${T} masuk review`, mainTree: r.root });
  othersOnly(r);
  assert.deepEqual(filesOf(r, 'main'), [
    `A\t.kerjaan/review/${T} Tiket yang dikerjakan.md`,
    `D\t.kerjaan/in_progress/${T} Tiket yang dikerjakan.md`,
  ].sort());
  // No commit on the branch carries the board.
  assert.equal(git(r.root, 'log', '--format=%h', `main..tiket-${T}`, '--', '.kerjaan').trim(), '');

  reviewerDecides(r, 'passed');

  const land = run(mergeSh, r.root, ['land', T]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED/);
  assert.match(land.out, /Note committed: /);
  assert.doesNotMatch(land.out, /NOTE NOT COMMITTED/);
  othersOnly(r);
  assert.equal(git(r.root, 'show', 'main:kode.txt'), 'dua\n');
});

// The command and the moves with no code behind them are in SKILL.md, which
// every session reads; how one ticket's work splits into commits is in the
// foreman's guide, which SKILL.md points at (261016141909).
test('docs: the foreman guide gives the three commits and who makes each, SKILL.md the same command the agents run', () => {
  const skill = doc('skills', 'kerjaan', 'SKILL.md');
  const section = skill.split('### Committing')[1].split('\n## ')[0];
  assert.match(section.replace(/\s+/g, ' '), /`references\/foreman\.md`, "Commits"/);
  const foremanGuide = doc('skills', 'kerjaan', 'references', 'foreman.md');
  const commits = foremanGuide.split('\n## Commits\n')[1].split('\n## ')[0];
  assert.match(commits, /\*\*One ticket worked in the main tree is at most three commits\*\*/);
  assert.match(commits, /1\. \*\*Start\*\* — the foreman/);
  assert.match(commits, /2\. \*\*Work\*\* — the worker, after its move to `review`/);
  assert.match(commits, /3\. \*\*Verdict\*\* — the reviewer/);
  // Written once: SKILL.md does not repeat the list.
  assert.doesNotMatch(skill, /at most three commits\*\*/);
  // Side by side asks nothing impossible: no commit of code and ticket together.
  const side = commits.split('**Side by side**')[1].split('\n\n')[0].replace(/\s+/g, ' ');
  assert.match(side, /code and ticket cannot share a commit/);
  assert.match(side, /commits its code on its branch/);
  assert.match(side, /its ticket's file in the main tree/);
  // Moves with no code are never left out.
  assert.match(section, /\*\*A move with no code behind it\*\* — a ticket created, moved to `backlog`,\n`todo` or `cancel`/);
  assert.match(section, /goes in the next commit of\nwhoever made it, never left out/);
  // One form of the command, in SKILL.md and in each agent.
  const form = block(section, '**Every commit names its paths**');
  assert.equal(form, workerMain());
  assert.equal(reviewerVerdict(), form.replaceAll('<files> ', '').replaceAll("'.kerjaan/*/<id> *'", "'.kerjaan/*/<id> *' .kerjaan/order.md"));
  assert.equal(workerWorktree(), form.replaceAll('<files> ', '').replaceAll('git ', 'git -C <main tree> '));
  for (const text of [form, foremanStart(), workerMain(), workerWorktree(), reviewerVerdict()]) {
    assert.doesNotMatch(text, /git add (-A|\.)\s*$/m);
  }
});

test('docs: the reviewer commits its verdict and nothing else, and the foreman leaves it to the reviewer', () => {
  const reviewer = doc('agents', 'kerjaan-reviewer.md');
  assert.doesNotMatch(reviewer.replace(/\s+/g, ' '), /\bno `commit`/i);
  assert.match(reviewer, /the only\ncommit you make is your verdict's, holding that ticket and `order\.md` alone/);
  assert.match(reviewer, /\*\*Commit your verdict\*\*, either way, right after the move/);
  const foreman = doc('skills', 'kerjaan', 'references', 'foreman.md');
  assert.match(foreman, /its reviewer committed the\n {2}verdict; there is nothing of it for you to commit/);
  assert.match(foreman, /first commit any\nboard change of your own still uncommitted/);
  const worker = doc('agents', 'kerjaan-worker.md');
  // The worker is told where each part goes when side by side.
  assert.match(worker, /In a worktree, there is no `\.kerjaan\/` to commit/);
  assert.match(worker, /Your code is already committed on your branch, in the worktree/);
  assert.match(foreman, /code is committed\n\s+on its branch there, the ticket's file in the main tree/);
});
