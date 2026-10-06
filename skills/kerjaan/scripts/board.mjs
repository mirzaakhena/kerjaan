// Reads a .kerjaan/ board into plain data. Shared by map.mjs and the viewer,
// so both see one board the same way.
//
// Read-only, no dependencies beyond Node 18+.

import fs from 'node:fs';
import path from 'node:path';

export const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];

const list = (s) => (s || '').match(/[\w-]+/g) || [];

// A file without frontmatter is still a file in a status folder. It comes back
// marked `broken` rather than being dropped, so a reader that shows the folders
// as they are can show it too; the map leaves it out, as it always has.
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
  const boxes = body.match(/^- \[[ xX]\]/gm) || [];
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
    checks: [boxes.filter((b) => b !== '- [ ]').length, boxes.length],
    body,
  };
}

// The ids order.md names, in the order it names them. It only ranks todo.
export function readOrder(board) {
  const orderFile = path.join(board, 'order.md');
  if (!fs.existsSync(orderFile)) return null;
  return [...new Set(fs.readFileSync(orderFile, 'utf8').match(/\b\d{12}\b/g) || [])];
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

// The exact shape map.html has always been served.
export function mapData(board) {
  const data = readBoard(board);
  return {
    repo: data.repo,
    board: data.board,
    readAt: data.readAt,
    order: data.order,
    tickets: data.tickets
      .filter((t) => !t.broken)
      .map(({ file, broken, meta, review, ...t }) => t),
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
