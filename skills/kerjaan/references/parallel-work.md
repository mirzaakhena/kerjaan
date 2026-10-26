# Working two tickets at once

Read this only when two tickets are actually going to run side by side. One
ticket at a time is the normal way to work.

Two tickets in the same group of `order.md` have been declared able to run
together, and that is the licence to run them side by side: two
`kerjaan-worker` subagents, each in its own git worktree, so neither sees the
other's half-finished files, at most `max_parallel` at once (`settings.md`).
The foreman creates the worktrees, moves both
tickets to `in_progress`, dispatches both workers with a `Worktree:` line, and
handles each report and verdict as it arrives (`references/foreman.md`).

**The group is the claim; the worktree is only the mechanism.** Which tickets
may share a group is `references/ordering-the-queue.md`, "What may share a
group". Two that share files conflict when they meet, and the one that lands
second resolves it when it brings main in ("Back into main"); the foreman
tells each worker which (`Shares files with:`). The lands-first order is the
plan, not a lock: tickets land in the order they pass ("The merge queue"). If
one turns out to wait for the other's result, they never belonged in one
group: the second waits.

```bash
"$K/worktree.sh" add 260905160401 ../<repo>-<topic>      # from the main tree
"$K/merge.sh" sync 260905160401                          # in the worktree, before review
"$K/merge.sh" land 260905160401                          # from the main tree, once done
```

`"$K/worktree.sh" remove <id>` is for a worktree given up on.

`add` creates the worktree on a new branch, keeps `.kerjaan/` out of its
checkout, gives it a slot and runs `worktree_setup` in it. Always create
worktrees through it — not with `git worktree add`, nor the Agent tool's own
worktree option:

- **The branch name contains the ticket ID**, and that is the entire link
  between git and the board; the prefix is free (`add --branch <name>`). A
  branch that already carries the ID, from a ticket sent back, is reused.
- **The worktree sits beside the repo, never inside it**, or every test
  runner and linter walks a second copy of the project.
- **`.kerjaan/` is not in that checkout** ("The board has one home").

**Every board command runs from the main tree**; the scripts refuse to run
anywhere else. The exceptions are `test-run.sh`, which tests the tree it is run
in and writes its record to the board in the main tree by itself, and
`merge.sh sync`: both run in the worktree. Commits split the same way
(`references/foreman.md`, "Commits"): no commit on the branch carries the
board, and none on main carries the ticket's code until it lands.

## The board has one home

A worktree's own copy of `.kerjaan/` would be a second board, frozen when the
branch was cut: the ticket says `in_progress` in the main tree and `todo` in
the worktree, and nothing reports it. Two guards prevent it:

- **A sparse checkout takes `.kerjaan/` out of the worktree's checkout** —
  out of that tree, not out of git, so nobody reads a stale board.
- **The scripts refuse to run from a linked worktree**, naming the main tree,
  so nobody writes one. This also catches worktrees made by hand.

A project already using sparse-checkout must merge `worktree.sh`'s pattern,
`'/*' '!/.kerjaan/'` (non-cone mode), into what it has.

## Tests take turns

Worktrees separate files, not ports, local databases, fixed paths in `/tmp`
or caches, so two suites running at once can fail each other while both
changes are fine. By default **the work runs side by side and the tests
queue**: `test-run.sh` holds a repository-wide lock (in `.git/kerjaan-locks/`)
while `test_command` runs. A second run waits, says for whom, and its line in
`## Notes` says how long it waited; past `test_lock_timeout` it gives up
without running anything. The reviewer's runs (`"$K/test-run.sh" --review
<id>`) queue on the same lock and record nothing. A project whose tests choose
their port, database and temp folders per worktree sets `parallel_tests: true`.

**Every worktree has a slot**: `0` for the main tree, the lowest free number
from `1` up for each linked worktree, freed when it is removed. The test
command and both worktree commands receive:

| Variable | Holds |
|---|---|
| `KERJAAN_TICKET` | the ticket ID, e.g. `260905160401` |
| `KERJAAN_SLOT` | the slot: `0`, `1`, `2`, ... |
| `KERJAAN_WORKTREE` | the worktree's top directory |
| `KERJAAN_MAIN_TREE` | the main tree, where `.env` and the board live |

So a test setup can say `PORT=$((4000 + KERJAAN_SLOT))` or name its database
`app_test_$KERJAAN_SLOT`. `"$K/worktree.sh" slot` prints the slot of the tree
it runs in; a worktree made by hand gets one the first time it is asked.

## Changes to the board take turns too

Every script that writes the board does it under one `board` lock in
`.git/kerjaan-locks/`, so two writes at nearly the same moment cannot undo
each other. A wait longer than `lock_timeout` ends with a message naming who
holds the board, and nothing changed.

## Setup and teardown

What git does not track — the `.env`, installed packages, a built asset —
does not reach a new worktree. Two settings close that:

- **`worktree_setup`** runs inside every worktree `worktree.sh add` creates,
  before anyone works in it — `cp "$KERJAAN_MAIN_TREE/.env" . && npm ci`, say.
  If it fails, the worktree is removed again (teardown included) and the
  script exits non-zero.
- **`worktree_teardown`** runs inside the worktree when `worktree.sh remove`
  removes it — `dropdb --if-exists "app_test_$KERJAAN_SLOT"`, say. If it fails,
  the worktree is kept. A worktree with uncommitted changes is refused before
  the teardown runs. What setup creates inside the worktree belongs in
  `.gitignore`.

Both get the variables above for the worktree's own ticket and slot, never
the caller's.

## Who owns test data

Data a test keeps outside the repo can still be destroyed by another ticket's
teardown. The owner's rule is that **each ticket carries its own data**:

- **Data a ticket owns is named after it** — after `KERJAAN_TICKET`, or
  `KERJAAN_SLOT` when names must stay short: `app_test_260905160401`, not
  `app_test`.
- **Teardown removes only what it owns**, by that exact name, never a pattern
  (`app_test_*`).
- **Shared data is read, never written.** Tests copy from seed files or a
  shared read-only database into their own; no teardown touches them.
- **Data that is easy to make again is made again** by `worktree_setup`; data
  that is not is the ticket's to bring, in its worktree or under its own name.

Kept to, two tickets pass in whichever order they are tested.

## Back into main: tested together, merged one at a time

Two changes that pass alone can break each other once both are on main, and
git merges them without a word. So **nothing from a branch reaches main until
it has been tested with everything main already holds**, and the reviewer
judges exactly what main will get. "Main" is whatever branch the main tree has
checked out.

**1. Before review, the worker brings main in.** In its worktree, after its
last commit: `"$K/merge.sh" sync <id>`. A conflict stops the merge there, and
resolving it is the worker's job, as part of the ticket. Then `test-run.sh`,
then commit. The move to review is **refused** until the branch holds all of
main's code and the latest test run passed on exactly the committed content
(`STALE`: main moved, run `sync`; `UNTESTED`: run the tests again, commit what
they ran on). The move records in `## Notes`: `review covers branch <b> at
<commit>, which holds main at <commit>`.

**2. Once the reviewer passes it, it joins the merge queue, and the foreman
lands it in its turn, without asking the owner** ("The merge queue"):
`"$K/merge.sh" land <id>`, from the main tree. Landings take turns under a
`merge` lock. It merges only when all three hold:

- main's code has not moved since the branch took it in,
- the branch is still the commit the move to review recorded,
- the latest test run passed on exactly that content.

Then what merges is exactly what was tested, so **the tests are not run
again**. Land checks that once more just before it commits, then removes the
worktree (teardown included) and the branch. Commits that touch only
`.kerjaan/` never count as main moving. **Land commits its own notes** in a
commit of its own (`Board: <id> …`) holding only that ticket's file, or says
`NOTE NOT COMMITTED` when that file already had uncommitted changes.

**3. A merge postponed: the ticket goes back — not the owner's problem.** When
main moved, `land` answers `MERGE POSTPONED` (exit 3), records why in
`## Notes` (`merge postponed — ...`), and moves the ticket to `in_progress`.
Its worker brings main in (step 1) and moves it to review again. That review
is level `quick` and reads only what the worker did beyond the automatic
merge: `"$K/merge.sh" resolution <id>` prints the conflict resolution and any
fix the tests demanded, or `EMPTY`. A merge clean in git that breaks the tests
is caught too: the run after `sync` goes red. A merge postponed is not a
rejection (`references/review.md`, "Rounds").

**When a merge fails, only that ticket waits for the owner.** Anything else
that stops `land` — uncommitted changes git refuses over, a failing hook, the
main tree on no branch, a test record that no longer vouches for the branch —
answers `HELD` (exit 1), writes `merge held for the owner — <reason>` into
`## Notes`, and leaves the ticket in `done/`. What follows is
`references/foreman.md`, step 6.

## The merge queue

Tickets land in the order they passed review. The move to `done` puts a
ticket whose branch is not on main at the back of the queue (`merge queue:
joined as number <n>, behind <ids>` in its Notes); `"$K/merge.sh" queue` lists
it. **Only the front lands**: `land` on any other answers `WAITING` (exit 5)
and touches nothing, so a ticket is synced only in its turn — N tickets, at
most N syncs. A merge postponed keeps the front's place; nothing else lands
meanwhile.

It **leaves** when its review sends it back, a test run fails while it is in
`in_progress`, its merge is held, or it moves to backlog, todo or cancel; the
next is at the front at once, and the one that left joins at the back once it
passes again. Each join, leave and `land` answer ends in a `MERGE QUEUE:` line
saying what to do now. Waiting tickets do not stop the start gate; one
`blocked_by` a waiting ticket starts once it has landed.

## Branches nobody merged

Nothing is recorded; git is asked. `update-ticket.sh` warns when a ticket
reaches `done` or `cancel` with unmerged work outside the merge queue, names
worktrees left when a move empties the board, and refuses the next start while
a left-behind branch holds work outside `HEAD` (`references/foreman.md`, "One
ticket, start to finish", step 1). Closing it is the foreman's: `land` it.
