// Work done side by side reaches main only after it has been tested together
// with everything main already holds: the worker brings main into its branch
// before review, the move to review is refused until the branch holds all of
// main's code and the latest test run covers exactly that content, and
// merge.sh land merges one ticket at a time, sending a ticket back when main
// moved and holding only that ticket for the owner when the merge fails.
//
// Every test builds a throwaway repository with a board and a tiny "program":
// kode.txt defines names, pakai*.txt use them, and cek.sh — the test command —
// fails when a name is used but not defined. Renaming a name in one ticket and
// using the old name in another is the break git cannot see.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const mergeSh = path.join(scripts, 'merge.sh');
const worktreeSh = path.join(scripts, 'worktree.sh');
const testRun = path.join(scripts, 'test-run.sh');
const updateTicket = path.join(scripts, 'update-ticket.sh');

const A = '261016300001';
const B = '261016300002';
const C = '261016300003';
const D = '261016300004';

const gitEnv = {
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
  KERJAAN_LOCK_POLL: '0.2',
};

function ticket(title, blockedBy = []) {
  return `---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-16 20:00:00
updated: 2026-10-16 20:00:00
related: []
blocked_by: [${blockedBy.join(', ')}]
---

## Background
Sesuatu.

## Request
${title}.

## Done when
- [ ] Sesuatu bisa dicoba.

## History
- 2026-10-16 20:00:00 in_progress

## Notes
(none yet)
`;
}

const cek = `#!/bin/sh
for f in pakai*.txt; do
  [ -e "$f" ] || continue
  while read -r n; do
    grep -qx "def $n" kode.txt || { echo "$n dipakai di $f tetapi tidak didefinisikan"; exit 1; }
  done < "$f"
done
`;

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

// A repository with tickets A and B in in_progress, and C and D in todo (D is
// blocked_by A). Every test run appends a line to luar/runs, so a test can
// count how often the suite really ran.
function repo() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-merge-')));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'luar');
  fs.mkdirSync(outside);
  const k = path.join(root, '.kerjaan');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(k, s), { recursive: true });
  }
  const runs = path.join(outside, 'runs');
  const urut = path.join(outside, 'urut');
  fs.writeFileSync(path.join(k, 'settings.md'), `---
language: Bahasa Indonesia
test_command: echo "$KERJAAN_TICKET" >> ${JSON.stringify(runs)} && echo "mulai $KERJAAN_TICKET" >> ${JSON.stringify(urut)} && sh cek.sh && sleep $\{UJI_TIDUR:-0} && echo "akhir $KERJAAN_TICKET" >> ${JSON.stringify(urut)} && [ -z "$UJI_GAGAL" ]
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(k, 'in_progress', `${A} Tiket pertama.md`), ticket('Tiket pertama'));
  fs.writeFileSync(path.join(k, 'in_progress', `${B} Tiket kedua.md`), ticket('Tiket kedua'));
  fs.writeFileSync(path.join(k, 'todo', `${C} Tiket ketiga.md`), ticket('Tiket ketiga'));
  fs.writeFileSync(path.join(k, 'todo', `${D} Tiket keempat.md`), ticket('Tiket keempat', [A]));
  fs.writeFileSync(path.join(root, 'kode.txt'), 'def satu\ndef dua\n');
  fs.writeFileSync(path.join(root, 'pakai.txt'), 'satu\n');
  fs.writeFileSync(path.join(root, 'cek.sh'), cek);
  git(root, 'init', '-q');
  git(root, 'checkout', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'awal');
  return { base, root, outside, k, runs, urut };
}

function run(script, cwd, args, env = {}) {
  const r = spawnSync('bash', [script, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, ...gitEnv, ...env }, timeout: 60000,
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function runAsync(script, cwd, args, env = {}) {
  return new Promise((resolve) => {
    const p = spawn('bash', [script, ...args], { cwd, env: { ...process.env, ...gitEnv, ...env } });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
  });
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function add(r, id) {
  const p = path.join(r.base, `wt-${id}`);
  const res = run(worktreeSh, r.root, ['add', id, p]);
  assert.equal(res.code, 0, res.err);
  return p;
}

// What a worker does in its worktree: change files, commit.
function work(wt, files, msg = 'kerja') {
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(wt, name), body);
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '-m', msg);
}

const where = (r, id) => {
  for (const s of fs.readdirSync(r.k)) {
    const dir = path.join(r.k, s);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (fs.readdirSync(dir).some((f) => f.startsWith(id))) return s;
  }
  throw new Error(`no ticket ${id}`);
};
const notes = (r, id) => {
  const dir = path.join(r.k, where(r, id));
  const f = fs.readdirSync(dir).find((n) => n.startsWith(id));
  return fs.readFileSync(path.join(dir, f), 'utf8').split('## Notes')[1];
};
const move = (r, id, status, extra = []) => run(updateTicket, r.root, [id, '--status', status, ...extra]);
const runCount = (r) => (fs.existsSync(r.runs) ? fs.readFileSync(r.runs, 'utf8').trim().split('\n').length : 0);
const head = (r) => git(r.root, 'rev-parse', 'HEAD').trim();
const show = (r, rev, file) => git(r.root, 'show', `${rev}:${file}`);

// Worker hands over and reviewer passes: the two moves around a review.
function toReview(r, id) {
  const res = move(r, id, 'review');
  assert.equal(res.code, 0, res.err);
  assert.equal(where(r, id), 'review');
}
function passReview(r, id) {
  const res = move(r, id, 'done');
  assert.equal(res.code, 0, res.err);
}

// ---------------------------------------------------------------------------

test('dua tiket yang mengubah baris yang sama berakhir di main dengan uji lulus, tanpa pemilik', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);

  // A renames satu to esa; B, at the same time, adds tiga right below satu
  // and uses satu in a new file.
  work(wa, { 'kode.txt': 'def esa\ndef dua\n', 'pakai.txt': 'esa\n' });
  work(wb, { 'kode.txt': 'def satu\ndef tiga\ndef dua\n', 'pakai-b.txt': 'satu\ntiga\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    const t = run(testRun, wt, [id]);
    assert.equal(t.code, 0, t.err);
    toReview(r, id);
    passReview(r, id);
  }
  assert.equal(runCount(r), 2);

  const first = run(mergeSh, r.root, ['land', A]);
  assert.equal(first.code, 0, first.out + first.err);
  assert.match(first.out, /LANDED: ticket 261016300001 is in main/);
  assert.match(first.out, /tests carried from the run on this exact content, not run again/);
  assert.equal(runCount(r), 2, 'landing the first ticket ran the tests again');

  const before = head(r);
  const second = run(mergeSh, r.root, ['land', B]);
  assert.equal(second.code, 3, second.out + second.err);
  assert.match(second.out, /SENT BACK: ticket 261016300002/);
  assert.equal(head(r), before, 'main changed although the second ticket was sent back');
  assert.equal(where(r, B), 'in_progress');
  assert.match(notes(r, B), /merge postponed — main changed since tiket-261016300002 last took it in \(kode\.txt pakai\.txt\)/);

  // The worker brings main in, resolves the conflict, tests, commits.
  const sync = run(mergeSh, wb, ['sync', B]);
  assert.equal(sync.code, 1, sync.out + sync.err);
  assert.match(sync.out, /CONFLICT: .*\n {2}kode\.txt/);
  work(wb, { 'kode.txt': 'def esa\ndef tiga\ndef dua\n', 'pakai-b.txt': 'esa\ntiga\n' }, 'selesaikan tabrakan');
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);

  // The re-review reads exactly how the conflict was resolved.
  const res = run(mergeSh, r.root, ['resolution', B]);
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /^-<<<<<<< HEAD\n-def satu\n-def tiga\n-=======\n def esa\n->>>>>>> [0-9a-f]{40}\n\+def tiga$/m);
  assert.match(res.out, /^-satu\n\+esa\n tiga$/m);
  // What main brought in by itself is not part of it.
  assert.deepEqual([...res.out.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]), ['kode.txt', 'pakai-b.txt']);

  passReview(r, B);
  const third = run(mergeSh, r.root, ['land', B]);
  assert.equal(third.code, 0, third.out + third.err);
  assert.match(third.out, /LANDED/);

  // Main holds both, and its tests pass.
  assert.equal(show(r, 'HEAD', 'kode.txt'), 'def esa\ndef tiga\ndef dua\n');
  const cekMain = spawnSync('sh', ['cek.sh'], { cwd: r.root, encoding: 'utf8' });
  assert.equal(cekMain.status, 0, cekMain.stdout);
  // Nobody acknowledged anything, and nothing is left behind.
  assert.doesNotMatch(notes(r, A) + notes(r, B), /ack-unmerged|held for the owner/);
  assert.equal(git(r.root, 'branch', '--list', 'tiket-*'), '');
  assert.equal(fs.existsSync(wa) || fs.existsSync(wb), false);
});

test('penyesuaian ulang yang tidak mengubah apa pun selain gabungan otomatis terbaca kosong bagi reviewer', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'kode.txt': 'def esa\ndef dua\n', 'pakai.txt': 'esa\n' });
  work(wb, { 'pakai-b.txt': 'dua\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  const first = run(mergeSh, r.root, ['resolution', B]);
  assert.match(first.out, /FIRST REVIEW/);
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);
  assert.equal(run(mergeSh, r.root, ['land', B]).code, 3);
  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  assert.match(run(mergeSh, wb, ['sync', B]).out, /UP TO DATE/);
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  const res = run(mergeSh, r.root, ['resolution', B]);
  assert.equal(res.code, 0, res.err);
  assert.match(res.out, /EMPTY: the branch is exactly the automatic merge; the worker changed no code\./);
  assert.doesNotMatch(res.out, /^diff /m);
});

test('penggabungan tanpa tabrakan teks yang membuat uji gagal tidak pernah masuk ke main', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'kode.txt': 'def esa\ndef dua\n', 'pakai.txt': 'esa\n' });
  work(wb, { 'pakai-b.txt': 'satu\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);

  // Git would merge B without a word; land does not.
  const afterA = head(r);
  const land = run(mergeSh, r.root, ['land', B]);
  assert.equal(land.code, 3, land.out);
  assert.equal(head(r), afterA);
  assert.throws(() => show(r, 'HEAD', 'pakai-b.txt'));

  // Brought up to date, the branch merges cleanly and its tests fail.
  const sync = run(mergeSh, wb, ['sync', B]);
  assert.equal(sync.code, 0, sync.out + sync.err);
  assert.match(sync.out, /MERGED/);
  const red = run(testRun, wb, [B]);
  assert.equal(red.code, 1);
  const refused = move(r, B, 'review');
  assert.equal(refused.code, 1);
  assert.match(refused.err, /UNTESTED: .*\n.*exited 1/);
  assert.match(refused.err, /REFUSED: 261016300002 was not moved to review/);
  assert.equal(where(r, B), 'in_progress');

  work(wb, { 'pakai-b.txt': 'esa\n' }, 'pakai nama baru');
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  passReview(r, B);
  assert.equal(run(mergeSh, r.root, ['land', B]).code, 0);
  const cekMain = spawnSync('sh', ['cek.sh'], { cwd: r.root, encoding: 'utf8' });
  assert.equal(cekMain.status, 0, cekMain.stdout);
});

test('ke review hanya bila cabang memuat semua kode main dan uji terakhir menguji isi itu', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'kode.txt': 'def esa\ndef dua\n', 'pakai.txt': 'esa\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  assert.equal(run(mergeSh, r.root, ['land', A]).code, 0);

  // B was tested on the old main: refused, and the reason names what moved.
  work(wb, { 'pakai-b.txt': 'dua\n' });
  assert.equal(run(testRun, wb, [B]).code, 0);
  const stale = move(r, B, 'review');
  assert.equal(stale.code, 1);
  assert.match(stale.err, /STALE: main has changed since tiket-261016300002 last took it in:\n {2}kode\.txt\n {2}pakai\.txt/);
  assert.equal(where(r, B), 'in_progress');

  // Brought up to date but not tested again: refused.
  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  const untested = move(r, B, 'review');
  assert.equal(untested.code, 1);
  assert.match(untested.err, /UNTESTED/);

  // Tested, then changed and committed after the run: refused.
  assert.equal(run(testRun, wb, [B]).code, 0);
  work(wb, { 'pakai-b.txt': 'dua\nesa\n' }, 'satu baris lagi');
  const changed = move(r, B, 'review');
  assert.equal(changed.code, 1);
  assert.match(changed.err, /UNTESTED: .*\n.*DIFFERENT/);

  // Tested on exactly what is committed: accepted, and the commit recorded.
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  const tip = git(r.root, 'rev-parse', `tiket-${B}`).trim();
  const mainNow = head(r);
  assert.match(notes(r, B), new RegExp(`review covers branch tiket-${B} at ${tip}, which holds main at ${mainNow} \\(code outside \\.kerjaan/\\); the latest test run passed on exactly this content\\.`));
});

test('tiket pertama yang digabung tanpa perubahan kode di main tidak diuji ulang, juga bila main hanya berubah di papan', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  // The board is committed on main meanwhile; that is not main moving.
  git(r.root, 'add', '-A', '.kerjaan');
  git(r.root, 'commit', '-q', '-m', 'Papan: A lolos review');
  const boardOnly = head(r);
  const runs = runCount(r);

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.equal(runCount(r), runs, 'land ran the tests');
  // HEAD is land's commit of the ticket's note; the merge sits right under it.
  const merge = git(r.root, 'rev-parse', 'HEAD^').trim();
  assert.equal(git(r.root, 'rev-parse', `${merge}^1`).trim(), boardOnly);
  assert.equal(show(r, 'HEAD', 'pakai.txt'), 'satu\ndua\n');
  assert.match(notes(r, A), new RegExp(`landed on main as ${merge}, merging tiket-${A} at [0-9a-f]{40}; tests carried`));
});

test('cabang yang berubah setelah masuk review dikembalikan, tidak digabung', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\nsatu\n' }, 'diam-diam setelah review');
  assert.equal(run(testRun, wa, [A]).code, 0);
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 3, land.out + land.err);
  assert.match(notes(r, A), /merge postponed — tiket-261016300001 changed after it went to review/);
  assert.equal(where(r, A), 'in_progress');
  assert.equal(head(r), before);
});

test('tanpa catatan commit yang masuk review, tiket ditahan untuk pemilik', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const file = path.join(r.k, 'done', `${A} Tiket pertama.md`);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^- .*review covers branch .*\n/m, ''));
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 1, land.out + land.err);
  assert.match(notes(r, A), /merge held for the owner — its Notes record no move to review covering a commit/);
  assert.equal(head(r), before);
});

test('uji terakhir yang gagal setelah review menahan tiket untuk pemilik', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  assert.equal(run(testRun, wa, [A], { UJI_GAGAL: '1' }).code, 1);
  const before = head(r);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 1, land.out + land.err);
  assert.match(land.out, /HELD: ticket 261016300001/);
  assert.match(notes(r, A), /merge held for the owner — the latest test run does not vouch for tiket-261016300001 .*exited 1/);
  assert.equal(head(r), before);
});

test('main yang berubah di tengah penggabungan membuat tiket dikembalikan, bukan digabung', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);

  // A git that lets somebody commit to main just before land's merge runs.
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const bin = path.join(r.outside, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh
if [ "$1" = merge ] && [ "$3" = --no-commit ] && [ ! -e "$UJI_SELA" ]; then
  touch "$UJI_SELA"
  printf 'def sela\\n' > "$UJI_MAIN/sela.txt"
  ${JSON.stringify(realGit)} -C "$UJI_MAIN" add sela.txt
  ${JSON.stringify(realGit)} -C "$UJI_MAIN" commit -q -m sela
fi
exec ${JSON.stringify(realGit)} "$@"
`, { mode: 0o755 });
  const land = run(mergeSh, r.root, ['land', A], {
    PATH: `${bin}:${process.env.PATH}`, UJI_SELA: path.join(r.outside, 'sela'), UJI_MAIN: r.root,
  });
  assert.ok(fs.existsSync(path.join(r.outside, 'sela')), 'the race did not happen');
  assert.equal(land.code, 3, land.out + land.err);
  assert.match(notes(r, A), /merge postponed — main changed while the merge was being prepared \(sela\.txt\)/);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), 'sela');
  assert.equal(git(r.root, 'status', '--porcelain', '--untracked-files=no', '--', '.', ':(exclude).kerjaan'), '');
});

test('penggabungan yang gagal menahan hanya tiket itu, memberi tahu alasannya, dan tiket lain jalan terus', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  work(wb, { 'pakai-b.txt': 'dua\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  // Somebody's uncommitted edit in the main tree sits on the file A changes.
  fs.writeFileSync(path.join(r.root, 'pakai.txt'), 'satu\n# catatan pemilik\n');
  const before = head(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /HELD: ticket 261016300001 was not merged into main and waits for the owner\.\nReason: git refused the merge: .*pakai\.txt/);
  assert.match(notes(r, A), /merge held for the owner — git refused the merge: .*pakai\.txt/);
  assert.equal(where(r, A), 'done');
  assert.equal(head(r), before);
  assert.equal(fs.readFileSync(path.join(r.root, 'pakai.txt'), 'utf8'), 'satu\n# catatan pemilik\n');

  // The other ticket lands; a new ticket starts without anyone acknowledging
  // A's branch; the ticket that depends on A waits.
  const other = run(mergeSh, r.root, ['land', B]);
  assert.equal(other.code, 0, other.out + other.err);
  const start = move(r, C, 'in_progress');
  assert.equal(start.code, 0, start.err);
  assert.match(start.err, /tiket-261016300001 is not in HEAD, but its merge is held for the owner/);
  const dependent = move(r, D, 'in_progress');
  assert.equal(dependent.code, 1);
  assert.match(dependent.err, /blocked_by 261016300001, whose merge into main is held/);
  assert.equal(where(r, D), 'todo');

  // Once the owner clears the way, the same command takes it on: main has
  // moved meanwhile (B landed), so it goes back to its worker first.
  fs.writeFileSync(path.join(r.root, 'pakai.txt'), 'satu\n');
  const again = run(mergeSh, r.root, ['land', A]);
  assert.equal(again.code, 3, again.out + again.err);
  assert.equal(run(mergeSh, wa, ['sync', A]).code, 0);
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const last = run(mergeSh, r.root, ['land', A]);
  assert.equal(last.code, 0, last.out + last.err);
  assert.equal(show(r, 'HEAD', 'pakai.txt'), 'satu\ndua\n');
  assert.equal(show(r, 'HEAD', 'pakai-b.txt'), 'dua\n');
  assert.equal(move(r, D, 'in_progress').code, 0);
});

test('tiket yang kembali dari review atau done bukan mulai baru: tidak ditolak karena cabang lain', () => {
  const r = repo();
  git(r.root, 'checkout', '-q', '-b', 'eksperimen');
  fs.writeFileSync(path.join(r.root, 'coba.txt'), 'coba\n');
  git(r.root, 'add', 'coba.txt');
  git(r.root, 'commit', '-q', '-m', 'coba');
  git(r.root, 'checkout', '-q', 'main');
  assert.equal(move(r, A, 'review').code, 0);
  const back = move(r, A, 'in_progress');
  assert.equal(back.code, 0, back.err);
  const start = move(r, C, 'in_progress');
  assert.equal(start.code, 1);
  assert.match(start.err, /eksperimen/);
});

test('tiket yang dikerjakan langsung di main tree tidak terpengaruh', () => {
  const r = repo();
  fs.writeFileSync(path.join(r.root, 'pakai.txt'), 'satu\ndua\n');
  toReview(r, A);
  assert.doesNotMatch(notes(r, A), /review covers/);
  passReview(r, A);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.err);
  assert.match(land.out, /NOTHING TO LAND/);
  assert.match(run(mergeSh, r.root, ['check', B]).out, /NOTHING SEPARATE/);
});

test('sync hanya berjalan di worktree tiket itu, dengan semua perubahan sudah di-commit', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  const inMain = run(mergeSh, r.root, ['sync', A]);
  assert.equal(inMain.code, 1);
  assert.match(inMain.err, /inside the ticket's worktree/);
  const wrong = run(mergeSh, wb, ['sync', A]);
  assert.equal(wrong.code, 1);
  assert.match(wrong.err, /not on a branch carrying 261016300001/);
  fs.writeFileSync(path.join(wa, 'pakai.txt'), 'belum\n');
  const dirty = run(mergeSh, wa, ['sync', A]);
  assert.equal(dirty.code, 1);
  assert.match(dirty.err, /REFUSED: this worktree has changes that are not committed/);
});

test('hanya tiket di done yang digabung, dan hanya dari main tree', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  const early = run(mergeSh, r.root, ['land', A]);
  assert.equal(early.code, 2);
  assert.match(early.err, /REFUSED: 261016300001 is in review/);
  passReview(r, A);
  const fromWorktree = run(mergeSh, wa, ['land', A]);
  assert.equal(fromWorktree.code, 1);
  assert.match(fromWorktree.err, /linked git worktree/);
  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  // The branch is gone, and nothing on the way said it was kept.
  assert.equal(git(r.root, 'branch', '--list', `tiket-${A}`).trim(), '');
  assert.equal(fs.existsSync(wa), false);
  assert.doesNotMatch(land.out + land.err, /kept/);
  assert.match(land.out, new RegExp(`Branch tiket-${A} is merged into main and deleted\\.`));
});

// Holds a lock the way another live process would, and reports whether the
// step under test was still waiting when the lock was let go.
async function heldLock(r, name, start) {
  const lock = path.join(r.root, '.git', 'kerjaan-locks', `${name}.lock`);
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${process.pid}\tuji yang memegang kunci\n`);
  let done = false;
  const running = start().then((res) => { done = true; return res; });
  await sleep(1200);
  const waitedWhileHeld = !done;
  fs.rmSync(lock, { recursive: true });
  return { waitedWhileHeld, res: await running };
}

test('penggabungan menunggu kunci merge', async () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  const before = head(r);
  const { waitedWhileHeld, res } = await heldLock(r, 'merge', () => runAsync(mergeSh, r.root, ['land', A]));
  assert.equal(waitedWhileHeld, true, 'land merged while the merge lock was held');
  assert.equal(res.code, 0, res.out + res.err);
  assert.notEqual(head(r), before);
});

// Every note land writes is made under the board lock, with the refresh of the
// ticket after it, so a ticket being moved from elsewhere at that moment cannot
// write its copy back over the note. Checked per kind of note: while another
// live process holds the lock, the note is not there yet.
async function noteWaitsForBoard(r, record) {
  const lock = path.join(r.root, '.git', 'kerjaan-locks', 'board.lock');
  fs.mkdirSync(lock, { recursive: true });
  fs.writeFileSync(lock + '/owner', `${process.pid}\tuji yang memegang kunci papan\n`);
  let done = false;
  const running = runAsync(mergeSh, r.root, ['land', A]).then((res) => { done = true; return res; });
  await sleep(2500);
  const whileHeld = { done, written: record.test(notes(r, A)) };
  fs.rmSync(lock, { recursive: true });
  return { whileHeld, res: await running };
}

for (const [kind, prepare, record, code] of [
  ['"landed on"', () => {}, /landed on main as /, 0],
  ['"merge postponed"', (r, wa) => {
    work(wa, { 'pakai.txt': 'satu\ndua\nsatu\n' }, 'diam-diam setelah review');
    assert.equal(run(testRun, wa, [A]).code, 0);
  }, /merge postponed — /, 3],
  ['"merge held for the owner"', (r) => {
    const file = path.join(r.k, 'done', `${A} Tiket pertama.md`);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^- .*review covers branch .*\n/m, ''));
  }, /merge held for the owner — /, 1],
]) {
  test(`catatan ${kind} dari land menunggu kunci papan`, async () => {
    const r = repo();
    const wa = add(r, A);
    work(wa, { 'pakai.txt': 'satu\ndua\n' });
    assert.equal(run(testRun, wa, [A]).code, 0);
    toReview(r, A);
    passReview(r, A);
    prepare(r, wa);
    const { whileHeld, res } = await noteWaitsForBoard(r, record);
    assert.deepEqual(whileHeld, { done: false, written: false }, 'land wrote its note while the board lock was held');
    assert.equal(res.code, code, res.out + res.err);
    assert.match(res.err, /Waiting for the board lock, held by uji yang memegang kunci papan/);
    assert.match(notes(r, A), record);
  });
}

test('dua penggabungan yang dimulai bersamaan berjalan bergiliran', async () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  work(wb, { 'pakai-b.txt': 'dua\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  const both = await Promise.all([runAsync(mergeSh, r.root, ['land', A]), runAsync(mergeSh, r.root, ['land', B])]);
  // Whichever went first changed main's code, so the other is sent back.
  assert.deepEqual(both.map((x) => x.code).sort(), [0, 3], both.map((x) => x.out + x.err).join('\n'));
  assert.equal(git(r.root, 'log', '--merges', '--format=%s').trim().split('\n').length, 1);
});

test('uji reviewer ikut antre di kunci uji yang sama dengan uji pengerja, dan tidak dicatat', async () => {
  const r = repo();
  const wa = add(r, A);
  const { waitedWhileHeld, res } = await heldLock(r, 'tests',
    () => runAsync(testRun, r.root, ['--review', A, '--dir', wa]));
  assert.equal(waitedWhileHeld, true, 'the reviewer ran its tests while the test lock was held');
  assert.equal(res.code, 0, res.err);
  assert.match(res.err, /Waiting for the tests lock, held by uji yang memegang kunci/);
  assert.match(res.err, new RegExp(`Reviewer's run in ${wa}: .* exited 0`));
  assert.doesNotMatch(notes(r, A), /test run/);

  // A worker's run and a reviewer's run started together never overlap.
  fs.rmSync(r.urut, { force: true });
  const worker = runAsync(testRun, wa, [A], { UJI_TIDUR: '1' });
  const t0 = Date.now();
  while (!(fs.existsSync(r.urut) && fs.readFileSync(r.urut, 'utf8').includes(`mulai ${A}`))) {
    assert.ok(Date.now() - t0 < 15000, 'the worker run never started');
    await sleep(50);
  }
  const reviewer = runAsync(testRun, r.root, ['--review', B], { UJI_TIDUR: '1' });
  const [rw, rr] = await Promise.all([worker, reviewer]);
  assert.equal(rw.code, 0, rw.err);
  assert.equal(rr.code, 0, rr.err);
  assert.match(rr.err, /Waiting for the tests lock, held by ticket 261016300001/);
  assert.deepEqual(fs.readFileSync(r.urut, 'utf8').trim().split('\n'), [`mulai ${A}`, `akhir ${A}`, `mulai ${B}`, `akhir ${B}`]);
  assert.match(notes(r, A), /test run — .* exited 0/);
  assert.doesNotMatch(notes(r, B), /test run/);

  // A command of its own, in another directory, still takes its turn.
  const own = await heldLock(r, 'tests',
    () => runAsync(testRun, r.root, ['--review', A, '--dir', r.outside, '--', 'pwd > pwd.txt && echo "$KERJAAN_WORKTREE" >> pwd.txt']));
  assert.equal(own.waitedWhileHeld, true);
  assert.equal(own.res.code, 0, own.res.err);
  assert.equal(fs.readFileSync(path.join(r.outside, 'pwd.txt'), 'utf8'), `${r.outside}\n${r.outside}\n`);

  // Its command fails the way the suite does.
  const red = run(testRun, wa, ['--review', A], { UJI_GAGAL: '1' });
  assert.equal(red.code, 1);
});

// ---------------------------------------------------------------------------
// Every note land writes into a ticket is committed by land itself, in a
// commit holding only that ticket's file, so the main tree is left as clean as
// land found it — and nothing else uncommitted there is swept into that commit.

// What the foreman does after each board move: commit the board.
function commitBoard(r, msg = 'Papan') {
  git(r.root, 'add', '-A', '--', '.kerjaan');
  git(r.root, 'commit', '-q', '-m', msg);
}
const status = (r) => git(r.root, 'status', '--porcelain', '--untracked-files=all');
const lastFiles = (r) => git(r.root, 'show', '--no-renames', '--name-status', '--format=', 'HEAD').trim().split('\n');
const ticketPath = (r, id) => {
  const s = where(r, id);
  const f = fs.readdirSync(path.join(r.k, s)).find((n) => n.startsWith(id));
  return `.kerjaan/${s}/${f}`;
};

test('penggabungan menyimpan sendiri catatan "sudah masuk main", dan penggabungan berikutnya langsung berjalan', () => {
  const r = repo();
  const wa = add(r, A);
  const wb = add(r, B);
  work(wa, { 'kode.txt': 'def esa\ndef dua\n', 'pakai.txt': 'esa\n' });
  work(wb, { 'pakai-b.txt': 'dua\n' });
  for (const [wt, id] of [[wa, A], [wb, B]]) {
    assert.equal(run(testRun, wt, [id]).code, 0);
    toReview(r, id);
    passReview(r, id);
  }
  commitBoard(r, 'Papan: A dan B lolos review');
  assert.equal(status(r), '');

  const first = run(mergeSh, r.root, ['land', A]);
  assert.equal(first.code, 0, first.out + first.err);
  const merge = git(r.root, 'rev-parse', 'HEAD^').trim();
  // Step 3: the main tree is clean.
  assert.equal(status(r), '', 'land left the main tree dirty');
  // The note is in the ticket, and history shows when it was committed: the
  // commit right after the merge, holding only the ticket's file.
  const fileA = ticketPath(r, A);
  assert.match(show(r, 'HEAD', fileA), new RegExp(`landed on main as ${merge}, merging tiket-${A}`));
  assert.doesNotMatch(show(r, 'HEAD^', fileA), /landed on main/);
  assert.deepEqual(lastFiles(r), [`M\t${fileA}`]);
  assert.match(git(r.root, 'log', '-1', '--format=%s').trim(), new RegExp(`^Board: ${A} landed on main as ${merge.slice(0, 12)}$`));
  assert.match(first.out, new RegExp(`Note committed: [0-9a-f]+ Board: ${A} landed on main`));

  // Step 4: the second landing runs with nobody in between. Main's code moved,
  // so it is sent back — the move recorded in a commit of its own as well.
  const second = run(mergeSh, r.root, ['land', B]);
  assert.equal(second.code, 3, second.out + second.err);
  assert.equal(status(r), '', 'sending back left the main tree dirty');
  assert.deepEqual(lastFiles(r).sort(), [`A\t${ticketPath(r, B)}`, `D\t.kerjaan/done/${B} Tiket kedua.md`].sort());
  assert.match(show(r, 'HEAD', ticketPath(r, B)), /merge postponed — main changed/);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Board: ${B} back to in_progress, merge postponed`);

  assert.equal(run(mergeSh, wb, ['sync', B]).code, 0);
  assert.equal(run(testRun, wb, [B]).code, 0);
  toReview(r, B);
  passReview(r, B);
  commitBoard(r, 'Papan: B lolos review lagi');
  const third = run(mergeSh, r.root, ['land', B]);
  assert.equal(third.code, 0, third.out + third.err);
  assert.match(third.out, /LANDED/);
  assert.equal(status(r), '');
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, B)}`]);
  assert.doesNotMatch(notes(r, A) + notes(r, B), /held for the owner/);
});

test('catatan "ditahan" juga tersimpan sendiri, tanpa membawa perubahan yang sudah ada di main tree', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  // Somebody's staged change, which makes git refuse the merge, and an
  // unstaged one beside it.
  fs.writeFileSync(path.join(r.root, 'kode.txt'), 'def satu\ndef dua\ndef staged\n');
  git(r.root, 'add', 'kode.txt');
  fs.writeFileSync(path.join(r.root, 'cek.sh'), `${cek}# belum disimpan\n`);
  const before = status(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /HELD: ticket 261016300001/);
  assert.match(show(r, 'HEAD', ticketPath(r, A)), /merge held for the owner — git refused the merge/);
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, A)}`]);
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Board: ${A} merge held for the owner`);
  // Everything that was uncommitted is still uncommitted, staged as before.
  assert.equal(status(r), before);
  assert.equal(git(r.root, 'diff', '--cached', '--name-only').trim(), 'kode.txt');
  assert.equal(fs.readFileSync(path.join(r.root, 'kode.txt'), 'utf8'), 'def satu\ndef dua\ndef staged\n');
});

test('perubahan lain di main tree tidak ikut tersimpan bersama catatan "sudah masuk main"', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  // Uncommitted work of every kind the merge does not touch: a changed code
  // file, a new file, another ticket edited, a new ticket.
  fs.writeFileSync(path.join(r.root, 'cek.sh'), `${cek}# belum disimpan\n`);
  fs.writeFileSync(path.join(r.root, 'baru.txt'), 'baru\n');
  const fileC = path.join(r.k, 'todo', `${C} Tiket ketiga.md`);
  fs.appendFileSync(fileC, '- catatan pemilik yang belum disimpan\n');
  fs.writeFileSync(path.join(r.k, 'backlog', '261016300009 Ide.md'), ticket('Ide'));
  const before = status(r);
  assert.equal(before.trim().split('\n').length, 4);

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED/);
  assert.deepEqual(lastFiles(r), [`M\t${ticketPath(r, A)}`]);
  assert.match(show(r, 'HEAD', ticketPath(r, A)), /landed on main as/);
  assert.equal(status(r), before);
  assert.match(fs.readFileSync(fileC, 'utf8'), /catatan pemilik yang belum disimpan/);
  assert.doesNotMatch(show(r, 'HEAD', `.kerjaan/todo/${C} Tiket ketiga.md`), /catatan pemilik/);
});

test('tiket yang sudah punya perubahan belum disimpan tidak di-commit bersama catatannya', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  const fileA = path.join(r.root, ticketPath(r, A));
  fs.appendFileSync(fileA, '- catatan pemilik yang belum disimpan\n');

  const land = run(mergeSh, r.root, ['land', A]);
  assert.equal(land.code, 0, land.out + land.err);
  assert.match(land.out, /LANDED/);
  assert.match(land.out, /NOTE NOT COMMITTED: \.kerjaan\/done\/261016300001 Tiket pertama\.md already had uncommitted changes/);
  // HEAD is the merge itself; the ticket's file, with both lines, waits.
  assert.equal(git(r.root, 'log', '-1', '--format=%s').trim(), `Merge tiket-${A} into main (ticket ${A})`);
  assert.doesNotMatch(show(r, 'HEAD', ticketPath(r, A)), /catatan pemilik|landed on main/);
  const body = fs.readFileSync(fileA, 'utf8');
  assert.match(body, /catatan pemilik yang belum disimpan/);
  assert.match(body, /landed on main as/);
});

test('di main tree tanpa cabang, catatan "ditahan" tidak di-commit ke HEAD yang lepas', () => {
  const r = repo();
  const wa = add(r, A);
  work(wa, { 'pakai.txt': 'satu\ndua\n' });
  assert.equal(run(testRun, wa, [A]).code, 0);
  toReview(r, A);
  passReview(r, A);
  commitBoard(r);
  git(r.root, 'checkout', '-q', '--detach');
  const before = head(r);
  const held = run(mergeSh, r.root, ['land', A]);
  assert.equal(held.code, 1, held.out + held.err);
  assert.match(held.out, /NOTE NOT COMMITTED: the main tree is on no branch/);
  assert.match(held.out, /HELD: ticket 261016300001/);
  assert.equal(head(r), before);
  assert.match(notes(r, A), /merge held for the owner — the main tree is on no branch/);
});
