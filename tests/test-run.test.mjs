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
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
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
Sesuatu.

## Request
Sesuatu.

## Done when
- [ ] Butir

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
language: Bahasa Indonesia
test_command: ${testCommand}
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(root, '.kerjaan', 'in_progress', `${A} Tiket.md`), ticketText(notes));
  fs.writeFileSync(path.join(root, 'a.js'), 'a\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return root;
}

function run(root, ...args) {
  const r = spawnSync('bash', [testRun, ...args], { cwd: root, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// awk -v reads its value as a string literal: `\d` became `d` and `\t` a tab,
// so the recorded command no longer matched settings.md and --check said
// NO EVIDENCE.
const command = String.raw`true pola \d+ di C:\temp`;

for (const [where, notes] of [
  ['the first note, replacing "(none yet)"', '(none yet)'],
  ['a note after earlier ones', '- 2026-10-16 20:00:01: catatan lain'],
]) {
  test(`a test_command with backslashes is recorded whole as ${where}, and --check accepts it`, () => {
    const root = repo(command, notes);
    const r = run(root, A);
    assert.equal(r.code, 0, r.err);
    const file = path.join(root, '.kerjaan', 'in_progress', `${A} Tiket.md`);
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
const ticketFile = (root) => path.join(root, '.kerjaan', 'in_progress', `${A} Tiket.md`);
const records = (root) => fs.readFileSync(ticketFile(root), 'utf8').split('\n').filter((l) => l.includes(': test run — '));

test('an untracked file is part of what the run vouches for: changing it, or adding one, is DIFFERENT', () => {
  const root = repo('true', '(none yet)');
  fs.writeFileSync(path.join(root, 'baru.js'), 'satu\n');
  assert.equal(run(root, A).code, 0);
  assert.match(records(root)[0], /on content fingerprint [0-9a-f]{40,64} \(the same before and after the run/);
  assert.equal(git(root, 'status', '--porcelain', '--', 'baru.js'), '?? baru.js', 'the real index is not touched');
  let chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);

  fs.writeFileSync(path.join(root, 'baru.js'), 'dua\n');
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /^DIFFERENT: /);
  assert.match(chk.out, /\n {2}M\tbaru\.js\n/);

  fs.writeFileSync(path.join(root, 'baru.js'), 'satu\n');
  fs.writeFileSync(path.join(root, 'lain.js'), 'x\n');
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /\n {2}A\tlain\.js\n/);

  fs.rmSync(path.join(root, 'lain.js'));
  fs.rmSync(path.join(root, 'baru.js'));
  chk = run(root, '--check', A);
  assert.equal(chk.code, 1, chk.out);
  assert.match(chk.out, /\n {2}D\tbaru\.js\n/);
});

test('ignored files and the board are outside the fingerprint', () => {
  const root = repo('true', '(none yet)');
  fs.writeFileSync(path.join(root, '.gitignore'), '*.log\n');
  git(root, 'add', '.gitignore');
  git(root, 'commit', '-q', '-m', 'abaikan log');
  assert.equal(run(root, A).code, 0);
  fs.writeFileSync(path.join(root, 'jejak.log'), 'apa saja\n');
  fs.writeFileSync(path.join(root, '.kerjaan', 'in_progress', '261016600002 Lain.md'), 'tiket lain\n');
  const chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);
  assert.match(chk.out, /^SAME: /);
});

// A run that changes the content it is testing vouches for no version: the
// record says what changed, the exit status is still the command's own, and
// --check gives NO EVIDENCE.
for (const [what, setup, cmd, changed] of [
  ['writes a new untracked file', () => {}, 'echo x > ditulis.js; exit 3', 'ditulis.js'],
  ['edits an untracked file that was there before', (root) => fs.writeFileSync(path.join(root, 'baru.js'), 'a\n'), 'echo b >> baru.js; exit 3', 'baru.js'],
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
  const root = repo('echo x > hasil.log', '(none yet)');
  fs.writeFileSync(path.join(root, '.gitignore'), '*.log\n');
  git(root, 'add', '.gitignore');
  git(root, 'commit', '-q', '-m', 'abaikan log');
  assert.equal(run(root, A).code, 0);
  assert.match(records(root)[0], /the same before and after the run/);
  assert.equal(run(root, '--check', A).code, 0);
});

test('a later clean run supersedes one whose content changed', () => {
  const root = repo('test -e ditulis.js || echo x > ditulis.js', '(none yet)');
  assert.equal(run(root, A).code, 0);
  assert.equal(run(root, '--check', A).code, 2);
  assert.equal(run(root, A).code, 0);
  assert.equal(records(root).length, 2);
  const chk = run(root, '--check', A);
  assert.equal(chk.code, 0, chk.out);
});
