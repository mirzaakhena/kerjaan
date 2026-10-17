// Temporary boards and a running viewer for the tests.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createViewer } from '../app.mjs';

export function ticket({ type = 'task', priority = 'medium', labels = '', related = '', blocked = '', created = '2026-10-01 10:00:00', updated, body = '## Background\nx\n\n## Notes\n(none yet)' } = {}) {
  return `---\ntype: ${type}\npriority: ${priority}\nreview:\nlabels: [${labels}]\nreporter: t\nassign_to:\ncreated: ${created}\nupdated: ${updated || created}\nrelated: [${related}]\nblocked_by: [${blocked}]\n---\n\n${body}\n`;
}

// files: { 'todo/260101000001 Title.md': '<text>', 'order.md': '...' }
export function makeBoard(root, name, files = {}) {
  const board = path.join(root, name, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) fs.mkdirSync(path.join(board, s), { recursive: true });
  for (const [rel, text] of Object.entries(files)) fs.writeFileSync(path.join(board, rel), text);
  return board;
}

export function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-viewer-'));
}

// claudeDir defaults to a folder that does not exist, so no test ever reads
// the real ~/.claude.
export async function startViewer(root, { claudeDir = path.join(root, '.no-claude') } = {}) {
  const server = createViewer({ root, claudeDir });
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

// Runs viewer/server.mjs as the owner would, collecting what it prints.
export function runCli(args) {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url)), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (c) => (out += c));
  child.stderr.on('data', (c) => (err += c));
  const exited = new Promise((r) => child.on('exit', (code) => r(code)));
  return { child, exited, out: () => out, err: () => err };
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

// ---------- made-up Claude Code agent logs ----------
// Shaped like what Claude Code 2.1.30x writes: see viewer/agents.mjs.

export const encodeProject = (dir) => dir.replace(/[^a-zA-Z0-9]/g, '-');

const iso = (at) => new Date(at).toISOString();

// Log lines. `at` is a time in ms.
export const line = {
  prompt: (at, text) => ({ parentUuid: null, isSidechain: true, type: 'user', message: { role: 'user', content: text }, timestamp: iso(at) }),
  step: (at, name, input = {}) => ({ isSidechain: true, type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: `toolu_${at}`, name, input }], stop_reason: null }, timestamp: iso(at) }),
  think: (at, thinking) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'thinking', thinking, signature: 'x' }] }, timestamp: iso(at) }),
  say: (at, text, stop = null) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text }], stop_reason: stop }, timestamp: iso(at) }),
  result: (at, text) => ({ type: 'user', message: { role: 'user', content: [{ tool_use_id: 'toolu_x', type: 'tool_result', content: [{ type: 'text', text }] }] }, toolUseResult: { stdout: text }, timestamp: iso(at) }),
  interrupt: (at) => ({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: '[Request interrupted by user]' }] }, timestamp: iso(at) }),
  request: (at, body) => ({ type: 'api-request', timestamp: iso(at), params: { messages: body } }),
};

// Writes one agent's pair of files; returns the log's path, for appending.
export function agentLog(claudeDir, projectDir, { session = 'session-1', id, agentType = 'kerjaan:kerjaan-worker', description, finished, lines = [], meta } = {}) {
  const dir = path.join(claudeDir, 'projects', encodeProject(projectDir), session, 'subagents');
  fs.mkdirSync(dir, { recursive: true });
  const m = meta ?? JSON.stringify({ agentType, launchedWithDefaults: true, description, toolUseId: 'toolu_1', spawnDepth: 1, ...(finished ? { finished: true } : {}) });
  fs.writeFileSync(path.join(dir, `agent-${id}.meta.json`), m);
  const log = path.join(dir, `agent-${id}.jsonl`);
  fs.writeFileSync(log, lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l)) + '\n').join(''));
  return log;
}

export const appendLog = (log, ...lines) => fs.appendFileSync(log, lines.map((l) => JSON.stringify(l) + '\n').join(''));
