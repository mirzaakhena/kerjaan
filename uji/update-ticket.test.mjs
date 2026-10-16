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

// order.md: a ticket leaving todo loses its bullet there, a group left with no
// bullets loses its lead-in with it, and everything else — other bullets, a
// lead-in wrapped over two lines, bold prose that never held a bullet, text
// above the first group — is written back byte for byte.
const B = '261016500002';
const orderPath = (root) => path.join(root, '.kerjaan', 'order.md');
const readOrder = (root) => fs.readFileSync(orderPath(root), 'utf8');
const writeOrder = (root, text) => fs.writeFileSync(orderPath(root), text);
const ticketAt = (root, status, title = 'Judul lama') => path.join(root, '.kerjaan', status, `${A} ${title}.md`);

for (const dest of ['backlog', 'in_progress', 'done', 'cancel']) {
  test(`leaving todo for ${dest} drops only this ticket's bullet; the group keeps the rest`, () => {
    const root = repo();
    writeOrder(root, `**Grup satu.** Alasan yang\nterbungkus dua baris.\n\n- ${A} Judul lama\n- ${B} Lain\n`);
    const r = run(root, A, '--status', dest);
    assert.equal(r.code, 0, r.err);
    assert.equal(readOrder(root), `**Grup satu.** Alasan yang\nterbungkus dua baris.\n\n- ${B} Lain\n`);
  });
}

test('a group left with no bullets goes whole, its two-line lead-in too; text around it stays', () => {
  const root = repo();
  writeOrder(root, [
    'Catatan di kepala berkas.',
    '',
    '**Grup satu.** Alasan yang',
    'terbungkus dua baris.',
    '',
    `- ${A} Judul lama`,
    '',
    '**Grup dua.** Alasan lain.',
    '',
    `- ${B} Lain`,
    '',
  ].join('\n'));
  assert.equal(run(root, A, '--status', 'backlog').code, 0);
  assert.equal(readOrder(root), `Catatan di kepala berkas.\n\n**Grup dua.** Alasan lain.\n\n- ${B} Lain\n`);
});

test('bold prose that never held a bullet is not a group and survives the group beside it emptying', () => {
  const root = repo();
  writeOrder(root, `**Catatan.** Ini bukan grup.\n\n**Grup satu.**\n- ${A} Judul lama\n\n**Penutup.** Juga bukan grup.\n`);
  assert.equal(run(root, A, '--status', 'cancel').code, 0);
  assert.equal(readOrder(root), `**Catatan.** Ini bukan grup.\n\n**Penutup.** Juga bukan grup.\n`);
});

test('a bullet that only starts with the same digits is not this ticket', () => {
  const root = repo();
  const longer = `${A}9`;
  writeOrder(root, `**Grup satu.**\n- ${longer} Mirip\n- ${A} Judul lama\n`);
  assert.equal(run(root, A, '--status', 'backlog').code, 0);
  assert.equal(readOrder(root), `**Grup satu.**\n- ${longer} Mirip\n`);
});

test('a ticket leaving todo without a bullet in order.md is reported, and order.md is left as it was', () => {
  const root = repo();
  const text = `**Grup satu.**\n- ${B} Lain\n`;
  writeOrder(root, text);
  const r = run(root, A, '--status', 'backlog');
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, new RegExp(`Note: ${A} was not listed in .*order\\.md`));
  assert.equal(readOrder(root), text);
});

test('a board without order.md gets none from a move out of todo', () => {
  const root = repo();
  fs.rmSync(orderPath(root));
  assert.equal(run(root, A, '--status', 'backlog').code, 0);
  assert.equal(fs.existsSync(orderPath(root)), false);
});

test('a ticket staying in todo, refreshed or moved to todo again, keeps its bullet', () => {
  const root = repo();
  const text = readOrder(root);
  assert.equal(run(root, A).code, 0);
  assert.equal(run(root, A, '--status', 'todo').code, 0);
  assert.equal(readOrder(root), text);
});

test('a ticket coming into todo is not added to order.md, and the move says it needs a place', () => {
  const root = repo();
  assert.equal(run(root, A, '--status', 'backlog').code, 0);
  const text = readOrder(root);
  const r = run(root, A, '--status', 'todo');
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, new RegExp(`Note: ${A} now sits in todo/ and needs a place in`));
  assert.equal(readOrder(root), text);
});

test('renaming a ticket in todo rewrites its bullet only; every other line is kept byte for byte', () => {
  const root = repo();
  const rest = `**Grup dua.** Alasan\nlain.\n\n- ${B} Judul lama juga\n`;
  writeOrder(root, `Kepala.\n\n**Grup satu.** Alasan.\n\n- ${A} Judul lama\n\n${rest}`);
  const r = run(root, A, '--title', 'Judul baru');
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(ticketAt(root, 'todo', 'Judul baru')));
  assert.equal(readOrder(root), `Kepala.\n\n**Grup satu.** Alasan.\n\n- ${A} Judul baru\n\n${rest}`);
});

test('a title is tidied the same way in the file name and in order.md', () => {
  const root = repo();
  assert.equal(run(root, A, '--title', ' Judul/dengan   garis\nbaru ').code, 0);
  assert.ok(fs.existsSync(ticketAt(root, 'todo', 'Judul dengan garis baru')));
  assert.equal(readOrder(root), `**Grup satu.**\n- ${A} Judul dengan garis baru\n`);
});

test('renaming and leaving todo at once drops the bullet rather than renaming it', () => {
  const root = repo();
  writeOrder(root, `**Grup satu.**\n- ${A} Judul lama\n- ${B} Lain\n`);
  assert.equal(run(root, A, '--status', 'backlog', '--title', 'Judul baru').code, 0);
  assert.ok(fs.existsSync(ticketAt(root, 'backlog', 'Judul baru')));
  assert.equal(readOrder(root), `**Grup satu.**\n- ${B} Lain\n`);
});

test('renaming a ticket outside todo leaves order.md alone', () => {
  const root = repo();
  assert.equal(run(root, A, '--status', 'backlog').code, 0);
  const text = `**Grup satu.**\n- ${B} Lain\n`;
  writeOrder(root, text);
  assert.equal(run(root, A, '--title', 'Judul baru').code, 0);
  assert.equal(readOrder(root), text);
});

// ## History: a move lands as the last line of History, which stays just
// before Notes; a ticket without History gets the section; headings inside
// fenced blocks are prose; a ticket with nowhere to record the move is
// refused with nothing changed.
const withSections = (background, history, notes) => ticketText
  .replace('## Background\nSesuatu.\n', `## Background\n${background}\n`)
  .replace('## History\n- 2026-10-16 20:00:00 todo\n\n', history)
  .replace('## Notes\n(none yet)\n', notes);

test('a move lands right after the last History line, and Notes is written back untouched', () => {
  const root = repo();
  const notes = '## Notes\n- 2026-10-16 20:00:02: catatan yang menyebut\n  - 2026-10-16 20:00:03 backlog\n';
  fs.writeFileSync(ticketAt(root, 'todo'), withSections('Sesuatu.',
    '## History\n- 2026-10-16 19:00:00 backlog\n- 2026-10-16 20:00:00 todo\n\n', notes));
  assert.equal(runWith(root, undefined, A, '--status', 'cancel').code, 0);
  const text = fs.readFileSync(ticketAt(root, 'cancel'), 'utf8');
  assert.match(text, new RegExp(`## History\\n- 2026-10-16 19:00:00 backlog\\n- 2026-10-16 20:00:00 todo\\n- ${TIME} cancel\\n\\n${notes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});

test('a ticket from before History existed gets the section, holding this move alone, just before Notes', () => {
  const root = repo();
  fs.writeFileSync(ticketAt(root, 'todo'), withSections('Sesuatu.', '', '## Notes\n(none yet)\n'));
  assert.equal(runWith(root, undefined, A, '--status', 'backlog').code, 0);
  const text = fs.readFileSync(ticketAt(root, 'backlog'), 'utf8');
  assert.match(text, new RegExp(`- \\[ \\] Butir\\n\\n## History\\n- ${TIME} backlog\\n\\n## Notes\\n\\(none yet\\)\\n$`));
  assert.equal(text.match(/^## History/gm).length, 1);
});

test('History and Notes headings inside a fenced block are prose; the move goes into the real History', () => {
  const root = repo();
  const fenced = '```\n## History\n- contoh\n\n## Notes\n- contoh\n```';
  fs.writeFileSync(ticketAt(root, 'todo'), withSections(fenced, '## History\n- 2026-10-16 20:00:00 todo\n\n', '## Notes\n(none yet)\n'));
  assert.equal(runWith(root, undefined, A, '--status', 'backlog').code, 0);
  const text = fs.readFileSync(ticketAt(root, 'backlog'), 'utf8');
  assert.ok(text.includes(`## Background\n${fenced}\n`), text);
  assert.match(text, new RegExp(`\\n## History\\n- 2026-10-16 20:00:00 todo\\n- ${TIME} backlog\\n\\n## Notes\\n\\(none yet\\)\\n$`));
});

test('a fenced block in Background is no History: without a real one, the section is still added before the real Notes', () => {
  const root = repo();
  const fenced = '```\n## History\n- contoh\n```';
  fs.writeFileSync(ticketAt(root, 'todo'), withSections(fenced, '', '## Notes\n(none yet)\n'));
  assert.equal(runWith(root, undefined, A, '--status', 'backlog').code, 0);
  const text = fs.readFileSync(ticketAt(root, 'backlog'), 'utf8');
  assert.ok(text.includes(`## Background\n${fenced}\n`), text);
  assert.match(text, new RegExp(`\\n## History\\n- ${TIME} backlog\\n\\n## Notes\\n\\(none yet\\)\\n$`));
});

test('a ticket with neither History nor Notes is refused, and nothing changes: file, folder, updated, order.md', () => {
  const root = repo();
  const bare = withSections('Sesuatu.', '', '');
  fs.writeFileSync(ticketAt(root, 'todo'), bare);
  const order = readOrder(root);
  const r = run(root, A, '--status', 'backlog');
  assert.notEqual(r.code, 0);
  assert.match(r.err, /REFUSED: .* was not changed/);
  assert.equal(fs.readFileSync(ticketAt(root, 'todo'), 'utf8'), bare);
  assert.equal(fs.existsSync(ticketAt(root, 'backlog')), false);
  assert.equal(readOrder(root), order);
});

test('a refresh, and a move to the status it already has, add no History line', () => {
  const root = repo();
  assert.equal(runWith(root, SESSION, A).code, 0);
  assert.equal(runWith(root, SESSION, A, '--status', 'todo').code, 0);
  assert.deepEqual(historyOf(ticketAt(root, 'todo')), ['- 2026-10-16 20:00:00 todo']);
});
