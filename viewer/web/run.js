// The test runs going on for a ticket, as the card and the drawer show them:
// a button on the card while a run goes, and the Progress section in the
// drawer with each run's latest output.
//
// The server sends each run's start, when it last printed, whose run it is,
// its command and, for the open ticket, its last lines and its tests, one by
// one, when the project reports them (see viewer/runs.mjs).
// How long ago that was is judged here, against the page's own clock, so a run
// that stops printing turns from "working" to "quiet" to "no output" while
// nothing at all arrives.
//
// Pure: no DOM, so the tests run it in Node.

import { esc } from './markdown.js';
import { span } from './agent.js';

// A run counts as working while it printed under RUN_QUIET ago, as quiet after
// that, and as stalled once it has printed nothing for RUN_STALLED.
export const RUN_QUIET = 60 * 1000;
export const RUN_STALLED = 5 * 60 * 1000;

// tone: 'working' (green), 'quiet' (yellow), 'stopped' (red).
export function runState(run, now) {
  const idle = now - run.lastAt;
  if (idle < RUN_QUIET) return { tone: 'working', word: '', why: 'This run printed something just now' };
  if (idle < RUN_STALLED) return { tone: 'quiet', word: 'quiet', why: 'This run has printed nothing for a minute or more' };
  return { tone: 'stopped', word: 'no output', why: `This run has printed nothing for more than ${RUN_STALLED / 60000} minutes; it may be stuck` };
}

export const runName = (run) => (run.who === 'reviewer' ? "reviewer's test run" : "worker's test run");

// "running 3 min", "last output 12 s ago": both always shown together, so a
// run that works and a run that hangs read differently at a glance.
const running = (run, now) => `running ${span(now - run.startedAt)}`;
const sinceOutput = (run, now) => (now - run.lastAt < 1000 ? 'just now' : `${span(now - run.lastAt)} ago`);
const lastOutput = (run, now) => `last output ${sinceOutput(run, now)}`;

// The run a card speaks for when several go at once: the one that printed last.
const latest = (runs) => runs.reduce((a, b) => (b.lastAt > a.lastAt ? b : a));

// The card's button: one per ticket, however many runs it has. Whose run it
// is goes in its tooltip; the card has room only for the times.
export function runButton(id, runs, now) {
  if (!runs?.length) return '';
  const run = latest(runs);
  const st = runState(run, now);
  const whose = runs.length > 1 ? `${runs.length} test runs, the latest output from the ${runName(run)}` : `The ${runName(run)}`;
  return `<button type="button" class="run-open ${st.tone}" data-run-open="${esc(id)}" title="${esc(`${whose}. ${st.why}. Opens its progress`)}">` +
    `<span class="signal" aria-hidden="true"></span>` +
    `<span class="what">Progress</span>` +
    (runs.length > 1 ? `<span class="count">${runs.length} runs</span>` : '') +
    (st.word ? `<span class="state">${esc(st.word)}</span>` : '') +
    `<span class="time" title="${running(run, now)}">${running(run, now)}</span>` +
    `<span class="ago" title="${lastOutput(run, now)}">output ${sinceOutput(run, now)}</span></button>`;
}

// The line above a run's output, refilled every second on its own.
export function runHead(run, now) {
  const st = runState(run, now);
  return `<span class="run-state ${st.tone}" title="${esc(st.why)}">` +
    `<span class="signal" aria-hidden="true"></span>` +
    `<b class="who">${esc(runName(run))}</b>` +
    (st.word ? `<span class="state">${esc(st.word)}</span>` : '') +
    `<span class="time">${running(run, now)}</span>` +
    `<span class="ago">${lastOutput(run, now)}</span></span>`;
}

// The output as the run printed it, its last lines; a first line says when
// earlier ones are left out.
export function runOutput(run) {
  const lines = run.lines || [];
  const cut = run.cut ? `<span class="cut">… earlier output not shown</span>\n` : '';
  const text = lines.length ? esc(lines.join('\n')) : '<span class="muted">No output yet.</span>';
  return `<pre class="run-output" data-run-output="${esc(run.run)}">${cut}${text}</pre>`;
}

// How long a test took: "8 ms", "1.4 s", then as `span` says it.
export const testTime = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : ms < 10000 ? `${(ms / 1000).toFixed(1)} s` : span(ms));

const TEST_WORD = { running: 'running', pass: 'passed', fail: 'failed', skip: 'skipped', unfinished: 'did not finish' };
const FILE_WORD = { running: 'running', ended: 'done', failed: 'failed on its own' };

// One test: its state as a mark, its name as its author wrote it, and how long
// it took, or has run so far; the page counts the latter on every second
// (data-test-since).
function testItem(t, now) {
  const time = t.state === 'running'
    ? (Number.isFinite(t.at) ? `<span class="test-time" data-test-since="${t.at}">${testTime(Math.max(0, now - t.at))}</span>` : '')
    : (Number.isFinite(t.ms) ? `<span class="test-time">${testTime(t.ms)}</span>` : '');
  return `<li class="test ${t.state}" title="${esc(TEST_WORD[t.state] || t.state)}">` +
    `<span class="mark" aria-label="${esc(TEST_WORD[t.state] || t.state)}"></span>` +
    `<span class="test-name">${esc(t.name)}</span>${time}</li>`;
}

// The tally so far: green and red always, the others when there are any.
export function testCounts(counts) {
  const c = counts || {};
  return `<p class="test-counts">` +
    `<span class="pass">${c.pass || 0} passed</span>` +
    `<span class="fail">${c.fail || 0} failed</span>` +
    (c.running ? `<span class="running">${c.running} running</span>` : '') +
    (c.skip ? `<span class="skip">${c.skip} skipped</span>` : '') +
    `</p>`;
}

// One test file: its name, its state unless it is done, and its tests. A
// runner such as node --test reports each file's tests in file order, so a
// file that ended while an earlier one still runs has none listed yet: it says
// they are to follow rather than look done and empty, and is drawn like any
// done file once they arrive.
function testFile(f, now) {
  const toFollow = f.state === 'ended' && !f.tests.length;
  const word = toFollow ? 'tests to follow' : f.state === 'ended' ? '' : FILE_WORD[f.state] || f.state;
  return `<li class="test-file ${f.state}${toFollow ? ' to-follow' : ''}"><p class="file-head"><code>${esc(f.file)}</code>` +
    (word ? `<span class="file-state">${esc(word)}</span>` : '') + `</p>` +
    (f.tests.length ? `<ul>${f.tests.map((t) => testItem(t, now)).join('')}</ul>` : '') + `</li>`;
}

// The run's tests, one by one, under the file each is in; or, for a project
// that does not report per test, a line saying so, its output shown below as
// for any run.
export function runTests(run, now) {
  if (!run.tests) {
    return `<p class="run-tests-none" data-run-tests="${esc(run.run)}" title="How a project reports per test: test_command in the kerjaan skill's SETTINGS.md">` +
      `This project does not report per test yet; its live output is below.</p>`;
  }
  const { files, counts } = run.tests;
  const list = files.length ? files.map((f) => testFile(f, now)).join('') : '<li class="muted">No test has started yet.</li>';
  return `<div class="run-tests" data-run-tests="${esc(run.run)}">${testCounts(counts)}` +
    `<ul class="test-files">${list}</ul></div>`;
}

// One run: its head, its command, its tests, its output.
export function runPart(run, now) {
  return `<div class="run" data-run="${esc(run.run)}">` +
    `<p class="run-head" data-run-head="${esc(run.run)}">${runHead(run, now)}</p>` +
    (run.command ? `<p class="run-command"><code>${esc(run.command)}</code></p>` : '') +
    runTests(run, now) +
    runOutput(run) +
    `</div>`;
}

// The Progress section of the drawer, or nothing when no run goes.
export function runSection(runs, now) {
  if (!runs?.length) return '';
  return `<section class="runs" id="progress" tabindex="-1" aria-label="Progress">` +
    `<h3>Progress</h3>${runs.map((r) => runPart(r, now)).join('')}</section>`;
}

// What, of the runs, changes the section's content rather than only its
// times: which runs there are, how much each has printed, and how far its
// tests have got.
export const runsMark = (runs) => (runs || []).map((r) => `${r.run}|${r.size}|${r.testsSize ?? -1}`).join(',');
