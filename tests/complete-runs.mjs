// Loaded into every process of the test run by test_command (`--import`), in
// place of `--test-force-exit` (261017222801).
//
// `--test-force-exit` ends a process with `process.exit()` as soon as its
// tests are done, and that drops whatever it has not yet written out: on
// macOS, writes to a pipe are asynchronous. The runner reads every test
// file's results through such a pipe, so a file of 95 tests was counted as
// 70, 88 or 95, and the run still passed. The runner's own report, to
// whatever reads the run, was cut short the same way.
//
// So the run now ends the way Node ends by itself, which delivers everything,
// and this file keeps the promise `--test-force-exit` was there for, and adds
// one:
//
// - A file whose tests have all finished never keeps the run waiting: if
//   something it left open (a server, a child process, a timer) still holds
//   the process after LINGER_MS, the process is ended, once what it wrote has
//   been delivered. A test stuck mid-way is stopped by `--test-timeout`, as
//   before.
// - A file that ends before its tests have finished (`process.exit()` from a
//   test or from code under test) exits non-zero, and the runner reports that
//   file as failed. Without this, a file that stopped half-way with status 0
//   passed, its remaining tests never counted.

import { after } from 'node:test';

const LINGER_MS = 5000;

// Only in the process of one test file: the runner's own process starts the
// files and reports them, and it ends by itself once they have.
if (process.env.NODE_TEST_CONTEXT?.startsWith('child')) {
  const file = process.argv[1] ?? 'this test file';
  let finished = false;

  after(() => {
    finished = true;
    setTimeout(() => {
      const open = process.getActiveResourcesInfo().filter((r) => r !== 'Timeout');
      process.stderr.write(`${file}: its tests have finished, but ${open.join(', ') || 'a timer'} still held the process after ${LINGER_MS / 1000} seconds; ending it.\n`);
      if (process.stdout.writableLength === 0) process.exit();
      else process.stdout.once('drain', () => process.exit());
    }, LINGER_MS).unref();
  });

  process.on('exit', () => {
    if (finished) return;
    process.stderr.write(`${file}: the process ended before its tests had finished; counted as failed.\n`);
    process.exitCode = 1;
  });
}
