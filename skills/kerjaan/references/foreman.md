# The foreman: every ticket through a worker

Read this before the first ticket of a session goes to work, whether the user
hands over one ticket or the whole `todo`, and whenever a worker report or a
reviewer verdict comes back.

The main session never writes a ticket's code. It is the **foreman**: it keeps
the board, talks to the owner, and hands each ticket to a `kerjaan-worker`
subagent that starts from an empty context. When the worker reports, the
foreman dispatches `kerjaan-reviewer`; when the verdict comes back, it either
moves on or resumes the same worker to fix what was found. What goes into the
queue in the first place is prepared by a third agent, `kerjaan-planner`, so
that reading the backlog does not fill the foreman's context either.

Why: a session that executes tickets itself fills its context with files,
diffs and test output. By the second or third ticket it is compacted, and the
user ends up opening a fresh session per ticket to get a clean start. With a
foreman, only short reports reach the main session. Each ticket gets the clean
start, and the user hands over a whole queue once.

This holds for a single ticket too. One small fix is a chain of one.

## What stays with the foreman

- Everything on the board but filling the queue: searching, creating,
  settings, moving a ticket into `in_progress`, answering questions about the
  board.
- Everything that needs the owner: relaying the planner's questions and
  proposal, decisions a worker could not make, `--ack-unmerged`,
  `--accept-size`, a merge that failed. Nobody else talks to the owner.
- Landing a worktree branch on main with `merge.sh land` once its ticket
  passed review — at once, one at a time, and without asking the owner
  (`references/parallel-work.md`, "Back into main"). The merge is git
  commands, not code; resolving a conflict is code, and goes to the worker.
- Tickets whose work is a decision and touches no code, since their work is
  the conversation with the owner (see SKILL.md, "Tickets whose work is a
  decision").
- Dispatching reviewers, and counting their rejections. A round ends with
  one rejection by the reviewer; a merge postponed is no rejection and gets no
  round number (`references/review.md`, "Rounds").

The foreman never edits a ticket's code, not even a line it can see is wrong
in a report. It sends the line back to the worker.

What goes to `kerjaan-planner` instead: reading the backlog to say what is
ready, splitting tickets that are too big, estimating the files each ticket
will change, deciding which tickets may run together, writing the owner's
answers into tickets, and — once the owner approved — moving tickets into
`todo` and writing `order.md`.

One exception, and only one: **a tiny change in text the owner asks for
directly** — a typo, a word, a sentence of prose in a README, a guide or a
comment. The foreman may make that itself, with no worker and no reviewer,
because a worker and a reviewer reading their way in from an empty context
cost many times a one-word change, and prose has no behaviour for tests or a
review to catch. It covers text with no logic in it only: anything that
touches a script, code, configuration, a test, or a file a test reads or a
script parses goes to a worker, however small. It covers the owner's own
request only: a slip the foreman spots in a report is sent back, not fixed.
Commit it, when the owner wants commits (SKILL.md, "Committing"), naming the
file alone, and tell the owner in one line what changed (SKILL.md, "Who does
the work").

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

The worker builds it, runs the project's checks, commits the code naming its
paths only if the prompt says so — a commit needs the owner's permission, here
as anywhere — and reports; there is no board to move and no `test-run.sh`
record, since both belong to a ticket. Its report ends in a `For the reviewer:`
block: the request, what it did for each part of it, the files it changed, and
the checks it ran with their exit codes. With no ticket, that block is the
written record of the work.

**A reviewer always follows.** Skipping the ticket skips the board, not the
check: dispatch `kerjaan-reviewer` once the worker reports `DONE`, with:

```
Repo: /path/to/repo
No ticket: the owner asked for this directly — <their words, in full>
Scripts: <kerjaan scripts folder>
Worker's record: <the worker's `For the reviewer:` block, word for word>
Committed: <the commit hashes | no: the work is uncommitted in the tree>
```

The reviewer judges the work against the owner's request, moves nothing and
commits nothing, and reports `PASSED` or `REJECTED` with its findings.
Rejected, resume the same worker with the findings and then the same reviewer,
as for a ticket; a second rejection goes to the owner, as for a ticket
(`references/review.md`). Tell the owner the outcome in one line.

The reason is the one this whole guide rests on: the foreman's context is
the chain's, and work without a ticket fills it exactly as work with one does;
and work nobody independent has checked is no better for having been asked for
in a hurry. Only a tiny change in text the owner asks for directly is the
foreman's own, with no worker and no reviewer (above).

## Filling the queue

When the owner asks what can be worked on — "what can we do today", "fill the
queue", "what's next from the backlog" — or the board goes quiet (SKILL.md,
"When the board goes quiet"), **do not read the backlog yourself.** Its
tickets, and the code needed to judge them, are exactly the reading that would
crowd out the tickets in flight. Dispatch the planner and take its report.

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
number with each answer. The owner answers, takes or changes the review
levels, and approves the proposal, cuts it down or rearranges it.

**3. Resume the same planner** with `SendMessage` to its agent ID: the
answers, word for word with their ticket and number, the review levels the
owner chose, and what the owner approved. It writes the answers into the tickets, moves the approved tickets
to `todo`, writes `order.md`, checks both with `queue.sh check`, commits the
board, and reports `QUEUED`. When an answer changed the proposal, it reports
`CHANGED — needs the owner` instead and moves nothing: back to step 2 with only
what changed. A planner that cannot be resumed is replaced by a new one, told
that the questions are numbered in the tickets and which answers to write.

The foreman moves no ticket into `todo` and writes no line of `order.md`
during this; that is the planner's, by the owner's decision. Never pass on an
approval the owner did not give: "looks fine" about the questions is not yes
to the batch.

## Starting the chain

**1. Settle what the chain covers.** The tickets the user named, or `todo` in
the order `order.md` gives (SKILL.md, "Into `in_progress`"). A ticket in
`backlog` that the user names explicitly is the user's own move; take it.

**2. Ask everything in one message**, before any worker starts — the user may
leave once the chain runs.

A queue the planner filled was cleared when it went in: its questions are
answered in the tickets, too-big tickets are split, and the checks only a
person can make were settled per ticket. Run `"$K/queue.sh" check` (with the
IDs, for tickets the user named from `backlog`). `READY` means nothing about
the tickets is left to ask. Whatever it names instead — a ticket the owner put
in `todo` by hand, one named straight from `backlog`, one edited since — goes
to the planner first (above, "Filling the queue"; the tickets are prepared
where they stand), and its questions join this message. The foreman does not
sweep the tickets itself.

What remains for this message:

- the planner's questions and its suggested review levels, if any (above);
- **checks only a person can make** that a ticket's Notes do not settle yet:
  **deferred** (the work goes on; the worker writes a hand scenario, the item
  is marked as awaiting the owner, and the reviewer does not reject the ticket
  for it) or **holding** (the chain stops at that ticket until the owner has
  checked it);
- unmerged branches the start gate will name, if any (`update-ticket.sh`
  prints them; ask before the first move, not when it refuses);
- a split the owner would rather undo: keeping a ticket whole is recorded with
  `update-ticket.sh <id> --accept-size`, on the owner's word only.

Write each answer into every ticket it touches — `## Notes`, dated, in the
board's language — and run `update-ticket.sh` on each. An answer to a
numbered question goes in with `"$K/queue.sh" answer <id> <n> "<answer>"`
instead, whoever asked it. A deferred human check
reads like:

```markdown
- Decision by mirza, 2026-10-11: the checks only a person can make are
  deferred. The worker writes a hand scenario; the chain does not wait.
```

If nothing in the chain needs asking, say in one line that the chain is
starting and with which tickets, and start.

**3. Keep a progress log** outside the repo — a file in the session's
scratchpad, or the conversation itself — one line per event: ticket, worker
and reviewer agent IDs, commits, verdict and round, questions. The final
summary is written from it. Never put it in `.kerjaan/`.

## One ticket, start to finish

**1. Move the ticket to `in_progress`** yourself, before the worker starts.
The start gate may refuse over unmerged branches, and only you can put that to
the owner.

Then commit the start: the ticket's file, `order.md`, and every board change
of your own still uncommitted — a ticket you cancelled or created, an answer
you wrote in — one quoted pattern per ticket. It is the first of the ticket's
three commits (SKILL.md, "Committing"); the worker's and the reviewer's
follow, each made by them, so you commit nothing else for this ticket.

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

A worker does not message the foreman mid-work. Its questions arrive in its
report and in its ticket: a worker that stops to wait for an answer holds the
ticket while the owner may not be there to give one, and a decision that
cannot wait is a reason to stop, not to ask.

Run it in the background and wait for it. **A "completed" notification is not
a report.** A worker that waits on a run of its own can trigger several of them
before its report exists; the report is what the worker returns at the end, in
the shape its definition gives. Until that arrives, the worker is still
working.

**3. Act on the report.**

| Report | What the foreman does |
|---|---|
| `REVIEW` | The ticket is in `review/`. In the first round, dispatch `kerjaan-reviewer` and record its agent ID next to the worker's; in a later round, or after a merge postponed, resume that reviewer (steps 5 and 6). No hook message reaches you here: the worker made the move, so the hook spoke to the worker. |
| `STOPPED — decision` | Stop the chain (see "When the chain stops"). The question is numbered in the ticket; `"$K/queue.sh" check <id>` shows it. Once the owner answers, resume that worker ("When the owner answers"). |
| anything else | Read why. If the ticket is groundwork for others, stop the chain. Otherwise note it, leave the ticket in `in_progress` with its Notes, and go on. |

Add the report's carry-forward to the log, and the questions that did not stop
the work.

**4. Wait for the verdict before the next worker starts.** Two reasons: the
reviewer may be judging the working tree, which must sit still while it does;
and a rejection is the most valuable thing the next worker can be told. Only
tickets that run side by side in worktrees overlap (`references/parallel-work.md`).

**5. Act on the verdict.**

- **Passed** — the ticket is in `done/`, and its reviewer committed the
  verdict; there is nothing of it for you to commit. When it was worked in a worktree,
  land it now: `"$K/merge.sh" land <id>` from the main tree, and act on the
  answer (below). Add what the reviewer said is worth knowing to the
  carry-forward, and start the next ticket.
- **Sent back, first time** — resume the **same worker** with `SendMessage` to
  its agent ID: name the ticket, say the reviewer sent it back, and give the
  findings in a few lines. The worker still holds the ticket and the code, so
  it fixes without reading either again from the top. When it reports `REVIEW`,
  resume the **same reviewer** with `SendMessage` instead of dispatching a new
  one, saying the fix is in and at which commit. It still holds its first round
  and narrows the second by itself. The worker's report is your only cue here;
  the worker made the move, so no hook message reaches you. When you make the
  move yourself instead, the hook sees the
  earlier review in the ticket and tells you the same thing: resume, and
  dispatch a new reviewer only if that one cannot be resumed.
- **Sent back a second time** — the second rejection: stop the chain (see below).
- **Accepted by the owner** after the second rejection (`references/review.md`)
  — you move it to `done` yourself, and from there it is treated as passed:
  when it was worked in a worktree, land it with `"$K/merge.sh" land <id>` and
  act on the answer (step 6), exactly as for a ticket its reviewer passed. A
  `done` ticket whose branch never reached main is work the board calls
  finished and main does not have.

**6. Act on the landing** (worktree tickets only).

| `land` says | What the foreman does |
|---|---|
| `LANDED` | The ticket is on main, its worktree and branch are gone. Land has already committed its own note in the ticket (`Note committed: …`), so there is nothing of it to commit by hand. Only when it says `NOTE NOT COMMITTED` — the ticket's file had uncommitted changes before land ran, such as a verdict its reviewer did not commit — commit that file once those changes are settled. |
| `MERGE POSTPONED` | A merge postponed: main changed since the branch was tested, or the branch changed after review. The ticket is back in `in_progress`. Resume the **same worker**: bring main in with `merge.sh sync <id>`, resolve any conflict, test, commit, move to review. When it reports `REVIEW`, resume the **same reviewer**, saying this is the review after a merge postponed: level `quick`, reading only `merge.sh resolution <id>`. Then land again. A merge postponed is not a rejection: it gets no round number and does not count toward the second rejection. |
| `HELD` | Tell the owner now, in one line: the ticket and the reason the output gives (it is in the ticket's `## Notes` too). Do not retry, and do not work around it. Only this ticket waits: carry on with the chain, except tickets whose `blocked_by` names it. When the owner has cleared the cause, run `land` again. |

**When a worker or reviewer cannot be resumed** — the foreman's session was
replaced, the transcript expired, `SendMessage` refuses the ID — dispatch a new
one. A new worker gets the ticket path and the instruction to start from the
reviewer's block at the end of `## Notes`; a new reviewer narrows itself from
its predecessor's entry in `## Notes` anyway. Record in the log that this
happened. The summary says so, because a fix made from notes instead of from
memory is worth knowing about.

## Carry-forward

What one ticket learned reaches the next only through you: a new worker has an
empty context and must not need the foreman's history to benefit from it. After
every report and verdict, keep:

- **What is built**: components, helpers, screens, conventions the next ticket
  can reuse, with where they live.
- **Traps**: what cost the worker time, and how it got past.
- **Rejection patterns**: what a reviewer sent back, written as a kind of
  mistake rather than a single instance — "the code was right, but the test
  covered one example of a rule over many" — so the next worker checks for the
  kind.

Pass the whole list to each worker, trimmed to what could plausibly apply.
It grows by a few lines per ticket; that is the point.

## When the chain stops

The chain stops itself, and reports to the user, in three cases:

1. **A decision belongs to the user.** A worker reported `STOPPED — decision`
   and recorded the question, the options and its recommendation with
   `queue.sh ask`. Put it to the owner with its number; record the answer with
   `"$K/queue.sh" answer <id> <n> "<answer>"`, then resume that worker
   ("When the owner answers", below). Or a human check is holding the chain.
2. **The reviewer rejected the same ticket twice.** Put the choice to the
   owner as `references/review.md` describes: fix and review a third time, or
   accept it with a follow-up ticket.
3. **A ticket others stand on did not pass.** Groundwork failing, for any
   reason, means the tickets after it would be built on sand. Groundwork is a
   ticket that another ticket in the chain lists in `blocked_by`, or one
   `order.md` puts in an earlier group whose lead-in says the rest depends on
   it.

A question that does not hold the work up never stops the chain. It is already
in its ticket; collect it for the summary.

### When the owner answers

A ticket stopped on a decision is still in `in_progress`: the worker did not
move it, and the start gate does not run again. To carry on:

1. Record each answer with `"$K/queue.sh" answer <id> <n> "<answer>"`, word for
   word, under the number the worker's report gave. `queue.sh check <id>` then
   shows no open question for it. The answer is committed with the worker's
   work, by the quoted pattern of its ticket; you commit nothing for it.
2. Resume **the same worker** with `SendMessage` to its agent ID: name the
   ticket, say the owner answered, and give each answer with its number. It
   still holds the ticket and the code it read, so it picks up where it
   stopped instead of starting over.
3. Act on its report as on any other ("One ticket, start to finish", step 3):
   `REVIEW` goes to a reviewer — dispatched new in the first round, the one
   before resumed in a later round (step 5) — and the chain carries on from
   this ticket with the next one after it.
   Another `STOPPED — decision` goes round this again.

A worker that cannot be resumed is replaced by a new one, dispatched as in
step 2 of "One ticket, start to finish", told that its question was answered
in `## Notes` under its number and that earlier work may already sit in the
tree. Record the replacement in the log, as for any agent that could not be
resumed.

## The summary

When the chain ends — every ticket passed, or it stopped — first commit any
board change of your own still uncommitted, as in "One ticket, start to
finish", step 1, without a started ticket. Then give the user one summary,
from the log:

- **Passed**: each ticket, and the round it passed in (a review after a merge
  postponed adds no round).
- **Stopped or left open**: each ticket and why — the decision it is waiting
  on, the findings that sent it back twice, the groundwork that failed.
- **Questions**: every one the workers recorded and nobody answered yet,
  blocking first, each with its ticket, its number and the worker's
  recommendation — `"$K/queue.sh" check <id>` on each ticket of the chain
  lists them. These are the user's to answer, with `queue.sh answer`.
- **Awaiting a person**: every deferred human check, with the ticket whose
  Notes hold its hand scenario.
- **Held merges**: every ticket `land` held for the owner, with its reason.
- **Fixed from notes**: any ticket whose worker or reviewer had to be replaced
  instead of resumed.
- **Estimates that missed**: for each ticket that passed and carries an
  estimate, `"$K/queue.sh" compare <id>`; name the files it changed that
  nobody estimated. Those are the clashes the next planning did not see coming.

Then, if the board has gone quiet, carry on with SKILL.md, "When the board goes
quiet".
