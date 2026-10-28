// The board's test_command always finishes: a test that hangs is stopped by
// its time limit and reported failed, and a file that leaves a server open
// still exits, so the suite never waits forever. And a run that passes ran
// every test: none is lost on the way out, and a file that ends before its
// tests have finished fails (261017222801, tests/complete-runs.mjs).
//
// Runs the command exactly as .kerjaan/settings.md has it, against throwaway
// test files, with only the time limit shortened.

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

// A passing test that leaves a server open behind it.
const LEFT_OPEN = `
import test from 'node:test';
import http from 'node:http';
test('passed, server left open', async () => {
  const server = http.createServer(() => {});
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
});
`;

// A file whose process ends half-way, with status 0, the way a stray
// process.exit() in a test or in the code under test ends it.
const ENDS_EARLY = `
import test from 'node:test';
test('first', () => {});
test('second, which ends the process', () => { process.exit(0); });
test('third, never run', () => {});
`;

// Many quick tests with long names in several files: enough output that, with
// --test-force-exit, results still on their way to the runner were dropped.
const MANY_FILES = 6;
const MANY_TESTS = 400;
const many = (f) => `import test from 'node:test';\n` +
  Array.from({ length: MANY_TESTS }, (_, i) => `test('file ${f} test ${i} ${'x'.repeat(200)}', () => {});\n`).join('');

// Paths the command gives relative to the top of the repository (the
// --import of tests/complete-runs.mjs, the reporter that lists each test on
// the board), made absolute so they still hold in the throwaway folder the
// command runs in.
const top = path.join(here, '..');
const absolute = (a) => a.replace(/^(--import=|--test-reporter=)(\.\.?\/.*)$/, (_, flag, rel) => flag + path.join(top, rel));

// Runs test_command on throwaway test files — one source, or { name: source } —
// its time limit set to `limitMs`; resolves { code, out, ms }, or { hung } after
// `giveUpMs`.
async function runCommand(source, limitMs, giveUpMs) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-limit-'));
  try {
    const files = typeof source === 'string' ? { 'sample.test.mjs': source } : source;
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
    const args = command.split(/\s+/).slice(1).map((a) => (a.startsWith('--test-timeout=') ? `--test-timeout=${limitMs}` : absolute(a)));
    // Without this variable the inner run believes it is part of this one;
    // without the other, its tests would be listed on the board as this run's.
    const env = { ...process.env, KERJAAN_TEST_REPORT: '' };
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

test('test_command uses node --test with a time limit and tests/complete-runs.mjs, not --test-force-exit', () => {
  const args = command.split(/\s+/);
  assert.deepEqual(args.slice(0, 2), ['node', '--test'], command);
  assert.ok(args.some((a) => /^--test-timeout=\d+$/.test(a)), `no --test-timeout: ${command}`);
  assert.ok(args.includes('--import=./tests/complete-runs.mjs'), `no --import=./tests/complete-runs.mjs: ${command}`);
  assert.ok(!args.includes('--test-force-exit'), `--test-force-exit loses results: ${command}`);
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

test('a passed test with a server still open: the run ends soon after, and passes', async () => {
  const r = await runCommand(LEFT_OPEN, 45000, 60000);
  assert.equal(r.hung, undefined, `the suite did not finish within 60 seconds:\n${r.out}`);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^ok \d+ - passed, server left open/m);
  assert.match(r.out, /still held the process/);
  assert.ok(r.ms < 30000, `finished only after ${r.ms} ms`);
});

test('a file that ends before its tests have finished fails the run, though it exited 0', async () => {
  const r = await runCommand(ENDS_EARLY, 45000, 60000);
  assert.equal(r.hung, undefined, `the suite did not finish within 60 seconds:\n${r.out}`);
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /^not ok \d+ - .*sample\.test\.mjs$/m);
  assert.match(r.out, /ended before its tests had finished/);
  assert.match(r.out, /^# fail [1-9]/m);
  assert.doesNotMatch(r.out, /third, never run/);
});

test(`every test is counted, five runs in a row: ${MANY_FILES} files of ${MANY_TESTS} tests`, async () => {
  const files = Object.fromEntries(Array.from({ length: MANY_FILES }, (_, f) => [`many-${f}.test.mjs`, many(f)]));
  const total = MANY_FILES * MANY_TESTS;
  for (let run = 1; run <= 5; run++) {
    const r = await runCommand(files, 45000, 120000);
    assert.equal(r.hung, undefined, `run ${run} did not finish within 120 seconds`);
    const counted = (name) => r.out.match(new RegExp(`^# ${name} (\\d+)$`, 'm'))?.[1];
    assert.equal(r.code, 0, `run ${run} exited ${r.code}: ${r.out.slice(-2000)}`);
    assert.equal(counted('tests'), String(total), `run ${run}: the summary is missing or short: ${r.out.slice(-600)}`);
    assert.equal(counted('pass'), String(total), `run ${run}`);
    assert.equal(r.out.match(/^ok \d+ - file /gm)?.length, total, `run ${run}: not every result was printed`);
  }
});
