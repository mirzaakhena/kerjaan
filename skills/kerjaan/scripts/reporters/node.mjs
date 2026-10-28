// The connector between `node --test` and the board's per-test list
// (ticket 261028121401): a reporter that writes each test's start and end, in
// the format SETTINGS.md sets out ("Reporting each test to the board"), to
// the file test-run.sh names in KERJAAN_TEST_REPORT. test-run.sh gives this
// file's own path in KERJAAN_NODE_REPORTER, so a project's test_command never
// names a folder that changes with each version of kerjaan:
//
//   node --test ${KERJAAN_NODE_REPORTER:+--test-reporter=tap --test-reporter-destination=stdout --test-reporter="$KERJAAN_NODE_REPORTER" --test-reporter-destination=/dev/null}
//
// It prints nothing itself; another reporter (tap above) prints the run as
// before. Run outside test-run.sh, KERJAAN_TEST_REPORT is empty and it writes
// nothing. Writing is best-effort: what cannot be written is dropped, and the
// run, its output and its exit status are exactly what they would be without
// this reporter.
//
// What node reports, and what is written for it:
//   - a test file the runner starts or finishes: a line with no name, about the
//     file as a whole: `start`, then `end` once its process has ended, and a
//     later `fail` when the file failed apart from its tests (it could not
//     load, it ended before its tests had);
//   - a test, as it starts (`test:dequeue`) and as it ends (`test:pass`,
//     `test:fail`), named as its author wrote it, after the tests and suites
//     it sits in: "outer > inner";
//   - a test or suite that turns out to hold others: `group`, so the board
//     lists the tests in it and not the group itself; it ends with a line only
//     when it failed apart from the tests in it.
// The runner reports a file's tests in the order the files were given, so the
// tests of a file that runs beside an earlier one arrive when that one is done.

import fs from 'node:fs';
import path from 'node:path';

const target = process.env.KERJAAN_TEST_REPORT || '';
let fd = null;
if (target) {
  try { fd = fs.openSync(target, 'a'); } catch { fd = null; }
}

function write(line) {
  if (fd === null) return;
  try { fs.writeSync(fd, JSON.stringify(line) + '\n'); } catch { /* best-effort */ }
}

const cwd = process.cwd();
const fileOf = (data) => (data.file ? path.relative(cwd, data.file) || data.file : '');
// The runner reports each test file as a test of its own, named by its path.
const isFileItself = (data) => data.nesting === 0 && !!data.file && path.resolve(cwd, String(data.name)) === data.file;

// Per file: the tests open at each depth.
const files = new Map();
const state = (file) => {
  if (!files.has(file)) files.set(file, { open: [] });
  return files.get(file);
};

function handle(type, data) {
  if (!data || typeof data.nesting !== 'number') return;
  const file = fileOf(data);
  if (!file) return;
  if (isFileItself(data)) {
    // `test:complete` comes as the file's process ends; the runner reports a
    // file as failed (`test:fail`) only when it failed apart from its tests,
    // after the tests it did report.
    if (type === 'test:dequeue') write({ file, state: 'start', at: Date.now() });
    else if (type === 'test:complete') write({ file, state: 'end', ms: Math.round(data.details?.duration_ms || 0) });
    else if (type === 'test:fail') write({ file, state: 'fail', ms: Math.round(data.details?.duration_ms || 0) });
    return;
  }
  const f = state(file);
  const n = data.nesting;
  if (type === 'test:dequeue') {
    f.open.length = n;
    const parent = f.open[n - 1];
    if (parent && !parent.group) {
      parent.group = true;
      write({ file, name: parent.name, state: 'group' });
    }
    const name = parent ? `${parent.name} > ${data.name}` : String(data.name);
    f.open[n] = { name, group: false, failedInside: false };
    write({ file, name, state: 'start', at: Date.now() });
    return;
  }
  if (type !== 'test:pass' && type !== 'test:fail') return;
  let entry = f.open[n];
  if (!entry) {
    const parent = f.open[n - 1];
    entry = { name: parent ? `${parent.name} > ${data.name}` : String(data.name), group: false, failedInside: false };
  }
  const ms = Math.round(data.details?.duration_ms || 0);
  const failed = type === 'test:fail' && !data.todo;
  if (failed) {
    for (let i = 0; i < n; i++) if (f.open[i]) f.open[i].failedInside = true;
  }
  if (!entry.group && data.details?.type === 'suite') {
    entry.group = true;
    write({ file, name: entry.name, state: 'group' });
  }
  if (entry.group) {
    if (failed && !entry.failedInside) write({ file, name: entry.name, state: 'fail', ms });
  } else {
    write({ file, name: entry.name, state: failed ? 'fail' : data.skip || data.todo ? 'skip' : 'pass', ms });
  }
  f.open.length = n;
}

export default async function* kerjaanReport(source) {
  for await (const event of source) {
    try { handle(event.type, event.data); } catch { /* best-effort */ }
  }
  if (fd !== null) try { fs.closeSync(fd); } catch { /* best-effort */ }
}
