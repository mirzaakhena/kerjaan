import test from 'node:test';
import assert from 'node:assert/strict';
import { readDoneWhen, readTicket } from '../../skills/kerjaan/scripts/board.mjs';
import { pills, pillSummary } from '../web/pills.js';
import { ticket, makeBoard, tempRoot } from './helpers.mjs';

const states = (items) => items.map((i) => (i.struck ? '-' : i.done ? 'x' : '_')).join('');
const classes = (html) => [...html.matchAll(/class="pill( [a-z]+)?"/g)].map((m) => (m[1] || '').trim() || 'open');

test('Done when: top-level items, in order, ticked or not', () => {
  const body = '## Done when\n- [x] a\n- [ ] b\n- [X] c\n- [ ] d';
  assert.equal(states(readDoneWhen(body)), 'x_x_');
});

test('Done when: only under its heading; boxes in other sections are not counted', () => {
  const body = '## Background\n- [x] not this\n\n## Done when\n- [ ] a\n\n## Notes\n- [x] nor this';
  assert.equal(states(readDoneWhen(body)), '_');
  assert.deepEqual(readDoneWhen('## Background\n- [x] a\n\n## Notes\n- [ ] b'), []);
  assert.deepEqual(readDoneWhen('## Done when\n\n## Notes\n- [ ] b'), []);
});

test('Done when: fenced blocks and indented lines are not counted', () => {
  const body = '## Done when\n- [ ] a\n```\n- [x] in a fence\n```\n~~~\n- [x] another fence\n~~~\n  - [x] a child item\n- [x] b';
  assert.equal(states(readDoneWhen(body)), '_x');
});

test('Done when: struck items are marked, ticked or not', () => {
  const body = '## Done when\n- [x] a\n- [ ] ~~b~~ moved to 260101000009\n- [x] ~~c~~ cancelled\n- [ ] d ~~partly~~';
  assert.deepEqual(readDoneWhen(body), [
    { done: true, struck: false },
    { done: false, struck: true },
    { done: true, struck: true },
    { done: false, struck: false },
  ]);
});

test('checks counts the Done when items not struck', () => {
  const root = tempRoot();
  const board = makeBoard(root, 'p', {
    'todo/260101000001 A.md': ticket({ body: '## Done when\n- [x] a\n- [ ] ~~b~~\n- [x] ~~c~~\n- [ ] d\n\n## Notes\n- [x] not this' }),
  });
  const t = readTicket(board, 'todo', '260101000001 A.md');
  assert.equal(states(t.doneWhen), 'x--_');
  assert.deepEqual(t.checks, [1, 2]);
});

test('pills: one per item, in order, filled / outlined / struck', () => {
  const items = readDoneWhen('## Done when\n- [x] a\n- [x] b\n- [ ] c\n- [ ] ~~d~~\n- [x] ~~e~~\n- [x] f\n- [ ] g');
  assert.deepEqual(classes(pills(items)), ['done', 'done', 'open', 'struck', 'struck', 'done', 'open']);
});

test('pills: many items still one pill per item', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ done: i % 3 !== 2, struck: false }));
  const html = pills(items);
  assert.equal(classes(html).length, 20);
  assert.match(html, /aria-label="14 of 20 done"/);
});

test('pills: no Done when, no row', () => {
  assert.equal(pills([]), '');
  assert.equal(pills(undefined), '');
});

test('pills: the tooltip and screen readers give the same count', () => {
  const items = [{ done: true, struck: false }, { done: false, struck: false }, { done: false, struck: true }];
  const html = pills(items, { className: 'progress' });
  assert.match(html, /^<span class="pills progress" role="img" /);
  assert.match(html, /aria-label="1 of 2 done, 1 struck out"/);
  assert.match(html, /title="1 of 2 done, 1 struck out"/);
});

test('the summary of counts', () => {
  const p = (s) => [...s].map((c) => ({ done: c === 'x', struck: c === '-' }));
  assert.equal(pillSummary(p('xxxxx___')), '5 of 8 done');
  assert.equal(pillSummary(p('xxx')), '3 of 3 done');
  assert.equal(pillSummary(p('___')), '0 of 3 done');
  assert.equal(pillSummary(p('x-_')), '1 of 2 done, 1 struck out');
  assert.equal(pillSummary(p('--')), '2 items struck out');
});

test('a card draws the row of pills, not an x/y number', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../web/project.js', import.meta.url), 'utf8');
  const card = src.slice(src.indexOf('function card('), src.indexOf('function drawBoard('));
  assert.match(card, /pills\(t\.doneWhen/);
  assert.doesNotMatch(card, /\$\{done\}\/\$\{total\}/);
});
