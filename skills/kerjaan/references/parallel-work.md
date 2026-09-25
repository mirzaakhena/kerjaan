# Working two tickets at once

Read this only when two tickets are actually going to run side by side. One
ticket at a time is the normal way to work, and most boards never need
anything here.

Two tickets sitting in the same group in `order.md` have already been declared
independent of each other, and that declaration is the licence to run them side
by side — in separate git worktrees, so neither session sees the other's
half-finished files.

**The group is the claim; the worktree is only the mechanism.** If two tickets
would touch the same files, the answer is not a worktree, it is that they never
belonged in one group.

```bash
git worktree add -b tiket-260905160401 ../<repo>-<topic>
cd ../<repo>-<topic>
git sparse-checkout set --no-cone '/*' '!/.kerjaan/'
```

- **The branch name contains the ticket ID**, and that is the entire link
  between git and the board. The prefix is free — `tiket-`, `kerjaan/`,
  whatever a project already uses — because the ID is what is matched on.
  Nothing is written down, so no record can go stale, and the ticket gains no
  `branch:` field that would repeat its own ID back at it.
- **The worktree sits beside the repo, never inside it.** A `.worktrees/`
  folder within the repository makes every test runner, linter and type checker
  walk a second complete copy of the project.
- **The third line keeps `.kerjaan/` out of that checkout.** It is the one
  easiest to skip and most expensive to omit; the next section is about it.

While the work happens in that worktree, **every board command still runs from
the main tree** — the scripts refuse to run anywhere else.

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

## `done` does not mean merged

The reviewer moves a ticket to `done`, and the reviewer is forbidden from
changing the repo — which means it cannot merge. So there is a real window
where a ticket says `done` while its branch is still separate, and that window
is not a flaw to be papered over: merging is a decision about the main line,
and the thing that just judged the work is deliberately the thing with no stake
in it.

Closing that window belongs to whoever picks up the verdict: merge the branch,
remove the worktree, delete the branch. The warning at `done` exists because
that handover is easy to drop — and since a warning in a reviewer's report is
easy to drop too, the next ticket cannot start while the branch is still
there. `update-ticket.sh` refuses the move to `in_progress` until the owner has
merged it, deleted it, listed it in `long_lived_branches`, or chosen
`--ack-unmerged`. That check does not rely on branch names: a branch of a
ticket still in `in_progress` or `review` is left alone, and any other branch
with work outside `HEAD` is named.
