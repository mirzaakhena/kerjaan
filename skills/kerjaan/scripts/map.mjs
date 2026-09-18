#!/usr/bin/env node
// A live map of a .kerjaan/ board: a local server that reads the ticket files,
// serves map.html, and pushes a nudge over SSE whenever anything under
// .kerjaan/ changes, so the open page redraws without a reload.
//
//   node map.mjs [repo-or-.kerjaan-path] [--port N] [--open]
//
// Read-only: it never writes to the board. No dependencies beyond Node 18+.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];
const here = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  args.splice(i, 1);
  return true;
};
const option = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const [, value] = args.splice(i, 2);
  return value;
};
const shouldOpen = flag('--open');
const port = Number(option('--port') || 0);

function findBoard(start) {
  let dir = path.resolve(start);
  if (path.basename(dir) === '.kerjaan') return dir;
  for (;;) {
    const candidate = path.join(dir, '.kerjaan');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const board = findBoard(args[0] || process.cwd());
if (!board) {
  console.error('No .kerjaan/ folder found here or in any parent folder.');
  process.exit(1);
}

const list = (s) => (s || '').match(/[\w-]+/g) || [];

function readTicket(status, file) {
  const text = fs.readFileSync(path.join(board, status, file), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const meta = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const body = match[2].trim();
  const boxes = body.match(/^- \[[ xX]\]/gm) || [];
  const base = file.replace(/\.md$/, '');
  return {
    id: base.slice(0, 12),
    title: base.slice(13) || base,
    status,
    type: meta.type || '',
    priority: meta.priority || '',
    labels: list(meta.labels),
    created: meta.created || '',
    updated: meta.updated || meta.created || '',
    related: list(meta.related),
    blockedBy: list(meta.blocked_by),
    checks: [boxes.filter((b) => b !== '- [ ]').length, boxes.length],
    body,
  };
}

function readBoard() {
  const tickets = [];
  for (const status of STATUSES) {
    const folder = path.join(board, status);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder).sort()) {
      if (!file.endsWith('.md')) continue;
      try {
        const ticket = readTicket(status, file);
        if (ticket) tickets.push(ticket);
      } catch {
        // A file caught mid-move or mid-write; the next change event rereads it.
      }
    }
  }
  // order.md only ranks todo; the ids appear in the order they should be picked.
  let order = [];
  const orderFile = path.join(board, 'order.md');
  if (fs.existsSync(orderFile)) {
    order = [...new Set(fs.readFileSync(orderFile, 'utf8').match(/\b\d{12}\b/g) || [])];
  }
  return {
    repo: path.basename(path.dirname(board)),
    board,
    readAt: new Date().toISOString(),
    order,
    tickets,
  };
}

const clients = new Set();
let pending = null;
fs.watch(board, { recursive: true }, () => {
  // A move is an unlink plus a create; wait for the burst to settle.
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const res of clients) res.write('event: change\ndata: {}\n\n');
  }, 150);
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(path.join(here, 'map.html')));
  } else if (url.pathname === '/data') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(readBoard()));
  } else if (url.pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write('retry: 1500\n\n');
    clients.add(res);
    const beat = setInterval(() => res.write(': beat\n\n'), 25000);
    req.on('close', () => {
      clearInterval(beat);
      clients.delete(res);
    });
  } else {
    res.writeHead(404).end();
  }
});

// Loopback only: ticket bodies are the repo's private notes.
server.listen(port, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`kerjaan map: ${address}`);
  console.log(`watching ${board}`);
  if (shouldOpen) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(opener, [address], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
  }
});
