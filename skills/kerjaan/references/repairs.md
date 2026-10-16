# Repairs

Read this only when something reached the board without going through the
scripts. Neither case should happen in normal use.

## When two tickets share an ID

`new-ticket.sh` picks a sequence number under the board lock, so this cannot
come from the script. It comes from outside: a copy-paste, a git merge of two
branches, a manual rename. Every script that is given such an ID refuses and
names the repair. Find every shared ID, and repair each one, with:

```bash
"$K/repair.sh" duplicate-id                  # lists every shared ID; exit 1 if any
"$K/repair.sh" duplicate-id 260905160401     # repairs that one
```

The ticket with the earliest `created` keeps the ID, since it is the one more
likely to be referred to already. Every other ticket carrying it takes the
next free number of that minute (or of the first later minute with one left);
its `created` stays, `updated` is refreshed, its Notes record the change, and
its line in `order.md` follows it.

When the two were created at the same second, or one has no readable
`created`, nothing is changed: read both, decide which one moves, and name its
file instead: `"$K/repair.sh" duplicate-id <path>`.

What the command cannot decide is listed at the end of its output: every other
place still naming the old ID — a `blocked_by` or `related` in another ticket,
a lands-first line, a branch. While the ID was shared those could mean either
ticket. Read each one, change only those meant for the renumbered ticket, and
run `update-ticket.sh` on every ticket you changed.

## Writing `updated` by hand

Only while repairing a damaged file that `update-ticket.sh` refuses to touch.
Take the real time, never a guess or a copy:

```bash
date '+%Y-%m-%d %H:%M:%S'
```

If the repair moves the ticket to another folder, add the same time as a line
at the end of `## History` too, `- <time> <status>`, creating that section just
before `## Notes` if the ticket has none. Inside a Claude Code session, put the
session between them as the scripts do — `- <time> $CLAUDE_CODE_SESSION_ID
<status>` — so the repair can be traced back to its conversation. A move missing from History reads
later as a ticket that never went there.

`updated` and `## History` are the board's only traces of time. Once either has been wrong, readers
cannot tell whether anything they read is current, and only git history can
restore that.
