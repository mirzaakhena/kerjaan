import test from 'node:test';
import assert from 'node:assert/strict';
import { readArchived, splitProjects, readTab } from '../web/arsip.js';
import { makeBoard, tempRoot, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

// ---------- pure ----------

test('proyek arsip: kosong secara bawaan, simpanan rusak diabaikan', () => {
  assert.deepEqual([...readArchived(null)], []);
  assert.deepEqual([...readArchived('bukan json')], []);
  assert.deepEqual([...readArchived('{"a":1}')], []);
  assert.deepEqual([...readArchived('["alpha",3,null,"beta"]')], ['alpha', 'beta']);
});

test('proyek dibagi ke tab aktif dan arsip, urutan tetap', () => {
  const p = ['a', 'b', 'c', 'd'].map((name) => ({ name }));
  const s = splitProjects(p, new Set(['d', 'b', 'hilang']));
  assert.deepEqual(s.aktif.map((x) => x.name), ['a', 'c']);
  assert.deepEqual(s.arsip.map((x) => x.name), ['b', 'd'], 'nama yang tak ada lagi diabaikan');
});

test('tab dibaca dari alamat', () => {
  assert.equal(readTab(''), 'aktif');
  assert.equal(readTab('#arsip'), 'arsip');
  assert.equal(readTab('#lain'), 'aktif');
});

// ---------- in a real browser ----------

test('mengarsipkan proyek di peramban: pindah tab, diingat setelah muat ulang', { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
  const root = tempRoot();
  for (const n of ['alpha', 'beta', 'gamma']) makeBoard(root, n);
  const v = await startViewer(root);
  const page = await openBrowser();
  if (!page) { v.server.close(); return; }
  try {
    await page.size(1000, 800);
    await page.goto(`${v.base}/`);
    const shown = () => page.until(() => document.querySelector('.project, .empty') && {
      names: [...document.querySelectorAll('.project .name a')].map((a) => a.textContent),
      tabs: [...document.querySelectorAll('#tabs button')].map((b) => `${b.textContent}${b.getAttribute('aria-selected') === 'true' ? '*' : ''}`),
    });
    assert.deepEqual(await shown(), { names: ['alpha', 'beta', 'gamma'], tabs: ['Aktif 3*', 'Arsip 0'] });

    await page.eval(() => document.querySelector('button.arsip[data-name="beta"]').click());
    assert.deepEqual(await shown(), { names: ['alpha', 'gamma'], tabs: ['Aktif 2*', 'Arsip 1'] });

    await page.goto(`${v.base}/`);
    assert.deepEqual(await shown(), { names: ['alpha', 'gamma'], tabs: ['Aktif 2*', 'Arsip 1'] }, 'diingat lewat localStorage');

    await page.eval(() => document.querySelector('#tabs [data-tab="arsip"]').click());
    assert.deepEqual(await shown(), { names: ['beta'], tabs: ['Aktif 2', 'Arsip 1*'] });
    assert.equal(await page.eval(() => location.hash), '#arsip');
    assert.equal(await page.eval(() => document.querySelector('button.arsip').textContent), 'Aktifkan lagi');

    // The button does not open the project; the rest of the card does.
    await page.eval(() => document.querySelector('button.arsip').click());
    assert.match(await page.eval(() => document.querySelector('.empty').textContent), /Belum ada proyek yang diarsipkan/);
    assert.equal(await page.eval(() => location.pathname), '/');
    await page.eval(() => document.querySelector('#tabs [data-tab="aktif"]').click());
    assert.deepEqual((await shown()).names, ['alpha', 'beta', 'gamma']);

    const target = await page.eval(() => {
      const r = document.querySelector('.project').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.bottom - 8);
      return el.closest('a')?.getAttribute('href');
    });
    assert.equal(target, '/alpha/', 'bagian bawah kartu tetap membuka proyek');
  } finally {
    await page.close();
    v.server.close();
  }
});
