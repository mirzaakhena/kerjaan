// ## History in the ticket drawer, in a real browser: lines with and without a
// Claude Code session id line up as rows at every width, the id is never
// broken over lines, and nothing spills sideways.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, tempRoot, ticket, startViewer } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

const SID = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const ID = '261016144601';
const body = `## Background\nx\n\n## History\n- 2026-10-16 14:46:00 backlog\n- 2026-10-16 15:04:28 ${SID} in_progress\n- 2026-10-16 16:04:28 ${SID} review\n- 2026-10-16 17:00:00 done\n\n## Notes\n(none yet)`;

for (const dark of [false, true]) {
  test(`history with session ids is tidy in the ticket drawer${dark ? ', dark theme' : ''}`, { skip: !chromePath() && 'Chrome is not installed' }, async () => {
    const root = tempRoot();
    makeBoard(root, 'proj', { [`done/${ID} Ticket.md`]: ticket({ body }) });
    const v = await startViewer(root);
    const page = await openBrowser({ dark });
    if (!page) { await v.close(); return; }
    try {
      let pitch = null;
      for (const width of [1280, 640, 600, 390, 320]) {
        await page.size(width, 900);
        await page.goto(`${v.base}/proj/ticket/${ID}`);
        await page.until(() => document.querySelector('.drawer .history'));
        const m = await page.eval(() => {
          const body = document.querySelector('.drawer .body');
          const rows = [...document.querySelectorAll('.history li')].map((li) => {
            const box = (sel) => { const e = li.querySelector(sel); const r = e.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, lines: e.getClientRects().length, h: r.height, shown: getComputedStyle(e).display !== 'none' }; };
            return { time: box('.time'), status: box('.status'), session: box('.session'), text: li.querySelector('.session').textContent };
          });
          return { overflow: body.scrollWidth - body.clientWidth, right: body.getBoundingClientRect().right, rows, lineHeight: parseFloat(getComputedStyle(document.querySelector('.history .time')).lineHeight) || 20 };
        });
        assert.equal(m.overflow, 0, `spills sideways at width ${width}`);
        assert.equal(m.rows.length, 4);
        // Time and status sit on one line, and every row's status starts at the same x.
        for (const r of m.rows) assert.ok(Math.abs(r.time.top - r.status.top) < 4, `time and status not on one line at width ${width}`);
        assert.equal(new Set(m.rows.map((r) => Math.round(r.status.left))).size, 1, `statuses not aligned at width ${width}`);
        for (const r of m.rows.filter((r) => r.text)) {
          assert.equal(r.text, SID);
          assert.ok(r.session.h < m.lineHeight * 1.6, `session id broken over lines at width ${width}: height ${r.session.h}`);
          assert.ok(r.session.right <= m.right, `session id leaves the drawer at width ${width}`);
        }
        // Rows without a session leave no visible empty marker, and no empty
        // line either: the step from the first row (no session) to the next is
        // the same at every width.
        for (const r of m.rows.filter((r) => !r.text)) assert.ok(r.session.h === 0 || !r.session.shown, `empty marker visible at width ${width}`);
        const step = m.rows[1].time.top - m.rows[0].time.top;
        pitch ??= step;
        assert.ok(Math.abs(step - pitch) < 1, `a row without a session leaves empty room at width ${width}: ${step} against ${pitch}`);
      }
    } finally {
      await page.close();
      await v.close();
    }
  });
}
