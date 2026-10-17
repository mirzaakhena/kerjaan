import test from 'node:test';
import assert from 'node:assert/strict';
import { readDoneWhen, readTicket } from '../../skills/kerjaan/scripts/board.mjs';
import { pills, pillSummary } from '../web/pil.js';
import { ticket, makeBoard, tempRoot } from './bantu.mjs';

const keadaan = (items) => items.map((i) => (i.struck ? '-' : i.done ? 'x' : '_')).join('');
const kelas = (html) => [...html.matchAll(/class="pil( [a-z]+)?"/g)].map((m) => (m[1] || '').trim() || 'open');

test('Done when: butir tingkat atas, berurutan, tercentang atau belum', () => {
  const body = '## Done when\n- [x] a\n- [ ] b\n- [X] c\n- [ ] d';
  assert.equal(keadaan(readDoneWhen(body)), 'x_x_');
});

test('Done when: hanya di bawah judulnya; kotak di bagian lain tidak dihitung', () => {
  const body = '## Background\n- [x] bukan\n\n## Done when\n- [ ] a\n\n## Notes\n- [x] bukan juga';
  assert.equal(keadaan(readDoneWhen(body)), '_');
  assert.deepEqual(readDoneWhen('## Background\n- [x] a\n\n## Notes\n- [ ] b'), []);
  assert.deepEqual(readDoneWhen('## Done when\n\n## Notes\n- [ ] b'), []);
});

test('Done when: blok berpagar dan baris menjorok tidak dihitung', () => {
  const body = '## Done when\n- [ ] a\n```\n- [x] dalam pagar\n```\n~~~\n- [x] pagar lain\n~~~\n  - [x] anak butir\n- [x] b';
  assert.equal(keadaan(readDoneWhen(body)), '_x');
});

test('Done when: butir yang dicoret ditandai, tercentang atau tidak', () => {
  const body = '## Done when\n- [x] a\n- [ ] ~~b~~ dipindah ke 260101000009\n- [x] ~~c~~ dibatalkan\n- [ ] d ~~sebagian~~';
  assert.deepEqual(readDoneWhen(body), [
    { done: true, struck: false },
    { done: false, struck: true },
    { done: true, struck: true },
    { done: false, struck: false },
  ]);
});

test('checks menghitung butir Done when yang tidak dicoret', () => {
  const root = tempRoot();
  const board = makeBoard(root, 'p', {
    'todo/260101000001 A.md': ticket({ body: '## Done when\n- [x] a\n- [ ] ~~b~~\n- [x] ~~c~~\n- [ ] d\n\n## Notes\n- [x] bukan' }),
  });
  const t = readTicket(board, 'todo', '260101000001 A.md');
  assert.equal(keadaan(t.doneWhen), 'x--_');
  assert.deepEqual(t.checks, [1, 2]);
});

test('pil: satu per butir, urut, terisi / bergaris tepi / dicoret', () => {
  const items = readDoneWhen('## Done when\n- [x] a\n- [x] b\n- [ ] c\n- [ ] ~~d~~\n- [x] ~~e~~\n- [x] f\n- [ ] g');
  assert.deepEqual(kelas(pills(items)), ['done', 'done', 'open', 'struck', 'struck', 'done', 'open']);
});

test('pil: banyak butir tetap satu pil per butir', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ done: i % 3 !== 2, struck: false }));
  const html = pills(items);
  assert.equal(kelas(html).length, 20);
  assert.match(html, /aria-label="14 dari 20 selesai"/);
});

test('pil: tanpa Done when tidak ada deretan', () => {
  assert.equal(pills([]), '');
  assert.equal(pills(undefined), '');
});

test('pil: tooltip dan pembaca layar menyebut jumlah yang sama', () => {
  const items = [{ done: true, struck: false }, { done: false, struck: false }, { done: false, struck: true }];
  const html = pills(items, { className: 'progress' });
  assert.match(html, /^<span class="pills progress" role="img" /);
  assert.match(html, /aria-label="1 dari 2 selesai, 1 dicoret"/);
  assert.match(html, /title="1 dari 2 selesai, 1 dicoret"/);
});

test('ringkasan jumlah', () => {
  const p = (s) => [...s].map((c) => ({ done: c === 'x', struck: c === '-' }));
  assert.equal(pillSummary(p('xxxxx___')), '5 dari 8 selesai');
  assert.equal(pillSummary(p('xxx')), '3 dari 3 selesai');
  assert.equal(pillSummary(p('___')), '0 dari 3 selesai');
  assert.equal(pillSummary(p('x-_')), '1 dari 2 selesai, 1 dicoret');
  assert.equal(pillSummary(p('--')), '2 butir dicoret');
});

test('kartu menggambar deretan pil, bukan angka x/y', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../web/proyek.js', import.meta.url), 'utf8');
  const card = src.slice(src.indexOf('function card('), src.indexOf('function drawBoard('));
  assert.match(card, /pills\(t\.doneWhen/);
  assert.doesNotMatch(card, /\$\{done\}\/\$\{total\}/);
});
