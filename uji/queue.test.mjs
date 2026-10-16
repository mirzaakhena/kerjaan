// The queue planner's tools (queue.sh) and the gate into todo: estimates of the
// files a ticket will change, the pairs whose estimates share files, numbered
// questions and their answers, the readiness check over todo and order.md, and
// the comparison of an estimate with what the ticket's commits really changed.
//
// Every test builds a throwaway repository with a board and runs the real
// scripts against it, the way the skill runs them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const queue = path.join(scripts, 'queue.sh');
const update = path.join(scripts, 'update-ticket.sh');

const A = '261016400001';
const B = '261016400002';
const C = '261016400003';
const D = '261016400004';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
};

const items = (n) => Array.from({ length: n }, (_, i) => `- [ ] Butir ke-${i + 1}`).join('\n');

function ticketText({ blockedBy = [], doneWhen = items(2), notes = '(none yet)' } = {}) {
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
Sesuatu.

## Request
Sesuatu.

## Done when
${doneWhen}

## History
- 2026-10-16 20:00:00 backlog

## Notes
${notes}
`;
}

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function repo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-queue-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), `---
language: Bahasa Indonesia
test_command:
long_lived_branches: []
---
`);
  fs.mkdirSync(path.join(root, 'src', 'web'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'a.js'), 'a\n');
  fs.writeFileSync(path.join(root, 'src', 'web', 'b.js'), 'b\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return root;
}

function add(root, id, { status = 'backlog', title = `Tiket ${id}`, ...t } = {}) {
  const file = path.join(root, '.kerjaan', status, `${id} ${title}.md`);
  fs.writeFileSync(file, ticketText(t));
  return file;
}

const fileOf = (root, id) => {
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    const dir = path.join(root, '.kerjaan', s);
    const f = fs.readdirSync(dir).find((n) => n.startsWith(`${id} `));
    if (f) return path.join(dir, f);
  }
  return null;
};
const read = (root, id) => fs.readFileSync(fileOf(root, id), 'utf8');

function run(root, script, ...args) {
  const r = spawnSync('bash', [script, ...args], { cwd: root, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const q = (root, ...args) => run(root, queue, ...args);

function order(root, text) {
  fs.writeFileSync(path.join(root, '.kerjaan', 'order.md'), text);
}

// --- estimate ------------------------------------------------------------------

test('estimate: recorded as a fixed line in Notes, sorted, folders marked with a slash, updated refreshed', () => {
  const root = repo();
  add(root, A);
  const r = q(root, 'estimate', A, './src/a.js', 'src/web', 'docs/baru.md');
  assert.equal(r.code, 0, r.err);
  const text = read(root, A);
  assert.match(text, /^- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d: files estimated to change: `docs\/baru\.md`, `src\/a\.js`, `src\/web\/`$/m);
  assert.doesNotMatch(text, /\(none yet\)/);
  assert.doesNotMatch(text, /updated: 2026-10-16 20:00:00/);
  const shown = q(root, 'estimate', A);
  assert.equal(shown.code, 0);
  assert.equal(shown.out, 'docs/baru.md\nsrc/a.js\nsrc/web/\n');
});

test('estimate: the latest one counts', () => {
  const root = repo();
  add(root, A);
  q(root, 'estimate', A, 'src/a.js');
  q(root, 'estimate', A, 'src/web/b.js');
  assert.equal(q(root, 'estimate', A).out, 'src/web/b.js\n');
});

test('estimate: paths outside the project, and the board itself, are refused with nothing written', () => {
  const root = repo();
  add(root, A);
  for (const p of ['/etc/passwd', '../luar.js', 'src/../../luar.js', '.kerjaan/order.md', '.kerjaan', 'a`b']) {
    const r = q(root, 'estimate', A, p);
    assert.equal(r.code, 2, p);
  }
  assert.doesNotMatch(read(root, A), /files estimated/);
});

test('estimate: a ticket without one says so and exits 1', () => {
  const root = repo();
  add(root, A);
  const r = q(root, 'estimate', A);
  assert.equal(r.code, 1);
  assert.match(r.err, /No estimate recorded for 261016400001/);
});

test('estimate: an example inside a fenced block is not a record', () => {
  const root = repo();
  add(root, A, { notes: '```\n- 2026-10-16 10:00:00: files estimated to change: `src/a.js`\n```' });
  assert.equal(q(root, 'estimate', A).code, 1);
});

// --- overlap -------------------------------------------------------------------

test('overlap: names each pair sharing files, with the files, per kind of match', () => {
  const root = repo();
  add(root, A); add(root, B); add(root, C, { status: 'todo' }); add(root, D, { status: 'in_progress' });
  q(root, 'estimate', A, 'src/a.js', 'src/web/');      // file + folder
  q(root, 'estimate', B, 'src/a.js', 'docs/x.md');     // same file as A
  q(root, 'estimate', C, 'src/web/b.js');              // under A's folder
  q(root, 'estimate', D, 'src/', 'lain.txt');          // a folder holding A's folder
  const r = q(root, 'overlap');
  assert.equal(r.code, 0, r.err);
  const expect = [
    `${A} (backlog) and ${B} (backlog) share:\n  src/a.js\n`,
    `${A} (backlog) and ${C} (todo) share:\n  src/web/b.js\n`,
    `${A} (backlog) and ${D} (in_progress) share:\n  src/a.js\n  src/web/\n`,
    `${B} (backlog) and ${D} (in_progress) share:\n  src/a.js\n`,
    `${C} (todo) and ${D} (in_progress) share:\n  src/web/b.js\n`,
  ];
  assert.equal(r.out, expect.join(''));
});

test('overlap: similar names are not shared files; nothing shared says so', () => {
  const root = repo();
  add(root, A); add(root, B);
  q(root, 'estimate', A, 'src/a.js', 'src/web/');
  q(root, 'estimate', B, 'src/a.jsx', 'src/webapp/x.js');
  const r = q(root, 'overlap');
  assert.equal(r.code, 0);
  assert.equal(r.out, 'No two of these tickets share a file in their estimates.\n');
});

test('overlap: done tickets are left out by default; named tickets are compared, those without an estimate noted', () => {
  const root = repo();
  add(root, A); add(root, B, { status: 'done' }); add(root, C);
  q(root, 'estimate', A, 'src/a.js');
  q(root, 'estimate', B, 'src/a.js');
  assert.match(q(root, 'overlap').out, /^No two/);
  const named = q(root, 'overlap', A, B, C);
  assert.match(named.out, new RegExp(`${A} \\(backlog\\) and ${B} \\(done\\) share:\\n  src/a.js`));
  assert.match(named.err, new RegExp(`No estimate recorded for ${C}`));
});

// --- ask and answer ----------------------------------------------------------------

test('ask and answer: numbers stay put when another question is answered first', () => {
  const root = repo();
  add(root, A);
  assert.match(q(root, 'ask', A, 'Satu?').out, /question 1\./);
  assert.match(q(root, 'ask', A, 'Dua?\nbaris kedua').out, /question 2\./);
  q(root, 'ask', A, 'Tiga?');
  assert.equal(q(root, 'answer', A, '1', 'jawab satu').code, 0);
  const chk = q(root, 'check', A);
  assert.match(chk.out, /open question 2: Dua\? baris kedua/);
  assert.match(chk.out, /open question 3: Tiga\?/);
  assert.doesNotMatch(chk.out, /open question 1/);
  assert.equal(q(root, 'answer', A, '3', 'jawab tiga').code, 0);
  assert.equal(q(root, 'answer', A, '2', 'jawab dua').code, 0);
  const notes = read(root, A).split('## Notes\n')[1];
  assert.match(notes, /: answered question: Satu\?\n  answer, [\d-]+ [\d:]+: jawab satu\n/);
  assert.match(notes, /: answered question: Dua\? baris kedua\n  answer, [\d-]+ [\d:]+: jawab dua\n/);
  assert.match(notes, /: answered question: Tiga\?\n  answer, [\d-]+ [\d:]+: jawab tiga\n/);
  assert.doesNotMatch(notes, /open question/);
});

test('answer: lands after the lines that continue the question', () => {
  const root = repo();
  add(root, A, { notes: '- 2026-10-16 10:00:00: open question: Warna?\n  Pilihan: merah atau biru.\n- 2026-10-16 10:00:01: catatan lain' });
  q(root, 'answer', A, '1', 'biru');
  assert.match(read(root, A), /answered question: Warna\?\n  Pilihan: merah atau biru\.\n  answer, [^\n]+: biru\n- 2026-10-16 10:00:01: catatan lain/);
});

test('answer: refuses an answered question, a number that does not exist, and an empty answer', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Satu?');
  q(root, 'answer', A, '1', 'ya');
  const before = read(root, A);
  assert.equal(q(root, 'answer', A, '1', 'lagi').code, 2);
  assert.equal(q(root, 'answer', A, '2', 'x').code, 2);
  assert.equal(q(root, 'answer', A, '0', 'x').code, 2);
  assert.equal(read(root, A), before);
  q(root, 'ask', A, 'Dua?');
  assert.equal(q(root, 'answer', A, '2', '  ').code, 2);
  assert.match(read(root, A), /open question: Dua\?\n$/);
});

// awk -v reads its value as a string literal: `\d` became `d` and `\t` a tab.
const slashed = String.raw`pakai pola \d+ di C:\temp`;

test('answer: backslashes in the answer are stored exactly as given', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Pola apa?');
  assert.equal(q(root, 'answer', A, '1', slashed).code, 0);
  const lines = read(root, A).split('\n');
  const ans = lines.find((l) => l.startsWith('  answer, '));
  assert.equal(ans.replace(/^  answer, [\d-]+ [\d:]+: /, ''), slashed);
});

test('ask: backslashes survive both as the first note and as a later one', () => {
  const root = repo();
  add(root, A);
  // The first note replaces "(none yet)"; the second is appended after it.
  q(root, 'ask', A, `Pertama ${slashed}?`);
  q(root, 'ask', A, `Kedua ${slashed}?`);
  const notes = read(root, A).split('## Notes\n')[1].split('\n');
  assert.equal(notes[0].replace(/^- [\d-]+ [\d:]+: open question: /, ''), `Pertama ${slashed}?`);
  assert.equal(notes[1].replace(/^- [\d-]+ [\d:]+: open question: /, ''), `Kedua ${slashed}?`);
  assert.ok(!notes.includes('(none yet)'));
});

test('ask: an empty question is refused', () => {
  const root = repo();
  add(root, A);
  assert.equal(q(root, 'ask', A, ' \n ').code, 2);
  assert.doesNotMatch(read(root, A), /question/);
});

// --- the gate into todo --------------------------------------------------------------

test('gate: a ticket with an open question is refused entry into todo, from every other status', () => {
  for (const from of ['backlog', 'in_progress', 'review', 'done', 'cancel']) {
    const root = repo();
    add(root, A, { status: from });
    q(root, 'ask', A, 'Boleh?');
    const r = run(root, update, A, '--status', 'todo');
    assert.equal(r.code, 1, from);
    assert.match(r.err, /REFUSED: 261016400001 was not moved to todo/);
    assert.match(r.err, /1\. Boleh\?/);
    assert.ok(fileOf(root, A).includes(`/${from}/`), from);
  }
});

test('gate: once answered, the move goes through', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Boleh?');
  q(root, 'answer', A, '1', 'boleh');
  const r = run(root, update, A, '--status', 'todo');
  assert.equal(r.code, 0, r.err);
  assert.ok(fileOf(root, A).includes('/todo/'));
});

test('gate: the refusal numbers each open question as answer takes it, answered ones counted', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Satu?');
  q(root, 'ask', A, 'Dua?');
  q(root, 'ask', A, 'Tiga?');
  q(root, 'answer', A, '1', 'ya');
  const r = run(root, update, A, '--status', 'todo');
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, /^  2\. Dua\?$/m);
  assert.match(r.err, /^  3\. Tiga\?$/m);
  assert.doesNotMatch(r.err, /^  1\./m);
  // The number in the message is the one that answers it.
  assert.equal(q(root, 'answer', A, '2', 'boleh').code, 0);
  const again = run(root, update, A, '--status', 'todo');
  assert.equal(again.code, 1);
  assert.match(again.err, /^  3\. Tiga\?$/m);
  assert.doesNotMatch(again.err, /^  [12]\./m);
  assert.equal(q(root, 'answer', A, '3', 'boleh').code, 0);
  assert.equal(run(root, update, A, '--status', 'todo').code, 0, 'the move after every answer');
  assert.ok(fileOf(root, A).includes('/todo/'));
});

test('gate: other moves are not held up by an open question, and a fenced example is not one', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Boleh?');
  assert.equal(run(root, update, A, '--status', 'in_progress').code, 0);
  add(root, B, { notes: '```\n- 2026-10-16 10:00:00: open question: contoh\n```' });
  assert.equal(run(root, update, B, '--status', 'todo').code, 0);
});

// --- check, per ticket ----------------------------------------------------------------

function readyTicket(root, id, opts) {
  add(root, id, opts);
  q(root, 'estimate', id, `src/${id}.js`);
}

test('check: a ticket with an estimate and nothing open is ready', () => {
  const root = repo();
  readyTicket(root, A);
  const r = q(root, 'check', A);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /261016400001 \(backlog\) Tiket 261016400001\n  ready\nREADY\n$/);
});

test('check: names each kind of problem in a ticket', () => {
  const cases = [
    ['an open question', (root) => { readyTicket(root, A); q(root, 'ask', A, 'Apa?'); }, /open question 1: Apa\?/],
    ['no estimate', (root) => { add(root, A); }, /no estimate of the files/],
    ['over the size limit', (root) => { readyTicket(root, A, { doneWhen: items(9) }); }, /over the size limit/],
    ['a blocker still in backlog', (root) => { readyTicket(root, A, { blockedBy: [B] }); readyTicket(root, B); }, /blocked_by 261016400002, which is still in backlog/],
    ['a cancelled blocker', (root) => { readyTicket(root, A, { blockedBy: [B] }); add(root, B, { status: 'cancel' }); }, /blocked_by 261016400002, which was cancelled/],
    ['a blocker whose merge is held', (root) => {
      readyTicket(root, A, { blockedBy: [B] });
      add(root, B, { status: 'done', notes: '- 2026-10-16 10:00:00: merge held for the owner — konflik' });
    }, /blocked_by 261016400002, whose merge into main is held/],
    ['a blocker that does not exist', (root) => { readyTicket(root, A, { blockedBy: [B] }); }, /blocked_by 261016400002, which is no ticket/],
  ];
  for (const [name, setup, expected] of cases) {
    const root = repo();
    setup(root);
    const r = q(root, 'check', A);
    assert.equal(r.code, 1, name);
    assert.match(r.out, expected, name);
    assert.match(r.out, /NOT READY: 1 problem/, name);
  }
});

test('check: blockers that are finished, queued, or part of the same batch are fine; a size the owner accepted too', () => {
  const root = repo();
  readyTicket(root, A, { blockedBy: [B, C, D] });
  add(root, B, { status: 'done', notes: '- 2026-10-16 10:00:00: landed on main at abc' });
  add(root, C, { status: 'todo' });
  readyTicket(root, D);
  assert.equal(q(root, 'check', A, D).code, 0);
  const root2 = repo();
  readyTicket(root2, A, { doneWhen: items(9) });
  run(root2, update, A, '--accept-size');
  assert.equal(q(root2, 'check', A).code, 0);
});

// --- check, the whole of todo with order.md -------------------------------------------------

function todoBoard() {
  const root = repo();
  readyTicket(root, A, { status: 'todo' });
  readyTicket(root, B, { status: 'todo' });
  return root;
}

test('check: todo in step with order.md is READY', () => {
  const root = todoBoard();
  order(root, `**Bebas.** Tidak saling menunggu.\n\n- ${A} Satu\n- ${B} Dua\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /order\.md\n  in step with todo\nREADY/);
});

test('check: a ticket missing from order.md, and an entry whose ticket left todo', () => {
  const root = todoBoard();
  order(root, `**Pertama.** Alasan.\n\n- ${A} Satu\n- ${C} Hilang\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400002 is in todo but has no place in order\.md/);
  assert.match(r.out, /order\.md lists 261016400003, which is not in todo/);
});

test('check: a ticket never shares a group with one it waits for, directly or through another', () => {
  const direct = repo();
  readyTicket(direct, A, { status: 'todo', blockedBy: [B] });
  readyTicket(direct, B, { status: 'todo' });
  order(direct, `**Bersama.** Salah.\n\n- ${A} Satu\n- ${B} Dua\n`);
  let r = q(direct, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 and 261016400002 share a group, but 261016400001 waits for the result of 261016400002/);

  // A waits for C (in progress, outside the group), which waits for B.
  const chain = repo();
  readyTicket(chain, A, { status: 'todo', blockedBy: [C] });
  readyTicket(chain, B, { status: 'todo' });
  add(chain, C, { status: 'in_progress', blockedBy: [B] });
  order(chain, `**Bersama.** Salah.\n\n- ${A} Satu\n- ${B} Dua\n`);
  r = q(chain, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 waits for the result of 261016400002/);
});

test('check: a ticket placed before the one it waits for; after it, it is fine', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  order(root, `**Dulu.** Salah.\n\n- ${A} Satu\n\n**Lalu.** Salah.\n\n- ${B} Dua\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 is placed before 261016400002, which it waits for/);
  order(root, `**Dulu.** Fondasi.\n\n- ${B} Dua\n\n**Lalu.** Memakai hasilnya.\n\n- ${A} Satu\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
});

// Two tickets of one group sharing files: the order they land in is said by
// the group's one fixed line, <!-- lands-first: <id>, <id> -->, never by the
// wording of its lead-in.
function sharingPair() {
  const root = repo();
  add(root, A, { status: 'todo' }); add(root, B, { status: 'todo' });
  q(root, 'estimate', A, 'src/a.js', 'src/web/');
  q(root, 'estimate', B, 'src/web/b.js');
  return root;
}
const noLine = new RegExp(`${A} and ${B} share a group and the files src/web/b\\.js; the group has no line saying which lands first \\(write <!-- lands-first: <id> --> under its lead-in\\)`);

test('check: two tickets of one group sharing files, with no lands-first line, are not ready, and it says why', () => {
  const root = sharingPair();
  order(root, `**Bersama.** ${A} dan ${B} sama-sama mengubah src/web/b.js.\n\n- ${A} Satu\n- ${B} Dua\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, noLine);
  assert.match(r.out, /NOT READY: 1 problem/);
});

test('check: the free wording that used to say which lands first is no longer read, in any language', () => {
  const root = sharingPair();
  for (const lead of [
    `${A} and ${B} both change src/web/b.js, so ${A} lands first.`,
    `${A} and ${B} both change src/web/b.js; ${A} lands before ${B}.`,
    `${A} dan ${B} mengubah src/web/b.js; ${A} digabung lebih dulu.`,
    `${A} dan ${B} mengubah src/web/b.js; ${A} mendarat dahulu.`,
    `${A} dan ${B} mengubah src/web/b.js; ${B} digabung sebelum ${A}.`,
  ]) {
    order(root, `**Bersama.** ${lead}\n\n- ${A} Satu\n- ${B} Dua\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${lead}\n${r.out}`);
    assert.match(r.out, noLine, lead);
  }
});

test('check: a lands-first line naming either ticket, or both in either order, makes the group ready', () => {
  const root = sharingPair();
  for (const line of [
    `<!-- lands-first: ${A} -->`,
    `<!-- lands-first: ${B} -->`,
    `<!-- lands-first: ${A}, ${B} -->`,
    `<!-- lands-first: ${B}, ${A} -->`,
    // Spacing inside the line is free; the words and the colon are not.
    `<!--lands-first:${B},${A}-->`,
    `  <!--   lands-first:   ${A} ,  ${B}   -->  `,
  ]) {
    order(root, `**Bersama.** Keduanya mengubah src/web/b.js.\n${line}\n\n- ${A} Satu\n- ${B} Dua\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${line}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
});

test('check: the lands-first line counts anywhere inside its group, and only there', () => {
  const root = sharingPair();
  const mark = `<!-- lands-first: ${A} -->`;
  for (const text of [
    `**Bersama.** Alasan yang\nterbungkus dua baris.\n${mark}\n\n- ${A} Satu\n- ${B} Dua\n`,
    `**Bersama.** Alasan.\n\n${mark}\n\n- ${A} Satu\n- ${B} Dua\n`,
    `**Bersama.** Alasan.\n\n- ${A} Satu\n- ${B} Dua\n${mark}\n`,
    // Group zero: bullets with no bold line above them.
    `${mark}\n- ${A} Satu\n- ${B} Dua\n`,
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
  }
  // In the group above, it settles nothing here, and names tickets not in its own group.
  add(root, C, { status: 'todo' }); q(root, 'estimate', C, 'src/c.js');
  order(root, `**Dulu.**\n${mark}\n\n- ${C} Tiga\n\n**Bersama.**\n\n- ${A} Satu\n- ${B} Dua\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`order\\.md line 2 names ${A}, which is not a ticket of its group`));
  assert.match(r.out, noLine);
  assert.match(r.out, /NOT READY: 2 problem/);
});

test('check: a lands-first line that cannot be read is reported with its line and the shape to write', () => {
  const root = sharingPair();
  for (const line of [
    `<!-- lands-first ${A} -->`,
    `<!-- lands first: ${A} -->`,
    `<!-- landsfirst: ${A} -->`,
    `<!-- Lands_First: ${A} -->`,
    `<!-- Lands-First: ${A} -->`,
    `<!-- LANDS-FIRST: ${A} -->`,
    `<!-- lands-first: ${A}; ${B} -->`,
    `<!-- lands-first: ${A} ${B} -->`,
    `<!-- lands-first: 9${A} -->`,
    `<!-- lands-first: ${A}9 -->`,
    `<!-- lands-first: -->`,
    `<!-- lands-first: ${A}`,
    `<!-- lands-first: ${A} --> lalu ${B}`,
    `<!-- lands-first: \`${A}\` -->`,
  ]) {
    order(root, `**Bersama.** Alasan.\n${line}\n\n- ${A} Satu\n- ${B} Dua\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${line}\n${r.out}`);
    assert.match(r.out, /order\.md line 2 is not a lands-first line check can read: write it as <!-- lands-first: <id>, <id> -->, the IDs in the order they land/, line);
    assert.match(r.out, noLine, line);
  }
});

test('check: a second lands-first line in a group, and an ID named twice, are reported', () => {
  const root = sharingPair();
  order(root, `**Bersama.**\n<!-- lands-first: ${A} -->\n<!-- lands-first: ${B} -->\n\n- ${A} Satu\n- ${B} Dua\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /order\.md line 3 is a second lands-first line in its group: write one, with every ID in the order they land/);
  assert.match(r.out, /NOT READY: 1 problem/);

  // One line in each of two groups is not a second line.
  add(root, C, { status: 'todo' }); add(root, D, { status: 'todo' });
  q(root, 'estimate', C, 'src/c.js'); q(root, 'estimate', D, 'src/c.js');
  order(root, `**Satu.**\n<!-- lands-first: ${A} -->\n\n- ${A} Satu\n- ${B} Dua\n\n**Dua.**\n<!-- lands-first: ${D} -->\n\n- ${C} Tiga\n- ${D} Empat\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);

  order(root, `**Satu.**\n<!-- lands-first: ${A}, ${B}, ${A} -->\n\n- ${A} Satu\n- ${B} Dua\n\n**Dua.**\n<!-- lands-first: ${D} -->\n\n- ${C} Tiga\n- ${D} Empat\n`);
  r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`order\\.md line 2 names ${A} twice`));
  assert.match(r.out, /NOT READY: 1 problem/);
});

test('check: in a group of three sharing one file, the line settles each pair or says which one it leaves open', () => {
  const root = repo();
  for (const id of [A, B, C]) { add(root, id, { status: 'todo' }); q(root, 'estimate', id, 'src/a.js'); }
  const bullets = `- ${A} Satu\n- ${B} Dua\n- ${C} Tiga\n`;

  // One ID settles that ticket against each of the others, not the others between them.
  order(root, `**Bersama.**\n<!-- lands-first: ${A} -->\n\n${bullets}`);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`${B} and ${C} share a group and the files src/a\\.js; its lands-first line names neither, so which lands first is open \\(add one of them to it\\)`));
  assert.match(r.out, /NOT READY: 1 problem/);

  for (const ids of [[A, B], [C, B], [C, B, A], [B, A, C]]) {
    order(root, `**Bersama.**\n<!-- lands-first: ${ids.join(', ')} -->\n\n${bullets}`);
    r = q(root, 'check');
    assert.equal(r.code, 0, `${ids}\n${r.out}`);
  }

  // Without the line, every pair is named.
  order(root, `**Bersama.**\n\n${bullets}`);
  r = q(root, 'check');
  assert.match(r.out, /NOT READY: 3 problem/);
});

test('check: a ticket leaving todo comes off the lands-first line, and the rest of the group stays ready', () => {
  const root = repo();
  for (const id of [A, B, C]) { readyTicket(root, id, { status: 'todo' }); q(root, 'estimate', id, 'src/a.js'); }
  order(root, `**Bersama.**\n<!-- lands-first: ${A}, ${B}, ${C} -->\n\n- ${A} Satu\n- ${B} Dua\n- ${C} Tiga\n`);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'papan');
  assert.equal(q(root, 'check').code, 0);
  for (const [id, line] of [[B, `<!-- lands-first: ${A}, ${C} -->`], [A, `<!-- lands-first: ${C} -->`]]) {
    const r = run(root, update, id, '--status', 'in_progress');
    assert.equal(r.code, 0, r.err);
    const text = fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8');
    assert.ok(text.includes(`\n${line}\n`), text);
    assert.doesNotMatch(text, new RegExp(`- ${id} `));
    const c = q(root, 'check');
    assert.equal(c.code, 0, c.out);
  }
});

test('check: the marker ordering-the-queue.md documents is the one check reads', () => {
  const guide = fs.readFileSync(path.join(here, '..', 'skills', 'kerjaan', 'references', 'ordering-the-queue.md'), 'utf8');
  const section = guide.split('## Saying which lands first')[1].split('\n## ')[0];
  assert.ok(section.includes('<!-- lands-first: <id> -->'), section);
  assert.ok(section.includes('<!-- lands-first: <id>, <id> -->'), section);
  // No free phrase is offered as a way of saying it any more.
  for (const phrase of ['digabung lebih dulu', 'digabung sebelum', 'mendarat', 'lands before']) {
    assert.ok(!section.includes(phrase), phrase);
  }
  const root = repo();
  add(root, A, { status: 'todo' }); add(root, B, { status: 'todo' });
  q(root, 'estimate', A, 'src/a.js');
  q(root, 'estimate', B, 'src/a.js');
  // The examples in the section, with their IDs swapped for these tickets.
  const examples = [...section.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(examples.length >= 2, section);
  for (const ex of examples) {
    const text = ex.replaceAll('260905160502', A).replaceAll('260905160503', B);
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
  }

  // The example order.md at the head of the guide, as written there.
  const example = guide.split('```markdown\n')[1].split('```')[0];
  const ids = [...example.matchAll(/^- (\d{12}) /gm)].map((m) => m[1]);
  assert.equal(ids.length, 4);
  const whole = repo();
  for (const id of ids) {
    add(whole, id, { status: 'todo' });
    q(whole, 'estimate', id, ['260905160502', '260905160503'].includes(id) ? 'src/menu.js' : `src/${id}.js`);
  }
  order(whole, example);
  const r = q(whole, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /in step with todo\nREADY/);
});

test('check: tickets in different groups may share files without a word', () => {
  const root = repo();
  add(root, A, { status: 'todo' }); add(root, B, { status: 'todo' });
  q(root, 'estimate', A, 'src/a.js');
  q(root, 'estimate', B, 'src/a.js');
  order(root, `**Dulu.**\n\n- ${A} Satu\n\n**Lalu.**\n\n- ${B} Dua\n`);
  assert.equal(q(root, 'check').code, 0);
});

test('check: without order.md, only the tickets are judged', () => {
  const root = todoBoard();
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /order\.md/);
});

// --- compare ---------------------------------------------------------------------------------

function commit(root, message, files) {
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), body);
  }
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
}

test('compare: estimated and changed, estimated but untouched, changed but not estimated', () => {
  const root = repo();
  add(root, A, { status: 'done' });
  q(root, 'estimate', A, 'src/a.js', 'src/web/', 'docs/');
  commit(root, `${A}: kerja`, { 'src/web/b.js': 'b2\n', 'src/web/baru.js': 'n\n', 'src/c.js': 'c\n' });
  commit(root, 'tiket lain', { 'src/a.js': 'diubah orang lain\n' });
  const r = q(root, 'compare', A);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, [
    'Estimated and changed:', '  src/web/b.js', '  src/web/baru.js',
    'Estimated, not changed:', '  docs/', '  src/a.js',
    'Changed, not estimated:', '  src/c.js', '',
  ].join('\n'));
  assert.doesNotMatch(r.out, /\.kerjaan/);
});

test('compare: work on a branch not merged yet is read from that branch', () => {
  const root = repo();
  add(root, A, { status: 'review' });
  q(root, 'estimate', A, 'src/a.js');
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'papan');
  git(root, 'checkout', '-q', '-b', `tiket-${A}`);
  commit(root, `${A}: di cabang`, { 'src/a.js': 'a2\n' });
  git(root, 'checkout', '-q', 'main');
  const r = q(root, 'compare', A);
  assert.match(r.out, new RegExp(`^Read from tiket-${A}, which is not merged into HEAD\\.\\nEstimated and changed:\\n  src/a\\.js\\n`));
});

test('compare: without an estimate it lists what changed and exits 1', () => {
  const root = repo();
  add(root, A, { status: 'done' });
  commit(root, `${A}: kerja`, { 'src/c.js': 'c\n' });
  const r = q(root, 'compare', A);
  assert.equal(r.code, 1);
  assert.match(r.out, /No estimate was recorded for 261016400001\. Changed by its commits:\n  src\/c\.js/);
});

// --- where it runs ------------------------------------------------------------------------------

test('refuses to run from a linked worktree', () => {
  const root = repo();
  add(root, A);
  const wt = `${root}-wt`;
  git(root, 'worktree', 'add', '-q', '-b', `tiket-${A}`, wt);
  const r = q(wt, 'overlap');
  assert.equal(r.code, 2);
  assert.match(r.err, /linked git worktree/);
  git(root, 'worktree', 'remove', '--force', wt);
});

test('the planner agent ships beside the worker and the reviewer', () => {
  const agents = path.join(here, '..', 'agents');
  const text = fs.readFileSync(path.join(agents, 'kerjaan-planner.md'), 'utf8');
  const fm = text.split('---')[1];
  assert.match(fm, /^name: kerjaan-planner$/m);
  assert.match(fm, /^description: .+/m);
  assert.match(fm, /^tools: /m);
  for (const other of ['kerjaan-worker.md', 'kerjaan-reviewer.md']) {
    assert.ok(fs.existsSync(path.join(agents, other)));
  }
});

// ## History lines name the Claude Code session that made each move when there
// was one. The readiness check reads the same ticket either way, and a ticket
// moved through todo by update-ticket.sh inside a session is still ready.
for (const [form, history] of [
  ['older lines with no session', '- 2026-10-16 20:00:00 backlog\n- 2026-10-16 20:05:00 todo'],
  ['lines naming a session', '- 2026-10-16 20:00:00 4dbcf082-290a-4f65-845c-ee75fd3b3e9c backlog\n- 2026-10-16 20:05:00 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec todo'],
  ['a mix of both', '- 2026-10-16 20:00:00 backlog\n- 2026-10-16 20:05:00 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec todo'],
]) {
  test(`check: a ticket whose History holds ${form} is ready`, () => {
    const root = repo();
    readyTicket(root, A);
    const file = fileOf(root, A);
    const text = fs.readFileSync(file, 'utf8').replace('- 2026-10-16 20:00:00 backlog', history);
    assert.notEqual(text, fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, text);
    const r = q(root, 'check', A);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\n  ready\nREADY\n$/);
  });
}

test('check: a ticket moved into todo inside a Claude Code session, and ordered, is ready', () => {
  const root = repo();
  readyTicket(root, A);
  const env = { ...gitEnv, CLAUDE_CODE_SESSION_ID: '4dbcf082-290a-4f65-845c-ee75fd3b3e9c' };
  const m = spawnSync('bash', [update, A, '--status', 'todo'], { cwd: root, encoding: 'utf8', env });
  assert.equal(m.status, 0, m.stderr);
  assert.match(read(root, A), /\n- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d 4dbcf082-290a-4f65-845c-ee75fd3b3e9c todo\n/);
  order(root, `**Grup.**\n- ${A} Tiket ${A}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /READY\n$/);
});
