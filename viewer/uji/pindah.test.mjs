import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, switchList, keyTarget } from '../web/pindah.js';
import { makeBoard, tempRoot, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

// ---------- pure ----------

const names = (list) => list.map((p) => `${p.key}:${p.name}${p.current ? '*' : ''}`);

test('daftar pindah: hanya proyek aktif, urut nama, yang dibuka ditandai', () => {
  const projects = ['gamma', 'Alpha', 'delta', 'beta'].map((name) => ({ name, counts: {} }));
  assert.deepEqual(names(switchList(projects, new Set(['delta']), 'beta')), ['1:Alpha', '2:beta*', '3:gamma']);
  assert.deepEqual(names(switchList(projects, new Set(), 'tidak-ada')), ['1:Alpha', '2:beta', '3:delta', '4:gamma']);
  assert.deepEqual(switchList([], new Set(), 'x'), []);
});

test('tanda proyek: 1 sampai 9, lalu a, b, c, dan seterusnya; sesudah z tanpa tanda', () => {
  const projects = Array.from({ length: 37 }, (_, i) => ({ name: `p${String(i + 1).padStart(2, '0')}` }));
  const list = switchList(projects, new Set(), null);
  assert.deepEqual(list.slice(0, 12).map((p) => p.key), ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c']);
  assert.equal(list[34].key, 'z');
  assert.equal(list[35].key, null);
  assert.equal(list[36].key, null);
  assert.equal(KEYS.length, 35);
});

test('tombol yang memindah proyek, dan yang tidak', () => {
  const list = switchList(['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3', 'd1', 'd2'].map((name) => ({ name })), new Set(), 'a2');
  const body = { tagName: 'BODY' };
  const press = (key, more = {}) => keyTarget({ key, target: body, ...more }, list);
  assert.equal(press('1'), 'a1');
  assert.equal(press('9'), 'c3');
  assert.equal(press('a'), 'd1');
  assert.equal(press('b'), 'd2');
  assert.equal(press('c'), null, 'tanda yang tidak dipakai');
  assert.equal(press('2'), null, 'proyek yang sedang dibuka');
  assert.equal(press('0'), null);
  assert.equal(press('Enter'), null);
  // The browser's and the system's own shortcuts, each modifier on its own.
  for (const mod of ['metaKey', 'ctrlKey', 'altKey', 'shiftKey']) assert.equal(press('1', { [mod]: true }), null, mod);
  assert.equal(press('A', { shiftKey: true }), null);
  assert.equal(press('1', { isComposing: true }), null);
  assert.equal(press('1', { repeat: true }), null);
  // Typing into a field, each kind of field.
  for (const t of [{ tagName: 'INPUT', type: 'search' }, { tagName: 'INPUT', type: 'text' }, { tagName: 'INPUT', type: '' }, { tagName: 'INPUT', type: 'number' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { tagName: 'DIV', isContentEditable: true }]) {
    assert.equal(press('1', { target: t }), null, JSON.stringify(t));
  }
  // A focused button or checkbox takes no text, so the key still switches.
  assert.equal(press('1', { target: { tagName: 'BUTTON' } }), 'a1');
  assert.equal(press('1', { target: { tagName: 'INPUT', type: 'checkbox' } }), 'a1');
  assert.equal(press('1', { target: { tagName: 'A' } }), 'a1');
});

// ---------- in a real browser ----------

const PROJECTS = ['kilo', 'alpha', 'juliet', 'beta', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'lima'];

async function setup({ dark = false } = {}) {
  const root = tempRoot();
  for (const n of PROJECTS) makeBoard(root, n);
  const v = await startViewer(root);
  const page = await openBrowser({ dark });
  if (!page) { v.server.close(); return null; }
  await page.size(1000, 800);
  await page.goto(`${v.base}/`);
  // lima is archived in this browser: it is left out, and the rest shift.
  await page.eval(() => localStorage.setItem('kerjaan.proyek-arsip', '["lima"]'));
  return { v, page };
}

const ready = (page) => page.until(() => document.getElementById('board').children.length > 0);
const shown = (page) => page.eval(() => {
  const m = document.getElementById('pindah-menu');
  return {
    open: !m.hidden,
    expanded: document.getElementById('pindah').getAttribute('aria-expanded'),
    items: [...m.querySelectorAll('li a')].map((a) => `${a.querySelector('kbd').textContent}:${a.querySelector('.n').textContent}${a.getAttribute('aria-current') === 'page' ? '*' : ''}`),
  };
});
const key = async (page, k, modifiers = 0) => {
  const code = k.length > 1 ? k : /\d/.test(k) ? `Digit${k}` : `Key${k.toUpperCase()}`;
  const text = k.length === 1 && !modifiers ? { text: k } : {};
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, ...text, modifiers, windowsVirtualKeyCode: k === 'Escape' ? 27 : k.toUpperCase().charCodeAt(0) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers });
};
const settle = () => new Promise((r) => setTimeout(r, 400));

test('pindah proyek dari kepala papan: daftar, klik, tutup', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const s = await setup();
  if (!s) return;
  const { v, page } = s;
  try {
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    assert.deepEqual(await shown(page), { open: false, expanded: 'false', items: [] });

    // The button sits right after the project's name, in the top bar.
    const place = await page.eval(() => {
      const n = document.getElementById('name').getBoundingClientRect();
      const b = document.getElementById('pindah').getBoundingClientRect();
      return { after: b.left >= n.right - 1 && b.left - n.right < 16, inBar: !!document.getElementById('pindah').closest('header.bar') };
    });
    assert.deepEqual(place, { after: true, inBar: true });

    await page.eval(() => document.getElementById('pindah').click());
    const expected = ['1:alpha', '2:beta', '3:charlie', '4:delta*', '5:echo', '6:foxtrot', '7:golf', '8:hotel', '9:india', 'a:juliet', 'b:kilo'];
    await page.until(() => document.querySelectorAll('#pindah-menu li').length > 0);
    assert.deepEqual(await shown(page), { open: true, expanded: 'true', items: expected });

    // Every way out: the button again, Escape, a click elsewhere, Tab away.
    await page.eval(() => document.getElementById('pindah').click());
    assert.equal((await shown(page)).open, false, 'tombol lagi');
    await page.eval(() => document.getElementById('pindah').click());
    await key(page, 'Escape');
    assert.deepEqual(await shown(page), { open: false, expanded: 'false', items: expected });
    assert.equal(await page.eval(() => document.activeElement.id), 'pindah', 'fokus kembali ke tombol');
    await page.eval(() => document.getElementById('pindah').click());
    await page.eval(() => document.getElementById('board').click());
    assert.equal((await shown(page)).open, false, 'klik di luar');
    await page.eval(() => document.getElementById('pindah').click());
    await page.eval(() => document.querySelector('#filters input[name="q"]').focus());
    assert.equal((await shown(page)).open, false, 'fokus pindah ke luar');

    // Escape with the list open leaves the drawer alone, then closes it.
    await page.goto(`${v.base}/delta/urutan`);
    await ready(page);
    await page.until(() => !document.getElementById('drawer').hidden);
    await page.eval(() => document.getElementById('pindah').click());
    await key(page, 'Escape');
    assert.equal((await shown(page)).open, false);
    assert.equal(await page.eval(() => document.getElementById('drawer').hidden), false, 'laci tetap terbuka');
    await key(page, 'Escape');
    assert.equal(await page.eval(() => document.getElementById('drawer').hidden), true);

    // A click on a project opens its board.
    await page.eval(() => document.getElementById('pindah').click());
    await page.until(() => document.querySelectorAll('#pindah-menu li').length > 0);
    await page.eval(() => [...document.querySelectorAll('#pindah-menu li a')].find((a) => a.textContent.includes('juliet')).click());
    await page.until(() => location.pathname === '/juliet/' && document.getElementById('name').textContent === 'juliet');
    await ready(page);

    // The foot of the list goes back to every project.
    await page.eval(() => document.getElementById('pindah').click());
    await page.eval(() => document.querySelector('#pindah-menu .kaki a').click());
    await page.until(() => location.pathname === '/' && document.querySelector('.project'));
  } finally {
    await page.close();
    v.server.close();
  }
});

test('pindah proyek lewat papan ketik, dan kapan tidak', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const s = await setup();
  if (!s) return;
  const { v, page } = s;
  try {
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await page.until(() => document.getElementById('pindah')); // list loads in the background
    await settle();

    // Not while typing into the search box, nor into a select.
    await page.eval(() => document.querySelector('#filters input[name="q"]').focus());
    await key(page, '1');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');
    assert.equal(await page.eval(() => document.querySelector('#filters input[name="q"]').value), '1', 'tombol tetap jadi teks');
    await page.eval(() => { const q = document.querySelector('#filters input[name="q"]'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); q.blur(); });
    await page.eval(() => document.querySelector('#filters select[name="type"]').focus());
    await key(page, '1');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');
    await page.eval(() => document.activeElement.blur());

    // Not with Cmd, Ctrl, Alt or Shift: those are the browser's (Cmd+1 picks a tab).
    for (const m of [4, 2, 1, 8]) {
      await key(page, '1', m);
      await settle();
      assert.equal(await page.eval(() => location.pathname), '/delta/', `modifier ${m}`);
    }
    // The open project's own key stays put.
    await key(page, '4');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');

    // A bare key, without opening the list first.
    await key(page, '1');
    await page.until(() => location.pathname === '/alpha/');
    await ready(page);
    await settle();
    // Past nine: letters. b is kilo, since lima is archived.
    await key(page, 'b');
    await page.until(() => location.pathname === '/kilo/');
    await ready(page);
    await settle();
    // Archived projects get no key: c would have been lima.
    await key(page, 'c');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/kilo/');
  } finally {
    await page.close();
    v.server.close();
  }
});

test('daftar pindah rapi di ponsel dan di mode gelap', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  for (const dark of [false, true]) {
    const s = await setup({ dark });
    if (!s) return;
    const { v, page } = s;
    try {
      await page.size(375, 700);
      await page.goto(`${v.base}/hotel/`);
      await ready(page);
      await page.eval(() => document.getElementById('pindah').click());
      await page.until(() => document.querySelectorAll('#pindah-menu li').length > 0);
      const look = await page.eval(() => {
        const m = document.getElementById('pindah-menu').getBoundingClientRect();
        const b = document.getElementById('pindah').getBoundingClientRect();
        const bar = document.querySelector('header.bar').getBoundingClientRect();
        const cs = (el) => getComputedStyle(el);
        const menu = document.getElementById('pindah-menu');
        return {
          dark: matchMedia('(prefers-color-scheme: dark)').matches,
          inside: m.left >= 0 && m.right <= innerWidth && m.top >= bar.bottom - 1 && m.bottom <= innerHeight,
          wideEnough: m.width >= innerWidth - 32,
          noSideScroll: document.documentElement.scrollWidth <= innerWidth,
          tap: b.width >= 28 && b.height >= 28,
          bg: cs(menu).backgroundColor,
          ink: cs(menu.querySelector('li a')).color,
          names: [...menu.querySelectorAll('.n')].every((n) => n.getBoundingClientRect().right <= m.right),
          onTop: document.elementFromPoint(m.left + m.width / 2, m.top + 20)?.closest('#pindah-menu') === menu,
        };
      });
      const want = dark ? { bg: 'rgb(20, 27, 43)', ink: 'rgb(227, 233, 245)' } : { bg: 'rgb(255, 255, 255)', ink: 'rgb(23, 32, 51)' };
      assert.deepEqual(look, { dark, inside: true, wideEnough: true, noSideScroll: true, tap: true, names: true, onTop: true, ...want }, dark ? 'gelap' : 'terang');
      // PINDAH_SHOT=<path prefix> keeps a picture of each, to look at by eye.
      if (process.env.PINDAH_SHOT) await page.screenshot(`${process.env.PINDAH_SHOT}-${dark ? 'gelap' : 'terang'}.png`);
    } finally {
      await page.close();
      v.server.close();
    }
  }
});

test('daftar pindah kosong, dan saat daftar proyek tidak bisa dibaca', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const s = await setup();
  if (!s) return;
  const { v, page } = s;
  const menuText = async () => {
    await page.eval(() => document.getElementById('pindah').click());
    const text = await page.until(() => !document.getElementById('pindah-menu').hidden && document.querySelector('#pindah-menu .kosong, #pindah-menu li') && document.getElementById('pindah-menu').textContent);
    await page.eval(() => document.getElementById('pindah').click());
    return text;
  };
  try {
    // Every project archived, the open one too: nothing to list, and no key moves.
    await page.eval((all) => localStorage.setItem('kerjaan.proyek-arsip', JSON.stringify(all)), PROJECTS);
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.match(await menuText(), /Belum ada proyek aktif\./);
    await key(page, '1');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');

    // The server's list unreachable from the start: said so, and the page stays.
    await page.send('Network.enable');
    await page.send('Network.setBlockedURLs', { urls: ['*/api/proyek'] });
    await page.eval(() => localStorage.removeItem('kerjaan.proyek-arsip'));
    await page.goto(`${v.base}/delta/`);
    await ready(page);
    await settle();
    assert.match(await menuText(), /Daftar proyek tidak bisa dibaca sekarang\./);
    await key(page, '1');
    await settle();
    assert.equal(await page.eval(() => location.pathname), '/delta/');
  } finally {
    await page.close();
    v.server.close();
  }
});
