// ## History in the ticket drawer, in a real browser: lines with and without a
// Claude Code session id line up as rows at every width, the id is never
// broken over lines, and nothing spills sideways.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, tempRoot, ticket, startViewer } from './bantu.mjs';
import { openBrowser, chromePath } from './peramban.mjs';

const SID = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const ID = '261016144601';
const body = `## Background\nx\n\n## History\n- 2026-10-16 14:46:00 backlog\n- 2026-10-16 15:04:28 ${SID} in_progress\n- 2026-10-16 16:04:28 ${SID} review\n- 2026-10-16 17:00:00 done\n\n## Notes\n(none yet)`;

for (const dark of [false, true]) {
  test(`riwayat dengan pengenal sesi rapi di laci tiket${dark ? ', tema gelap' : ''}`, { skip: !chromePath() && 'Chrome tidak ada' }, async () => {
    const root = tempRoot();
    makeBoard(root, 'proj', { [`done/${ID} Tiket.md`]: ticket({ body }) });
    const v = await startViewer(root);
    const page = await openBrowser({ dark });
    if (!page) { await v.close(); return; }
    try {
      let pitch = null;
      for (const width of [1280, 640, 600, 390, 320]) {
        await page.size(width, 900);
        await page.goto(`${v.base}/proj/tiket/${ID}`);
        await page.until(() => document.querySelector('.drawer .riwayat'));
        const m = await page.eval(() => {
          const body = document.querySelector('.drawer .body');
          const rows = [...document.querySelectorAll('.riwayat li')].map((li) => {
            const box = (sel) => { const e = li.querySelector(sel); const r = e.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, lines: e.getClientRects().length, h: r.height, shown: getComputedStyle(e).display !== 'none' }; };
            return { time: box('.waktu'), status: box('.status'), sesi: box('.sesi'), text: li.querySelector('.sesi').textContent };
          });
          return { overflow: body.scrollWidth - body.clientWidth, right: body.getBoundingClientRect().right, rows, lineHeight: parseFloat(getComputedStyle(document.querySelector('.riwayat .waktu')).lineHeight) || 20 };
        });
        assert.equal(m.overflow, 0, `meluap ke samping pada lebar ${width}`);
        assert.equal(m.rows.length, 4);
        // Time and status sit on one line, and every row's status starts at the same x.
        for (const r of m.rows) assert.ok(Math.abs(r.time.top - r.status.top) < 4, `waktu dan status tidak sebaris pada lebar ${width}`);
        assert.equal(new Set(m.rows.map((r) => Math.round(r.status.left))).size, 1, `status tidak lurus pada lebar ${width}`);
        for (const r of m.rows.filter((r) => r.text)) {
          assert.equal(r.text, SID);
          assert.ok(r.sesi.h < m.lineHeight * 1.6, `pengenal sesi terpotong ke beberapa baris pada lebar ${width}: tinggi ${r.sesi.h}`);
          assert.ok(r.sesi.right <= m.right, `pengenal sesi keluar laci pada lebar ${width}`);
        }
        // Rows without a session leave no visible empty marker, and no empty
        // line either: the step from the first row (no session) to the next is
        // the same at every width.
        for (const r of m.rows.filter((r) => !r.text)) assert.ok(r.sesi.h === 0 || !r.sesi.shown, `penanda kosong terlihat pada lebar ${width}`);
        const step = m.rows[1].time.top - m.rows[0].time.top;
        pitch ??= step;
        assert.ok(Math.abs(step - pitch) < 1, `baris tanpa sesi memberi ruang kosong pada lebar ${width}: ${step} lawan ${pitch}`);
      }
    } finally {
      await page.close();
      await v.close();
    }
  });
}
