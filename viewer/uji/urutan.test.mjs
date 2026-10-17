// How the viewer reads the order of todo from order.md: only list lines
// `- <id> <title>` give a place, the rule queue.sh check reads by
// (references/ordering-the-queue.md). An id named anywhere else — a bold
// lead-in, a sentence, a lands-first line — is prose for people and never
// ranks a ticket.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readOrder, readOrderGroups, orderPlaces } from '../../skills/kerjaan/scripts/board.mjs';
import { ticket, makeBoard, tempRoot, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const queue = path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'queue.sh');

const ID = {
  a: '260101000001', b: '260101000002', c: '260101000003', d: '260101000004',
  e: '260101000005', f: '260101000006', g: '260101000007', h: '260101000008',
};

const orderOf = (text) => readOrder(makeBoard(tempRoot(), 'p', { 'order.md': text }));

// ---------- the reading itself, per kind of mention ----------

test('kalimat biasa yang menyebut ID tidak memberi peringkat', () => {
  assert.deepEqual(orderOf(`Sudah selesai: ${ID.b}. Sengaja tetap di backlog: ${ID.c}, ${ID.d}.\n\n- ${ID.a} Satu\n`), [ID.a]);
});

test('kalimat tebal pembuka kelompok yang menyebut ID tidak memberi peringkat', () => {
  assert.deepEqual(orderOf(`**Dulu ${ID.b}, lalu yang ini.** Karena ${ID.c}.\n\n- ${ID.a} Satu\n`), [ID.a]);
});

test('baris lands-first tidak memberi peringkat, juga untuk ID yang tidak didaftar', () => {
  assert.deepEqual(orderOf(`**Bersamaan.**\n<!-- lands-first: ${ID.b}, ${ID.a} -->\n\n- ${ID.a} Satu\n- ${ID.c} Tiga\n`), [ID.a, ID.c]);
});

test('beberapa kelompok: urutan baris daftar dari atas ke bawah, melintasi kelompok', () => {
  const text = `**Pertama.** Sebelum ${ID.a}.\n\n- ${ID.c} Tiga\n\n**Lalu dua ini.** ${ID.d} dan ${ID.b}.\n<!-- lands-first: ${ID.b} -->\n\n- ${ID.b} Dua\n- ${ID.a} Satu\n\n**Terakhir.**\n\n- ${ID.d} Empat\n`;
  assert.deepEqual(orderOf(text), [ID.c, ID.b, ID.a, ID.d]);
});

test('order.md tanpa baris daftar: tidak ada peringkat, tetapi berkasnya ada', () => {
  assert.deepEqual(orderOf(`Sudah selesai: ${ID.a}, ${ID.b}.\n\n**Nanti ${ID.c}.**\n`), []);
  assert.deepEqual(orderOf(''), []);
  assert.equal(readOrder(makeBoard(tempRoot(), 'p')), null, 'tanpa order.md sama sekali');
});

test('hanya bentuk `- <ID> <judul>` persis: menjorok, bintang, backtick, ID di tengah baris bukan tempat', () => {
  const text = `  - ${ID.b} Menjorok\n* ${ID.c} Bintang\n- \`${ID.d}\` Backtick\n- lihat ${ID.e}\n-${ID.f} Tanpa spasi\n- ${ID.g}1 Tiga belas digit\n- ${ID.a}\n- ${ID.h} Delapan\n`;
  assert.deepEqual(orderOf(text), [ID.a, ID.h]);
});

// ---------- the viewer and queue.sh check read the same list ----------

// One order.md holding every kind of mention, and the edge cases of a list
// line: no title, a stray \r, a line that only looks like a bullet, a
// duplicate.
const SAMPLE = [
  `Sudah selesai: ${ID.h}. Sengaja tetap di backlog: ${ID.g}.`,
  '',
  `**Pertama, sendiri.** Menunggu ${ID.f} selesai.`,
  '',
  `- ${ID.c} Tiga`,
  '',
  `**Lalu dua ini bersamaan.** ${ID.a} dan ${ID.b} sama-sama mengubah menu.`,
  `<!-- lands-first: ${ID.a}, ${ID.e} -->`,
  '',
  `- ${ID.a} Satu`,
  `- ${ID.b}`,
  `  - ${ID.g} Menjorok`,
  `- \`${ID.f}\` Backtick`,
  `- ${ID.e}\r`,
  '',
  `**Terakhir.**`,
  '',
  `- ${ID.d} Empat\r`,
  `- ${ID.a} Satu lagi`,
  '',
].join('\n');

// The ids queue.sh check reads as listed: with no ticket on the board, it
// names each listed one as stale, in the order of the file.
function queueReads(board) {
  const r = spawnSync('bash', [queue, 'check'], { cwd: path.dirname(board), encoding: 'utf8' });
  const ids = [...r.stdout.matchAll(/order\.md lists (\d{12}), which is not in todo, in_progress or review/g)].map((m) => m[1]);
  assert.ok(r.stdout.includes('order.md'), `queue.sh check membaca order.md:\n${r.stdout}${r.stderr}`);
  return [...new Set(ids)];
}

test('viewer dan queue.sh check membaca daftar ID yang sama dari satu order.md contoh', () => {
  const board = makeBoard(tempRoot(), 'p', { 'order.md': SAMPLE });
  const viewer = readOrder(board);
  assert.deepEqual(viewer, [ID.c, ID.a, ID.b, ID.d], 'yang dibaca viewer');
  assert.deepEqual(queueReads(board), viewer, 'queue.sh check membaca daftar yang sama');
});

// order.md also lists the tickets in flight (in_progress, review), which keep
// their line until they finish. The viewer ranks todo only, in the order
// check reads, so a ticket in flight above them takes no rank from todo.
test('an order.md that also lists tickets in flight: the viewer and queue.sh check read the same todo order', () => {
  const root = tempRoot();
  const board = makeBoard(root, 'p', {
    [`in_progress/${ID.a} One.md`]: ticket(),
    [`review/${ID.b} Two.md`]: ticket(),
    [`todo/${ID.c} Three.md`]: ticket(),
    [`todo/${ID.d} Four.md`]: ticket(),
    [`todo/${ID.e} Five.md`]: ticket(),
    'order.md': `**Goal.** One batch.\n\n**First, side by side.** Both change the menu.\n<!-- lands-first: ${ID.a} -->\n\n- ${ID.a} One\n- ${ID.b} Two\n- ${ID.d} Four\n\n**Then.** After the menu.\n\n- ${ID.c} Three\n- ${ID.e} Five\n`,
  });
  const viewer = readOrder(board);
  assert.deepEqual(viewer, [ID.a, ID.b, ID.d, ID.c, ID.e]);
  // check reads the same groups: it calls the board ready, so nothing listed is
  // stale and every todo ticket has its place; the todo ones, in that order.
  const r = spawnSync('bash', [queue, 'check'], { cwd: root + '/p', encoding: 'utf8' });
  assert.match(r.stdout, /\norder\.md\n  in step with todo\n/, r.stdout);
  assert.doesNotMatch(r.stdout, /order\.md lists|has no place|order\.md line/, r.stdout);
  const inTodo = new Set([ID.c, ID.d, ID.e]);
  assert.deepEqual(viewer.filter((id) => inTodo.has(id)), [ID.d, ID.c, ID.e]);
});

// The viewer's groups (readOrderGroups) and queue.sh check's are the same:
// every listed ticket estimates one shared file and no group says which lands
// first, so check names exactly the pairs that share a group. Read on the
// real order.md rewritten in the grammar, on one with tickets right under the
// goal line, and on one with a goal line below the top: it opens no group in
// either reader.
test('readOrderGroups and queue.sh check read the same groups, the goal line opening none', () => {
  const real = fs.readFileSync(path.join(here, '..', '..', 'uji', 'real-order', 'rewritten.md'), 'utf8');
  const crafted = `**Goal.** One batch.\n- ${ID.a} One\n- ${ID.b} Two\n\n**First.** The reason.\n\n- ${ID.c} Three\n- ${ID.d} Four\n- ${ID.e} Five\n\n**Then.** Another.\n\n- ${ID.f} Six\n`;
  const shared = '## Notes\n- 2026-10-17 11:36:22: files estimated to change: `src/shared.js`';
  // A goal line out of place is reported by check, and still splits no group.
  const misplaced = `**First.** The reason.\n\n- ${ID.a} One\n**Goal.** Below the top.\n- ${ID.b} Two\n`;
  for (const text of [real, crafted, misplaced, `${real}\n${crafted.replace('**Goal.**', '**Then, more.**')}`]) {
    const files = { 'order.md': text };
    for (const [, id, title] of text.matchAll(/^- (\d{12}) (.+)$/gm)) files[`todo/${id} ${title}.md`] = ticket({ body: shared });
    const root = tempRoot();
    makeBoard(root, 'p', files);
    const r = spawnSync('bash', [queue, 'check'], { cwd: path.join(root, 'p'), encoding: 'utf8' });
    const byCheck = [...r.stdout.matchAll(/(\d{12}) and (\d{12}) share a group and the files/g)].map((m) => `${m[1]} ${m[2]}`).sort();
    const byViewer = readOrderGroups(text).flatMap((g) => g.ids.flatMap((a) => g.ids.filter((b) => a < b).map((b) => `${a} ${b}`))).sort();
    assert.deepEqual(byViewer, byCheck, r.stdout);
  }
  assert.deepEqual(readOrderGroups(crafted).map((g) => g.ids), [[ID.a, ID.b], [ID.c, ID.d, ID.e], [ID.f]]);
  assert.deepEqual(readOrderGroups(misplaced).map((g) => g.ids), [[ID.a, ID.b]]);
});

// A wait-for-owner line (261017113002) is a line of the grammar that changes
// no group, in either reader, and both name the same groups as waiting: check
// by the lead-in's line number, the viewer by the group's start.
test('readOrderGroups and queue.sh check agree on the groups that wait for the owner, and the line splits no group', () => {
  const wait = '<!-- wait-for-owner -->';
  const text = [
    '**Goal.** One batch.',
    '',
    '**First.** Alone.',
    '',
    `- ${ID.a} One`,
    '',
    '**Then, once the owner tried it.** Together.',
    wait,
    '',
    `- ${ID.b} Two`,
    `- ${ID.c} Three`,
    '',
    '**Last.** Also waits; the line sits under the tickets.',
    `- ${ID.d} Four`,
    `  <!--wait-for-owner-->`,
    `- ${ID.e} Five`,
    '',
    '**Not waiting.** A look-alike is no wait-for-owner line.',
    '<!-- Wait for owner -->',
    `- ${ID.f} Six`,
    '',
  ].join('\n');
  const files = { 'order.md': text };
  for (const [, id, title] of text.matchAll(/^- (\d{12}) (.+)$/gm)) files[`todo/${id} ${title}.md`] = ticket();
  const root = tempRoot();
  makeBoard(root, 'p', files);
  const r = spawnSync('bash', [queue, 'check'], { cwd: path.join(root, 'p'), encoding: 'utf8' });
  const byCheck = [...r.stdout.matchAll(/the group of line (\d+) waits for the owner/g)].map((m) => Number(m[1]));
  const groups = readOrderGroups(text);
  assert.deepEqual(groups.map((g) => g.ids), [[ID.a], [ID.b, ID.c], [ID.d, ID.e], [ID.f]]);
  assert.deepEqual(groups.filter((g) => g.waitForOwner).map((g) => g.start + 1), byCheck, r.stdout);
  assert.deepEqual(byCheck, [7, 13], r.stdout);
  assert.match(r.stdout, /order\.md line 19 is not a wait-for-owner line check can read/);
  // Above the first lead-in there is no group to wait: check refuses the line, the viewer marks nothing.
  const above = `${wait}\n- ${ID.a} One\n\n**First.**\n- ${ID.b} Two\n`;
  assert.deepEqual(readOrderGroups(above).map((g) => g.waitForOwner), [false, false]);
});

// ---------- the number on a card: one per group ----------

const at = (status, id) => ({ id, status });
const placesOf = (text, tickets) => Object.fromEntries(orderPlaces(text, tickets));

test('orderPlaces: the tickets of one group share a number, the next group gets the next one', () => {
  const text = `**Goal.** One batch.\n\n**First, side by side.**\n\n- ${ID.a} One\n- ${ID.b} Two\n\n**Then.**\n\n- ${ID.c} Three\n\n**Last, together.**\n- ${ID.d} Four\n- ${ID.e} Five\n`;
  const tickets = [ID.a, ID.b, ID.c, ID.d, ID.e].map((id) => at('todo', id));
  assert.deepEqual(placesOf(text, tickets), {
    [ID.a]: { n: 1, waitsForOwner: false }, [ID.b]: { n: 1, waitsForOwner: false },
    [ID.c]: { n: 2, waitsForOwner: false },
    [ID.d]: { n: 3, waitsForOwner: false }, [ID.e]: { n: 3, waitsForOwner: false },
  });
  // List lines above the first lead-in are a group of their own, the first.
  assert.deepEqual(placesOf(`- ${ID.a} One\n\n**Then.**\n- ${ID.b} Two\n`, [at('todo', ID.a), at('todo', ID.b)]),
    { [ID.a]: { n: 1, waitsForOwner: false }, [ID.b]: { n: 2, waitsForOwner: false } });
  assert.deepEqual(placesOf('', [at('todo', ID.a)]), {});
});

test('orderPlaces: tickets in in_progress and review keep their group number', () => {
  const text = `**First.**\n\n- ${ID.a} One\n- ${ID.b} Two\n- ${ID.c} Three\n\n**Then.**\n\n- ${ID.d} Four\n`;
  for (const [sa, sb] of [['in_progress', 'review'], ['review', 'review'], ['in_progress', 'in_progress']]) {
    const p = placesOf(text, [at(sa, ID.a), at(sb, ID.b), at('todo', ID.c), at('todo', ID.d)]);
    assert.deepEqual([p[ID.a]?.n, p[ID.b]?.n, p[ID.c]?.n, p[ID.d]?.n], [1, 1, 1, 2], `${sa}, ${sb}`);
  }
  // A group made only of tickets in flight still holds its place.
  const flight = placesOf(text, [at('in_progress', ID.a), at('review', ID.b), at('done', ID.c), at('todo', ID.d)]);
  assert.deepEqual([flight[ID.a]?.n, flight[ID.b]?.n, flight[ID.c], flight[ID.d]?.n], [1, 1, undefined, 2]);
});

test('orderPlaces: once every ticket of the first group is done the next group is #1; done, cancel, backlog and unknown tickets get no number and hold no group', () => {
  const text = `**First.**\n\n- ${ID.a} One\n- ${ID.b} Two\n\n**Then.**\n\n- ${ID.c} Three\n\n**Last.**\n\n- ${ID.d} Four\n`;
  const half = placesOf(text, [at('done', ID.a), at('review', ID.b), at('todo', ID.c), at('todo', ID.d)]);
  assert.deepEqual([half[ID.a], half[ID.b]?.n, half[ID.c]?.n, half[ID.d]?.n], [undefined, 1, 2, 3], 'one ticket of the group still in review');
  for (const gone of ['done', 'cancel', 'backlog', null]) {
    const tickets = [at('done', ID.a), at('todo', ID.c), at('todo', ID.d)];
    if (gone) tickets.push(at(gone, ID.b));
    const p = placesOf(text, tickets);
    assert.deepEqual([p[ID.a], p[ID.b], p[ID.c]?.n, p[ID.d]?.n], [undefined, undefined, 1, 2], `the last of the first group: ${gone || 'not on the board'}`);
  }
  // A ticket listed twice keeps the number of its first group.
  const twice = placesOf(`**First.**\n- ${ID.a} One\n\n**Then.**\n- ${ID.b} Two\n- ${ID.a} One again\n`, [at('todo', ID.a), at('todo', ID.b)]);
  assert.deepEqual([twice[ID.a].n, twice[ID.b].n], [1, 2]);
});

const WAITING = [
  '**Goal.** One batch.',
  '',
  '**First.** Alone.',
  '',
  `- ${ID.a} One`,
  '',
  '**Then, once the owner tried it.** Together.',
  '<!-- wait-for-owner -->',
  '',
  `- ${ID.b} Two`,
  `- ${ID.c} Three`,
  '',
  '**Last.** Waits too.',
  `- ${ID.d} Four`,
  '<!-- wait-for-owner -->',
  `- ${ID.e} Five`,
  '',
].join('\n');

test('orderPlaces: every card of a group waiting for the owner carries the sign until a ticket of it is in flight', () => {
  const todoAll = placesOf(WAITING, [ID.a, ID.b, ID.c, ID.d, ID.e].map((id) => at('todo', id)));
  assert.deepEqual([ID.a, ID.b, ID.c, ID.d, ID.e].map((id) => todoAll[id].waitsForOwner), [false, true, true, true, true]);
  for (const flight of ['in_progress', 'review']) {
    const started = placesOf(WAITING, [at('done', ID.a), at(flight, ID.b), at('todo', ID.c), at('todo', ID.d), at('todo', ID.e)]);
    assert.deepEqual([ID.b, ID.c, ID.d, ID.e].map((id) => [started[id].n, started[id].waitsForOwner]),
      [[1, false], [1, false], [2, true], [2, true]], `started by a ticket in ${flight}`);
  }
});

// The cards that carry the sign are the tickets of the groups queue.sh check
// says still wait for the owner's yes, and the groups numbered are the ones
// check reads: read on each board state the sign can be in.
test('the viewer and queue.sh check agree on which groups wait for the owner, started or not', () => {
  const states = [
    { [ID.a]: 'todo', [ID.b]: 'todo', [ID.c]: 'todo', [ID.d]: 'todo', [ID.e]: 'todo' },
    { [ID.a]: 'in_progress', [ID.b]: 'todo', [ID.c]: 'todo', [ID.d]: 'todo', [ID.e]: 'todo' },
    { [ID.a]: 'done', [ID.b]: 'in_progress', [ID.c]: 'todo', [ID.d]: 'todo', [ID.e]: 'todo' },
    { [ID.a]: 'done', [ID.b]: 'done', [ID.c]: 'review', [ID.d]: 'todo', [ID.e]: 'in_progress' },
  ];
  const groups = readOrderGroups(WAITING);
  for (const state of states) {
    const files = { 'order.md': WAITING };
    for (const [, id, title] of WAITING.matchAll(/^- (\d{12}) (.+)$/gm)) files[`${state[id]}/${id} ${title}.md`] = ticket();
    const root = tempRoot();
    makeBoard(root, 'p', files);
    const r = spawnSync('bash', [queue, 'check'], { cwd: path.join(root, 'p'), encoding: 'utf8' });
    const waiting = [...r.stdout.matchAll(/the group of line (\d+) waits for the owner \(line \d+\): it starts only/g)].map((m) => Number(m[1]));
    const started = [...r.stdout.matchAll(/the group of line (\d+) waits for the owner \(line \d+\), and has started/g)].map((m) => Number(m[1]));
    const places = placesOf(WAITING, Object.entries(state).map(([id, s]) => at(s, id)));
    const signed = groups.filter((g) => g.waitForOwner && g.ids.some((id) => places[id]?.waitsForOwner)).map((g) => g.start + 1);
    const unsigned = groups.filter((g) => g.waitForOwner && g.ids.every((id) => !places[id]?.waitsForOwner)).map((g) => g.start + 1);
    assert.deepEqual(signed, waiting, `${JSON.stringify(state)}\n${r.stdout}`);
    assert.deepEqual(unsigned, started, `${JSON.stringify(state)}\n${r.stdout}`);
    // A group's cards carry the sign all together or not at all.
    for (const g of groups) assert.equal(new Set(g.ids.filter((id) => places[id]).map((id) => places[id].waitsForOwner)).size <= 1, true);
  }
});

// ---------- in a real browser ----------

const browserTest = (name, files, fn) => test(name, { skip: chromePath() ? false : 'Chrome tidak terpasang' }, async () => {
  const root = tempRoot();
  makeBoard(root, 'alpha', files);
  const v = await startViewer(root);
  const page = await openBrowser();
  try {
    await page.size(1280, 800);
    await page.goto(`${v.base}/alpha/`);
    await page.until(`() => document.querySelectorAll('#board .card').length === ${Object.keys(files).filter((f) => f.endsWith('.md') && f.includes('/')).length}`);
    await fn(v, page, root);
  } finally { await page?.close(); await v.close(); }
});

// The todo column as drawn: each card's id and its rank badge, top to bottom.
const todoColumn = `() => [...document.querySelectorAll('#board section[aria-label="todo"] .card')].map((c) => [c.dataset.id, c.querySelector('.rank')?.textContent || null])`;

const todo = (id, title, o) => ({ [`todo/${id} ${title}.md`]: ticket(o) });

browserTest('langkah di tiket: B hanya disebut di kalimat, A didaftar — A #1 di atas, B di bawahnya tanpa lencana', {
  ...todo(ID.a, 'Satu', { priority: 'low' }),
  ...todo(ID.b, 'Dua', { priority: 'high' }),
  'order.md': `Tiket ${ID.b} sengaja belum diurutkan.\n\n- ${ID.a} One\n`,
}, async (v, page) => {
  assert.deepEqual(await page.eval(todoColumn), [[ID.a, '#1'], [ID.b, null]]);
});

browserTest('kalimat tebal, kalimat biasa, dan lands-first tidak memberi lencana; beberapa kelompok diurut dari atas ke bawah', {
  ...todo(ID.a, 'Satu'),
  ...todo(ID.b, 'Dua'),
  ...todo(ID.c, 'Three'),
  ...todo(ID.d, 'Four', { priority: 'high' }),
  ...todo(ID.e, 'Five', { priority: 'low' }),
  ...todo(ID.f, 'Enam'),
  ...todo(ID.g, 'Tujuh'),
  'order.md': `Sudah dibahas: ${ID.f}.\n\n**Pertama, setelah ${ID.g}.**\n\n- ${ID.c} Three\n\n**Lalu dua ini.**\n<!-- lands-first: ${ID.e}, ${ID.a} -->\n\n- ${ID.a} One\n- ${ID.e} Five\n\n**Terakhir.** Tanpa ${ID.d}.\n\n- ${ID.b} Two\n`,
}, async (v, page) => {
  // The rest by priority, then id: d (high) before f, g (medium).
  assert.deepEqual(await page.eval(todoColumn), [
    [ID.c, '#1'], [ID.a, '#2'], [ID.e, '#2'], [ID.b, '#3'],
    [ID.d, null], [ID.f, null], [ID.g, null],
  ]);
});

// Each card in a column: its id, its number, and the wait sign's text.
const column = (status) => `() => [...document.querySelectorAll('#board section[aria-label="${status}"] .card')].map((c) => [c.dataset.id, c.querySelector('.rank')?.textContent || null, c.querySelector('.owner-wait')?.textContent || null])`;

browserTest('tickets in flight still listed in order.md keep their group number, beside the todo tickets of their group', {
  ...todo(ID.c, 'Three'),
  ...todo(ID.d, 'Four'),
  ...todo(ID.e, 'Five', { priority: 'high' }),
  [`in_progress/${ID.a} One.md`]: ticket(),
  [`review/${ID.b} Two.md`]: ticket(),
  'order.md': `**Goal.** One batch.\n\n**First, side by side.**\n<!-- lands-first: ${ID.a} -->\n\n- ${ID.a} One\n- ${ID.b} Two\n- ${ID.d} Four\n\n**Then.**\n\n- ${ID.c} Three\n`,
}, async (v, page) => {
  assert.deepEqual(await page.eval(todoColumn), [[ID.d, '#1'], [ID.c, '#2'], [ID.e, null]]);
  assert.deepEqual(await page.eval(column('in progress')), [[ID.a, '#1', null]]);
  assert.deepEqual(await page.eval(column('review')), [[ID.b, '#1', null]]);
});

browserTest('a group finished moves the next group up to #1, and a group waiting for the owner says so on every card until it starts', {
  [`done/${ID.a} One.md`]: ticket(),
  [`done/${ID.b} Two.md`]: ticket(),
  ...todo(ID.c, 'Three'),
  ...todo(ID.d, 'Four'),
  ...todo(ID.e, 'Five'),
  ...todo(ID.f, 'Six'),
  'order.md': `**Goal.** One batch.\n\n**First.**\n\n- ${ID.a} One\n- ${ID.b} Two\n\n**Then.**\n\n- ${ID.c} Three\n\n**After the owner tried it.** Together.\n<!-- wait-for-owner -->\n\n- ${ID.d} Four\n- ${ID.e} Five\n\n**Last.**\n\n- ${ID.f} Six\n`,
}, async (v, page, root) => {
  const sign = "waits for the owner's go-ahead";
  assert.deepEqual(await page.eval(column('todo')), [[ID.c, '#1', null], [ID.d, '#2', sign], [ID.e, '#2', sign], [ID.f, '#3', null]]);
  assert.deepEqual(await page.eval(column('done')), [[ID.b, null, null], [ID.a, null, null]]);
  assert.equal(await page.eval(`() => document.querySelector('#board .owner-wait').title`), 'This group starts only once the owner says yes');
  // The group starts: one of its tickets moves to in_progress, and the sign goes from both cards.
  fs.renameSync(path.join(root, 'alpha', '.kerjaan', 'todo', `${ID.d} Four.md`), path.join(root, 'alpha', '.kerjaan', 'in_progress', `${ID.d} Four.md`));
  await page.until(`() => !document.querySelector('#board .owner-wait') && document.querySelectorAll('#board section[aria-label="todo"] .card').length === 3`);
  assert.deepEqual(await page.eval(column('todo')), [[ID.c, '#1', null], [ID.e, '#2', null], [ID.f, '#3', null]]);
});

browserTest('order.md tanpa baris daftar: todo menurut prioritas lalu ID, tautan "urut order.md" membuka berkasnya', {
  ...todo(ID.a, 'Satu', { priority: 'low' }),
  ...todo(ID.b, 'Dua'),
  ...todo(ID.c, 'Tiga', { priority: 'high' }),
  ...todo(ID.d, 'Empat'),
  'order.md': `Sudah selesai: ${ID.a}, ${ID.b}.\n\n**Nanti ${ID.c} dan ${ID.d}.**\n`,
}, async (v, page) => {
  assert.deepEqual(await page.eval(todoColumn), [[ID.c, null], [ID.b, null], [ID.d, null], [ID.a, null]]);
  const link = await page.eval(`() => document.querySelector('#board section[aria-label="todo"] header [data-order]')?.textContent`);
  assert.equal(link, 'urut order.md');
  await page.eval(`() => document.querySelector('#board [data-order]').click()`);
  await page.until(`() => !document.getElementById('drawer').hidden && location.pathname === '/alpha/urutan' && document.getElementById('drawer-body').textContent.includes('Sudah selesai')`);
  assert.equal(await page.eval(`() => document.querySelector('#drawer-head .mono').textContent`), '.kerjaan/order.md');
});
