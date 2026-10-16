# Working two tickets at once

Read this only when two tickets are actually going to run side by side. One
ticket at a time is the normal way to work, and most boards never need
anything here.

Two tickets sitting in the same group in `order.md` have already been declared
able to run together, and that declaration is the licence to run them side by
side — in separate git worktrees, so neither worker sees the other's
half-finished files.

Side by side means two `kerjaan-worker` subagents running at once, each sent
to its own worktree by the foreman. The foreman creates the worktrees, moves
both tickets to `in_progress`, dispatches both workers with a `Worktree:` line
in their prompts, and handles each report and verdict as it arrives
(`references/foreman.md`). A worker writes code only in its worktree and runs
board commands from the main tree. Use the steps below rather than the Agent
tool's own worktree option: that one does not keep `.kerjaan/` out of the
checkout.

**The group is the claim; the worktree is only the mechanism.** The claim
rests on two different questions (`references/ordering-the-queue.md`, "What
may share a group"), and only one of them keeps tickets apart:

- **One waits for the other's result** — it builds on what the other makes.
  Then they never run together, whatever a worktree could isolate: the second
  would be built on a guess about work that does not exist yet. If that turns
  out mid-work, the answer is not a worktree, it is that they never belonged
  in one group; the second waits.
- **They only change the same files.** Then they may run together. Two
  branches editing one file conflict when they meet, and resolving that is
  ordinary work, done by the ticket that lands second when it brings main in
  ("Back into main"). The lead-in has already named both tickets, the shared
  files and which lands first, and the group's `<!-- lands-first: ... -->`
  line holds that order, so the conflict is expected rather than found.
  The foreman passes that to each worker (`Shares files with:` in its
  prompt), and the one landing second knows from the start whose change it
  will merge.

Which files each ticket will change comes from its estimate, recorded by the
planner; `"$K/queue.sh" overlap` shows which pairs share files and which files.
The order in the lead-in is the plan, not a lock: landing still happens the
moment a ticket passes review. If the ticket named second passes first, it
lands first, and the other brings it in at its own sync — the same merge, the
other way round.

```bash
"$K/worktree.sh" add 260905160401 ../<repo>-<topic>      # from the main tree
"$K/merge.sh" sync 260905160401                          # in the worktree, before review
"$K/merge.sh" land 260905160401                          # from the main tree, once done
```

`land` merges the branch into main and removes the worktree and the branch
itself; `"$K/worktree.sh" remove <id>` is for a worktree given up on.

`add` does what the three git commands below do, and then gives the worktree
a slot and runs the board's `worktree_setup` in it (see "Tests take turns" and
"Setup and teardown" below). Use the script rather than the commands, so the
setup cannot be skipped; the commands are here so the result is understood:

```bash
git worktree add -b tiket-260905160401 ../<repo>-<topic>
cd ../<repo>-<topic>
git sparse-checkout set --no-cone '/*' '!/.kerjaan/'
```

- **The branch name contains the ticket ID**, and that is the entire link
  between git and the board. The prefix is free — `tiket-`, `kerjaan/`,
  whatever a project already uses (`add --branch <name>`) — because the ID is
  what is matched on. Nothing is written down, so no record can go stale, and
  the ticket gains no `branch:` field that would repeat its own ID back at it.
  A branch that already carries the ID, from a ticket sent back, is reused.
- **The worktree sits beside the repo, never inside it.** A `.worktrees/`
  folder within the repository makes every test runner, linter and type checker
  walk a second complete copy of the project.
- **The third line keeps `.kerjaan/` out of that checkout.** It is the one
  easiest to skip and most expensive to omit; the next section is about it.

While the work happens in that worktree, **every board command still runs from
the main tree** — the scripts refuse to run anywhere else. The one exception is
`test-run.sh`, which tests the tree it is run in and writes its record to the
board in the main tree by itself: run it from the worktree. `merge.sh sync`,
which brings main into the ticket's branch, runs there too. The worker is told
both paths in its prompt.

## The board has one home

`.kerjaan/` lives inside the repository, which is the point: the tickets travel
with the code, git holds their history, and one commit can carry both a change
and the status move that goes with it. It also means **every worktree checks
out its own copy of the board.**

That copy is not a backup. It is a second board, and it starts lying
immediately: the ticket being worked on says `in_progress` in the main tree and
`todo` in the worktree, because the worktree's copy is frozen at the moment the
branch was cut. One ticket, two statuses, and nothing anywhere reports it.

The fork is not caused by version control. It is caused by a second working
copy, and that is what gets removed:

- **The sparse-checkout line takes `.kerjaan/` out of the worktree's checkout.**
  Not out of git — out of *that tree*. The files stay tracked, the history
  stays whole, merges from the branch touch nothing under `.kerjaan/`, and
  there is no second board on disk to read or to edit.
- **Both scripts refuse to run from a linked worktree**, naming the main tree
  instead. This catches worktrees created before anyone thought about it.

The two are not redundant. The scripts stop a worktree from *writing* to the
wrong board; the sparse checkout stops anyone from *reading* one. A stale board
that is merely read is still believed.

A caveat worth checking on your own git: the pattern uses non-cone mode, which
newer versions treat as deprecated even while it keeps working. A project
already using sparse-checkout for something else must merge this pattern into
what it has rather than overwrite it.

## Tests take turns

A worktree separates files and nothing else. Two worktrees still share the
machine's ports, its local databases and services, fixed paths in `/tmp`, and
caches. Two test suites running at the same moment can fail each other while
the code in both is fine — and a red run that is nobody's fault costs a review
round to find out.

So by default **the work runs side by side and the tests queue.** `test-run.sh`
holds a lock for the whole repository while `test_command` runs (it lives in
git's common directory, `.git/kerjaan-locks/`, which every worktree shares). A
second run waits, says on screen whose run it is waiting for, and the line it
records in `## Notes` ends with how long it waited and behind which ticket.
A lock left by a run that was killed is taken over as soon as its process is
found gone. A run that is alive but hung cannot be told apart from a slow one,
so the wait has a limit: after `test_lock_timeout` seconds (default 3600, an
hour) the waiting run gives up without running anything, and its message names
the run it was waiting for, so the foreman knows which worktree to look at.

The reviewer's runs queue on the same lock. A reviewer runs the suite, or a
few of its tests, through `"$K/test-run.sh" --review <id>` — in the ticket's
worktree, or with `--dir` in a clean export — and that run waits behind any
worker's run and makes the next one wait, exactly like a second worker's
would. It records nothing in the ticket: the latest run there stays the
worker's, which is what `--check` compares.

A project whose tests share nothing between worktrees sets
`parallel_tests: true` in `settings.md`, and the runs overlap. That is a claim
about the tests, so make it only once they really choose their port, database
and temp folders per worktree — which is what the slot is for.

**Every worktree has a slot**, a small number its tests can build names from:
`0` for the main tree, and the lowest free number from `1` up for each linked
worktree. Two worktrees that exist at the same time never hold the same
number; a number is freed when its worktree is removed. The test command and
both worktree commands receive:

| Variable | Holds |
|---|---|
| `KERJAAN_TICKET` | the ticket ID, e.g. `260905160401` |
| `KERJAAN_SLOT` | the slot: `0`, `1`, `2`, ... |
| `KERJAAN_WORKTREE` | the worktree's top directory |
| `KERJAAN_MAIN_TREE` | the main tree, where `.env` and the board live |

So a test setup can say `PORT=$((4000 + KERJAAN_SLOT))`, or name its database
`app_test_$KERJAAN_SLOT`. `"$K/worktree.sh" slot` prints the slot of the tree
it runs in. A worktree made by hand, without the script, gets one the first
time it is asked.

## Changes to the board take turns too

Workers running side by side move their tickets at nearly the same moment,
and a test run in a worktree writes its result into the ticket in the main
tree while the foreman may be moving that same ticket. Each of those reads a
file — the ticket, `order.md` — changes it, and writes it back, so without
turns the second write silently brings back what the first removed: a started
ticket still listed in `order.md`, a test result gone from `## Notes`.

So every script that writes the board — `update-ticket.sh`, the record
`test-run.sh` makes, the notes `merge.sh land` writes, `queue.sh estimate`,
`ask` and `answer` — does it under one `board` lock, kept with the others in
`.git/kerjaan-locks/`. A turn lasts well under a second. A script that runs
another while holding it (test-run.sh calling update-ticket.sh, say) shares its
turn instead of waiting for itself. A wait longer than `lock_timeout` seconds
(default 120) ends with a message naming who holds the board, and nothing
changed; a test run that gives up this way still prints its result. Both
limits are in `settings.md`; `0` waits without limit. `new-ticket.sh` keeps its
own lock while it picks an ID.

## Setup and teardown

What git does not track does not reach a new worktree: the `.env` nobody
commits, installed packages, a built asset. A fresh worktree can fail its very
first test run for no reason in the code. Two settings close that:

- **`worktree_setup`** runs inside every worktree `worktree.sh add` creates,
  before anyone works in it — `cp "$KERJAAN_MAIN_TREE/.env" . && npm ci`, say.
  If it fails, the worktree is removed again (its teardown included) and the
  script exits non-zero: a half-prepared worktree is not handed to a worker.
- **`worktree_teardown`** runs inside the worktree when `worktree.sh remove`
  removes it — `dropdb --if-exists "app_test_$KERJAAN_SLOT"`, say. If it fails,
  the worktree is kept, so the teardown can be fixed and run again. A worktree
  with uncommitted changes is refused before the teardown runs, so data is
  never dropped from a worktree that then refuses to go. What setup creates
  inside the worktree, like `.env` or `node_modules`, belongs in `.gitignore`.

Both run with the variables above, set to the worktree's own ticket and slot —
never taken from the environment of whoever runs the script.

## Who owns test data

Data a test keeps outside the repo — a database, a folder of fixtures, an
uploaded-files directory — is the one thing two tickets can still destroy for
each other after everything above, because removing a worktree runs a
teardown, and a teardown that removes too much removes the next ticket's data.
The owner's rule is that **each ticket carries its own data**, so the first
ticket's teardown can never take what the second still needs:

- **Data a ticket owns is named after it** — after `KERJAAN_TICKET`, or after
  `KERJAAN_SLOT` when names must stay short. `app_test_260905160401`, not
  `app_test`.
- **Teardown removes only what it owns**, by that exact name. Never a pattern
  (`app_test_*`), never "everything the tests made".
- **Shared data is read, never written.** Seed files, reference datasets, a
  shared read-only database: tests copy from them into their own, and nobody's
  teardown touches them.
- **Data that is easy to make again is made again** by `worktree_setup` — a
  copy of the seed, a fresh schema — rather than carried around or shared.
  Data that is not easy to make again is the ticket's to bring, in its
  worktree or under its own name.

Kept to, these make the order of events irrelevant: two tickets pass whichever
is tested first, including when the first one's worktree has already been
removed before the second is tested.

## Nothing is remembered

A rule saying "remember every worktree you create" is the weakest kind of rule,
because breaking it raises no error — and the session that would do the
remembering is the one that ends. Git already holds the list:

```bash
git worktree list --porcelain | sed -n 's|^branch refs/heads/||p'
```

So `update-ticket.sh` does the noticing, at the two moments where forgetting
turns silent. **When a ticket reaches `done` or `cancel`**, if any branch whose
name carries that ID still holds commits that are not in `HEAD`, it warns that
the board now claims finished work nobody merged. Note what this rests on: a
project naming its branches `feature/export-screen` gets silence rather than a
warning here — the gate at `in_progress`, described below, is the net that
does not depend on names.

**And when a move empties the board** — nothing left in `todo`, `in_progress`
or `review` — it lists any worktree still checked out. Nothing is in flight, so
anything still there is work the board has lost track of.

## Back into main: tested together, merged one at a time

Each ticket is tested and reviewed in its own worktree, which proves each
change on its own. Two changes that pass alone can still break each other
once both are on main — the first renames something, the second still uses
the old name — and git merges them without a word. So **nothing from a branch
reaches main until it has been tested with everything main already holds**,
and the reviewer judges exactly what main will get. `merge.sh` carries it in
three steps; "main" is whatever branch the main tree has checked out.

**1. Before review, the worker brings main in.** In its own worktree, after
its last commit: `"$K/merge.sh" sync <id>`. A conflict stops the merge there,
and resolving it is the worker's job, as part of the ticket — never the
foreman's, which writes no code. Then `test-run.sh`, then commit. The move to
review is **refused** until the branch holds all of main's code and the latest
test run passed on exactly the committed content of the branch; the refusal
says which (`STALE`: main moved, run `sync`; `UNTESTED`: run the tests again,
commit what they ran on). The move then records, in `## Notes`, the commit
that went to review: `review covers branch <b> at <commit>, which holds main
at <commit>`.

**2. Once the reviewer passes it, the foreman lands it — at once, without
asking the owner.** `"$K/merge.sh" land <id>`, from the main tree, for a ticket
in `done/`. Landings take turns under the repository's `merge` lock, so two
never run at the same moment. It merges only when all three hold:

- main's code has not moved since the branch took it in,
- the branch is still the commit the move to review recorded,
- the latest test run passed on exactly that content.

When they hold, the merged content is exactly what was tested, so **the tests
are not run again**: the first ticket of two merges with no second run. Land
checks the merged content against the tested content once more just before
it commits, in case main moved during the merge; then it removes the
worktree (its teardown included) and deletes the branch.

Commits that touch only `.kerjaan/` never count as main moving: the board is
committed on main all the time, and a ticket changing folders changes no code.

**Land commits its own notes.** Whatever `land` writes into the ticket —
`landed on main`, `merge postponed` together with the move back to
`in_progress`, `merge held for the owner` — goes into a commit of its own
(`Board: <id> …`) right after, holding only that ticket's file. The main tree
is left as clean as land found it, so the next landing runs straight on, and
the history shows when each note was written. Anything else uncommitted in the
main tree, staged or not, code or board, stays exactly as it was. The one case
land leaves for a person: when the ticket's file itself already had
uncommitted changes, the note is written but not committed, and the output
says `NOTE NOT COMMITTED`.

**3. A merge postponed: the ticket goes back — not the owner's problem.** Main
moves under every ticket but the first to land. `land` then answers `MERGE
POSTPONED` (exit 3), records why in `## Notes` (`merge postponed — ...`), and
moves the ticket to `in_progress` itself. Its worker brings main in (step 1)
and moves it to review again. The review after a merge postponed is brief —
level `quick`, whatever the ticket's own level — and reads only what the
worker did beyond the automatic merge: `"$K/merge.sh" resolution <id>` prints
exactly that, the conflict resolution and any fix the tests demanded, and
says `EMPTY` when there was nothing. A merge that is clean in git but breaks the tests is caught
here too: the worker's test run after `sync` goes red, and the move to review
is refused until it is fixed.

A merge postponed is not a rejection. The review after it gets no round
number and does not count toward the two rejections that stop the chain
(`references/review.md`, "Rounds").

**When a merge fails, only that ticket waits for the owner.** Anything else
that stops `land` — git refuses because of uncommitted changes in the main
tree, a hook fails, the main tree is on no branch, the test record no longer
vouches for the branch — answers `HELD` (exit 1), writes `merge held for the
owner — <reason>` into the ticket's `## Notes`, and leaves the ticket in
`done/`. The foreman tells the owner at once, with the ticket and the reason.
Everything else carries on: the start gate below does not wait for a held
branch, and other tickets keep landing. A ticket that lists the held one in
`blocked_by` is refused at its start, since what it builds on is not on main.
When the owner has cleared the cause, `land` is simply run again.

## Branches nobody merged

`land` closes the gap between `done` and merged within moments. A branch can
still be left behind — a ticket finished before this existed, a worktree made
by hand, a `land` nobody ran — and that is what the checks here are for.

Closing it belongs to the foreman: `land` it. The warning at `done` exists
because that step is easy to drop — and since a warning in a reviewer's
report is easy to drop too, the next ticket cannot start while the branch is
still there. `update-ticket.sh` refuses the move to `in_progress` until the
branch is merged, deleted, listed in `long_lived_branches`, or the owner has
chosen `--ack-unmerged`. That check does not rely on branch names: a branch
of a ticket still in `in_progress` or `review` is left alone, a branch whose
merge is held for the owner is named but not waited for, and any other branch
with work outside `HEAD` is named. It applies to starting a ticket; a ticket
coming back from `review` or `done` is not new work.
