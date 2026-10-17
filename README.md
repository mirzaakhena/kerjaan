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
├── todo/         the queue for one work session: ready, not started
├── in_progress/  being worked on
├── review/       done, not yet verified
├── done/         passed review
├── cancel/       abandoned
├── order.md      the order of the work in todo and in flight — optional
└── settings.md   language, test command, long-lived branches,
                  side-by-side tests and worktree setup, how far
                  the chain runs
```

`settings.md` is written once, the first time the board is used: Claude
proposes values read off the repo and asks you to confirm them. Its
`test_command` is run once per handover, not twice: see "The checks run once"
below.

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

## History
- 2026-09-05 16:04:01 todo
- 2026-09-06 14:02:10 4dbcf082-290a-4f65-845c-ee75fd3b3e9c in_progress

## Notes
(none yet)
```

A move made inside a Claude Code session also names that session in its
History line, so `claude --resume <session-id>` opens the conversation that
made it again, for as long as Claude Code keeps the transcript. A move made
from a plain terminal leaves the id out.

Five headings appear in every ticket. `## How to reproduce` is the one
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
├── agents/             kerjaan-planner, who prepares the queue from the backlog,
│                       kerjaan-worker, who executes one ticket,
│                       and kerjaan-reviewer, the independent reviewer
└── hooks/hooks.json    asks for that reviewer when a ticket enters review
```

The plugin applies in every project. It does nothing at all in a repo that has
no `.kerjaan/` folder, so installing it globally costs nothing.

Installing the skill alone — `git clone` into `~/.claude/skills/` — still works
and still writes perfectly good tickets. What it loses is the worker, the
automatic review and the hook: those are the pieces only a plugin install can
register.

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
$K/update-ticket.sh 260905160401 --status in_progress --ack-unmerged
                                          # start despite unmerged branches
$K/update-ticket.sh 260905160401 --accept-size
                                          # the owner keeps a big ticket whole
$K/ticket-size.sh 260905160401            # is it too big? changes nothing

# run test_command and record what it ran on; then ask whether a version matches
$K/test-run.sh 260905160401
$K/test-run.sh --check 260905160401 HEAD  # SAME / DIFFERENT / NO EVIDENCE

# a worktree for working two tickets side by side, and bringing its work back
$K/worktree.sh add 260905160401 ../repo-topic
$K/merge.sh sync 260905160401             # in the worktree: merge main in, before review
$K/merge.sh land 260905160401             # passed review: into main, one at a time
$K/merge.sh resolution 260905160401       # what the review after a merge postponed reads
$K/worktree.sh remove 260905160401        # a worktree given up on
$K/test-run.sh --review 260905160401      # the reviewer's run, queued with the rest

# the planner's tools for filling todo from the backlog
$K/queue.sh estimate 260905160401 src/notify.py   # files the ticket is expected to change
$K/queue.sh overlap                       # pairs of tickets whose estimates share files
$K/queue.sh ask 260905160401 "<question>" # a numbered question for the owner
$K/queue.sh answer 260905160401 1 "<answer>"
$K/queue.sh check                         # todo and order.md ready? READY / NOT READY
$K/queue.sh compare 260905160401          # estimate against what really changed

# finished tickets that no release carries yet
$K/release.sh unreleased                  # LAST RELEASE, then UNRELEASED: <n> and the tickets

# read the board — free-form, no script involved
ls .kerjaan/in_progress/
grep -l 'priority: high' .kerjaan/todo/*.md
```

## One session, many tickets

Hand a session one ticket or a whole queue, and the session you talk to never
writes the code itself. It acts as the **foreman**: it keeps the board, asks
you what needs asking, and gives each ticket to a fresh `kerjaan-worker`
subagent that starts with an empty context.

```
you hand over the tickets
        ↓
the foreman asks everything up front, in one message
        ↓
per ticket:  the foreman moves it to in_progress and commits that
             kerjaan-worker does it, moves it to review, commits work and
               ticket together, reports
             the foreman dispatches kerjaan-reviewer and waits for the verdict,
               which the reviewer commits itself
             sent back → the same worker is resumed to fix it,
                         and the same reviewer is resumed for round two
        ↓
one summary for you at the end
```

**Why.** A session that works tickets itself collects every file it read and
every test it ran. By the second or third ticket its context is full, it gets
compacted, and you end up opening a new session per ticket to start clean.
Here, only short reports reach the foreman: every ticket starts clean, and
the session stays light until the queue is finished. It also holds for a
single ticket, so there is one way of working, not two.

**What you are asked at the start.** The open questions in every ticket of the
queue, together, with the review level the planner suggests for each; and,
for checks only a person can make — how it looks on a real phone, a day of
real use — whether they are deferred or should hold the queue. Deferred ones
become a hand scenario in the ticket, marked as awaiting you, and the reviewer
does not reject the ticket over them.

**What travels between tickets.** The worker's report ends with what the next
ticket can reuse, the traps it hit, and anything a reviewer would catch. The
foreman collects these, adds the reasons any ticket was sent back, and hands
the whole list to the next worker. Workers never read each other's history;
the lessons still arrive.

**A rejected ticket goes back to the worker who did it**, resumed from its own
transcript, so it fixes without reading the ticket and the code again. The
next round goes to the same reviewer, resumed the same way. If the session was
replaced and the old worker cannot be reached, a new one works from the
ticket's notes, and the summary says so.

**When it stops on its own.** A decision that is yours to make (the worker
records the question, the options and its recommendation in the ticket,
numbered the same way as the planner's questions, and never guesses), the same ticket rejected twice by its reviewer, or a ticket the others build
on failing. A question that does not hold the work up is written into its
ticket and waits for the summary.

**What you get at the end.** One summary: which tickets passed and in which
round, which stopped and why, every question the workers left, and every
check still waiting for a person.

The rules the foreman follows are in
`skills/kerjaan/references/foreman.md`; the worker's steps are in
`agents/kerjaan-worker.md`.

## Choosing what is next

`todo` means *ready*, and readiness is checked rather than assumed: it is
whatever `queue.sh check` says, and that one script is the definition the
skill, the planner and the guides all point to (the conditions are spelled out
once, in the skill's "Into `todo`"). A ticket waiting for another is ready once
the other is finished or queued in an earlier group, and a decision ticket
that changes no file says so instead of naming a made-up one. On top of that it means *next* — the ticket is holding others up, or
it is groundwork, or it is quick, or it sits next to work already in flight.
Size is treated as a reason to split a ticket, never as a reason to defer it,
because groundwork is almost always big and a board that defers by size buries
exactly the work everything else is waiting for.

**Who reads the backlog.** Ask "what can we work on today" and the session you
talk to does not read the backlog itself: it sends `kerjaan-planner`, a
subagent with a clean context, and keeps its own for the work in flight. The
planner judges each ticket's readiness, splits the ones that are too big by
outcome, writes down which files each ticket is expected to change, and
proposes an order — which tickets may run together and why. Its questions,
from every ticket, reach you in one message; each is numbered in its ticket,
and a ticket with a question still open cannot be moved into `todo` at all.
Once you approve, the planner writes your answers into the tickets, moves them
into `todo` and writes `order.md`. Two tickets that only change the same files
may run side by side, with the order they land in decided up front; a ticket
that needs another's result never runs beside it. After a ticket is done,
`queue.sh compare <id>` shows what was estimated against what really changed.

How big is too big has a number: about 6 to 8 items in `Done when`. Past that
the review gets duller, the result shows up an hour later instead of a quarter
of an hour, the worker runs out of room more often, and one failing part holds
back all the rest. Whenever a script saves a ticket over the limit it prints a
warning with the count — the ticket is saved all the same — and the session
offers you a split by outcome, pieces you can each try on their own, before
the ticket goes to `todo` or starts. You can keep a ticket whole; that
decision is written into its Notes and the warning stops for it. The limit is
`done_when_limit` in `settings.md`, 8 when unset.

`todo` is the queue for one working session, and it is cleared as a whole
before any of it starts: every open question across every ticket in `todo` is
put to the user in one go and the answers written back into the tickets. Only
then does work begin, one ticket at a time or side by side — so the session can
run to the end without stopping to wait for anyone.

Work starts from a ticket. Ask Claude to fix or build something and it
searches the board first — if a ticket already covers the same outcome, that
one is updated instead — or creates one, and shows you its `Request` and
`Done when` before touching any code. A new session starts by looking in
`in_progress/` and `review/` for work somebody left behind, and says so before
starting anything new.

When a batch is finished — `todo`, `in_progress` and `review` all empty — the
session that just ran the batch reads the backlog and proposes what should come
next, while it still remembers the work. It proposes; you choose.

A folder has no order, though, and `blocked_by` only covers the hard case where
one ticket cannot start until another finishes. Softer sequencing lives in
`.kerjaan/order.md`, which covers the tickets in `todo/`, `in_progress/` and
`review/`, and nothing else:

```markdown
**Goal.** Customers can move their data in and out of the app on their own.

**First, on its own.** Everything below reads the settings file it introduces.

- 260905160401 Add the config loader

**Then these two, side by side.** Neither needs the other's result.
<!-- lands-first: 260905160502 -->

- 260905160502 Import screen
- 260905160503 Export screen
```

The file has a fixed grammar: every line is a goal line at the top (at most
one, `**Goal.**` in any language), a bold lead-in on one line, a lands-first
line, a wait-for-owner line, a ticket line `- <id> <title>`, or a blank line.
`queue.sh check` refuses any other line by its number, and rewrites nothing.
Order is position on the page; tickets sharing a group can run side by side;
the lead-in gives the reason in one sentence, without listing files — which
files two tickets share is in their estimates; and the lands-first line says
which of two tickets sharing files lands in main first. The title on a ticket
line is a label: one that differs from its ticket's makes `check` say
`NOT READY`, and a rename by `update-ticket.sh --title` keeps it in step.

What used to be written around the groups goes elsewhere: steps a worker must
take into that ticket's Notes, why a ticket stays in backlog into that
ticket's Notes, status nowhere at all — the folders say it — and every
dependency a lead-in names into `blocked_by` of the ticket that waits.

`update-ticket.sh` keeps the file honest: a ticket keeps its line while it is
worked on and reviewed, so two tickets running side by side still know which
lands first, and loses it once it is done, cancelled or back in backlog — its
ID off the lands-first line too, and its group's lead-in once the group is
empty. Once the file is set, it is your choice already made: a session takes
the next ticket still in `todo` from the top of it without asking you again.
The full rules are in `skills/kerjaan/references/ordering-the-queue.md`.

How far a session works through the queue before it comes back to you is
yours to set in `settings.md`. `chain: queue`, the default, runs until `todo`
is empty; `chain: group` stops after each group; `chain: ticket` stops after
each ticket and runs one at a time, even inside a group. A group whose result
you want to try before the next one starts gets the line
`<!-- wait-for-owner -->` under its lead-in: the session asks you before
starting it, and not again if you said yes when the chain started. What you
say when you start always wins — "just one ticket" is one ticket — then the
mark, then the setting. `max_parallel: <n>` caps how many tickets run side by
side, empty for no cap; `worktree.sh` refuses a worktree past it.
`queue.sh check` accepts one wait-for-owner line per group and names the
groups that wait.

The file is optional. Write it the first time ordering actually matters, and
refill `todo` from `backlog` only when `todo`, `in_progress` and `review` are
all three empty — a ticket still in review can be handed straight back, so
until then the board does not yet know what it finished.

## The viewer

The viewer shows every board you have as a kanban, from one server:

```bash
node viewer/server.mjs --scan ~/Workspace --open
```

Every folder directly under `~/Workspace` that holds a `.kerjaan/` is a
project, at `http://127.0.0.1:4321/<folder name>/`. The front page lists them
with how many tickets each holds per status; a board created later appears
without a restart.
`--project <folder name>` makes the address it prints and opens that
project's kanban instead of the front page.

A project opens as a kanban: one column per status, `todo` in the order
`order.md` gives, the other columns most recently touched first. A card
listed in `order.md` shows its group's number: tickets of one group share it,
since they may run side by side (not that they are running now), tickets in
`in_progress` and `review` keep it until they are done, and once every ticket
of the first group is done the next group is #1. The cards of a group with a
`<!-- wait-for-owner -->` line say they wait for the owner's go-ahead until a
ticket of it is in flight, the rule `queue.sh check` uses. Cards can be
filtered by type, priority, label and words in the title, and the filter lives
in the address, so a filtered view can be bookmarked. A card opens the ticket
itself, rendered, with every ticket it names one click away; each ticket has
its own address (`/<project>/ticket/<id>`). The page follows the board as it
changes, the ticket you are reading included. Any column can be hidden and
shown again, still showing how many tickets it holds; `cancel` starts hidden,
and the browser remembers the choice. `todo`'s header opens `order.md` itself,
reasons and all. Under each group whose tickets share files, it shows which
pairs share which files: read from the tickets' estimates every time the board
is read, never written into `order.md`, and the same files `queue.sh overlap`
names for that pair. Pairs across groups are not shown.

Beside the project's name, every active project (those not archived in this
browser) is a button, by name, the open one marked, so another board is one
click away. When they do not fit on one line the row scrolls sideways; on a
phone it gets a line of its own under the name.

A card in `done` whose code is not on the main line yet says so: "not
merged", with the name of every branch that carries its ID and holds
commits outside `HEAD` — the same rule `update-ticket.sh` applies when it
refuses to start the next ticket, so the board shows beforehand what that
refusal would name. A merge held for the owner is marked too, since its code
is not on main either. Branches in `long_lived_branches` are never named, and
the mark goes away by itself once the branch is merged or deleted, on an open
page as well. A project that is not a git repository shows no mark.

It only reads, needs Node 18 or newer and nothing else, and
listens on `127.0.0.1` only, unless started with `--lan`. `--port` picks
another port (`0` for any free one). Its tests run with `node --test` from the
repo root.

To watch the boards from a phone on the same Wi-Fi as the Mac, add `--lan`:

```bash
node viewer/server.mjs --scan ~/Workspace --port 4321 --lan
```

Under the address for the Mac itself, it prints the Mac's address on each
network it is on, such as `http://192.168.1.20:4321/`: type that one into the
phone's browser. On a phone the page fits the screen — one status at a time,
the ticket opening over the board — and follows the board live as it does on
the Mac. There is no password: while it runs with `--lan`, anyone on the same
network can read every board it shows, and it prints a warning saying so.
Without `--lan`, no other device can reach it. If macOS asks whether `node`
may accept incoming connections, allow it, or the phone gets no answer.

## Two tickets at once

Tickets sharing a group in `order.md` have already been declared able to run
together — none waits for another's result, and when two change the same files
the group's lands-first line says which lands first — which is the licence to run them side by side
in separate git worktrees, on branches whose names carry the ticket ID.

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

A warning at `done` lands in the reviewer's report, where it is easily lost, so
the next start is a gate instead: `update-ticket.sh` refuses to move a ticket
into `in_progress` while any local branch holds commits outside `HEAD` —
whatever it is named. Branches of tickets still in `in_progress` or `review`
are left alone, and so are the `long_lived_branches` in `settings.md`. For
anything else you decide: merge it, delete it, or start anyway with
`--ack-unmerged`, which records the branches in the new ticket. Claude never
passes that flag on its own.

Each change is tested on its own branch, which proves it alone; two changes
that pass alone can break each other once merged, without git noticing. So a
branch reaches main only after it was tested with all of main inside it. The
worker merges main in (`merge.sh sync`), resolves any conflict itself, and
tests that state; the move to review is refused until the branch holds all of
main's code and its latest test run covers exactly what is committed. Once the
reviewer passes it, the foreman lands it with `merge.sh land`, right away and
without asking the owner, one merge at a time — and without running the tests
again, since what lands is exactly what was tested. When main has moved in
the meantime, the ticket goes back to its worker to merge again, and the
reviewer looks briefly at only the conflict resolution. A merge that fails
for any other reason holds that one ticket for the owner, with the reason in
its Notes; everything else carries on.

A worktree separates files, not the ports, local databases and caches a test
suite uses, so test runs from different worktrees take turns: `test-run.sh`
holds one lock for the whole repository, the reviewer's runs included, and a
run that had to wait says so in the line it records. A board whose tests share nothing sets
`parallel_tests: true`. Each worktree gets a slot number and its ticket ID in
`KERJAAN_SLOT` and `KERJAAN_TICKET`, to name its own port or database by. The
worktrees are made with `worktree.sh`, which runs `worktree_setup` from
`settings.md` in each new one (copying `.env`, installing packages) and
`worktree_teardown` when it is removed; each ticket's test data carries its
name, so one ticket's teardown never removes another's.

The reviewer checks for a worktree before reading any diff, because reviewing
the main tree for work that lives on a branch would report "nothing changed"
about a ticket that changed plenty.

## Review happens by itself

`review` is the one status that does not sit still waiting for someone to
notice it. The moment a ticket lands there, the `kerjaan-reviewer` agent is
dispatched:

```
the worker runs update-ticket.sh <id> --status review
        ↓
the PostToolUse hook fires — but only if the ticket really is in .kerjaan/review/
        ↓
inside the worker it says: stop and report; never dispatch a reviewer yourself
        ↓
the worker ends; with its report, the hook tells the foreman: dispatch the reviewer
        ↓
the foreman dispatches kerjaan-reviewer
        ↓
kerjaan-reviewer runs the ticket's own "Done when" checks itself
        ↓
it moves the ticket to done/, or back to in_progress/ with the evidence
```

Only the foreman dispatches reviewers, because only the foreman counts the
rounds, carries a verdict's lesson to the next worker, and knows which worker
to resume. The hook tells the two apart by whether the move was made inside a
subagent, and remembers which worker moved which ticket: when that worker
ends — the Agent tool returning, or the notification of a worker run in the
background — the reminder arrives with its report, so a ticket does not sit
in review because the foreman's attention was elsewhere. A worker that ends
without moving its ticket brings no reminder. When the foreman makes the move itself for a ticket that has been
reviewed before, the hook tells it to resume that reviewer rather than
dispatch a new one, and says which round this is. A round ends with one
rejection by the reviewer; a merge postponed — `merge.sh land` sending a
passed ticket back because main moved first — is no rejection, and the
review after it has no round number.

Whoever executed the ticket does not get to mark their own work `done`. The
last word belongs to something that did not write the code and has no stake in
it passing — and it judges by running the checks rather than by believing what
`## Notes` claims.

Telling Claude "mark that as done" sends the ticket to `review` too, so the
reviewer still has the last word. Say you want to skip review and it goes
straight to `done` instead, with a note in the ticket saying no review stood
behind it.

The worker hands the ticket off and ends — and nobody changes that ticket's
code from then on, because the move was the claim that it is
finished and an edit made afterwards is one the reviewer judges without
knowing it happened. A failed review simply puts the ticket back in
`in_progress`, which is where a board is supposed to put unfinished work.

The reviewer never files tickets of its own. Things it notices outside the
ticket's criteria go into a `### Suggested follow-up` block in the reviewed
ticket's notes. Once every ticket that was in flight has reached `done`, the
foreman collects those suggestions and offers them to the user as a single
multiple-choice question; the ones picked become tickets, and each answer —
ticketed or declined — is marked next to its suggestion so it is never offered
twice. An unmet criterion is never allowed to become one of those
suggestions, because a reviewer that can move a failure into a new ticket is
no longer a gate.

### The checks run once

The worker runs the project's `test_command` before handing the
ticket over, through `test-run.sh`. The script appends one line to the
ticket's notes: when it ran, whether it passed, and a fingerprint of exactly
the content it ran on — every file git would see, new files included, with
`.kerjaan/` left out so moving tickets never changes it.

The reviewer does not take that line's word for anything that matters. It
asks git for the fingerprint of the version it is reviewing, and
`test-run.sh --check` answers:

- **SAME** — the run passed on exactly this content. The suite is not run a
  second time.
- **DIFFERENT** — something changed after the run, even one line, and the
  answer names the files. The reviewer runs the checks itself.
- **NO EVIDENCE** — no run recorded, the run failed, the content changed while
  it ran, or `test_command` has changed since. The reviewer runs the checks.

Committing after the run does not break the match, because a commit does not
change content. What is taken on trust is only that the run passed — the same
trust a CI badge asks for. Code the reviewer changes itself, such as a
deliberate break at `strict`, is always tested by the reviewer.

### How deep the review goes

A ticket's `review` field decides that, and it is **optional — empty means
`quick`**. `quick` reads the change against the criteria beside one run of the checks,
`normal` proves each criterion by running something, and `strict` also breaks
the code on purpose to see the tests catch it. The full table of what each
level does is in [`agents/kerjaan-reviewer.md`](agents/kerjaan-reviewer.md),
"How thorough to be".

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
every instance of a mistake it found, not only the first; the same worker,
resumed, fixes the whole kind of mistake before resubmitting; a second review re-checks only what
failed and what changed since; and after two returns Claude asks you whether to
try again or accept the ticket with a follow-up, instead of looping on its own.

One limit worth knowing: the reviewer blocks on `Done when` and nothing else.
A checklist that only describes the happy path stays unblocked even at
`strict`, which will verify that happy path thoroughly and pass. If an
unvalidated input is what worries you, the fix is a criterion that says so —
not a deeper review.

## Running the tests

From the repository root, with Node 18 or newer and nothing installed:

```bash
node --test
```

That one command runs the whole suite: every `*.test.mjs` under `tests/` (the
scripts in `skills/kerjaan/scripts/`) and `viewer/tests/` (the viewer). This
board's own `test_command`, which `test-run.sh` runs before a ticket goes to
review, is the same run with two guards added (Node 22 or newer):
`node --test --test-timeout=900000 --import=./tests/complete-runs.mjs`. The
time limit makes a test which hangs fail after 15 minutes instead of holding
the run forever. `tests/complete-runs.mjs` ends a test file whose tests are
done but which something left open keeps alive, once its results are
delivered, and fails a file that ends before its tests have finished. It
replaces `--test-force-exit`, which dropped results still on their way out,
so a run could pass with tests missing. Each test
builds a throwaway repository with a board under the system temp folder and
runs the real scripts against it; nothing in this checkout is changed. Expect
a few minutes for the whole run.

Naming a folder does not work: `node --test tests/` tries to load `tests/` as a
single module and fails with "Cannot find module". To run part of the
suite, name the files, or a glob in quotes (Node 21 or newer):
`node --test tests/update-ticket.test.mjs` or `node --test 'tests/*.test.mjs'`.

The skill, the scripts, the agent definitions, the viewer and the tests are
written in English. `tests/english-only.test.mjs` fails when a common
Indonesian word appears in any of them, naming the file and the line. A
board's own `.kerjaan/` folder is not read. An example that shows a board in
another language on purpose goes in that test's list of exceptions, with its
reason.

The skill's `description` is held to a trigger test: about 40 prompts in
`tests/trigger/prompts.json`, each run three times in a fresh `claude -p`
session, recording whether it calls the skill. That run uses Claude quota, so
the suite does not make it; `tests/trigger.test.mjs` only checks the stored
results against the current prompts and description, and fails when either
changed. After changing one, run it again by hand (a few minutes, 120 calls):
`node tests/trigger/run.mjs --out tests/trigger/results-after.json`.

## Releasing a new version

A Claude Code session does not run this repository. It runs the copy of the
plugin that `/plugin install` put on the machine, and `/plugin update`
replaces that copy only when the `version` in `.claude-plugin/plugin.json` has
changed. So a ticket that passed review and sits on main is in effect for
nobody until a release carries it, and nothing fails to say so.

**When to bump the version.** Whenever main holds finished tickets that change
what the plugin ships — anything under `skills/`, `agents/`, `hooks/` or
`viewer/` — release before expecting any session to behave differently. At the
latest, release when a batch ends: the foreman runs `release.sh unreleased`
once the board goes quiet, names the tickets no release carries, and offers
one. Tickets that changed only the board (`.kerjaan/`) or only the tests
(`tests/`) need no release; the script marks the board-only ones.

- **patch** (1.12.0 → 1.12.1): fixes that change no rule a session follows;
- **minor** (1.12.0 → 1.13.0): new behaviour, a new script, a new setting;
- **major** (1.x → 2.0.0): existing boards or settings must be changed by hand.

**How.** One commit that raises `version` in `.claude-plugin/plugin.json`
(`marketplace.json` carries no version and stays as it is), with the message
`Release x.y.z` followed by a summary in Indonesian of what changed, naming the
ID of every ticket it carries. `release.sh` reads those IDs, together with
what was already in `done/` at that commit, to tell released tickets from the
rest. Then the owner pushes main, runs `/plugin update kerjaan`, and starts a
new session: one that is already open keeps the copy it started with.

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

## Keeping the rules small

The rules a session reads — `skills/kerjaan/SKILL.md`, the guides in
`skills/kerjaan/references/` and the agent definitions in `agents/` — have a
budget of **18,000 words together**. `tests/skill-size.test.mjs` counts them
and fails when the budget is exceeded, so the suite goes red before a release
can carry a heavier skill.

Two habits keep it there:

- **A new rule names the rule it removes or replaces.** The ticket that adds
  one says, in its `Request` or `Notes`, which existing rule, explanation or
  script option goes away or is folded into it — and the commit message
  repeats it. An incident is first a reason to sharpen a rule that exists, not
  to add one more. A rule that replaces nothing has to fit under the budget as
  it stands; when it does not, something else is cut first.
- **Ticket Notes are summaries.** A worker records what it decided and what it
  broke to prove its tests, one line each, never a full log of commands and
  output (`agents/kerjaan-worker.md`, step 5): a reviewer reads those Notes
  again, and so does every later session.

## Deliberately absent

- **No board view, index, or summary.** The moment a summary exists it starts
  going stale and quietly lying. To find out what is in flight, read the
  folders. The one non-ticket file, `order.md`, is not a counter-example: what
  it exists for — sequence and reasoning — is something no folder can express.
  It copies one fact, each ticket's title, so the file reads as names rather
  than numbers, and the rename script keeps that copy in step. Nor is the
  viewer: it reads the folders again on every change and keeps nothing, so
  there is nothing in it to go stale.
- **No change log inside the ticket.** Just `updated`. Git already holds the
  full history.
- **Little opinion about git.** Outside a chain, how tickets relate to commits
  is left to each repo's own habits. A chain commits each ticket worked in the
  main tree in at most three commits — start, work, verdict — each holding its
  ticket's board change, and leaves no board change uncommitted.
- **Only three types:** `bug`, `feature`, `task`. Every additional type forces
  the author to think about categorisation, when what actually matters is the
  content.

## License

MIT — see [LICENSE](LICENSE).
