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
owner_explanation: off
explanation_translation: false
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
