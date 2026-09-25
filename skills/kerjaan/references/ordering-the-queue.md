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

**Then these two, in any order.** Neither touches the other's files, so two
sessions can take one each.

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
waiting on a verdict, and the board is genuinely between batches. Then propose
a batch from `backlog` that passes both questions under "Into `todo`" in SKILL.md, with the order
and the reasons, and let the user cut it down:

> The board is empty — nothing in `todo`, `in_progress` or `review`. From the
> backlog I would take 260905160401 first, since the other two read the
> settings file it adds, then 260905160502 and 260905160503 in either order.
> Move those three?

Propose; do not move. Filling `todo` is deciding what happens next, and that
stays the user's call even when the reasoning looks obvious.
