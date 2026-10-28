// Test runs going on right now, read from the copy test-run.sh makes of their
// output while they go:
//
//   <git common dir>/kerjaan-progress/<id>.<pid>.json   { ticket, pid, who, startedAt, command }
//   <git common dir>/kerjaan-progress/<id>.<pid>.log    what the run has printed so far
//   <git common dir>/kerjaan-progress/<id>.<pid>.tests  each test's start and end, when
//                                                     the project reports per test
//
// The .tests file holds one JSON object per line, in the format the kerjaan
// skill's SETTINGS.md sets out, "Reporting each test to the board" (ticket
// 261028121401), which a project's test
// tool writes while it runs (skills/kerjaan/scripts/reporters/node.mjs for
// `node --test`). No such file means the project does not report per test,
// and the run is shown by its output alone.
//
// test-run.sh removes both when the run ends, so a run is shown only while
// it goes; nothing is kept. A pair whose process is gone (a run killed before
// it could clean up) is left out, and the next run removes it.
//
// The output is shown as the run printed it, as a terminal would show it: the
// owner chose that (ticket 261028112701). Only what a terminal would not show
// as text is taken out: colour and cursor codes, and a line overwritten by a
// carriage return keeps only what was written last.
//
// Files are only ever named by what the folder's own listing holds; a ticket
// ID from a request is compared with those names, never joined onto a path.
// Every read is best-effort: what cannot be read is skipped, and nothing here
// throws.

import fs from 'node:fs';
import path from 'node:path';

// How much of a log's end is read, and how many of its lines are kept.
export const TAIL_BYTES = 64 * 1024;
export const LINES = 200;
const LINE_MAX = 2000;

const NAME = /^(\d{12})\.(\d+)\.json$/;

// The repository's common git folder, where test-run.sh writes: `.git` itself,
// or, when `.git` is a file (a linked worktree), the folder it points to.
function gitCommonDir(projectDir) {
  const dotGit = path.join(projectDir, '.git');
  try {
    if (fs.statSync(dotGit).isDirectory()) return dotGit;
    const gitdir = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
    if (!gitdir) return null;
    const own = path.resolve(projectDir, gitdir);
    try {
      return path.resolve(own, fs.readFileSync(path.join(own, 'commondir'), 'utf8').trim());
    } catch {
      return own;
    }
  } catch {
    return null;
  }
}

export const progressDir = (projectDir) => {
  const common = gitCommonDir(projectDir);
  return common ? path.join(common, 'kerjaan-progress') : null;
};

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

// What a terminal shows of some output: escape sequences (colours, cursor
// moves, window titles) dropped, each line only as last written after a
// carriage return, other control characters but tabs dropped.
export function terminalLines(text) {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '')
    .split('\n')
    .map((l) => {
      const parts = l.replace(/\r+$/, '').split('\r');
      return parts[parts.length - 1].replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').slice(0, LINE_MAX);
    });
}

// The last LINES lines of a log, and whether earlier ones were left out.
function tail(file, size) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const from = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - from);
    let got = 0;
    while (got < buf.length) {
      const n = fs.readSync(fd, buf, got, buf.length - got, from + got);
      if (n === 0) break;
      got += n;
    }
    let text = buf.subarray(0, got).toString('utf8');
    let cut = from > 0;
    // A window that starts mid-line drops that piece of a line.
    if (cut) text = text.slice(text.indexOf('\n') + 1);
    if (text.endsWith('\n')) text = text.slice(0, -1);
    let lines = text === '' ? [] : terminalLines(text);
    if (lines.length > LINES) {
      lines = lines.slice(-LINES);
      cut = true;
    }
    return { lines, cut };
  } catch {
    return { lines: [], cut: false };
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

// How much of a .tests file is read, from its start, and how long a name may
// be; past either, what is left out is left out.
export const TESTS_BYTES = 8 * 1024 * 1024;
const NAME_MAX = 500;

const TEST_STATES = new Set(['start', 'pass', 'fail', 'skip', 'group']);
const FILE_STATES = new Set(['start', 'end', 'fail']);

// The per-test list from the lines of a .tests file:
//   { files: [{ file, state, tests: [{ name, state, ms?, at? }] }], counts }
// A file's state: 'running', 'ended', or 'failed' (on its own, apart from its
// tests). A test's: 'running', 'pass', 'fail', 'skip', or 'unfinished' (its
// file failed while it ran). A group is not listed, unless it failed on its
// own. counts: { pass, fail, skip, running }, `fail` counting files that
// failed on their own too. Lines that do not fit the format are skipped.
export function readTestLines(text) {
  const files = new Map();
  const fileOf = (name) => {
    if (!files.has(name)) files.set(name, { file: name, state: 'running', tests: [], open: [] });
    return files.get(name);
  };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    let line;
    try { line = JSON.parse(raw); } catch { continue; }
    if (!line || typeof line.file !== 'string' || !line.file || typeof line.state !== 'string') continue;
    const f = fileOf(line.file.slice(0, NAME_MAX));
    const ms = Number.isFinite(line.ms) && line.ms >= 0 ? line.ms : undefined;
    if (line.name === undefined || line.name === null || line.name === '') {
      if (!FILE_STATES.has(line.state)) continue;
      if (line.state === 'start') { if (f.state !== 'failed') f.state = 'running'; }
      else if (line.state === 'end') { if (f.state !== 'failed') f.state = 'ended'; }
      else f.state = 'failed';
      continue;
    }
    if (typeof line.name !== 'string' || !TEST_STATES.has(line.state)) continue;
    const name = line.name.slice(0, NAME_MAX);
    // The earliest entry of that name still open: a test that ends, or a
    // group, is that one.
    const open = f.open.find((t) => t.name === name);
    if (line.state === 'start') {
      const t = { name, state: 'running' };
      if (Number.isFinite(line.at)) t.at = line.at;
      f.tests.push(t);
      f.open.push(t);
    } else if (line.state === 'group') {
      if (open) open.group = true;
      else {
        const t = { name, state: 'running', group: true };
        f.tests.push(t);
        f.open.push(t);
      }
    } else {
      let t = open;
      if (t) f.open.splice(f.open.indexOf(t), 1);
      else {
        t = { name };
        f.tests.push(t);
      }
      t.state = line.state;
      if (ms !== undefined) t.ms = ms;
      // A group that passed is only its tests; one that failed on its own is
      // listed as a failure.
      if (t.group && line.state === 'fail') delete t.group;
    }
  }
  const counts = { pass: 0, fail: 0, skip: 0, running: 0 };
  const out = [];
  for (const f of files.values()) {
    const tests = [];
    for (const t of f.tests) {
      if (t.group) continue;
      if (t.state === 'running' && f.state === 'failed') t.state = 'unfinished';
      if (t.state in counts) counts[t.state]++;
      tests.push(t);
    }
    if (f.state === 'failed') counts.fail++;
    out.push({ file: f.file, state: f.state, tests });
  }
  return { files: out, counts };
}

function readTests(file, size) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(Math.min(size, TESTS_BYTES));
    let got = 0;
    while (got < buf.length) {
      const n = fs.readSync(fd, buf, got, buf.length - got, got);
      if (n === 0) break;
      got += n;
    }
    // A line still being written is no JSON yet, so it is skipped until done.
    return readTestLines(buf.subarray(0, got).toString('utf8'));
  } catch {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

// Returns Map<ticketId, run[]> for the tickets named in `ids`, each run
//   { run, who, command, startedAt, lastAt, size, testsSize }
// with `lines`, `cut` and `tests` added when `withLines`. `testsSize` is the
// size of the run's .tests file, or -1 when there is none: the project does
// not report per test. `tests` is the list readTestLines makes of it, or null. `lastAt` is when the run last
// printed anything (its log's last change), `startedAt` when it began; both in
// ms. Runs of one ticket are oldest first.
export function readRuns(projectDir, { ids, withLines = false } = {}) {
  const out = new Map();
  const wanted = new Set(ids || []);
  const dir = progressDir(projectDir);
  if (!dir || wanted.size === 0) return out;
  let names;
  try { names = fs.readdirSync(dir); } catch { return out; }
  for (const name of names) {
    const m = name.match(NAME);
    if (!m || !wanted.has(m[1])) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      const pid = Number(m[2]);
      if (!meta || meta.ticket !== m[1] || meta.pid !== pid || !alive(pid)) continue;
      const log = path.join(dir, `${m[1]}.${m[2]}.log`);
      const st = fs.statSync(log);
      const run = {
        run: `${m[1]}.${m[2]}`,
        who: meta.who === 'reviewer' ? 'reviewer' : 'worker',
        command: typeof meta.command === 'string' ? meta.command : '',
        startedAt: Number.isFinite(meta.startedAt) ? meta.startedAt : st.birthtimeMs,
        lastAt: st.mtimeMs,
        size: st.size,
        testsSize: -1,
      };
      const testsFile = path.join(dir, `${m[1]}.${m[2]}.tests`);
      try { run.testsSize = fs.statSync(testsFile).size; } catch {}
      if (withLines) {
        Object.assign(run, tail(log, st.size));
        run.tests = run.testsSize >= 0 ? readTests(testsFile, run.testsSize) : null;
      }
      if (!out.has(m[1])) out.set(m[1], []);
      out.get(m[1]).push(run);
    } catch {
      // half written, or gone between the listing and the read
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.startedAt - b.startedAt || a.run.localeCompare(b.run));
  return out;
}
