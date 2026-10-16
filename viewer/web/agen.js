// What the agent on a ticket is doing, as the card and the drawer show it.
//
// The server sends only times, the agent's kind, whether its log says it has
// ended, and short step labels (see viewer/agen.mjs). How fresh that is gets
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

// tone: 'jalan' (green), 'diam' (yellow), 'berhenti' (red), 'selesai' (grey).
export function agentState(a, status, now) {
  if (a.ended === 'dihentikan') return { tone: 'berhenti', word: 'dihentikan', why: 'Agen ini dihentikan sebelum selesai' };
  if (a.ended === 'selesai') {
    return status === 'in_progress'
      ? { tone: 'berhenti', word: 'berhenti', why: 'Agen ini sudah berhenti, tetapi tiketnya masih di in progress' }
      : { tone: 'selesai', word: 'selesai', why: 'Agen ini sudah selesai' };
  }
  const idle = now - a.lastAt;
  if (idle < QUIET) return { tone: 'jalan', word: '', why: 'Agen ini baru saja melangkah' };
  if (idle < GONE) return { tone: 'diam', word: 'diam', why: 'Agen ini tidak melangkah selama beberapa menit' };
  return { tone: 'berhenti', word: 'tidak ada kabar', why: `Agen ini tidak melangkah selama lebih dari ${GONE / 60000} menit; kemungkinan sudah berhenti` };
}

export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} j ${m % 60} mnt`;
  return `${Math.floor(h / 24)} hari`;
}

export const ago = (at, now) => (now - at < 1000 ? 'baru saja' : `${span(now - at)} lalu`);

const two = (n) => String(n).padStart(2, '0');
export function clock(at, now) {
  const d = new Date(at);
  const t = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
  return new Date(now).toDateString() === d.toDateString() ? t : `${two(d.getDate())}/${two(d.getMonth() + 1)} ${t}`;
}

const stepText = (step) => (step ? step.label || step.tool : 'belum melangkah');

// One line: dot, kind, state when not simply working, last step, how long ago.
export function agentLine(a, status, now) {
  const st = agentState(a, status, now);
  const at = a.step?.at ?? a.lastAt;
  return `<span class="agen ${st.tone}" title="${esc(st.why)}">` +
    `<span class="titik" aria-hidden="true"></span>` +
    `<span class="jenis">${esc(a.kind)}</span>` +
    (st.word ? `<span class="keadaan">${esc(st.word)}</span>` : '') +
    `<span class="langkah" title="${esc(stepText(a.step))}">${esc(stepText(a.step))}</span>` +
    `<span class="lalu">${ago(at, now)}</span></span>`;
}

// How long the agent has been at it: until now while it works, until its
// last step once it has ended.
export function runTime(a, status, now) {
  if (a.startedAt == null) return '';
  const working = !a.ended;
  return working ? `berjalan ${span(now - a.startedAt)}` : `bekerja ${span(a.lastAt - a.startedAt)}`;
}

// The step list in the drawer, newest first, folded or open.
export function agentSteps(a, status, now, { open = false } = {}) {
  const steps = [...(a.steps || [])].reverse();
  const start = a.startedAt == null ? '' : ` · mulai ${clock(a.startedAt, now)}`;
  const rows = steps.map((s) =>
    `<li><time>${clock(s.at, now)}</time><span class="alat">${esc(s.tool)}</span><span class="ket">${esc(s.label) || '<span class="muted">—</span>'}</span></li>`).join('');
  return `<details class="agen-langkah"${open ? ' open' : ''}>` +
    `<summary>${steps.length} langkah terakhir ${esc(a.kind)}<span class="muted">${start} · ${runTime(a, status, now)}</span></summary>` +
    `<ol>${rows || '<li class="muted">Belum ada langkah.</li>'}</ol></details>`;
}
