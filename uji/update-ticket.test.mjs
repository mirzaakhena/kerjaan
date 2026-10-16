// update-ticket.sh: what it writes into a ticket and into order.md keeps the
// text it was given byte for byte.
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
const update = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'update-ticket.sh');

const A = '261016500001';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
};

const ticketText = `---
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
- 2026-10-16 20:00:00 todo

## Notes
(none yet)
`;

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function repo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-update-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), `---
language: Bahasa Indonesia
test_command:
long_lived_branches: []
owner_explanation: off
explanation_translation: false
---
`);
  fs.writeFileSync(path.join(root, '.kerjaan', 'todo', `${A} Judul lama.md`), ticketText);
  fs.writeFileSync(path.join(root, '.kerjaan', 'order.md'), `**Grup satu.**\n- ${A} Judul lama\n`);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return root;
}

function run(root, ...args) {
  const r = spawnSync('bash', [update, ...args], { cwd: root, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// awk -v reads its value as a string literal: `\d` became `d` and `\t` a tab.
const slashed = String.raw`pola \d+ di C:\temp`;

test('--title: backslashes reach order.md and the file name exactly as given', () => {
  const root = repo();
  const r = run(root, A, '--title', slashed);
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(path.join(root, '.kerjaan', 'todo', `${A} ${slashed}.md`)));
  const order = fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8');
  assert.equal(order, `**Grup satu.**\n- ${A} ${slashed}\n`);
});

test('a note update-ticket writes into an empty Notes replaces "(none yet)"', () => {
  const root = repo();
  assert.equal(run(root, A, '--accept-size').code, 0);
  const file = path.join(root, '.kerjaan', 'todo', `${A} Judul lama.md`);
  const notes = fs.readFileSync(file, 'utf8').split('## Notes\n')[1];
  assert.match(notes, /^- [\d-]+ [\d:]+: size accepted by the owner with --accept-size: [^\n]+\n$/);
});
