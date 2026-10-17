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

function ticketText({ blockedBy = [], doneWhen = items(2), notes = '(none yet)', type = 'feature', priority = 'medium' } = {}) {
  return `---
type: ${type}
priority: ${priority}
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

// A decision ticket changes no file of the project. Its estimate says exactly
// that, so check can call it ready without a file picked to satisfy it.
test('estimate --none: recorded as its own fixed line, shown, and enough for check', () => {
  const root = repo();
  add(root, A);
  const r = q(root, 'estimate', A, '--none');
  assert.equal(r.code, 0, r.err);
  assert.match(read(root, A), /^- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d: files estimated to change: none$/m);
  assert.doesNotMatch(read(root, A), /updated: 2026-10-16 20:00:00/);
  const shown = q(root, 'estimate', A);
  assert.equal(shown.code, 0, shown.err);
  assert.match(shown.out, /none: 261016400001 changes no file of the project/);
  const c = q(root, 'check', A);
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, /\n  ready\nREADY\n$/);
});

test('estimate --none: refused beside paths, with nothing written', () => {
  const root = repo();
  add(root, A);
  for (const args of [['--none', 'src/a.js'], ['src/a.js', '--none']]) {
    const r = q(root, 'estimate', A, ...args);
    assert.equal(r.code, 2, args.join(' '));
  }
  assert.doesNotMatch(read(root, A), /files estimated/);
});

test('estimate --none: the latest estimate counts both ways, and none shares files with nobody', () => {
  const root = repo();
  add(root, A); add(root, B);
  q(root, 'estimate', A, 'src/a.js');
  q(root, 'estimate', B, 'src/a.js');
  assert.match(q(root, 'overlap').out, /261016400001 \(backlog\) and 261016400002 \(backlog\) share:\n  src\/a\.js/);
  q(root, 'estimate', A, '--none');
  const r = q(root, 'overlap', A, B);
  assert.match(r.out, /No two of these tickets share a file/);
  assert.doesNotMatch(r.err, /No estimate recorded/);
  q(root, 'estimate', A, 'src/a.js');
  assert.match(q(root, 'overlap').out, /share:\n  src\/a\.js/);
});

test('estimate --none: compare names every file its commits changed as not estimated', () => {
  const root = repo();
  add(root, A, { status: 'done' });
  q(root, 'estimate', A, '--none');
  commit(root, `${A}: kerja`, { 'src/c.js': 'c\n' });
  const r = q(root, 'compare', A);
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(r.out, [
    'Estimated and changed:', '  (none)',
    'Estimated, not changed:', '  (none)',
    'Changed, not estimated:', '  src/c.js', '',
  ].join('\n'));
  const quiet = repo();
  add(quiet, A, { status: 'done' });
  q(quiet, 'estimate', A, '--none');
  const r2 = q(quiet, 'compare', A);
  assert.equal(r2.code, 0, r2.out);
  assert.match(r2.out, /Changed, not estimated:\n  \(none\)\n$/);
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
    ['an empty type', (root) => { readyTicket(root, A, { type: '' }); }, /`type` is empty/],
    ['an empty priority', (root) => { readyTicket(root, A, { priority: '' }); }, /`priority` is empty/],
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
  for (const st of ['in_progress', 'review']) {
    const r = repo();
    readyTicket(r, A, { blockedBy: [B] });
    add(r, B, { status: st });
    assert.equal(q(r, 'check', A).code, 0, st);
  }
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
  order(root, `**Bebas.** Tidak saling menunggu.\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /order\.md\n  in step with todo\nREADY/);
});

test('check: a ticket missing from order.md, and an entry whose ticket left todo', () => {
  const root = todoBoard();
  order(root, `**Pertama.** Alasan.\n\n- ${A} Tiket ${A}\n- ${C} Tiket ${C}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400002 is in todo but has no place in order\.md/);
  assert.match(r.out, /order\.md lists 261016400003, which is not in todo/);
});

test('check: a ticket never shares a group with one it waits for, directly or through another', () => {
  const direct = repo();
  readyTicket(direct, A, { status: 'todo', blockedBy: [B] });
  readyTicket(direct, B, { status: 'todo' });
  order(direct, `**Bersama.** Salah.\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
  let r = q(direct, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 and 261016400002 share a group, but 261016400001 waits for the result of 261016400002/);

  // A waits for C (in progress, outside the group), which waits for B.
  const chain = repo();
  readyTicket(chain, A, { status: 'todo', blockedBy: [C] });
  readyTicket(chain, B, { status: 'todo' });
  add(chain, C, { status: 'in_progress', blockedBy: [B] });
  order(chain, `**Bersama.** Salah.\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
  r = q(chain, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 waits for the result of 261016400002/);
});

test('check: a ticket placed before the one it waits for; after it, it is fine', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  order(root, `**Dulu.** Salah.\n\n- ${A} Tiket ${A}\n\n**Lalu.** Salah.\n\n- ${B} Tiket ${B}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 is placed before 261016400002, which it waits for/);
  order(root, `**Dulu.** Fondasi.\n\n- ${B} Tiket ${B}\n\n**Lalu.** Memakai hasilnya.\n\n- ${A} Tiket ${A}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
});

test('check: a blocker in an earlier group of todo makes the ticket waiting for it ready, as a whole and by ID', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  order(root, `**Dulu.** Fondasi.\n\n- ${B} Tiket ${B}\n\n**Lalu.** Memakai hasilnya.\n\n- ${A} Tiket ${A}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /261016400001 \(todo\) Tiket 261016400001\n  ready\n/);
  r = q(root, 'check', A);
  assert.equal(r.code, 0, r.out);
});

test('check: with no order.md, a ticket of todo waiting for another of todo is not ready', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  const r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /blocked_by 261016400002, which is in todo too, and no order\.md places it in an earlier group/);
  assert.match(r.out, /NOT READY: 1 problem/);
});

// A worker's question takes the planner's numbered form, so the check that
// judges todo shows it too, without holding todo up for it.
test('check: questions open in tickets in flight are shown with their number, and do not count against todo', () => {
  const root = todoBoard();
  add(root, C, { status: 'in_progress' });
  add(root, D, { status: 'review' });
  q(root, 'ask', C, 'Yang pertama?');
  q(root, 'answer', C, '1', 'Ya.');
  q(root, 'ask', C, 'Tombol di kiri atau kanan? Saran: kanan.');
  q(root, 'ask', D, 'Nama berkasnya?');
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /in flight, waiting for the owner \(not counted against todo\)\n  261016400003 \(in_progress\) question 2: Tombol di kiri atau kanan\? Saran: kanan\.\n  261016400004 \(review\) question 1: Nama berkasnya\?\n/);
  assert.doesNotMatch(r.out, /Yang pertama/);
  assert.match(r.out, /READY\n$/);
  const one = q(root, 'check', C);
  assert.match(one.out, /open question 2: Tombol di kiri atau kanan/);
  const quiet = todoBoard();
  assert.doesNotMatch(q(quiet, 'check').out, /in flight/);
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
  order(root, `**Bersama.** ${A} dan ${B} sama-sama mengubah src/web/b.js.\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
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
    order(root, `**Bersama.** ${lead}\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
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
    order(root, `**Bersama.** Keduanya mengubah src/web/b.js.\n${line}\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${line}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
});

test('check: the lands-first line counts anywhere inside its group, and only there', () => {
  const root = sharingPair();
  const mark = `<!-- lands-first: ${A} -->`;
  for (const text of [
    `**Bersama.** Alasan.\n${mark}\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`,
    `**Bersama.** Alasan.\n\n${mark}\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`,
    `**Bersama.** Alasan.\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n${mark}\n`,
    `**Tujuan.** Satu batch.\n\n**Bersama.** Alasan.\n\n- ${A} Tiket ${A}\n${mark}\n- ${B} Tiket ${B}\n`,
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
  }
  // In the group above, it settles nothing here, and names tickets not in its own group.
  add(root, C, { status: 'todo' }); q(root, 'estimate', C, 'src/c.js');
  order(root, `**Dulu.**\n${mark}\n\n- ${C} Tiket ${C}\n\n**Bersama.**\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
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
    order(root, `**Bersama.** Alasan.\n${line}\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${line}\n${r.out}`);
    assert.match(r.out, /order\.md line 2 is not a lands-first line check can read: write it as <!-- lands-first: <id>, <id> -->, the IDs in the order they land/, line);
    assert.match(r.out, noLine, line);
  }
});

test('check: a second lands-first line in a group, and an ID named twice, are reported', () => {
  const root = sharingPair();
  order(root, `**Bersama.**\n<!-- lands-first: ${A} -->\n<!-- lands-first: ${B} -->\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /order\.md line 3 is a second lands-first line in its group: write one, with every ID in the order they land/);
  assert.match(r.out, /NOT READY: 1 problem/);

  // One line in each of two groups is not a second line.
  add(root, C, { status: 'todo' }); add(root, D, { status: 'todo' });
  q(root, 'estimate', C, 'src/c.js'); q(root, 'estimate', D, 'src/c.js');
  order(root, `**Satu.**\n<!-- lands-first: ${A} -->\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n\n**Dua.**\n<!-- lands-first: ${D} -->\n\n- ${C} Tiket ${C}\n- ${D} Tiket ${D}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);

  order(root, `**Satu.**\n<!-- lands-first: ${A}, ${B}, ${A} -->\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n\n**Dua.**\n<!-- lands-first: ${D} -->\n\n- ${C} Tiket ${C}\n- ${D} Tiket ${D}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`order\\.md line 2 names ${A} twice`));
  assert.match(r.out, /NOT READY: 1 problem/);
});

test('check: in a group of three sharing one file, the line settles each pair or says which one it leaves open', () => {
  const root = repo();
  for (const id of [A, B, C]) { add(root, id, { status: 'todo' }); q(root, 'estimate', id, 'src/a.js'); }
  const bullets = `- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n- ${C} Tiket ${C}\n`;

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

// A ticket's line stays in order.md while it is worked on and reviewed, so
// two tickets of one group running side by side keep their lands-first line;
// it goes, with its ID on that line, once the ticket is done, cancelled or
// back in backlog.
test('check: tickets of one group in flight side by side stay listed, with their lands-first line, until they finish', () => {
  const root = repo();
  for (const id of [A, B, C]) { readyTicket(root, id, { status: 'todo' }); q(root, 'estimate', id, 'src/a.js'); }
  const start = `**Tujuan.** Satu batch.\n\n**Bersama.** Ketiganya tidak saling menunggu.\n<!-- lands-first: ${A}, ${B}, ${C} -->\n\n- ${A} Tiket ${A}\n- ${B} Tiket ${B}\n- ${C} Tiket ${C}\n`;
  order(root, start);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'papan');
  assert.equal(q(root, 'check').code, 0);
  const orderText = () => fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8');

  // Started, side by side, then one in review: nothing in order.md changes, and nothing is stale.
  for (const [id, st] of [[A, 'in_progress'], [B, 'in_progress'], [A, 'review']]) {
    const r = run(root, update, id, '--status', st);
    assert.equal(r.code, 0, r.err);
    assert.equal(orderText(), start, `${id} ${st}`);
    const c = q(root, 'check');
    assert.equal(c.code, 0, `${id} ${st}\n${c.out}`);
    assert.doesNotMatch(c.out, /which is not in/);
  }
  // The pair in flight is still judged: without the line, which lands first is open again.
  order(root, start.replace(/<!--.*-->\n/, ''));
  let c = q(root, 'check');
  assert.equal(c.code, 1, c.out);
  assert.match(c.out, new RegExp(`${A} and ${B} share a group and the files src/a\\.js; the group has no line saying which lands first`));
  order(root, start);

  // Finished one by one: the line goes, the ID comes off the lands-first line, and the last takes the group with it.
  for (const [id, st, line] of [[A, 'done', `<!-- lands-first: ${B}, ${C} -->`], [C, 'cancel', `<!-- lands-first: ${B} -->`]]) {
    const r = run(root, update, id, '--status', st);
    assert.equal(r.code, 0, r.err);
    const text = orderText();
    assert.ok(text.includes(`\n${line}\n`), text);
    assert.doesNotMatch(text, new RegExp(`- ${id} `));
    c = q(root, 'check');
    assert.equal(c.code, 0, c.out);
  }
  assert.equal(run(root, update, B, '--status', 'backlog').code, 0);
  assert.equal(orderText(), '**Tujuan.** Satu batch.\n\n');
});

// --- check, the grammar of order.md ---------------------------------------------------------
// Every line is one of five: a goal line at the top, a bold lead-in on one
// line, a lands-first line, a ticket line, or a blank line. Any other is
// reported by its number and nothing is rewritten.

function grammarBoard() {
  const root = repo();
  readyTicket(root, A, { status: 'todo' });
  readyTicket(root, B, { status: 'todo' });
  return root;
}
const lineA = `- ${A} Tiket ${A}`;
const lineB = `- ${B} Tiket ${B}`;

test('check: a free paragraph, a lead-in wrapped over two lines, or a ticket under no lead-in is reported by its line number', () => {
  const root = grammarBoard();
  const none = 'is none of the lines order.md holds \\(a goal line, a lead-in, a lands-first line, a ticket line, a blank line\\)';
  for (const [text, ln, what, n = 1] of [
    [`Catatan bebas di kepala berkas.\n\n**Bersama.**\n\n${lineA}\n${lineB}\n`, 1, none],
    [`**Dulu.**\n\n${lineA}\n\nSudah selesai: ${C}.\n\n**Lalu.**\n\n${lineB}\n`, 5, none],
    [`**Bersama.**\n\n${lineA}\n${lineB}\nCatatan di bawah tiket.\n`, 5, none],
    [`# Urutan\n\n**Bersama.**\n\n${lineA}\n${lineB}\n`, 1, none],
    [`**Bersama.**\n\n${lineA}\n${lineB}\n  - ${C} Menjorok\n`, 5, none],
    [`**Bersama.**\n\n${lineA}\n${lineB}\n* ${C} Bintang\n`, 5, none],
    [`**Bersama.** Alasan yang\nterbungkus dua baris.\n\n${lineA}\n${lineB}\n`, 2, 'continues the lead-in of line 1: a lead-in is one sentence on one line'],
    [`**Bersama.** Alasan yang\nterbungkus\ntiga baris.\n\n${lineA}\n${lineB}\n`, 3, 'continues the lead-in of line 1', 2],
    [`**Bersama, alasan yang\nterbungkus.**\n\n${lineA}\n${lineB}\n`, 1, 'opens a bold lead-in that does not close on the same line: write the lead-in as one line', 2],
    [`${lineA}\n\n**Lalu.**\n\n${lineB}\n`, 1, `lists ${A} under no lead-in: put it in a group, below a bold lead-in`],
    [`**Tujuan.** Satu batch.\n${lineA}\n\n**Lalu.**\n\n${lineB}\n`, 2, `lists ${A} under no lead-in`],
    [`**Kosong.** Tidak ada tiketnya.\n\n**Bersama.**\n\n${lineA}\n${lineB}\n`, 1, 'is a lead-in with no ticket under it: give it its tickets, or remove it'],
    [`**Bersama.**\n\n${lineA}\n${lineB}\n\n**Penutup.** Tanpa tiket.\n`, 6, 'is a lead-in with no ticket under it'],
    [`<!-- lands-first: ${A} -->\n**Bersama.**\n\n${lineA}\n${lineB}\n`, 1, 'is a lands-first line outside any group: put it under the lead-in of its group'],
    [`**Bersama.**\n\n${lineA}\n${lineB}\n${lineA}\n`, 5, `lists ${A} again, after line 3: one line per ticket`],
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`  - order\\.md line ${ln} ${what}`), `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`NOT READY: ${n} problem`), `${text}\n${r.out}`);
    assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text, 'check rewrites nothing');
  }
});

test('check: one goal line at the top is accepted, as Tujuan or Goal; a second one, or one below the top, is reported by its line number', () => {
  const root = grammarBoard();
  const body = `**Bersama.** Tidak saling menunggu.\n\n${lineA}\n${lineB}\n`;
  for (const head of ['**Tujuan.** Aplikasi tersambung ke server.\n\n', '**Goal.** The app talks to the server.\n\n', '\n**Tujuan.** Diawali baris kosong.\n', '**Tujuan.**\n\n', '']) {
    order(root, head + body);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${head}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
  for (const [text, ln, what] of [
    [`**Tujuan.** Satu.\n**Tujuan.** Dua.\n\n${body}`, 2, 'is a second goal line: order.md holds one, on its first line'],
    [`**Tujuan.** Satu.\n\n${body}\n**Goal.** Two.\n`, 8, 'is a second goal line'],
    [`${body}\n**Tujuan.** Di bawah.\n`, 6, 'is a goal line below the top: it goes on the first line, above every group'],
    [`Pengantar.\n**Tujuan.** Di bawah.\n\n${body}`, 2, 'is a goal line below the top'],
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`order\\.md line ${ln} ${what}`), `${text}\n${r.out}`);
  }
});

test('check: a title on a ticket line that differs from its ticket is NOT READY, for a ticket in todo or in flight; a rename by script keeps it in step', () => {
  const root = grammarBoard();
  add(root, C, { status: 'in_progress' });
  const text = (a, c) => `**Dulu.**\n\n- ${C} ${c}\n\n**Lalu.**\n\n- ${A} ${a}\n${lineB}\n`;
  order(root, text(`Tiket ${A}`, `Tiket ${C}`));
  assert.equal(q(root, 'check').code, 0);
  for (const [a, c, ln, id, given] of [
    ['Judul diubah tangan', `Tiket ${C}`, 7, A, 'Judul diubah tangan'],
    [`Tiket ${A}`, 'Judul lama', 3, C, 'Judul lama'],
    ['', `Tiket ${C}`, 7, A, ''],
  ]) {
    order(root, text(a, c).replace(`- ${A} \n`, `- ${A}\n`));
    const r = q(root, 'check');
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, new RegExp(`order\\.md line ${ln} gives ${id} the title "${given}", but its ticket is titled "Tiket ${id}": copy the ticket's title \\(update-ticket\\.sh --title renames both\\)`), r.out);
    assert.match(r.out, /NOT READY: 1 problem/);
  }
  // Trailing spaces are not a different title.
  order(root, text(`Tiket ${A}  `, `Tiket ${C}`));
  assert.equal(q(root, 'check').code, 0);

  order(root, text(`Tiket ${A}`, `Tiket ${C}`));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'papan');
  for (const id of [A, C]) assert.equal(run(root, update, id, '--title', `Nama baru ${id}`).code, 0);
  assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text(`Nama baru ${A}`, `Nama baru ${C}`));
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
});

// A real order.md from another board (nukitu-mockup, 17 Oct 2026): half of it
// free paragraphs — a status that went stale within hours, the tickets
// already done, a worker's steps, the tickets kept in backlog, a dependency
// written only in a lead-in. The old file is refused line by line; its
// rewrite in the grammar, with that dependency in blocked_by, is ready.
const real = (name) => fs.readFileSync(path.join(here, 'order-nyata', name), 'utf8');

function realBoard() {
  const root = repo();
  const text = real('baru.md');
  const F1 = '261017065501';
  add(root, F1, { status: 'done', title: 'Mitra melihat dan mengubah data diri, domisili, dan foto profilnya dari aplikasi Flutter dengan akun sungguhan di server' });
  const blocked = {
    261017065502: [F1],
    261017073005: ['261017073004'],
    261017073006: ['261017073005', '261017065505'],
    261009225715: ['261017073006', '261017065505'],
    261017073007: ['261017073006', '261017065505'],
    261017073008: ['261017073006'],
    261017073009: ['261017073008'],
  };
  for (const m of text.matchAll(/^- (\d{12}) (.+)$/gm)) {
    readyTicket(root, m[1], { status: 'todo', title: m[2], blockedBy: blocked[m[1]] || [] });
  }
  return root;
}

test('check: a real order.md full of free paragraphs is refused line by line; its rewrite in the grammar is ready', () => {
  const root = realBoard();
  const old = real('lama.md');
  order(root, old);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  const reported = [...r.out.matchAll(/order\.md line (\d+) (?:is none of the lines|continues the lead-in|is a lead-in with no ticket)/g)].map((m) => Number(m[1]));
  // Every line of the four paragraphs at the head, the worker's steps (a bold
  // lead-in introducing no ticket, wrapped), the backlog list, and the second
  // line of every wrapped lead-in.
  const lines = old.split('\n');
  const free = lines.flatMap((l, i) => (l.trim() && !/^\*\*/.test(l) && !/^- \d{12} /.test(l) ? [i + 1] : []));
  assert.ok(free.length >= 36, `${free.length} baris bebas`);
  for (const ln of [...free, 24]) assert.ok(reported.includes(ln), `baris ${ln} (${lines[ln - 1]}) tidak dilaporkan:\n${r.out}`);
  assert.equal(reported.length, free.length + 1, r.out);
  assert.deepEqual(reported, [...reported].sort((x, y) => x - y), 'top to bottom, by line number');
  // The lead-in naming F6, bayar and F7 as waiting is backed by their blocked_by, which check reads.
  order(root, real('baru.md'));
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /order\.md\n  in step with todo\nREADY/);
  // Its lead-ins are one line each, and it names no file to change.
  assert.doesNotMatch(real('baru.md'), /\.dart|\.mjs|`/);
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
  assert.ok(examples.length >= 1, section);
  for (const ex of examples) {
    const text = ex.replaceAll('260905160502', A).replaceAll('260905160503', B)
      .replace(/^- (\d{12}) .*$/gm, (m, id) => `- ${id} Tiket ${id}`);
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
  }

  // The example order.md at the head of the guide, as written there.
  const example = guide.split('```markdown\n')[1].split('```')[0];
  const lines = [...example.matchAll(/^- (\d{12}) (.+)$/gm)];
  const ids = lines.map((m) => m[1]);
  assert.equal(ids.length, 4);
  assert.match(example, /^\*\*Goal\.\*\* /, 'the example opens with its goal line');
  const whole = repo();
  for (const [, id, title] of lines) {
    add(whole, id, { status: 'todo', title });
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
  order(root, `**Dulu.**\n\n- ${A} Tiket ${A}\n\n**Lalu.**\n\n- ${B} Tiket ${B}\n`);
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

// --- one definition of ready, in every document --------------------------------------------------
// The conditions are listed once, in SKILL.md "Into `todo`", one bullet per
// kind of problem `check` names. The planner points at them by their number,
// and the guides point at `check`; none keeps a list of its own to drift.

const doc = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');
const numberWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function readyConditions() {
  const skill = doc('skills', 'kerjaan', 'SKILL.md');
  const section = skill.split('### Into `todo`')[1].split('\n### ')[0];
  const m = section.match(/All (\w+) must hold:\n\n((?:- [\s\S]*?\n)+?)\n(?!- |  )/);
  assert.ok(m, section);
  const bullets = m[2].split('\n').filter((l) => l.startsWith('- '));
  return { section, word: m[1], bullets };
}

test('docs: SKILL.md says as many conditions as it lists, and each is one kind check names', () => {
  const { section, word, bullets } = readyConditions();
  assert.equal(numberWords.indexOf(word) + 1, bullets.length, bullets.join('\n'));
  assert.equal(bullets.length, 5);
  // One bullet per kind: fields, questions, size, estimate, blockers.
  const kinds = [/`type` and `priority`/, /question/, /size/, /estimate/, /`blocked_by`/];
  kinds.forEach((k, i) => assert.match(bullets[i], k, bullets[i]));
  assert.match(section, /queue\.sh" check`\ntests, nothing more and nothing less/);
  // A blocker in an earlier group of todo is ahead, not a reason to wait.
  assert.match(section, /in `todo` in an earlier group of\n\s*`order\.md`/);
  assert.match(section, /estimate <id> --none/);
});

test('docs: the planner names the same number of conditions and points at the list instead of copying it', () => {
  const { word, bullets } = readyConditions();
  const planner = doc('agents', 'kerjaan-planner.md');
  assert.match(planner, new RegExp(`the ${word} conditions of SKILL\\.md, "Into \`todo\`"`));
  for (const w of numberWords.filter((x) => x !== word)) {
    assert.doesNotMatch(planner, new RegExp(`the ${w} (checks|conditions)`, 'i'), w);
  }
  // No bullet's opening is restated, in the planner or in a guide.
  const openings = bullets.map((b) => b.match(/^- \*\*(.+?)\*\*/)[1]);
  const guides = {
    planner,
    'ordering-the-queue.md': doc('skills', 'kerjaan', 'references', 'ordering-the-queue.md'),
    'foreman.md': doc('skills', 'kerjaan', 'references', 'foreman.md'),
    'README.md': doc('README.md'),
  };
  for (const [name, text] of Object.entries(guides)) {
    for (const o of openings) assert.ok(!text.includes(o), `${name} copies "${o}"`);
    assert.doesNotMatch(text, /`type` and `priority`/, name);
    assert.match(text, /queue\.sh"? check/, name);
  }
  assert.match(guides['ordering-the-queue.md'], /`check` is the one\ndefinition of ready, and this guide keeps no list of its own/);
});

// The grammar of order.md, said once in the guide and pointed at by the
// planner and the README: the five lines, a lead-in that lists no files, and
// where everything that used to be written around the groups goes now.
test('docs: the guide, the planner and the README describe the grammar, a lead-in without files, and where free notes go', () => {
  const ws = (t) => t.replace(/\s+/g, ' ');
  const guide = ws(doc('skills', 'kerjaan', 'references', 'ordering-the-queue.md'));
  const planner = ws(doc('agents', 'kerjaan-planner.md'));
  const readme = ws(doc('README.md'));
  for (const [name, text] of [['guide', guide], ['README', readme]]) {
    for (const phrase of ['**Goal.**', '**Tujuan.**', '<!-- lands-first:', '`in_progress/`', '`NOT READY`', 'blank line']) {
      assert.ok(text.includes(phrase), `${name}: ${phrase}`);
    }
    assert.match(text, /one line/, name);
  }
  assert.ok(guide.includes('## The lines it may hold'));
  const where = ws(doc('skills', 'kerjaan', 'references', 'ordering-the-queue.md').split('## Where everything else goes')[1].split('\n## ')[0]);
  for (const re of [/worker[^.]*`## Notes`/, /backlog[^.]*`## Notes`/, /Status[^.]*written nowhere/, /dependency[^.]*`blocked_by`/]) {
    assert.match(where, re);
  }
  assert.match(readme, /steps a worker must take into that ticket's Notes, why a ticket stays in backlog into that ticket's Notes, status nowhere at all/);
  assert.match(readme, /dependency a lead-in names into `blocked_by`/);
  assert.match(planner, /a goal line for the batch, one-line lead-ins with no list of files/);
  assert.match(planner, /a step a worker must take goes into that ticket's `## Notes`, why a ticket stays in backlog into that ticket's `## Notes`, and status nowhere/);
  assert.match(planner, /dependency you would name in a lead-in goes into `blocked_by`/);
  // A lead-in no longer carries the shared files.
  for (const [name, text] of [['guide', guide], ['planner', planner], ['README', readme]]) {
    for (const old of ['the files they share, and which lands first', 'shared files and which lands first', 'any files they both change are named']) {
      assert.ok(!text.includes(old), `${name}: ${old}`);
    }
  }
});

test('docs: the complete example in the guide, the planner and the README is one check calls READY', () => {
  for (const file of [['skills', 'kerjaan', 'references', 'ordering-the-queue.md'], ['agents', 'kerjaan-planner.md'], ['README.md']]) {
    const example = [...doc(...file).matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]).find((t) => t.startsWith('**Goal.**'));
    assert.ok(example, `${file.at(-1)} has a complete example opening with its goal line`);
    const root = repo();
    for (const [, id, title] of example.matchAll(/^- (\d{12}) (.+)$/gm)) {
      add(root, id, { status: 'todo', title });
      q(root, 'estimate', id, ['260905160502', '260905160503'].includes(id) ? 'src/menu.js' : `src/${id}.js`);
    }
    order(root, example);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${file.at(-1)}\n${example}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
});

test('docs: a worker records its questions with queue.sh ask, numbered like the planner\'s', () => {
  const worker = doc('agents', 'kerjaan-worker.md');
  const step = worker.split('**2. Find the decisions that are not yours.**')[1].split('**3. ')[0];
  assert.match(step, /"\$K\/queue\.sh" ask <id>/);
  assert.match(step, /is recorded with `queue\.sh ask` the same way/);
  assert.doesNotMatch(step, /Write it into `## Notes`/);
  assert.match(doc('skills', 'kerjaan', 'references', 'foreman.md'), /"\$K\/queue\.sh" answer <id> <n> "<answer>"`, then resume that worker/);
});

test('docs: the review level is suggested by the planner in its report and relayed by the foreman', () => {
  const planner = doc('agents', 'kerjaan-planner.md');
  assert.match(planner, /\*\*7\. Suggest a review level for each ticket\.\*\*/);
  assert.match(planner.split('## The report')[1], /\nReview levels: <id>: <quick \| normal \| strict> — <reason>/);
  const foreman = doc('skills', 'kerjaan', 'references', 'foreman.md');
  assert.match(foreman, /the review level it suggests\nfor each ticket/);
  assert.match(foreman, /the foreman relays it and adds none of its own/);
  const review = doc('skills', 'kerjaan', 'references', 'review.md');
  assert.match(review, /Suggesting one is the planner's/);
  const skill = doc('skills', 'kerjaan', 'SKILL.md');
  for (const text of [skill, review, foreman]) {
    assert.doesNotMatch(text, /suggesting a\s+higher one is (the foreman's|yours)/);
    assert.doesNotMatch(text, /any review level worth raising/);
  }
});
