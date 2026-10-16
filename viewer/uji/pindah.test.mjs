import test from 'node:test';
import assert from 'node:assert/strict';
import { switchList } from '../web/pindah.js';
import { makeBoard, tempRoot, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

// ---------- pure ----------

const names = (list) => list.map((p) => `${p.name}${p.current ? '*' : ''}`);

test('tombol proyek: hanya proyek aktif, urut nama, yang dibuka ditandai', () => {
  const projects = ['gamma', 'Alpha', 'delta', 'beta'].map((name) => ({ name, counts: {} }));
  assert.deepEqual(names(switchList(projects, new Set(['delta']), 'beta')), ['Alpha', 'beta*', 'gamma']);
  assert.deepEqual(names(switchList(projects, new Set(), 'tidak-ada')), ['Alpha', 'beta', 'delta', 'gamma']);
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
  if (!page) { v.server.close(); return null; }
  await page.size(1000, 800);
  await page.goto(`${v.base}/`);
  await page.eval((a) => localStorage.setItem('kerjaan.proyek-arsip', JSON.stringify(a)), archived);
  return { v, page };
}

const ready = (page) => page.until(() => document.getElementById('board').children.length > 0);
const buttonsReady = (page) => page.until(() => document.querySelectorAll('#proyek-tombol a').length > 0);
const buttons = (page) => page.eval(() => [...document.querySelectorAll('#proyek-tombol a')].map((a) => `${a.textContent}${a.getAttribute('aria-current') === 'page' ? '*' : ''}`));
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
const centreOf = (name) => `() => { const r = [...document.querySelectorAll('#proyek-tombol a')].find((a) => a.textContent === ${JSON.stringify(name)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }`;
const settle = () => new Promise((r) => setTimeout(r, 400));

test('tombol proyek di kepala papan: semua proyek aktif, yang dibuka ditandai, satu klik pindah', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
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
      arrow: !!document.getElementById('pindah'),
      menu: !!document.getElementById('pindah-menu'),
      glyph: document.querySelector('header.bar').textContent.includes('▾'),
      h1Buttons: document.querySelectorAll('header.bar h1 button').length,
    }));
    assert.deepEqual(old, { arrow: false, menu: false, glyph: false, h1Buttons: 0 });

    // In the bar, between the project's name and the live dot, on one row.
    const place = await page.eval(() => {
      const r = (el) => el.getBoundingClientRect();
      const name = r(document.getElementById('name'));
      const live = r(document.getElementById('live'));
      const all = [...document.querySelectorAll('#proyek-tombol a')].map(r);
      return {
        inBar: !!document.getElementById('proyek-tombol').closest('header.bar'),
        afterName: all[0].left > name.right,
        beforeLive: all.filter((b) => b.right > 0 && b.left < innerWidth).every((b) => b.right <= live.left),
        oneRow: all.every((b) => Math.abs(b.top - all[0].top) < 1),
        sameRowAsName: all[0].top < name.bottom && all[0].bottom > name.top,
        pill: getComputedStyle(document.querySelector('#proyek-tombol a')).borderRadius,
        noSideScroll: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert.deepEqual(place, { inBar: true, afterName: true, beforeLive: true, oneRow: true, sameRowAsName: true, pill: '999px', noSideScroll: true });

    // The open one looks different from every other, each checked.
    const looks = await page.eval(() => [...document.querySelectorAll('#proyek-tombol a')].map((a) => {
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
    const hrefs = await page.eval(() => [...document.querySelectorAll('#proyek-tombol a')].map((a) => new URL(a.href).pathname));
    assert.deepEqual(hrefs, ACTIVE.map((n) => `/${n}/`));

    // The open project's own button, from a ticket address, goes back to the board.
    await page.goto(`${v.base}/juliet/urutan`);
    await ready(page);
    await page.until(() => !document.getElementById('drawer').hidden);
    // The drawer's backdrop covers the bar; closing it first is the way out.
    await page.eval(() => document.getElementById('backdrop').click());
    await clickOn(page, centreOf('juliet'));
    await page.until(() => location.pathname === '/juliet/');
    await ready(page);
  } finally {
    await page.close();
    v.server.close();
  }
});

test('angka dan huruf di papan ketik tidak lagi memindah proyek', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
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
    v.server.close();
  }
});

// Many projects with long names: more than one row holds, at every width.
// The open one's name alone is wider than a phone.
const MANY = Array.from({ length: 30 }, (_, i) => `proyek-dengan-nama-panjang-${String(i + 1).padStart(2, '0')}`);
MANY[24] += '-dan-masih-terus-memanjang-melewati-lebar-layar-ponsel';

test('tombol yang tidak muat bisa digeser ke samping, di layar lebar dan di ponsel', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
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
        const nav = document.getElementById('proyek-tombol');
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
    v.server.close();
  }
});

test('tombol proyek rapi di layar lebar, di ponsel, dan di mode gelap', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  for (const dark of [false, true]) {
    const s = await setup({ dark });
    if (!s) return;
    const { v, page } = s;
    try {
      for (const [w, h, where] of [[1280, 800, 'lebar'], [375, 700, 'ponsel']]) {
        await page.size(w, h);
        await page.goto(`${v.base}/hotel/`);
        await ready(page);
        await buttonsReady(page);
        const look = await page.eval(() => {
          const r = (el) => el.getBoundingClientRect();
          const nav = document.getElementById('proyek-tombol');
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
        const phone = where === 'ponsel';
        assert.deepEqual(look, { dark, inBar: true, ownRow: phone, fullWidth: phone, tap: true, noSideScroll: true, ...want }, `${where} ${dark ? 'gelap' : 'terang'}`);
        // PINDAH_SHOT=<path prefix> keeps a picture of each, to look at by eye.
        if (process.env.PINDAH_SHOT) await page.screenshot(`${process.env.PINDAH_SHOT}-${where}-${dark ? 'gelap' : 'terang'}.png`);
      }
    } finally {
      await page.close();
      v.server.close();
    }
  }
});

test('tanpa proyek aktif, atau saat daftar proyek tidak bisa dibaca: tanpa tombol, papan tetap jalan', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const s = await setup({ archived: PROJECTS });
  if (!s) return;
  const { v, page } = s;
  const state = () => page.eval(() => ({
    hidden: document.getElementById('proyek-tombol').hidden,
    count: document.querySelectorAll('#proyek-tombol a').length,
    board: document.querySelectorAll('#board .col').length,
  }));
  try {
    // Every project archived, the open one too.
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.deepEqual(await state(), { hidden: true, count: 0, board: 6 });

    // Unarchived in another tab: the buttons come back here without a reload.
    await page.eval(() => {
      localStorage.setItem('kerjaan.proyek-arsip', '["lima"]');
      window.dispatchEvent(new StorageEvent('storage', { key: 'kerjaan.proyek-arsip' }));
    });
    assert.deepEqual(await buttons(page), ACTIVE.map((n) => (n === 'delta' ? 'delta*' : n)));

    // The server's list unreachable from the start.
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs', { urls: ['*/api/proyek'] });
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.deepEqual(await state(), { hidden: true, count: 0, board: 6 });
  } finally {
    await page.close();
    v.server.close();
  }
});
