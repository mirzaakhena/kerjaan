// The test runs going on for a ticket, as the card and the drawer show them:
// a button on the card while a run goes, and the Progress section in the
// drawer with each run's latest output.
//
// The server sends each run's start, when it last printed, whose run it is,
// its command and, for the open ticket, its last lines (see viewer/runs.mjs).
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

// One run: its head, its command, its output. Room is left after the output
// for what a later part may add per run.
export function runPart(run, now) {
  return `<div class="run" data-run="${esc(run.run)}">` +
    `<p class="run-head" data-run-head="${esc(run.run)}">${runHead(run, now)}</p>` +
    (run.command ? `<p class="run-command"><code>${esc(run.command)}</code></p>` : '') +
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
// times: which runs there are and how much each has printed.
export const runsMark = (runs) => (runs || []).map((r) => `${r.run}|${r.size}`).join(',');
