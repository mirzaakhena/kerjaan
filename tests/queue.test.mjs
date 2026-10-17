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
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

const items = (n) => Array.from({ length: n }, (_, i) => `- [ ] Item ${i + 1}`).join('\n');

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
Something.

## Request
Something.

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
language: English
test_command:
long_lived_branches: []
---
`);
  fs.mkdirSync(path.join(root, 'src', 'web'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'a.js'), 'a\n');
  fs.writeFileSync(path.join(root, 'src', 'web', 'b.js'), 'b\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
  return root;
}

function add(root, id, { status = 'backlog', title = `Ticket ${id}`, ...t } = {}) {
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
  const r = q(root, 'estimate', A, './src/a.js', 'src/web', 'docs/new.md');
  assert.equal(r.code, 0, r.err);
  const text = read(root, A);
  assert.match(text, /^- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d: files estimated to change: `docs\/new\.md`, `src\/a\.js`, `src\/web\/`$/m);
  assert.doesNotMatch(text, /\(none yet\)/);
  assert.doesNotMatch(text, /updated: 2026-10-16 20:00:00/);
  const shown = q(root, 'estimate', A);
  assert.equal(shown.code, 0);
  assert.equal(shown.out, 'docs/new.md\nsrc/a.js\nsrc/web/\n');
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
  commit(root, `${A}: work`, { 'src/c.js': 'c\n' });
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
  q(root, 'estimate', D, 'src/', 'other.txt');          // a folder holding A's folder
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
  assert.match(q(root, 'ask', A, 'One?').out, /question 1\./);
  assert.match(q(root, 'ask', A, 'Two?\nsecond line').out, /question 2\./);
  q(root, 'ask', A, 'Three?');
  assert.equal(q(root, 'answer', A, '1', 'answer one').code, 0);
  const chk = q(root, 'check', A);
  assert.match(chk.out, /open question 2: Two\? second line/);
  assert.match(chk.out, /open question 3: Three\?/);
  assert.doesNotMatch(chk.out, /open question 1/);
  assert.equal(q(root, 'answer', A, '3', 'answer three').code, 0);
  assert.equal(q(root, 'answer', A, '2', 'answer two').code, 0);
  const notes = read(root, A).split('## Notes\n')[1];
  assert.match(notes, /: answered question: One\?\n  answer, [\d-]+ [\d:]+: answer one\n/);
  assert.match(notes, /: answered question: Two\? second line\n  answer, [\d-]+ [\d:]+: answer two\n/);
  assert.match(notes, /: answered question: Three\?\n  answer, [\d-]+ [\d:]+: answer three\n/);
  assert.doesNotMatch(notes, /open question/);
});

test('answer: lands after the lines that continue the question', () => {
  const root = repo();
  add(root, A, { notes: '- 2026-10-16 10:00:00: open question: Colour?\n  Options: red or blue.\n- 2026-10-16 10:00:01: another note' });
  q(root, 'answer', A, '1', 'blue');
  assert.match(read(root, A), /answered question: Colour\?\n  Options: red or blue\.\n  answer, [^\n]+: blue\n- 2026-10-16 10:00:01: another note/);
});

test('answer: refuses an answered question, a number that does not exist, and an empty answer', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'One?');
  q(root, 'answer', A, '1', 'yes');
  const before = read(root, A);
  assert.equal(q(root, 'answer', A, '1', 'again').code, 2);
  assert.equal(q(root, 'answer', A, '2', 'x').code, 2);
  assert.equal(q(root, 'answer', A, '0', 'x').code, 2);
  assert.equal(read(root, A), before);
  q(root, 'ask', A, 'Two?');
  assert.equal(q(root, 'answer', A, '2', '  ').code, 2);
  assert.match(read(root, A), /open question: Two\?\n$/);
});

// awk -v reads its value as a string literal: `\d` became `d` and `\t` a tab.
const slashed = String.raw`use the pattern \d+ in C:\temp`;

test('answer: backslashes in the answer are stored exactly as given', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'Which pattern?');
  assert.equal(q(root, 'answer', A, '1', slashed).code, 0);
  const lines = read(root, A).split('\n');
  const ans = lines.find((l) => l.startsWith('  answer, '));
  assert.equal(ans.replace(/^  answer, [\d-]+ [\d:]+: /, ''), slashed);
});

test('ask: backslashes survive both as the first note and as a later one', () => {
  const root = repo();
  add(root, A);
  // The first note replaces "(none yet)"; the second is appended after it.
  q(root, 'ask', A, `First ${slashed}?`);
  q(root, 'ask', A, `Second ${slashed}?`);
  const notes = read(root, A).split('## Notes\n')[1].split('\n');
  assert.equal(notes[0].replace(/^- [\d-]+ [\d:]+: open question: /, ''), `First ${slashed}?`);
  assert.equal(notes[1].replace(/^- [\d-]+ [\d:]+: open question: /, ''), `Second ${slashed}?`);
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
    q(root, 'ask', A, 'May I?');
    const r = run(root, update, A, '--status', 'todo');
    assert.equal(r.code, 1, from);
    assert.match(r.err, /REFUSED: 261016400001 was not moved to todo/);
    assert.match(r.err, /1\. May I\?/);
    assert.ok(fileOf(root, A).includes(`/${from}/`), from);
  }
});

test('gate: once answered, the move goes through', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'May I?');
  q(root, 'answer', A, '1', 'you may');
  const r = run(root, update, A, '--status', 'todo');
  assert.equal(r.code, 0, r.err);
  assert.ok(fileOf(root, A).includes('/todo/'));
});

test('gate: the refusal numbers each open question as answer takes it, answered ones counted', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'One?');
  q(root, 'ask', A, 'Two?');
  q(root, 'ask', A, 'Three?');
  q(root, 'answer', A, '1', 'yes');
  const r = run(root, update, A, '--status', 'todo');
  assert.equal(r.code, 1, r.err);
  assert.match(r.err, /^  2\. Two\?$/m);
  assert.match(r.err, /^  3\. Three\?$/m);
  assert.doesNotMatch(r.err, /^  1\./m);
  // The number in the message is the one that answers it.
  assert.equal(q(root, 'answer', A, '2', 'you may').code, 0);
  const again = run(root, update, A, '--status', 'todo');
  assert.equal(again.code, 1);
  assert.match(again.err, /^  3\. Three\?$/m);
  assert.doesNotMatch(again.err, /^  [12]\./m);
  assert.equal(q(root, 'answer', A, '3', 'you may').code, 0);
  assert.equal(run(root, update, A, '--status', 'todo').code, 0, 'the move after every answer');
  assert.ok(fileOf(root, A).includes('/todo/'));
});

test('gate: other moves are not held up by an open question, and a fenced example is not one', () => {
  const root = repo();
  add(root, A);
  q(root, 'ask', A, 'May I?');
  assert.equal(run(root, update, A, '--status', 'in_progress').code, 0);
  add(root, B, { notes: '```\n- 2026-10-16 10:00:00: open question: an example\n```' });
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
  assert.match(r.out, /261016400001 \(backlog\) Ticket 261016400001\n  ready\nREADY\n$/);
});

test('check: names each kind of problem in a ticket', () => {
  const cases = [
    ['an open question', (root) => { readyTicket(root, A); q(root, 'ask', A, 'What?'); }, /open question 1: What\?/],
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
  order(root, `**Free.** Neither waits for the other.\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /order\.md\n  in step with todo\nREADY/);
});

test('check: a ticket missing from order.md, and an entry whose ticket left todo', () => {
  const root = todoBoard();
  order(root, `**First.** The reason.\n\n- ${A} Ticket ${A}\n- ${C} Ticket ${C}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400002 is in todo but has no place in order\.md/);
  assert.match(r.out, /order\.md lists 261016400003, which is not in todo/);
});

test('check: a ticket never shares a group with one it waits for, directly or through another', () => {
  const direct = repo();
  readyTicket(direct, A, { status: 'todo', blockedBy: [B] });
  readyTicket(direct, B, { status: 'todo' });
  order(direct, `**Together.** Wrong.\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
  let r = q(direct, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 and 261016400002 share a group, but 261016400001 waits for the result of 261016400002/);

  // A waits for C (in progress, outside the group), which waits for B.
  const chain = repo();
  readyTicket(chain, A, { status: 'todo', blockedBy: [C] });
  readyTicket(chain, B, { status: 'todo' });
  add(chain, C, { status: 'in_progress', blockedBy: [B] });
  order(chain, `**Together.** Wrong.\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
  r = q(chain, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 waits for the result of 261016400002/);
});

test('check: a ticket placed before the one it waits for; after it, it is fine', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  order(root, `**First.** Wrong.\n\n- ${A} Ticket ${A}\n\n**Then.** Wrong.\n\n- ${B} Ticket ${B}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1);
  assert.match(r.out, /261016400001 is placed before 261016400002, which it waits for/);
  order(root, `**First.** The foundation.\n\n- ${B} Ticket ${B}\n\n**Then.** Builds on it.\n\n- ${A} Ticket ${A}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
});

test('check: a blocker in an earlier group of todo makes the ticket waiting for it ready, as a whole and by ID', () => {
  const root = repo();
  readyTicket(root, A, { status: 'todo', blockedBy: [B] });
  readyTicket(root, B, { status: 'todo' });
  order(root, `**First.** The foundation.\n\n- ${B} Ticket ${B}\n\n**Then.** Builds on it.\n\n- ${A} Ticket ${A}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /261016400001 \(todo\) Ticket 261016400001\n  ready\n/);
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
  q(root, 'ask', C, 'The first one?');
  q(root, 'answer', C, '1', 'Yes.');
  q(root, 'ask', C, 'Button on the left or the right? Recommended: the right.');
  q(root, 'ask', D, 'The file name?');
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /in flight, waiting for the owner \(not counted against todo\)\n  261016400003 \(in_progress\) question 2: Button on the left or the right\? Recommended: the right\.\n  261016400004 \(review\) question 1: The file name\?\n/);
  assert.doesNotMatch(r.out, /The first one/);
  assert.match(r.out, /READY\n$/);
  const one = q(root, 'check', C);
  assert.match(one.out, /open question 2: Button on the left or the right/);
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
  order(root, `**Together.** ${A} and ${B} both change src/web/b.js.\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
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
    order(root, `**Together.** ${lead}\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
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
    order(root, `**Together.** Both change src/web/b.js.\n${line}\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${line}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
});

test('check: the lands-first line counts anywhere inside its group, and only there', () => {
  const root = sharingPair();
  const mark = `<!-- lands-first: ${A} -->`;
  for (const text of [
    `**Together.** The reason.\n${mark}\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`,
    `**Together.** The reason.\n\n${mark}\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`,
    `**Together.** The reason.\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n${mark}\n`,
    `**Goal.** One batch.\n\n**Together.** The reason.\n\n- ${A} Ticket ${A}\n${mark}\n- ${B} Ticket ${B}\n`,
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
  }
  // In the group above, it settles nothing here, and names tickets not in its own group.
  add(root, C, { status: 'todo' }); q(root, 'estimate', C, 'src/c.js');
  order(root, `**First.**\n${mark}\n\n- ${C} Ticket ${C}\n\n**Together.**\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
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
    `<!-- lands-first: ${A} --> then ${B}`,
    `<!-- lands-first: \`${A}\` -->`,
  ]) {
    order(root, `**Together.** The reason.\n${line}\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${line}\n${r.out}`);
    assert.match(r.out, /order\.md line 2 is not a lands-first line check can read: write it as <!-- lands-first: <id>, <id> -->, the IDs in the order they land/, line);
    assert.match(r.out, noLine, line);
  }
});

test('check: a second lands-first line in a group, and an ID named twice, are reported', () => {
  const root = sharingPair();
  order(root, `**Together.**\n<!-- lands-first: ${A} -->\n<!-- lands-first: ${B} -->\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /order\.md line 3 is a second lands-first line in its group: write one, with every ID in the order they land/);
  assert.match(r.out, /NOT READY: 1 problem/);

  // One line in each of two groups is not a second line.
  add(root, C, { status: 'todo' }); add(root, D, { status: 'todo' });
  q(root, 'estimate', C, 'src/c.js'); q(root, 'estimate', D, 'src/c.js');
  order(root, `**One.**\n<!-- lands-first: ${A} -->\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n\n**Two.**\n<!-- lands-first: ${D} -->\n\n- ${C} Ticket ${C}\n- ${D} Ticket ${D}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);

  order(root, `**One.**\n<!-- lands-first: ${A}, ${B}, ${A} -->\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n\n**Two.**\n<!-- lands-first: ${D} -->\n\n- ${C} Ticket ${C}\n- ${D} Ticket ${D}\n`);
  r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`order\\.md line 2 names ${A} twice`));
  assert.match(r.out, /NOT READY: 1 problem/);
});

test('check: in a group of three sharing one file, the line settles each pair or says which one it leaves open', () => {
  const root = repo();
  for (const id of [A, B, C]) { add(root, id, { status: 'todo' }); q(root, 'estimate', id, 'src/a.js'); }
  const bullets = `- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n- ${C} Ticket ${C}\n`;

  // One ID settles that ticket against each of the others, not the others between them.
  order(root, `**Together.**\n<!-- lands-first: ${A} -->\n\n${bullets}`);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`${B} and ${C} share a group and the files src/a\\.js; its lands-first line names neither, so which lands first is open \\(add one of them to it\\)`));
  assert.match(r.out, /NOT READY: 1 problem/);

  for (const ids of [[A, B], [C, B], [C, B, A], [B, A, C]]) {
    order(root, `**Together.**\n<!-- lands-first: ${ids.join(', ')} -->\n\n${bullets}`);
    r = q(root, 'check');
    assert.equal(r.code, 0, `${ids}\n${r.out}`);
  }

  // Without the line, every pair is named.
  order(root, `**Together.**\n\n${bullets}`);
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
  const start = `**Goal.** One batch.\n\n**Together.** None of the three waits for another.\n<!-- lands-first: ${A}, ${B}, ${C} -->\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n- ${C} Ticket ${C}\n`;
  order(root, start);
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'board');
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
  assert.equal(orderText(), '**Goal.** One batch.\n\n');
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
const lineA = `- ${A} Ticket ${A}`;
const lineB = `- ${B} Ticket ${B}`;

test('check: a free paragraph, a lead-in wrapped over two lines, or a ticket under no lead-in is reported by its line number', () => {
  const root = grammarBoard();
  const none = 'is none of the lines order.md holds \\(a goal line, a lead-in, a lands-first line, a wait-for-owner line, a ticket line, a blank line\\)';
  for (const [text, ln, what, n = 1] of [
    [`A free note at the head of the file.\n\n**Together.**\n\n${lineA}\n${lineB}\n`, 1, none],
    [`**First.**\n\n${lineA}\n\nAlready done: ${C}.\n\n**Then.**\n\n${lineB}\n`, 5, none],
    [`**Together.**\n\n${lineA}\n${lineB}\nA note under the tickets.\n`, 5, none],
    [`# Order\n\n**Together.**\n\n${lineA}\n${lineB}\n`, 1, none],
    [`**Together.**\n\n${lineA}\n${lineB}\n  - ${C} Indented\n`, 5, none],
    [`**Together.**\n\n${lineA}\n${lineB}\n* ${C} Star\n`, 5, none],
    [`**Together.** A reason\nwrapped over two lines.\n\n${lineA}\n${lineB}\n`, 2, 'continues the lead-in of line 1: a lead-in is one sentence on one line'],
    [`**Together.** A reason\nwrapped\nover three lines.\n\n${lineA}\n${lineB}\n`, 3, 'continues the lead-in of line 1', 2],
    [`**Together, a reason\nwrapped.**\n\n${lineA}\n${lineB}\n`, 1, 'opens a bold lead-in that does not close on the same line: write the lead-in as one line', 2],
    [`${lineA}\n\n**Then.**\n\n${lineB}\n`, 1, `lists ${A} under no lead-in: put it in a group, below a bold lead-in`],
    [`**Goal.** One batch.\n${lineA}\n\n**Then.**\n\n${lineB}\n`, 2, `lists ${A} under no lead-in`],
    [`**Empty.** It has no ticket.\n\n**Together.**\n\n${lineA}\n${lineB}\n`, 1, 'is a lead-in with no ticket under it: give it its tickets, or remove it'],
    [`**Together.**\n\n${lineA}\n${lineB}\n\n**Closing.** No ticket.\n`, 6, 'is a lead-in with no ticket under it'],
    [`<!-- lands-first: ${A} -->\n**Together.**\n\n${lineA}\n${lineB}\n`, 1, 'is a lands-first line outside any group: put it under the lead-in of its group'],
    [`**Together.**\n\n${lineA}\n${lineB}\n${lineA}\n`, 5, `lists ${A} again, after line 3: one line per ticket`],
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`  - order\\.md line ${ln} ${what}`), `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`NOT READY: ${n} problem`), `${text}\n${r.out}`);
    assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text, 'check rewrites nothing');
  }
});

// The wait-for-owner line (261017113002): <!-- wait-for-owner --> under a
// group's lead-in, one per group, marks a group the foreman starts only with
// the owner's yes. check accepts it as a line of the grammar, names the
// groups that wait, and refuses one outside a group, a second one in a group,
// and one that only looks like it.
const waitLine = '<!-- wait-for-owner -->';
const waits = (lead, ln) => new RegExp(`\\n  the group of line ${lead} waits for the owner \\(line ${ln}\\): it starts only with their yes\\n`);

test('check: a wait-for-owner line inside a group is a line of the grammar, anywhere in it and in any spacing; check names the group that waits', () => {
  const root = grammarBoard();
  for (const [text, lead, ln] of [
    [`**First.** The reason.\n\n${lineA}\n\n**Then, after the owner tried it.** The reason.\n${waitLine}\n\n${lineB}\n`, 5, 6],
    [`**Goal.** One batch.\n\n**First.**\n${waitLine}\n${lineA}\n${lineB}\n`, 3, 4],
    [`**Together.**\n\n${lineA}\n${lineB}\n${waitLine}\n`, 1, 5],
    [`**Together.**\n<!--wait-for-owner-->\n${lineA}\n${lineB}\n`, 1, 2],
    [`**Together.**\n  <!--   wait-for-owner   -->  \n${lineA}\n${lineB}\n`, 1, 2],
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${text}\n${r.out}`);
    assert.match(r.out, waits(lead, ln), `${text}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
    assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text, 'check rewrites nothing');
  }
  // One in each of two groups is not a second one; each group is named.
  order(root, `**First.**\n${waitLine}\n\n${lineA}\n\n**Then.**\n${waitLine}\n\n${lineB}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, waits(1, 2));
  assert.match(r.out, waits(6, 7));
  // Without the line, no group is named.
  order(root, `**First.**\n\n${lineA}\n${lineB}\n`);
  assert.doesNotMatch(q(root, 'check').out, /waits for the owner/);
});

test('check: a second wait-for-owner line in one group, one outside any group, and one check cannot read are each reported by line number', () => {
  const root = grammarBoard();
  const unreadable = 'is not a wait-for-owner line check can read: write it as <!-- wait-for-owner -->';
  for (const [text, ln, what] of [
    [`**Together.**\n${waitLine}\n${waitLine}\n\n${lineA}\n${lineB}\n`, 3, 'is a second wait-for-owner line in its group, after line 2: one is enough'],
    [`**Together.**\n${waitLine}\n\n${lineA}\n${lineB}\n<!--wait-for-owner-->\n`, 6, 'is a second wait-for-owner line in its group, after line 2'],
    [`${waitLine}\n**Together.**\n\n${lineA}\n${lineB}\n`, 1, 'is a wait-for-owner line outside any group: put it under the lead-in of the group that waits'],
    [`**Goal.** One batch.\n${waitLine}\n\n**Together.**\n\n${lineA}\n${lineB}\n`, 2, 'is a wait-for-owner line outside any group'],
    ...[
      '<!-- wait for owner -->',
      '<!-- waitforowner -->',
      '<!-- Wait-For-Owner -->',
      '<!-- WAIT_FOR_OWNER -->',
      '<!-- wait-for-owner: yes -->',
      `<!-- wait-for-owner ${A} -->`,
      '<!-- wait-for-owner',
      '<!-- wait-for-owner --> until Monday',
    ].map((line) => [`**Together.**\n${line}\n\n${lineA}\n${lineB}\n`, 2, unreadable]),
  ]) {
    order(root, text);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${text}\n${r.out}`);
    assert.match(r.out, new RegExp(`  - order\\.md line ${ln} ${what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${text}\n${r.out}`);
    assert.match(r.out, /NOT READY: 1 problem/, `${text}\n${r.out}`);
    assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text, 'check rewrites nothing');
  }
});

test('check: a group that waits for the owner and already has a ticket in flight is named as started', () => {
  const root = grammarBoard();
  add(root, C, { status: 'in_progress' });
  order(root, `**First.**\n\n${lineA}\n\n**Then.**\n${waitLine}\n\n- ${C} Ticket ${C}\n${lineB}\n`);
  let r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /\n  the group of line 5 waits for the owner \(line 6\), and has started: a ticket of it is in flight\n/);
  assert.doesNotMatch(r.out, /it starts only with their yes/);
  fs.renameSync(fileOf(root, C), path.join(root, '.kerjaan', 'review', path.basename(fileOf(root, C))));
  r = q(root, 'check');
  assert.match(r.out, /waits for the owner \(line 6\), and has started/);
});

// How far the chain runs is two settings (SETTINGS.md); a value the foreman
// and worktree.sh cannot read is reported before the chain starts on it.
test('check: settings.md chain and max_parallel are read as written, and a value outside them is reported', () => {
  const root = todoBoard();
  order(root, `**Free.**\n\n- ${A} Ticket ${A}\n- ${B} Ticket ${B}\n`);
  const settingsFile = path.join(root, '.kerjaan', 'settings.md');
  const base = fs.readFileSync(settingsFile, 'utf8');
  const write = (lines) => fs.writeFileSync(settingsFile, base.replace(/\n---\n$/, `\n${lines}---\n`));
  for (const ok of ['', 'chain:\nmax_parallel:\n', 'chain: queue\n', 'chain: group\nmax_parallel: 2\n', 'chain: ticket\nmax_parallel: 1\n', 'max_parallel: 12\n']) {
    write(ok);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${ok}\n${r.out}`);
    assert.doesNotMatch(r.out, /settings\.md\n/);
  }
  for (const [bad, said, n = 1] of [
    ['chain: tickets\n', /\nsettings\.md\n  - chain in settings\.md is 'tickets': write queue, group or ticket, or leave it empty \(queue\)\.\n/],
    ['chain: Group\n', /chain in settings\.md is 'Group'/],
    ['max_parallel: 0\n', /\nsettings\.md\n  - max_parallel in settings\.md is '0': write a whole number from 1 up, or leave it empty \(no limit\)\.\n/],
    ['max_parallel: unlimited\n', /max_parallel in settings\.md is 'unlimited'/],
    ['chain: all\nmax_parallel: 2.5\n', /chain in settings\.md is 'all'[^]*max_parallel in settings\.md is '2\.5'/, 2],
  ]) {
    write(bad);
    const r = q(root, 'check');
    assert.equal(r.code, 1, `${bad}\n${r.out}`);
    assert.match(r.out, said, r.out);
    assert.match(r.out, new RegExp(`NOT READY: ${n} problem`), r.out);
  }
  // Checking named tickets is about the tickets alone.
  write('chain: tickets\n');
  assert.equal(q(root, 'check', A).code, 0);
});

test('check: one goal line at the top is accepted, written only as Goal; a second one, or one below the top, is reported by its line number', () => {
  const root = grammarBoard();
  const body = `**Together.** Neither waits for the other.\n\n${lineA}\n${lineB}\n`;
  for (const head of ['**Goal.** The app talks to the server.\n\n', '\n**Goal.** After a blank line.\n', '**Goal.**\n\n', '']) {
    order(root, head + body);
    const r = q(root, 'check');
    assert.equal(r.code, 0, `${head}\n${r.out}`);
    assert.match(r.out, /in step with todo\nREADY/);
  }
  for (const [text, ln, what] of [
    [`**Goal.** One.\n**Goal.** Two.\n\n${body}`, 2, 'is a second goal line: order.md holds one, on its first line'],
    [`**Goal.** One.\n\n${body}\n**Goal.** Two.\n`, 8, 'is a second goal line'],
    [`${body}\n**Goal.** Below.\n`, 6, 'is a goal line below the top: it goes on the first line, above every group'],
    [`An introduction.\n**Goal.** Below.\n\n${body}`, 2, 'is a goal line below the top'],
    // The word is English on a board in any language: any other is a lead-in with no ticket.
    [`**Tujuan.** One batch.\n\n${body}`, 1, 'is a lead-in with no ticket under it'],
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
  const text = (a, c) => `**First.**\n\n- ${C} ${c}\n\n**Then.**\n\n- ${A} ${a}\n${lineB}\n`;
  order(root, text(`Ticket ${A}`, `Ticket ${C}`));
  assert.equal(q(root, 'check').code, 0);
  for (const [a, c, ln, id, given] of [
    ['Title edited by hand', `Ticket ${C}`, 7, A, 'Title edited by hand'],
    [`Ticket ${A}`, 'Old title', 3, C, 'Old title'],
    ['', `Ticket ${C}`, 7, A, ''],
  ]) {
    order(root, text(a, c).replace(`- ${A} \n`, `- ${A}\n`));
    const r = q(root, 'check');
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, new RegExp(`order\\.md line ${ln} gives ${id} the title "${given}", but its ticket is titled "Ticket ${id}": copy the ticket's title \\(update-ticket\\.sh --title renames both\\)`), r.out);
    assert.match(r.out, /NOT READY: 1 problem/);
  }
  // Trailing spaces are not a different title.
  order(root, text(`Ticket ${A}  `, `Ticket ${C}`));
  assert.equal(q(root, 'check').code, 0);

  order(root, text(`Ticket ${A}`, `Ticket ${C}`));
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'board');
  for (const id of [A, C]) assert.equal(run(root, update, id, '--title', `New name ${id}`).code, 0);
  assert.equal(fs.readFileSync(path.join(root, '.kerjaan', 'order.md'), 'utf8'), text(`New name ${A}`, `New name ${C}`));
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
});

// A real order.md from another board (nukitu-mockup, 17 Oct 2026): half of it
// free paragraphs — a status that went stale within hours, the tickets
// already done, a worker's steps, the tickets kept in backlog, a dependency
// written only in a lead-in. The old file, kept as it was written, is refused
// line by line; its rewrite in the grammar (in English, titles included),
// with that dependency in blocked_by, is ready.
const real = (name) => fs.readFileSync(path.join(here, 'real-order', name), 'utf8');

function realBoard() {
  const root = repo();
  const text = real('rewritten.md');
  const F1 = '261017065501';
  add(root, F1, { status: 'done', title: 'Partners see and change their personal data, address and profile photo from the Flutter app with a real account on the server' });
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
  const old = real('old.md');
  order(root, old);
  let r = q(root, 'check');
  assert.equal(r.code, 1, r.out);
  const reported = [...r.out.matchAll(/order\.md line (\d+) (?:is none of the lines|continues the lead-in|is a lead-in with no ticket)/g)].map((m) => Number(m[1]));
  // Every line of the four paragraphs at the head, the worker's steps (a bold
  // lead-in introducing no ticket, wrapped), the backlog list, and the second
  // line of every wrapped lead-in.
  const lines = old.split('\n');
  const free = lines.flatMap((l, i) => (l.trim() && !/^\*\*/.test(l) && !/^- \d{12} /.test(l) ? [i + 1] : []));
  assert.ok(free.length >= 36, `${free.length} free lines`);
  for (const ln of [...free, 24]) assert.ok(reported.includes(ln), `line ${ln} (${lines[ln - 1]}) not reported:\n${r.out}`);
  assert.equal(reported.length, free.length + 1, r.out);
  assert.deepEqual(reported, [...reported].sort((x, y) => x - y), 'top to bottom, by line number');
  // The lead-in naming F6, bayar and F7 as waiting is backed by their blocked_by, which check reads.
  order(root, real('rewritten.md'));
  r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /order\.md\n  in step with todo\nREADY/);
  // Its lead-ins are one line each, and it names no file to change.
  assert.doesNotMatch(real('rewritten.md'), /\.dart|\.mjs|`/);
});

test('check: the marker ordering-the-queue.md documents is the one check reads', () => {
  const guide = fs.readFileSync(path.join(here, '..', 'skills', 'kerjaan', 'references', 'ordering-the-queue.md'), 'utf8');
  const section = guide.split('## Saying which lands first')[1].split('\n## ')[0];
  assert.ok(section.includes('<!-- lands-first: <id> -->'), section);
  assert.ok(section.includes('<!-- lands-first: <id>, <id> -->'), section);
  // No free phrase is offered as a way of saying it any more.
  for (const phrase of ['lands before', 'lands after', 'merged first', 'merged before']) {
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
      .replace(/^- (\d{12}) .*$/gm, (m, id) => `- ${id} Ticket ${id}`);
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
  order(root, `**First.**\n\n- ${A} Ticket ${A}\n\n**Then.**\n\n- ${B} Ticket ${B}\n`);
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
  commit(root, `${A}: work`, { 'src/web/b.js': 'b2\n', 'src/web/new.js': 'n\n', 'src/c.js': 'c\n' });
  commit(root, 'another ticket', { 'src/a.js': 'changed by somebody else\n' });
  const r = q(root, 'compare', A);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.out, [
    'Estimated and changed:', '  src/web/b.js', '  src/web/new.js',
    'Estimated, not changed:', '  docs/', '  src/a.js',
    'Changed, not estimated:', '  src/c.js', '',
  ].join('\n'));
  assert.doesNotMatch(r.out, /\.kerjaan/);
});

test('compare: work on a branch not merged yet is read from that branch', () => {
  const root = repo();
  add(root, A, { status: 'review' });
  q(root, 'estimate', A, 'src/a.js');
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'board');
  git(root, 'checkout', '-q', '-b', `ticket-${A}`);
  commit(root, `${A}: on the branch`, { 'src/a.js': 'a2\n' });
  git(root, 'checkout', '-q', 'main');
  const r = q(root, 'compare', A);
  assert.match(r.out, new RegExp(`^Read from ticket-${A}, which is not merged into HEAD\\.\\nEstimated and changed:\\n  src/a\\.js\\n`));
});

test('compare: without an estimate it lists what changed and exits 1', () => {
  const root = repo();
  add(root, A, { status: 'done' });
  commit(root, `${A}: work`, { 'src/c.js': 'c\n' });
  const r = q(root, 'compare', A);
  assert.equal(r.code, 1);
  assert.match(r.out, /No estimate was recorded for 261016400001\. Changed by its commits:\n  src\/c\.js/);
});

// --- where it runs ------------------------------------------------------------------------------

test('refuses to run from a linked worktree', () => {
  const root = repo();
  add(root, A);
  const wt = `${root}-wt`;
  git(root, 'worktree', 'add', '-q', '-b', `ticket-${A}`, wt);
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
  order(root, `**Group.**\n- ${A} Ticket ${A}\n`);
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
    for (const phrase of ['**Goal.**', 'in any language', '<!-- lands-first:', '`in_progress/`', '`NOT READY`', 'blank line']) {
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

// How far the chain runs (261017113002), said in the settings guide and the
// foreman guide alike: the three chain choices, the parallel limit, the
// wait-for-owner line, and which of them wins.
test('docs: SETTINGS.md and the foreman guide explain chain, max_parallel and the wait-for-owner line, and their order', () => {
  const ws = (t) => t.replace(/\s+/g, ' ');
  const settingsGuide = doc('skills', 'kerjaan', 'SETTINGS.md');
  const front = settingsGuide.split('---')[1];
  assert.match(front, /\nchain:\n/);
  assert.match(front, /\nmax_parallel:\n/);
  const sg = ws(settingsGuide);
  for (const phrase of ['- `chain` —', '`queue` runs on until `todo` is empty', '`group` stops once every ticket', '`ticket` stops after each ticket passes, and runs one ticket at a time, even inside a group', 'Empty or missing means `queue`',
    '- `max_parallel` —', '`worktree.sh add` refuses a worktree past it', '`1` works every ticket one after another', 'Empty or missing means no limit', 'Under `chain: ticket` the limit is 1',
    '<!-- wait-for-owner -->', 'what the owner says when starting the chain beats a mark in `order.md`, and the mark beats these settings.', 'not asked for again']) {
    assert.ok(sg.includes(phrase), `SETTINGS.md: ${phrase}`);
  }
  const section = ws(doc('skills', 'kerjaan', 'references', 'foreman.md').split('## How far the chain runs')[1].split('\n## ')[0]);
  for (const phrase of ['what they say when starting ("just one ticket") wins over a `<!-- wait-for-owner -->` line in `order.md`, which wins over `chain` in `settings.md`',
    '**`queue`**, or empty: on until `todo` is empty', '**`group`**: pause once every ticket of a group has passed', '**`ticket`**: pause after each ticket; one at a time, even inside a group',
    'starts only with their yes', 'is not asked again', '**`max_parallel`** caps the tickets worked side by side; `worktree.sh add` refuses one past it']) {
    assert.ok(section.includes(phrase), `foreman.md: ${phrase}`);
  }
  // The foreman asks about the waiting groups in the one message before the chain starts.
  assert.match(ws(doc('skills', 'kerjaan', 'references', 'foreman.md').split('**2. Ask everything in one message**')[1].split('**3. ')[0]), /each group the chain will reach that `check` names as waiting for the owner: may it start without asking again\?/);
  // The line the grammar documents is the one check reads.
  const row = doc('skills', 'kerjaan', 'references', 'ordering-the-queue.md').split('\n').find((l) => l.startsWith('| wait-for-owner line |'));
  assert.ok(row && row.includes('inside a group, at most one per group'), row);
  const line = row.match(/`(<!-- wait-for-owner -->)`/)[1];
  const root = repo();
  readyTicket(root, A, { status: 'todo' });
  order(root, `**First.** The reason.\n${line}\n\n- ${A} Ticket ${A}\n`);
  const r = q(root, 'check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /the group of line 1 waits for the owner \(line 2\)/);
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
