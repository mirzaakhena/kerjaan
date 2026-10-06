import { STATUSES, statusName, statusColor, getJson, liveIndicator } from './umum.js';
import { render, esc } from './markdown.js';
import { readFilter, writeFilter, matches, columnOrder, choices, FILTER_KEYS, readHidden } from './saring.js';

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
};

document.title = `${project} — kerjaan`;
$('name').textContent = project;
$('tab-kanban').href = base;
$('tab-map').href = `${base}map/`;

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
  const [done, total] = t.checks;
  const labels = t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join('');
  return `<li><button class="card" data-id="${t.id}" aria-current="${t.id === state.openId}">
    <div class="title">${esc(t.title)}</div>
    <div class="meta">
      ${rank ? `<span class="rank" title="Urutan di order.md">#${rank}</span>` : ''}
      <span class="id">${t.id}</span>
      ${t.broken ? '<span class="broken" title="Berkas ini tidak punya frontmatter">rusak</span>' : ''}
      ${t.type ? `<span class="tag type-${esc(t.type)}">${esc(t.type)}</span>` : ''}
      ${t.priority ? `<span class="prio ${esc(t.priority)}">${esc(t.priority)}</span>` : ''}
      ${labels}
      ${total ? `<span class="progress" title="Done when tercentang">${done}/${total}</span>` : ''}
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
  if (!keepScroll) drawer.querySelector('[data-close]').focus({ preventScroll: true });
}

const refLinks = (ids) =>
  ids.length
    ? ids.map((id) => {
        const t = lookup(id);
        return t
          ? `<a class="tiket ref" href="${ticketHref(id)}" data-id="${id}"><span class="mono">${id}</span> <span class="t">${esc(t.title)}</span></a> <span class="muted">· ${statusName(t.status)}</span>`
          : `<span class="missing" title="Tidak ada tiket dengan ID ini di papan">${esc(id)}</span>`;
      }).join('<br>')
    : '<span class="muted">—</span>';

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
    $('drawer-head').innerHTML = `<div class="top"><span class="mono">${id}</span><button class="close" data-close>Tutup</button></div>`;
    body.innerHTML = err.status === 404
      ? '<p class="notice">Tiket ini tidak ada (lagi) di papan.</p>'
      : '<p class="notice">Tiket ini tidak bisa dibaca sekarang.</p>';
    return;
  }
  if (state.openId !== id) return;
  const t = files[0];
  const dup = files.length > 1
    ? `<p class="notice">ID ini dipakai ${files.length} berkas: ${files.map((f) => `<code>${esc(f.status)}/${esc(f.file)}</code>`).join(', ')}. Yang ditampilkan berkas pertama.</p>`
    : '';
  const [done, total] = t.checks;
  $('drawer-head').innerHTML = `
    <div class="top">
      <span class="status-pill" style="--c:${statusColor(t.status)}">${statusName(t.status)}</span>
      <span class="mono">${t.id}</span>
      <button class="close" data-close aria-label="Tutup tiket">Tutup</button>
    </div>
    <h2>${esc(t.title)}</h2>
    <dl class="facts">
      <dt>Tipe</dt><dd>${esc(t.type) || '—'}</dd>
      <dt>Prioritas</dt><dd>${t.priority ? `<span class="prio ${esc(t.priority)}">${esc(t.priority)}</span>` : '—'}</dd>
      <dt>Review</dt><dd>${esc(t.review) || '<span class="muted">quick (kosong)</span>'}</dd>
      <dt>Label</dt><dd>${t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join(' ') || '—'}</dd>
      <dt>Pelapor</dt><dd>${esc(t.meta.reporter || '') || '—'}</dd>
      <dt>Dikerjakan</dt><dd>${esc(t.meta.assign_to || '') || '—'}</dd>
      <dt>Dibuat</dt><dd>${esc(t.created) || '—'}</dd>
      <dt>Diubah</dt><dd>${esc(t.updated) || '—'}</dd>
      ${total ? `<dt>Done when</dt><dd>${done} dari ${total} tercentang</dd>` : ''}
      <dt>Terkait</dt><dd>${refLinks(t.related)}</dd>
      <dt>Menunggu</dt><dd>${refLinks(t.blockedBy)}</dd>
    </dl>
    ${t.broken ? '<p class="notice">Berkas ini tidak punya frontmatter, jadi tipe, prioritas, dan tanggalnya tidak diketahui.</p>' : ''}
    ${dup}`;
  body.innerHTML = render(t.body, { ticket: lookup, href: ticketHref });
  body.scrollTop = scroll;
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

// ---------- live ----------

const source = new EventSource(`${base}events`);
liveIndicator($('live'), source);
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
