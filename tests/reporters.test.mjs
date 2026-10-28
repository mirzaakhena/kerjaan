// The connector between `node --test` and the board's per-test list
// (261028121401): skills/kerjaan/scripts/reporters/node.mjs writes each
// test's start and end, in the format SETTINGS.md sets out, to the file in
// KERJAAN_TEST_REPORT. It must never change the run it reports on: its exit
// status and what it prints stay those of `node --test` without it.
//
// Every test runs the real `node --test` on small test files written for it,
// the way a project's test_command runs it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readTestLines } from '../viewer/runs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const reporter = path.join(root, 'skills', 'kerjaan', 'scripts', 'reporters', 'node.mjs');
const completeRuns = path.join(here, 'complete-runs.mjs');

// The command SETTINGS.md gives a project, word for word.
const guideCommand = () => {
  const block = fs.readFileSync(path.join(root, 'skills', 'kerjaan', 'SETTINGS.md'), 'utf8')
    .split('## Reporting each test to the board')[1].match(/```\n(node --test [^\n]+)\n```/);
  assert.ok(block, 'SETTINGS.md gives the command for node --test');
  return block[1];
};

const FILES = {
  'a.test.mjs': `import test, { describe, it } from 'node:test';
test('adds two numbers', () => {});
test('a test that fails', () => { throw new Error('no'); });
test.skip('not today', () => {});
test.todo('some day', () => { throw new Error('todo fails do not count'); });
describe('a cart', () => {
  it('starts empty', () => {});
  describe('with one item', () => { it('costs its price', () => {}); });
});
test('a test with subtests', async (t) => {
  await t.test('one subtest', () => {});
  await t.test('a failing subtest', () => { throw new Error('no'); });
});
test('a parent failing on its own', async (t) => {
  await t.test('its subtest passes', () => {});
  throw new Error('after its subtest');
});
`,
  'b.test.mjs': `import test from 'node:test';
test('same name', () => {});
test('same name', () => { throw new Error('the second one fails'); });
`,
  'crash.test.mjs': `throw new Error('cannot load');
`,
  'early.test.mjs': `import test from 'node:test';
test('before the exit', () => {});
test('ends the process', async () => { await new Promise((r) => setTimeout(r, 30)); process.exit(0); });
test('never runs', () => {});
`,
  'fine.test.mjs': `import test from 'node:test';
test('a passing test', () => {});
`,
};

function project(files = FILES) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-reporter-')));
  fs.mkdirSync(path.join(dir, 'test'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'test', name), text);
  return dir;
}

// The environment of a `node --test` started from a test, not taken for a
// file of this run.
const outside = (env = {}) => {
  const e = { ...process.env, KERJAAN_TEST_REPORT: '', KERJAAN_NODE_REPORTER: '', ...env };
  delete e.NODE_TEST_CONTEXT;
  return e;
};

// Runs `bash -c <command>` in <dir>, as test-run.sh does, with the variables
// test-run.sh sets.
function run(dir, command, env = {}) {
  const r = spawnSync('bash', ['-c', command], { cwd: dir, encoding: 'utf8', env: outside(env) });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const lines = (file) => fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const withReporter = (files) => `node --test --import=${completeRuns} --test-reporter=tap --test-reporter-destination=stdout --test-reporter=${reporter} --test-reporter-destination=/dev/null ${files}`;

test('each test is reported as it starts and as it ends, named as its author wrote it, after the suites and tests it sits in', () => {
  const dir = project();
  const report = path.join(dir, 'report.tests');
  const r = run(dir, withReporter('test/a.test.mjs test/b.test.mjs test/crash.test.mjs test/early.test.mjs test/fine.test.mjs'), { KERJAAN_TEST_REPORT: report });
  assert.equal(r.code, 1, r.err);
  const all = lines(report);
  for (const l of all) {
    assert.equal(typeof l.file, 'string');
    assert.ok(['start', 'end', 'pass', 'fail', 'skip', 'group'].includes(l.state), JSON.stringify(l));
    assert.ok(!l.file.startsWith('/'), `the file as the project names it: ${l.file}`);
  }
  const of = (file, name) => all.filter((l) => l.file === `test/${file}` && l.name === name).map((l) => l.state);
  // Each kind of test, once each.
  assert.deepEqual(of('a.test.mjs', 'adds two numbers'), ['start', 'pass']);
  assert.deepEqual(of('a.test.mjs', 'a test that fails'), ['start', 'fail']);
  assert.deepEqual(of('a.test.mjs', 'not today'), ['start', 'skip']);
  assert.deepEqual(of('a.test.mjs', 'some day'), ['start', 'skip'], 'a todo test that fails is no failure');
  assert.deepEqual(of('a.test.mjs', 'a cart'), ['start', 'group'], 'a suite is a group, ending with no line of its own');
  assert.deepEqual(of('a.test.mjs', 'a cart > starts empty'), ['start', 'pass']);
  assert.deepEqual(of('a.test.mjs', 'a cart > with one item'), ['start', 'group']);
  assert.deepEqual(of('a.test.mjs', 'a cart > with one item > costs its price'), ['start', 'pass']);
  assert.deepEqual(of('a.test.mjs', 'a test with subtests'), ['start', 'group'], 'failed because a subtest did: only the subtest is red');
  assert.deepEqual(of('a.test.mjs', 'a test with subtests > a failing subtest'), ['start', 'fail']);
  assert.deepEqual(of('a.test.mjs', 'a parent failing on its own'), ['start', 'group', 'fail'], 'failed apart from its subtests: red itself');
  assert.deepEqual(of('b.test.mjs', 'same name'), ['start', 'pass', 'start', 'fail']);
  // Files as a whole.
  assert.deepEqual(of('fine.test.mjs', undefined), ['start', 'end']);
  assert.deepEqual(of('a.test.mjs', undefined), ['start', 'end'], 'a file whose tests failed did not fail on its own');
  assert.deepEqual(of('crash.test.mjs', undefined), ['start', 'end', 'fail']);
  assert.deepEqual(of('early.test.mjs', undefined), ['start', 'end', 'fail']);
  // Times: a start says when, an end how long.
  for (const l of all) {
    if (l.state === 'start') assert.ok(Math.abs(l.at - Date.now()) < 120000, JSON.stringify(l));
    if (['pass', 'fail', 'skip'].includes(l.state) && l.name) assert.ok(Number.isInteger(l.ms) && l.ms >= 0, JSON.stringify(l));
  }

  // And as the board reads it: each test once, green and red counted.
  const list = readTestLines(fs.readFileSync(report, 'utf8'));
  const names = Object.fromEntries(list.files.map((f) => [f.file, f.tests.map((t) => `${t.state} ${t.name}`)]));
  assert.deepEqual(names['test/a.test.mjs'], [
    'pass adds two numbers', 'fail a test that fails', 'skip not today', 'skip some day',
    'pass a cart > starts empty', 'pass a cart > with one item > costs its price',
    'pass a test with subtests > one subtest', 'fail a test with subtests > a failing subtest',
    'fail a parent failing on its own', 'pass a parent failing on its own > its subtest passes',
  ]);
  assert.deepEqual(names['test/b.test.mjs'], ['pass same name', 'fail same name']);
  assert.deepEqual(names['test/early.test.mjs'], ['pass before the exit', 'unfinished ends the process']);
  assert.deepEqual(names['test/crash.test.mjs'], []);
  assert.deepEqual(list.files.map((f) => f.state), ['ended', 'ended', 'failed', 'failed', 'ended']);
  assert.deepEqual(list.counts, { pass: 8, fail: 6, skip: 2, running: 0 });
});

// The connector must not change the run: the same exit status and the same
// printed output as the same command without it, whether it can write or not.
const plain = (files) => `node --test --import=${completeRuns} --test-reporter=tap --test-reporter-destination=stdout ${files}`;
const stable = (out) => out.replace(/duration_ms: [\d.]+/g, 'duration_ms: X').replace(/# duration_ms [\d.]+/g, '# duration_ms X');

for (const [what, files] of [['passes', 'test/fine.test.mjs'], ['fails', 'test/fine.test.mjs test/b.test.mjs'], ['fails on its own', 'test/crash.test.mjs']]) {
  test(`a run that ${what} keeps its exit status and its output, whether the report can be written, cannot be, or is not asked for`, () => {
    const dir = project();
    const want = run(dir, plain(files));
    assert.equal(want.code, what === 'passes' ? 0 : 1, want.err);
    // A pipe whose reader goes away after the first byte: the report opens,
    // then every write to it fails.
    const pipe = path.join(dir, 'gone.tests');
    assert.equal(spawnSync('mkfifo', [pipe]).status, 0);
    for (const [where, env] of [
      ['not asked for', () => ({})],
      ['written', () => ({ KERJAAN_TEST_REPORT: path.join(dir, 'report.tests') })],
      ['in a folder that does not exist', () => ({ KERJAAN_TEST_REPORT: path.join(dir, 'missing', 'report.tests') })],
      ['onto a folder', () => ({ KERJAAN_TEST_REPORT: dir })],
      ['to a reader that goes away', () => {
        spawn('bash', ['-c', `head -c 1 "${pipe}" > /dev/null`], { stdio: 'ignore' }).unref();
        return { KERJAAN_TEST_REPORT: pipe };
      }],
    ]) {
      const got = run(dir, withReporter(files), env());
      assert.equal(got.code, want.code, `${where}: ${got.err}`);
      assert.equal(stable(got.out), stable(want.out), where);
      if (where === 'not asked for') assert.deepEqual(fs.readdirSync(dir).sort(), ['gone.tests', 'test'], 'nothing is written anywhere');
    }
    assert.ok(lines(path.join(dir, 'report.tests')).length > 0);
    assert.equal(fs.existsSync(path.join(dir, 'missing')), false);
  });
}

test('the command SETTINGS.md gives: plain node --test by hand, reporting under test-run.sh', () => {
  const cmd = guideCommand();
  assert.match(cmd, /\$\{KERJAAN_NODE_REPORTER:\+/);
  assert.doesNotMatch(cmd, /\d+\.\d+\.\d+/, 'no versioned plugin folder');
  // A folder with a space, as a home folder may have.
  const dir = project({ 'fine.test.mjs': FILES['fine.test.mjs'] });
  const spaced = path.join(dir, 'kerjaan copy');
  fs.mkdirSync(spaced);
  fs.copyFileSync(reporter, path.join(spaced, 'node.mjs'));
  const report = path.join(dir, 'report.tests');
  const byHand = run(dir, `${cmd} test/fine.test.mjs`);
  assert.equal(byHand.code, 0, byHand.err);
  assert.match(byHand.out, /ok 1 - a passing test/);
  assert.equal(fs.existsSync(report), false);
  const reported = run(dir, `${cmd} test/fine.test.mjs`, { KERJAAN_NODE_REPORTER: path.join(spaced, 'node.mjs'), KERJAAN_TEST_REPORT: report });
  assert.equal(reported.code, 0, reported.err);
  assert.match(reported.out, /ok 1 - a passing test/, 'the run still prints as before');
  assert.deepEqual(lines(report).filter((l) => l.name).map((l) => `${l.name} ${l.state}`), ['a passing test start', 'a passing test pass']);
});

// node --test, given no files, runs every file named like a test anywhere in
// the project (*.test.mjs, *-test.mjs, test-*.mjs, test.mjs, test/**): the
// connector, inside kerjaan's own repository, must not be one of them, or it
// is run as a test file and listed among the tests.
test('the connector is not named like a test file', () => {
  const rel = path.relative(root, reporter).split(path.sep).join('/');
  assert.doesNotMatch(rel, /(^|\/)test\/|(^|\/)(test|test-[^/]*|[^/]*[._-]test)\.[cm]?js$/, rel);
});

// This repository's own suite reports (261028121401): its test_command, as
// the board's settings hold it, run on one test file.
test('kerjaan\'s own test_command reports each test', () => {
  const settings = fs.readFileSync(path.join(root, '.kerjaan', 'settings.md'), 'utf8');
  const cmd = settings.match(/^test_command: (.+)$/m)[1];
  assert.match(cmd, /--test-reporter=\.\/skills\/kerjaan\/scripts\/reporters\/node\.mjs/);
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-own-')));
  const report = path.join(dir, 'report.tests');
  const r = spawnSync('bash', ['-c', `${cmd} viewer/tests/markdown.test.mjs`], { cwd: root, encoding: 'utf8', env: outside({ KERJAAN_TEST_REPORT: report }) });
  assert.equal(r.status, 0, r.stderr);
  const list = readTestLines(fs.readFileSync(report, 'utf8'));
  assert.deepEqual(list.files.map((f) => f.file), ['viewer/tests/markdown.test.mjs']);
  assert.ok(list.counts.pass >= 5 && list.counts.fail === 0, JSON.stringify(list.counts));
  assert.ok(list.files[0].tests.every((t) => t.state === 'pass' && t.name.length > 0));
});
