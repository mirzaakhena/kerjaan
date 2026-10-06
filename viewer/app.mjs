// The viewer's server: every project under one scanned folder, each at its own
// address. Built here, started by server.mjs, so the tests can start it too.
//
// Read-only. Nothing a request carries is ever joined onto a file path: a
// project name is accepted only when it equals a folder name the scan just
// listed, a ticket only by an ID found on that board, and a page or asset only
// by a name in the fixed list below. A crafted address therefore has nothing
// to point at outside what the scan already found.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUSES, readBoard, mapData, watchBoard } from '../skills/kerjaan/scripts/board.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, 'web');
const mapHtml = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'map.html');

const ASSETS = {
  'gaya.css': 'text/css; charset=utf-8',
  'beranda.js': 'text/javascript; charset=utf-8',
  'proyek.js': 'text/javascript; charset=utf-8',
  'markdown.js': 'text/javascript; charset=utf-8',
  'saring.js': 'text/javascript; charset=utf-8',
  'umum.js': 'text/javascript; charset=utf-8',
};

// Projects are found fresh on every request, so a board created after the
// server started shows up without a restart.
export function findProjects(root) {
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .filter((e) => {
      try {
        return fs.statSync(path.join(root, e.name, '.kerjaan')).isDirectory();
      } catch {
        return false;
      }
    })
    .map((e) => ({ name: e.name, board: path.join(root, e.name, '.kerjaan') }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}
const json = (res, data) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(data));
const page = (res, file) => send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(web, file)));

function notFound(res, what) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const html = fs.readFileSync(path.join(web, 'tidak-ada.html'), 'utf8').replace('{{APA}}', esc(what));
  send(res, 404, 'text/html; charset=utf-8', html);
}

// The kanban needs every card but no ticket's full text; the text is fetched
// one ticket at a time when a card is opened.
function boardSummary(project) {
  const data = readBoard(project.board);
  return {
    name: project.name,
    readAt: data.readAt,
    statuses: STATUSES,
    hasOrder: data.hasOrder,
    order: data.order,
    tickets: data.tickets.map(({ body, meta, ...t }) => t),
  };
}

function counts(project) {
  const n = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const status of STATUSES) {
    try {
      n[status] = fs.readdirSync(path.join(project.board, status)).filter((f) => f.endsWith('.md')).length;
    } catch {
      // A missing status folder simply holds nothing.
    }
  }
  return n;
}

export function createViewer({ root }) {
  // One watcher per project, alive only while somebody is listening.
  const listeners = new Map();

  function listen(project, req, res) {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write('retry: 1500\n\n');
    let entry = listeners.get(project.board);
    if (!entry) {
      const clients = new Set();
      const stop = watchBoard(project.board, () => {
        for (const c of clients) c.write('event: change\ndata: {}\n\n');
      });
      entry = { clients, stop };
      listeners.set(project.board, entry);
    }
    entry.clients.add(res);
    const beat = setInterval(() => res.write(': beat\n\n'), 25000);
    req.on('close', () => {
      clearInterval(beat);
      entry.clients.delete(res);
      if (entry.clients.size === 0) {
        entry.stop();
        listeners.delete(project.board);
      }
    });
  }

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'text/plain; charset=utf-8', 'Viewer ini hanya membaca.');
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    let parts;
    try {
      parts = url.pathname.split('/').slice(1).map(decodeURIComponent);
    } catch {
      notFound(res, 'Alamat ini');
      return;
    }

    if (url.pathname === '/') return page(res, 'beranda.html');
    if (url.pathname === '/api/proyek') {
      return json(res, findProjects(root).map((p) => ({ name: p.name, counts: counts(p) })));
    }
    if (parts[0] === 'aset' && parts.length === 2 && Object.hasOwn(ASSETS, parts[1])) {
      return send(res, 200, ASSETS[parts[1]], fs.readFileSync(path.join(web, parts[1])));
    }

    const project = findProjects(root).find((p) => p.name === parts[0]);
    if (!project) return notFound(res, `Proyek "${parts[0]}"`);
    const rest = parts.slice(1);
    const at = rest.join('/');

    // Pages resolve their data relative to the project's own address, which
    // only works with the trailing slash.
    if (rest.length === 0 || (rest.length === 1 && rest[0] === 'map')) {
      res.writeHead(301, { location: url.pathname + '/' });
      return res.end();
    }
    if (at === '') return page(res, 'proyek.html');
    if (rest[0] === 'tiket' && rest.length === 2 && /^\d{12}$/.test(rest[1])) return page(res, 'proyek.html');
    if (at === 'urutan') return page(res, 'proyek.html');
    if (at === 'api/papan') return json(res, boardSummary(project));
    if (at === 'api/urutan') {
      const file = path.join(project.board, 'order.md');
      if (!fs.existsSync(file)) return send(res, 404, 'application/json; charset=utf-8', JSON.stringify({ error: 'tidak ada' }));
      return json(res, { text: fs.readFileSync(file, 'utf8') });
    }
    if (rest[0] === 'api' && rest[1] === 'tiket' && rest.length === 3 && /^\d{12}$/.test(rest[2])) {
      const ticket = readBoard(project.board).tickets.filter((t) => t.id === rest[2]);
      if (ticket.length === 0) return send(res, 404, 'application/json; charset=utf-8', JSON.stringify({ error: 'tidak ada' }));
      return json(res, ticket);
    }
    if (at === 'events' || at === 'map/events') return listen(project, req, res);
    if (at === 'map/') {
      return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(mapHtml));
    }
    if (at === 'map/data') return json(res, mapData(project.board));
    return notFound(res, 'Halaman ini');
  });

  server.on('close', () => {
    for (const entry of listeners.values()) entry.stop();
    listeners.clear();
  });
  return server;
}
