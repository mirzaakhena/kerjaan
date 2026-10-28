---
language:
test_command:
long_lived_branches: []
done_when_limit: 8
parallel_tests: false
lock_timeout:
test_lock_timeout:
worktree_setup:
worktree_teardown:
chain:
max_parallel:
handoff_at: 80
context_window:
---

Settings for this board, read by the kerjaan skill, its reviewer, and
`update-ticket.sh`. Change them by editing this file.

- `language` — the language ticket prose is written in. Headings and
  frontmatter stay English whatever this says.
- `test_command` — the command that runs this project's checks, such as
  `npm test` or `make check`. The worker runs it through `test-run.sh`
  before a ticket goes to review, and the reviewer does not run it again when
  that run passed on exactly the content under review. Empty means the
  project has none, and reviews say so rather than inventing one. A run
  counts as passed by its exit status alone, so the command must exit
  non-zero whenever a test did not run to its end. Options that force the
  runner to exit once its tests are done (Node's `--test-force-exit`, Jest's
  `--forceExit`, Mocha's `--exit`) can end a process before its results are
  delivered, and the run then passes with tests missing: let the run end by
  itself, stop a hung test with a time limit, and end a process that stays
  open only after its output is out. The kerjaan repository does this for
  `node --test` in `tests/complete-runs.mjs`. While the command runs, the
  board shows its live output; it shows each test as well once the command
  reports them, as "Reporting each test to the board" below sets out.
- `long_lived_branches` — branches that hold work outside `HEAD` on purpose,
  so starting a ticket is not refused because of them. Glob patterns work:
  `[develop, release/*]`. List the main branch too if work usually happens on
  another branch.
- `done_when_limit` — how many items a ticket's `Done when` may hold before
  `update-ticket.sh` and `new-ticket.sh` warn that it should be split. Empty
  or missing means 8. The warning never stops a ticket being saved, and the
  owner can keep one ticket whole with `update-ticket.sh <id> --accept-size`.
- `parallel_tests` — whether test runs from different worktrees of this repo
  may overlap. `false`, the default, makes `test-run.sh` wait its turn: one
  run at a time across the whole repository, reviewers' runs included, and a
  run that had to wait says so in the line it records. Set `true` only when the tests share nothing
  between worktrees — no fixed port, local database, fixed temp path or
  cache — for instance because they choose those from `KERJAAN_SLOT`.
- `lock_timeout` — how many seconds a script waits for its turn to write the
  board before giving up. Every change to a ticket or to `order.md` is made
  one at a time, so two workers moving tickets at the same moment cannot
  overwrite each other; a turn lasts well under a second. Empty or missing
  means 120. A wait that runs out ends with a message naming who holds the
  turn and with nothing changed. `0` waits without limit.
- `test_lock_timeout` — how many seconds `test-run.sh` waits for another run's
  turn at the tests (see `parallel_tests`) before giving up, with a message
  naming the run it waited for, without running anything. Empty or missing
  means 3600, an hour: set it above the time your slowest suite takes, so
  only a run that hangs is reported. `0` waits without limit.
- `worktree_setup` — a command run inside every worktree `worktree.sh add`
  creates, before it is used: copy `.env` from `$KERJAAN_MAIN_TREE`, install
  packages, create this ticket's own test database. When it fails, the
  worktree is removed again and not used. Empty means nothing is run.
- `worktree_teardown` — a command run inside a worktree when `worktree.sh
  remove` removes it, and when a failed setup is undone: drop the test
  database or folders that belong to this ticket or slot. It removes only
  what this worktree owns, never shared data. When it fails, the worktree is
  kept. Empty means nothing is run.
- `chain` — where the main session stops working the queue and waits for the
  owner: `queue` runs on until `todo` is empty; `group` stops once every
  ticket of an `order.md` group has passed, before the next group starts;
  `ticket` stops after each ticket passes, and runs one ticket at a time, even
  inside a group. Empty or missing means `queue`. A stop for a decision, a
  second rejection or a failed ticket others stand on happens whatever this
  says.
- `max_parallel` — the most tickets worked side by side, each in its own
  worktree. `worktree.sh add` refuses a worktree past it, naming those in use,
  and creates nothing; `1` works every ticket one after another. Empty or
  missing means no limit: a whole group at once. Under `chain: ticket` the
  limit is 1 whatever this says.
Two more things bound the chain besides these two settings, and the order
between them is fixed: **what the owner says when starting the chain beats a
mark in `order.md`, and the mark beats these settings.** The mark is the line
`<!-- wait-for-owner -->` under a group's lead-in: that group starts only with
the owner's yes, which may be given when the chain starts and is then not asked
for again. "Just one ticket" from the owner is one ticket, whatever `chain`
says. `references/foreman.md`, "How far the chain runs", has the rules, and
`queue.sh check` reports a value of `chain` or `max_parallel` it cannot read.

Two settings say when the main session writes its handoff before the
conversation is summarized:

- `handoff_at` — how full the main session's context may get, in percent,
  before it writes `.kerjaan/handoff.md`: a short note to itself that crosses
  the moment the conversation is summarized. Empty or missing means 80. The
  plugin's `handoff.sh` hook estimates the share from the conversation's
  transcript after each prompt and tool call, so the reminder comes around
  the limit, a few percent either way, and again each time the context has
  grown by another 5 points, when the session rewrites the same file in
  place. The file holds, in a fixed form (`handoff.sh template`): the agents
  running, each with its ticket, role, agent ID and what is awaited from it;
  the merge queue as a pointer to `merge.sh queue`, never a copy; the owner's
  decisions no ticket records yet; questions waiting for the owner; reminders
  for the owner; next steps. Right after the summary the hook hands the file
  to the session, which acts on it before anything else and then deletes it.
  Git ignores it (the hook adds it to `.git/info/exclude`); it is no ticket,
  no status page, and no substitute for the board.
- `context_window` — the tokens `handoff_at` is a share of, written `200000`,
  `200k` or `1M`. Empty means worked out by itself: Claude Code's
  `CLAUDE_CODE_AUTO_COMPACT_WINDOW` when set, otherwise 1,000,000 for a model
  that runs with a 1M window, otherwise 200,000. Set it when sessions on this
  board are summarized at another size, for instance under `/autocompact`.

`queue.sh check` reports a value of `handoff_at` or `context_window` it
cannot read.

The test command and both worktree commands see `KERJAAN_TICKET` (the ticket
ID), `KERJAAN_SLOT` (0 in the main tree; 1, 2, ... in linked worktrees, never
the same for two worktrees at once), `KERJAAN_WORKTREE` and
`KERJAAN_MAIN_TREE`. Who owns which test data is set out in
`references/parallel-work.md` in the kerjaan skill.

## Reporting each test to the board

While `test-run.sh` runs `test_command`, the board's viewer shows the run in
the ticket's Progress section: its live output, and, for a project whose
tests report to it, each test one by one, grouped by test file, with its name
as its author wrote it, whether it runs, passed (green) or failed (red), how
long it took, and the count of green and red so far. A project whose tests do
not report gets the live output alone and the line "This project does not
report per test yet"; nothing fails because of it. Nothing is kept after the
run.

**`node --test`.** kerjaan brings the connector, and `test-run.sh` gives its
path in `KERJAAN_NODE_REPORTER`, so `test_command` never names the plugin's
folder, which changes with each version. Add it beside the reporter that
prints the run, which must then be named too, since naming one reporter
replaces node's own choice (`tap` when the output is not a terminal, as under
`test-run.sh`):

```
node --test ${KERJAAN_NODE_REPORTER:+--test-reporter=tap --test-reporter-destination=stdout --test-reporter="$KERJAAN_NODE_REPORTER" --test-reporter-destination=/dev/null}
```

Run by hand, outside `test-run.sh`, the variable is empty and the command is
plain `node --test`. Every test, new ones included, then reports by itself.
Tests inside a `describe` or a test with subtests are named after it:
`outer > inner`. The runner reports a file's tests in the order the files were
given, so the tests of a file that runs beside an earlier one appear once that
one is done; the file itself shows as running from its start.

**Any other test tool** reports by writing lines to the file named in
`KERJAAN_TEST_REPORT`, from a reporter, plugin or hook of that tool, with no
change to kerjaan. The variable is empty when there is nowhere to report:
write nothing then. Append, one JSON object per line, each line written
whole:

```
{"file":"tests/cart.test.js","state":"start","at":1761627600000}
{"file":"tests/cart.test.js","name":"an empty cart costs nothing","state":"start","at":1761627600010}
{"file":"tests/cart.test.js","name":"an empty cart costs nothing","state":"pass","ms":12}
{"file":"tests/cart.test.js","state":"end"}
```

- `file` — the test file, as the project names it. Required on every line.
- `name` — the test's name as its author wrote it. A line without one is
  about the file as a whole: `start` when it begins, `end` when it is done,
  `fail` when it failed apart from its tests (it could not load, it stopped
  before its tests had finished), which counts as one red, and marks its tests
  still running as not finished.
- `state` for a test — `start`; then `pass`, `fail` or `skip`. An end goes to
  the earliest test of that file and name that has started and not ended; with
  none, it is a test reported only at its end. `group` says that the test
  started under that name holds others: it is not listed, and a later `fail`
  for it is listed and counted only when it failed apart from the tests in it.
- `at` — on `start`, when it started, in milliseconds since 1970: the board
  counts its time on from there. `ms` — on an end, how long it took.

Lines that do not fit are skipped. Whatever a reporter writes, or fails to
write, the run's exit status stays the test command's own, so a reporter
should drop what it cannot write rather than fail the run.
