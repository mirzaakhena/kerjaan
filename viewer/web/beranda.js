import { STATUSES, statusName, statusColor, getJson } from './umum.js';
import { esc } from './markdown.js';

const box = document.getElementById('projects');

async function load() {
  let projects;
  try {
    projects = await getJson('/api/proyek');
  } catch {
    box.innerHTML = '<div class="empty">Server tidak menjawab. Masih menyala?</div>';
    return;
  }
  if (projects.length === 0) {
    box.innerHTML = '<div class="empty">Belum ada proyek dengan folder <code>.kerjaan/</code> di folder yang dipindai.</div>';
    return;
  }
  box.innerHTML = projects.map((p) => {
    const total = STATUSES.reduce((n, s) => n + p.counts[s], 0);
    const stack = STATUSES.filter((s) => p.counts[s])
      .map((s) => `<span style="flex:${p.counts[s]};background:${statusColor(s)}" title="${statusName(s)}: ${p.counts[s]}"></span>`).join('');
    const counts = STATUSES.map((s) => `<span><i class="dot" style="--c:${statusColor(s)}"></i>${statusName(s)} <b>${p.counts[s]}</b></span>`).join('');
    return `<a class="project" href="/${encodeURIComponent(p.name)}/">
      <div class="name">${esc(p.name)}<span class="total">${total} tiket</span></div>
      <div class="stack" aria-hidden="true">${stack}</div>
      <div class="counts">${counts}</div></a>`;
  }).join('');
}

load();
// A board created while this page sat open shows up when it is looked at again.
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
