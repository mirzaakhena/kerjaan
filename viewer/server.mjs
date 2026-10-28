#!/usr/bin/env node
// Starts the viewer: every project with a .kerjaan/ board directly under the
// scanned folder, each at http://127.0.0.1:<port>/<folder name>/.
//
//   node viewer/server.mjs --scan ~/Workspace [--project <name>] [--port 4321] [--lan] [--open]
//
// --project only picks the address printed and opened: that project's kanban
// rather than the front page.
//
// --lan also lets other devices on the same network (a phone on the same
// Wi-Fi) open it, at this machine's network address, which it prints. There
// is no key: anyone on that network can read the boards while it runs.
//
// Tickets in progress and in review also show what their Claude Code agent is
// doing, read from the logs under $CLAUDE_CONFIG_DIR (default ~/.claude)/projects;
// see agents.mjs. Without those logs the board looks as it always did.
// A test run going on through test-run.sh shows its output so far, read from
// the copy it keeps under .git/kerjaan-progress/ while it runs; see runs.mjs.
//
// Read-only: it never writes to any board. No dependencies beyond Node 18+.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createViewer, findProjects } from './app.mjs';
import { lanLines } from './lan.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};

const scan = option('--scan');
if (!scan) {
  console.error('Usage: node viewer/server.mjs --scan <folder> [--project <name>] [--port 4321] [--lan] [--open]');
  console.error('  <folder>  the folder whose subfolders are searched for .kerjaan/');
  process.exit(1);
}
const root = path.resolve(scan.replace(/^~(?=$|\/)/, os.homedir()));
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Folder not found: ${root}`);
  process.exit(1);
}
const port = Number(option('--port') ?? 4321);
const project = option('--project');
const lan = args.includes('--lan');

const server = createViewer({ root });
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Pick another with --port <number>, or --port 0 for any free one.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

// Loopback only unless --lan: ticket bodies are the repos' private notes.
server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  const at = (host) => `http://${host}:${server.address().port}/${project ? `${encodeURIComponent(project)}/` : ''}`;
  const address = at('127.0.0.1');
  console.log(`kerjaan viewer: ${address}`);
  if (lan) for (const line of lanLines(at)) console.log(line);
  const projects = findProjects(root);
  console.log(`scanning ${root} — ${projects.length} project${projects.length === 1 ? '' : 's'}: ${projects.map((p) => p.name).join(', ') || '(none yet)'}`);
  if (args.includes('--open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(opener, [address], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
  }
});
