// What the agent on a ticket is doing, as the card and the drawer show it.
//
// The server sends only times, the agent's kind, whether its log says it has
// ended, and short step labels (see viewer/agents.mjs). How fresh that is gets
// judged here, against the page's own clock, so a card turns from "working" to
// "quiet" while nothing at all is written.
//
// Pure: no DOM, so the tests run it in Node.

import { esc } from './markdown.js';

// An agent counts as working while its last sign of life is under QUIET old,
// as quiet after that, and as gone once it has said nothing for GONE.
export const QUIET = 2 * 60 * 1000;
export const GONE = 20 * 60 * 1000;

// Statuses whose tickets show their agent.
export const AGENT_STATUSES = ['in_progress', 'review'];

// tone: 'working' (green), 'quiet' (yellow), 'stopped' (red), 'done' (grey).
export function agentState(a, status, now) {
  if (a.ended === 'interrupted') return { tone: 'stopped', word: 'interrupted', why: 'This agent was interrupted before it finished' };
  if (a.ended === 'finished') {
    return status === 'in_progress'
      ? { tone: 'stopped', word: 'stopped', why: 'This agent has stopped, but its ticket is still in progress' }
      : { tone: 'done', word: 'done', why: 'This agent has finished' };
  }
  const idle = now - a.lastAt;
  if (idle < QUIET) return { tone: 'working', word: '', why: 'This agent took a step just now' };
  if (idle < GONE) return { tone: 'quiet', word: 'quiet', why: 'This agent has not taken a step for a few minutes' };
  return { tone: 'stopped', word: 'silent', why: `This agent has not taken a step for more than ${GONE / 60000} minutes; it has probably stopped` };
}

export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} days`;
}

export const ago = (at, now) => (now - at < 1000 ? 'just now' : `${span(now - at)} ago`);

const two = (n) => String(n).padStart(2, '0');
export function clock(at, now) {
  const d = new Date(at);
  const t = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
  return new Date(now).toDateString() === d.toDateString() ? t : `${two(d.getDate())}/${two(d.getMonth() + 1)} ${t}`;
}

const stepText = (step) => (step ? step.label || step.tool : 'no step yet');

// What the agent is doing now, for an agent still at it (working or quiet):
// running a tool, or thinking and writing between two steps. The server says
// which (`phase`) and since when (`phaseAt`). An agent that has ended or gone
// silent has no phase here: it shows its last step and how long ago.
export function agentPhase(a, status, now) {
  const st = agentState(a, status, now);
  if (a.ended || st.tone === 'stopped' || a.phaseAt == null) return null;
  if (a.phase === 'tool' && a.step) return { phase: 'tool', text: stepText(a.step), title: stepText(a.step), how: `running ${span(now - a.phaseAt)}` };
  if (a.phase === 'thinking') {
    const after = a.step ? `Thinking or writing since its last step ended: ${stepText(a.step)}` : 'Thinking or writing; no step yet';
    return { phase: 'thinking', text: 'thinking or writing', title: after, how: `for ${span(now - a.phaseAt)}` };
  }
  return null;
}

// One line: dot, kind, state when not simply working, then what it is doing
// and for how long; or, once it has stopped, its last step and how long ago.
export function agentLine(a, status, now) {
  const st = agentState(a, status, now);
  const ph = agentPhase(a, status, now);
  const at = a.step?.at ?? a.lastAt;
  const step = ph
    ? `<span class="step ${ph.phase}" title="${esc(ph.title)}">${esc(ph.text)}</span><span class="ago">${esc(ph.how)}</span>`
    : `<span class="step" title="${esc(stepText(a.step))}">${esc(stepText(a.step))}</span><span class="ago">${ago(at, now)}</span>`;
  return `<span class="agent ${st.tone}" title="${esc(st.why)}">` +
    `<span class="signal" aria-hidden="true"></span>` +
    `<span class="kind">${esc(a.kind)}</span>` +
    (st.word ? `<span class="state">${esc(st.word)}</span>` : '') +
    step + `</span>`;
}

// How long the agent has been at it: until now while it works, until its
// last step once it has ended.
export function runTime(a, status, now) {
  if (a.startedAt == null) return '';
  const working = !a.ended;
  return working ? `running ${span(now - a.startedAt)}` : `worked ${span(a.lastAt - a.startedAt)}`;
}

// The step list in the drawer, newest first, folded or open.
export function agentSteps(a, status, now, { open = false } = {}) {
  const steps = [...(a.steps || [])].reverse();
  const start = a.startedAt == null ? '' : ` · started ${clock(a.startedAt, now)}`;
  const rows = steps.map((s) =>
    `<li><time>${clock(s.at, now)}</time><span class="tool">${esc(s.tool)}</span><span class="step-label">${esc(s.label) || '<span class="muted">—</span>'}</span></li>`).join('');
  return `<details class="agent-steps"${open ? ' open' : ''}>` +
    `<summary>${esc(a.kind)}: last ${steps.length} steps<span class="muted">${start} · ${runTime(a, status, now)}</span></summary>` +
    `<ol>${rows || '<li class="muted">No steps yet.</li>'}</ol></details>`;
}
