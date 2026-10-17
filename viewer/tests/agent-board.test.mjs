// The board showing what agents do on its tickets, from made-up Claude Code
// logs in a temporary folder: through the server, then in a real browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ticket, makeBoard, tempRoot, startViewer, listenEvents, agentLog, appendLog, line, encodeProject } from './helpers.mjs';
import { openBrowser, chromePath } from './browser.mjs';

const MIN = 60 * 1000;
const ID = {
  working: '260101000001', review: '260101000002', quiet: '260101000003', gone: '260101000004',
  interrupted: '260101000005', finished: '260101000006', passed: '260101000007', none: '260101000008',
  todo: '260101000009', done: '260101000010',
};

// Words that only ever appear inside what a step carried: none may reach the page.
const SECRET = /SECRET/;

function setup() {
  const root = tempRoot();
  const body = '## Background\nx\n\n## Done when\n- [x] a\n- [ ] b\n\n## Notes\n(none yet)';
  const board = makeBoard(root, 'alpha', {
    [`in_progress/${ID.working} Being worked.md`]: ticket({ body }),
    [`review/${ID.review} Being reviewed.md`]: ticket({ body }),
    [`in_progress/${ID.quiet} Quiet.md`]: ticket({ body }),
    [`in_progress/${ID.gone} Gone.md`]: ticket({ body }),
    [`in_progress/${ID.interrupted} Interrupted.md`]: ticket({ body }),
    [`in_progress/${ID.finished} Finished but still in progress.md`]: ticket({ body }),
    [`review/${ID.passed} Worker finished waiting for the reviewer.md`]: ticket({ body }),
    [`in_progress/${ID.none} No agent.md`]: ticket({ body }),
    [`todo/${ID.todo} In todo.md`]: ticket({ body }),
    [`done/${ID.done} In done.md`]: ticket({ body }),
  });
  const project = path.dirname(board);
  const claude = path.join(root, 'claude');
  const now = Date.now();
  const secrets = (at) => [
    line.think(at, 'SECRET-THOUGHT'),
    line.say(at, 'SECRET-TEXT'),
    line.step(at, 'Grep', { pattern: 'SECRET-PATTERN' }),
    line.result(at, 'SECRET-RESULT'),
  ];
  const steps = (n, from, gap) => Array.from({ length: n }, (_, i) => line.step(from + i * gap, i % 3 ? 'Bash' : 'Read', i % 3 ? { description: `Step ${i}`, command: 'echo SECRET-COMMAND' } : { file_path: path.join(project, `file-${i}.md`) }));
  const logs = {
    working: agentLog(claude, project, { id: 'working', description: `Work ticket ${ID.working}`, lines: [line.prompt(now - 34 * MIN, 'SECRET-PROMPT'), ...secrets(now - 30 * MIN), ...steps(19, now - 20 * MIN, 60000), line.step(now - 5000, 'Bash', { description: 'Update README API sections', command: 'SECRET-COMMAND' })] }),
    review: agentLog(claude, project, { id: 'review', agentType: 'kerjaan:kerjaan-reviewer', description: `Review ticket ${ID.review}`, lines: [line.prompt(now - 3 * MIN, 'x'), line.step(now - 8000, 'Read', { file_path: path.join(project, 'viewer', 'app.mjs') })] }),
    quiet: agentLog(claude, project, { id: 'quiet', description: `Work ticket ${ID.quiet}`, lines: [line.prompt(now - 10 * MIN, 'x'), line.step(now - 6 * MIN, 'Bash', { description: 'Run the tests' })] }),
    gone: agentLog(claude, project, { id: 'gone', description: `Work ticket ${ID.gone}`, lines: [line.prompt(now - 90 * MIN, 'x'), line.step(now - 45 * MIN, 'Bash', { description: 'Last step' })] }),
    interrupted: agentLog(claude, project, { id: 'interrupted', description: `Work ticket ${ID.interrupted}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 8 * MIN, 'Bash', { description: 'Read the ticket' }), line.result(now - 8 * MIN, 'x'), line.interrupt(now - 8 * MIN)] }),
    finished: agentLog(claude, project, { id: 'finished', description: `Work ticket ${ID.finished}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4 * MIN, 'SubagentHandback', { message: 'SECRET-REPORT' }), line.result(now - 4 * MIN, 'ok')] }),
    passed: agentLog(claude, project, { id: 'passed', description: `Work ticket ${ID.passed}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4 * MIN, 'SubagentHandback', {}), line.result(now - 4 * MIN, 'ok')] }),
    todo: agentLog(claude, project, { id: 'todo', description: `Work ticket ${ID.todo}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4000, 'Bash', { description: 'x' })] }),
    done: agentLog(claude, project, { id: 'done', agentType: 'kerjaan:kerjaan-reviewer', description: `Review ticket ${ID.done}`, lines: [line.prompt(now - 9 * MIN, 'x'), line.step(now - 4000, 'Bash', { description: 'x' })] }),
  };
  return { root, project, claude, board, logs, now };
}

const byId = (data) => Object.fromEntries(data.tickets.map((t) => [t.id, t]));

// ---------- through the server ----------

test('kanban: tickets in progress and in review carry their agent; todo, done and tickets without a log do not', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const t = byId(await (await v.get('/alpha/api/board')).json());
    assert.deepEqual([t[ID.working].agent.kind, t[ID.working].agent.step.label, t[ID.working].agent.ended], ['worker', 'Update README API sections', null]);
    assert.deepEqual([t[ID.review].agent.kind, t[ID.review].agent.step.label], ['reviewer', 'viewer/app.mjs']);
    assert.equal(t[ID.interrupted].agent.ended, 'interrupted');
    assert.equal(t[ID.finished].agent.ended, 'finished');
    for (const id of [ID.none, ID.todo, ID.done]) assert.ok(!('agent' in t[id]), `${id} without an agent`);
    assert.ok(Object.values(t).every((x) => !x.agent || !('steps' in x.agent)), 'a card carries no step list');
  } finally { await v.close(); }
});

test('ticket text and api/agent: the last 15 steps, oldest first, with their times', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const [t] = await (await v.get(`/alpha/api/ticket/${ID.working}`)).json();
    assert.equal(t.agent.steps.length, 15);
    assert.equal(t.agent.steps.at(-1).label, 'Update README API sections');
    assert.ok(t.agent.steps.every((x, i, all) => typeof x.at === 'number' && (i === 0 || all[i - 1].at <= x.at)));
    assert.equal(t.agent.startedAt, s.now - 34 * MIN);
    const { agent } = await (await v.get(`/alpha/api/agent/${ID.working}`)).json();
    assert.deepEqual(agent, t.agent);
    for (const id of [ID.none, ID.todo, ID.done, '999999999999']) {
      assert.deepEqual(await (await v.get(`/alpha/api/agent/${id}`)).json(), { agent: null }, id);
    }
    const [todo] = await (await v.get(`/alpha/api/ticket/${ID.todo}`)).json();
    assert.ok(!('agent' in todo));
  } finally { await v.close(); }
});

test('an agent\'s commands, results, thinking and text never leave the server', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    const seen = [await (await v.get('/alpha/api/board')).text()];
    for (const id of Object.values(ID)) {
      seen.push(await (await v.get(`/alpha/api/ticket/${id}`)).text(), await (await v.get(`/alpha/api/agent/${id}`)).text());
    }
    const waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.includes('event: agent'), 5000);
    await new Promise((r) => setTimeout(r, 300));
    appendLog(s.logs.working, ...[line.think(Date.now(), 'SECRET-THOUGHT-2'), line.step(Date.now(), 'Bash', { description: 'Another step', command: 'SECRET-COMMAND-2' }), line.result(Date.now(), 'SECRET-RESULT-2')]);
    const got = await waiting;
    assert.ok(got.ok, 'news of the agent arrives');
    seen.push(got.text);
    for (const text of seen) assert.ok(!SECRET.test(text), text.match(/.{0,80}SECRET.{0,40}/)?.[0]);
    assert.ok(seen.join('').includes('Another step'), 'the step\'s label still arrives');
  } finally { await v.close(); }
});

test('an agent takes a step: the open page hears of it within seconds, though .kerjaan did not change', async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  try {
    for (const [log, id, label] of [[s.logs.working, ID.working, 'Write a new test'], [s.logs.review, ID.review, 'Check the evidence']]) {
      const waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.includes(label), 6000);
      await new Promise((r) => setTimeout(r, 300));
      const t0 = Date.now();
      appendLog(log, line.step(Date.now(), 'Bash', { description: label }));
      const got = await waiting;
      assert.ok(got.ok, `no news for ${id}: ${got.text.slice(-300)}`);
      assert.ok(Date.now() - t0 < 5000);
      const data = JSON.parse(got.text.split('event: agent\ndata: ').at(-1).split('\n')[0]);
      assert.equal(data[id].step.label, label);
      assert.ok(!got.text.includes('event: change'), 'the board itself did not change');
    }
  } finally { await v.close(); }
});

test('Claude Code\'s logs missing, unreadable, or in another format: the board is as it is without this feature', async () => {
  const s = setup();
  const plain = await startViewer(s.root);
  let want;
  const strip = (p) => ({ ...p, readAt: 0 });
  try { want = strip(await (await plain.get('/alpha/api/board')).json()); } finally { await plain.close(); }
  assert.ok(want.tickets.every((t) => !('agent' in t)));

  const broken = [
    ['no folder', path.join(s.root, 'missing')],
    ['projects is a file', (() => { const d = path.join(s.root, 'c1'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'projects'), 'x'); return d; })()],
    ['another format', (() => {
      const d = path.join(s.root, 'c2');
      const sub = path.join(d, 'projects', encodeProject(s.project), 'session', 'subagents');
      fs.mkdirSync(sub, { recursive: true });
      fs.writeFileSync(path.join(sub, 'agent-x.meta.json'), JSON.stringify({ type: 'new', task: `Work ticket ${ID.working}` }));
      fs.writeFileSync(path.join(sub, 'agent-x.jsonl'), '{"event":"step","t":1}\nnot json\n');
      fs.writeFileSync(path.join(sub, 'agent-y.meta.json'), JSON.stringify({ description: `Work ticket ${ID.review}` }));
      fs.writeFileSync(path.join(sub, 'agent-y.jsonl'), '{"kind":"assistant","at":"2026"}\n');
      return d;
    })()],
  ];
  if (process.getuid?.() !== 0) {
    const d = path.join(s.root, 'c3');
    fs.cpSync(s.claude, d, { recursive: true });
    fs.chmodSync(path.join(d, 'projects'), 0o000);
    broken.push(['unreadable', d]);
  }
  try {
    for (const [name, dir] of broken) {
      const v = await startViewer(s.root, { claudeDir: dir });
      try {
        const r = await v.get('/alpha/api/board');
        assert.equal(r.status, 200, name);
        assert.deepEqual(strip(await r.json()), want, name);
        const [t] = await (await v.get(`/alpha/api/ticket/${ID.working}`)).json();
        assert.ok(!('agent' in t), name);
        assert.deepEqual(await (await v.get(`/alpha/api/agent/${ID.working}`)).json(), { agent: null }, name);
      } finally { await v.close(); }
    }
  } finally {
    if (broken.at(-1)[0] === 'unreadable') fs.chmodSync(path.join(broken.at(-1)[1], 'projects'), 0o755);
  }
});

// ---------- in a real browser ----------

const browserTest = (name, fn) => test(name, { skip: chromePath() ? false : 'Chrome is not installed' }, async () => {
  const s = setup();
  const v = await startViewer(s.root, { claudeDir: s.claude });
  const page = await openBrowser();
  try { await fn(s, v, page); } finally { await page?.close(); await v.close(); }
});

// What a card's agent line says and how it looks.
const cardAgent = (id) => {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const a = card?.querySelector('.agent');
  if (!a) return card ? { none: true, text: card.textContent } : null;
  const css = (el, p) => el && getComputedStyle(el)[p];
  return {
    tone: [...a.classList].filter((c) => c !== 'agent')[0],
    kind: a.querySelector('.kind')?.textContent,
    word: a.querySelector('.state')?.textContent || '',
    step: a.querySelector('.step')?.textContent,
    ago: a.querySelector('.ago')?.textContent,
    dot: css(a.querySelector('.signal'), 'backgroundColor'),
    bg: css(a, 'backgroundColor'),
    border: css(card, 'borderTopColor'),
    agoSeen: (() => { const r = a.querySelector('.ago').getBoundingClientRect(); const c = card.getBoundingClientRect(); return r.width > 0 && r.right <= c.right + 0.5; })(),
    belowTitle: a.getBoundingClientRect().top >= card.querySelector('.title').getBoundingClientRect().bottom - 0.5,
  };
};

browserTest('card: the agent\'s kind, its last step, and how long ago, under the title', async (s, v, page) => {
  await page.size(1280, 800);
  // Whether the line is there the moment the card is drawn, before any timer.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `new MutationObserver((_, o) => { const c = document.querySelector('.card[data-id="${ID.working}"]'); if (c) { window.__first = !!c.querySelector('.agent'); o.disconnect(); } }).observe(document, { childList: true, subtree: true });` });
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => window.__first !== undefined`);
  assert.equal(await page.eval('() => window.__first'), true, 'the agent line is there from the moment the card is drawn');
  await page.until(`() => !!document.querySelector('.card[data-id="${ID.working}"] .agent')`);
  const working = await page.eval(cardAgent, ID.working);
  assert.deepEqual([working.tone, working.kind, working.word, working.step], ['working', 'worker', '', 'Update README API sections']);
  assert.match(working.ago, /^\d+ s ago$/);
  assert.equal(working.belowTitle, true);
  assert.equal(working.agoSeen, true);
  const review = await page.eval(cardAgent, ID.review);
  assert.deepEqual([review.tone, review.kind, review.step], ['working', 'reviewer', 'viewer/app.mjs']);
  for (const id of [ID.none, ID.todo, ID.done]) {
    const c = await page.eval(cardAgent, id);
    assert.equal(c.none, true, `${id} without an agent line`);
    assert.ok(!/error|cannot/i.test(c.text), c.text);
  }
});

browserTest('card: changes by itself when the agent takes a step, and "x ago" keeps counting, without a reload', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => !!document.querySelector('.card[data-id="${ID.working}"] .agent')`);
  await page.eval(`() => { window.__kept = 1; document.querySelector('.card[data-id="${ID.working}"]').focus(); }`);
  for (const [log, id, label] of [[s.logs.working, ID.working, 'The step after'], [s.logs.review, ID.review, 'Compare with Done when']]) {
    const t0 = Date.now();
    appendLog(log, line.step(Date.now(), 'Bash', { description: label }));
    await page.until(`() => document.querySelector('.card[data-id="${id}"] .agent .step')?.textContent === ${JSON.stringify(label)}`, 6000);
    assert.ok(Date.now() - t0 < 6000, `${id}: ${Date.now() - t0} ms`);
  }
  assert.equal(await page.eval('() => window.__kept'), 1, 'the page was not reloaded');
  assert.equal(await page.eval(`() => document.activeElement?.dataset.id`), ID.working, 'the card keeps its focus');
  const before = (await page.eval(cardAgent, ID.working)).ago;
  await page.until(`() => document.querySelector('.card[data-id="${ID.working}"] .agent .ago').textContent !== ${JSON.stringify(before)}`, 4000);
});

browserTest('the mark: each state of an agent looks different; one stopped in progress stands out most', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/`);
  await page.until(`() => document.querySelectorAll('.card .agent').length === 7`);
  const got = {};
  for (const [k, id] of Object.entries(ID)) got[k] = await page.eval(cardAgent, id);
  const want = { working: ['working', ''], review: ['working', ''], quiet: ['quiet', 'quiet'], gone: ['stopped', 'silent'], interrupted: ['stopped', 'interrupted'], finished: ['stopped', 'stopped'], passed: ['done', 'done'] };
  for (const [k, [tone, word]] of Object.entries(want)) assert.deepEqual([got[k].tone, got[k].word], [tone, word], k);
  // Each tone's dot in its own colour from the stylesheet: green, yellow, red.
  const color = (v) => { const el = document.createElement('i'); el.style.color = `var(${v})`; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; };
  const want2 = await page.eval(`() => (${color})('--agent-working') + '|' + (${color})('--agent-quiet') + '|' + (${color})('--agent-stopped')`);
  const [green, yellow, red] = want2.split('|');
  assert.equal(new Set([green, yellow, red]).size, 3);
  for (const k of ['working', 'review']) assert.equal(got[k].dot, green, `${k}: green`);
  assert.equal(got.quiet.dot, yellow, 'quiet: yellow');
  for (const k of ['gone', 'interrupted', 'finished']) assert.equal(got[k].dot, red, `${k}: red`);
  assert.ok(![green, yellow, red].includes(got.passed.dot), 'done in review: no state colour');
  for (const k of ['gone', 'interrupted', 'finished']) {
    assert.notEqual(got[k].bg, 'rgba(0, 0, 0, 0)', `${k}: the line has a background`);
    assert.equal(got[k].border, got[k].dot, `${k}: the card's edge turns red too`);
  }
  for (const k of ['working', 'quiet', 'passed']) {
    assert.equal(got[k].bg, 'rgba(0, 0, 0, 0)', `${k}: no background`);
    assert.notEqual(got[k].border, got.interrupted.dot, `${k}: an ordinary card edge`);
  }
});

// The open drawer, measured.
const drawerAgent = () => {
  const d = document.getElementById('drawer');
  const head = document.getElementById('drawer-head');
  const body = document.getElementById('drawer-body');
  const line = head.querySelector('.agent');
  const det = body.querySelector('details.agent-steps');
  const r = line?.getBoundingClientRect();
  return {
    drawer: d.clientHeight, head: head.offsetHeight,
    line: line ? { kind: line.querySelector('.kind').textContent, step: line.querySelector('.step').textContent, ago: line.querySelector('.ago').textContent, seen: r.width > 0 && r.right <= d.getBoundingClientRect().right } : null,
    details: det ? { open: det.open, summary: det.querySelector('summary').textContent, first: body.firstElementChild?.matches('.agent-block'),
      rows: [...det.querySelectorAll('li')].map((li) => ({ time: li.querySelector('time')?.textContent, tool: li.querySelector('.tool')?.textContent, label: li.querySelector('.step-label')?.textContent, shown: li.checkVisibility({ contentVisibilityAuto: true }) && li.getBoundingClientRect().height > 0 })) } : null,
    wide: [d, head, body].some((el) => el.scrollWidth > el.clientWidth) || document.documentElement.scrollWidth > innerWidth,
    overflowing: [...d.querySelectorAll('*')].filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && !el.matches('.step, .tool')).map((el) => el.className || el.tagName),
  };
};

const openTicket = async (v, page, id) => {
  await page.goto(`${v.base}/alpha/ticket/${id}`);
  await page.until(`() => document.querySelector('#drawer-head .top .mono')?.textContent === '${id}' && !!document.querySelector('#drawer-body .facts')`);
};

for (const [name, w, h] of [['window 1280×800', 1280, 800], ['phone 390×844', 390, 844]]) {
  browserTest(`drawer in a ${name}: the agent line in the fixed part, 15 steps with times and how long it ran, opening and closing`, async (s, v, page) => {
    await page.size(w, h);
    await openTicket(v, page, ID.working);
    const m = await page.eval(drawerAgent);
    assert.deepEqual([m.line.kind, m.line.step, m.line.seen], ['worker', 'Update README API sections', true]);
    assert.match(m.line.ago, /s ago$/);
    assert.ok(m.head <= m.drawer / 5, `fixed part ${m.head} px > ${m.drawer / 5}`);
    assert.equal(m.details.first, true, 'the step list opens the scrolling part');
    assert.equal(m.details.open, false, 'folded at first');
    assert.match(m.details.summary, /worker: last 15 steps/);
    assert.match(m.details.summary, /running 34 min/);
    assert.equal(m.details.rows.length, 15);
    assert.ok(m.details.rows.every((r) => !r.shown), 'folded: the steps are not shown');
    assert.deepEqual(m.wide, false);
    assert.deepEqual(m.overflowing, []);

    await page.eval(`() => document.querySelector('details.agent-steps summary').click()`);
    const opened = await page.eval(drawerAgent);
    assert.equal(opened.details.open, true);
    assert.ok(opened.details.rows.every((r) => r.shown && /^\d\d:\d\d:\d\d$/.test(r.time) && r.tool && r.label), JSON.stringify(opened.details.rows[0]));
    assert.equal(opened.details.rows[0].label, 'Update README API sections', 'newest on top');
    assert.equal(opened.details.rows.find((r) => r.tool === 'Read').label.endsWith('.md'), true, 'the name of the file read');
    assert.deepEqual(opened.wide, false);
    assert.deepEqual(opened.overflowing, []);
    const top = await page.eval(drawerAgent);
    assert.ok(top.head <= top.drawer / 5);

    // A new step shows up in the head and in the open list, which stays open.
    appendLog(s.logs.working, line.step(Date.now(), 'Edit', { file_path: path.join(s.project, 'viewer', 'new.js'), old_string: 'SECRET' }));
    await page.until(`() => document.querySelector('#drawer-head .agent .step')?.textContent === 'viewer/new.js' && document.querySelector('details.agent-steps li .step-label')?.textContent === 'viewer/new.js'`, 6000);
    assert.equal((await page.eval(drawerAgent)).details.open, true, 'still open after the update');
    assert.ok(!(await page.eval('() => document.body.innerHTML')).includes('SECRET'));

    await page.eval(`() => document.querySelector('details.agent-steps summary').click()`);
    assert.equal((await page.eval(drawerAgent)).details.open, false, 'it folds again');
    await page.eval(`() => document.querySelector('#drawer-head [data-close]').click()`);
    await page.until(`() => document.getElementById('drawer').hidden && location.pathname === '/alpha/'`);
  });
}

browserTest('drawer: the reviewer in review; a ticket without an agent and a ticket in todo show no agent line and no error', async (s, v, page) => {
  await page.size(1280, 800);
  await openTicket(v, page, ID.review);
  const t = await page.eval(drawerAgent);
  assert.deepEqual([t.line.kind, t.line.step], ['reviewer', 'viewer/app.mjs']);
  for (const id of [ID.none, ID.todo]) {
    await openTicket(v, page, id);
    const m = await page.eval(drawerAgent);
    assert.equal(m.line, null, id);
    assert.equal(m.details, null, id);
    assert.equal(await page.eval(`() => document.querySelectorAll('#drawer .notice').length`), 0, `${id}: no notice`);
  }
});

browserTest('broken logs: the board shows as it does without this feature, with no error', async (s, v, page) => {
  await v.close();
  const sub = path.join(s.root, 'broken', 'projects', encodeProject(s.project), 'session', 'subagents');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(sub, 'agent-x.meta.json'), '{broken');
  fs.writeFileSync(path.join(sub, 'agent-x.jsonl'), 'not json\n');
  const v2 = await startViewer(s.root, { claudeDir: path.join(s.root, 'broken') });
  try {
    await page.size(1280, 800);
    await page.goto(`${v2.base}/alpha/`);
    await page.until(`() => document.querySelectorAll('.card').length === 10`);
    assert.equal(await page.eval(`() => document.querySelectorAll('.card .agent').length`), 0);
    assert.ok(!/error|cannot be read/i.test(await page.eval('() => document.body.textContent')));
    await openTicket(v2, page, ID.working);
    assert.equal((await page.eval(drawerAgent)).line, null);
  } finally { await v2.close(); }
});
