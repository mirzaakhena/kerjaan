# The foreman: every ticket through a worker

Read this before the first ticket of a session goes to work, whether the user
hands over one ticket or the whole `todo`, and whenever a worker report or a
reviewer verdict comes back.

The main session never writes a ticket's code. It is the **foreman**: it keeps
the board, talks to the owner, and hands each ticket to a `kerjaan-worker`
subagent that starts from an empty context. When the worker reports, the
foreman dispatches `kerjaan-reviewer`; when the verdict comes back, it either
moves on or resumes the same worker to fix what was found.

Why: a session that executes tickets itself fills its context with files,
diffs and test output. By the second or third ticket it is compacted, and the
user ends up opening a fresh session per ticket to get a clean start. With a
foreman, only short reports reach the main session. Each ticket gets the clean
start, and the user hands over a whole queue once.

This holds for a single ticket too. One small fix is a chain of one.

## What stays with the foreman

- Everything on the board: searching, creating, ordering, settings, moving a
  ticket into `in_progress`, answering questions about the board.
- Everything that needs the owner: clearing questions before the chain starts,
  decisions a worker could not make, the owner's explanation, `--ack-unmerged`,
  `--accept-size`, a merge that failed.
- Landing a worktree branch on main with `merge.sh land` once its ticket
  passed review — at once, one at a time, and without asking the owner
  (`references/parallel-work.md`, "Back into main"). The merge is git
  commands, not code; resolving a conflict is code, and goes to the worker.
- Tickets whose work is a decision and touches no code, since their work is
  the conversation with the owner (see SKILL.md, "Tickets whose work is a
  decision").
- Dispatching reviewers, and counting their rounds.

The foreman never edits a ticket's code, not even a line it can see is wrong
in a report. It sends the line back to the worker.

## Starting the chain

**1. Settle what the chain covers.** The tickets the user named, or `todo` in
the order `order.md` gives (SKILL.md, "Into `in_progress`"). A ticket in
`backlog` that the user names explicitly is the user's own move; take it.

**2. Ask everything in one message**, before any worker starts — the user may
leave once the chain runs:

- The questions from clearing the queue: every unclear line in every ticket
  in the chain (SKILL.md, "Clear the whole queue first").
- **Checks only a person can make.** Read every `Done when` in the chain for
  criteria no worker or reviewer can settle on its own: how something looks on
  a real phone, a day of real use, a call to a real customer. Name them, and
  ask per item or for all of them: **deferred** (the work goes on; the worker
  writes a hand scenario, the item is marked as awaiting the owner, and the
  reviewer does not reject the ticket for it) or **holding** (the chain stops
  at that ticket until the owner has checked it).
- Unmerged branches the start gate will name, if any (`update-ticket.sh`
  prints them; ask before the first move, not when it refuses).
- **Tickets that are too big.** Run `ticket-size.sh <id>` on every ticket in
  the chain. For each one it warns about, give the count and a proposed split
  by outcome (SKILL.md, "How big a ticket is"), and ask: split it, or keep it
  whole. Never start such a ticket without that answer. Keeping it whole is
  recorded with `update-ticket.sh <id> --accept-size`; a split is done before
  the chain starts, and the new pieces join the chain in its order.

Write each answer into every ticket it touches — `## Notes`, dated, in the
board's language — and run `update-ticket.sh` on each. A deferred human check
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

**2. Dispatch the worker** with `subagent_type` `kerjaan:kerjaan-worker` (or
`kerjaan-worker` when the skill is installed without the plugin namespace).
Its fixed steps live in its definition; the prompt carries only what changes:

```
Repo: /path/to/repo
Ticket: .kerjaan/in_progress/<id> <title>.md
Scripts: <kerjaan scripts folder>
Worktree: <path>            (only when working side by side)
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
| `REVIEW` | The ticket is in `review/`. In the first round, dispatch `kerjaan-reviewer` and record its agent ID next to the worker's; in a later round, resume that reviewer (step 5). No hook message reaches you here: the worker made the move, so the hook spoke to the worker. |
| `WAITING — explanation` | Hold the owner's explanation as `references/explanation.md` describes, then move the ticket to `review` yourself. That move is yours, so the hook speaks to you: it says to dispatch a reviewer in the first round, and to resume the earlier one in a later round. |
| `STOPPED — decision` | Stop the chain (see "When the chain stops"). |
| anything else | Read why. If the ticket is groundwork for others, stop the chain. Otherwise note it, leave the ticket in `in_progress` with its Notes, and go on. |

Add the report's carry-forward to the log, and the questions that did not stop
the work.

**4. Wait for the verdict before the next worker starts.** Two reasons: the
reviewer may be judging the working tree, which must sit still while it does;
and a rejection is the most valuable thing the next worker can be told. Only
tickets that run side by side in worktrees overlap (`references/parallel-work.md`).

**5. Act on the verdict.**

- **Passed** — the ticket is in `done/`. When it was worked in a worktree,
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
  move yourself instead (after an owner's explanation), the hook sees the
  earlier review in the ticket and tells you the same thing: resume, and
  dispatch a new reviewer only if that one cannot be resumed.
- **Sent back a second time** — stop the chain (see below).

**6. Act on the landing** (worktree tickets only).

| `land` says | What the foreman does |
|---|---|
| `LANDED` | The ticket is on main, its worktree and branch are gone. Commit the board as usual. |
| `SENT BACK` | Main moved since the branch was tested, or the branch changed after review. The ticket is back in `in_progress`. Resume the **same worker**: main moved, bring it in with `merge.sh sync <id>`, resolve any conflict, test, commit, move to review. When it reports `REVIEW`, resume the **same reviewer**, saying this is a re-integration round: level `quick`, reading only `merge.sh resolution <id>`. Then land again. This is not a rejection and does not count toward the second return. |
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
   and wrote the question, the options and its recommendation into the ticket.
   Or a human check is holding the chain.
2. **The reviewer sent the same ticket back twice.** Put the choice to the
   owner as `references/review.md` describes: fix and review a third time, or
   accept it with a follow-up ticket.
3. **A ticket others stand on did not pass.** Groundwork failing, for any
   reason, means the tickets after it would be built on sand. Groundwork is a
   ticket that another ticket in the chain lists in `blocked_by`, or one
   `order.md` puts in an earlier group whose lead-in says the rest depends on
   it.

A question that does not hold the work up never stops the chain. It is already
in its ticket; collect it for the summary.

## The summary

When the chain ends — every ticket passed, or it stopped — give the user one
summary, from the log:

- **Passed**: each ticket, and the round it passed in.
- **Stopped or left open**: each ticket and why — the decision it is waiting
  on, the findings that sent it back twice, the groundwork that failed.
- **Questions**: every one the workers wrote, blocking first, each with its
  ticket and the worker's recommendation. These are the user's to answer.
- **Awaiting a person**: every deferred human check, with the ticket whose
  Notes hold its hand scenario.
- **Held merges**: every ticket `land` held for the owner, with its reason.
- **Fixed from notes**: any ticket whose worker or reviewer had to be replaced
  instead of resumed.

Then, if the board has gone quiet, carry on with SKILL.md, "When the board goes
quiet".
