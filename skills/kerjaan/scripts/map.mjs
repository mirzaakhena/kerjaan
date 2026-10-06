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
import { mapData, watchBoard } from './board.mjs';

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

const clients = new Set();
watchBoard(board, () => {
  for (const res of clients) res.write('event: change\ndata: {}\n\n');
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(path.join(here, 'map.html')));
  } else if (url.pathname === '/data') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(mapData(board)));
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
