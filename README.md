# kerjaan

A ticket tracker that is nothing but markdown files inside your repo. No
database, and no board view stored anywhere — the one view there is gets drawn
live from the folders. Built as a
[Claude Code plugin](https://docs.claude.com/en/docs/claude-code/plugins),
though the format works just as well by hand.

*"Kerjaan" is Indonesian for "work" — the stuff that needs doing.*

## The problem it solves

Tickets are usually written for people who already know the codebase. That
quietly locks out everyone else — the client, the manager, the colleague from
another team — so every question they have has to be answered out loud by
somebody who does know.

`kerjaan` pushes tickets to be self-contained: one file is opened, with no
context about the system at all, and the reader immediately understands what is
happening and what is being asked.

And because it is only files in a repo, the history travels with the code and
there is no service to run, host, or pay for.

## The board

```
<repo root>/.kerjaan/
├── backlog/      ideas, not ready to act on
├── todo/         ready to act on, not started
├── in_progress/  being worked on
├── review/       done, not yet verified
├── done/         passed review
├── cancel/       abandoned
└── order.md      the order to pick `todo` up in — optional
```

File name: `<ticket_id> <title>.md`, for example
`260905160401 Send notifications through Telegram.md`.

The ID has the form `yymmddhhmmxx` — creation time down to the minute, plus a
two-digit sequence number.

## What a ticket looks like

```markdown
---
type: bug
priority: high
review: normal
labels: [telegram-bot]
reporter: mirza
assign_to: claude
created: 2026-09-05 16:04:01
updated: 2026-09-06 14:02:10
related: []
blocked_by: []
---

## Background
The Telegram bot checks for new messages every few seconds. When two messages
arrive at nearly the same moment, one of them is sometimes skipped and that
person never gets a reply.

## How to reproduce
1. Open a chat with the bot
2. Send three short messages within one second of each other
3. Wait ten seconds

Only two replies come back. The third message gets no answer at all, and
nothing anywhere says it was dropped.

## Request
Messages that arrive together must all still get a reply, with none lost.

## Done when
- [ ] The steps above produce three replies rather than two
- [ ] Run for a full day with no reports of a missed message

## Notes
(none yet)
```

Four headings appear in every ticket. `## How to reproduce` is the one
exception: bug tickets carry it, and `feature` and `task` tickets leave it out
entirely rather than filling it with "not applicable" — an empty section
teaches readers to skip sections.

Notice that it names no file, no function, and no library. Technical detail is
not forbidden — but technical decisions belong to whoever executes the work,
rather than being baked into the ticket as a constraint from the start.

The structure is always English. The prose is written in whatever language the
ticket's readers actually speak: an Indonesian team writes `Background`,
`Request`, and the checklist in Indonesian, and the English headings above them
stay exactly as they are.

## Installation

Inside Claude Code:

```
/plugin marketplace add mirzaakhena/kerjaan
/plugin install kerjaan
```

That is the whole installation. All three pieces arrive together and no
settings file needs editing:

```
kerjaan/
├── skills/kerjaan/     the board: how tickets are written and moved
├── agents/             kerjaan-reviewer, the independent reviewer
└── hooks/hooks.json    dispatches that reviewer when a ticket enters review
```

The plugin applies in every project. It does nothing at all in a repo that has
no `.kerjaan/` folder, so installing it globally costs nothing.

Installing the skill alone — `git clone` into `~/.claude/skills/` — still works
and still writes perfectly good tickets. What it loses is the automatic review:
the reviewer agent and the hook are the two pieces that only a plugin install
can register.

## Usage

Usually it is enough to just ask in plain language — "note this down as a bug",
"move that to review", "what are we working on" — and Claude reaches for the
skill on its own, resolving the script paths by itself.

To run the commands by hand, locate them once and work from the repo root:

```bash
K=$(dirname "$(find ~/.claude/plugins -path '*kerjaan/skills/kerjaan/scripts/new-ticket.sh' | head -1)")

# create a ticket (prints the file path; then fill in its prose)
$K/new-ticket.sh backlog "Send notifications through Telegram"

# change a ticket
$K/update-ticket.sh 260905160401 --status in_progress
$K/update-ticket.sh 260905160401 --title "A clearer title"
$K/update-ticket.sh 260905160401          # after editing the prose

# read the board — free-form, no script involved
ls .kerjaan/in_progress/
grep -l 'priority: high' .kerjaan/todo/*.md
```

## Choosing what is next

`todo` means *ready*, and readiness is checked rather than assumed: nothing in
`blocked_by` is still open, `Done when` can be verified by a non-technical
person, no decision is still waiting on the user, and the obvious fields are
filled in. On top of that it means *next* — the ticket is holding others up, or
it is groundwork, or it is quick, or it sits next to work already in flight.
Size is treated as a reason to split a ticket, never as a reason to defer it,
because groundwork is almost always big and a board that defers by size buries
exactly the work everything else is waiting for.

A folder has no order, though, and `blocked_by` only covers the hard case where
one ticket cannot start until another finishes. Softer sequencing lives in
`.kerjaan/order.md`, which covers `todo/` and nothing else:

```markdown
**First, on its own.** Everything below reads the settings file it introduces.

- 260905160401 Add the config loader

**Then these two, in any order.** Neither touches the other's files.

- 260905160502 Import screen
- 260905160503 Export screen
```

Order is position on the page; tickets sharing a group can run side by side;
the bold sentence carries the reasoning, which is the part that exists nowhere
else. `update-ticket.sh` keeps the file honest — a ticket leaving `todo` loses
its line, and a group loses its lead-in once its last ticket is gone.

The file is optional. Write it the first time ordering actually matters, and
refill `todo` from `backlog` only when `todo`, `in_progress` and `review` are
all three empty — a ticket still in review can be handed straight back, so
until then the board does not yet know what it finished.

## The map

When the board outgrows `ls`, draw it:

```bash
node skills/kerjaan/scripts/map.mjs /path/to/repo --open
```

Every ticket is a point. Top to bottom is the time it was created, and tickets
written in the same minute sit side by side. Colour is the status, shape the
type (circle feature, diamond bug, rounded square task), size the priority, and
the ring around a point is how much of its `Done when` is ticked. Arrows run
from a blocker to the ticket it holds up; soft curves are `related`. Zoom as
far as you like: far out it is a constellation, close in every point carries its
ID, then its title, then its type, priority and labels.

It groups by status, type or label into lanes, or by nothing at all, so that
related tickets drift together. Cancelled tickets start hidden, and so do
*settled* done tickets — done, with every relation done or cancelled — since
neither bears on what comes next.

The side panel answers *what should come out of backlog next*, reading
`related` as "came from". Every open ticket sits under its parent: the done
ticket in its own `related` or `blocked_by` created closest before it. A family
is what that finished work left behind, and the panel lists families either
warmest first (the parent touched most recently, while the work is still
fresh) or heaviest first (the most priority ready to start, plus what it
frees). Inside a family, what can start comes before what is still blocked.
Open a ticket, or a whole family, and press 1–4 to pick it up, hold, skip or
cancel it; the map writes those decisions out as text to paste to Claude. The
map itself never writes to the board.

It is live: the server watches `.kerjaan/`, so a ticket moved by hand, by a
script or by Claude glides to its new place while the page is open, with a
note saying what changed. A slider replays the board being written, ticket by
ticket. It needs Node 18 or newer and nothing else, listens on `127.0.0.1`
only, and dies with its process.

## Two tickets at once

Tickets sharing a group in `order.md` have already been declared independent,
which is the licence to run them side by side in separate git worktrees, on
branches whose names carry the ticket ID.

Nothing about that is written down. The ticket gains no `branch:` field — the
ID is already in the branch name, and git's own `worktree list` is a registry
that cannot go stale. The worktree is created with `.kerjaan/` left out of its
checkout, because the board lives in the repository and a second checkout of it
is a second board: the same ticket then reads `in_progress` in one tree and
`todo` in the other, with nothing to report the disagreement. Both scripts
refuse to run from a linked worktree for the same reason. What the board adds is noticing at the two moments where
forgetting turns silent: `update-ticket.sh` warns when a ticket reaches `done`
or `cancel` while its branch still holds unmerged commits, and an idle board —
`todo`, `in_progress` and `review` all empty — must have no worktrees left at
all.

The reviewer checks for a worktree before reading any diff, because reviewing
the main tree for work that lives on a branch would report "nothing changed"
about a ticket that changed plenty.

## Review happens by itself

`review` is the one status that does not sit still waiting for someone to
notice it. The moment a ticket lands there, a hook dispatches the
`kerjaan-reviewer` agent:

```
update-ticket.sh <id> --status review
        ↓
the PostToolUse hook fires — but only if the ticket really is in .kerjaan/review/
        ↓
kerjaan-reviewer runs the ticket's own "Done when" checks itself
        ↓
it moves the ticket to done/, or back to in_progress/ with the evidence
```

Whoever executed the ticket does not get to mark their own work `done`. The
last word belongs to something that did not write the code and has no stake in
it passing — and it judges by running the checks rather than by believing what
`## Notes` claims.

The session that did the work hands the ticket off and moves on — and stops
changing that ticket's code, because the move was the claim that it is
finished and an edit made afterwards is one the reviewer judges without
knowing it happened. A failed review simply puts the ticket back in
`in_progress`, which is where a board is supposed to put unfinished work.

The reviewer never files tickets of its own. Things it notices outside the
ticket's criteria go into a `### Suggested follow-up` block in the reviewed
ticket's notes, for a session with a user in front of it to offer — and an
unmet criterion is never allowed to become one of those suggestions, because a
reviewer that can move a failure into a new ticket is no longer a gate.

### How deep the review goes

A ticket's `review` field decides that, and it is **optional — empty means
`quick`**:

| | What the reviewer does |
|---|---|
| `quick` *(default)* | Runs the project's checks once and reads the change against the criteria |
| `normal` | Proves every criterion by running something, starts the app when a criterion is about what a user sees, and reads the tests for assertions that cannot fail |
| `strict` | All of `normal`, in a clean copy of the repo, plus deliberately breaking the code to confirm the tests actually catch it |

The default is the cheap one on purpose. `strict` can install a project's
dependencies from scratch and run the tests again for every piece of code it
breaks on purpose, which is the right price for a payment path and the wrong one for a reworded button —
and a review that always costs the most is a review people learn to skip.

Depth bounds effort, never honesty. Even `quick` judges the `Done when` list
line by line, refuses to treat `## Notes` as evidence, and digs deeper on its
own when something does not add up. Every review writes the level it ran at
into the ticket, so a `done` never hides how much checking stood behind it.

Claude offers a higher level when the change lands somewhere unforgiving —
money, login, permissions, data you cannot get back — and the choice stays
yours. Tell it you want speed, or that this is a mock or an MVP, and it stops
offering and uses `quick`.

A ticket that fails review should not bounce for long. The reviewer reports
every instance of a mistake it found, not only the first; the session fixes the
whole kind of mistake before resubmitting; a second review re-checks only what
failed and what changed since; and after two returns Claude asks you whether to
try again or accept the ticket with a follow-up, instead of looping on its own.

One limit worth knowing: the reviewer blocks on `Done when` and nothing else.
A checklist that only describes the happy path stays unblocked even at
`strict`, which will verify that happy path thoroughly and pass. If an
unvalidated input is what worries you, the fix is a criterion that says so —
not a deeper review.

## Design principles

These five produced every rule in the skill, and they are enough to derive new
rules for situations not covered yet.

**1. One fact lives in one place.** The title exists only in the file name. The
status exists only in the folder name. The ID exists only in the file name.
There is no `title:`, no `status:`, and no `id:` field — because two copies of
one fact will eventually disagree, and nothing tells you when that happens.

**2. A ticket never states its own identity.** It only states the identity of
other tickets. That is why `related` and `blocked_by` still carry IDs while
`id:` was removed.

**3. Only operations that fail silently get locked into a script.** A wrong
search command produces empty output you notice immediately, so searching is
left free. Moving a file without refreshing `updated`, on the other hand,
raises no error and only surfaces months later — so the two are bound into a
single command, making half an action impossible.

**4. Structure is English; prose is for the reader.** Folder names, frontmatter
keys, `type`, `priority` and `review` values, and the headings never vary. Not
sure which side something falls on? Ask whether the word is identical in every
ticket. If it is, it is structure.

**5. The board serves whoever was not there.** Not the person doing the work —
they already know what they are doing. It serves the one who opens the repo
tomorrow, or after a session ended mid-task, and needs to know what is in flight
and where it stopped without reading a diff and guessing at intent.

This is why `in_progress` is used even for work that will finish in minutes, and
why entering `review` requires ticking the `Done when` list line by line rather
than trusting the feeling of being finished. Both rules cost the worker
something and pay the reader back. Whenever a step feels like pointless ceremony
to whoever is doing it, that is the signal to check who it was for.

## Deliberately absent

- **No board view, index, or summary.** The moment a summary exists it starts
  going stale and quietly lying. To find out what is in flight, read the
  folders. The one non-ticket file, `order.md`, is not a counter-example: what
  it exists for — sequence and reasoning — is something no folder can express.
  It copies one fact, each ticket's title, so the file reads as names rather
  than numbers, and the rename script keeps that copy in step. Nor is the map:
  it reads the folders again on every change and keeps nothing, so there is
  nothing in it to go stale.
- **No change log inside the ticket.** Just `updated`. Git already holds the
  full history.
- **No opinion about git.** How tickets relate to commits is left to each
  repo's own habits.
- **Only three types:** `bug`, `feature`, `task`. Every additional type forces
  the author to think about categorisation, when what actually matters is the
  content.

## License

MIT — see [LICENSE](LICENSE).
