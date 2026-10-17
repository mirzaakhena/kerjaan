// Reads a .kerjaan/ board into plain data for the viewer.
//
// Read-only, no dependencies beyond Node 18+.

import fs from 'node:fs';
import path from 'node:path';

export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];

const list = (s) => (s || '').match(/[\w-]+/g) || [];

// The items of a ticket's `## Done when` list, in the order written: whether
// each is ticked, and whether it is struck through (`- [ ] ~~...~~`) because
// it was voided or moved to another ticket. Counted the way ticket-size.sh
// counts: top-level `- [ ]` / `- [x]` lines under that heading, outside fenced
// blocks; indented lines belong to the item above them. A ticket without the
// heading has no items, whatever checkboxes it holds elsewhere.
export function readDoneWhen(body) {
  const items = [];
  let section = '';
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (line.startsWith('## ')) {
      section = line.trimEnd();
      continue;
    }
    if (section !== '## Done when') continue;
    const m = line.match(/^- \[([ xX])\]/);
    if (!m) continue;
    items.push({ done: m[1] !== ' ', struck: /^- \[[ xX]\][ \t]*~~/.test(line) });
  }
  return items;
}

// A file without frontmatter is still a file in a status folder. It comes back
// marked `broken` rather than being dropped, so a reader that shows the folders
// as they are can show it too.
export function readTicket(board, status, file) {
  const text = fs.readFileSync(path.join(board, status, file), 'utf8');
  const base = file.replace(/\.md$/, '');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (match) {
    for (const line of match[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  const body = (match ? match[2] : text).trim();
  const doneWhen = readDoneWhen(body);
  const open = doneWhen.filter((i) => !i.struck);
  return {
    id: base.slice(0, 12),
    title: base.slice(13) || base,
    status,
    file,
    broken: !match,
    meta,
    type: meta.type || '',
    priority: meta.priority || '',
    review: meta.review || '',
    labels: list(meta.labels),
    created: meta.created || '',
    updated: meta.updated || meta.created || '',
    related: list(meta.related),
    blockedBy: list(meta.blocked_by),
    doneWhen,
    checks: [open.filter((i) => i.done).length, open.length],
    body,
  };
}

// The ids order.md lists, top to bottom. It only ranks todo. Only a list line
// `- <id> <title>` is a place, read with the rule queue.sh check uses
// (references/ordering-the-queue.md); an id named in a lead-in, in prose or
// on a lands-first line is never one. viewer/uji/urutan.test.mjs holds the two
// readers to the same list.
export function readOrder(board) {
  const orderFile = path.join(board, 'order.md');
  if (!fs.existsSync(orderFile)) return null;
  // Split on \n alone, as awk does, so a stray \r reads the same in both.
  const lines = fs.readFileSync(orderFile, 'utf8').split('\n');
  return [...new Set(lines.map((l) => l.match(/^- (\d{12})(?: |$)/)?.[1]).filter(Boolean))];
}

// order.md's groups: a group runs from one bold lead-in line (`**...`, other
// than the goal line `**Goal.**`) to the next, and holds the tickets of its
// list lines `- <id> <title>`, the same reading queue.sh check uses. List
// lines above the first lead-in form a group of their own. Only groups that hold a list line are returned, as
// { start, end, ids }: start is the lead-in's line index (0 for the group
// above the first lead-in), end the index of the next lead-in or the line
// count, so the text of a group is lines.slice(start, end).
export function readOrderGroups(text) {
  const lines = text.split('\n');
  const groups = [];
  let cur = { start: 0, ids: [] };
  const close = (end) => { if (cur.ids.length) groups.push({ ...cur, end }); };
  lines.forEach((line, i) => {
    // The goal line (`**Goal.**`) opens no group, as queue.sh check reads it.
    if (/^\*\*Goal\.\*\*/.test(line)) return;
    if (line.startsWith('**')) {
      close(i);
      cur = { start: i, ids: [] };
      return;
    }
    const id = line.match(/^- (\d{12})(?: |$)/)?.[1];
    if (id && !cur.ids.includes(id)) cur.ids.push(id);
  });
  close(lines.length);
  return groups;
}

// The latest "files estimated to change:" record in a ticket's body, read the
// way lib.sh's kerjaan_estimate reads it: the last such line outside fenced
// blocks, its paths the backquoted parts. Returns the paths (a folder ends in
// "/"), [] for an estimate of none, or null when none was recorded.
const ESTIMATE = /^- \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}: files estimated to change: /;
export function readEstimate(body) {
  let last = null;
  let fenced = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && ESTIMATE.test(line)) last = line;
  }
  if (last === null) return null;
  return [...last.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

// The paths two estimates share, as queue.sh's shared_paths finds them: equal
// paths, or a folder ("x/") and anything under it, where the narrower is what
// is shared. Sorted, each once.
export function sharedPaths(a, b) {
  const out = new Set();
  for (const p of a) {
    for (const q of b) {
      if (p === q) out.add(p);
      else if (p.endsWith('/') && q.startsWith(p)) out.add(q);
      else if (q.endsWith('/') && p.startsWith(q)) out.add(p);
    }
  }
  return [...out].sort();
}

// For each group of order.md whose tickets share files by their estimates, the
// pairs that do: { start, end, pairs: [{ a, b, files }], unestimated: [ids] }.
// Pairs across groups, and with tickets order.md does not list, are left out:
// only tickets of one group run side by side and need an order of landing.
// Computed from the tickets each time, so a changed estimate shows at once.
export function sharedInGroups(text, tickets) {
  const byId = new Map();
  for (const t of tickets) if (!byId.has(t.id)) byId.set(t.id, t);
  const result = [];
  for (const g of readOrderGroups(text)) {
    const est = g.ids.filter((id) => byId.has(id)).map((id) => [id, readEstimate(byId.get(id).body)]);
    const pairs = [];
    for (const [a, ea] of est) {
      for (const [b, eb] of est) {
        if (!(a < b) || !ea || !eb) continue;
        const files = sharedPaths(ea, eb);
        if (files.length) pairs.push({ a, b, files });
      }
    }
    if (!pairs.length) continue;
    pairs.sort((x, y) => (x.a + x.b < y.a + y.b ? -1 : 1));
    const unestimated = est.filter(([, e]) => e === null).map(([id]) => id);
    result.push({ start: g.start, end: g.end, pairs, unestimated });
  }
  return result;
}

export function readBoard(board) {
  const tickets = [];
  for (const status of STATUSES) {
    const folder = path.join(board, status);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder).sort()) {
      if (!file.endsWith('.md')) continue;
      try {
        tickets.push(readTicket(board, status, file));
      } catch {
        // A file caught mid-move or mid-write; the next change event rereads it.
      }
    }
  }
  const order = readOrder(board);
  return {
    repo: path.basename(path.dirname(board)),
    board,
    readAt: new Date().toISOString(),
    hasOrder: order !== null,
    order: order || [],
    tickets,
  };
}

// Calls `onChange` once a burst of changes under the board has settled — a
// move is an unlink plus a create. Returns a function that stops watching.
export function watchBoard(board, onChange) {
  let pending = null;
  const watcher = fs.watch(board, { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(onChange, 150);
  });
  watcher.on('error', () => {});
  return () => {
    clearTimeout(pending);
    watcher.close();
  };
}
