import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerHead, drawerFacts } from '../web/drawer.js';
import { statusName, statusColor } from '../web/common.js';
import { ticket, makeBoard, tempRoot, startViewer } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003', missing: '260101000099' };
const LONG = 'A very very long title ' + 'that keeps going on and on without an end '.repeat(3) + 'averylongwordwithoutanyspacesatallanywhere until it finally ends after all';

// ---------- which fact goes where (pure) ----------

const sample = {
  id: ID.a, status: 'in_progress', title: 'One <b>', type: 'feature', priority: 'high', review: 'normal',
  labels: ['viewer', 'ux'], meta: { reporter: 'reporter-x', assign_to: 'assignee-y' },
  created: '2026-10-01 10:00:00', updated: '2026-10-02 11:00:00',
  related: [ID.b], blockedBy: [ID.c, ID.missing],
  doneWhen: [{ done: true, struck: false }, { done: false, struck: false }, { done: true, struck: true }],
};
const others = { [ID.b]: { id: ID.b, title: 'Two', status: 'todo' }, [ID.c]: { id: ID.c, title: 'Three', status: 'done' } };
const ctx = { lookup: (id) => others[id] || null, href: (id) => `/alpha/ticket/${id}`, statusName, statusColor };

test('drawer, fixed part: status, ID, title, type, priority, review, and the Done when pills', () => {
  const head = drawerHead(sample, ctx);
  for (const [what, text] of [['status', '>in progress<'], ['ID', ID.a], ['title', 'One &lt;b&gt;'], ['type', '>feature<'], ['priority', '>high<'], ['review', ' normal'], ['progress', 'aria-label="1 of 2 done, 1 struck out"'], ['count', '>1/2<'], ['close button', 'data-close']]) {
    assert.ok(head.includes(text), `${what} is in the fixed part`);
  }
  assert.ok(!head.includes('<b>'), 'the title is escaped');
});

test('drawer, fixed part: holds none of the facts that scroll', () => {
  const head = drawerHead(sample, ctx);
  for (const text of ['viewer', 'reporter-x', 'assignee-y', '2026-10-01', '2026-10-02', ID.b, ID.c, ID.missing]) {
    assert.ok(!head.includes(text), `${text} is not in the fixed part`);
  }
});

test('drawer, scrolling part: every other fact is there, with links to tickets', () => {
  const facts = drawerFacts(sample, ctx);
  const dd = (name) => facts.match(new RegExp(`<dt>${name}</dt><dd>([\\s\\S]*?)</dd>`))?.[1];
  assert.match(dd('Labels'), /viewer<\/span> <span class="tag">ux/);
  assert.equal(dd('Reporter'), 'reporter-x');
  assert.equal(dd('Assigned to'), 'assignee-y');
  assert.equal(dd('Created'), '2026-10-01 10:00:00');
  assert.equal(dd('Updated'), '2026-10-02 11:00:00');
  assert.match(dd('Related'), new RegExp(`<a class="ticket ref" href="/alpha/ticket/${ID.b}" data-id="${ID.b}">`));
  assert.match(dd('Blocked by'), new RegExp(`<a class="ticket ref" href="/alpha/ticket/${ID.c}" data-id="${ID.c}">`));
  assert.match(dd('Blocked by'), new RegExp(`class="missing"[^>]*>${ID.missing}<`), 'an ID not on the board is still shown');
});

test('drawer, scrolling part: an empty value shows as a dash, a broken file and a duplicate ID still noted', () => {
  const empty = { ...sample, labels: [], meta: {}, created: '', updated: '', related: [], blockedBy: [], broken: true };
  const facts = drawerFacts(empty, ctx, { dup: [{ status: 'todo', file: 'a.md' }, { status: 'done', file: 'b.md' }] });
  for (const name of ['Labels', 'Reporter', 'Assigned to', 'Created', 'Updated', 'Related', 'Blocked by']) {
    assert.match(facts, new RegExp(`<dt>${name}</dt><dd>(—|<span class="muted">—</span>)</dd>`), `${name} empty`);
  }
  assert.match(facts, /has no frontmatter/);
  assert.match(facts, /used by 2 files: <code>todo\/a\.md<\/code>, <code>done\/b\.md<\/code>/);
  assert.ok(!drawerFacts(sample, ctx, { dup: [{ status: 'todo', file: 'a.md' }] }).includes('used by'), 'one file: no duplicate note');
});

// ---------- the drawer in a real browser ----------

function board() {
  const root = tempRoot();
  const paragraphs = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}, long enough to fill the drawer until it has to scroll.`).join('\n\n');
  const body = `## Background\n${paragraphs}\n\n## Done when\n- [x] a\n- [ ] b\n- [ ] c\n\n## Notes\n(none yet)`;
  makeBoard(root, 'alpha', {
    [`in_progress/${ID.a} One.md`]: ticket({ type: 'feature', priority: 'high', labels: 'viewer, ux, a-very-long-label-without-any-spaces-at-all-until-it-is-wider-than-a-phone-screen', related: ID.b, blocked: ID.c, body }).replace('reporter: t', 'reporter: a-reporter-with-a-very-long-name-without-any-spaces-wider-than-the-screen'),
    [`todo/${ID.b} ${LONG}.md`]: ticket({ body }),
    [`done/${ID.c} Three.md`]: ticket({ body: '## Background\nShort.' }),
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
      type: seen(head.querySelector('.glance .tag')), priority: seen(head.querySelector('.glance .prio')),
      progress: seen(head.querySelector('.glance .pills')),
    },
    factsInBody: !!facts && facts.closest('#drawer-body') === body,
    factsBeforeBackground: !!facts && !!firstH2 && !!(facts.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING),
    factNames: [...(facts?.querySelectorAll('dt') || [])].map((x) => x.textContent),
    fullTitle: body.querySelector('.full-title')?.hidden === false ? body.querySelector('.full-title').textContent : null,
    wide: { page: document.documentElement.scrollWidth > innerWidth, drawer: d.scrollWidth > d.clientWidth, head: head.scrollWidth > head.clientWidth, body: body.scrollWidth > body.clientWidth },
    stickOut: [...d.querySelectorAll('*')].filter((el) => r(el).width && r(el).right > d.getBoundingClientRect().right + 0.5).map((el) => el.className || el.tagName),
    // Text wider than its own box: clipped rather than scrolled, but still unreadable.
    overflowing: [...d.querySelectorAll('*')].filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map((el) => el.className || el.tagName),
  };
};
const scrollDown = () => { const b = document.getElementById('drawer-body'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); return b.scrollTop; };
const headId = () => document.querySelector('#drawer-head .top .mono')?.textContent;

const browserTest = (name, fn) => test(name, { skip: chromePath() ? false : 'Chrome is not installed' }, async () => {
  const v = await startViewer(board());
  const page = await openBrowser();
  try { await fn(v, page); } finally { await page?.close(); await v.close(); }
});

const open = async (v, page, id) => {
  await page.goto(`${v.base}/alpha/ticket/${id}`);
  await page.until(`() => document.querySelector('#drawer-head .top .mono')?.textContent === '${id}' && !!document.querySelector('#drawer-body .facts')`);
};

for (const [name, w, h] of [['window 1280×800', 1280, 800], ['phone 390×844', 390, 844]]) {
  browserTest(`drawer in a ${name}: the fixed part ≤ a fifth of the drawer's height, before and after scrolling, with a short and a very long title`, async (v, page) => {
    await page.size(w, h);
    for (const id of [ID.a, ID.b]) {
      await open(v, page, id);
      const top = await page.eval(measure);
      assert.ok(top.head <= top.drawer / 5, `${id} at the top: ${top.head} px > ${top.drawer / 5}`);
      assert.ok(top.titleLines <= 2, `${id}: title of ${top.titleLines} lines`);
      if (w === 1280) assert.ok(top.head + 20 <= top.drawer / 5, `${id}: room left for one more row (${top.head} px)`);
      assert.ok(await page.eval(scrollDown) > 0, 'the text scrolls');
      const down = await page.eval(measure);
      assert.equal(down.scrolled, true, 'the title folds when scrolled');
      assert.equal(down.titleLines, 1);
      assert.ok(down.head < top.head || top.titleLines === 1, 'the fixed part shrinks as the title folds');
      assert.deepEqual(down.glance, { status: true, id: true, title: true, type: true, priority: true, progress: true }, `${id}: what is glanced at stays in view`);
      await page.eval(`() => { const b = document.getElementById('drawer-body'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); }`);
      assert.equal((await page.eval(measure)).scrolled, false, 'the title unfolds again at the top');
    }
  });

  browserTest(`drawer in a ${name}: no sideways scrolling`, async (v, page) => {
    await page.size(w, h);
    for (const id of [ID.a, ID.b, ID.c]) {
      await open(v, page, id);
      for (const state of ['top', 'bottom']) {
        if (state === 'bottom') await page.eval(scrollDown);
        const m = await page.eval(measure);
        assert.deepEqual(m.wide, { page: false, drawer: false, head: false, body: false }, `${id} ${state}`);
        assert.deepEqual(m.stickOut, [], `${id} ${state}: nothing sticks out of the drawer`);
        assert.deepEqual(m.overflowing, [], `${id} ${state}: no text cut off sideways`);
      }
    }
  });
}

browserTest('drawer: the other facts sit in the scrolling part before Background; a long title is shown whole there', async (v, page) => {
  await page.size(1280, 800);
  await open(v, page, ID.a);
  const a = await page.eval(measure);
  assert.deepEqual(a.factNames, ['Labels', 'Reporter', 'Assigned to', 'Created', 'Updated', 'Related', 'Blocked by']);
  assert.equal(a.factsInBody, true);
  assert.equal(a.factsBeforeBackground, true);
  assert.equal(a.fullTitle, null, 'a short title is not repeated');
  await open(v, page, ID.b);
  assert.equal((await page.eval(measure)).fullTitle, LONG, 'a title cut short is shown whole at the start of the text');
});

browserTest('drawer: the Related and Blocked by links open their ticket; Close and Escape close the drawer', async (v, page) => {
  await page.size(1280, 800);
  for (const [fact, target] of [['Related', ID.b], ['Blocked by', ID.c]]) {
    await open(v, page, ID.a);
    await page.eval(`() => { const dt = [...document.querySelectorAll('#drawer-body .facts dt')].find((x) => x.textContent === '${fact}'); dt.nextElementSibling.querySelector('a.ref').click(); }`);
    await page.until(`() => (${headId})() === '${target}'`);
    assert.ok((await page.eval('() => location.pathname')).endsWith(`/ticket/${target}`), `${fact}: the address follows`);
  }
  await open(v, page, ID.a);
  await page.eval(`() => document.querySelector('#drawer-head [data-close]').click()`);
  await page.until(`() => document.getElementById('drawer').hidden && location.pathname === '/alpha/'`);
  await open(v, page, ID.a);
  await page.eval(`() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  await page.until(`() => document.getElementById('drawer').hidden`);
});
