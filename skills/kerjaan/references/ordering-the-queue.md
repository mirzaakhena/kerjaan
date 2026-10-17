# The order of the queue

Read this when `todo` holds more than one ticket and the order they are picked
up in matters.

A folder has no order, and `blocked_by` covers only the hard case. Which
ticket to take first, which two can run side by side, and which of those
lands in main first lives in one file, `.kerjaan/order.md`. It covers every
ticket still being worked on — in `todo/`, `in_progress/` and `review/` — and
nothing else.

```markdown
**Goal.** Customers can move their data in and out of the app on their own.

**First, on its own.** Everything below reads the settings file it introduces.

- 260905160401 Add the config loader

**Then these two, side by side.** Neither needs the other's result.
<!-- lands-first: 260905160502 -->

- 260905160502 Import screen
- 260905160503 Export screen

**Last.** It needs both screens above to exist.

- 260905161001 The nightly summary mail
```

## The lines it may hold

Every line of the file is one of six, and `"$K/queue.sh" check` refuses any
other by its line number, rewriting nothing:

| Line | Shape | Where |
|---|---|---|
| goal line | `**Goal.** <one sentence>` — the same word on a board in any language | at most one, as the first line; no ticket under it |
| lead-in | `**<bold>** <the reason, one sentence>`, on one line | opens a group; at least one ticket line under it |
| lands-first line | `<!-- lands-first: <id>, <id> -->` | inside a group, at most one per group |
| wait-for-owner line | `<!-- wait-for-owner -->`: the group starts only with the owner's yes (`references/foreman.md`, "How far the chain runs") | inside a group, at most one per group |
| ticket line | `- <id> <title>` | inside a group |
| blank line | | anywhere |

- **Order is position on the page**, top to bottom; nothing is numbered.
- **A group is tickets that may run in any order**, including at the same time,
  from its lead-in to the next one.
- **The goal says what the batch is for**, for whoever refills the queue.
- **The lead-in says why, in one sentence on one line**: why here, why
  together or alone. It lists no files: those are in each ticket's estimate.
- **The ID is the ticket; the title is a label for people.** It must read
  exactly as the ticket's title: one edited by hand makes `check` say
  `NOT READY`, by line number. `update-ticket.sh --title` renames both.

Only ticket lines are read as the order — by `check`, the scripts and the
viewer alike — so an ID named in a lead-in never takes a place.

## Where everything else goes

What used to be written around the groups goes elsewhere:

- **Steps a worker must take** for a ticket go into that ticket's `## Notes`.
- **Why a ticket stays in backlog** — left out of the batch, excluded from its
  goal — goes into that ticket's `## Notes`.
- **Status** — what is done, what is being worked on — is written nowhere:
  the folders say it, and a sentence saying it is stale within hours.
- **A dependency** named in a lead-in ("must be final before 260905161001") is
  also in `blocked_by` of every ticket that waits. `check` reads `blocked_by`,
  never the lead-in.

## While tickets are worked on

A ticket's line stays while it is in `todo`, `in_progress` or `review`, and
goes when it is `done`, cancelled, or back in `backlog`: two tickets running
side by side keep their lands-first line while they need it. `update-ticket.sh` does the removal, and with it takes
the ID off the group's lands-first line and drops a group left with no ticket,
lead-in included. The goal line stays until someone rewrites it.

## What may share a group

A group is a claim that its tickets can be worked at the same time, each in
its own worktree (`references/parallel-work.md`). Two questions decide it, and
they are not the same question:

- **Does one wait for the other's result?** It builds on a screen the other
  makes, reads a setting the other adds, or lists it in `blocked_by`. Then they
  **never** share a group, however small the overlap: the one waited for goes
  in an earlier group, the other after it. A chain counts too — A waits for B,
  which waits for C, so A and C are apart as well. A blocker in an earlier
  group is ahead of the ticket waiting for it, as `queue.sh check` reads it.
- **Do they only change the same files?** Then they **may** share a group. A
  clash in a shared file is ordinary: the ticket that lands second brings the
  first one's change in and resolves it (`parallel-work.md`, "Back into
  main"). Which of them lands first is said in advance, on the group's
  lands-first line ("Saying which lands first", below). Put first the one
  whose change to those files the other is built around, or else the smaller
  one. The lead-in gives the reason in one sentence and lists no files: which
  files they share is in their estimates, and `overlap` prints it.

Which files a ticket will change comes from its estimate (`"$K/queue.sh"
estimate <id> <path>...`), not its title; `"$K/queue.sh" overlap` lists every
pair whose estimates share files, and `"$K/queue.sh" check` refuses a group
breaking either rule.

## Saying which lands first

What `queue.sh check` reads is one fixed line in the group, the same in any
language, and nothing else: the lead-in is never read for it.

```
<!-- lands-first: <id> -->
<!-- lands-first: <id>, <id> -->
```

The IDs are the group's tickets in the order they land. A listed ticket lands
before any listed after it and any the line leaves out, so with two tickets
naming one is enough; with three or more sharing files, list every ticket
whose order matters.

```markdown
**These two together.** Neither waits for the other's result.
<!-- lands-first: 260905160502, 260905160503 -->

- 260905160502 Import screen
- 260905160503 Export screen
```

The line may sit anywhere in the group; put it under the lead-in. One line per
group, exactly as above: `lands-first` in lower case, the colon, twelve-digit
IDs with commas between them; spaces may vary. `check` refuses, by line number, a line it cannot read (`<!-- lands
first: ... -->`, an ID in backticks, IDs without commas), a second line in one
group, an ID listed twice or not in the group, and names a pair sharing files
that no line orders.

## Starting it, and refilling it

Write the file the first time ordering actually matters, and not before.

**Refill when `todo`, `in_progress` and `review` are all three empty**, not
when `todo` alone runs dry: a ticket in `review/` can still come straight back,
and choosing what comes next before it is settled is choosing blind. By
then every ticket line is gone and the goal line, if any, is the last batch's:
the refill writes the file anew, goal included.

The planner does the refilling (`references/foreman.md`, "Filling the queue"):
a batch `"$K/queue.sh" check` will call ready once its questions are answered —
`check` is the one
definition of ready, and this guide keeps no list of its own — and, once the
owner approved it, this file, which is then the owner's decision.
