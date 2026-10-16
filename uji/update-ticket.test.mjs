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

// ## History: a move made inside a Claude Code session names that session, so
// the owner can open the conversation again with `claude --resume <id>`; a
// move made anywhere else keeps the old line, with no empty marker. The tests
// set or remove CLAUDE_CODE_SESSION_ID themselves, never trusting the
// environment they happen to run in.
const SESSION = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';

function runWith(root, session, ...args) {
  const env = { ...gitEnv };
  if (session === undefined) delete env.CLAUDE_CODE_SESSION_ID;
  else env.CLAUDE_CODE_SESSION_ID = session;
  const r = spawnSync('bash', [update, ...args], { cwd: root, encoding: 'utf8', env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function historyOf(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text.split('## History\n')[1].split('\n\n## Notes')[0].split('\n');
}

const TIME = String.raw`\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}`;

test('a move inside a Claude Code session writes "- <time> <session-id> <status>"', () => {
  const root = repo();
  const r = runWith(root, SESSION, A, '--status', 'backlog');
  assert.equal(r.code, 0, r.err);
  const lines = historyOf(path.join(root, '.kerjaan', 'backlog', `${A} Judul lama.md`));
  assert.equal(lines.length, 2, lines.join('\n'));
  assert.equal(lines[0], '- 2026-10-16 20:00:00 todo');
  assert.match(lines[1], new RegExp(`^- ${TIME} ${SESSION} backlog$`));
});

for (const [where, session] of [['with no CLAUDE_CODE_SESSION_ID', undefined], ['with it set but empty', '']]) {
  test(`a move ${where} writes "- <time> <status>", no empty marker`, () => {
    const root = repo();
    const r = runWith(root, session, A, '--status', 'backlog');
    assert.equal(r.code, 0, r.err);
    const lines = historyOf(path.join(root, '.kerjaan', 'backlog', `${A} Judul lama.md`));
    assert.match(lines[1], new RegExp(`^- ${TIME} backlog$`));
  });
}

// The status must stay the last word, and the line one record: a value that
// is not a single plain word is left out rather than written.
for (const bad of ['dua kata', 'a\tb', 'x\ny', '$(id)', 'a/b']) {
  test(`a session value that is not one plain word (${JSON.stringify(bad)}) is left out`, () => {
    const root = repo();
    const r = runWith(root, bad, A, '--status', 'backlog');
    assert.equal(r.code, 0, r.err);
    const lines = historyOf(path.join(root, '.kerjaan', 'backlog', `${A} Judul lama.md`));
    assert.equal(lines.length, 2, lines.join('\n'));
    assert.match(lines[1], new RegExp(`^- ${TIME} backlog$`));
  });
}

test('each move names the session that made it, next to older lines without one', () => {
  const root = repo();
  const other = 'a192c9e8-0bb5-4bbf-8d56-9831b23e62ec';
  assert.equal(runWith(root, SESSION, A, '--status', 'backlog').code, 0);
  assert.equal(runWith(root, undefined, A, '--status', 'todo').code, 0);
  assert.equal(runWith(root, other, A, '--status', 'cancel').code, 0);
  const lines = historyOf(path.join(root, '.kerjaan', 'cancel', `${A} Judul lama.md`));
  assert.equal(lines.length, 4, lines.join('\n'));
  assert.equal(lines[0], '- 2026-10-16 20:00:00 todo');
  assert.match(lines[1], new RegExp(`^- ${TIME} ${SESSION} backlog$`));
  assert.match(lines[2], new RegExp(`^- ${TIME} todo$`));
  assert.match(lines[3], new RegExp(`^- ${TIME} ${other} cancel$`));
});

test('a rename inside a session adds no History line', () => {
  const root = repo();
  assert.equal(runWith(root, SESSION, A, '--title', 'Judul baru').code, 0);
  const lines = historyOf(path.join(root, '.kerjaan', 'todo', `${A} Judul baru.md`));
  assert.deepEqual(lines, ['- 2026-10-16 20:00:00 todo']);
});
