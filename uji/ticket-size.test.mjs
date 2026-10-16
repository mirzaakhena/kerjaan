// The size warning: a ticket whose "Done when" list is over the board's limit
// is still saved, and the script that saved it says so, naming the count.
//
// Every test builds a throwaway board outside any git repo and runs the real
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
const update = path.join(scripts, 'update-ticket.sh');
const create = path.join(scripts, 'new-ticket.sh');
const size = path.join(scripts, 'ticket-size.sh');
const id = '261013210001';

const items = (n, mark = ' ') =>
  Array.from({ length: n }, (_, i) => `- [${mark}] Butir ke-${i + 1} bisa dicoba sendiri`).join('\n');

function ticket({ doneWhen, notes = '(none yet)' }) {
  return `---
type: feature
priority: high
review:
labels: []
reporter: mirza
assign_to:
created: 2026-10-13 21:00:00
updated: 2026-10-13 21:00:00
related: []
blocked_by: []
---

## Background
Sesuatu.

## Request
Sesuatu.

## Done when
${doneWhen}

## History
- 2026-10-13 21:00:00 backlog

## Notes
${notes}
`;
}

function board({ status = 'backlog', settings, ...t }) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-size-')));
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  if (settings !== undefined) fs.writeFileSync(path.join(k, 'settings.md'), settings);
  const file = path.join(k, status, `${id} Layar kategori.md`);
  if (t.doneWhen !== undefined) fs.writeFileSync(file, ticket(t));
  return { root, file };
}

function run(script, root, ...args) {
  const r = spawnSync('bash', [script, ...args], { cwd: root, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const settingsWith = (line) => `---
language: Bahasa Indonesia
test_command:
long_lived_branches: []
${line}
---

Pengaturan.
`;

const warned = (err) => /WARNING: \d{12} has \d+ "Done when" items/.test(err);

// --- the warning itself ------------------------------------------------------

test('over the default limit of 8: warns with the count, and the ticket is still saved', () => {
  const { root, file } = board({ doneWhen: items(9) });
  const r = run(update, root, id);
  assert.equal(r.code, 0);
  assert.match(r.err, new RegExp(`WARNING: ${id} has 9 "Done when" items, over this board's limit of 8`));
  assert.match(r.err, /split by outcome/);
  assert.match(r.err, /--accept-size/);
  assert.match(r.err, /saved as it is/);
  assert.equal(r.out.trim(), file);
  const text = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(text, /updated: 2026-10-13 21:00:00/, 'updated was refreshed');
  assert.equal((text.match(/^- \[ \]/gm) || []).length, 9, 'nothing was taken out');
});

test('exactly at the default limit of 8: no warning', () => {
  const { root } = board({ doneWhen: items(8) });
  const r = run(update, root, id);
  assert.equal(r.code, 0);
  assert.ok(!warned(r.err), r.err);
});

test('ticked items count the same as open ones', () => {
  const { root } = board({ doneWhen: items(5, 'x') + '\n' + items(5) });
  const r = run(update, root, id);
  assert.match(r.err, /has 10 "Done when" items/);
});

test('a move to todo warns, and the move still happens', () => {
  const { root } = board({ doneWhen: items(12) });
  const r = run(update, root, id, '--status', 'todo');
  assert.equal(r.code, 0);
  assert.match(r.err, /has 12 "Done when" items/);
  assert.ok(r.out.trim().includes(`${path.sep}todo${path.sep}`));
});

test('a start (move to in_progress) warns, and the move still happens', () => {
  const { root } = board({ status: 'todo', doneWhen: items(12) });
  const r = run(update, root, id, '--status', 'in_progress');
  assert.equal(r.code, 0);
  assert.match(r.err, /has 12 "Done when" items/);
  assert.ok(r.out.trim().includes(`${path.sep}in_progress${path.sep}`));
});

test('a rename warns too: every update goes through the check', () => {
  const { root } = board({ doneWhen: items(9) });
  const r = run(update, root, id, '--title', 'Layar kategori baru');
  assert.equal(r.code, 0);
  assert.match(r.err, /has 9 "Done when" items/);
});

for (const status of ['review', 'done', 'cancel']) {
  test(`no warning once the ticket is in ${status}: its claim is already made`, () => {
    const from = status === 'review' ? 'in_progress' : 'backlog';
    const { root } = board({ status: from, doneWhen: items(12) });
    const r = run(update, root, id, '--status', status);
    assert.equal(r.code, 0, r.err);
    assert.ok(!warned(r.err), r.err);
  });
}

test('new-ticket.sh runs the check: a template with standing criteria over the limit warns', () => {
  // A copy of the scripts folder whose TEMPLATE.md carries 9 criteria.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-size-new-'));
  const skill = path.join(root, 'skill');
  fs.mkdirSync(path.join(skill, 'scripts'), { recursive: true });
  for (const f of ['new-ticket.sh', 'ticket-size.sh', 'lib.sh']) {
    fs.copyFileSync(path.join(scripts, f), path.join(skill, 'scripts', f));
  }
  const template = fs.readFileSync(path.join(scripts, '..', 'TEMPLATE.md'), 'utf8')
    .replace('## Done when\n- [ ]\n', `## Done when\n${items(9)}\n`);
  fs.writeFileSync(path.join(skill, 'TEMPLATE.md'), template);
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const r = run(path.join(skill, 'scripts', 'new-ticket.sh'), repo, 'backlog', 'Tiket besar');
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, /has 9 "Done when" items, over this board's limit of 8/);
  assert.ok(fs.existsSync(r.out.trim()), 'the ticket was created');
});

test('new-ticket.sh with the real template: no warning', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-size-new-'));
  const r = run(create, root, 'backlog', 'Tiket kosong');
  assert.equal(r.code, 0, r.err);
  assert.ok(!warned(r.err), r.err);
});

// --- what counts as an item --------------------------------------------------

test('continuation lines and sub-bullets belong to the item above and are not counted', () => {
  const doneWhen = Array.from({ length: 8 }, (_, i) =>
    `- [ ] Butir ${i + 1} yang panjang\n      dan berlanjut ke baris kedua\n  - [ ] rincian di bawahnya`).join('\n');
  const { root } = board({ doneWhen });
  assert.ok(!warned(run(update, root, id).err));
});

test('struck items (voided or moved to another ticket) are not counted', () => {
  const doneWhen = items(8) + '\n- [ ] ~~Butir yang dipindah~~ — pindah ke 261013210002\n- [x] ~~Butir lain~~ — dibatalkan';
  const { root } = board({ doneWhen });
  assert.ok(!warned(run(update, root, id).err));
});

test('checkboxes in a fenced block, or outside Done when, are not counted', () => {
  const doneWhen = items(8) + '\n\n```markdown\n' + items(5) + '\n```';
  const notes = 'Contoh:\n' + items(5);
  const { root } = board({ doneWhen, notes });
  assert.ok(!warned(run(update, root, id).err));
});

// --- the owner keeps a ticket whole -----------------------------------------

test('--accept-size records the decision in Notes, and the warning stops for that ticket', () => {
  const { root, file } = board({ doneWhen: items(12) });
  const r = run(update, root, id, '--accept-size');
  assert.equal(r.code, 0, r.err);
  assert.ok(!warned(r.err), 'not warned on the run that records it');
  const text = fs.readFileSync(file, 'utf8');
  const notes = text.slice(text.indexOf('## Notes'));
  assert.match(notes, /^- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d: size accepted by the owner/m);
  assert.doesNotMatch(notes, /\(none yet\)/, 'the placeholder was replaced');
  for (const args of [[id], [id, '--status', 'todo']]) {
    const again = run(update, root, ...args);
    assert.equal(again.code, 0);
    assert.ok(!warned(again.err), `not warned again on ${args.join(' ')}`);
  }
  // Growing further is still the owner's accepted decision: no repeat.
  const now = fs.readFileSync(path.join(root, '.kerjaan', 'todo', path.basename(file)), 'utf8');
  fs.writeFileSync(path.join(root, '.kerjaan', 'todo', path.basename(file)),
    now.replace('## History', items(3) + '\n\n## History'));
  assert.ok(!warned(run(update, root, id).err));
});

test('--accept-size appends after earlier notes rather than replacing them', () => {
  const { root, file } = board({ doneWhen: items(12), notes: '- Catatan lama.' });
  run(update, root, id, '--accept-size');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /- Catatan lama\.\n- .*size accepted by the owner/);
});

test('an acceptance written by hand in Notes counts too', () => {
  const notes = '- Keputusan mirza, 2026-10-13: tiket ini tetap utuh (size accepted by the owner).';
  const { root } = board({ doneWhen: items(12), notes });
  assert.ok(!warned(run(update, root, id).err));
});

test('the acceptance phrase only counts at the start of a bullet in Notes', () => {
  for (const notes of [
    '```\n- size accepted by the owner\n```',              // a quoted example
    'Kalau pemilik setuju, tulis: size accepted by the owner', // prose, not a record
  ]) {
    const { root } = board({ doneWhen: items(12), notes });
    assert.match(run(update, root, id).err, /has 12 "Done when" items/, notes);
  }
  // In Background rather than Notes: not a decision either.
  const { root, file } = board({ doneWhen: items(12) });
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8')
    .replace('## Background\nSesuatu.', '## Background\n- size accepted by the owner'));
  assert.match(run(update, root, id).err, /has 12 "Done when" items/);
});

// --- the board's own limit ---------------------------------------------------

test('done_when_limit in settings.md sets the limit for the board', () => {
  const settings = settingsWith('done_when_limit: 3');
  const over = board({ doneWhen: items(4), settings });
  assert.match(run(update, over.root, id).err, /has 4 "Done when" items, over this board's limit of 3/);
  const at = board({ doneWhen: items(3), settings });
  assert.ok(!warned(run(update, at.root, id).err));
});

test('a higher board limit lets a bigger ticket through', () => {
  const { root } = board({ doneWhen: items(12), settings: settingsWith('done_when_limit: 15') });
  assert.ok(!warned(run(update, root, id).err));
});

test('settings.md without the key, or empty, uses the default of 8', () => {
  for (const settings of [settingsWith(''), settingsWith('done_when_limit:')]) {
    const over = board({ doneWhen: items(9), settings });
    assert.match(run(update, over.root, id).err, /limit of 8/);
    const at = board({ doneWhen: items(8), settings });
    assert.ok(!warned(run(update, at.root, id).err));
  }
});

test('the key below the frontmatter is prose, not a setting', () => {
  const settings = settingsWith('') + '\ndone_when_limit: 3\n';
  const { root } = board({ doneWhen: items(4), settings });
  assert.ok(!warned(run(update, root, id).err));
});

test('a limit that is not a whole number of 1 or more says so and uses the default', () => {
  for (const value of ['delapan', '0', '-2']) {
    const { root } = board({ doneWhen: items(9), settings: settingsWith(`done_when_limit: ${value}`) });
    const r = run(update, root, id);
    assert.equal(r.code, 0);
    assert.match(r.err, new RegExp(`done_when_limit .* is '${value}'`));
    assert.match(r.err, /limit of 8/);
  }
});

// --- run on its own ----------------------------------------------------------

test('ticket-size.sh on its own checks without changing the ticket', () => {
  const { root, file } = board({ doneWhen: items(9) });
  const before = fs.readFileSync(file, 'utf8');
  for (const arg of [id, file]) {
    const r = run(size, root, arg);
    assert.equal(r.code, 0);
    assert.match(r.err, /has 9 "Done when" items/);
    assert.equal(r.out, '');
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
