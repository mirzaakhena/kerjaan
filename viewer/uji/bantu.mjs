// Temporary boards and a running viewer for the tests.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createViewer } from '../app.mjs';

export function ticket({ type = 'task', priority = 'medium', labels = '', related = '', blocked = '', created = '2026-10-01 10:00:00', updated, body = '## Background\nx\n\n## Notes\n(none yet)' } = {}) {
  return `---\ntype: ${type}\npriority: ${priority}\nreview:\nlabels: [${labels}]\nreporter: t\nassign_to:\ncreated: ${created}\nupdated: ${updated || created}\nrelated: [${related}]\nblocked_by: [${blocked}]\n---\n\n${body}\n`;
}

// files: { 'todo/260101000001 Judul.md': '<text>', 'order.md': '...' }
export function makeBoard(root, name, files = {}) {
  const board = path.join(root, name, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) fs.mkdirSync(path.join(board, s), { recursive: true });
  for (const [rel, text] of Object.entries(files)) fs.writeFileSync(path.join(board, rel), text);
  return board;
}

export function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-viewer-'));
}

export async function startViewer(root) {
  const server = createViewer({ root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    server,
    get: (p, opts) => fetch(base + p, { redirect: 'manual', ...opts }),
    // A raw GET that sends the path exactly as written, so `..` and encoded
    // slashes reach the server instead of being tidied by fetch.
    raw: (p) => new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: server.address().port, path: p }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    }),
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
}

// Collects a server-sent event stream until `until(text)` holds or time runs out.
export function listenEvents(url, until, ms = 4000) {
  return new Promise((resolve) => {
    let text = '';
    const req = http.get(url, (res) => {
      res.on('data', (c) => {
        text += c;
        if (until(text)) { req.destroy(); resolve({ text, ok: true }); }
      });
    });
    req.on('error', () => {});
    setTimeout(() => { req.destroy(); resolve({ text, ok: false }); }, ms);
    resolve.req = req;
  });
}
