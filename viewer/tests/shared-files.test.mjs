// The order.md drawer shows, under each group, the pairs of that group's
// tickets whose estimates share files, and the files. Read from the tickets'
// "files estimated to change:" records on every request, never from order.md,
// and agreeing with what `queue.sh overlap` names for the same pair.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readOrderGroups, readEstimate, sharedPaths, sharedInGroups, readBoard } from '../../skills/kerjaan/scripts/board.mjs';
import { ticket, makeBoard, tempRoot, startViewer } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const queue = path.join(here, '..', '..', 'skills', 'kerjaan', 'scripts', 'queue.sh');

const ID = {
  a: '260101000001', b: '260101000002', c: '260101000003', d: '260101000004',
  e: '260101000005', f: '260101000006', g: '260101000007',
};

const est = (...paths) => `- 2026-10-17 11:36:22: files estimated to change: ${paths.length ? paths.map((p) => `\`${p}\``).join(', ') : 'none'}`;
const withNotes = (...notes) => ticket({ body: `## Background\nx\n\n## Notes\n${notes.join('\n')}` });
const todo = (id, ...notes) => ({ [`todo/${id} T${id.slice(-1)}.md`]: withNotes(...notes) });

// ---------- the pieces ----------

test('order.md groups: from one bold lead-in to the next, only `- <id>` lines are places', () => {
  const text = [
    `- ${ID.g} Above the first bold lead-in`,
    '',
    `**First, ${ID.f} named.**`,
    '',
    `- ${ID.a} One`,
    `  - ${ID.e} Indented`,
    `- ${ID.b} Two`,
    `- ${ID.a} Again`,
    '',
    '**Empty.** No list lines.',
    '',
    '**Last.**',
    `- ${ID.c}`,
  ].join('\n');
  assert.deepEqual(readOrderGroups(text), [
    { start: 0, end: 2, ids: [ID.g], waitForOwner: false },
    { start: 2, end: 9, ids: [ID.a, ID.b], waitForOwner: false },
    { start: 11, end: 13, ids: [ID.c], waitForOwner: false },
  ]);
  assert.deepEqual(readOrderGroups(''), []);
});

test('estimates: the last record wins, examples in a fence are ignored, none and missing told apart', () => {
  assert.equal(readEstimate('## Notes\n(none yet)'), null);
  assert.deepEqual(readEstimate(`## Notes\n${est('a.js', 'docs/')}`), ['a.js', 'docs/']);
  assert.deepEqual(readEstimate(`## Notes\n${est('a.js')}\n${est('b.js')}`), ['b.js'], 'the last one');
  assert.deepEqual(readEstimate(`## Notes\n${est('a.js')}\n${est()}`), [], 'last: none');
  assert.deepEqual(readEstimate(`## Notes\n${est('a.js')}\n\`\`\`\n${est('example.js')}\n\`\`\``), ['a.js'], 'a fenced example');
  assert.equal(readEstimate(`  ${est('a.js')}`), null, 'indented is no record');
});

test('shared files: exactly the same, or a folder and what is in it (the narrower one named)', () => {
  assert.deepEqual(sharedPaths(['a.js', 'b.js'], ['b.js', 'c.js']), ['b.js']);
  assert.deepEqual(sharedPaths(['src/'], ['src/x.js', 'srcx.js', 'other.js']), ['src/x.js']);
  assert.deepEqual(sharedPaths(['src/x.js'], ['src/']), ['src/x.js']);
  assert.deepEqual(sharedPaths(['src/'], ['src/']), ['src/']);
  assert.deepEqual(sharedPaths(['a.js'], []), []);
});

// ---------- per case: what is shown for a group ----------

// One board holding every case: a group whose three tickets share files in
// pairs (one through a folder), a ticket without an estimate in it, a group
// whose tickets share nothing, a group where one ticket's estimate is "none",
// a pair that shares files across groups, and a backlog ticket order.md does
// not list that shares files with a listed one.
const CASES = {
  ...todo(ID.a, est('README.md', 'src/board.mjs', 'src/app.mjs')),
  ...todo(ID.b, est('src/', 'docs/a.md')),
  ...todo(ID.c, est('README.md', 'docs/a.md')),
  ...todo(ID.d),
  ...todo(ID.e, est('other.js', 'docs/')),
  ...todo(ID.f, est()),
  [`backlog/${ID.g} Backlog.md`]: withNotes(est('README.md', 'other.js')),
  'order.md': [
    `**Three side by side.**`,
    `<!-- lands-first: ${ID.a}, ${ID.b}, ${ID.c} -->`,
    '',
    `- ${ID.a} One`,
    `- ${ID.b} Two`,
    `- ${ID.c} Three`,
    `- ${ID.d} Four without an estimate`,
    '',
    '**Then, without shared files.**',
    '',
    `- ${ID.e} Five`,
    `- ${ID.f} Six, none`,
    '',
  ].join('\n'),
};

const sharedOf = (board) => sharedInGroups(fs.readFileSync(path.join(board, 'order.md'), 'utf8'), readBoard(board).tickets);

test('every pair in a group that shares files is shown; across groups, backlog, none and no estimate are not', () => {
  const board = makeBoard(tempRoot(), 'p', CASES);
  assert.deepEqual(sharedOf(board), [{
    start: 0,
    end: 8,
    pairs: [
      { a: ID.a, b: ID.b, files: ['src/app.mjs', 'src/board.mjs'] },
      { a: ID.a, b: ID.c, files: ['README.md'] },
      { a: ID.b, b: ID.c, files: ['docs/a.md'] },
    ],
    unestimated: [ID.d],
  }]);
});

test('a group without shared files, or only with tickets without an estimate, gives nothing', () => {
  const board = makeBoard(tempRoot(), 'p', {
    ...todo(ID.a, est('a.js')),
    ...todo(ID.b, est('b.js')),
    ...todo(ID.c),
    ...todo(ID.d, est()),
    'order.md': `**One.**\n\n- ${ID.a}\n- ${ID.b}\n- ${ID.c}\n- ${ID.d}\n`,
  });
  assert.deepEqual(sharedOf(board), []);
});

// The files queue.sh overlap names for one pair, sorted.
function overlapSays(board, a, b) {
  const r = spawnSync('bash', [queue, 'overlap', a, b], { cwd: path.dirname(board), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  if (/No two of these tickets share/.test(r.stdout)) return [];
  assert.match(r.stdout, new RegExp(`^${a} \\(\\w+\\) and ${b} \\(\\w+\\) share:`), r.stdout);
  return r.stdout.split('\n').slice(1).filter((l) => l.startsWith('  ')).map((l) => l.trim()).sort();
}

test('for every two tickets of one group, the files are the ones queue.sh overlap names', () => {
  const board = makeBoard(tempRoot(), 'p', CASES);
  const shown = new Map(sharedOf(board).flatMap((g) => g.pairs.map((p) => [`${p.a} ${p.b}`, p.files])));
  const groups = readOrderGroups(fs.readFileSync(path.join(board, 'order.md'), 'utf8'));
  let compared = 0;
  for (const g of groups) {
    for (const a of g.ids) {
      for (const b of g.ids) {
        if (!(a < b)) continue;
        assert.deepEqual(shown.get(`${a} ${b}`) || [], overlapSays(board, a, b), `${a} and ${b}`);
        compared++;
      }
    }
  }
  assert.equal(compared, 7, 'six pairs in the first group, one in the second');
});

// ---------- through the server ----------

const setEstimate = (board, file, ...paths) => {
  const f = path.join(board, file);
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\n$/, `\n${est(...paths)}\n`));
};

test('api/order carries the shared files, and a changed estimate shows at once without touching order.md', async () => {
  const root = tempRoot();
  const board = makeBoard(root, 'alpha', {
    ...todo(ID.a, est('a.js', 'b.js')),
    ...todo(ID.b, est('b.js')),
    'order.md': `**Together.**\n\n- ${ID.a}\n- ${ID.b}\n`,
  });
  const order = fs.readFileSync(path.join(board, 'order.md'), 'utf8');
  const v = await startViewer(root);
  try {
    const first = await (await v.get('/alpha/api/order')).json();
    assert.equal(first.text, order);
    assert.deepEqual(first.shared, [{ start: 0, end: 5, pairs: [{ a: ID.a, b: ID.b, files: ['b.js'] }], unestimated: [] }]);

    setEstimate(board, `todo/${ID.b} T2.md`, 'a.js', 'c.js');
    const second = await (await v.get('/alpha/api/order')).json();
    assert.deepEqual(second.shared[0].pairs, [{ a: ID.a, b: ID.b, files: ['a.js'] }]);

    setEstimate(board, `todo/${ID.b} T2.md`, 'c.js');
    assert.deepEqual((await (await v.get('/alpha/api/order')).json()).shared, [], 'no longer sharing');
    assert.equal(fs.readFileSync(path.join(board, 'order.md'), 'utf8'), order, 'order.md untouched');
  } finally {
    await v.close();
  }
});

// ---------- in a real browser ----------

// Each box in the drawer: the text of the group lead-in just before it, its
// pair lines, and whether its ticket IDs are links.
const boxes = `() => [...document.querySelectorAll('#drawer-body .shared-files')].map((box) => {
  let prev = box.previousElementSibling;
  while (prev && !prev.querySelector('strong')) prev = prev.previousElementSibling;
  return {
    after: prev?.querySelector('strong')?.textContent || null,
    pairs: [...box.querySelectorAll('li')].map((li) => li.textContent.trim()),
    links: [...box.querySelectorAll('li a.ticket')].map((a) => a.dataset.id),
    unestimated: box.textContent.includes('No file estimate yet'),
  };
})`;

test('in the order.md drawer: a shared-files box under its group, changing as the estimates change, Close closing the drawer', { skip: chromePath() ? false : 'Chrome is not installed' }, async () => {
  const root = tempRoot();
  const board = makeBoard(root, 'alpha', CASES);
  const v = await startViewer(root);
  const page = await openBrowser();
  try {
    await page.size(1280, 800);
    await page.goto(`${v.base}/alpha/order`);
    await page.until(`() => document.querySelectorAll('#drawer-body .shared-files').length > 0`);
    assert.deepEqual(await page.eval(boxes), [{
      after: 'Three side by side.',
      pairs: [
        `${ID.a} and ${ID.b}: src/app.mjs, src/board.mjs`,
        `${ID.a} and ${ID.c}: README.md`,
        `${ID.b} and ${ID.c}: docs/a.md`,
      ],
      links: [ID.a, ID.b, ID.a, ID.c, ID.b, ID.c],
      unestimated: true,
    }]);
    // The box sits before the next group's lead-in, and order.md is all there.
    assert.equal(await page.eval(`() => {
      const box = document.querySelector('#drawer-body .shared-files');
      let n = box.nextElementSibling;
      return n?.querySelector('strong')?.textContent || null;
    }`), 'Then, without shared files.');
    assert.equal(await page.eval(`() => document.querySelectorAll('#drawer-body > ul li').length`), 6, 'every list line of order.md still shown');

    // The second group comes to share a file: its own box appears, live.
    setEstimate(board, `todo/${ID.f} T6.md`, 'other.js');
    await page.until(`() => document.querySelectorAll('#drawer-body .shared-files').length === 2`);
    const after = await page.eval(boxes);
    assert.deepEqual(after[1], { after: 'Then, without shared files.', pairs: [`${ID.e} and ${ID.f}: other.js`], links: [ID.e, ID.f], unestimated: false });

    // And stops sharing: the box goes again.
    setEstimate(board, `todo/${ID.f} T6.md`);
    await page.until(`() => document.querySelectorAll('#drawer-body .shared-files').length === 1`);

    // A ticket link in the box opens that ticket; back returns to order.md.
    await page.eval(`() => document.querySelector('#drawer-body .shared-files a.ticket').click()`);
    await page.until(`() => location.pathname === '/alpha/ticket/${ID.a}' && document.querySelector('#drawer-head .mono')?.textContent !== '.kerjaan/order.md'`);
    await page.eval(`() => history.back()`);
    await page.until(`() => location.pathname === '/alpha/order' && document.querySelectorAll('#drawer-body .shared-files').length === 1`);

    // Close closes the drawer and leaves the kanban.
    await page.eval(`() => document.querySelector('#drawer [data-close]').click()`);
    await page.until(`() => document.getElementById('drawer').hidden && location.pathname === '/alpha/'`);
  } finally {
    await page?.close();
    await v.close();
  }
});
