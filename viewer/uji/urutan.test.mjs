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
import { readOrder } from '../../skills/kerjaan/scripts/board.mjs';
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
    await fn(v, page);
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
    [ID.c, '#1'], [ID.a, '#2'], [ID.e, '#3'], [ID.b, '#4'],
    [ID.d, null], [ID.f, null], [ID.g, null],
  ]);
});

browserTest('tickets in flight still listed in order.md take no todo rank', {
  ...todo(ID.c, 'Three'),
  ...todo(ID.d, 'Four'),
  ...todo(ID.e, 'Five', { priority: 'high' }),
  [`in_progress/${ID.a} One.md`]: ticket(),
  [`review/${ID.b} Two.md`]: ticket(),
  'order.md': `**Goal.** One batch.\n\n**First, side by side.**\n<!-- lands-first: ${ID.a} -->\n\n- ${ID.a} One\n- ${ID.b} Two\n- ${ID.d} Four\n\n**Then.**\n\n- ${ID.c} Three\n`,
}, async (v, page) => {
  assert.deepEqual(await page.eval(todoColumn), [[ID.d, '#1'], [ID.c, '#2'], [ID.e, null]]);
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
