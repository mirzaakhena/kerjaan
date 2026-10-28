// Test runs going on right now, read from the copy test-run.sh makes of their
// output while they go:
//
//   <git common dir>/kerjaan-progress/<id>.<pid>.json   { ticket, pid, who, startedAt, command }
//   <git common dir>/kerjaan-progress/<id>.<pid>.log    what the run has printed so far
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

// Returns Map<ticketId, run[]> for the tickets named in `ids`, each run
//   { run, who, command, startedAt, lastAt, size }
// with `lines` and `cut` added when `withLines`. `lastAt` is when the run last
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
      };
      if (withLines) Object.assign(run, tail(log, st.size));
      if (!out.has(m[1])) out.set(m[1], []);
      out.get(m[1]).push(run);
    } catch {
      // half written, or gone between the listing and the read
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.startedAt - b.startedAt || a.run.localeCompare(b.run));
  return out;
}
