// repair.sh duplicate-id: two tickets sharing an ID are put right with one
// command. The older keeps the ID, the younger takes the next free number,
// its created stays, the change is recorded, order.md follows it, and every
// other reference that could mean either ticket is listed, not guessed at.
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
const repair = path.join(scripts, 'repair.sh');
const update = path.join(scripts, 'update-ticket.sh');

const ID = '261017120005';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
delete gitEnv.CLAUDE_CODE_SESSION_ID;

const STAMP = String.raw`\d{4}-\d\d-\d\d \d\d:\d\d:\d\d`;

function ticketText({ created, blockedBy = [] }) {
  return `---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: ${created}
updated: ${created}
related: []
blocked_by: [${blockedBy.join(', ')}]
---

## Background
Something.

## Done when
- [ ] One

## History
- ${created} todo

## Notes
(none yet)
`;
}

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function repo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-repair-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), '---\nlanguage: English\n---\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'initial');
  return root;
}

function add(root, id, title, { status = 'todo', created = '2026-10-17 12:00:00', blockedBy } = {}) {
  const file = path.join(root, '.kerjaan', status, `${id} ${title}.md`);
  fs.writeFileSync(file, ticketText({ created, blockedBy }));
  return file;
}

function run(cwd, script, ...args) {
  const r = spawnSync('bash', [script, ...args], { cwd, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const names = (root) => ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']
  .flatMap((s) => fs.readdirSync(path.join(root, '.kerjaan', s)).filter((n) => n.endsWith('.md')).map((n) => `${s}/${n}`))
  .sort();

function snapshot(root) {
  const out = {};
  for (const n of names(root)) out[n] = fs.readFileSync(path.join(root, '.kerjaan', n), 'utf8');
  const order = path.join(root, '.kerjaan', 'order.md');
  if (fs.existsSync(order)) out['order.md'] = fs.readFileSync(order, 'utf8');
  return out;
}

// --- finding them --------------------------------------------------------------------

test('with no ID it lists every shared ID with its tickets, and exits 1; a clean board exits 0', () => {
  const root = repo();
  add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  add(root, ID, 'New', { status: 'backlog', created: '2026-10-17 12:30:00' });
  add(root, '261017120006', 'Alone');
  const r = run(root, repair, 'duplicate-id');
  assert.equal(r.code, 1);
  assert.match(r.out, new RegExp(`^${ID} is used by:\n  backlog/${ID} New\\.md \\(created 2026-10-17 12:30:00\\)\n  todo/${ID} Old\\.md \\(created 2026-10-17 12:00:00\\)$`, 'm'));
  assert.doesNotMatch(r.out, /261017120006/);
  assert.match(r.out, /repair\.sh duplicate-id <id>/);

  const clean = repo();
  add(clean, ID, 'Alone');
  const ok = run(clean, repair, 'duplicate-id');
  assert.equal(ok.code, 0);
  assert.match(ok.out, /No two tickets share an ID\./);
});

// --- one command ---------------------------------------------------------------------

test('one command: the older keeps the ID, the younger takes the next free number of its minute', () => {
  const root = repo();
  const old = add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  const young = add(root, ID, 'New', { status: 'backlog', created: '2026-10-17 12:30:00' });
  add(root, '261017120007', 'Tetangga', { status: 'done' });
  const oldText = fs.readFileSync(old, 'utf8');
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 0, r.err);
  // 05 and 07 are taken in that minute, so 08: counted across every folder.
  const moved = path.join(root, '.kerjaan', 'backlog', '261017120008 New.md');
  assert.equal(fs.existsSync(young), false);
  assert.equal(fs.existsSync(moved), true);
  assert.equal(fs.readFileSync(old, 'utf8'), oldText, 'the one keeping the ID is untouched');
  const text = fs.readFileSync(moved, 'utf8');
  assert.match(text, /^created: 2026-10-17 12:30:00$/m, 'created stays');
  assert.doesNotMatch(text, /^updated: 2026-10-17 12:30:00$/m, 'updated is refreshed');
  assert.match(text, new RegExp(`\n## Notes\n- ${STAMP}: renumbered from ${ID} to 261017120008 by repair\\.sh duplicate-id: ${ID} was also used by ${ID} Old, which keeps it\\.\n$`));
  assert.match(r.out, new RegExp(`Renumbered: backlog/${ID} New\\.md -> backlog/261017120008 New\\.md`));
  assert.match(r.out, new RegExp(`Kept ${ID}: todo/${ID} Old\\.md`));
  // Both answer to their own ID now.
  assert.equal(run(root, update, ID).code, 0);
  assert.equal(run(root, update, '261017120008').code, 0);
  assert.equal(run(root, repair, 'duplicate-id').code, 0);
});

test('the older is found by created, whichever folder or title sorts first', () => {
  const root = repo();
  add(root, ID, 'A comes first by alphabet', { status: 'backlog', created: '2026-10-17 12:40:00' });
  const keep = add(root, ID, 'Z comes last', { status: 'done', created: '2026-10-17 12:10:00' });
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.existsSync(keep), true);
  assert.deepEqual(names(root), ['backlog/261017120006 A comes first by alphabet.md', `done/${ID} Z comes last.md`]);
});

test('three tickets on one ID: all but the oldest get numbers of their own', () => {
  const root = repo();
  add(root, ID, 'One', { created: '2026-10-17 12:00:00' });
  add(root, ID, 'Two', { created: '2026-10-17 12:01:00' });
  add(root, ID, 'Three', { created: '2026-10-17 12:02:00' });
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 0, r.err);
  const ids = names(root).map((n) => n.split('/')[1].slice(0, 12)).sort();
  assert.deepEqual(ids, [ID, '261017120006', '261017120007']);
  assert.ok(names(root).includes(`todo/${ID} One.md`));
});

test('its line in order.md follows it; the line of the one keeping the ID stays', () => {
  const root = repo();
  add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  add(root, ID, 'New', { created: '2026-10-17 12:30:00' });
  const order = path.join(root, '.kerjaan', 'order.md');
  fs.writeFileSync(order, `# Order\n\n**Group 1, together.**\n- ${ID} Old\n- ${ID} New\n`);
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.readFileSync(order, 'utf8'), `# Order\n\n**Group 1, together.**\n- ${ID} Old\n- 261017120006 New\n`);
  assert.doesNotMatch(r.out, /order\.md/, 'nothing left to read in order.md');
});

for (const status of ['in_progress', 'review']) {
  test(`its line in order.md follows it in ${status} too, where a ticket keeps its line until it finishes`, () => {
    const root = repo();
    add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
    add(root, ID, 'New', { created: '2026-10-17 12:30:00', status });
    const order = path.join(root, '.kerjaan', 'order.md');
    fs.writeFileSync(order, `**Group 1, together.**\n- ${ID} Old\n- ${ID} New\n`);
    const r = run(root, repair, 'duplicate-id', ID);
    assert.equal(r.code, 0, r.err);
    assert.equal(fs.readFileSync(order, 'utf8'), `**Group 1, together.**\n- ${ID} Old\n- 261017120006 New\n`);
  });
}

test('references that could mean either ticket are listed with their lines, and left as they are', () => {
  const root = repo();
  add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  add(root, ID, 'New', { created: '2026-10-17 12:30:00' });
  const ref = add(root, '261017130001', 'Bergantung', { status: 'backlog', blockedBy: [ID] });
  fs.writeFileSync(path.join(root, '.kerjaan', 'order.md'), `**Group 1.**\n<!-- lands-first: ${ID} -->\n- ${ID} Old\n- ${ID} New\n`);
  git(root, 'branch', `ticket-${ID}`);
  const refText = fs.readFileSync(ref, 'utf8');
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.readFileSync(ref, 'utf8'), refText, 'a reference is never changed for the reader');
  assert.match(r.out, /Each could mean either ticket/);
  assert.match(r.out, new RegExp(`^  \\.kerjaan/backlog/261017130001 Bergantung\\.md:11:blocked_by: \\[${ID}\\]$`, 'm'));
  assert.match(r.out, new RegExp(`^  \\.kerjaan/order\\.md:2:<!-- lands-first: ${ID} -->$`, 'm'));
  assert.match(r.out, new RegExp(`^  branch ticket-${ID}$`, 'm'));
  assert.doesNotMatch(r.out, new RegExp(`order\\.md:3:- ${ID} Old`), 'the kept ticket\'s own line means the kept ticket');
});

test('given a path, that ticket is renumbered, even when their age cannot tell', () => {
  const root = repo();
  const keep = add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  const pick = add(root, ID, 'New', { created: '2026-10-17 12:00:00' });
  const tie = run(root, repair, 'duplicate-id', ID);
  assert.equal(tie.code, 1);
  assert.match(tie.err, /REFUSED: nothing was changed\..*both created at 2026-10-17 12:00:00/s);
  assert.match(tie.err, /repair\.sh duplicate-id <path>/);
  assert.deepEqual(names(root), [`todo/${ID} New.md`, `todo/${ID} Old.md`]);

  const r = run(root, repair, 'duplicate-id', path.relative(root, keep));
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(names(root), [`todo/${ID} New.md`, 'todo/261017120006 Old.md']);
  assert.equal(fs.existsSync(pick), true);
});

test('a ticket without a readable created is not guessed at', () => {
  const root = repo();
  add(root, ID, 'Old', { created: '2026-10-17 12:00:00' });
  const broken = add(root, ID, 'Rusak', { created: 'kemarin' });
  const before = snapshot(root);
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 1);
  assert.match(r.err, new RegExp(`todo/${ID} Rusak\\.md has no readable created:`));
  assert.deepEqual(snapshot(root), before);
  assert.equal(run(root, repair, 'duplicate-id', broken).code, 0);
});

test('a full minute rolls over into the next one, across the end of the year', () => {
  const root = repo();
  const id = '261231235905';
  add(root, id, 'Old', { created: '2026-12-31 23:59:00' });
  add(root, id, 'New', { created: '2026-12-31 23:59:30' });
  // The rest of that minute is taken, 01 to 99.
  for (let i = 1; i <= 99; i++) {
    if (i !== 5) fs.writeFileSync(path.join(root, '.kerjaan', 'cancel', `2612312359${String(i).padStart(2, '0')} Filler.md`), '');
  }
  assert.equal(fs.readdirSync(path.join(root, '.kerjaan', 'cancel')).filter((n) => n.startsWith('2612312359')).length, 98);
  const r = run(root, repair, 'duplicate-id', id);
  assert.equal(r.code, 0, r.err);
  assert.ok(names(root).includes('todo/270101000001 New.md'), names(root).filter((n) => n.startsWith('todo')).join(', '));
});

test('nothing to repair: an ID used once, or by no ticket', () => {
  const root = repo();
  const only = add(root, ID, 'Alone');
  for (const arg of [ID, only, '261017999999']) {
    const r = run(root, repair, 'duplicate-id', arg);
    assert.equal(r.code, 1, arg);
    assert.match(r.err, /nothing to repair/);
  }
  assert.deepEqual(names(root), [`todo/${ID} Alone.md`]);
});

test('misuse exits 2 and changes nothing', () => {
  const root = repo();
  add(root, ID, 'Old');
  add(root, ID, 'New', { created: '2026-10-17 12:30:00' });
  const before = snapshot(root);
  for (const args of [[], ['other'], ['duplicate-id', 'not-an-id'], ['duplicate-id', ID, 'again'], ['duplicate-id', path.join(root, 'code.txt')]]) {
    assert.equal(run(root, repair, ...args).code, 2, args.join(' '));
  }
  assert.deepEqual(snapshot(root), before);
});

test('it waits for the board lock like every other writer, and changes nothing if the wait runs out', () => {
  const root = repo();
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), '---\nlock_timeout: 1\n---\n');
  add(root, ID, 'Old');
  add(root, ID, 'New', { created: '2026-10-17 12:30:00' });
  const lock = path.join(root, '.git', 'kerjaan-locks', 'board.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(path.join(lock, 'owner'), `${process.pid}\tupdate-ticket.sh, process ${process.pid}\n`);
  const before = snapshot(root);
  const r = run(root, repair, 'duplicate-id', ID);
  assert.equal(r.code, 2);
  assert.match(r.err, /Gave up waiting for the board lock/);
  assert.deepEqual(snapshot(root), before);
});

test('the scripts that find a duplicate point at this command, and repairs.md describes it', () => {
  const root = repo();
  add(root, ID, 'Old');
  add(root, ID, 'New', { created: '2026-10-17 12:30:00' });
  const r = run(root, update, ID);
  assert.match(r.err, new RegExp(`${scripts.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/repair\\.sh duplicate-id ${ID}`));
  const doc = fs.readFileSync(path.join(here, '..', 'skills', 'kerjaan', 'references', 'repairs.md'), 'utf8');
  assert.match(doc, /repair\.sh" duplicate-id/);
});
