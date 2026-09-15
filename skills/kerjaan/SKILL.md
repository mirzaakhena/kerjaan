---
name: kerjaan
description: Ticket tracker made of plain markdown files inside a repo, under a `.kerjaan/` folder whose subfolders (backlog, todo, in_progress, review, done, cancel) are the ticket status. Use this skill for creating tickets, moving them between statuses, editing them, and answering questions about what is planned or in flight. Trigger it whenever the user mentions ticket, backlog, todo, in progress, review, done, cancel, `.kerjaan`, or asks to record, track, or update a bug, feature, idea, or task in a repo — including indirect phrasings with no such word at all, like "note this down for later", "put that on the backlog", "not now, maybe later", "mark that as done", "scrap that one", "what are we working on", or their Indonesian equivalents such as "catat ini dulu", "masukkan ke backlog", "tandai sudah selesai", and "apa saja yang sedang dikerjakan". Prefer this skill over writing an ad-hoc TODO list, notes file, or issue text, since those drift away from the agreed format.
---

# kerjaan

A ticket tracker that is nothing but markdown files inside a repo. No server,
no database, no board view.

Three kinds of people read these tickets: the person who owns the work, the
person or agent who executes it, and **non-technical readers who never write
anything**. That third audience drives nearly every rule below. Such a reader
opens a single file, carries no context about the system, and must immediately
understand what is happening and what is being asked. A ticket that only makes
sense to someone who already knows the codebase has failed.

## The board

```
<repo root>/.kerjaan/
├── backlog/      ideas, not ready to act on
├── todo/         ready to act on, not started
├── in_progress/  being worked on
├── review/       done, not yet verified
├── done/         passed review
├── cancel/       abandoned
└── order.md      the order to pick `todo` up in — optional, see below
```

The folder is the **only** thing that determines status. There is no `status`
field inside the file, precisely so two sources of truth can never disagree.
Moving the file is the only way to change status.

Each folder holds a `.gitkeep` so that empty folders survive in git.

### `in_progress` is not optional

Move a ticket to `in_progress` **before the first change to the repo**, even
when you fully intend to finish it in one sitting. Especially then.

The temptation to skip it is strong and always sounds reasonable: the ticket
would live there for a few minutes, nobody would read it in that window, and
moving it twice feels like ceremony. That reasoning has one flaw — **the board
does not exist for whoever is doing the work.** It exists for the person who
opens the repo and wants to know what is in flight without reading a
conversation log or a diff.

That person is failed in two ways when the step is skipped, and the second is
far more expensive than the first.

The small failure is accuracy: even when the work finishes cleanly, nobody could
have told at any point that it had started.

The large failure is recovery. Work stops half-done more often than anyone plans
for — a session ends, a laptop hangs, a connection drops, attention moves. What
is left behind is a board saying `todo` and a working tree that already
disagrees. The question then is not "is this board accurate", it is **"where was
I?"** — and that answer exists nowhere. `git status` shows which files changed,
not which ticket they belonged to. The conversation that would have explained it
is gone with the session. Reconstructing it means reading a diff and guessing at
intent, which is exactly the work the board was supposed to make unnecessary.

Beware the rationalisation that makes this feel safe: *"I will start and finish
in one breath, so the ticket would only sit in `in_progress` for a moment."*
That reasoning assumes the breath completes. It plans for the case where the
step was unnecessary and ignores the case where it was the only thing that would
have helped.

The cost of the rule is one command. The cost of skipping it is not knowing
where you were.

## What belongs in `todo`

`todo` answers a question no other folder can: **what should somebody pick up
next?** That also makes it the folder most likely to rot, because nothing
breaks when a ticket is filed there too early. It simply sits, looking ready,
until someone picks it up and finds out it was not.

Two separate questions decide it, and mixing them is exactly what turns `todo`
into a second backlog.

### Is it ready?

Mechanical, not a matter of taste. All four must hold:

- **`blocked_by` is empty, or every ID in it is in `done/`.** One glob settles
  it: `ls .kerjaan/*/"260905160401 "*.md` shows the blocker's status without
  opening it.
- **`Done when` can be checked by a non-technical person.** "The refactor is
  complete" is not a criterion, it is a feeling. Promoting a ticket written
  that way hands the job of finishing the ticket to whoever executes it, at the
  moment they are least able to ask the person who wanted it.
- **No decision is still waiting on the user.** A ticket carrying an open
  question is not ready, however clear the rest of it reads.
- **`type`, `priority` and `assign_to` are filled in.**

### Should it be next?

A judgement, and the user's to make. A ticket earns its place when at least one
of these is true:

- it holds up other tickets, so every day it waits costs more than a day
- it is groundwork the rest of the work stands on
- it is small enough to finish quickly, and the board reads better without it
- it belongs with something just finished or in flight, so the context is still
  warm

### Size is a reason to split, not a reason to wait

The obvious fifth rule — *anything big stays in `backlog`* — is the one to be
careful with, because it quietly contradicts the second point above.
Groundwork is almost always big. A board that defers by size fills with small
wins while the one heavy thing everything else waits on stays in `backlog`, and
at no single moment does that look like a mistake.

A ticket too big to start is usually a ticket whose `Request` holds several
outcomes at once. Split it by outcome and each piece passes on its own. Size
justifies waiting only when the ticket genuinely cannot be split **and** none
of the four reasons above pushes it.

When a ticket is split, the original keeps its ID and becomes the first piece.
Criteria that moved elsewhere are struck through with a pointer to the ticket
that took them, exactly as a voided criterion is struck, and each new ticket
carries `related: [<the original ID>]`. Nothing is deleted and no ticket is
retired, so a reference followed months later still lands somewhere.

### When the user asks for a move you would not have made

Run the checks, name in one line the single thing that failed, then do as they
say:

> This one is still `blocked_by` 260907135503, which is sitting in `todo`
> itself — move it anyway?

Not a silent refusal, and not silent compliance either. They may know something
the board does not: a dependency that turned out not to be one, a demo
tomorrow. The check exists to put the fact in front of them, never to overrule
them.

### Keep it to one screen

`todo` stops meaning "next" as soon as it holds more than can be read at a
glance. Past that size nobody picks from it, they search it — and searching is
what `backlog` is for. A `todo` that keeps growing is the board telling you
that the second question above is not really being asked.

## The order of the queue

A folder has no order. Which ticket to take first, which two can run side by
side, and why — none of that fits anywhere in the format so far. `blocked_by`
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
  the file exists — it is the part that lives nowhere else on the board.
- **A bullet is exactly `- <id> <title>` and nothing else.** Reasoning belongs
  in the lead-in. Keeping the line to that shape is what lets the script edit
  it safely.

### Why this is not the index that is banned below

A summary restates what the folders already say, so it has no way to be right —
only to be a copy that was true once. `order.md` is the opposite case: the
sequence, the parallelism and the reasoning behind them exist nowhere else.
Delete a status summary and nothing is lost; delete this and the thinking is
gone.

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

When the file looks doubtful, check it:

```bash
diff <(for f in .kerjaan/todo/*.md; do [ -e "$f" ] && basename "$f" | cut -c1-12; done | sort) \
     <(sed -n 's/^- \([0-9]\{12\}\) .*/\1/p' .kerjaan/order.md | sort)
```

Silence means they agree. A line on the left is a ticket in `todo/` the order
never mentions; a line on the right is an entry whose ticket has moved on.

### Starting it, and refilling it

No board needs this file. Write it the first time ordering actually matters —
two or three tickets in `todo` and a real question about which comes first —
and not before. Until it exists the script leaves it alone completely, so a
board that never wants one never sees it.

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
whether the previous thing is done, and the ticket that bounces back then has
to compete with work that was started on the assumption it had passed.

All three empty is a different thing entirely: nothing is in flight, nothing is
waiting on a verdict, and the board is genuinely between batches. That is the
moment the next batch can be chosen on the merits rather than around work that
might be about to reappear.

Then propose a batch from `backlog` that passes both questions above, with the
order and the reasons, and let the user cut it down:

> The board is empty — nothing in `todo`, `in_progress` or `review`. From the
> backlog I would take 260905160401 first, since the other two read the
> settings file it adds, then 260905160502 and 260905160503 in either order.
> Move those three?

Propose; do not move. Filling `todo` is deciding what happens next, and that
stays the user's call even when the reasoning looks obvious.

Between batches `order.md` is left empty rather than deleted. An empty file is
the accurate statement — there is a queue and it has nothing in it — and it is
also where the next batch gets written.

## Working two tickets at once

One ticket at a time stays the normal way to work, and most boards never need
anything else. But two tickets sitting in the same group in `order.md` have
already been declared independent of each other, and that declaration is
exactly the licence to run them side by side — in separate git worktrees, so
neither session sees the other's half-finished files.

**The group is the claim; the worktree is only the mechanism.** If two tickets
would touch the same files, the answer is not a worktree, it is that they never
belonged in one group. Putting them there and hoping the merge works out turns
a planning question into a conflict, at the worst possible moment.

```bash
git worktree add -b tiket-260905160401 ../<repo>-<topic>
cd ../<repo>-<topic>
git sparse-checkout set --no-cone '/*' '!/.kerjaan/'
```

Three things about those commands are deliberate.

**The branch name contains the ticket ID**, and that is the entire link between
git and the board. The prefix is free — `tiket-`, `kerjaan/`, whatever a
project already uses — because the ID is what is matched on. Nothing is written
down anywhere: which branch belongs to which ticket is derived from the name,
so no record exists that could be forgotten or go stale. This is also why **no
field is added to the ticket** — a `branch:` key would repeat the ticket's own
ID back at it, which is exactly what the format forbids.

**The worktree sits beside the repo, never inside it.** A `.worktrees/` folder
within the repository looks tidier and quietly poisons every check: test
runners, linters and type checkers walk the whole tree, find a second complete
copy of the project inside it, and report every problem twice while taking
twice as long. A sibling directory has none of that, and `git worktree list`
finds it just as easily.

**The third line is the one that is easiest to skip and most expensive to
omit.** It is explained next.

### The board has one home

`.kerjaan/` lives inside the repository, which is the whole point of this
format — the tickets travel with the code, git holds their history, and one
commit can carry both a change and the status move that goes with it. But it
also means **every worktree checks out its own copy of the board.**

That copy is not a backup. It is a second board, and it starts lying
immediately: the ticket being worked on says `in_progress` in the main tree and
`todo` in the worktree, because the worktree's copy is frozen at the moment the
branch was cut. The format's central promise — one ticket, one status, held by
one folder — is gone, and nothing anywhere reports it. Both boards look
perfectly ordinary.

It is tempting to conclude the board should move out of the repository
altogether. It should not. That trades the whole premise for a narrow problem,
and it does not even solve the disagreement: check out last month's branch and
the code is old while the board is today's. The fork is not caused by version
control. It is caused by a second working copy, and that is what gets removed:

- **The third line above takes `.kerjaan/` out of the worktree's checkout.**
  Not out of git — out of *that tree*. The files stay tracked, the history
  stays whole, merges from the branch touch nothing under `.kerjaan/`, and
  there is simply no second board on disk to read or to edit.
- **Both scripts refuse to run from a linked worktree**, naming the main tree
  instead. This catches the worktrees created before anyone thought about it,
  and the ones made by hand.

The two are not redundant. The scripts stop a worktree from *writing* to the
wrong board; the sparse checkout stops anyone from *reading* one. A stale board
that is merely read is still believed.

A caveat worth checking on your own git: the pattern above uses non-cone mode,
which newer versions treat as deprecated even while it keeps working. And a
project already using sparse-checkout for something else must merge this
pattern into what it has rather than overwrite it.

### Nothing is remembered; two things are checked

A rule saying "remember every worktree you create" is the weakest kind of rule,
because breaking it raises no error — and the session that would do the
remembering is the one that ends. Git already holds the list, perfectly and
always:

```bash
git worktree list --porcelain | sed -n 's|^branch refs/heads/||p'
```

So the board only has to notice at the two moments where forgetting turns
silent:

**When a ticket reaches `done` or `cancel`, `update-ticket.sh` says so itself.**
If any branch whose name carries that ID still holds commits that are not in
`HEAD`, it warns that the board now claims finished work nobody merged. If the branch is merged but
its worktree is still checked out, it says that too — harmless, but it is
clutter that hides the dangerous case next time.

**When the board is idle, no worktree may remain.** This is the same moment
that triggers refilling `todo`: nothing in `todo`, `in_progress` or `review`
means nothing is in flight, so anything still checked out is work the board has
lost track of.

```bash
git worktree list | tail -n +2     # must print nothing when the board is idle
```

Git also separates the two cases that matter, and they are not equally serious:

```bash
git branch --no-merged HEAD | grep 260905160401   # work that would be lost
git branch --merged   HEAD | grep 260905160401    # merged already, just clutter
```

### `done` does not mean merged

The reviewer moves a ticket to `done`, and the reviewer is forbidden from
changing the repo — which means it cannot merge. So there is a real window
where a ticket says `done` while its branch is still separate, and that window
is not a flaw to be papered over: merging is a decision about the main line,
and the thing that just judged the work is deliberately the thing with no stake
in it.

Closing that window belongs to whoever picks up the verdict. Merge the branch,
remove the worktree, delete the branch — then the ticket and the repository
finally agree. The warning at `done` exists precisely because that handover is
easy to drop.

## What is deliberately absent

Do not create an index, a board README, a status summary, or any kind of
dashboard inside `.kerjaan/`. This is a design decision, not an oversight: the
moment a summary exists, it starts going stale and quietly lying. To answer a
question like "what are we working on", read the folders directly:

```bash
ls .kerjaan/in_progress/
grep -l 'priority: high' .kerjaan/todo/*.md
```

Answer in conversation. Do not write the answer to a file.

`order.md` is the only file in `.kerjaan/` that is not a ticket, and it is not
an exception to this rule so much as a demonstration of it: it holds the
sequence and the reasoning behind it, which no folder can express, and it
holds nothing that a folder already says.

## Writing style

Structure is always English: folder names, frontmatter keys, `type` values,
`priority` values, `review` values, and the content headings. These never vary from ticket
to ticket, so they stay fixed regardless of who is reading.

Prose follows whatever language the ticket's readers actually speak. English is
the default, but a team whose stakeholders read Indonesian should write
`Background`, `Request`, and the checklist in Indonesian — the English headings
above them stay exactly as they are. Pick one language per board and stay with
it, so that nobody has to guess which tickets they can read.

What matters far more than the language is the register: write so that someone
outside the technical team understands it without asking follow-up questions.

If you are unsure whether something counts as structure or content, ask: is
this word identical in every ticket? If yes, it is structure.

## File names

```
<ticket_id> <title>.md
```

Example: `260905160401 Send notifications through Telegram.md`

**The title lives only in the file name.** There is no `title:` key in the
frontmatter and no H1 heading inside the file. One title, one place, so nothing
can be left behind when it is updated.

File names contain spaces, so **always quote them** in the shell.
`mv .kerjaan/todo/260905160401 Send*.md` fails in a confusing way;
`mv ".kerjaan/todo/260905160401 Send notifications through Telegram.md" ...`
does not.

### Ticket ID

Format `yymmddhhmmxx` — year, month, day, hour, minute, then a 2-digit sequence
number for that same minute. So `260905160401` is the first ticket created on
2026-09-05 at 16:04.

The ID is permanent. The title may change, the content may change, the status
may change — the ID never does. That is why every cross-reference between
tickets uses the ID rather than the file name.

Do not compute the ID yourself. `scripts/new-ticket.sh` handles it, because it
scans all six folders at once to find the correct sequence number — including
tickets that have already moved on to `done/` — and locks the board while doing
so, so two simultaneous creations cannot produce the same ID.

### Identity lives only in the file name

Just like the title, **the ID is never written inside the file**. There is no
`id:` key. The principle in one sentence: a ticket never states its own
identity in its contents — it only states the identity of other tickets.

This is why `related` and `blocked_by` still hold IDs and do not violate the
rule: both point at *other* tickets rather than repeating the ticket's own
identity. And because `id:` is gone, changing a ticket's ID is far cheaper —
only its own file name plus the references pointing at it need to change.

The trade-off to be aware of: if a file name is damaged or lost, its ID is gone
entirely, since no copy exists inside the file. Git history is the only safety
net, so do not rename files outside the ways described here.

### Finding a ticket by ID

Because the ID is in the file name, a glob is enough — and the result also
tells you the ticket's status without opening it:

```bash
ls .kerjaan/*/"260905160401 "*.md
```

## Anatomy of a ticket

```markdown
---
type: feature
priority: high
review: strict
labels: [telegram-bot, backend]
reporter: mirza
assign_to: claude
created: 2026-09-05 16:04:01
updated: 2026-09-05 16:04:01
related: [260904091233]
blocked_by: []
---

## Background
...

## Request
...

## Done when
- [ ] ...

## Notes
...
```

Bug tickets carry one extra heading, `## How to reproduce`, placed between
`Background` and `Request`. See below.

| Field | Value |
|---|---|
| `type` | `bug`, `feature`, or `task` |
| `priority` | `high`, `medium`, or `low` |
| `review` | `quick`, `normal`, or `strict`; empty means `quick` |
| `labels` | list; may be `[]` |
| `reporter` | who asked for this |
| `assign_to` | who executes it; may be empty if undecided |
| `created` | `YYYY-MM-DD HH:MM:SS`, never changes |
| `updated` | `YYYY-MM-DD HH:MM:SS`, refreshed on every change |
| `related` | IDs of tickets connected as peers; may be `[]` |
| `blocked_by` | IDs of tickets that must finish first; may be `[]` |

Every field is always present. Unused ones are left empty (`[]` for lists)
rather than deleted — a file shape that never varies lets a reader's eye learn
where to look, and makes `grep` dependable.

There are only three types. Anything that is neither a defect nor a new
capability is a `task`. Resisting the urge to add more types is part of the
design: every extra type forces the ticket's author to think about
categorisation, when what actually matters is the content.

`related` expresses a peer connection ("this is connected to that").
`blocked_by` expresses a directed dependency ("this cannot start until that is
finished"). They are separate because only the second one affects the order in
which work gets done.

### How deeply this ticket gets reviewed

`review` tells the reviewer how hard to dig when this ticket reaches `review/`.

| | What the reviewer does |
|---|---|
| `quick` *(default)* | Runs the project's checks once and reads the change against the criteria |
| `normal` | Proves every criterion by running something, starts the app when a criterion is about what a user sees, and reads the tests for assertions that cannot fail |
| `strict` | All of `normal`, in a clean copy of the repo, plus deliberately breaking the code to confirm the tests actually catch it |

**Leave it empty unless the ticket needs more.** An empty `review:` means
`quick`, which is what most tickets want: a wording fix, a renamed button, a
config change. Depth is expensive — `strict` can install the project's
dependencies from scratch and run the whole test suite several times over — and
spending it on a ticket that did not need it teaches people to route around the
board.

Reach for `normal` when the criteria describe behaviour rather than content,
and for `strict` when being wrong is expensive: money, authentication,
permissions, data that cannot be recovered, anything a customer sees first.

The level bounds effort, **not honesty**. A `quick` review still judges the
`Done when` list line by line, still refuses to take `## Notes` as evidence,
and still escalates on its own when something does not add up. What it will not
do is go looking for trouble that nothing pointed at. Every review records the
level it ran at in `## Notes`, so a reader can always tell how much a `done`
actually cost.

#### Breaking your own code on purpose proves nothing

Deliberately breaking an implementation to watch the tests go red is a good
technique and it belongs to the reviewer, at `strict`. Its entire value is in
**who** does it: a check performed by somebody with no stake in the result.
Done by the person who wrote the code, the engineering is still sound but the
accounting is not — and the result has nowhere to go. Written into `## Notes`,
it lands in the one place on this board that can never be evidence, because
`## Notes` is the claim under test. A reviewer reading it has to record that it
was a report, not a finding, which is exactly what it will do.

So the effort is real and the payoff is zero, which makes this one of the more
expensive ways to spend an afternoon here.

If you do it anyway and it turns up a test that cannot go red, **the finding is
worth keeping — just not as prose.** Fix the test and commit it. A test living
in the repo is something the reviewer can read and run, so it counts. A
sentence describing a test you once broke is not.

#### Suggesting a level, and when not to

**The level is the user's call. Raising it is yours to suggest.** You are the
one who just read the code, so you know something they do not: whether this
change sits somewhere that punishes a mistake. Say so in one line, before the
ticket moves to `review/`, and name the reason rather than the level alone:

> This touches the payment callback — want me to set `review: strict` so the
> reviewer breaks the code on purpose and checks the tests actually catch it?

Then do what they say. Offer it when the work landed on money, authentication,
permissions, data that cannot be recovered, or anything a customer hits first —
and equally when **you are the one who is unsure** your change is right. That
last case is the most valuable and the easiest to skip, because admitting
uncertainty feels like admitting weakness. It is the opposite: a doubt you name
gets checked, and a doubt you swallow ships.

**When the user has asked for speed, stop offering.** "Ini cuma mock", "buat
MVP dulu", "yang penting jalan", "jangan lama-lama" — all of these settle the
question for the work that follows. Use `quick`, say nothing about levels, and
carry on. They are not missing information; they have weighed it and chosen.
Repeating the offer after that is not diligence, it is nagging, and it teaches
them that telling you their priorities changes nothing.

Two more things that make an offer unwelcome. Do not ask twice about the same
ticket — once declined, it is settled. And never raise the level on your own
because you privately think the work deserves it: a reviewer that silently
costs ten minutes when the user expected one is a reviewer they will start
working around.

**A level cannot rescue a thin checklist.** The reviewer blocks on `Done when`
and nothing else, so criteria that only describe the happy path stay unblocked
at `strict` — it will simply verify that happy path very thoroughly and pass.
If what actually worries you is an input nobody validated or an error nobody
handled, the fix is a criterion saying so, not a higher level. Suggest the
criterion first; suggest the level second.

### The headings

Fixed order. Four headings appear in every ticket regardless of type, and bug
tickets add a fifth between the first two. Nothing else varies — that
uniformity is what makes a ticket readable at a glance.

**`## Background`** — the situation as it stands, for a reader who knows
nothing. No file names, no function names, no unexplained abbreviations. If a
technical term is unavoidable, explain it once where it first appears.

**`## How to reproduce`** — **bug tickets only.** A numbered list of steps
anyone can follow to see the problem for themselves, ending with what actually
happens. Omit the heading entirely on `feature` and `task` tickets rather than
writing "not applicable" — an empty section teaches readers to skip sections,
and that habit eventually costs them a section that mattered.

Write the steps from a cold start: where to begin, what to do, what to look
for. A reader who has never opened this system should be able to follow them.

**`## Request`** — the outcome that is wanted, not the technical means of
getting there. The means change during execution; the wanted outcome does not.

**`## Done when`** — a `- [ ]` checklist of criteria a **non-technical person
could verify on their own**. This is the most honest test of a ticket's
quality: if the criteria can only be checked by reading code, the ticket is not
finished being written.

On a bug ticket, do not restate the reproduction steps here. They are already
written above; point at their outcome instead ("the steps above now produce
three replies"). The two sections answer different questions — one shows the
problem as it stands, the other states what proves it is gone — and repeating
the steps in both means fixing them in both when the flow changes.

**Criteria can go stale, and a stale one must be struck, not quietly obeyed or
quietly ignored.** A ticket that sits for a while accumulates decisions made
after it was written, and one of those decisions eventually contradicts a line
in this list. When that happens, neither reflex is right: doing the work anyway
implements something that was deliberately rejected, and skipping it silently
leaves a reader unable to tell an abandoned criterion from a forgotten one.

Strike the line through, and say in the same breath which decision voided it:

```markdown
- [x] ~~Supervisors can register new technicians of their own~~ — **voided by
      [[260907135503]]**, which decided mentoring gets no screens at all
```

A struck criterion is a fact about the ticket's history, so it stays in the
file. Deleting it would erase the evidence that somebody considered it and
decided against it.

**`## Notes`** — optional. Cross-references, decisions, findings. Write
`(none yet)` when empty.

### Example: poor versus good

Poor — only legible to someone who already knows the repo:

```markdown
## Background
`notifier.py` still uses a polling loop, causing a race condition in the
webhook handler.

## Request
Refactor to async using `asyncio.Queue`.

## Done when
- [ ] `test_notifier.py` passes
```

Good — any reader understands it, and the criteria can be checked without help:

```markdown
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
```

Notice that the good version names no file and no library. Technical detail is
not forbidden — but technical decisions belong to whoever executes the work,
not baked into the ticket as a constraint from the start.

## Operations

### Creating a ticket

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts/new-ticket.sh" backlog "Send notifications through Telegram"
```

Run it from the repo root. The script creates the `.kerjaan/` structure if it
is missing, determines the ID, copies the template, then prints the path of the
file it created.

Then fill that file in: complete `type`, `priority`, `labels`, `reporter`,
`assign_to`, and write the prose sections. A file straight out of the script is
empty — leaving it that way is the same as not having created a ticket at all.

The template holds the four common headings. If this is a bug, add
`## How to reproduce` yourself, directly after `Background`. It is left out of
the template on purpose: forgetting to add it to a bug ticket is obvious to the
first person who tries to reproduce the problem, whereas forgetting to delete
it from a feature ticket would quietly leave empty sections behind.

If there is not enough information to write `Background` and `Request`
properly, ask the user first. A half-written ticket is worse than no ticket,
because it looks like the work has been recorded.

### Changing a ticket

All three kinds of change go through the same script, always from the repo
root:

```bash
UPD="${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts/update-ticket.sh"

"$UPD" 260905160401 --status in_progress             # move status
"$UPD" 260905160401 --title "A clearer title"        # rename
"$UPD" 260905160401                                  # after editing the prose
```

The first argument may be a 12-digit ID or a file path — use the path when you
already have it, such as right after creating the ticket. The script prints the
ticket's current path.

Why go through a script when `mv` alone would move the file: every change must
refresh `updated`, and **forgetting to do so raises no error at all**. The file
still looks perfect, and the damage only surfaces months later when somebody
asks when this ticket was last touched and gets a lie for an answer. The script
binds the two into a single action so that half an action becomes impossible.

To change the content or a field, edit the file as ordinary markdown, then call
the script with no options. Prose really is easier to edit directly — the only
thing the script locks down is the timekeeping.

Status moves are unrestricted: any folder to any other folder. `backlog`
straight to `cancel` is fine. No sequence is enforced.

**One move has a gate: entering `review`.** Before moving a ticket there, open
its `Done when` list and tick the boxes one at a time. Not from memory — read
each line and check it against what the work actually produced. Anything that
cannot be ticked means the ticket is not ready for `review`, however finished
the work felt.

The failure this prevents is specific and easy to fall into: judging the work
by **what you did** rather than by **what the ticket asked for**. Those two
drift apart quietly. A criterion written weeks ago describes an outcome nobody
was thinking about while writing the code, so it goes unmet without anyone
noticing — and a ticket in `review` claims to be finished, which is a more
expensive lie than one still sitting in `todo`.

When a criterion turns out to be unmet, that is ordinary and cheap to handle:
leave the ticket where it is, append a short note saying which line is
outstanding and why, and finish it. When a criterion turns out to be **void**
rather than unmet, strike it as described under `Done when` above.

**And once the ticket is in `review/`, its code stops being yours.** The move
was the claim that the work is finished; carrying on with it afterwards — even
to improve it, even to strengthen a test — makes that claim false in the
quietest possible way. It also leaves the reviewer judging something that moves
while it reads, which is the hazard it builds clean exports to escape. Here the
person moving the files would be the one who asked for the review.

If something genuinely remains, the ticket was not ready: move it back to
`in_progress` and finish it there. Anything found after the handover is either
the reviewer's finding, which comes back with evidence, or a follow-up. Neither
is a quiet edit.

Renaming does not change the ID, and references from other tickets need no
attention, because references use the ID.

### Review happens by itself

`review` is the one status that does not sit still waiting for someone to
notice it. The moment a ticket lands there, a reviewer is dispatched:

```
update-ticket.sh <id> --status review
        ↓
scripts/on-ticket-review.sh   (a PostToolUse hook the plugin registers by
        ↓                      itself, so it covers every repo)
"dispatch subagent_type kerjaan-reviewer with this ticket ID"
        ↓
the reviewer moves the ticket to done/ or back to in_progress/, with a note
```

The hook fires only when both halves are true: the command really was a move to
`review`, **and** the ticket file really is in `.kerjaan/review/` afterwards.
Naming the words in an `echo`, or attempting a move that failed, leaves it
silent — otherwise a reviewer would be summoned for work that never arrived.

It finds the board from the command's own output, not from where the session
happens to be sitting. `update-ticket.sh` prints the ticket's absolute path, so
a session rooted outside the repo — one driving the board from a folder one
level up, or from somewhere else entirely — still gets its reviewer, and the
reviewer is told which repo to open. Only when that output is discarded does
the hook fall back to looking under the session's own directories.

**The reviewer decides, and the reviewer moves the file.** Whoever executed the
ticket does not get to mark their own work `done`; the last word on whether the
`Done when` list is satisfied belongs to something that did not write the code
and has no stake in it passing. It judges by running the checks itself rather
than by believing what `## Notes` claims, and when a criterion fails it hands
the ticket back with the evidence rather than quietly fixing the code — the
gap belongs to whoever created it.

#### Follow-ups the reviewer finds

A review turns up things the ticket never asked about: a real bug in code the
diff happened to pass through, a check nobody runs, a rough edge worth a ticket
of its own. **The reviewer writes those down; it does not create them.** The
next session that has a user in front of it offers them.

Two reasons, and the first is the one that matters.

**A reviewer that can file tickets can launder a failure into one.** Faced with
a criterion that is not met, moving it into a shiny new ticket and passing the
old one is a rationalisation that will eventually get made — it feels like
progress and it reads well in a report. It also destroys the only gate this
board has. So: **a blocking finding never becomes a new ticket.** That ticket
goes back to `in_progress` with the evidence, whole.

**A reviewer cannot ask.** It runs with nobody in front of it, and this format
says a ticket without enough information to write `Background` and `Request`
properly should not exist yet. A half-written ticket looks like recorded work
while being none, which is worse than no ticket at all.

So it appends a `### Suggested follow-up` block inside the reviewed ticket's
`## Notes`. That block outlives the session in a way the reviewer's report does
not: reports are gone when the session ends, `## Notes` stays in the repo.

When a review comes back, read that block and offer:

> The reviewer noticed the export runs with no timeout, which is not what this
> ticket was about. Want a ticket for it?

Create only what the user says yes to, and give each new ticket
`related: [<id of the reviewed ticket>]` so the trail leads back to where the
finding came from. What they decline stays written in the reviewed ticket's
notes — that is the honest record: somebody saw it and decided against it, and
that decision is worth keeping.

**How long it takes is set by the ticket's `review` field**, described under
the frontmatter above. Empty means `quick`, so by default a review is one run
of the project's checks plus a read of the change — minutes, not a coffee
break. Set `review: normal` or `review: strict` before moving the ticket when
it deserves more; the reviewer reads the field straight out of the file, so
nothing else has to be passed along. If you only realise afterwards that a
ticket needed a deeper look, edit the field and dispatch `kerjaan-reviewer`
again by hand.

Any session may dispatch the reviewer, with one exception that is the whole
point: **not the session that did the work.** That session should hand the
ticket off and move on to the next one rather than waiting; the review lands
when it lands, and a failed review simply puts the ticket back in
`in_progress`, which is where a board is supposed to put unfinished work.

Reviewing without the hook is fine too — dispatch `kerjaan-reviewer` with a
ticket ID whenever a ticket has been sitting in `review/`, for instance when it
got there before the hook existed.

### Why searching is not scripted

Reading the board — `ls`, globs, `grep` — is deliberately left free. When a
search command is wrong, the output is empty or obviously odd and that is
immediately visible, so the mistake corrects itself on the next attempt. Only
operations that fail silently are worth locking into a script. Use whatever
approach best fits the question being answered.

### When two tickets share an ID

This should be impossible via the script, since the board is locked while the
sequence number is determined. But files can arrive from outside the script:
copy-paste, a git merge of two branches, or a manual rename.

Detect it with:

```bash
for f in .kerjaan/*/*.md; do basename "$f" | cut -c1-12; done | sort | uniq -d
```

If anything shows up, resolve it like this:

1. Open both and compare `created`. The **older one keeps** the ID — a ticket
   that has been around longer is more likely to be referenced by other tickets
   or already mentioned in conversation.
2. The younger one takes the next free sequence number within the same minute.
   Renaming the file is enough. `created` does not change, because it records
   when the ticket was actually born, not when its ID was tidied up.
3. Check for inbound references to the old ID:

   ```bash
   grep -rl '260905160401' .kerjaan/
   ```

   While the ID is duplicated those references are ambiguous — there is no
   mechanical way to tell which ticket was meant. Read the referring ticket's
   context, decide which one it actually points at, and fix only those pointing
   at the ticket you just renumbered.
4. Refresh `updated` on the renumbered ticket and on every ticket whose
   references changed.

If that minute's sequence numbers are already exhausted up to `99`, shift into
the next minute (`...160599` → `...160601`). An ID only needs to be unique and
roughly ordered by creation time; it is not a timestamp that must be accurate
to the second.

### Writing `updated` by hand

Normally unnecessary — `update-ticket.sh` takes care of it. The only time to
write it yourself is while repairing a damaged file that the script refuses to
touch.

In that case take the real time; never guess it or copy it from elsewhere:

```bash
date '+%Y-%m-%d %H:%M:%S'
```

This field is the only trace of time the system has. Once it has been wrong,
readers can no longer tell whether what they are reading is current — and there
is no way to restore that trust except from git history.
