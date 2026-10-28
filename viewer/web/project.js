import { STATUSES, statusName, statusColor, getJson, liveIndicator } from './common.js';
import { render, esc } from './markdown.js';
import { readFilter, writeFilter, matches, columnOrder, choices, FILTER_KEYS, readHidden } from './filter.js';
import { pills } from './pills.js';
import { drawerHead, drawerFacts, drawerAgent, drawerRuns, agentHeadHtml, agentBodyHtml, runBodyHtml } from './drawer.js';
import { agentLine, AGENT_STATUSES } from './agent.js';
import { runButton, runHead, runsMark } from './run.js';
import { ARCHIVED_KEY, loadArchived } from './archive.js';
import { switchList } from './switcher.js';

// The page lives at /<project>/, /<project>/ticket/<id> and /<project>/order
// (order.md); everything it asks the server for is under /<project>/.
const project = decodeURIComponent(location.pathname.split('/')[1]);
const base = `/${encodeURIComponent(project)}/`;
const $ = (id) => document.getElementById(id);

// Long columns show this many cards until asked for the rest.
const PAGE = 60;

// What the drawer holds when it shows order.md rather than a ticket.
const ORDER = 'order';

// Hidden columns are remembered per browser. Storage can be missing or refuse
// (a private window); the page then simply starts from the default each time.
const HIDDEN_KEY = 'kerjaan.hidden-columns';
function loadHidden() {
  try {
    return readHidden(localStorage.getItem(HIDDEN_KEY));
  } catch {
    return readHidden(null);
  }
}
function saveHidden() {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...state.hidden]));
  } catch {
    // remembered for this page only
  }
}

const state = {
  board: null,
  byId: new Map(),
  filter: readFilter(location.search),
  picked: 'todo',
  expanded: new Set(),
  hidden: loadHidden(),
  openId: null,
  // The open ticket's agent, with its steps, and whether the step list is open.
  openAgent: null,
  stepsOpen: false,
  // The open ticket's test runs, with their output, and whether its Progress
  // section is to be brought into view once the drawer is drawn.
  openRuns: [],
  showRuns: false,
};

document.title = `${project} — kerjaan`;
$('name').textContent = project;

const idFromPath = () =>
  location.pathname.match(/\/ticket\/(\d{12})$/)?.[1] || (location.pathname.endsWith(`/${ORDER}`) ? ORDER : null);
const ticketHref = (id) => `${base}ticket/${id}${writeFilter(state.filter)}`;
const lookup = (id) => state.byId.get(id) || null;

// ---------- loading ----------

async function load() {
  try {
    state.board = await getJson(`${base}api/board`);
  } catch {
    $('board').innerHTML = '<div class="empty">This project\'s board cannot be read. Is the server still running?</div>';
    return;
  }
  state.byId = new Map();
  for (const t of state.board.tickets) if (!state.byId.has(t.id)) state.byId.set(t.id, t);
  drawFilters();
  drawBoard();
}

// ---------- filters ----------

function drawFilters() {
  const form = $('filters');
  const c = choices(state.board.tickets);
  const fill = (name, all, list) => {
    const sel = form.elements[name];
    const current = state.filter[name];
    const opts = list.map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`);
    if (current && !list.some(([v]) => v === current)) opts.push(`<option value="${esc(current)}">${esc(current)} (0)</option>`);
    sel.innerHTML = `<option value="">${all}</option>${opts.join('')}`;
    sel.value = current;
  };
  fill('type', 'All types', c.type);
  fill('priority', 'All priorities', c.priority);
  fill('label', 'All labels', c.label);
  if (document.activeElement !== form.elements.q) form.elements.q.value = state.filter.q;
}

$('filters').addEventListener('input', (e) => {
  if (!FILTER_KEYS.includes(e.target.name)) return;
  state.filter[e.target.name] = e.target.value;
  state.expanded.clear();
  history.replaceState(null, '', location.pathname + writeFilter(state.filter));
  drawBoard();
});
$('clear').addEventListener('click', () => {
  state.filter = readFilter('');
  history.replaceState(null, '', location.pathname);
  drawFilters();
  drawBoard();
});

// ---------- board ----------

// A ticket in done whose branch still holds work outside main: its code is not
// on main yet, whatever the column says. The server sends `unmerged` for done
// tickets only.
function unmergedLine(t) {
  if (!t.unmerged?.length) return '';
  const names = t.unmerged.map((b) => `<span class="branch">${esc(b)}</span>`).join(', ');
  const tip = `This ticket's code is not on the main line yet: branch ${t.unmerged.join(', ')} holds changes not merged`;
  return `<div class="unmerged" title="${esc(tip)}"><span class="label">not merged</span> ${names}</div>`;
}

// A card's place in order.md: its group's number, shared by the tickets that
// may run side by side, and a sign while that group waits for the owner's yes.
function placeBadge(place) {
  if (!place) return '';
  const number = `<span class="rank" title="Group ${place.n} in order.md: tickets with the same number may run side by side">#${place.n}</span>`;
  const wait = place.waitsForOwner
    ? '<span class="owner-wait" title="This group starts only once the owner says yes">waits for the owner\'s go-ahead</span>'
    : '';
  return number + wait;
}

function card(t, place) {
  const labels = t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join('');
  const agent = AGENT_STATUSES.includes(t.status)
    ? `<div class="agent-slot" data-agent-for="${t.id}">${t.agent ? agentLine(t.agent, t.status, Date.now()) : ''}</div>`
    : '';
  // The button to a test run's progress sits beside the card, not inside it:
  // a button cannot hold another.
  const run = AGENT_STATUSES.includes(t.status)
    ? `<div class="run-slot" data-run-for="${t.id}">${runButton(t.id, t.runs, Date.now())}</div>`
    : '';
  return `<li${run ? ' class="with-run"' : ''}><button class="card" data-id="${t.id}" aria-current="${t.id === state.openId}">
    <div class="title">${esc(t.title)}</div>${agent}${unmergedLine(t)}
    <div class="meta">
      ${placeBadge(place)}
      <span class="id">${t.id}</span>
      ${t.broken ? '<span class="broken" title="This file has no frontmatter">broken</span>' : ''}
      ${t.type ? `<span class="tag type-${esc(t.type)}">${esc(t.type)}</span>` : ''}
      ${t.priority ? `<span class="prio ${esc(t.priority)}">${esc(t.priority)}</span>` : ''}
      ${labels}
      ${pills(t.doneWhen, { className: 'progress' })}
    </div></button>${run}</li>`;
}

const tickets = (n) => `${n} ${n === 1 ? 'ticket' : 'tickets'}`;

function drawBoard() {
  const { board, filter } = state;
  const shown = board.tickets.filter((t) => matches(t, filter));
  // Numbered by group over every ticket, not only those the filter shows
  // (orderPlaces in board.mjs): todo, in_progress and review cards alike.
  const places = board.places || {};
  const filtering = FILTER_KEYS.some((k) => filter[k]);

  $('shown').textContent = filtering ? `${shown.length} of ${tickets(board.tickets.length)}` : tickets(board.tickets.length);
  $('clear').hidden = !filtering;

  const visible = STATUSES.filter((s) => !state.hidden.has(s));
  $('cols').innerHTML = `<span class="lead">Columns</span>${STATUSES.map((s) => {
    const n = shown.filter((t) => t.status === s).length;
    const on = !state.hidden.has(s);
    return `<button type="button" data-col="${s}" style="--c:${statusColor(s)}" aria-pressed="${on}" title="${on ? 'Hide' : 'Show'} the ${statusName(s)} column">${statusName(s)} <b>${n}</b></button>`;
  }).join('')}`;
  $('board').style.setProperty('--cols', Math.max(visible.length, 1));
  $('board').classList.toggle('all-hidden', visible.length === 0);

  $('status-pick').innerHTML = STATUSES.map((s) => {
    const n = shown.filter((t) => t.status === s).length;
    return `<button type="button" data-status="${s}" style="--c:${statusColor(s)}" aria-pressed="${s === state.picked}">${statusName(s)} ${n}</button>`;
  }).join('');

  $('board').innerHTML = STATUSES.map((s) => {
    const all = columnOrder(shown.filter((t) => t.status === s), s, board.order);
    const limit = state.expanded.has(s) ? all.length : PAGE;
    const cards = all.slice(0, limit).map((t) => card(t, places[t.id])).join('');
    const note = s === 'todo' && board.hasOrder
      ? `<a class="note" href="${base}${ORDER}${writeFilter(filter)}" data-order title="Open order.md: the order and the reasons for it">by order.md</a>`
      : '';
    const more = all.length > limit ? `<button class="more" data-more="${s}">Show ${all.length - limit} more</button>` : '';
    return `<section class="col${s === state.picked ? ' picked' : ''}${state.hidden.has(s) ? ' hidden-col' : ''}" style="--c:${statusColor(s)}" aria-label="${statusName(s)}">
      <header>${statusName(s)} <span class="n">${all.length}</span>${note}</header>
      <ul class="cards">${cards || '<li class="none">None</li>'}</ul>${more}</section>`;
  }).join('') + '<div class="empty none-visible">Every column is hidden. Pick a column above to show it.</div>';
}

$('cols').addEventListener('click', (e) => {
  const b = e.target.closest('[data-col]');
  if (!b) return;
  const s = b.dataset.col;
  if (state.hidden.has(s)) state.hidden.delete(s);
  else state.hidden.add(s);
  saveHidden();
  drawBoard();
});

$('board').addEventListener('click', (e) => {
  const order = e.target.closest('[data-order]');
  if (order && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault();
    open(ORDER);
    return;
  }
  const run = e.target.closest('[data-run-open]');
  if (run) {
    openProgress(run.dataset.runOpen);
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) {
    state.expanded.add(more.dataset.more);
    drawBoard();
    return;
  }
  const c = e.target.closest('.card');
  if (c) open(c.dataset.id);
});
$('status-pick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-status]');
  if (!b) return;
  state.picked = b.dataset.status;
  drawBoard();
});

// ---------- the ticket drawer ----------

function open(id, { push = true } = {}) {
  if (push) history.pushState(null, '', id === ORDER ? `${base}${ORDER}${writeFilter(state.filter)}` : ticketHref(id));
  state.openId = id;
  if (id === ORDER) showOrder();
  else showTicket(id);
  for (const c of document.querySelectorAll('.card')) c.setAttribute('aria-current', String(c.dataset.id === id));
}

function close({ push = true } = {}) {
  if (!state.openId) return;
  const id = state.openId;
  state.openId = null;
  if (push) history.pushState(null, '', base + writeFilter(state.filter));
  $('drawer').hidden = true;
  $('backdrop').hidden = true;
  for (const c of document.querySelectorAll('.card')) c.setAttribute('aria-current', 'false');
  const back = id === ORDER ? document.querySelector('[data-order]') : document.querySelector(`.card[data-id="${id}"]`);
  back?.focus({ preventScroll: false });
}

// order.md is prose written for people: the order of todo and the reasons
// for it. It is shown as written, with the tickets it names made clickable.
async function showOrder({ keepScroll = false } = {}) {
  const drawer = $('drawer');
  const body = $('drawer-body');
  const scroll = keepScroll ? body.scrollTop : 0;
  drawer.hidden = false;
  $('backdrop').hidden = false;
  if (!keepScroll) drawer.classList.remove('scrolled');
  $('drawer-head').innerHTML = `
    <div class="top">
      <span class="status-pill" style="--c:${statusColor('todo')}">todo</span>
      <span class="mono">.kerjaan/order.md</span>
      <button class="close" data-close aria-label="Close order.md">Close</button>
    </div>
    <h2>The order todo is taken in</h2>`;
  let text, shared;
  try {
    ({ text, shared = [] } = await getJson(`${base}api/order`));
  } catch (err) {
    if (state.openId !== ORDER) return;
    body.innerHTML = err.status === 404
      ? '<p class="notice">This board has no order.md.</p>'
      : '<p class="notice">order.md cannot be read right now.</p>';
    return;
  }
  if (state.openId !== ORDER) return;
  body.innerHTML = orderHtml(text, shared);
  body.scrollTop = scroll;
  foldTitle();
  if (!keepScroll) drawer.querySelector('[data-close]').focus({ preventScroll: true });
}

// order.md as written, with each group whose tickets share files by their
// estimates followed by those pairs and files. order.md itself never lists
// files (they would go stale); the server reads them from the tickets.
function orderHtml(text, shared) {
  const opts = { ticket: lookup, href: ticketHref };
  const lines = text.split('\n');
  let html = '';
  let at = 0;
  for (const g of [...shared].sort((x, y) => x.start - y.start)) {
    if (g.end <= at) continue;
    html += render(lines.slice(at, g.end).join('\n'), opts);
    at = g.end;
    const md = g.pairs.map((p) => `- ${p.a} and ${p.b}: ${p.files.map((f) => `\`${f}\``).join(', ')}`);
    if (g.unestimated.length) md.push('', `No file estimate yet: ${g.unestimated.join(', ')}.`);
    html += `<aside class="shared-files" aria-label="Files shared in this group">
      <p class="heading">Files shared in this group</p>
      ${render(md.join('\n'), opts)}
      <p class="source">From the file estimates in the tickets. Tickets that share files are merged into main one after another.</p>
    </aside>`;
  }
  return html + render(lines.slice(at).join('\n'), opts);
}

const drawerCtx = { lookup, href: ticketHref, statusName, statusColor };

// The title in the head is cut to two lines (one once the ticket is scrolled).
// When two lines are not enough, the whole title opens the scrolling part, so
// it can still be read in full.
function showFullTitle() {
  const drawer = $('drawer');
  const h2 = drawer.querySelector('#drawer-head h2');
  const full = drawer.querySelector('#drawer-body .full-title');
  if (!h2 || !full) return;
  const folded = drawer.classList.contains('scrolled');
  drawer.classList.remove('scrolled');
  full.hidden = h2.scrollHeight <= h2.clientHeight + 1;
  if (folded) drawer.classList.add('scrolled');
}

// Once the ticket is scrolled, the title folds to one line to give the text
// more room, and unfolds back at the top. It only folds when the text is long
// enough to stay scrolled after the head shrinks, so it cannot flicker.
function foldTitle() {
  const drawer = $('drawer');
  const body = $('drawer-body');
  if (body.scrollTop <= 4) drawer.classList.remove('scrolled');
  else if (body.scrollTop > 16 && body.scrollHeight - body.clientHeight > 64) drawer.classList.add('scrolled');
}
$('drawer-body').addEventListener('scroll', foldTitle, { passive: true });
window.addEventListener('resize', showFullTitle);

async function showTicket(id, { keepScroll = false } = {}) {
  const drawer = $('drawer');
  const body = $('drawer-body');
  const scroll = keepScroll ? body.scrollTop : 0;
  drawer.hidden = false;
  $('backdrop').hidden = false;

  let files;
  try {
    files = await getJson(`${base}api/ticket/${id}`);
  } catch (err) {
    if (state.openId !== id) return;
    drawer.classList.remove('scrolled');
    $('drawer-head').innerHTML = `<div class="top"><span class="mono">${id}</span><button class="close" data-close>Close</button></div>`;
    body.innerHTML = err.status === 404
      ? '<p class="notice">This ticket is not on the board (any more).</p>'
      : '<p class="notice">This ticket cannot be read right now.</p>';
    return;
  }
  if (state.openId !== id) return;
  const t = files[0];
  state.openAgent = t.agent || null;
  state.openRuns = t.runs || [];
  $('drawer-head').innerHTML = drawerHead(t, drawerCtx);
  body.innerHTML = drawerAgent(t, drawerCtx, { open: state.stepsOpen }) + drawerRuns(t, [], drawerCtx) + drawerFacts(t, drawerCtx, { dup: files }) + render(t.body, { ticket: lookup, href: ticketHref });
  drawRuns(t, Date.now());
  if (!keepScroll) drawer.classList.remove('scrolled');
  showFullTitle();
  body.scrollTop = scroll;
  foldTitle();
  if (!keepScroll) drawer.querySelector('[data-close]').focus({ preventScroll: true });
  showProgress();
}

// A card's progress button: the ticket opens, scrolled to its Progress
// section, which takes the focus.
function openProgress(id) {
  state.showRuns = true;
  if (state.openId === id && !$('drawer').hidden) showProgress();
  else open(id);
}
function showProgress() {
  if (!state.showRuns) return;
  state.showRuns = false;
  const section = document.querySelector('#drawer-body [data-run-body] .runs');
  if (!section) return;
  section.scrollIntoView({ block: 'start' });
  section.focus({ preventScroll: true });
  foldTitle();
}

$('drawer').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return close();
  const a = e.target.closest('a.ticket');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault();
    open(a.dataset.id);
  }
});
$('backdrop').addEventListener('click', () => close());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.openId) close();
});
window.addEventListener('popstate', () => {
  state.filter = readFilter(location.search);
  drawFilters();
  drawBoard();
  const id = idFromPath();
  if (id) open(id, { push: false });
  else close({ push: false });
});

// ---------- agents ----------

// Refills the agent slots on the cards and in the drawer. Run every second, so
// "12 s ago" counts on and a silent agent turns quiet without any event; a
// slot is only written when what it shows has changed.
function fill(el, html) {
  if (el && el.dataset.shown !== html) {
    el.innerHTML = html;
    el.dataset.shown = html;
  }
}
function refreshAgents() {
  const now = Date.now();
  for (const slot of document.querySelectorAll('[data-agent-for]')) {
    const t = lookup(slot.dataset.agentFor);
    fill(slot, t?.agent ? agentLine(t.agent, t.status, now) : '');
  }
  for (const slot of document.querySelectorAll('[data-run-for]')) {
    const t = lookup(slot.dataset.runFor);
    fill(slot, runButton(slot.dataset.runFor, t?.runs, now));
    slot.parentElement.classList.toggle('with-run', !!t?.runs?.length);
  }
  const t = state.openId && state.openId !== ORDER ? lookup(state.openId) : null;
  if (!t) return;
  const ctx = { ...drawerCtx, now: () => now };
  const head = document.querySelector('#drawer-head [data-agent-head]');
  const body = document.querySelector('#drawer-body [data-agent-body]');
  fill(head, agentHeadHtml(t, state.openAgent, ctx));
  fill(body, agentBodyHtml(t, state.openAgent, ctx, { open: state.stepsOpen }));
  drawRuns(t, now);
}

// The open ticket's Progress section. Drawn again only when the runs printed
// something or came and went; otherwise only each run's times are refilled, so
// output being read or selected is left alone. An output scrolled to its end
// stays at its end as lines arrive; one scrolled up stays where it is.
function drawRuns(t, now) {
  const slot = document.querySelector('#drawer-body [data-run-body]');
  if (!slot) return;
  const mark = runsMark(state.openRuns);
  if (slot.dataset.mark !== mark) {
    const kept = new Map();
    for (const pre of slot.querySelectorAll('[data-run-output]')) {
      if (pre.scrollHeight - pre.scrollTop - pre.clientHeight > 4) kept.set(pre.dataset.runOutput, pre.scrollTop);
    }
    slot.innerHTML = runBodyHtml(t, state.openRuns, { ...drawerCtx, now: () => now });
    slot.dataset.mark = mark;
    for (const pre of slot.querySelectorAll('[data-run-output]')) {
      pre.scrollTop = kept.has(pre.dataset.runOutput) ? kept.get(pre.dataset.runOutput) : pre.scrollHeight;
    }
    return;
  }
  for (const r of state.openRuns) fill(slot.querySelector(`[data-run-head="${CSS.escape(r.run)}"]`), runHead(r, now));
}
setInterval(refreshAgents, 1000);

$('drawer-body').addEventListener('toggle', (e) => {
  if (e.target.matches?.('details.agent-steps')) state.stepsOpen = e.target.open;
}, true);

// The server says an agent moved: `data` holds each active ticket's agent,
// without steps. The open ticket's steps are fetched again only when its agent
// changed.
async function agentsMoved(data) {
  if (!state.board) return;
  for (const t of state.board.tickets) {
    if (!AGENT_STATUSES.includes(t.status)) continue;
    if (data[t.id]) t.agent = data[t.id];
    else delete t.agent;
  }
  const id = state.openId;
  const t = id && id !== ORDER ? lookup(id) : null;
  const mark = (x) => (x ? `${x.lastAt}|${x.ended}|${x.step?.at}` : '');
  if (t && mark(t.agent) !== mark(state.openAgent)) {
    try {
      const got = await getJson(`${base}api/agent/${id}`);
      if (state.openId === id) state.openAgent = got.agent;
    } catch {
      // keeps the steps it had
    }
  }
  refreshAgents();
}

// The server says the test runs changed: `data` holds each active ticket's
// runs, without their output. The open ticket's output is fetched again only
// when one of its runs printed something, started or ended.
async function runsMoved(data) {
  if (!state.board) return;
  for (const t of state.board.tickets) {
    if (!AGENT_STATUSES.includes(t.status)) continue;
    if (data[t.id]) t.runs = data[t.id];
    else delete t.runs;
  }
  const id = state.openId;
  const t = id && id !== ORDER ? lookup(id) : null;
  if (t && runsMark(t.runs) !== runsMark(state.openRuns)) {
    if (!t.runs) state.openRuns = [];
    else {
      try {
        const got = await getJson(`${base}api/progress/${id}`);
        if (state.openId === id) state.openRuns = got.runs;
      } catch {
        // keeps the output it had
      }
    }
  }
  refreshAgents();
}

// ---------- switching project ----------

// Every active project is a button in the top bar, the open one marked, so
// another board is one click away. Projects this browser has archived are left
// out. Buttons that do not fit on one line scroll sideways.
const switcher = { projects: null };
const projectHref = (name) => `/${encodeURIComponent(name)}/`;

function drawSwitcher() {
  const nav = $('project-buttons');
  // Until the list is read, or when it cannot be, the bar shows no buttons;
  // the page itself is unaffected.
  const items = switcher.projects ? switchList(switcher.projects, loadArchived(), project) : [];
  nav.hidden = items.length === 0;
  nav.innerHTML = items.map((p) => `<a href="${projectHref(p.name)}"${p.current ? ' aria-current="page"' : ''}>${esc(p.name)}</a>`).join('');
  showCurrent();
}

// The open project's button is brought into view when the row has scrolled.
// Asked again once the fonts arrive, since they change every button's width.
function showCurrent() {
  const nav = $('project-buttons');
  const here = nav.querySelector('[aria-current="page"]');
  if (!here || nav.scrollWidth <= nav.clientWidth) return;
  const left = here.offsetLeft; // the nav is the buttons' offset parent
  if (left < nav.scrollLeft || left + here.offsetWidth > nav.scrollLeft + nav.clientWidth) {
    // Centred; one wider than the row shows its start, inside the row's padding.
    const pad = parseFloat(getComputedStyle(nav).paddingLeft) || 0;
    nav.scrollLeft = left - Math.max(pad, (nav.clientWidth - here.offsetWidth) / 2);
  }
}
document.fonts?.ready.then(showCurrent);
document.fonts?.addEventListener('loadingdone', showCurrent);

async function loadProjects() {
  try {
    switcher.projects = await getJson('/api/projects');
  } catch {
    // keeps the list it had
  }
  drawSwitcher();
}

// Archiving on the home page, in another tab, changes the buttons here too.
window.addEventListener('storage', (e) => { if (e.key === ARCHIVED_KEY) drawSwitcher(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadProjects(); });
loadProjects();

// ---------- live ----------

const source = new EventSource(`${base}events`);
liveIndicator($('live'), source);
source.addEventListener('agent', (e) => {
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  agentsMoved(data);
});
source.addEventListener('progress', (e) => {
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  runsMoved(data);
});
source.addEventListener('change', async () => {
  await load();
  if (state.openId === ORDER) showOrder({ keepScroll: true });
  else if (state.openId) showTicket(state.openId, { keepScroll: true });
});

await load();
const first = idFromPath();
if (first) {
  if (first === ORDER) state.picked = 'todo';
  else if (lookup(first)) state.picked = lookup(first).status;
  open(first, { push: false });
  drawBoard();
}
