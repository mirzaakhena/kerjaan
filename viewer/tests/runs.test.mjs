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
import { readRuns, readTestLines, terminalLines, LINES } from '../runs.mjs';
import { runState, runButton, runSection, runHead, runTests, runsMark, testTime, RUN_QUIET, RUN_STALLED } from '../web/run.js';

const MIN = 60 * 1000;
const ID = {
  worker: '260101000001', reviewer: '260101000002', none: '260101000003', todo: '260101000004',
  done: '260101000005', dead: '260101000006', both: '260101000007', stalled: '260101000008',
};

// A pid that has certainly ended.
const deadPid = () => spawnSync('true').pid;

// Writes the files test-run.sh writes for a run going on; with `tests`, the
// report its test command writes too (one object per line).
function fakeRun(project, id, { pid = process.pid, who = 'worker', startedAt = Date.now() - 3 * MIN, command = 'node --test', output = '', lastAt, tests } = {}) {
  const dir = path.join(project, '.git', 'kerjaan-progress');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, `${id}.${pid}.log`);
  fs.writeFileSync(log, output);
  fs.writeFileSync(path.join(dir, `${id}.${pid}.json`), JSON.stringify({ ticket: id, pid, who, startedAt, command }) + '\n');
  if (lastAt) fs.utimesSync(log, new Date(lastAt), new Date(lastAt));
  const report = path.join(dir, `${id}.${pid}.tests`);
  if (tests) fs.writeFileSync(report, tests.map((l) => JSON.stringify(l) + '\n').join(''));
  return { log, json: path.join(dir, `${id}.${pid}.json`), tests: report };
}

const T0 = Date.now() - 2 * MIN;
// What the worker's run has reported so far: two files, one test running.
const WORKER_TESTS = [
  { file: 'tests/cart.test.mjs', state: 'start', at: T0 },
  { file: 'tests/cart.test.mjs', name: 'an empty cart costs nothing', state: 'start', at: T0 },
  { file: 'tests/cart.test.mjs', name: 'an empty cart costs nothing', state: 'pass', ms: 12 },
  { file: 'tests/cart.test.mjs', name: '<img src=x onerror=alert(1)> is shown as text', state: 'start', at: T0 },
  { file: 'tests/cart.test.mjs', name: '<img src=x onerror=alert(1)> is shown as text', state: 'fail', ms: 1500 },
  { file: 'tests/cart.test.mjs', state: 'end' },
  { file: 'tests/pay.test.mjs', state: 'start', at: T0 },
  { file: 'tests/pay.test.mjs', name: 'a card is charged once', state: 'start', at: Date.now() - 65000 },
];

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
    worker: fakeRun(project, ID.worker, { output: `\x1b[32m${lines}\x1b[0m<script>alert(1)</script>\n`, tests: WORKER_TESTS }),
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

// ---------- each test, as the project reports it (261028121401) ----------

const L = (o) => JSON.stringify(o) + '\n';
const shown = (list) => list.files.map((f) => [f.file, f.state, f.tests.map((t) => `${t.state} ${t.name}${t.ms !== undefined ? ` ${t.ms}` : ''}`)]);

test('the report, line by line: each state of a test and of a file, as the format says', () => {
  const f = 'a.test.js';
  const list = readTestLines([
    L({ file: f, state: 'start', at: 5 }),
    // A test that starts and passes; one that fails; one skipped; one running.
    L({ file: f, name: 'passes', state: 'start', at: 10 }), L({ file: f, name: 'passes', state: 'pass', ms: 3 }),
    L({ file: f, name: 'fails', state: 'start' }), L({ file: f, name: 'fails', state: 'fail', ms: 4 }),
    L({ file: f, name: 'skipped', state: 'start' }), L({ file: f, name: 'skipped', state: 'skip' }),
    L({ file: f, name: 'running', state: 'start', at: 20 }),
    // Reported only at its end.
    L({ file: f, name: 'only an end', state: 'pass', ms: 1 }),
    // Two of one name: each end goes to the earliest still open.
    L({ file: f, name: 'twin', state: 'start' }), L({ file: f, name: 'twin', state: 'start' }),
    L({ file: f, name: 'twin', state: 'pass' }), L({ file: f, name: 'twin', state: 'fail' }),
    // A group that passed is only its tests; one that failed on its own is listed red.
    L({ file: f, name: 'suite', state: 'start' }), L({ file: f, name: 'suite', state: 'group' }),
    L({ file: f, name: 'suite > inner', state: 'start' }), L({ file: f, name: 'suite > inner', state: 'pass' }),
    L({ file: f, name: 'suite', state: 'pass' }),
    L({ file: f, name: 'broken', state: 'start' }), L({ file: f, name: 'broken', state: 'group' }),
    L({ file: f, name: 'broken', state: 'fail', ms: 9 }),
    L({ file: f, name: 'declared group', state: 'group' }),
    L({ file: f, state: 'end' }),
    // A second file that fails on its own while a test runs.
    L({ file: 'b.test.js', state: 'start' }), L({ file: 'b.test.js', name: 'cut short', state: 'start' }),
    L({ file: 'b.test.js', name: 'done before', state: 'pass' }),
    L({ file: 'b.test.js', state: 'end' }), L({ file: 'b.test.js', state: 'fail' }), L({ file: 'b.test.js', state: 'start' }),
    // Tests of a file never said to start; a file still going.
    L({ file: 'c.test.js', name: 'no file line', state: 'pass' }),
    L({ file: 'd.test.js', state: 'start' }),
  ].join(''));
  assert.deepEqual(shown(list), [
    ['a.test.js', 'ended', ['pass passes 3', 'fail fails 4', 'skip skipped', 'running running', 'pass only an end 1', 'pass twin', 'fail twin', 'pass suite > inner', 'fail broken 9']],
    ['b.test.js', 'failed', ['unfinished cut short', 'pass done before']],
    ['c.test.js', 'running', ['pass no file line']],
    ['d.test.js', 'running', []],
  ]);
  assert.equal(list.files[0].tests[0].at, 10);
  assert.equal(list.files[0].tests[3].at, 20);
  assert.deepEqual(list.counts, { pass: 6, fail: 4, skip: 1, running: 1 }, 'a file failed on its own is one red; a test cut short is no count');
});

test('lines that do not fit the format are skipped, and a name too long is cut', () => {
  const list = readTestLines([
    'not json', '[]', 'null', '42', L({ name: 'no file', state: 'pass' }), L({ file: '', name: 'empty file', state: 'pass' }),
    L({ file: 'a.js', name: 'unknown state', state: 'won' }), L({ file: 'a.js', state: 'pass' }), L({ file: 'a.js', name: 7, state: 'pass' }),
    L({ file: 'a.js', name: 'no state' }), L({ file: 'a.js', name: 'kept', state: 'pass', ms: -5 }), L({ file: 'a.js', name: 'x'.repeat(5000), state: 'fail', ms: 'slow' }),
    '{"file":"a.js","name":"half a line","sta',
  ].join('\n'));
  assert.deepEqual(list.files.map((f) => [f.file, f.state, f.tests.map((t) => [t.name.length, t.state, t.ms])]), [['a.js', 'running', [[4, 'pass', undefined], [500, 'fail', undefined]]]]);
  assert.deepEqual(list.counts, { pass: 1, fail: 1, skip: 0, running: 0 });
  assert.deepEqual(readTestLines(''), { files: [], counts: { pass: 0, fail: 0, skip: 0, running: 0 } });
});

test('a run\'s report: its size on the board (-1 when the project does not report), its list with the output; a line still being written waits', () => {
  const s = setup();
  let got = readRuns(s.project, { ids: [ID.worker, ID.reviewer] });
  assert.ok(got.get(ID.worker)[0].testsSize > 0);
  assert.equal(got.get(ID.reviewer)[0].testsSize, -1);
  assert.ok(!('tests' in got.get(ID.worker)[0]), 'no list on the board');
  got = readRuns(s.project, { ids: [ID.worker, ID.reviewer], withLines: true });
  assert.equal(got.get(ID.reviewer)[0].tests, null);
  const w = got.get(ID.worker)[0].tests;
  assert.deepEqual(w.files.map((f) => [f.file, f.state, f.tests.map((t) => t.state)]), [['tests/cart.test.mjs', 'ended', ['pass', 'fail']], ['tests/pay.test.mjs', 'running', ['running']]]);
  assert.deepEqual(w.counts, { pass: 1, fail: 1, skip: 0, running: 1 });
  fs.appendFileSync(s.runs.worker.tests, '{"file":"tests/pay.test.mjs","name":"a card is charged once","state":"pa');
  assert.deepEqual(readRuns(s.project, { ids: [ID.worker], withLines: true }).get(ID.worker)[0].tests.counts, w.counts);
  fs.appendFileSync(s.runs.worker.tests, 'ss","ms":70000}\n');
  assert.deepEqual(readRuns(s.project, { ids: [ID.worker], withLines: true }).get(ID.worker)[0].tests.counts, { pass: 2, fail: 1, skip: 0, running: 0 });
  // An empty report: the project reports, no test has started yet.
  fs.writeFileSync(s.runs.reviewer.tests, '');
  assert.deepEqual(readRuns(s.project, { ids: [ID.reviewer], withLines: true }).get(ID.reviewer)[0].tests.files, []);
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

test('api/progress and the ticket carry each run\'s tests, or null for a project that does not report; the board only their size', async () => {
  const s = setup();
  const v = await startViewer(s.root);
  try {
    const p = await (await v.get(`/alpha/api/progress/${ID.worker}`)).json();
    assert.deepEqual(p.runs[0].tests.counts, { pass: 1, fail: 1, skip: 0, running: 1 });
    assert.equal(p.runs[0].tests.files[1].tests[0].name, 'a card is charged once');
    const [t] = await (await v.get(`/alpha/api/ticket/${ID.worker}`)).json();
    assert.deepEqual(t.runs[0].tests, p.runs[0].tests);
    assert.equal((await (await v.get(`/alpha/api/progress/${ID.reviewer}`)).json()).runs[0].tests, null);
    const b = byId(await (await v.get('/alpha/api/board')).json());
    assert.ok(b[ID.worker].runs[0].testsSize > 0);
    assert.equal(b[ID.reviewer].runs[0].testsSize, -1);
    assert.ok(!('tests' in b[ID.worker].runs[0]));
  } finally { await v.close(); }
});

test('live: the page hears when a test is reported, though the run printed nothing new', async () => {
  const s = setup();
  const v = await startViewer(s.root);
  try {
    const before = fs.statSync(s.runs.worker.tests).size;
    const sizeOf = (text) => text.split('event: progress\ndata: ').slice(1).map((b) => JSON.parse(b.split('\n')[0])).at(-1)?.[ID.worker]?.[0]?.testsSize;
    let waiting = listenEvents(`${v.base}/alpha/events`, (x) => sizeOf(x) > before, 6000);
    await new Promise((r) => setTimeout(r, 300));
    fs.appendFileSync(s.runs.worker.tests, JSON.stringify({ file: 'tests/pay.test.mjs', name: 'a card is charged once', state: 'pass', ms: 3 }) + '\n');
    assert.ok((await waiting).ok);
    // A run whose project starts reporting partway.
    waiting = listenEvents(`${v.base}/alpha/events`, (x) => x.split('event: progress\ndata: ').slice(1).map((b) => JSON.parse(b.split('\n')[0])).at(-1)?.[ID.reviewer]?.[0]?.testsSize === 0, 6000);
    await new Promise((r) => setTimeout(r, 300));
    fs.writeFileSync(s.runs.reviewer.tests, '');
    assert.ok((await waiting).ok);
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

test('the tests, as the page draws them: grouped by file, each with its mark, name as written and time; the tally of green and red', () => {
  const now = Date.now();
  const run = readRuns(setup().project, { ids: [ID.worker], withLines: true }).get(ID.worker)[0];
  const html = runTests(run, now);
  assert.match(html, /<span class="pass">1 passed<\/span><span class="fail">1 failed<\/span><span class="running">1 running<\/span>/);
  assert.doesNotMatch(html, /skipped/, 'no skipped count when none was');
  const files = [...html.matchAll(/<li class="test-file (\w+)"><p class="file-head"><code>([^<]+)<\/code>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(files, [['ended', 'tests/cart.test.mjs'], ['running', 'tests/pay.test.mjs']]);
  const tests = [...html.matchAll(/<li class="test (\w+)"[^>]*>.*?<span class="test-name">(.*?)<\/span>(?:<span class="test-time"( data-test-since="\d+")?>([^<]+)<\/span>)?<\/li>/g)].map((m) => [m[1], m[2], m[4], !!m[3]]);
  assert.deepEqual(tests, [
    ['pass', 'an empty cart costs nothing', '12 ms', false],
    ['fail', '&lt;img src=x onerror=alert(1)&gt; is shown as text', '1.5 s', false],
    ['running', 'a card is charged once', '1 min', true],
  ]);
  assert.doesNotMatch(html, /<img/);
  // Each state has its own look; a file that failed on its own says so.
  const all = runTests({ run: 'r', tests: readTestLines([
    L({ file: 'f.js', name: 'a', state: 'skip' }), L({ file: 'f.js', name: 'b', state: 'start' }), L({ file: 'f.js', state: 'fail' }),
    L({ file: '<b>bold</b>.js', name: 'c', state: 'pass' }),
  ].join('')) }, now);
  assert.match(all, /<code>&lt;b&gt;bold&lt;\/b&gt;\.js<\/code>/);
  assert.doesNotMatch(all, /<b>/);
  assert.match(all, /class="test skip" title="skipped"/);
  assert.match(all, /class="test unfinished" title="did not finish"/);
  assert.match(all, /<li class="test-file failed">.*<span class="file-state">failed on its own<\/span>/);
  assert.match(all, /<span class="pass">1 passed<\/span><span class="fail">1 failed<\/span><span class="skip">1 skipped<\/span>/);
  assert.match(runTests({ run: 'r', tests: readTestLines('') }, now), /No test has started yet/);
  assert.deepEqual([testTime(0), testTime(999), testTime(1000), testTime(9949), testTime(12000), testTime(61000)], ['0 ms', '999 ms', '1.0 s', '9.9 s', '12 s', '1 min']);
});

test('a project that does not report per test: the Progress says so, and shows its output as before', () => {
  const now = Date.now();
  const html = runSection([{ run: 'a', who: 'reviewer', command: 'make check', startedAt: now - MIN, lastAt: now, size: 3, testsSize: -1, lines: ['all fine'], cut: false, tests: null }], now);
  assert.match(html, /This project does not report per test yet/);
  assert.match(html, /<pre class="run-output"[^>]*>all fine<\/pre>/);
  assert.doesNotMatch(html, /class="run-tests"/);
});

test('the Progress is drawn again when a test is reported, though the output did not grow', () => {
  const run = { run: 'a', size: 10, testsSize: 40 };
  assert.notEqual(runsMark([run]), runsMark([{ ...run, testsSize: 80 }]));
  assert.notEqual(runsMark([{ ...run, testsSize: -1 }]), runsMark([{ ...run, testsSize: 0 }]), 'a report that appears');
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

for (const [name, w, h] of [['window 1280×800', 1280, 800], ['phone 390×844', 390, 844]]) {
  browserTest(`${name}: the Progress lists the run's tests one by one, which grow and count on by themselves`, async (s, v, page) => {
    await page.size(w, h);
    await page.goto(`${v.base}/alpha/ticket/${ID.worker}`);
    await page.until(`() => !!document.querySelector('#drawer-body .run-tests')`);
    await page.eval(`() => { window.__kept = 1; }`);
    const read = () => {
      const box = document.querySelector('#drawer-body .run-tests');
      return {
        counts: box.querySelector('.test-counts').textContent,
        files: [...box.querySelectorAll('.test-file')].map((f) => [f.querySelector('code').textContent, [...f.querySelectorAll('.test')].map((t) => [t.className.replace('test ', ''), t.querySelector('.test-name').textContent, t.querySelector('.test-time')?.textContent || ''])]),
        colours: [...box.querySelectorAll('.test .mark')].map((m) => getComputedStyle(m).backgroundColor),
        output: document.querySelector('#drawer-body .run-output').textContent.length > 0,
        images: document.querySelectorAll('#drawer img').length,
        wide: document.documentElement.scrollWidth > innerWidth,
      };
    };
    let got = await page.eval(read);
    assert.equal(got.counts.replace(/\s+/g, ' '), '1 passed1 failed1 running');
    assert.deepEqual(got.files.map((f) => [f[0], f[1].map((t) => t.slice(0, 2))]), [
      ['tests/cart.test.mjs', [['pass', 'an empty cart costs nothing'], ['fail', '<img src=x onerror=alert(1)> is shown as text']]],
      ['tests/pay.test.mjs', [['running', 'a card is charged once']]],
    ]);
    assert.deepEqual(got.files[0][1].map((t) => t[2]), ['12 ms', '1.5 s']);
    assert.match(got.files[1][1][0][2], /^1 min$/);
    const css = (v) => page.eval(`() => { const el = document.createElement('i'); el.style.color = 'var(${v})'; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c; }`);
    assert.deepEqual(got.colours.slice(0, 2), [await css('--agent-working'), await css('--agent-stopped')], 'green, then red');
    assert.equal(got.output, true, 'the output is still there below');
    assert.equal(got.images, 0, 'a name is text, never markup');
    assert.equal(got.wide, false);

    // A test that has run under a minute counts on, every second, with no event.
    fs.appendFileSync(s.runs.worker.tests, JSON.stringify({ file: 'tests/pay.test.mjs', name: 'a card is charged once', state: 'pass', ms: 65000 }) + '\n' +
      JSON.stringify({ file: 'tests/pay.test.mjs', name: 'a refund', state: 'start', at: Date.now() - 3000 }) + '\n');
    await page.until(`() => [...document.querySelectorAll('#drawer-body .test.running .test-name')].map((t) => t.textContent).join() === 'a refund'`, 8000);
    got = await page.eval(read);
    assert.equal(got.counts.replace(/\s+/g, ' '), '2 passed1 failed1 running');
    assert.deepEqual(got.files[1][1].map((t) => t.slice(0, 2)), [['pass', 'a card is charged once'], ['running', 'a refund']]);
    const first = got.files[1][1][1][2];
    assert.match(first, /^\d\.\d s$/);
    await page.until(`() => document.querySelector('#drawer-body .test.running .test-time').textContent !== ${JSON.stringify(first)}`, 4000);
    fs.appendFileSync(s.runs.worker.tests, JSON.stringify({ file: 'tests/pay.test.mjs', name: 'a refund', state: 'fail', ms: 4100 }) + '\n');
    await page.until(`() => document.querySelector('#drawer-body .test-counts').textContent.includes('2 failed')`, 8000);
    assert.equal(await page.eval('() => window.__kept'), 1, 'the page was not reloaded');
  });
}

browserTest('a project that does not report per test: its Progress says so, and its live output goes on', async (s, v, page) => {
  await page.size(1280, 800);
  await page.goto(`${v.base}/alpha/ticket/${ID.reviewer}`);
  await page.until(`() => !!document.querySelector('#drawer-body .run-tests-none')`);
  assert.match(await page.eval(`() => document.querySelector('#drawer-body .run-tests-none').textContent`), /^This project does not report per test yet/);
  fs.appendFileSync(s.runs.reviewer.log, 'still going\n');
  await page.until(`() => document.querySelector('#drawer-body .run-output').textContent.endsWith('still going')`, 8000);
  // It starts reporting: the list takes the line's place.
  fs.writeFileSync(s.runs.reviewer.tests, JSON.stringify({ file: 'x.test.js', name: 'now reported', state: 'pass', ms: 2 }) + '\n');
  await page.until(`() => document.querySelector('#drawer-body .run-tests .test-name')?.textContent === 'now reported' && !document.querySelector('#drawer-body .run-tests-none')`, 8000);
});
