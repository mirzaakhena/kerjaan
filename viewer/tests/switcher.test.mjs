import test from 'node:test';
import assert from 'node:assert/strict';
import { switchList } from '../web/switcher.js';
import { ARCHIVED_KEY } from '../web/archive.js';
import { makeBoard, tempRoot, startViewer } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

// ---------- pure ----------

const names = (list) => list.map((p) => `${p.name}${p.current ? '*' : ''}`);

test('project buttons: active projects only, by name, the open one marked', () => {
  const projects = ['gamma', 'Alpha', 'delta', 'beta'].map((name) => ({ name, counts: {} }));
  assert.deepEqual(names(switchList(projects, new Set(['delta']), 'beta')), ['Alpha', 'beta*', 'gamma']);
  assert.deepEqual(names(switchList(projects, new Set(), 'no-such-project')), ['Alpha', 'beta', 'delta', 'gamma']);
  // The open project archived: left out like any other.
  assert.deepEqual(names(switchList(projects, new Set(['beta']), 'beta')), ['Alpha', 'delta', 'gamma']);
  assert.deepEqual(switchList([], new Set(), 'x'), []);
  // No key per project any more.
  assert.deepEqual(Object.keys(switchList(projects, new Set(), 'beta')[0]).sort(), ['current', 'name']);
});

// ---------- in a real browser ----------

const PROJECTS = ['kilo', 'alpha', 'juliet', 'beta', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'lima'];
// Active ones, by name: lima is archived in the browser.
const ACTIVE = ['alpha', 'beta', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo'];

async function setup({ dark = false, projects = PROJECTS, archived = ['lima'] } = {}) {
  const root = tempRoot();
  for (const n of projects) makeBoard(root, n);
  const v = await startViewer(root);
  const page = await openBrowser({ dark });
  if (!page) { await v.close(); return null; }
  try {
    await page.size(1000, 800);
    await page.goto(`${v.base}/`);
    await page.eval((key, a) => localStorage.setItem(key, JSON.stringify(a)), ARCHIVED_KEY, archived);
  } catch (err) {
    await page.close();
    await v.close();
    throw err;
  }
  return { v, page };
}

const ready = (page) => page.until(() => document.getElementById('board').children.length > 0);
const buttonsReady = (page) => page.until(() => document.querySelectorAll('#project-buttons a').length > 0);
const buttons = (page) => page.eval(() => [...document.querySelectorAll('#project-buttons a')].map((a) => `${a.textContent}${a.getAttribute('aria-current') === 'page' ? '*' : ''}`));
const key = async (page, k) => {
  const code = /\d/.test(k) ? `Digit${k}` : `Key${k.toUpperCase()}`;
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text: k, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code });
};
// A real mouse click in the middle of an element, as a person makes it.
const clickOn = async (page, fn) => {
  const { x, y } = await page.eval(fn);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
};
const centreOf = (name) => `() => { const r = [...document.querySelectorAll('#project-buttons a')].find((a) => a.textContent === ${JSON.stringify(name)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }`;
const settle = () => new Promise((r) => setTimeout(r, 400));

test('project buttons in the board\'s top bar: every active project, the open one marked, one click to switch', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const s = await setup();
  if (!s) return;
  const { v, page } = s;
  try {
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await buttonsReady(page);
    assert.deepEqual(await buttons(page), ACTIVE.map((n) => (n === 'delta' ? 'delta*' : n)));

    // The old arrow and its list are gone.
    const old = await page.eval(() => ({
      arrow: !!document.querySelector('header.bar [aria-haspopup]'),
      menu: !!document.querySelector('[role="menu"], [role="listbox"]'),
      glyph: document.querySelector('header.bar').textContent.includes('▾'),
      h1Buttons: document.querySelectorAll('header.bar h1 button').length,
    }));
    assert.deepEqual(old, { arrow: false, menu: false, glyph: false, h1Buttons: 0 });

    // In the bar, between the project's name and the live dot, on one row.
    const place = await page.eval(() => {
      const r = (el) => el.getBoundingClientRect();
      const name = r(document.getElementById('name'));
      const live = r(document.getElementById('live'));
      const all = [...document.querySelectorAll('#project-buttons a')].map(r);
      return {
        inBar: !!document.getElementById('project-buttons').closest('header.bar'),
        afterName: all[0].left > name.right,
        beforeLive: all.filter((b) => b.right > 0 && b.left < innerWidth).every((b) => b.right <= live.left),
        oneRow: all.every((b) => Math.abs(b.top - all[0].top) < 1),
        sameRowAsName: all[0].top < name.bottom && all[0].bottom > name.top,
        pill: getComputedStyle(document.querySelector('#project-buttons a')).borderRadius,
        noSideScroll: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert.deepEqual(place, { inBar: true, afterName: true, beforeLive: true, oneRow: true, sameRowAsName: true, pill: '999px', noSideScroll: true });

    // The open one looks different from every other, each checked.
    const looks = await page.eval(() => [...document.querySelectorAll('#project-buttons a')].map((a) => {
      const cs = getComputedStyle(a);
      return { name: a.textContent, look: [cs.color, cs.borderColor, cs.backgroundColor, cs.fontWeight].join('|') };
    }));
    const current = looks.find((l) => l.name === 'delta').look;
    const others = looks.filter((l) => l.name !== 'delta');
    assert.equal(others.length, ACTIVE.length - 1);
    for (const o of others) assert.notEqual(o.look, current, o.name);
    assert.equal(new Set(others.map((o) => o.look)).size, 1, 'the others look alike');

    // One real click on another project opens its board, now marked there.
    await clickOn(page, centreOf('juliet'));
    await page.until(() => location.pathname === '/juliet/' && document.getElementById('name').textContent === 'juliet');
    await ready(page);
    await buttonsReady(page);
    assert.deepEqual(await buttons(page), ACTIVE.map((n) => (n === 'juliet' ? 'juliet*' : n)));

    // Each other button leads to its own board.
    const hrefs = await page.eval(() => [...document.querySelectorAll('#project-buttons a')].map((a) => new URL(a.href).pathname));
    assert.deepEqual(hrefs, ACTIVE.map((n) => `/${n}/`));

    // The open project's own button, from a ticket address, goes back to the board.
    await page.goto(`${v.base}/juliet/order`);
    await ready(page);
    await page.until(() => !document.getElementById('drawer').hidden);
    // The drawer's backdrop covers the bar; closing it first is the way out.
    await page.eval(() => document.getElementById('backdrop').click());
    await clickOn(page, centreOf('juliet'));
    await page.until(() => location.pathname === '/juliet/');
    await ready(page);
  } finally {
    await page.close();
    await v.close();
  }
});

test('digits and letters on the keyboard no longer switch project', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const s = await setup();
  if (!s) return;
  const { v, page } = s;
  try {
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await buttonsReady(page);
    await settle();
    // Every key the old shortcuts used, 1 to 9 and a to z.
    for (const k of '123456789abcdefghijklmnopqrstuvwxyz') await key(page, k);
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');
    assert.equal(await page.eval(() => document.getElementById('name').textContent), 'delta');
  } finally {
    await page.close();
    await v.close();
  }
});

// Many projects with long names: more than one row holds, at every width.
// The open one's name alone is wider than a phone.
const MANY = Array.from({ length: 30 }, (_, i) => `project-with-a-long-name-${String(i + 1).padStart(2, '0')}`);
MANY[24] += '-and-it-keeps-growing-past-the-width-of-a-phone-screen';

test('buttons that do not fit scroll sideways, on a wide screen and on a phone', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const s = await setup({ projects: MANY, archived: [] });
  if (!s) return;
  const { v, page } = s;
  try {
    for (const [w, h] of [[1280, 800], [1000, 800], [375, 700], [320, 640]]) {
      await page.size(w, h);
      // Late in the list, so it starts out of view unless the row scrolls to it.
      await page.goto(`${v.base}/${MANY[24]}/`);
      await ready(page);
      await buttonsReady(page);
      // Measured with the page's own fonts, which change every button's width.
      await page.eval(() => document.fonts.ready.then(() => true));
      await settle();
      const look = await page.eval(() => {
        const nav = document.getElementById('project-buttons');
        const n = nav.getBoundingClientRect();
        const all = [...nav.querySelectorAll('a')];
        const here = nav.querySelector('[aria-current="page"]').getBoundingClientRect();
        // Long names are shown whole, never cut to look alike.
        const wholeNames = all.every((a) => a.scrollWidth <= a.clientWidth + 1 && getComputedStyle(a).textOverflow !== 'ellipsis');
        const before = nav.scrollLeft;
        nav.scrollLeft = 0;
        const moved = nav.scrollLeft !== before || before === 0;
        nav.scrollLeft = nav.scrollWidth;
        const toEnd = nav.scrollLeft > 0;
        return {
          count: all.length,
          wholeNames,
          overflows: nav.scrollWidth > nav.clientWidth,
          scrolls: getComputedStyle(nav).overflowX === 'auto' && moved && toEnd,
          oneRow: all.every((a) => Math.abs(a.getBoundingClientRect().top - all[0].getBoundingClientRect().top) < 1),
          inside: n.left >= 0 && n.right <= innerWidth,
          noSideScroll: document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth,
          // Whole, or from its start when it is wider than the row itself.
          currentInView: here.left >= n.left - 1 && here.left < n.right - 40 && (here.right <= n.right + 1 || here.width > n.width),
          liveInView: document.getElementById('live').getBoundingClientRect().right <= innerWidth,
          nameInside: document.querySelector('header.bar h1').getBoundingClientRect().right <= innerWidth,
        };
      });
      assert.deepEqual(look, { count: 30, wholeNames: true, overflows: true, scrolls: true, oneRow: true, inside: true, noSideScroll: true, currentInView: true, liveInView: true, nameInside: true }, `${w}px`);
    }
  } finally {
    await page.close();
    await v.close();
  }
});

test('project buttons tidy on a wide screen, on a phone, and in dark mode', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  for (const dark of [false, true]) {
    const s = await setup({ dark });
    if (!s) return;
    const { v, page } = s;
    try {
      for (const [w, h, where] of [[1280, 800, 'wide'], [375, 700, 'phone']]) {
        await page.size(w, h);
        await page.goto(`${v.base}/hotel/`);
        await ready(page);
        await buttonsReady(page);
        const look = await page.eval(() => {
          const r = (el) => el.getBoundingClientRect();
          const nav = document.getElementById('project-buttons');
          const bar = r(document.querySelector('header.bar'));
          const name = r(document.getElementById('name'));
          const live = r(document.getElementById('live'));
          const a = nav.querySelector('a:not([aria-current])');
          const cur = nav.querySelector('[aria-current="page"]');
          const cs = (el) => getComputedStyle(el);
          return {
            dark: matchMedia('(prefers-color-scheme: dark)').matches,
            inBar: r(nav).top >= bar.top && r(nav).bottom <= bar.bottom,
            // On a phone the buttons take their own row under the name.
            ownRow: r(nav).top >= Math.max(name.bottom, live.bottom) - 1,
            fullWidth: Math.round(r(nav).width) === innerWidth,
            tap: r(a).height >= 24,
            noSideScroll: document.documentElement.scrollWidth <= innerWidth,
            barBg: cs(document.querySelector('header.bar')).backgroundColor,
            bg: cs(a).backgroundColor,
            ink: cs(a).color,
            curInk: cs(cur).color,
          };
        });
        const want = dark
          ? { barBg: 'rgb(20, 27, 43)', bg: 'rgb(20, 27, 43)', ink: 'rgb(139, 150, 176)', curInk: 'rgb(95, 178, 255)' }
          : { barBg: 'rgb(255, 255, 255)', bg: 'rgb(255, 255, 255)', ink: 'rgb(91, 102, 128)', curInk: 'rgb(30, 123, 214)' };
        const phone = where === 'phone';
        assert.deepEqual(look, { dark, inBar: true, ownRow: phone, fullWidth: phone, tap: true, noSideScroll: true, ...want }, `${where} ${dark ? 'dark' : 'light'}`);
        // SWITCHER_SHOT=<path prefix> keeps a picture of each, to look at by eye.
        if (process.env.SWITCHER_SHOT) await page.screenshot(`${process.env.SWITCHER_SHOT}-${where}-${dark ? 'dark' : 'light'}.png`);
      }
    } finally {
      await page.close();
      await v.close();
    }
  }
});

test('with no active project, or when the project list cannot be read: no buttons, the board still works', { skip: !chromePath() && 'Chrome is not installed' }, async () => {
  const s = await setup({ archived: PROJECTS });
  if (!s) return;
  const { v, page } = s;
  const state = () => page.eval(() => ({
    hidden: document.getElementById('project-buttons').hidden,
    count: document.querySelectorAll('#project-buttons a').length,
    board: document.querySelectorAll('#board .col').length,
  }));
  try {
    // Every project archived, the open one too.
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.deepEqual(await state(), { hidden: true, count: 0, board: 6 });

    // Unarchived in another tab: the buttons come back here without a reload.
    await page.eval((key) => {
      localStorage.setItem(key, '["lima"]');
      window.dispatchEvent(new StorageEvent('storage', { key }));
    }, ARCHIVED_KEY);
    assert.deepEqual(await buttons(page), ACTIVE.map((n) => (n === 'delta' ? 'delta*' : n)));

    // The server's list unreachable from the start.
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs', { urls: ['*/api/projects'] });
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.deepEqual(await state(), { hidden: true, count: 0, board: 6 });
  } finally {
    await page.close();
    await v.close();
  }
});
