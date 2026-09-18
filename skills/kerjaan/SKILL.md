---
name: kerjaan
description: Ticket tracker made of plain markdown files inside a repo, under a `.kerjaan/` folder whose subfolders (backlog, todo, in_progress, review, done, cancel) are the ticket status. Use this skill for creating tickets, moving them between statuses, editing them, and answering questions about what is planned or in flight. Trigger it whenever the user mentions ticket, backlog, todo, in progress, review, done, cancel, `.kerjaan`, or asks to record, track, or update a bug, feature, idea, or task in a repo — including indirect phrasings with no such word at all, like "note this down for later", "put that on the backlog", "not now, maybe later", "mark that as done", "scrap that one", "what are we working on", or their Indonesian equivalents such as "catat ini dulu", "masukkan ke backlog", "tandai sudah selesai", and "apa saja yang sedang dikerjakan". Prefer this skill over writing an ad-hoc TODO list, notes file, or issue text, since those drift away from the agreed format.
---

# kerjaan

A ticket tracker that is nothing but markdown files inside a repo. No
database, and no board view stored anywhere — the one view there is, the map,
is drawn live from the folders.

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
- **`type` and `priority` are filled in.** `assign_to` may still be empty;
  who picks a ticket up is often settled by somebody picking it up.

### Should it be next?

A judgement, and the user's to make. A ticket earns its place when at least one
of these is true:

- it holds up other tickets, so every day it waits costs more than a day
- it is groundwork the rest of the work stands on
- it is small enough to finish quickly, and the board reads better without it
- it belongs with something just finished or in flight, so the context is still
  warm

### Size is a reason to split, not a reason to wait

Never defer a ticket for being big. Groundwork almost always is, and a board
that defers by size fills with small wins while the one heavy thing everything
else waits on stays in `backlog`.

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

Neither a silent refusal nor silent compliance. The check puts the fact in
front of them; the decision stays theirs.

## The order of the queue

A folder has no order, and `blocked_by` covers only the hard case where one
ticket cannot start until another finishes. When `todo` holds more than one
ticket and the sequence matters, it is written in `.kerjaan/order.md`: groups
of tickets that may run in any order, listed in the order the groups should be
taken, each introduced by one bold sentence saying why. That sentence is the
reason the file is allowed to exist — it lives nowhere else on the board.

`update-ticket.sh` keeps the file in step by itself: a ticket leaving `todo`
loses its line, and a rename rewrites its title there.

**Read `${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/references/ordering-the-queue.md` before writing or editing that file, and
before refilling `todo` from the backlog.** It holds the format, the rule for
when refilling is due, and the command that finds a file and a folder which
have drifted apart.

## Working two tickets at once

One ticket at a time is the normal way to work, and most boards need nothing
else. Two tickets in the same group in `order.md` have already been declared
independent of each other, which is the licence to run them side by side in
separate git worktrees, on branches whose names carry the ticket ID.

One trap has to be named here rather than left to be discovered: `.kerjaan/`
lives inside the repository, so a worktree checks out **a second board**, which
starts disagreeing with the first immediately and says so to nobody. Both
scripts refuse to run from a linked worktree for that reason.

**Read `${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/references/parallel-work.md` before creating a worktree.** It holds the
three commands — including the one that keeps the board out of the worktree —
and what `done` does and does not mean while a branch is still unmerged.

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
an exception to this rule so much as a demonstration of it: what it is for —
the sequence and the reasoning behind it — no folder can express. It does copy
one fact, the title, so that a reader sees names rather than numbers; that copy
is why renaming a ticket goes through the script. Be aware of what this leaves
uncovered: the check that compares that file against the folder looks at IDs
alone, so a title edited by hand is the one drift nothing reports.

## The map

When the user asks to see the board, a map, a graph, or what depends on what —
"show me the map", "tampilkan petanya", "which ticket should be next" when the
board is too big to answer by reading — start the live map in the background
and hand over the address it prints:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts/map.mjs" "$PWD" --open
```

It reads `.kerjaan/` on every change and writes nothing, so it is not the kind
of summary the section above forbids. Its advice panel groups every open
ticket under the done ticket it came from — the done ticket in its own
`related` or `blocked_by` created closest before it — so the user can pick up
what a piece of finished work left behind. That is a reading of the links, not
a decision: the user still chooses. It relies on `related` pointing back to
where a ticket came from, which is one more reason to fill it in when a ticket
is born out of another.
When the user pastes back the decisions it produced, apply them through the
normal operations below — moving a ticket, writing `order.md`, adding a cancel
reason — and apply the checks in "What belongs in `todo`" as if the user had
asked in words, because they did.

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
dependencies from scratch and run tests again for every piece of code it breaks
on purpose — and
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

#### Do not narrate sabotage in `## Notes`

Breaking an implementation on purpose to watch the tests go red is the
reviewer's technique, at `strict`, and its value is entirely in being done by
somebody with no stake. Do it yourself and the result has nowhere to go:
`## Notes` is the claim under test, never evidence, so a reviewer can only
record it as a report.

If you do it anyway and find a test that cannot go red, **fix the test and
commit it.** A test in the repo is something the reviewer runs. A sentence
about one is not.

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
last case is the most valuable and the easiest to skip.

**When the user has asked for speed, stop offering.** "Ini cuma mock", "buat
MVP dulu", "yang penting jalan", "jangan lama-lama" — all of these settle the
question for the work that follows. Use `quick` and say nothing further about
levels; they have weighed it and chosen.

Do not ask twice about the same ticket — once declined, it is settled. And
never raise the level on your own: a reviewer that silently costs ten minutes
when the user expected one is a reviewer they will start working around.

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

A review turns up things the ticket never asked about. The reviewer does not
create tickets for them — it cannot ask anybody anything, and a blocking
finding may never be laundered into one — so it leaves a `### Suggested
follow-up` block inside the reviewed ticket's `## Notes`, which outlives the
session in a way its report does not.

When a review comes back, read that block and offer:

> The reviewer noticed the export runs with no timeout, which is not what this
> ticket was about. Want a ticket for it?

Create only what the user says yes to, and give each new ticket
`related: [<id of the reviewed ticket>]` so the trail leads back to where the
finding came from. What they decline stays written in the reviewed ticket's
notes — that is the honest record: somebody saw it and decided against it, and
that decision is worth keeping.

#### When a review sends the ticket back

**Fix the kind of mistake, not the instance named.** The reviewer groups what
it found by kind, but it cannot promise it found every place. Before moving the
ticket to `review` again, look for the same shape across everything this
ticket touched and fix it there too. Patching only the line quoted is how one
mistake turns into three rounds.

The next review is narrower by itself: the reviewer reads its own earlier entry,
checks what changed since through git, and does not re-prove what nothing has
touched. Nothing needs passing along. **Do not write instructions for the
reviewer into `## Notes`** — a request for a lighter look, written by whoever
did the work, is exactly what an independent gate exists to ignore.

**After the second return, ask before trying again.** The reviewer states the
round. When a ticket comes back from its second review, do not fix and resubmit
on your own; put the choice to the ticket's owner in one line:

> This came back twice; what is left is that two permission tests cannot fail.
> Fix and review a third time, or accept it as is and ticket the tests?

If they accept, append to `## Notes` that the owner accepted the ticket over
the named findings, create the follow-up ticket with `related: [<this ID>]`,
and move this one to `done` yourself. That is the one time a ticket reaches
`done` without a passing review, and the note is what keeps it honest.

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
   references changed. If the renumbered ticket sits in `todo`, its entry in
   `order.md` carries the old ID too — the `grep` in step 3 finds it, since
   that file lives under `.kerjaan/` like everything else.

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
