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
