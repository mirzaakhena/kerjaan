// The viewer's server: every project under one scanned folder, each at its own
// address. Built here, started by server.mjs, so the tests can start it too.
//
// Read-only. Nothing a request carries is ever joined onto a file path: a
// project name is accepted only when it equals a folder name the scan just
// listed, a ticket only by an ID found on that board, and a page or asset only
// by a name in the fixed list below. A crafted address therefore has nothing
// to point at outside what the scan already found.
//
// The addresses:
//   /                              the front page: every project
//   /api/projects                  the projects, with their counts per status
//   /assets/<name>                 a stylesheet or script from ASSETS
//   /<project>/                    the project's kanban
//   /<project>/ticket/<id>         the kanban with that ticket open
//   /<project>/order               the kanban with order.md open
//   /<project>/api/board           every card, without the tickets' text
//   /<project>/api/order           order.md, and the files its groups share
//   /<project>/api/ticket/<id>     one ticket in full
//   /<project>/api/agent/<id>      the agent on one ticket, with its steps
//   /<project>/api/progress/<id>   the test runs going on for one ticket, with
//                                  their latest output and, when the project
//                                  reports them, their tests (see runs.mjs)
//   /<project>/events              live changes (server-sent events)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUSES, readBoard, watchBoard, sharedInGroups } from '../skills/kerjaan/scripts/board.mjs';
import { readAgents, summary, defaultClaudeDir } from './agents.mjs';
import { AGENT_STATUSES } from './web/agent.js';
import { unmergedBranches } from './unmerged.mjs';
import { readRuns } from './runs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, 'web');

// How often, while a page is open, the agents' logs are looked at.
const AGENT_POLL = 2000;

const ASSETS = {
  'style.css': 'text/css; charset=utf-8',
  'home.js': 'text/javascript; charset=utf-8',
  'project.js': 'text/javascript; charset=utf-8',
  'markdown.js': 'text/javascript; charset=utf-8',
  'filter.js': 'text/javascript; charset=utf-8',
  'pills.js': 'text/javascript; charset=utf-8',
  'drawer.js': 'text/javascript; charset=utf-8',
  'agent.js': 'text/javascript; charset=utf-8',
  'run.js': 'text/javascript; charset=utf-8',
  'common.js': 'text/javascript; charset=utf-8',
  'archive.js': 'text/javascript; charset=utf-8',
  'switcher.js': 'text/javascript; charset=utf-8',
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
  const html = fs.readFileSync(path.join(web, 'not-found.html'), 'utf8').replace('{{WHAT}}', esc(what));
  send(res, 404, 'text/html; charset=utf-8', html);
}

// The tickets an agent may be at work on: those in progress or in review,
// by ID, read off the file names alone.
function activeIds(project) {
  const ids = new Map();
  for (const status of AGENT_STATUSES) {
    try {
      for (const f of fs.readdirSync(path.join(project.board, status))) {
        const id = f.match(/^(\d{12})\b.*\.md$/)?.[1];
        if (id && !ids.has(id)) ids.set(id, status);
      }
    } catch {
      // A missing status folder simply holds nothing.
    }
  }
  return ids;
}

const projectDir = (project) => path.dirname(project.board);

// The agents on a project's active tickets: Map<id, agent>, or empty when
// Claude Code's logs are missing or unreadable.
const agentsOf = (project, claudeDir) => readAgents(projectDir(project), { claudeDir, ids: [...activeIds(project).keys()] });

// The test runs going on for the active tickets: Map<id, run[]>, without
// their output unless `withLines` (see runs.mjs).
const runsOf = (project, withLines = false, ids = [...activeIds(project).keys()]) => readRuns(projectDir(project), { ids, withLines });
const runSummaries = (project) => Object.fromEntries(runsOf(project));

// Branches holding work outside the main line, by the ticket ID they carry:
// Map<id, branch names[]> (see unmerged.mjs). Only done tickets are marked with
// them; a board with none skips git altogether.
const unmergedFor = (project, tickets) =>
  (tickets.some((t) => t.status === 'done') ? unmergedBranches(projectDir(project), project.board) : Promise.resolve(new Map()));

// The kanban needs every card but no ticket's full text; the text is fetched
// one ticket at a time when a card is opened. Tickets in progress or in review
// carry what their agent last did, without the step list, and their test runs
// going on, without their output; tickets in done
// whose branch is not merged into main carry that branch's name.
async function boardSummary(project, claudeDir) {
  const data = readBoard(project.board);
  const agents = agentsOf(project, claudeDir);
  const runs = runsOf(project);
  const unmerged = await unmergedFor(project, data.tickets);
  return {
    name: project.name,
    readAt: data.readAt,
    statuses: STATUSES,
    hasOrder: data.hasOrder,
    order: data.order,
    places: data.places,
    tickets: data.tickets.map(({ body, meta, ...t }) => {
      const a = AGENT_STATUSES.includes(t.status) && agents.get(t.id);
      if (a) t.agent = summary(a);
      if (AGENT_STATUSES.includes(t.status) && runs.has(t.id)) t.runs = runs.get(t.id);
      if (t.status === 'done' && unmerged.has(t.id)) t.unmerged = unmerged.get(t.id);
      return t;
    }),
  };
}

const agentSummaries = (project, claudeDir) => Object.fromEntries([...agentsOf(project, claudeDir)].map(([id, a]) => [id, summary(a)]));

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

// claudeDir: where Claude Code keeps its logs (its `projects/` folder is read);
// the tests point it at a made-up one.
export function createViewer({ root, claudeDir = defaultClaudeDir() }) {
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
      const unwatch = watchBoard(project.board, () => {
        for (const c of clients) c.write('event: change\ndata: {}\n\n');
      });
      // Agents write to Claude Code's logs, not to the board, so those are
      // looked at every AGENT_POLL ms; the page hears only of a change.
      let last = JSON.stringify(agentSummaries(project, claudeDir));
      // Test runs write their output under .git/, so they are looked at on
      // the same beat; the page hears what runs there are and how far each
      // has got, and fetches the output of the ticket it has open.
      let lastRuns = JSON.stringify(runSummaries(project));
      // A branch merged or deleted changes git, not the board, so the
      // unmerged branches are looked at on the same beat (one git call, none
      // for a folder that is not a repository); when they change the page
      // reads the board again. A ticket moving changes the board, which the
      // watcher already reports.
      const branchKey = async () => JSON.stringify([...await unmergedBranches(projectDir(project), project.board)]);
      let lastBranches = null;
      let checking = false;
      branchKey().then((k) => { lastBranches ??= k; });
      const poll = setInterval(async () => {
        const now = JSON.stringify(agentSummaries(project, claudeDir));
        if (now !== last) {
          last = now;
          for (const c of clients) c.write(`event: agent\ndata: ${now}\n\n`);
        }
        const runs = JSON.stringify(runSummaries(project));
        if (runs !== lastRuns) {
          lastRuns = runs;
          for (const c of clients) c.write(`event: progress\ndata: ${runs}\n\n`);
        }
        if (checking) return;
        checking = true;
        try {
          const k = await branchKey();
          if (lastBranches !== null && k !== lastBranches) for (const c of clients) c.write('event: change\ndata: {}\n\n');
          lastBranches = k;
        } finally {
          checking = false;
        }
      }, AGENT_POLL);
      const stop = () => { clearInterval(poll); unwatch(); };
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
      send(res, 405, 'text/plain; charset=utf-8', 'This viewer only reads.');
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    let parts;
    try {
      parts = url.pathname.split('/').slice(1).map(decodeURIComponent);
    } catch {
      notFound(res, 'This address');
      return;
    }

    if (url.pathname === '/') return page(res, 'home.html');
    if (url.pathname === '/api/projects') {
      return json(res, findProjects(root).map((p) => ({ name: p.name, counts: counts(p) })));
    }
    if (parts[0] === 'assets' && parts.length === 2 && Object.hasOwn(ASSETS, parts[1])) {
      return send(res, 200, ASSETS[parts[1]], fs.readFileSync(path.join(web, parts[1])));
    }

    const project = findProjects(root).find((p) => p.name === parts[0]);
    if (!project) return notFound(res, `Project "${parts[0]}"`);
    const rest = parts.slice(1);
    const at = rest.join('/');

    // Pages resolve their data relative to the project's own address, which
    // only works with the trailing slash.
    if (rest.length === 0) {
      res.writeHead(301, { location: url.pathname + '/' });
      return res.end();
    }
    if (at === '') return page(res, 'project.html');
    if (rest[0] === 'ticket' && rest.length === 2 && /^\d{12}$/.test(rest[1])) return page(res, 'project.html');
    if (at === 'order') return page(res, 'project.html');
    if (at === 'api/board') {
      boardSummary(project, claudeDir).then((data) => json(res, data), () => send(res, 500, 'text/plain; charset=utf-8', 'The board cannot be read.'));
      return;
    }
    if (at === 'api/order') {
      const file = path.join(project.board, 'order.md');
      if (!fs.existsSync(file)) return send(res, 404, 'application/json; charset=utf-8', JSON.stringify({ error: 'not found' }));
      // With the text, the files each group's tickets share by their
      // estimates, read fresh from the tickets on every request.
      const text = fs.readFileSync(file, 'utf8');
      return json(res, { text, shared: sharedInGroups(text, readBoard(project.board).tickets) });
    }
    if (rest[0] === 'api' && rest[1] === 'ticket' && rest.length === 3 && /^\d{12}$/.test(rest[2])) {
      const ticket = readBoard(project.board).tickets.filter((t) => t.id === rest[2]);
      if (ticket.length === 0) return send(res, 404, 'application/json; charset=utf-8', JSON.stringify({ error: 'not found' }));
      const active = AGENT_STATUSES.includes(ticket[0].status);
      const a = active && agentsOf(project, claudeDir).get(rest[2]);
      const runs = active && runsOf(project, true, [rest[2]]).get(rest[2]);
      if (!a && !runs) return json(res, ticket);
      return json(res, [{ ...ticket[0], ...(a ? { agent: a } : {}), ...(runs ? { runs } : {}) }, ...ticket.slice(1)]);
    }
    if (rest[0] === 'api' && rest[1] === 'progress' && rest.length === 3 && /^\d{12}$/.test(rest[2])) {
      return json(res, { runs: activeIds(project).has(rest[2]) ? runsOf(project, true, [rest[2]]).get(rest[2]) || [] : [] });
    }
    if (rest[0] === 'api' && rest[1] === 'agent' && rest.length === 3 && /^\d{12}$/.test(rest[2])) {
      return json(res, { agent: activeIds(project).has(rest[2]) ? agentsOf(project, claudeDir).get(rest[2]) || null : null });
    }
    if (at === 'events') return listen(project, req, res);
    return notFound(res, 'This page');
  });

  server.on('close', () => {
    for (const entry of listeners.values()) entry.stop();
    listeners.clear();
  });
  return server;
}
