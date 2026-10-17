# The foreman: every ticket through a worker

Read this before the first ticket of a session goes to work, whether the user
hands over one ticket or the whole `todo`, and whenever a worker report or a
reviewer verdict comes back.

The main session never writes a ticket's code. It is the **foreman**: it keeps
the board, talks to the owner, and hands each ticket to a `kerjaan-worker`
subagent that starts from an empty context, then dispatches `kerjaan-reviewer`
on its report. `kerjaan-planner` prepares the queue. A session that executed
tickets itself would fill its context with files, diffs and test output; a
foreman receives only short reports. One small fix is a chain of one.

## What stays with the foreman

- Everything on the board but filling the queue: searching, creating,
  settings, moving a ticket into `in_progress`, answering questions.
- Everything that needs the owner: relaying the planner's questions and
  proposal, decisions a worker could not make, `--ack-unmerged`,
  `--accept-size`, a merge that failed. Nobody else talks to the owner.
- Landing a worktree branch with `merge.sh land` once its ticket passed
  review (step 5). The merge is git commands, not code; resolving a conflict
  is code, and goes to the worker.
- Tickets whose work is a decision and touches no code ("Tickets whose work
  is a decision", below).
- Dispatching reviewers, and counting their rejections. A round ends with
  one rejection by the reviewer; a merge postponed is no rejection and gets no
  round number (`references/review.md`, "Rounds").

The foreman never edits a ticket's code, not even a line it can see is wrong
in a report. It sends the line back to the worker.

One exception, and only one: **a tiny change in text the owner asks for
directly** — a typo, a word, a sentence of prose in a README, a guide or a
comment. The foreman may make that itself, with no worker and no reviewer: a
worker and a reviewer reading their way in cost many times a one-word change,
and prose has no behaviour to catch. Anything that touches a script, code,
configuration, a test, or a file a test reads or a script parses goes to a
worker, however small; a slip the foreman spots in a report is sent back, not
fixed. Commit it, when the owner wants commits, naming the file alone, and
tell the owner in one line what changed.

## Work without a ticket

When the user says to skip the ticket — "langsung saja", "no ticket for
this" — the ticket is skipped, not the worker. Dispatch `kerjaan-worker` as in
"One ticket, start to finish", step 2, with the request where the ticket's path
would go:

```
Repo: /path/to/repo
No ticket: the owner asked for this directly — <their words, in full>
Scripts: <kerjaan scripts folder>
Commit: <yes, if the owner wants it committed | no>
Carry-forward: <as for a ticket, if a chain is running>
```

Its report ends in a `For the reviewer:` block, the written record of the
work. **A reviewer always follows**: dispatch `kerjaan-reviewer` once the
worker reports `DONE`, with:

```
Repo: /path/to/repo
No ticket: the owner asked for this directly — <their words, in full>
Scripts: <kerjaan scripts folder>
Worker's record: <the worker's `For the reviewer:` block, word for word>
Committed: <the commit hashes | no: the work is uncommitted in the tree>
```

It reports `PASSED` or `REJECTED` and moves nothing. Rejected, resume the same
worker and then the same reviewer, as for a ticket; a second rejection goes to
the owner (`references/review.md`). Tell the owner the outcome in one line.

## Filling the queue

When the owner asks what can be worked on — "what can we do today", "fill the
queue" — or the board goes quiet, **do not read the backlog yourself**; that
reading would crowd out the tickets in flight.

**1. Dispatch** with `subagent_type` `kerjaan:kerjaan-planner` (or
`kerjaan-planner` without the plugin namespace), in the background, and wait
for its report. The prompt carries only what changes:

```
Repo: /path/to/repo
Scripts: <kerjaan scripts folder>
The owner asked: <their words: today's work, a theme, a number, tickets named>
In flight: <tickets in in_progress / review, and their worktrees>
Just finished: <tickets passed this session, with the carry-forward>
```

**2. Put its questions to the owner in one message**, together with the
proposal: the order, which tickets run together and why, the splits it made,
anything sharing files with work in flight, and the review level it suggests
for each ticket with its reason. The level is the planner's suggestion because
the planner read the code; the foreman relays it and adds none of its own.
Every question is already in its ticket under a number (`#2`); keep the
number with each answer.

**3. Resume the same planner** with `SendMessage` to its agent ID: the
answers, word for word with their ticket and number, the review levels the
owner chose, and what the owner approved. It writes them in, moves the
approved tickets to `todo`, writes `order.md`, runs `queue.sh check`, commits
the board, and reports `QUEUED` — or `CHANGED — needs the owner`, moving
nothing: back to step 2 with only what changed. A planner that cannot be
resumed is replaced by a new one, told which answers to write.

Nothing moves before the owner approves: filling `todo` is deciding what the
next batch is, and that is the owner's call even when the reasoning looks
obvious. "Looks fine" about the questions is not yes to the batch. The
foreman moves no ticket into `todo` and writes no line of `order.md`.

## Starting the chain

**1. Settle what the chain covers.** The tickets the user named, or `todo` in
the order `order.md` gives. That order is already the owner's decision: take
the first ticket, or any ticket in its first group, without asking which —
counting only tickets still in `todo`. With no `order.md`, any ticket in
`todo`. Ask only when the order no longer fits what the board shows, and name
that one problem. A ticket in `backlog` that
the user names explicitly is the user's own move; take it.

**2. Ask everything in one message**, before any worker starts: the user may
leave once the chain runs.

Run `"$K/queue.sh" check` (with the IDs, for tickets named from `backlog`).
`READY` means nothing about the tickets is left to ask. Whatever it names
instead goes to the planner first ("Filling the queue"), and its questions
join this message. Also in it:

- **checks only a person can make** that a ticket's Notes do not settle yet:
  **deferred** (the worker writes a hand scenario, the item is marked as
  awaiting the owner, and the reviewer does not reject the ticket for it) or
  **holding** (the chain stops at that ticket until the owner has checked it);
- each group the chain will reach that `check` names as waiting for the
  owner: may it start without asking again?
- unmerged branches the start gate will name, if any (step 1 below);
- a split the owner would rather undo: `update-ticket.sh <id> --accept-size`,
  on the owner's word only.

Record each answer to a numbered question with `"$K/queue.sh" answer <id> <n>
"<answer>"`. Any other answer goes into every ticket it touches — `## Notes`,
dated, in the board's language — followed by `update-ticket.sh` on each:

```markdown
- Decision by mirza, 2026-10-11: the checks only a person can make are
  deferred. The worker writes a hand scenario; the chain does not wait.
```

If nothing needs asking, say in one line that the chain is starting and with
which tickets, and start.

**3. Keep a progress log** outside `.kerjaan/` — the scratchpad, or the
conversation itself — one line per event: ticket, worker and reviewer agent
IDs, commits, verdict and round, questions.

## How far the chain runs

Where the chain pauses for the owner: what they say when starting ("just one
ticket") wins over a `<!-- wait-for-owner -->` line in `order.md`, which wins
over `chain` in `settings.md`:

- **`queue`**, or empty: on until `todo` is empty.
- **`group`**: pause once every ticket of a group has passed.
- **`ticket`**: pause after each ticket; one at a time, even inside a group.

**A group that waits for the owner** starts only with their yes. A yes given
at the start goes into its tickets' Notes and is not asked again; a group with
a ticket in flight has started.

**`max_parallel`** caps the tickets worked side by side; `worktree.sh add`
refuses one past it. Only the owner raises it.

A pause is a stop ("When the chain stops"): the summary, then the owner's word.

## One ticket, start to finish

**1. Move the ticket to `in_progress`** yourself, before the worker starts.
The start gate refuses while a local branch holds commits outside `HEAD` —
other than branches of tickets in `in_progress` or `review`, this ticket's
own, `long_lived_branches`, and branches whose merge `land` held for the owner
(those are named, not waited for; a ticket listing one in `blocked_by` is
refused). Put the list to the owner, branch by branch: merge it, delete it,
add it to `long_lived_branches`, or start anyway. Only on that last answer
rerun with `--ack-unmerged`, which records the branches in `## Notes`.

Then commit the start: the ticket's file, `order.md`, and every board change
of your own still uncommitted — a ticket you cancelled or created, an answer
you wrote in — one quoted pattern per ticket ("Commits", below):

```bash
git add -A -- .kerjaan/order.md '.kerjaan/*/<id> *' ['.kerjaan/*/<other id> *' ...]
git commit -m "<message>" -- .kerjaan/order.md '.kerjaan/*/<id> *' ['.kerjaan/*/<other id> *' ...]
```

**2. Dispatch the worker** with `subagent_type` `kerjaan:kerjaan-worker` (or
`kerjaan-worker` when the skill is installed without the plugin namespace).
Its fixed steps live in its definition; the prompt carries only what changes:

```
Repo: /path/to/repo
Ticket: .kerjaan/in_progress/<id> <title>.md
Scripts: <kerjaan scripts folder>
Worktree: <path>            (only when working side by side: code is committed
                            on its branch there, the ticket's file in the main tree)
Shares files with: <id> (<files>), which lands <first | second>   (from order.md)
Owner's answers for this chain: <e.g. human-only checks deferred>
Carry-forward:
- <component built in an earlier ticket, and where>
- <trap found, and how it was avoided>
- <what reviewers rejected before, as a pattern>
```

Run it in the background and wait. **A "completed" notification is not a
report**: until the report arrives, in the shape its definition gives, the
worker is still working.

**3. Act on the report.**

| Report | What the foreman does |
|---|---|
| `REVIEW` | In the first round, dispatch `kerjaan-reviewer` and record its agent ID next to the worker's; in a later round, or after a merge postponed, resume that reviewer (steps 5 and 6). When the worker ends with the ticket in `review/`, the hook attaches the instruction for this round to the report, once per move; a worker that ends without moving its ticket brings none. |
| `STOPPED — decision` | Stop the chain ("When the chain stops"); `"$K/queue.sh" check <id>` shows the numbered question. |
| anything else | Read why. If the ticket is groundwork for others, stop the chain. Otherwise note it, leave the ticket in `in_progress` with its Notes, and go on. |

Add the report's carry-forward to the log, and the questions that did not stop
the work.

**4. Wait for the verdict before the next worker starts**: the reviewer may be
judging the working tree, which must sit still, and a rejection is the most
valuable thing the next worker can be told. Only tickets that run side by side
in worktrees overlap (`references/parallel-work.md`).

**5. Act on the verdict.**

- **Passed** — the ticket is in `done/`, and its reviewer committed the
  verdict; there is nothing of it for you to commit. When it was worked in a worktree,
  land it now: `"$K/merge.sh" land <id>` from the main tree, one at a time,
  without asking the owner, and act on the answer (step 6). Add what the
  reviewer said is worth knowing to the carry-forward.
- **Sent back, first time** — resume the **same worker** with `SendMessage` to
  its agent ID: name the ticket and give the findings in a few lines. When it
  reports `REVIEW`, resume the **same reviewer** with `SendMessage`, saying the
  fix is in and at which commit. The hook says the same with the worker's
  report, dispatching a new reviewer only if that one cannot be resumed.
- **Sent back a second time** — the second rejection: stop the chain (see below).
- **Accepted by the owner** after the second rejection (`references/review.md`)
  — you move it to `done` yourself, and it is treated as passed: a worktree
  ticket is landed with `"$K/merge.sh" land <id>` (step 6).

**6. Act on the landing** (worktree tickets only).

| `land` says | What the foreman does |
|---|---|
| `LANDED` | Done; land committed its own note. Only on `NOTE NOT COMMITTED`, commit the ticket's file once its earlier uncommitted changes are settled. |
| `MERGE POSTPONED` | A merge postponed: the ticket is back in `in_progress`. Resume the **same worker** to bring main in (`merge.sh sync <id>`) and move it to review; then resume the **same reviewer**, saying this is the review after a merge postponed, and land again. No round number. |
| `HELD` | Tell the owner now, in one line, with the reason the output gives. Do not retry or work around it. Only this ticket waits, with tickets whose `blocked_by` names it; once the owner cleared the cause, run `land` again. |

**When a worker or reviewer cannot be resumed** — the session was replaced,
the transcript expired, `SendMessage` refuses the ID — dispatch a new one. A
new worker gets the ticket path and the instruction to start from the
reviewer's block at the end of `## Notes`; a new reviewer narrows itself from
its predecessor's entry. Record it in the log; the summary says so.

## Commits

**One ticket worked in the main tree is at most three commits**, each made by
whoever made the change in it, in the form SKILL.md, "Committing" gives:

1. **Start** — the foreman, right after moving the ticket to `in_progress`:
   the ticket, `order.md`, and any board change of its own still uncommitted.
2. **Work** — the worker, after its move to `review`: the code and the ticket
   together, so the commit that holds the work also says it is in review.
3. **Verdict** — the reviewer, after its move to `done` or back to
   `in_progress`: its ticket's file and `order.md`, nothing else.

A ticket sent back adds one work and one verdict commit per round. Nobody
commits the board alone in between.

**Side by side**, a worktree holds no `.kerjaan/`, so code and ticket cannot
share a commit: the worker commits its code on its branch, and its ticket's
file in the main tree. The verdict and `land`'s notes go in the main tree.

## Carry-forward

What one ticket learned reaches the next only through you. Keep:

- **What is built**: components, helpers, conventions the next ticket can
  reuse, with where they live.
- **Traps**: what cost the worker time, and how it got past.
- **Rejection patterns**: what a reviewer sent back, written as a kind of
  mistake rather than a single instance — "the code was right, but the test
  covered one example of a rule over many".

Pass the whole list to each worker, trimmed to what could plausibly apply.

## When the chain stops

The chain stops itself, and reports to the user, in three cases:

1. **A decision belongs to the user.** A worker reported `STOPPED — decision`.
   Put the question to the owner with its number; record the answer with
   `"$K/queue.sh" answer <id> <n> "<answer>"`, then resume that worker
   ("When the owner answers", below). Or a human check is holding the chain.
2. **The reviewer rejected the same ticket twice.** Put the choice to the
   owner as `references/review.md` describes.
3. **A ticket others stand on did not pass**: one another ticket in the chain
   lists in `blocked_by`.

A question that does not hold the work up never stops the chain; collect it
for the summary.

### When the owner answers

The ticket is still in `in_progress`; the start gate does not run again. Once
each answer is recorded word for word under its number (it is committed with
the worker's work), resume **the same worker** with `SendMessage`: name the
ticket, say the owner answered, and give each answer with its number. Act on
its report as on any other. A worker that cannot be resumed is replaced by a
new one, told that its question was answered in `## Notes` and that earlier
work may already sit in the tree.

## When the owner says "mark it done"

"Done" means passed review, and the path runs through the worker's checks
whatever the ticket's status. The foreman neither ticks `Done when` nor moves
a ticket to `review` itself.

- **`todo` or `in_progress`.** Move a `todo` ticket to `in_progress`, then
  dispatch a worker (or resume this chain's worker on it), adding to its
  prompt: `The owner says this work is done: <their words>.` It checks each
  line, finishes what is missing, runs `test-run.sh` and moves the ticket to
  `review`. Tell the user the reviewer will move it to `done`.
- **`review`.** It is already waiting for its reviewer; say so.

If the owner explicitly wants to skip review — "langsung done saja" — the path
is the same up to `review`, so `test-run.sh` still records the checks; then
the foreman moves the ticket to `done` without review and appends to
`## Notes`: `Moved to done by <owner> without review, <date>.` A worktree
ticket is then landed as in step 5.

## Tickets whose work is a decision

Some tickets have no code: their work is putting questions to the owner and
writing the answers down. The rules hold all the same:

- **Into `in_progress` before the first answer is written into the ticket.**
- **Its estimate is what it writes**, or `queue.sh estimate <id> --none` when
  it changes no file of the project.
- **Give it a criterion for where the decision ends up** — the README, a
  `CLAUDE.md`, whatever every session reads, not only a ticket in `done/`.
- It goes to `review` from `in_progress` like any ticket, and a reviewer
  judges it.

## The summary

When the chain ends — every ticket passed, or it stopped — first commit any
board change of your own still uncommitted, as in "One ticket, start to
finish", step 1, without a started ticket. Then give the user one summary,
from the log:

- **Passed**: each ticket, and the round it passed in.
- **Stopped or left open**: each ticket and why.
- **Questions** nobody answered yet, blocking first, each with its ticket and
  number — `"$K/queue.sh" check <id>` on each ticket of the chain lists them.
- **Awaiting a person**: every deferred human check, with the ticket whose
  Notes hold its hand scenario.
- **Held merges**, with their reasons.
- **Fixed from notes**: any ticket whose worker or reviewer was replaced.
- **Estimates that missed**: `"$K/queue.sh" compare <id>` on each ticket that
  passed with an estimate; name the files it changed that nobody estimated.

## When the board goes quiet

When `todo`, `in_progress` and `review` are all empty, the batch is over.
Before the conversation ends, without waiting to be asked:

1. Offer the reviewers' suggested follow-ups (`references/review.md`).
2. Run `"$K/release.sh" unreleased`. When it lists tickets not marked
   `(board only)`, name them to the owner and offer a release; a yes makes the
   release a ticket like any other, whose release commit names the ID of every
   ticket it carries. `NO RELEASE`, or only board-only tickets: say nothing.
3. Dispatch the planner for the next batch ("Filling the queue"), with what
   just finished and the carry-forward, and relay its proposal.
