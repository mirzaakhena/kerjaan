import { STATUSES, statusName, statusColor, getJson, liveIndicator } from './umum.js';
import { render, esc } from './markdown.js';
import { readFilter, writeFilter, matches, columnOrder, choices, FILTER_KEYS, readHidden } from './saring.js';
import { pills } from './pil.js';
import { drawerHead, drawerFacts, drawerAgent, agentHeadHtml, agentBodyHtml } from './laci.js';
import { agentLine, AGENT_STATUSES } from './agen.js';
import { ARCHIVED_KEY, loadArchived } from './arsip.js';
import { switchList } from './pindah.js';

// The page lives at /<project>/, /<project>/tiket/<id> and /<project>/urutan
// (order.md); everything it asks the server for is under /<project>/.
const project = decodeURIComponent(location.pathname.split('/')[1]);
const base = `/${encodeURIComponent(project)}/`;
const $ = (id) => document.getElementById(id);

// Long columns show this many cards until asked for the rest.
const PAGE = 60;

// What the drawer holds when it shows order.md rather than a ticket.
const ORDER = 'urutan';

// Hidden columns are remembered per browser. Storage can be missing or refuse
// (a private window); the page then simply starts from the default each time.
const HIDDEN_KEY = 'kerjaan.kolom-tersembunyi';
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
};

document.title = `${project} — kerjaan`;
$('name').textContent = project;

const idFromPath = () =>
  location.pathname.match(/\/tiket\/(\d{12})$/)?.[1] || (location.pathname.endsWith(`/${ORDER}`) ? ORDER : null);
const ticketHref = (id) => `${base}tiket/${id}${writeFilter(state.filter)}`;
const lookup = (id) => state.byId.get(id) || null;

// ---------- loading ----------

async function load() {
  try {
    state.board = await getJson(`${base}api/papan`);
  } catch {
    $('board').innerHTML = '<div class="empty">Papan proyek ini tidak bisa dibaca. Server masih menyala?</div>';
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
  fill('type', 'Semua tipe', c.type);
  fill('priority', 'Semua prioritas', c.priority);
  fill('label', 'Semua label', c.label);
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

function card(t, rank) {
  const labels = t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join('');
  const agent = AGENT_STATUSES.includes(t.status)
    ? `<div class="agen-slot" data-agen-for="${t.id}">${t.agent ? agentLine(t.agent, t.status, Date.now()) : ''}</div>`
    : '';
  return `<li><button class="card" data-id="${t.id}" aria-current="${t.id === state.openId}">
    <div class="title">${esc(t.title)}</div>${agent}
    <div class="meta">
      ${rank ? `<span class="rank" title="Urutan di order.md">#${rank}</span>` : ''}
      <span class="id">${t.id}</span>
      ${t.broken ? '<span class="broken" title="Berkas ini tidak punya frontmatter">rusak</span>' : ''}
      ${t.type ? `<span class="tag type-${esc(t.type)}">${esc(t.type)}</span>` : ''}
      ${t.priority ? `<span class="prio ${esc(t.priority)}">${esc(t.priority)}</span>` : ''}
      ${labels}
      ${pills(t.doneWhen, { className: 'progress' })}
    </div></button></li>`;
}

function drawBoard() {
  const { board, filter } = state;
  const shown = board.tickets.filter((t) => matches(t, filter));
  // The number is a ticket's place among those actually in todo: order.md can
  // still name a ticket that has moved on, which is not this view's to show.
  const inTodo = new Set(board.tickets.filter((t) => t.status === 'todo').map((t) => t.id));
  const rank = new Map(board.order.filter((id) => inTodo.has(id)).map((id, i) => [id, i + 1]));
  const filtering = FILTER_KEYS.some((k) => filter[k]);

  $('shown').textContent = filtering ? `${shown.length} dari ${board.tickets.length} tiket` : `${board.tickets.length} tiket`;
  $('clear').hidden = !filtering;

  const visible = STATUSES.filter((s) => !state.hidden.has(s));
  $('cols').innerHTML = `<span class="lead">Kolom</span>${STATUSES.map((s) => {
    const n = shown.filter((t) => t.status === s).length;
    const on = !state.hidden.has(s);
    return `<button type="button" data-col="${s}" style="--c:${statusColor(s)}" aria-pressed="${on}" title="${on ? 'Sembunyikan' : 'Tampilkan'} kolom ${statusName(s)}">${statusName(s)} <b>${n}</b></button>`;
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
    const cards = all.slice(0, limit).map((t) => card(t, s === 'todo' ? rank.get(t.id) : null)).join('');
    const note = s === 'todo' && board.hasOrder
      ? `<a class="note" href="${base}${ORDER}${writeFilter(filter)}" data-order title="Buka order.md: urutan dan alasannya">urut order.md</a>`
      : '';
    const more = all.length > limit ? `<button class="more" data-more="${s}">Tampilkan ${all.length - limit} lagi</button>` : '';
    return `<section class="col${s === state.picked ? ' picked' : ''}${state.hidden.has(s) ? ' hidden-col' : ''}" style="--c:${statusColor(s)}" aria-label="${statusName(s)}">
      <header>${statusName(s)} <span class="n">${all.length}</span>${note}</header>
      <ul class="cards">${cards || '<li class="none">Tidak ada</li>'}</ul>${more}</section>`;
  }).join('') + '<div class="empty none-visible">Semua kolom disembunyikan. Pilih kolom di atas untuk menampilkannya.</div>';
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
      <button class="close" data-close aria-label="Tutup order.md">Tutup</button>
    </div>
    <h2>Urutan pengambilan todo</h2>`;
  let text;
  try {
    text = (await getJson(`${base}api/urutan`)).text;
  } catch (err) {
    if (state.openId !== ORDER) return;
    body.innerHTML = err.status === 404
      ? '<p class="notice">Papan ini tidak punya order.md.</p>'
      : '<p class="notice">order.md tidak bisa dibaca sekarang.</p>';
    return;
  }
  if (state.openId !== ORDER) return;
  body.innerHTML = render(text, { ticket: lookup, href: ticketHref });
  body.scrollTop = scroll;
  foldTitle();
  if (!keepScroll) drawer.querySelector('[data-close]').focus({ preventScroll: true });
}

const drawerCtx = { lookup, href: ticketHref, statusName, statusColor };

// The title in the head is cut to two lines (one once the ticket is scrolled).
// When two lines are not enough, the whole title opens the scrolling part, so
// it can still be read in full.
function showFullTitle() {
  const drawer = $('drawer');
  const h2 = drawer.querySelector('#drawer-head h2');
  const full = drawer.querySelector('#drawer-body .judul-penuh');
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
    files = await getJson(`${base}api/tiket/${id}`);
  } catch (err) {
    if (state.openId !== id) return;
    drawer.classList.remove('scrolled');
    $('drawer-head').innerHTML = `<div class="top"><span class="mono">${id}</span><button class="close" data-close>Tutup</button></div>`;
    body.innerHTML = err.status === 404
      ? '<p class="notice">Tiket ini tidak ada (lagi) di papan.</p>'
      : '<p class="notice">Tiket ini tidak bisa dibaca sekarang.</p>';
    return;
  }
  if (state.openId !== id) return;
  const t = files[0];
  state.openAgent = t.agent || null;
  $('drawer-head').innerHTML = drawerHead(t, drawerCtx);
  body.innerHTML = drawerAgent(t, drawerCtx, { open: state.stepsOpen }) + drawerFacts(t, drawerCtx, { dup: files }) + render(t.body, { ticket: lookup, href: ticketHref });
  if (!keepScroll) drawer.classList.remove('scrolled');
  showFullTitle();
  body.scrollTop = scroll;
  foldTitle();
  if (!keepScroll) drawer.querySelector('[data-close]').focus({ preventScroll: true });
}

$('drawer').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) return close();
  const a = e.target.closest('a.tiket');
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
// "12 dtk lalu" counts on and a silent agent turns quiet without any event; a
// slot is only written when what it shows has changed.
function fill(el, html) {
  if (el && el.dataset.shown !== html) {
    el.innerHTML = html;
    el.dataset.shown = html;
  }
}
function refreshAgents() {
  const now = Date.now();
  for (const slot of document.querySelectorAll('[data-agen-for]')) {
    const t = lookup(slot.dataset.agenFor);
    fill(slot, t?.agent ? agentLine(t.agent, t.status, now) : '');
  }
  const t = state.openId && state.openId !== ORDER ? lookup(state.openId) : null;
  if (!t) return;
  const ctx = { ...drawerCtx, now: () => now };
  const head = document.querySelector('#drawer-head [data-agen-head]');
  const body = document.querySelector('#drawer-body [data-agen-body]');
  fill(head, agentHeadHtml(t, state.openAgent, ctx));
  fill(body, agentBodyHtml(t, state.openAgent, ctx, { open: state.stepsOpen }));
}
setInterval(refreshAgents, 1000);

$('drawer-body').addEventListener('toggle', (e) => {
  if (e.target.matches?.('details.agen-langkah')) state.stepsOpen = e.target.open;
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
      const got = await getJson(`${base}api/agen/${id}`);
      if (state.openId === id) state.openAgent = got.agent;
    } catch {
      // keeps the steps it had
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
  const nav = $('proyek-tombol');
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
  const nav = $('proyek-tombol');
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
    switcher.projects = await getJson('/api/proyek');
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
source.addEventListener('agen', (e) => {
  let data;
  try { data = JSON.parse(e.data); } catch { return; }
  agentsMoved(data);
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
