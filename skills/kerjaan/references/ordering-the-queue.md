# The order of the queue

Read this when `todo` holds more than one ticket and the order they are picked
up in actually matters. A board that never needs it never has to.

A folder has no order. Which ticket to take first, which two can run side by
side, and why — none of that fits anywhere in the ticket format. `blocked_by`
covers only the hard case, where one ticket cannot start until another
finishes. Most ordering is softer than that: two tickets could go in either
order, but one of them first saves rework.

That lives in one file, `.kerjaan/order.md`, covering `todo/` and nothing else.

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

- **Order is position on the page**, top to bottom. Nothing is numbered,
  because a numbered list has to be renumbered every time its top is taken, and
  a renumbering that goes wrong goes wrong quietly.
- **A group is tickets that may run in any order**, including at the same time.
  One bullet on its own means that ticket stands alone.
- **The bold lead-in says why, in one sentence.** That sentence is the reason
  the file exists — it is the part that lives nowhere else on the board. It may
  wrap over several lines; the group runs from one bold lead-in to the next.
  What makes a group is the bullets under it, not the bold: a paragraph that
  starts in bold and introduces no ticket is ordinary prose, and the script
  leaves it alone. Write the note at the head of the file however reads best.
- **A bullet is exactly `- <id> <title>` and nothing else.** Reasoning belongs
  in the lead-in. Keeping the line to that shape is what lets the script edit
  it safely.

## What may share a group

A group is a claim that its tickets can be worked at the same time, each in
its own worktree (`references/parallel-work.md`). Two questions decide it, and
they are not the same question:

- **Does one wait for the other's result?** It builds on a screen the other
  makes, reads a setting the other adds, or lists it in `blocked_by`. Then they
  **never** share a group, however small the overlap: the one waited for goes
  in an earlier group, the other after it. A chain counts too — A waits for B,
  which waits for C, so A and C are apart as well. Placed so, both are ready
  for `todo` together: a blocker in an earlier group is ahead of the ticket
  waiting for it, and `queue.sh check` reads it that way.
- **Do they only change the same files?** Then they **may** share a group. A
  clash in a shared file is ordinary: the ticket that lands second brings the
  first one's change in and resolves it, as every branch does after a merge postponed
  (`parallel-work.md`, "Back into main"). What makes it ordinary rather than a
  surprise is that it is known in advance, so the lead-in says it: **both IDs,
  the files they share, and which lands first** — the last of those also on
  the group's lands-first line, under "Saying which lands first" below. Put
  first the one whose change to those files the other is built around, or
  else the smaller one.

Which files a ticket will change is not guessed from its title. Every ticket
going into `todo` carries an estimate, recorded with `"$K/queue.sh" estimate
<id> <path>...`, and `"$K/queue.sh" overlap` lists every pair whose estimates
share files, with the files. `"$K/queue.sh" check` refuses a `todo` where a
group holds a ticket together with one it waits for, where a ticket sits before
one it waits for, or where two tickets of one group share files and the
group's lands-first line does not say which of them lands first.

## Saying which lands first

The lead-in says it in prose, for people, in the board's language. What
`queue.sh check` reads is one fixed line in the group, the same on a board in
any language:

```
<!-- lands-first: <id> -->
<!-- lands-first: <id>, <id> -->
```

The IDs are the group's tickets in the order they land, separated by commas.
Of two tickets that share files, the one listed earlier lands first, and a
listed ticket goes ahead of any the line leaves out. So with two tickets,
naming one is enough. With three or more sharing files, list every ticket
whose order matters: `<!-- lands-first: 260905160502 -->` settles that ticket
against each of the others, but leaves the others open between themselves.

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

The line may sit anywhere between the group's bold opening and the next one;
under the lead-in is where people look for it. It is an HTML comment, so a
markdown preview hides it, and the prose stays the place a reader learns why.
One line per group, written exactly as above: the words `lands-first` in
lower case, the colon, and twelve-digit IDs with commas between them. Spaces
may vary. The prose itself is never read for the order, in any language.

What is not the shape is refused with the reason, not guessed at: a line that
looks like the marker but cannot be read (`<!-- lands first: ... -->`, an ID
in backticks, IDs without commas) is named by its line number; so is a second
lands-first line in one group, an ID listed twice, and an ID that is not a
ticket of that group. A pair that shares files and that no line orders is
named with the files it shares.

`update-ticket.sh` keeps the line in step: a ticket leaving `todo` comes off
it, the others keep their order, and a line left naming nobody goes.

## Why this is not the index that is banned in SKILL.md

A summary restates what the folders already say, so it has no way to be right —
only to be a copy that was true once. What `order.md` is for is the opposite
case: the sequence, the parallelism and the reasoning behind them exist nowhere
else. Delete a status summary and nothing is lost; delete this and the thinking
is gone.

It still carries the risk of any second list, and the risk is handled rather
than hoped away:

- **It names IDs, and an ID never changes.** An entry naming a ticket that has
  left `todo/` is not a subtle lie, it is a mismatch one command finds.
- **The moves that would break it are bound into the script.**
  `update-ticket.sh` removes a ticket's line when it leaves `todo` — taking the
  group's lead-in with it once the last ticket in that group is gone — and
  rewrites the title on the line when a ticket is renamed. Both are
  half-actions that raise no error when forgotten, which is the test for what
  gets scripted.
- **What is left over is visible rather than silent.** A ticket promoted *into*
  `todo` needs a place in the file that only a human judgement can choose, so
  the script says so on stderr instead of guessing.

One fact really is copied: each ticket's title, so the file reads as names
rather than numbers. That copy is why renaming goes through the script. Know
what it leaves uncovered — the check below compares IDs, so a title edited by
hand is the one drift nothing reports.

```bash
diff <(for f in .kerjaan/todo/*.md; do [ -e "$f" ] && basename "$f" | cut -c1-12; done | sort) \
     <(sed -n 's/^- \([0-9]\{12\}\) .*/\1/p' .kerjaan/order.md | sort)
```

Silence means they agree. A line on the left is a ticket in `todo/` the order
never mentions; a line on the right is an entry whose ticket has moved on.
`"$K/queue.sh" check` reports both, along with the grouping rules above.

## Starting it, and refilling it

Write the file the first time ordering actually matters — two or three tickets
in `todo` and a real question about which comes first — and not before. Until
it exists the script leaves it alone completely.

**Refill when `todo`, `in_progress` and `review` are all three empty** — not
when `todo` alone runs dry. One command says so, and silence is the answer you
are looking for:

```bash
ls .kerjaan/todo/*.md .kerjaan/in_progress/*.md .kerjaan/review/*.md 2>/dev/null
```

`todo` emptying only means the last ticket was picked up, which is the opposite
of a quiet moment. And a ticket sitting in `review/` is not finished at all —
review is the one status that can hand work straight back to `in_progress`.
Refilling while one is pending means choosing what comes next without knowing
whether the previous thing is done.

All three empty is a different thing entirely: nothing is in flight, nothing is
waiting on a verdict, and the board is genuinely between batches. The same
holds whenever the owner asks what can be worked on.

**The planner does the refilling** (`agents/kerjaan-planner.md`), dispatched
by the foreman (`references/foreman.md`, "Filling the queue"). It proposes a
batch from `backlog` that is worth doing next and that `"$K/queue.sh" check`
will call ready once its questions are answered — `check` is the one
definition of ready, and this guide keeps no list of its own — with the order,
the groups and the reasons, the questions still open in each ticket, and a
review level for each; the foreman puts all of it to the owner in one message:

> From the backlog: 260905160401 first, since the other two read the settings
> file it adds; then 260905160502 and 260905160503 side by side — both change
> the menu file, and 260905160502 lands first. One question on 260905160503:
> may an export overwrite a file of the same name? Move those three?

Nothing moves before the owner approves. Filling `todo` from `backlog` is
deciding what the next batch is, and that stays the owner's call even when the
reasoning looks obvious. Once they have approved the batch and answered its
questions, the planner writes the answers into the tickets, moves them into
`todo` and writes this file, and `order.md` is the owner's decision: picking
up the next ticket from it needs no further asking.

The same holds whenever `todo` already has an `order.md`: the first ticket in
it, or any ticket in its first group, is the next one to start. The file
exists so that question is answered once, when the batch is set, rather than
every time a ticket is finished.
