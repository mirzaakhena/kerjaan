// The Progress of a ticket's test runs (261028112701): read from the copy
// test-run.sh makes of a run's output under .git/kerjaan-progress/, through the
// server, as the page draws it, and in a real browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';
import { readRuns, terminalLines, LINES } from '../runs.mjs';
import { runState, runButton, runSection, runHead, RUN_QUIET, RUN_STALLED } from '../web/run.js';

const MIN = 60 * 1000;
const ID = {
  worker: '260101000001', reviewer: '260101000002', none: '260101000003', todo: '260101000004',
  done: '260101000005', dead: '260101000006', both: '260101000007', stalled: '260101000008',
};

// A pid that has certainly ended.
const deadPid = () => spawnSync('true').pid;

// Writes the pair of files test-run.sh writes for a run going on.
function fakeRun(project, id, { pid = process.pid, who = 'worker', startedAt = Date.now() - 3 * MIN, command = 'node --test', output = '', lastAt } = {}) {
  const dir = path.join(project, '.git', 'kerjaan-progress');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, `${id}.${pid}.log`);
  fs.writeFileSync(log, output);
  fs.writeFileSync(path.join(dir, `${id}.${pid}.json`), JSON.stringify({ ticket: id, pid, who, startedAt, command }) + '\n');
  if (lastAt) fs.utimesSync(log, new Date(lastAt), new Date(lastAt));
  return { log, json: path.join(dir, `${id}.${pid}.json`) };
}

function setup() {
  const root = tempRoot();
  const body = '## Background\nx\n\n## Done when\n- [ ] a\n\n## Notes\n(none yet)';
  const board = makeBoard(root, 'alpha', {
    [`in_progress/${ID.worker} Worker testing.md`]: ticket({ body: body.replace('x\n', 'x\n\n' + 'A long background paragraph.\n\n'.repeat(80)) }),
    [`review/${ID.reviewer} Reviewer testing.md`]: ticket({ body }),
    [`in_progress/${ID.none} No run.md`]: ticket({ body }),
    [`todo/${ID.todo} In todo.md`]: ticket({ body }),
    [`done/${ID.done} In done.md`]: ticket({ body }),
    [`in_progress/${ID.dead} Run killed.md`]: ticket({ body }),
    [`review/${ID.both} Two runs.md`]: ticket({ body }),
    [`in_progress/${ID.stalled} Stalled.md`]: ticket({ body }),
  });
  const project = path.dirname(board);
  const lines = Array.from({ length: 30 }, (_, i) => `ok ${i + 1} - test number ${i + 1}`).join('\n') + '\n';
  const runs = {
    worker: fakeRun(project, ID.worker, { output: `\x1b[32m${lines}\x1b[0m<script>alert(1)</script>\n` }),
    reviewer: fakeRun(project, ID.reviewer, { who: 'reviewer', command: 'node --test viewer/tests/runs.test.mjs', output: 'sabotage run\n' }),
    todo: fakeRun(project, ID.todo, { output: 'x\n' }),
    done: fakeRun(project, ID.done, { output: 'x\n' }),
    dead: fakeRun(project, ID.dead, { pid: deadPid(), output: 'x\n' }),
    both1: fakeRun(project, ID.both, { who: 'reviewer', pid: process.ppid, startedAt: Date.now() - 2 * MIN, output: 'first\n' }),
    both2: fakeRun(project, ID.both, { who: 'reviewer', startedAt: Date.now() - MIN, output: 'second\n' }),
    stalled: fakeRun(project, ID.stalled, { output: 'hanging\n', startedAt: Date.now() - 20 * MIN, lastAt: Date.now() - 10 * MIN }),
  };
  return { root, project, runs };
}

const byId = (data) => Object.fromEntries(data.tickets.map((t) => [t.id, t]));

// ---------- reading ----------

test('only runs whose process is alive, of the tickets asked for, are read', () => {
  const s = setup();
  const got = readRuns(s.project, { ids: Object.values(ID) });
  assert.deepEqual([...got.keys()].sort(), [ID.worker, ID.reviewer, ID.todo, ID.done, ID.both, ID.stalled].sort());
  assert.equal(got.get(ID.both).length, 2);
  assert.deepEqual(got.get(ID.both).map((r) => r.who), ['reviewer', 'reviewer']);
  assert.ok(got.get(ID.both)[0].startedAt < got.get(ID.both)[1].startedAt, 'oldest first');
  assert.equal(readRuns(s.project, { ids: [ID.worker] }).size, 1);
  assert.equal(readRuns(s.project, { ids: [] }).size, 0);
  assert.equal(readRuns(path.join(s.root, 'nowhere'), { ids: [ID.worker] }).size, 0, 'no repository: no runs, no error');
});

test('a run whose files do not agree, or cannot be read, is left out without an error', () => {
  const s = setup();
  const dir = path.join(s.project, '.git', 'kerjaan-progress');
  // Its .json names another ticket; another's names another pid; one is broken; one has no log.
  fs.writeFileSync(path.join(dir, `${ID.none}.${process.pid}.json`), JSON.stringify({ ticket: ID.worker, pid: process.pid }));
  fs.writeFileSync(path.join(dir, `${ID.none}.${process.pid}.log`), 'x\n');
  fs.writeFileSync(path.join(dir, `${ID.none}.1.json`), JSON.stringify({ ticket: ID.none, pid: process.pid }));
  fs.writeFileSync(path.join(dir, `${ID.none}.2.json`), '{broken');
  fs.writeFileSync(path.join(dir, `${ID.none}.${process.ppid}.json`), JSON.stringify({ ticket: ID.none, pid: process.ppid }));
  assert.equal(readRuns(s.project, { ids: [ID.none] }).size, 0);
});

test('a linked worktree\'s .git file leads to the common folder', () => {
  const s = setup();
  const wt = path.join(s.root, 'alpha-wt');
  const own = path.join(s.project, '.git', 'worktrees', 'alpha-wt');
  fs.mkdirSync(own, { recursive: true });
  fs.mkdirSync(wt);
  fs.writeFileSync(path.join(own, 'commondir'), '../..\n');
  fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${own}\n`);
  assert.equal(readRuns(wt, { ids: [ID.worker] }).get(ID.worker).length, 1);
});

test('output as a terminal shows it: colours and cursor codes dropped, a line rewritten by \\r shows its last version', () => {
  assert.deepEqual(terminalLines('\x1b[1;32mpass\x1b[0m 3\n\x1b]0;title\x07loading 10%\rloading 50%\rloading done\r\nend\ttab\x07'), ['pass 3', 'loading done', 'end\ttab']);
});

test('the last lines only, and a mark that earlier ones were left out', () => {
  const s = setup();
  const many = Array.from({ length: LINES + 50 }, (_, i) => `line ${i}`).join('\n') + '\n';
  fs.writeFileSync(s.runs.worker.log, many);
  let [r] = readRuns(s.project, { ids: [ID.worker], withLines: true }).get(ID.worker);
  assert.equal(r.lines.length, LINES);
  assert.equal(r.lines.at(-1), `line ${LINES + 49}`);
  assert.equal(r.cut, true);
  // Larger than what is read from the end: no half line at the top.
  fs.writeFileSync(s.runs.worker.log, 'y'.repeat(70 * 1024) + '\nlast one\npartial');
  [r] = readRuns(s.project, { ids: [ID.worker], withLines: true }).get(ID.worker);
  assert.deepEqual(r.lines.slice(-2), ['last one', 'partial'], 'a line still being written shows too');
  assert.equal(r.cut, true);
  assert.deepEqual(r.lines, ['last one', 'partial'], 'the line the window starts in the middle of is left out');
  fs.writeFileSync(s.runs.worker.log, 'a\nb\n');
  [r] = readRuns(s.project, { ids: [ID.worker], withLines: true }).get(ID.worker);
  assert.deepEqual([r.lines, r.cut], [['a', 'b'], false]);
});

// ---------- through the server ----------

test('kanban: tickets in progress and in review carry their live runs, without output; todo, done, killed runs do not', async () => {
  const s = setup();
  const v = await startViewer(s.root);
  try {
    const t = byId(await (await v.get('/alpha/api/board')).json());
    assert.equal(t[ID.worker].runs[0].who, 'worker');
    assert.equal(t[ID.reviewer].runs[0].who, 'reviewer');
    assert.equal(t[ID.reviewer].runs[0].command, 'node --test viewer/tests/runs.test.mjs');
    assert.equal(t[ID.both].runs.length, 2);
    for (const id of [ID.none, ID.todo, ID.done, ID.dead]) assert.ok(!('runs' in t[id]), id);
    for (const x of Object.values(t)) for (const r of x.runs || []) assert.ok(!('lines' in r), 'no output on the board');
  } finally { await v.close(); }
});

test('the ticket and api/progress: each run with its last lines; nothing for other tickets; a bad ID reads nothing', async () => {
  const s = setup();
  const v = await startViewer(s.root);
  try {
    const [t] = await (await v.get(`/alpha/api/ticket/${ID.worker}`)).json();
    assert.equal(t.runs[0].lines[0], 'ok 1 - test number 1');
    assert.equal(t.runs[0].lines.at(-1), '<script>alert(1)</script>');
    const p = await (await v.get(`/alpha/api/progress/${ID.worker}`)).json();
    assert.deepEqual(p.runs[0].lines, t.runs[0].lines);
    assert.equal((await (await v.get(`/alpha/api/progress/${ID.reviewer}`)).json()).runs[0].lines[0], 'sabotage run');
    for (const id of [ID.none, ID.todo, ID.done, ID.dead, '999999999999']) {
      assert.deepEqual(await (await v.get(`/alpha/api/progress/${id}`)).json(), { runs: [] }, id);
    }
    const [todo] = await (await v.get(`/alpha/api/ticket/${ID.todo}`)).json();
    assert.ok(!('runs' in todo));
    for (const bad of ['/alpha/api/progress/12345', '/alpha/api/progress/..%2F..%2F.git', `/alpha/api/progress/${ID.worker}.${process.pid}`, `/alpha/api/progress/${ID.worker}/x`, '/alpha/api/progress/../../etc/passwd']) {
      const r = await v.raw(bad);
      assert.equal(r.status, 404, bad);
      assert.doesNotMatch(r.body, /test number|"runs"/, bad);
    }
  } finally { await v.close(); }
});

test('live: the page hears within seconds when a run prints, starts and ends, though .kerjaan did not change', async () => {
  const s = setup();
  const v = await startViewer(s.root);
  try {
    const sizeOf = (text, id) => {
      const blocks = text.split('event: progress\ndata: ').slice(1).map((b) => JSON.parse(b.split('\n')[0]));
      return blocks.at(-1)?.[id];
    };
    let waiting = listenEvents(`${v.base}/alpha/events`, (x) => sizeOf(x, ID.worker)?.[0]?.size > 2000, 6000);
    await new Promise((r) => setTimeout(r, 300));
    fs.appendFileSync(s.runs.worker.log, 'more\n'.repeat(400));
    assert.ok((await waiting).ok, 'news of the new output arrives');

    waiting = listenEvents(`${v.base}/alpha/events`, (x) => sizeOf(x, ID.none)?.length === 1, 6000);
    await new Promise((r) => setTimeout(r, 300));
    fakeRun(s.project, ID.none, { output: 'starting\n' });
    assert.ok((await waiting).ok, 'a run that starts');

    waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.includes('event: progress') && !sizeOf(x, ID.reviewer), 6000);
    await new Promise((r) => setTimeout(r, 300));
    fs.rmSync(s.runs.reviewer.log);
    fs.rmSync(s.runs.reviewer.json);
    assert.ok((await waiting).ok, 'a run that ends');
  } finally { await v.close(); }
});

// ---------- as the page draws it ----------

test('a run\'s state, by how long since it last printed: each tone and the times it shows', () => {
  const now = Date.now();
  const run = (idle) => ({ run: 'r', who: 'worker', startedAt: now - 7 * MIN, lastAt: now - idle, size: 1 });
  for (const [idle, tone, word] of [[0, 'working', ''], [RUN_QUIET - 1000, 'working', ''], [RUN_QUIET, 'quiet', 'quiet'], [RUN_STALLED - 1000, 'quiet', 'quiet'], [RUN_STALLED, 'stopped', 'no output'], [60 * MIN, 'stopped', 'no output']]) {
    const st = runState(run(idle), now);
    assert.deepEqual([st.tone, st.word], [tone, word], `${idle} ms`);
    const html = runButton(ID.worker, [run(idle)], now);
    assert.match(html, new RegExp(`class="run-open ${tone}"`));
    assert.match(html, /running 7 min/);
    assert.match(runHead(run(idle), now), new RegExp(`class="run-state ${tone}"`));
  }
  assert.match(runButton(ID.worker, [run(12000)], now), />output 12 s ago</);
  assert.match(runButton(ID.worker, [run(0)], now), />output just now</);
  assert.equal(runButton(ID.worker, [], now), '');
  assert.equal(runButton(ID.worker, undefined, now), '');
  assert.match(runButton(ID.worker, [run(0), { ...run(0), who: 'reviewer' }], now), /2 runs/);
});

test('the Progress section: each run, whose it is, its command, its output escaped, and a cut when earlier lines were left out', () => {
  const now = Date.now();
  const html = runSection([
    { run: 'a', who: 'worker', command: 'npm test', startedAt: now - MIN, lastAt: now, size: 3, lines: ['<b>x</b> & y'], cut: false },
    { run: 'b', who: 'reviewer', command: '', startedAt: now - MIN, lastAt: now, size: 3, lines: [], cut: true },
  ], now);
  assert.match(html, /<h3>Progress<\/h3>/);
  assert.match(html, /worker&#39;s test run/);
  assert.match(html, /reviewer&#39;s test run/);
  assert.match(html, /<code>npm test<\/code>/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt; &amp; y/);
  assert.doesNotMatch(html, /<b>x/);
  assert.match(html, /earlier output not shown/);
  assert.match(html, /No output yet/);
  assert.equal(runSection([], now), '');
});

// ---------- in a real browser ----------

const browserTest = (name, fn) => test(name, { skip: chromePath() ? false : 'Chrome is not installed' }, async () => {
  const s = setup();
  const v = await startViewer(s.root);
  const page = await openBrowser();
  try { await fn(s, v, page); } finally { await page?.close(); await v.close(); }
});

const cardRun = (id) => {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const b = card?.parentElement.querySelector('.run-open');
  if (!b) return card ? { none: true } : null;
  const r = b.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return {
    tone: ['working', 'quiet', 'stopped'].find((t) => b.classList.contains(t)),
    text: b.textContent, ago: b.querySelector('.ago').textContent,
    dot: getComputedStyle(b.querySelector('.signal')).backgroundColor,
    under: r.top >= c.bottom - 1.5 && Math.abs(r.left - c.left) < 1 && Math.abs(r.width - c.width) < 1,
    agoSeen: b.querySelector('.ago').getBoundingClientRect().right <= r.right + 0.5,
  };
};

const progress = () => {
  const body = document.getElementById('drawer-body');
  const sec = body.querySelector('.runs');
  if (!sec) return null;
  const pre = sec.querySelector('.run-output');
  const s = sec.getBoundingClientRect();
  const b = body.getBoundingClientRect();
  return {
    heads: [...sec.querySelectorAll('.run-head')].map((h) => h.textContent),
    output: pre.textContent,
    atEnd: pre.scrollHeight - pre.scrollTop - pre.clientHeight <= 4,
    inView: s.top >= b.top - 1 && s.top < b.bottom,
    focused: document.activeElement === sec,
    wide: document.documentElement.scrollWidth > innerWidth || [...document.getElementById('drawer').querySelectorAll('*')].some((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !el.matches('.step, .tool, .run-output, .run-output *')),
  };
};

for (const [name, w, h] of [['window 1280×800', 1280, 800], ['phone 390×844', 390, 844]]) {
  browserTest(`${name}: the card's Progress button opens the ticket at its Progress, which grows by itself`, async (s, v, page) => {
    await page.size(w, h);
    await page.goto(`${v.base}/alpha/`);
    if (w < 500) await page.eval(`() => document.querySelector('[data-status="in_progress"]').click()`);
    await page.until(`() => !!document.querySelector('[data-run-open="${ID.worker}"]')`);
    const c = await page.eval(cardRun, ID.worker);
    assert.equal(c.tone, 'working');
    assert.match(c.text, /Progress/);
    assert.match(c.text, /running 3 min/);
    assert.match(c.ago, /^output (just now|\d+ s ago)$/);
    assert.equal(c.under, true, 'hangs right under its card');
    assert.equal(c.agoSeen, true);
    for (const id of [ID.none, ID.dead]) assert.deepEqual(await page.eval(cardRun, id), { none: true }, id);

    await page.eval(`() => { window.__kept = 1; document.querySelector('[data-run-open="${ID.worker}"]').click(); }`);
    await page.until(`() => !!document.querySelector('#drawer-body .runs') && location.pathname.endsWith('/ticket/${ID.worker}')`);
    await page.until(`() => document.activeElement?.matches('#drawer-body .runs')`, 4000);
    let p = await page.eval(progress);
    assert.equal(p.inView, true, 'the section is brought into view');
    assert.equal(p.focused, true);
    assert.match(p.heads[0], /worker's test run/);
    assert.match(p.heads[0], /running 3 min/);
    assert.match(p.output, /ok 30 - test number 30\n<script>alert\(1\)<\/script>$/);
    assert.doesNotMatch(p.output, /\x1b|\[32m/);
    assert.equal(await page.eval(`() => document.querySelectorAll('#drawer script').length`), 0, 'output is text, never markup');
    assert.equal(p.atEnd, true, 'opens at the end of the output');
    assert.equal(p.wide, false);

    fs.appendFileSync(s.runs.worker.log, Array.from({ length: 40 }, (_, i) => `new line ${i}`).join('\n') + '\n');
    await page.until(`() => document.querySelector('#drawer-body .run-output')?.textContent.endsWith('new line 39')`, 8000);
    p = await page.eval(progress);
    assert.equal(p.atEnd, true, 'follows the end as lines arrive');
    assert.equal(await page.eval('() => window.__kept'), 1, 'the page was not reloaded');

    // The run's own times count on in the drawer, without any event.
    const head = p.heads[0];
    await page.until(`() => document.querySelector('#drawer-body .run-head').textContent !== ${JSON.stringify(head)}`, 4000);

    // The drawer scrolled down to the ticket's text: the button brings the
    // section back into view.
    await page.eval(`() => { const b = document.getElementById('drawer-body'); b.scrollTop = b.scrollHeight; }`);
    assert.equal((await page.eval(progress)).inView, false);
    if (w < 500) await page.eval(`() => document.querySelector('[data-close]').click()`);
    await page.eval(`() => document.querySelector('[data-run-open="${ID.worker}"]').click()`);
    await page.until(`() => { const s = document.querySelector('#drawer-body .runs').getBoundingClientRect(); const b = document.getElementById('drawer-body').getBoundingClientRect(); return s.top >= b.top - 1 && s.top < b.bottom; }`, 4000);

    // Scrolled up to read: new lines do not pull it down.
    await page.eval(`() => { document.querySelector('#drawer-body .run-output').scrollTop = 0; }`);
    fs.appendFileSync(s.runs.worker.log, 'one more\n');
    await page.until(`() => document.querySelector('#drawer-body .run-output')?.textContent.endsWith('one more')`, 8000);
    assert.equal(await page.eval(`() => document.querySelector('#drawer-body .run-output').scrollTop`), 0);

    // The run ends: its files go, and so do the button and the section.
    fs.rmSync(s.runs.worker.log);
    fs.rmSync(s.runs.worker.json);
    await page.until(`() => !document.querySelector('#drawer-body .runs') && !document.querySelector('[data-run-open="${ID.worker}"]')`, 8000);
    assert.equal(await page.eval(`() => document.querySelectorAll('#drawer .notice').length`), 0);
  });
}

browserTest('a run that has printed nothing for minutes looks different from one that prints; its times count on', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => document.querySelectorAll('.run-open').length === 4`);
  const working = await page.eval(cardRun, ID.worker);
  const stalled = await page.eval(cardRun, ID.stalled);
  assert.equal(stalled.tone, 'stopped');
  assert.match(stalled.text, /no output/);
  assert.match(stalled.text, /running 20 min/);
  assert.match(stalled.ago, /^output 10 min ago$/);
  assert.equal(stalled.agoSeen, true, 'the time since the last output stays in view');
  assert.notEqual(stalled.dot, working.dot);
  const red = await page.eval(`() => { const el = document.createElement('i'); el.style.color = 'var(--agent-stopped)'; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; }`);
  assert.equal(stalled.dot, red);
  // Seconds since the last output count on without any event.
  fs.utimesSync(s.runs.reviewer.log, new Date(Date.now() - 20000), new Date(Date.now() - 20000));
  await page.until(`() => /^output 2\\d s ago$/.test(document.querySelector('[data-run-open="${ID.reviewer}"] .ago')?.textContent)`, 8000);
  const before = (await page.eval(cardRun, ID.reviewer)).ago;
  await page.until(`() => document.querySelector('[data-run-open="${ID.reviewer}"] .ago').textContent !== ${JSON.stringify(before)}`, 4000);
});

browserTest('the reviewer\'s runs: both shown in its Progress, each with its command', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => !!document.querySelector('[data-run-open="${ID.both}"]')`);
  assert.match((await page.eval(cardRun, ID.both)).text, /2 runs/);
  await page.eval(`() => document.querySelector('[data-run-open="${ID.both}"]').click()`);
  await page.until(`() => document.querySelectorAll('#drawer-body .runs .run').length === 2`);
  const got = await page.eval(`() => [...document.querySelectorAll('#drawer-body .run')].map((r) => [r.querySelector('.run-head').textContent, r.querySelector('code')?.textContent, r.querySelector('.run-output').textContent])`);
  assert.deepEqual(got.map((g) => [/reviewer's test run/.test(g[0]), g[1], g[2]]), [[true, 'node --test', 'first'], [true, 'node --test', 'second']]);
  // Opening a ticket from its card, not from the button, leaves the drawer at its top.
  await page.eval(`() => document.querySelector('[data-id="${ID.reviewer}"].card').click()`);
  await page.until(`() => document.querySelector('#drawer-body .runs .run-output')?.textContent === 'sabotage run'`);
  assert.equal(await page.eval(`() => document.getElementById('drawer-body').scrollTop`), 0);
  assert.equal(await page.eval(`() => document.activeElement?.matches('#drawer-head [data-close]')`), true, 'the focus goes where opening a ticket puts it');
});
