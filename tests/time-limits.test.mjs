// The board's test_command always finishes: a test that hangs is stopped by
// its time limit and reported failed, and a file that leaves a server open
// still exits, so the suite never waits forever.
//
// Runs the command exactly as .kerjaan/settings.md has it, against a
// throwaway test file, with only the time limit shortened.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// A linked worktree has no .kerjaan/ of its own (the board has one home, in
// the main tree), so there the settings are read from the main tree.
function settingsFile() {
  const own = path.join(here, '..', '.kerjaan', 'settings.md');
  if (fs.existsSync(own)) return own;
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: here, encoding: 'utf8' }).trim();
  return path.join(path.dirname(common), '.kerjaan', 'settings.md');
}
const settings = fs.readFileSync(settingsFile(), 'utf8');
const command = settings.match(/^test_command:\s*(.*)$/m)?.[1].trim() ?? '';

// A hung test: it holds a server open and waits on something that never
// comes; the other test in the file is healthy.
const HANGING = `
import test from 'node:test';
import http from 'node:http';
test('healthy', () => {});
test('stuck', async () => {
  const server = http.createServer(() => {});
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  await new Promise(() => {});
  server.close();
});
`;

// Today's case: a test that fails at once but leaves a server open behind it,
// as a viewer test did when closing Chrome threw before closing its server.
const LEAKING = `
import test from 'node:test';
import http from 'node:http';
test('failed, server left open', async () => {
  const server = http.createServer(() => {});
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  throw new Error('ENOTEMPTY');
});
`;

// Runs test_command on one throwaway test file, its time limit set to
// `limitMs`; resolves { code, out, ms }, or { hung } after `giveUpMs`.
async function runCommand(source, limitMs, giveUpMs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-limit-'));
  try {
    fs.writeFileSync(path.join(dir, 'sample.test.mjs'), source);
    const args = command.split(/\s+/).slice(1).map((a) => (a.startsWith('--test-timeout=') ? `--test-timeout=${limitMs}` : a));
    // Without this variable the inner run believes it is part of this one.
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const start = Date.now();
    const child = spawn(process.execPath, args, { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (out += c));
    let timer;
    const result = await Promise.race([
      new Promise((r) => child.once('exit', (code) => r({ code }))),
      new Promise((r) => { timer = setTimeout(() => r({ hung: true }), giveUpMs); }),
    ]);
    clearTimeout(timer);
    if (result.hung) child.kill('SIGKILL');
    return { ...result, out, ms: Date.now() - start };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('test_command uses node --test with a time limit and a forced exit', () => {
  const args = command.split(/\s+/);
  assert.deepEqual(args.slice(0, 2), ['node', '--test'], command);
  assert.ok(args.some((a) => /^--test-timeout=\d+$/.test(a)), `no --test-timeout: ${command}`);
  assert.ok(args.includes('--test-force-exit'), `no --test-force-exit: ${command}`);
});

test('a stuck test is stopped by the time limit, reported failed, and the suite finishes', async () => {
  const r = await runCommand(HANGING, 1500, 60000);
  assert.equal(r.hung, undefined, `the suite did not finish within 60 seconds:\n${r.out}`);
  assert.notEqual(r.code, 0, r.out);
  // Reported as the test or as its file, whichever limit node reaches first.
  assert.match(r.out, /not ok \d+ - (stuck|sample\.test\.mjs)\n/);
  assert.match(r.out, /timed out after 1500ms/);
  assert.match(r.out, /^ok \d+ - healthy/m);
});

test('a failed test with a server still open finishes without waiting for the time limit', async () => {
  // A limit far longer than the run may take: only leaving at once passes.
  const r = await runCommand(LEAKING, 45000, 60000);
  assert.equal(r.hung, undefined, `the suite did not finish within 60 seconds:\n${r.out}`);
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /not ok \d+ - failed, server left open/);
  assert.doesNotMatch(r.out, /timed out/);
  assert.ok(r.ms < 30000, `finished only after ${r.ms} ms`);
});
