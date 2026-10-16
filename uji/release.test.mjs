// release.sh unreleased: the finished tickets that no release carries yet, so
// the foreman can name them when the board goes quiet and offer a release.
//
// Every test builds a throwaway repository with a board and runs the real
// script against it, the way the skill runs it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const release = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'release.sh');

const A = '261016500001';
const B = '261016500002';
const C = '261016500003';
const D = '261016500004';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
};

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel'];

function repo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-release-')));
  git(root, 'init', '-q', '-b', 'main');
  for (const s of STATUSES) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, 'a.js'), 'a\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return root;
}

function commitAll(root, message) {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '--allow-empty', '-m', message);
}

// A ticket in <status>, committed on the board as the skill does.
function ticket(root, id, status) {
  for (const s of STATUSES) {
    const dir = path.join(root, '.kerjaan', s);
    for (const n of fs.readdirSync(dir)) if (n.startsWith(`${id} `)) fs.rmSync(path.join(dir, n));
  }
  fs.writeFileSync(path.join(root, '.kerjaan', status, `${id} Tiket ${id}.md`), `---\ntype: task\n---\n\n## Notes\n(none yet)\n`);
  commitAll(root, `Papan: ${id} ke ${status}`);
}

// Code written for a ticket: a commit outside .kerjaan/ naming its ID.
function code(root, id) {
  fs.appendFileSync(path.join(root, 'a.js'), `// ${id}\n`);
  commitAll(root, `${id}: kode`);
}

function manifest(root, file, version) {
  const text = {
    '.claude-plugin/plugin.json': `{\n  "name": "x",\n  "version": "${version}"\n}\n`,
    'package.json': `{\n  "name": "x",\n  "version": "${version}"\n}\n`,
    'pyproject.toml': `[project]\nname = "x"\nversion = "${version}"\n`,
    'Cargo.toml': `[package]\nname = "x"\nversion = "${version}"\n`,
  }[file];
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
}

function run(root, ...args) {
  const r = spawnSync('bash', [release, ...args], { cwd: root, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const listed = (out) => out.split('\n').filter((l) => /^\d{12} /.test(l));

test('no tag and no manifest: NO RELEASE, and no ticket is named', () => {
  const root = repo();
  ticket(root, A, 'done');
  const r = run(root, 'unreleased');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^NO RELEASE: /);
  assert.deepEqual(listed(r.out), []);
});

test('plugin.json version: tickets done before the release are carried, those done after are named', () => {
  const root = repo();
  manifest(root, '.claude-plugin/plugin.json', '1.0.0');
  commitAll(root, 'Release 1.0.0');
  code(root, A);
  ticket(root, A, 'done');
  manifest(root, '.claude-plugin/plugin.json', '1.1.0');
  commitAll(root, 'Release 1.1.0\nIsi rilis.');
  code(root, B);
  ticket(root, B, 'done');
  ticket(root, C, 'done'); // no code of its own
  const r = run(root, 'unreleased');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^LAST RELEASE: [0-9a-f]+ Release 1\.1\.0$/m);
  assert.doesNotMatch(r.out, /Isi rilis/);
  assert.match(r.out, /^UNRELEASED: 2$/m);
  assert.deepEqual(listed(r.out), [`${B} Tiket ${B}`, `${C} Tiket ${C} (board only)`]);
});

test('a ticket the release message names is carried even though it reached done afterwards', () => {
  const root = repo();
  manifest(root, '.claude-plugin/plugin.json', '1.0.0');
  code(root, A);
  ticket(root, A, 'in_progress');
  commitAll(root, `Release 1.0.0\nMemuat 261016499999 dan ${A}.`);
  ticket(root, A, 'done');
  ticket(root, B, 'done');
  const r = run(root, 'unreleased');
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(listed(r.out), [`${B} Tiket ${B} (board only)`]);
});

test('a longer number that only contains an ID does not count as naming it', () => {
  const root = repo();
  manifest(root, '.claude-plugin/plugin.json', '1.0.0');
  commitAll(root, `Release 1.0.0\nlihat 9${A} dan ${A}7`);
  code(root, A);
  ticket(root, A, 'done');
  assert.deepEqual(listed(run(root, 'unreleased').out), [`${A} Tiket ${A}`]);
});

test('a manifest change that leaves the version alone is not a release', () => {
  const root = repo();
  manifest(root, '.claude-plugin/plugin.json', '1.0.0');
  commitAll(root, 'Release 1.0.0');
  ticket(root, A, 'done');
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), '{\n  "name": "y",\n  "version": "1.0.0"\n}\n');
  commitAll(root, 'ganti nama');
  const r = run(root, 'unreleased');
  assert.match(r.out, /^LAST RELEASE: [0-9a-f]+ Release 1\.0\.0$/m);
  assert.deepEqual(listed(r.out), [`${A} Tiket ${A} (board only)`]);
});

for (const file of ['package.json', 'pyproject.toml', 'Cargo.toml', '.claude-plugin/plugin.json']) {
  test(`${file}: a version change there marks the release`, () => {
    const root = repo();
    manifest(root, file, '0.1.0');
    commitAll(root, 'versi awal');
    ticket(root, A, 'done');
    manifest(root, file, '0.2.0');
    commitAll(root, 'Rilis 0.2.0');
    ticket(root, B, 'done');
    const r = run(root, 'unreleased');
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /^LAST RELEASE: [0-9a-f]+ Rilis 0\.2\.0$/m);
    assert.deepEqual(listed(r.out), [`${B} Tiket ${B} (board only)`]);
  });
}

test('a tag newer than the last version change is the release', () => {
  const root = repo();
  manifest(root, 'package.json', '1.0.0');
  commitAll(root, 'versi 1.0.0');
  ticket(root, A, 'done');
  commitAll(root, 'siap');
  git(root, 'tag', 'v1.0.1');
  ticket(root, B, 'done');
  const r = run(root, 'unreleased');
  assert.match(r.out, /^LAST RELEASE: [0-9a-f]+ siap$/m);
  assert.deepEqual(listed(r.out), [`${B} Tiket ${B} (board only)`]);
});

test('a version change newer than the last tag is the release', () => {
  const root = repo();
  git(root, 'tag', 'v0.9');
  manifest(root, 'package.json', '1.0.0');
  ticket(root, A, 'done'); // committed together with the version
  ticket(root, B, 'done');
  const r = run(root, 'unreleased');
  assert.match(r.out, /^LAST RELEASE: [0-9a-f]+ Papan: 261016500001 ke done$/m);
  assert.deepEqual(listed(r.out), [`${B} Tiket ${B} (board only)`]);
});

test('a tag alone, with no manifest, is enough', () => {
  const root = repo();
  ticket(root, A, 'done');
  git(root, 'tag', 'v1');
  ticket(root, B, 'done');
  assert.deepEqual(listed(run(root, 'unreleased').out), [`${B} Tiket ${B} (board only)`]);
});

test('every finished ticket released: UNRELEASED: none; tickets not in done are never named', () => {
  const root = repo();
  ticket(root, A, 'done');
  manifest(root, 'package.json', '1.0.0');
  commitAll(root, 'Release 1.0.0');
  ticket(root, B, 'review');
  ticket(root, C, 'todo');
  ticket(root, D, 'cancel');
  const r = run(root, 'unreleased');
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^UNRELEASED: none$/m);
  assert.deepEqual(listed(r.out), []);
});

test('misuse and the wrong place: exit 2', () => {
  const root = repo();
  assert.equal(run(root).code, 2);
  assert.equal(run(root, 'lain').code, 2);
  assert.equal(run(root, 'unreleased', 'lagi').code, 2);
  const wt = path.join(fs.realpathSync(os.tmpdir()), `kerjaan-release-wt-${process.pid}-${Date.now()}`);
  git(root, 'worktree', 'add', '-q', '-b', 'samping', wt);
  const r = run(wt, 'unreleased');
  assert.equal(r.code, 2);
  assert.match(r.err, /linked git worktree/);
  git(root, 'worktree', 'remove', '--force', wt);
  const bare = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-release-nogit-')));
  assert.equal(run(bare, 'unreleased').code, 2);
});
