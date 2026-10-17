// What the ticket drawer shows, split by where it sits. The part that stays put
// while the ticket is read holds only what is glanced at: which ticket this is
// (status, ID, title) and how it stands (type, priority, review, Done when
// progress). Everything else about the ticket goes in the first block of the
// part that scrolls, above Background, so no fact leaves the drawer.
//
// Pure: no DOM, so the tests run it in Node. `ctx` carries what depends on the
// page: { lookup(id) -> ticket|null, href(id) -> url, statusName, statusColor,
// now() -> ms (optional) }.
//
// A ticket in progress or in review also shows its agent: one line in the
// fixed head, and its last steps first thing in the scrolling part. Both sit
// in slots the page refills as the agent works (see agen.js).

import { esc } from './markdown.js';
import { pills } from './pil.js';
import { agentLine, agentSteps, AGENT_STATUSES } from './agen.js';

const nowOf = (ctx) => (ctx.now ? ctx.now() : Date.now());

export const agentHeadHtml = (t, a, ctx) => (a ? agentLine(a, t.status, nowOf(ctx)) : '');
export const agentBodyHtml = (t, a, ctx, { open = false } = {}) => (a ? agentSteps(a, t.status, nowOf(ctx), { open }) : '');

// The fixed head: one row with status, ID and the close button, the title
// (clamped by the stylesheet), and one row of status-at-a-glance.
export function drawerHead(t, ctx) {
  const items = t.doneWhen || [];
  const open = items.filter((i) => !i.struck);
  const count = open.length ? `<span class="count" aria-hidden="true">${open.filter((i) => i.done).length}/${open.length}</span>` : '';
  return `
    <div class="top">
      <span class="status-pill" style="--c:${ctx.statusColor(t.status)}">${ctx.statusName(t.status)}</span>
      <span class="mono">${t.id}</span>
      <button class="close" data-close aria-label="Tutup tiket">Tutup</button>
    </div>
    <h2 class="judul" title="${esc(t.title)}">${esc(t.title)}</h2>
    <div class="sekilas">
      <span class="tag${t.type ? ` type-${esc(t.type)}` : ''}" title="Tipe">${esc(t.type) || '—'}</span>
      ${t.priority ? `<span class="prio ${esc(t.priority)}" title="Prioritas">${esc(t.priority)}</span>` : '<span class="muted" title="Prioritas">—</span>'}
      <span class="review" title="Tingkat review"><span class="muted">review</span> ${esc(t.review) || '<span class="muted">quick</span>'}</span>
      ${items.length ? `<span class="kemajuan">${pills(items, { className: 'progress' })}${count}</span>` : ''}
    </div>${AGENT_STATUSES.includes(t.status) ? `
    <div class="agen-baris" data-agen-head>${agentHeadHtml(t, t.agent, ctx)}</div>` : ''}`;
}

// The agent's last steps, first in the scrolling part; folded unless `open`.
export function drawerAgent(t, ctx, { open = false } = {}) {
  return AGENT_STATUSES.includes(t.status) ? `<div class="agen-blok" data-agen-body>${agentBodyHtml(t, t.agent, ctx, { open })}</div>` : '';
}

const refLinks = (ids, ctx) =>
  ids.length
    ? ids.map((id) => {
        const t = ctx.lookup(id);
        return t
          ? `<a class="tiket ref" href="${ctx.href(id)}" data-id="${id}"><span class="mono">${id}</span> <span class="t">${esc(t.title)}</span></a> <span class="muted">· ${ctx.statusName(t.status)}</span>`
          : `<span class="missing" title="Tidak ada tiket dengan ID ini di papan">${esc(id)}</span>`;
      }).join('<br>')
    : '<span class="muted">—</span>';

// The first block of the scrolling part: the full title when the head had to
// cut it short, the remaining facts packed two pairs to a row, and the notices.
export function drawerFacts(t, ctx, { dup = [] } = {}) {
  const pair = (name, value, wide = false) => `<div class="fact${wide ? ' wide' : ''}"><dt>${name}</dt><dd>${value}</dd></div>`;
  return `
    <p class="judul-penuh" hidden>${esc(t.title)}</p>
    <dl class="facts">
      ${pair('Label', t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join(' ') || '—')}
      ${pair('Pelapor', esc(t.meta.reporter || '') || '—')}
      ${pair('Dikerjakan', esc(t.meta.assign_to || '') || '—')}
      ${pair('Dibuat', esc(t.created) || '—')}
      ${pair('Diubah', esc(t.updated) || '—')}
      ${pair('Terkait', refLinks(t.related, ctx), true)}
      ${pair('Menunggu', refLinks(t.blockedBy, ctx), true)}
    </dl>
    ${t.broken ? '<p class="notice">Berkas ini tidak punya frontmatter, jadi tipe, prioritas, dan tanggalnya tidak diketahui.</p>' : ''}
    ${dup.length > 1 ? `<p class="notice">ID ini dipakai ${dup.length} berkas: ${dup.map((f) => `<code>${esc(f.status)}/${esc(f.file)}</code>`).join(', ')}. Yang ditampilkan berkas pertama.</p>` : ''}`;
}
