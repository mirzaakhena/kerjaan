import test from 'node:test';
import assert from 'node:assert/strict';
import { readArchived, splitProjects, readTab } from '../web/archive.js';
import { makeBoard, tempRoot, startViewer } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

// ---------- pure ----------

test('archived projects: none by default, an unreadable stored value ignored', () => {
  assert.deepEqual([...readArchived(null)], []);
  assert.deepEqual([...readArchived('not json')], []);
  assert.deepEqual([...readArchived('{"a":1}')], []);
  assert.deepEqual([...readArchived('["alpha",3,null,"beta"]')], ['alpha', 'beta']);
});

test('projects split into the active and archived tabs, order kept', () => {
  const p = ['a', 'b', 'c', 'd'].map((name) => ({ name }));
  const s = splitProjects(p, new Set(['d', 'b', 'gone']));
  assert.deepEqual(s.active.map((x) => x.name), ['a', 'c']);
  assert.deepEqual(s.archived.map((x) => x.name), ['b', 'd'], 'a name no longer there is ignored');
});

test('the tab is read from the address', () => {
  assert.equal(readTab(''), 'active');
  assert.equal(readTab('#archived'), 'archived');
  assert.equal(readTab('#other'), 'active');
});

// ---------- in a real browser ----------

test('archiving a project in the browser: it changes tab, and is remembered after a reload', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const root = tempRoot();
  for (const n of ['alpha', 'beta', 'gamma']) makeBoard(root, n);
  const v = await startViewer(root);
  const page = await openBrowser();
  if (!page) { await v.close(); return; }
  try {
    await page.size(1000, 800);
    await page.goto(`${v.base}/`);
    const shown = () => page.until(() => document.querySelector('.project, .empty') && {
      names: [...document.querySelectorAll('.project .name a')].map((a) => a.textContent),
      tabs: [...document.querySelectorAll('#tabs button')].map((b) => `${b.textContent}${b.getAttribute('aria-selected') === 'true' ? '*' : ''}`),
    });
    assert.deepEqual(await shown(), { names: ['alpha', 'beta', 'gamma'], tabs: ['Active 3*', 'Archived 0'] });

    await page.eval(() => document.querySelector('button.archive[data-name="beta"]').click());
    assert.deepEqual(await shown(), { names: ['alpha', 'gamma'], tabs: ['Active 2*', 'Archived 1'] });

    await page.goto(`${v.base}/`);
    assert.deepEqual(await shown(), { names: ['alpha', 'gamma'], tabs: ['Active 2*', 'Archived 1'] }, 'remembered in localStorage');

    await page.eval(() => document.querySelector('#tabs [data-tab="archived"]').click());
    assert.deepEqual(await shown(), { names: ['beta'], tabs: ['Active 2', 'Archived 1*'] });
    assert.equal(await page.eval(() => location.hash), '#archived');
    assert.equal(await page.eval(() => document.querySelector('button.archive').textContent), 'Unarchive');

    // The button does not open the project; the rest of the card does.
    await page.eval(() => document.querySelector('button.archive').click());
    assert.match(await page.eval(() => document.querySelector('.empty').textContent), /No archived projects yet/);
    assert.equal(await page.eval(() => location.pathname), '/');
    await page.eval(() => document.querySelector('#tabs [data-tab="active"]').click());
    assert.deepEqual((await shown()).names, ['alpha', 'beta', 'gamma']);

    const target = await page.eval(() => {
      const r = document.querySelector('.project').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.bottom - 8);
      return el.closest('a')?.getAttribute('href');
    });
    assert.equal(target, '/alpha/', 'the bottom of the card still opens the project');
  } finally {
    await page.close();
    await v.close();
  }
});
