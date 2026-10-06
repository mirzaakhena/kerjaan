#!/usr/bin/env node
// Starts the viewer: every project with a .kerjaan/ board directly under the
// scanned folder, each at http://127.0.0.1:<port>/<folder name>/.
//
//   node viewer/server.mjs --scan ~/Workspace [--port 4321] [--open]
//
// Read-only: it never writes to any board. No dependencies beyond Node 18+.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createViewer, findProjects } from './app.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};

const scan = option('--scan');
if (!scan) {
  console.error('Pakai: node viewer/server.mjs --scan <folder> [--port 4321] [--open]');
  console.error('  <folder>  folder yang subfoldernya dipindai mencari .kerjaan/');
  process.exit(1);
}
const root = path.resolve(scan.replace(/^~(?=$|\/)/, os.homedir()));
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Folder tidak ditemukan: ${root}`);
  process.exit(1);
}
const port = Number(option('--port') ?? 4321);

const server = createViewer({ root });
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${port} sudah dipakai. Pilih yang lain dengan --port <angka>, atau --port 0 untuk acak.`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});

// Loopback only: ticket bodies are the repos' private notes.
server.listen(port, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`kerjaan viewer: ${address}`);
  const projects = findProjects(root);
  console.log(`memindai ${root} — ${projects.length} proyek: ${projects.map((p) => p.name).join(', ') || '(belum ada)'}`);
  if (args.includes('--open')) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(opener, [address], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref();
  }
});
