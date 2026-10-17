import { STATUSES, statusName, statusColor, getJson } from './common.js';
import { esc } from './markdown.js';
import { TABS, splitProjects, readTab, ARCHIVED_KEY, loadArchived } from './archive.js';

const box = document.getElementById('projects');
const tabs = document.getElementById('tabs');

// Archived projects are remembered per browser. Storage can be missing or
// refuse (a private window); archiving then lasts for this page only.
function saveArchived() {
  try {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify([...state.archived].sort()));
  } catch {
    // remembered for this page only
  }
}

const state = {
  projects: null,
  archived: loadArchived(),
  tab: readTab(location.hash),
};

const TAB_NAME = { active: 'Active', archived: 'Archived' };

function card(p) {
  const total = STATUSES.reduce((n, s) => n + p.counts[s], 0);
  const stack = STATUSES.filter((s) => p.counts[s])
    .map((s) => `<span style="flex:${p.counts[s]};background:${statusColor(s)}" title="${statusName(s)}: ${p.counts[s]}"></span>`).join('');
  const counts = STATUSES.map((s) => `<span><i class="dot" style="--c:${statusColor(s)}"></i>${statusName(s)} <b>${p.counts[s]}</b></span>`).join('');
  const archived = state.archived.has(p.name);
  const action = archived ? 'Unarchive' : 'Archive';
  return `<article class="project">
    <div class="name"><a href="/${encodeURIComponent(p.name)}/">${esc(p.name)}</a><span class="total">${total} ${total === 1 ? 'ticket' : 'tickets'}</span>
      <button type="button" class="archive" data-name="${esc(p.name)}" title="${action} ${esc(p.name)}">${action}</button></div>
    <div class="stack" aria-hidden="true">${stack}</div>
    <div class="counts">${counts}</div></article>`;
}

function render() {
  if (!state.projects) return;
  const split = splitProjects(state.projects, state.archived);
  tabs.hidden = state.projects.length === 0;
  tabs.innerHTML = TABS.map((t) => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === state.tab}">${TAB_NAME[t]} <b>${split[t].length}</b></button>`).join('');
  if (state.projects.length === 0) {
    box.innerHTML = '<div class="empty">No project with a <code>.kerjaan/</code> folder in the scanned folder yet.</div>';
    return;
  }
  const list = split[state.tab];
  if (list.length === 0) {
    box.innerHTML = state.tab === 'archived'
      ? '<div class="empty">No archived projects yet.</div>'
      : '<div class="empty">Every project is archived. See the <b>Archived</b> tab.</div>';
    return;
  }
  box.innerHTML = list.map(card).join('');
}

async function load() {
  try {
    state.projects = await getJson('/api/projects');
  } catch {
    box.innerHTML = '<div class="empty">The server does not answer. Is it still running?</div>';
    return;
  }
  render();
}

tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  history.replaceState(null, '', state.tab === 'archived' ? '#archived' : location.pathname);
  render();
});

box.addEventListener('click', (e) => {
  const b = e.target.closest('button.archive');
  if (!b) return;
  const name = b.dataset.name;
  if (state.archived.has(name)) state.archived.delete(name);
  else state.archived.add(name);
  saveArchived();
  render();
});

window.addEventListener('hashchange', () => { state.tab = readTab(location.hash); render(); });
// Another tab archiving a project shows up here too.
window.addEventListener('storage', (e) => { if (e.key === ARCHIVED_KEY) { state.archived = loadArchived(); render(); } });

load();
// A board created while this page sat open shows up when it is looked at again.
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
