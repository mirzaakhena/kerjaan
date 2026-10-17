import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerHead, drawerFacts } from '../web/laci.js';
import { statusName, statusColor } from '../web/umum.js';
import { ticket, makeBoard, tempRoot, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003', hilang: '260101000099' };
const LONG = 'Judul yang sangat panjang sekali ' + 'dan masih terus berlanjut tanpa henti '.repeat(3) + 'katayangsangatpanjangtanpaspasisamasekali sampai akhirnya selesai juga';

// ---------- which fact goes where (pure) ----------

const sample = {
  id: ID.a, status: 'in_progress', title: 'Satu <b>', type: 'feature', priority: 'high', review: 'normal',
  labels: ['viewer', 'ux'], meta: { reporter: 'pelapor-x', assign_to: 'pengerja-y' },
  created: '2026-10-01 10:00:00', updated: '2026-10-02 11:00:00',
  related: [ID.b], blockedBy: [ID.c, ID.hilang],
  doneWhen: [{ done: true, struck: false }, { done: false, struck: false }, { done: true, struck: true }],
};
const others = { [ID.b]: { id: ID.b, title: 'Dua', status: 'todo' }, [ID.c]: { id: ID.c, title: 'Tiga', status: 'done' } };
const ctx = { lookup: (id) => others[id] || null, href: (id) => `/alpha/tiket/${id}`, statusName, statusColor };

test('laci, bagian diam: status, ID, judul, tipe, prioritas, review, dan pil Done when', () => {
  const head = drawerHead(sample, ctx);
  for (const [apa, teks] of [['status', '>in progress<'], ['ID', ID.a], ['judul', 'Satu &lt;b&gt;'], ['tipe', '>feature<'], ['prioritas', '>high<'], ['review', ' normal'], ['kemajuan', 'aria-label="1 dari 2 selesai, 1 dicoret"'], ['hitungan', '>1/2<'], ['tombol tutup', 'data-close']]) {
    assert.ok(head.includes(teks), `${apa} ada di bagian diam`);
  }
  assert.ok(!head.includes('<b>'), 'judul di-escape');
});

test('laci, bagian diam: tidak memuat keterangan yang ikut bergulir', () => {
  const head = drawerHead(sample, ctx);
  for (const teks of ['viewer', 'pelapor-x', 'pengerja-y', '2026-10-01', '2026-10-02', ID.b, ID.c, ID.hilang]) {
    assert.ok(!head.includes(teks), `${teks} tidak di bagian diam`);
  }
});

test('laci, bagian bergulir: setiap keterangan lain ada, dengan tautan tiket', () => {
  const facts = drawerFacts(sample, ctx);
  const dd = (name) => facts.match(new RegExp(`<dt>${name}</dt><dd>([\\s\\S]*?)</dd>`))?.[1];
  assert.match(dd('Label'), /viewer<\/span> <span class="tag">ux/);
  assert.equal(dd('Pelapor'), 'pelapor-x');
  assert.equal(dd('Dikerjakan'), 'pengerja-y');
  assert.equal(dd('Dibuat'), '2026-10-01 10:00:00');
  assert.equal(dd('Diubah'), '2026-10-02 11:00:00');
  assert.match(dd('Terkait'), new RegExp(`<a class="tiket ref" href="/alpha/tiket/${ID.b}" data-id="${ID.b}">`));
  assert.match(dd('Menunggu'), new RegExp(`<a class="tiket ref" href="/alpha/tiket/${ID.c}" data-id="${ID.c}">`));
  assert.match(dd('Menunggu'), new RegExp(`class="missing"[^>]*>${ID.hilang}<`), 'ID yang tidak ada di papan tetap tampil');
});

test('laci, bagian bergulir: nilai kosong tampil sebagai tanda pisah, catatan rusak dan ID ganda tetap ada', () => {
  const kosong = { ...sample, labels: [], meta: {}, created: '', updated: '', related: [], blockedBy: [], broken: true };
  const facts = drawerFacts(kosong, ctx, { dup: [{ status: 'todo', file: 'a.md' }, { status: 'done', file: 'b.md' }] });
  for (const name of ['Label', 'Pelapor', 'Dikerjakan', 'Dibuat', 'Diubah', 'Terkait', 'Menunggu']) {
    assert.match(facts, new RegExp(`<dt>${name}</dt><dd>(—|<span class="muted">—</span>)</dd>`), `${name} kosong`);
  }
  assert.match(facts, /tidak punya frontmatter/);
  assert.match(facts, /dipakai 2 berkas: <code>todo\/a\.md<\/code>, <code>done\/b\.md<\/code>/);
  assert.ok(!drawerFacts(sample, ctx, { dup: [{ status: 'todo', file: 'a.md' }] }).includes('dipakai'), 'satu berkas: tanpa catatan ganda');
});

// ---------- the drawer in a real browser ----------

function board() {
  const root = tempRoot();
  const paragraphs = Array.from({ length: 40 }, (_, i) => `Paragraf ${i + 1} yang cukup panjang untuk mengisi laci sampai harus digulir.`).join('\n\n');
  const body = `## Background\n${paragraphs}\n\n## Done when\n- [x] a\n- [ ] b\n- [ ] c\n\n## Notes\n(none yet)`;
  makeBoard(root, 'alpha', {
    [`in_progress/${ID.a} Satu.md`]: ticket({ type: 'feature', priority: 'high', labels: 'viewer, ux, label-yang-panjang-sekali-tanpa-spasi-sama-sekali-hingga-melebihi-lebar-layar-ponsel', related: ID.b, blocked: ID.c, body }).replace('reporter: t', 'reporter: pelapor-dengan-nama-yang-sangat-panjang-tanpa-spasi-hingga-melebihi-lebar-layar'),
    [`todo/${ID.b} ${LONG}.md`]: ticket({ body }),
    [`done/${ID.c} Tiga.md`]: ticket({ body: '## Background\nPendek.' }),
  });
  return root;
}

// Everything the test reads about the open drawer, measured in the page.
const measure = () => {
  const d = document.getElementById('drawer');
  const head = document.getElementById('drawer-head');
  const body = document.getElementById('drawer-body');
  const h2 = head.querySelector('h2');
  const lh = parseFloat(getComputedStyle(h2).lineHeight);
  const r = (el) => el && el.getBoundingClientRect();
  const seen = (el) => { const b = r(el); return !!b && b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth; };
  const facts = body.querySelector('.facts');
  const firstH2 = body.querySelector('.md > h2, h2');
  return {
    drawer: d.clientHeight, head: head.offsetHeight, titleLines: Math.round(h2.clientHeight / lh),
    scrolled: d.classList.contains('scrolled'),
    glance: {
      status: seen(head.querySelector('.status-pill')), id: seen(head.querySelector('.top .mono')), title: seen(h2),
      type: seen(head.querySelector('.sekilas .tag')), priority: seen(head.querySelector('.sekilas .prio')),
      progress: seen(head.querySelector('.sekilas .pills')),
    },
    factsInBody: !!facts && facts.closest('#drawer-body') === body,
    factsBeforeBackground: !!facts && !!firstH2 && !!(facts.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING),
    factNames: [...(facts?.querySelectorAll('dt') || [])].map((x) => x.textContent),
    fullTitle: body.querySelector('.judul-penuh')?.hidden === false ? body.querySelector('.judul-penuh').textContent : null,
    wide: { page: document.documentElement.scrollWidth > innerWidth, drawer: d.scrollWidth > d.clientWidth, head: head.scrollWidth > head.clientWidth, body: body.scrollWidth > body.clientWidth },
    stickOut: [...d.querySelectorAll('*')].filter((el) => r(el).width && r(el).right > d.getBoundingClientRect().right + 0.5).map((el) => el.className || el.tagName),
    // Text wider than its own box: clipped rather than scrolled, but still unreadable.
    overflowing: [...d.querySelectorAll('*')].filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map((el) => el.className || el.tagName),
  };
};
const scrollDown = () => { const b = document.getElementById('drawer-body'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); return b.scrollTop; };
const headId = () => document.querySelector('#drawer-head .top .mono')?.textContent;

const browserTest = (name, fn) => test(name, { skip: chromePath() ? false : 'Chrome tidak terpasang' }, async () => {
  const v = await startViewer(board());
  const page = await openBrowser();
  try { await fn(v, page); } finally { await page?.close(); await v.close(); }
});

const open = async (v, page, id) => {
  await page.goto(`${v.base}/alpha/tiket/${id}`);
  await page.until(`() => document.querySelector('#drawer-head .top .mono')?.textContent === '${id}' && !!document.querySelector('#drawer-body .facts')`);
};

for (const [name, w, h] of [['jendela 1280×800', 1280, 800], ['ponsel 390×844', 390, 844]]) {
  browserTest(`laci di ${name}: bagian diam ≤ seperlima tinggi laci, sebelum dan sesudah digulir, judul pendek dan sangat panjang`, async (v, page) => {
    await page.size(w, h);
    for (const id of [ID.a, ID.b]) {
      await open(v, page, id);
      const top = await page.eval(measure);
      assert.ok(top.head <= top.drawer / 5, `${id} di atas: ${top.head} px > ${top.drawer / 5}`);
      assert.ok(top.titleLines <= 2, `${id}: judul ${top.titleLines} baris`);
      if (w === 1280) assert.ok(top.head + 20 <= top.drawer / 5, `${id}: tersisa tempat satu baris lagi (${top.head} px)`);
      assert.ok(await page.eval(scrollDown) > 0, 'isi bisa digulir');
      const down = await page.eval(measure);
      assert.equal(down.scrolled, true, 'judul melipat saat digulir');
      assert.equal(down.titleLines, 1);
      assert.ok(down.head < top.head || top.titleLines === 1, 'bagian diam menyusut saat judul melipat');
      assert.deepEqual(down.glance, { status: true, id: true, title: true, type: true, priority: true, progress: true }, `${id}: yang perlu dilihat sekilas tetap terlihat`);
      await page.eval(`() => { const b = document.getElementById('drawer-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); }`);
      assert.equal((await page.eval(measure)).scrolled, false, 'judul terbuka lagi di atas');
    }
  });

  browserTest(`laci di ${name}: tanpa geser ke samping`, async (v, page) => {
    await page.size(w, h);
    for (const id of [ID.a, ID.b, ID.c]) {
      await open(v, page, id);
      for (const state of ['atas', 'bawah']) {
        if (state === 'bawah') await page.eval(scrollDown);
        const m = await page.eval(measure);
        assert.deepEqual(m.wide, { page: false, drawer: false, head: false, body: false }, `${id} ${state}`);
        assert.deepEqual(m.stickOut, [], `${id} ${state}: tidak ada yang keluar dari laci`);
        assert.deepEqual(m.overflowing, [], `${id} ${state}: tidak ada teks yang terpotong ke samping`);
      }
    }
  });
}

browserTest('laci: keterangan lain ada di bagian bergulir sebelum Background; judul panjang tampil utuh di sana', async (v, page) => {
  await page.size(1280, 800);
  await open(v, page, ID.a);
  const a = await page.eval(measure);
  assert.deepEqual(a.factNames, ['Label', 'Pelapor', 'Dikerjakan', 'Dibuat', 'Diubah', 'Terkait', 'Menunggu']);
  assert.equal(a.factsInBody, true);
  assert.equal(a.factsBeforeBackground, true);
  assert.equal(a.fullTitle, null, 'judul pendek tidak diulang');
  await open(v, page, ID.b);
  assert.equal((await page.eval(measure)).fullTitle, LONG, 'judul yang terpotong tampil utuh di awal isi');
});

browserTest('laci: tautan Terkait dan Menunggu membuka tiketnya; Tutup dan Escape menutup laci', async (v, page) => {
  await page.size(1280, 800);
  for (const [fact, target] of [['Terkait', ID.b], ['Menunggu', ID.c]]) {
    await open(v, page, ID.a);
    await page.eval(`() => { const dt = [...document.querySelectorAll('#drawer-body .facts dt')].find((x) => x.textContent === '${fact}'); dt.nextElementSibling.querySelector('a.ref').click(); }`);
    await page.until(`() => (${headId})() === '${target}'`);
    assert.ok((await page.eval('() => location.pathname')).endsWith(`/tiket/${target}`), `${fact}: alamat ikut berubah`);
  }
  await open(v, page, ID.a);
  await page.eval(`() => document.querySelector('#drawer-head [data-close]').click()`);
  await page.until(`() => document.getElementById('drawer').hidden && location.pathname === '/alpha/'`);
  await open(v, page, ID.a);
  await page.eval(`() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  await page.until(`() => document.getElementById('drawer').hidden`);
});
