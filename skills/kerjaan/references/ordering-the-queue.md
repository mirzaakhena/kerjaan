# The order of the queue

Read this when `todo` holds more than one ticket and the order they are picked
up in matters.

A folder has no order, and `blocked_by` covers only the hard case. Which
ticket to take first, which two can run side by side, and why, lives in one
file, `.kerjaan/order.md`, covering `todo/` and nothing else.

```markdown
**First, on its own.** Everything below reads the settings file it introduces.

- 260905160401 Add the config loader

**Then these two, side by side.** Neither needs the other's result; both change
the menu file, so 260905160502 lands first and 260905160503 merges its menu
entry in.
<!-- lands-first: 260905160502 -->

- 260905160502 Import screen
- 260905160503 Export screen

**Last.** It needs both screens above to exist.

- 260905161001 The nightly summary mail
```

The format is four rules:

- **Order is position on the page**, top to bottom. Nothing is numbered, so
  nothing needs renumbering when the top is taken.
- **A group is tickets that may run in any order**, including at the same time.
  One bullet on its own means that ticket stands alone.
- **The bold lead-in says why, in one sentence** — the part that lives nowhere
  else on the board. The group runs from one bold lead-in to the next; a bold
  paragraph that introduces no ticket is ordinary prose, left alone.
- **A bullet is exactly `- <id> <title>` and nothing else**, so the script can
  edit it safely. Reasoning belongs in the lead-in. Only bullets are read as
  the order — by `queue.sh check`, the scripts and the viewer alike — so an ID
  named in a lead-in or any other prose is safe: it never takes a place.

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
  main"). The lead-in says it in advance: **both IDs, the files they share, and
  which lands first** — the last also on the group's lands-first line ("Saying
  which lands first", below). Put first the one whose change to those files
  the other is built around, or else the smaller one.

Which files a ticket will change comes from its estimate (`"$K/queue.sh"
estimate <id> <path>...`), not its title; `"$K/queue.sh" overlap` lists every
pair whose estimates share files. `"$K/queue.sh" check` refuses a `todo` where a
group holds a ticket together with one it waits for, where a ticket sits before
one it waits for, or where two tickets of one group share files and the
group's lands-first line does not say which of them lands first.

## Saying which lands first

The lead-in says it in prose, for people. What `queue.sh check` reads is one
fixed line in the group, the same in any language:

```
<!-- lands-first: <id> -->
<!-- lands-first: <id>, <id> -->
```

The IDs are the group's tickets in the order they land. A listed ticket lands
before any listed after it and any the line leaves out, so with two tickets
naming one is enough; with three or more sharing files, list every ticket
whose order matters.

```markdown
**Then these two, side by side.** Both change the menu file, so 260905160502 lands first and 260905160503 merges its menu entry in.
<!-- lands-first: 260905160502 -->

- 260905160502 Import screen
- 260905160503 Export screen
```

```markdown
**Dua tiket ini bersamaan.** 260905160502 dan 260905160503 sama-sama mengubah berkas menu; bila dikerjakan bersamaan, 260905160502 digabung ke main lebih dulu.
<!-- lands-first: 260905160502, 260905160503 -->

- 260905160502 Layar impor
- 260905160503 Layar ekspor
```

The line may sit anywhere in the group; put it under the lead-in. One line per
group, exactly as above: `lands-first` in lower case, the colon, twelve-digit
IDs with commas between them; spaces may vary. The prose is never read for the
order. `check` refuses, by line number, a line it cannot read (`<!-- lands
first: ... -->`, an ID in backticks, IDs without commas), a second line in one
group, an ID listed twice or not in the group, and names a pair sharing files
that no line orders.

`update-ticket.sh` keeps the line in step: a ticket leaving `todo` comes off
it, the others keep their order, and a line left naming nobody goes.

## Why this is not a banned index

`order.md` holds what exists nowhere else — the sequence, the parallelism and
the reasons — and is kept in step: `update-ticket.sh` removes a ticket's line
when it leaves `todo` (with the group's lead-in once its last ticket is gone)
and rewrites the title on a rename. A ticket promoted *into* `todo` needs a
place only a human can choose, so the script says so on stderr.
`"$K/queue.sh" check` names a ticket in `todo/` the file never lists and an
entry whose ticket has moved on. A title edited by hand is the one drift
nothing reports.

## Starting it, and refilling it

Write the file the first time ordering actually matters, and not before.

**Refill when `todo`, `in_progress` and `review` are all three empty**, not
when `todo` alone runs dry: a ticket in `review/` can still come straight back,
and choosing what comes next before it is settled is choosing blind.

The planner does the refilling (`references/foreman.md`, "Filling the queue"):
a batch `"$K/queue.sh" check` will call ready once its questions are answered —
`check` is the one
definition of ready, and this guide keeps no list of its own — and, once the
owner approved it, this file, which is then the owner's decision.
