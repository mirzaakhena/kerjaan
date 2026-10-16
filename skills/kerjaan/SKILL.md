---
name: kerjaan
description: Ticket tracker made of plain markdown files inside a repo, under a `.kerjaan/` folder whose subfolders (backlog, todo, in_progress, review, done, cancel) are the ticket status. Use this skill for creating tickets, moving them between statuses, editing them, and answering questions about what is planned or in flight. Trigger it whenever the user mentions ticket, backlog, todo, in progress, review, done, cancel, `.kerjaan`, or asks to record, track, or update a bug, feature, idea, or task in a repo — including indirect phrasings with no such word at all, like "note this down for later", "put that on the backlog", "not now, maybe later", "mark that as done", "scrap that one", "what are we working on", or their Indonesian equivalents such as "catat ini dulu", "masukkan ke backlog", "tandai sudah selesai", and "apa saja yang sedang dikerjakan". Prefer this skill over writing an ad-hoc TODO list, notes file, or issue text, since those drift away from the agreed format.
---

# kerjaan

A ticket tracker that is nothing but markdown files inside a repo. No database,
and no board view stored anywhere.

Three kinds of people read these tickets: the person who owns the work, the
person or agent who executes it, and non-technical readers who never write
anything. That third audience drives most rules below. Such a reader opens one
file with no context about the system and must understand at once what is
happening and what is being asked. A ticket that only makes sense to someone
who already knows the codebase has failed.

## Quick reference

```bash
K="${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts"      # always run from the repo root

"$K/new-ticket.sh" backlog "Send notifications through Telegram"   # prints the new path
"$K/update-ticket.sh" 260905160401 --status in_progress            # move
"$K/update-ticket.sh" 260905160401 --title "A clearer title"       # rename
"$K/update-ticket.sh" 260905160401                                 # after editing prose
"$K/update-ticket.sh" 260905160401 --accept-size                   # owner keeps a big ticket whole
"$K/ticket-size.sh" 260905160401                                   # size check alone, changes nothing
"$K/test-run.sh" 260905160401                                      # run test_command, record it
"$K/worktree.sh" add 260905160401 ../repo-topic                    # worktree for side-by-side work
"$K/merge.sh" sync 260905160401                                    # in the worktree: bring main in
"$K/merge.sh" land 260905160401                                    # passed review: merge into main
"$K/worktree.sh" remove 260905160401                               # its teardown, then remove it
"$K/queue.sh" estimate 260905160401 src/notify.py docs/           # files the ticket is expected to change
"$K/queue.sh" overlap                                              # tickets whose estimates share files
"$K/queue.sh" ask 260905160401 "<question>"                        # a question for the owner, numbered
"$K/queue.sh" answer 260905160401 2 "<answer>"                     # the owner's answer to question 2
"$K/queue.sh" check                                                # todo and order.md fit to work from?
"$K/queue.sh" compare 260905160401                                 # estimate against what really changed
"$K/release.sh" unreleased                                         # done tickets no release carries yet
ls .kerjaan/*/"260905160401 "*.md                                  # find by ID; the folder is its status
```

The rules that are broken most often, each explained further down:

1. **Work starts from a ticket** the user has seen — search first, create if none.
2. **The main session never writes a ticket's code.** It is the foreman: every
   ticket, even a single small one, goes to a `kerjaan-worker` subagent.
3. **Move a ticket to `in_progress` before the first change to the repo.**
4. **Every change to a ticket goes through `update-ticket.sh`**, never a bare `mv`.
5. **Before `review`, tick `Done when` line by line** against what the work produced.
6. **Once a ticket is in `review/`, stop touching its code.**
7. **Never review your own work.** The reviewer decides and moves the file;
   only the foreman dispatches it.
8. **Never pass `--ack-unmerged` or `--accept-size` on your own.** Those
   decisions are the owner's.
9. Never write a status summary, index or dashboard into `.kerjaan/`.

## The board

```
<repo root>/.kerjaan/
├── backlog/      ideas, not ready to act on
├── todo/         the queue for one work session: ready, not started
├── in_progress/  being worked on
├── review/       done, not yet verified
├── done/         passed review
├── cancel/       abandoned
├── order.md      the order to pick `todo` up in — optional
└── settings.md   language, test command, long-lived branches, limits
```

The folder is the only thing that determines status. There is no `status`
field in the file, so two sources of truth can never disagree. Each folder
holds a `.gitkeep` so empty folders survive in git.

`update-ticket.sh` enforces a few gates: starting while other work sits
unmerged (see "Into `in_progress`"), reaching `review` from anywhere but
`in_progress`, and — for work on a branch of its own — reaching it before the
branch holds all of main's code and has passed its tests in that state
(`references/parallel-work.md`). It enforces no other sequence. The rest of
"The life of a ticket" is yours to keep.

### Settings

`.kerjaan/settings.md` holds what the board cannot guess: the language ticket
prose is written in, the command that runs the project's checks (the reviewer
runs it first), which branches live outside `HEAD` on purpose, how many `Done when`
items a ticket may hold before the scripts warn, and — for side-by-side work —
whether tests from several worktrees may overlap and what runs when a worktree
is created or removed. When it is
missing — `new-ticket.sh` says so — work out likely values from the repo
(the language of existing tickets, `package.json`/`Makefile`/CI, the branch
list), put them to the owner in one message, and write the file from
`${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/SETTINGS.md`. Ask once; after that the
file is the answer.

### Starting a session

The first time you touch the board in a session, look for work somebody left:

```bash
ls .kerjaan/in_progress/ .kerjaan/review/
```

Anything there that this session did not put there is either stuck or
forgotten. Tell the user before starting anything new: for `in_progress`, what
the ticket is and whether to resume it — resuming means a new worker that starts
from the ticket's `## Notes`; for `review`, dispatch
`kerjaan-reviewer` on it (see `references/review.md`, "Tickets stuck in
`review/`"). A session that skips this starts new work on top of old, and the
old stays stranded.

## Ticket files

```
<ticket_id> <title>.md          e.g.  260905160401 Send notifications through Telegram.md
```

- **The title lives only in the file name**: no `title:` key, no H1. One title,
  one place, so nothing is left behind when it changes.
- **The ID lives only in the file name** too: no `id:` key. A ticket states the
  identity of other tickets (`related`, `blocked_by`), never its own. Git
  history is the only copy, so never rename a ticket except through the script.
- **The ID is `yymmddhhmmxx`** — creation minute plus a two-digit sequence, so
  `260905160401` is the first ticket of 2026-09-05 16:04. It never changes,
  which is why every cross-reference uses the ID. Do not compute it yourself:
  `new-ticket.sh` scans all six folders under a lock to pick it.
- **File names contain spaces: always quote them.**
  `mv .kerjaan/todo/260905160401 Send*.md` fails confusingly.

## Anatomy of a ticket

```markdown
---
type: feature
priority: high
review:
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

## History
- 2026-09-05 16:04:01 todo

## Notes
(none yet)
```

| Field | Value |
|---|---|
| `type` | `bug`, `feature`, or `task` — nothing else; anything neither a defect nor a new capability is a `task` |
| `priority` | `high`, `medium`, or `low` |
| `review` | `quick`, `normal`, or `strict`; empty means `quick` — see "Moving to `review`" |
| `labels` | list; may be `[]` |
| `reporter` | who asked for this |
| `assign_to` | who executes it; may be empty |
| `created` | `YYYY-MM-DD HH:MM:SS`, never changes |
| `updated` | refreshed by the script on every change |
| `related` | peer tickets ("connected to that"); may be `[]` |
| `blocked_by` | tickets that must finish first; may be `[]` |

Every field is always present, empty rather than deleted, so the shape never
varies and `grep` stays dependable. `related` vs `blocked_by`: only the second
affects the order work gets done in. When a ticket is born out of another, put
that one in `related` — the reviewer's follow-ups rely on the trail.

### The headings

Fixed order, same in every ticket. Bug tickets add one, between the first two.

**`## Background`** — the situation as it stands, for a reader who knows
nothing. No file names, no function names, no unexplained abbreviations; an
unavoidable technical term is explained where it first appears.

**`## How to reproduce`** — bug tickets only, and omitted entirely elsewhere
rather than written as "not applicable". Numbered steps from a cold start that
anyone can follow, ending with what actually happens.

**`## Request`** — the outcome wanted, not the technical means. The means
change during execution; the outcome does not.

**`## Done when`** — a `- [ ]` checklist a non-technical person could verify on
their own. If a criterion can only be checked by reading code, the ticket is
not finished being written. On a bug, point at the reproduction's outcome ("the
steps above now produce three replies") rather than restating the steps.
About 6 to 8 items at most; more means the ticket should be split (see "How
big a ticket is").

**`## History`** — always present, written only by the scripts: one line per
status the ticket has entered, `- <time> <session-id> <status>` when the move
was made inside a Claude Code session, `- <time> <status>` when it was not (a
plain terminal, or a line from before sessions were recorded). The status is
always the last word; anything that reads History accepts both forms. The
session id is the main session's: a worker or reviewer subagent carries the
same one as the foreman that dispatched it. `new-ticket.sh` writes the
first line with the time of `created`; every move through `update-ticket.sh`
adds one with the time of the new `updated`. A rename or a refresh adds none.
The folder says where a ticket is, and only this says when it got there — git
cannot, because a move is committed whenever somebody next commits. A ticket
from before History existed gets the section on its next move, holding that
move alone; the time before is unknown and is not filled in. History sits just
before Notes so that Notes stays last, and anything appended to the end of the
file lands in Notes.

**`## Notes`** — always present. Cross-references, decisions, findings;
`(none yet)` when empty.

Poor, legible only to someone who knows the repo:

```markdown
## Background
`notifier.py` still uses a polling loop, causing a race condition in the webhook handler.
## Request
Refactor to async using `asyncio.Queue`.
## Done when
- [ ] `test_notifier.py` passes
```

Good — any reader understands it and can check it without help:

```markdown
## Background
The Telegram bot checks for new messages every few seconds. When two messages
arrive at nearly the same moment, one is sometimes skipped and that person
never gets a reply.

## How to reproduce
1. Open a chat with the bot
2. Send three short messages within one second of each other
3. Wait ten seconds

Only two replies come back, and nothing says the third was dropped.

## Request
Messages that arrive together must all still get a reply, with none lost.

## Done when
- [ ] The steps above produce three replies rather than two
- [ ] Run for a full day with no reports of a missed message
```

Technical detail is not forbidden; technical decisions belong to whoever
executes the work, not baked into the ticket from the start.

### Language

Structure is always English: folder names, frontmatter keys and values, and
the headings — anything identical in every ticket. Prose follows the language
the ticket's readers speak, as `language` in `settings.md` records — one per
board, so nobody has to guess which tickets they can read. Far more than
the language, the register matters: write so someone outside the technical
team understands without follow-up questions.

## The life of a ticket

### Who does the work

The session the user talks to is the **foreman**. It keeps the board and talks
to the owner; it never edits a ticket's code. Each ticket is executed by a
`kerjaan-worker` subagent that starts from an empty context, reports briefly,
and is resumed by the foreman if the reviewer sends the ticket back. Only the
foreman dispatches reviewers. Filling `todo` from `backlog` goes to a
`kerjaan-planner` subagent: it reads the backlog so the foreman does not, and
its questions reach the owner through the foreman.

This holds for one ticket as much as for a whole queue. A session that works
tickets itself fills its context with every file and test run it touched, and
by the second or third ticket it is compacted; a foreman receives only
reports, so the user hands over a queue once and every ticket still starts
clean.

**Read `references/foreman.md` before the first ticket goes to a worker, and
when the owner asks what can be worked on** — it covers filling the queue
through the planner, the questions asked at the start of a chain, the worker's prompt, what
to do with each report and verdict, when the chain stops itself, and the
summary at the end.

The sections below describe a ticket's life whoever performs each step. Where
a step is the worker's — doing the work, ticking `Done when`, running the
checks, the move to `review` — its definition (`agents/kerjaan-worker.md`)
carries it; the foreman reads them here to know what a report claims.

### Work starts from a ticket

When the user asks for work on a repo that has a board — fix this, add that —
and no ticket covers it, the ticket comes first: search, create it, and show
the user its `Request` and `Done when` before touching any code. Those two
sections are what the work will be judged against; a user who sees them first
catches a misunderstanding for the price of a sentence, instead of after the
work is built on it. Start once they agree, or once they correct it.

The exception is the user saying so: "no ticket for this", "langsung saja".

### Creating

**Search first.** Two tickets for one outcome split its history in half. Pick
two or three keywords, in the board's language and in English, and search
titles and prose — the title is only in the file name, which `grep` misses:

```bash
ls .kerjaan/*/ | grep -i -e 'telegram' -e 'notif'       # titles
grep -ril -e 'telegram' -e 'notif' .kerjaan/*/          # prose
```

Then, by where a match sits:

- **`backlog`, `todo` or `in_progress`, same outcome** — update that ticket
  instead (widen `Background`/`Request`/`Done when`, add links, rename if the
  title no longer fits) and tell the user which ticket absorbed the request.
- **Connected but a different outcome** — create a new one, linked with
  `related`, or `blocked_by` when one really must finish first.
- **`review` or `done`** — its claim has been made; do not widen it. Create a
  new ticket with `related: [<that ID>]`.
- **`cancel`** — read why it was dropped and tell the user before creating
  anything; it may already have been decided against.
- **Unclear whether it is the same outcome** — ask.

Then run `new-ticket.sh` (it creates `.kerjaan/` if missing) and fill in the
file it prints: every frontmatter field you can, and all prose sections. A bug
also gets `## How to reproduce` after `Background` — the template leaves it out.
If there is not enough to write `Background` and `Request` properly, ask
first: a half-written ticket looks like the work has been recorded when it has
not. Once it is filled in, run `update-ticket.sh <id>`: besides refreshing
`updated`, that is what checks its size (next section).

### How big a ticket is

**About 6 to 8 items in `Done when` is the limit.** Past that, a ticket holds
more than one round of work, and everyone pays for it:

- **The review gets duller.** A reviewer facing twenty items at once checks
  each of them less carefully, so mistakes slip through.
- **The result shows up late.** The owner sees something after an hour or
  more instead of a quarter of an hour, so a correction arrives late and drags
  along parts that were already finished.
- **The worker runs out of room.** One session reads and writes far more, and
  is cut off in the middle more often.
- **One failure holds back everything.** A single part that does not pass
  keeps the whole ticket out of `done`, although the rest was good.

Every item counts, including one only a person can check ("look at it on a
phone"). Items struck through because they were voided or moved to another
ticket do not.

**Split by outcome, never by file or by technical layer.** Each piece must be
something the owner can try on its own and see working. "The database part",
"the screen part" and "the tests" are not pieces: none of them can be tried
alone, and each waits for the others before anyone sees anything.

Poor — one ticket for a whole screen, 20 items:

```markdown
260913091501 Move the Categories screen to the new app
## Done when
- [ ] The list shows every category with its icon and colour
- [ ] Categories can be searched by name
- [ ] A new category can be added ... (and 17 more: editing, deleting,
      ordering, archived categories, empty state, errors, phone layout...)
```

Good — the same screen as four tickets, each one tried on its own:

```markdown
260913091501 Categories screen shows the list           (6 items: list, icons,
                                                         empty state, search...)
260913091502 A category can be added and edited          (7 items)
260913091503 A category can be archived or deleted       (5 items)
260913091504 Categories can be put in order by hand      (4 items)
```

Each new piece carries `related: [<the first piece's ID>]`, and `blocked_by`
when it really cannot start before another (adding needs the list to exist).
When an existing ticket is split, the original keeps its ID and becomes the
first piece; criteria that moved are struck through with a pointer to the
ticket that took them.

**The scripts warn about size; they never refuse it.** `update-ticket.sh` and
`new-ticket.sh` count the items every time they touch a ticket in `backlog`,
`todo` or `in_progress`, and when the count is over the limit they print a
`WARNING` naming it. The ticket is saved as it is. `ticket-size.sh <id>` runs
the same check alone, without changing anything. The limit is
`done_when_limit` in `settings.md`; without it, 8.

**Who splits.** When the planner fills the queue (`agents/kerjaan-planner.md`),
splitting a ticket over the limit is its own power, granted by the owner: it
splits by outcome before proposing the ticket, and the proposal shows the
pieces. Outside that — a ticket written or edited in conversation — offer the
owner the split and make it once they agree.

**The owner may keep a ticket whole.** Some work really is one piece. When the
owner says so for a given ticket — including one the planner already split —
run `update-ticket.sh <id> --accept-size`:
it writes the decision into the ticket's `## Notes` (a line saying *size
accepted by the owner*), and the warning is not repeated for that ticket.
Like `--ack-unmerged`, never pass it on your own judgement — a warning you
would rather not see is not the owner's decision.

### Into `todo`

`todo` answers what somebody should pick up next. Nothing breaks when a ticket
lands there too early, so it rots quietly unless two separate questions are
kept separate.

**Is it ready?** Mechanical, and one definition: what `"$K/queue.sh" check`
tests, nothing more and nothing less. All five must hold:

- **`type` and `priority` are filled in.** `assign_to` may stay empty.
- **No question is still open.** A question recorded with `queue.sh ask` and
  not yet answered with `queue.sh answer` also makes `update-ticket.sh` refuse
  the move into `todo`. Every judgement a reader has to make goes through this
  one: a `Done when` line a non-technical person could not check ("the
  refactor is complete" is a feeling, not a criterion), two readings where the
  wrong one means rework, a decision left in `## Notes` without an answer —
  each is asked, numbered, and is no longer open once answered.
- **Its size is within the limit, or the owner kept it whole**
  (`ticket-size.sh <id>` prints nothing). A ticket that is too big is split by
  outcome first — never quietly moved onwards.
- **It carries an estimate of the files it will change** (`queue.sh estimate
  <id> <path>...`), which decides whether it may run beside another ticket. A
  ticket that changes no file of the project — a decision ticket, whose work
  is the conversation with the owner — records exactly that with `queue.sh
  estimate <id> --none`, never a made-up file.
- **Every ticket in its `blocked_by` is finished or ahead of it.** Finished is
  in `done/` and, when it was worked on a branch, landed on main: a blocker
  whose merge is held for the owner is not finished yet. Ahead of it is in
  flight (`in_progress` or `review`), or in `todo` in an earlier group of
  `order.md` — the planner queues a blocker and the ticket waiting for it in
  one batch on purpose, in that order. A blocker in `backlog` is ahead only
  when it goes into `todo` in the same batch. One in `cancel/` is neither:
  tell the user, and ask whether the dependency is gone (drop it from
  `blocked_by`) or this ticket should be cancelled too.

`"$K/queue.sh" check <id>...` judges candidates by these five; with no IDs it
judges `todo` and `order.md` together, including where each blocker in `todo`
is placed. `READY` is the answer, and no list anywhere else overrides it.

**Should it be next?** A judgement, and the user's. A ticket earns its place
when it holds up other tickets, is groundwork the rest stands on, is small
enough to clear quickly, or belongs with something just finished or in flight.

**Size is a reason to split, not to wait.** A ticket too big to start usually
holds several outcomes in its `Request`; split by outcome, as "How big a
ticket is" describes. The planner does that before it proposes the ticket;
the owner, seeing the pieces, may still keep it whole with `--accept-size`.

**When the user asks for a move you would not have made**, name in one line the
single check that failed, then do as they say:

> This one is still `blocked_by` 260907135503, which is sitting in `backlog`
> and is not part of this batch — move it anyway?

**Who fills it.** The planner (`kerjaan-planner`): the foreman dispatches it
when the owner asks what can be worked on, relays its questions and proposal
to the owner in one message, and resumes it with the answers and the approval.
The planner then writes the answers into the tickets, moves them into `todo`
and writes `order.md` — the foreman does none of that itself
(`references/foreman.md`, "Filling the queue").

**The order of the queue.** When `todo` holds several tickets and sequence
matters, it is written in `.kerjaan/order.md`. `update-ticket.sh` keeps that
file in step (removes a ticket's line when it leaves `todo`, rewrites renamed
titles). **Read `references/ordering-the-queue.md` before writing or editing
`order.md`, and before refilling `todo` from `backlog`.**

### Into `in_progress`

**Clear the whole queue first.** Every ticket in `todo` must be workable
without another question: no line to guess at, no two readings, no criterion
nobody could check. The planner clears that when it fills the queue — each
question written into its ticket, put to the owner with all the others in one
message, and the answer written back (`Request`, `Done when`, or `## Notes`) —
so an answer never lives only in a conversation that ends. Asked this way the
user gives one sitting and the queue can then run to the end; asked one ticket
at a time, each question stalls the work after the user has left.

Before the first ticket leaves `todo`, run `"$K/queue.sh" check`. `READY`
means the sweep is done. A ticket it names — put in `todo` by hand, or edited
since — goes to the planner before the chain starts. A question that surfaces
mid-work takes the same form as the planner's: the worker records it with
`queue.sh ask`, numbered in its ticket, where `queue.sh check` shows it; the
foreman puts it to the owner and records the answer with `queue.sh answer`.

The sweep includes size: a ticket over the limit that nobody split or the
owner kept whole is named by `check`. Starting it is what the size check
exists to prevent; the warning `update-ticket.sh` prints on the move to
`in_progress` comes too late to act on.

The same message carries two more questions a chain needs settled up front
(`references/foreman.md`, "Starting the chain"): whether checks only a person
can make are deferred or hold the chain, and the review level the planner
suggested for each ticket in its report.

**Then move the ticket to `in_progress` before the first change to the repo** —
even when you fully expect to finish in one sitting. Especially then. The board
is not for whoever is doing the work; it is for whoever opens the repo later
and needs to know what is in flight. Work stops half-done more often than
anyone plans: a session ends, a connection drops. What is left is a board
saying `todo` and a working tree that disagrees, and `git status` shows which
files changed but not which ticket they belonged to. The tempting thought — *"I
will start and finish in one breath"* — plans only for the case where the step
was unnecessary. The rule costs one command. The foreman makes this move
itself, before it dispatches the worker.

**The script refuses the move while other work sits unmerged.** If any local
branch holds commits outside `HEAD` — other than branches of tickets in
`in_progress` or `review`, this ticket's own, `long_lived_branches` in
`settings.md`, and branches whose merge `merge.sh land` held for the owner —
`update-ticket.sh` prints them and changes nothing. A held branch is named but
not waited for: only its own ticket waits for the owner, and a ticket that
lists it in `blocked_by` is refused. A ticket coming back from `review` or
`done` is not a start, and is never refused here. That is how
a ticket that passed review on a branch nobody merged gets noticed: at the
moment somebody is deciding what happens next. Put the list to the owner and
let them decide each branch: merge it, delete it, add it to
`long_lived_branches`, or start anyway. Only on that last answer rerun with
`--ack-unmerged`; the script writes the branches into the ticket's `## Notes`,
so the decision outlives the conversation.

**Which ticket to take is already decided.** `order.md` is that decision: the planner
proposed it and the owner accepted or rearranged it when `todo` was filled.
Take the first ticket in it — or any ticket in its first group — and start,
without asking which one. With no `order.md`, take any ticket in `todo`: `check` has
already refused a `todo` where one waits for another without an `order.md`. Asking again only reopens a choice the owner already
made, and stalls the queue on someone who may have left. Ask only when the
order no longer fits what the board now shows — the top ticket turned out to
depend on one further down, say — and then name that one problem.

One ticket at a time is normal. Two tickets in the same `order.md` group are
declared able to run together — neither waits for the other's result, and any
files they both change are named in the group's lead-in, with which lands
first on its `<!-- lands-first: ... -->` line — and may run side by side in separate git worktrees — but
a worktree checks out a second copy of `.kerjaan/`, which silently disagrees
with the first, and the scripts refuse to run there. The foreman creates the
worktrees with `worktree.sh` and gives each worker its own; their test runs,
and the reviewers', take turns unless `parallel_tests` says otherwise. Each
worker brings main into its branch and tests the merged state before review,
and once a ticket passes, the foreman lands it on main with `merge.sh land`
right away, one at a time, without asking the owner. **Read
`references/parallel-work.md` before creating a worktree.**

### Tickets whose work is a decision

Some tickets have no code: their work is putting questions to the owner and
writing the answers down. The rules hold all the same, and are easier to slip
on, because the asking feels like preparation rather than work:

- **Into `in_progress` before the first answer is written into the ticket.**
  Drafting in conversation is not yet work; writing it into the repo is.
- **Its estimate is what it writes, or nothing.** The file where the
  decision ends up (below) is estimated like any other; a ticket that changes
  no file of the project at all records `queue.sh estimate <id> --none`, so
  `check` can call it ready without a made-up file.
- **`todo` → `review` is never right.** `update-ticket.sh` refuses any move into
  `review` that does not come from `in_progress`.
- **Give it a criterion for where the decision ends up**: the README, a
  `CLAUDE.md`, whatever every session reads. "The first version's deadline is
  written in the README" is checkable; a decision left only in a ticket in
  `done/` is history no new session will look for.

### Moving to `review`

**Tick `Done when` first, one line at a time.** Not from memory: read each line
and check it against what the work actually produced. The failure this
prevents is judging the work by what you did rather than by what the ticket
asked for — a criterion written weeks ago easily goes unmet unnoticed, and a
ticket in `review` claiming to be finished is a more expensive lie than one in
`todo`.

- **Unmet** — the ticket is not ready. Leave it, note which line is
  outstanding, finish it.
- **Void** — a later decision contradicts it. Neither do it anyway nor skip it
  silently; strike it and name what voided it. It stays in the file as history:

  ```markdown
  - [x] ~~Supervisors can register new technicians~~ — **voided by
        [[260907135503]]**, which decided mentoring gets no screens at all
  ```

- **Awaiting a person** — a check only a person can make, which the owner
  deferred at the start of the chain. Leave the box open, mark the line as
  awaiting that owner, and write a hand scenario in `## Notes`: numbered steps
  anyone can follow, ending in what they should see. The reviewer does not
  reject the ticket for it; the chain's summary lists it.

  ```markdown
  - [ ] It reads well on a small phone — **awaiting mirza**: hand scenario in Notes
  ```

**Run the checks last, through `test-run.sh`.** When `settings.md` has a
`test_command`, the final run before the move goes through
`"$K/test-run.sh" <id>`, after the last change to the code. It runs the
command and appends a line to `## Notes` with the exit code and a fingerprint
of exactly the content it ran on, untracked files included and `.kerjaan/`
left out. The reviewer checks that fingerprint against what it reviews and,
when the two match and the run passed, does not run the suite a second time —
so the handover waits for one run, not two. Committing after the run changes
nothing; editing a line of code after it does, and costs the reviewer its own
run. Do not touch the code while it runs: a run that saw its content change is
recorded as proving nothing.

Work on a branch of its own brings main in first (`merge.sh sync`, in its
worktree) and runs the checks on that merged state; the move to review is
refused until the branch holds all of main's code and the latest run passed on
exactly what is committed there (`references/parallel-work.md`, "Back into
main").

**Depth of review** comes from the `review` field. Leave it empty (`quick`)
unless the ticket needs more; the level is the user's call. Suggesting one is
the planner's, which read the code: its report names a level per ticket, and
the foreman puts those to the owner with the other questions. **Read
`references/review.md`** whenever a ticket in the chain lands on money,
authentication, permissions, unrecoverable data or anything a customer hits
first.

**The move hands the ticket off.** The worker moves its ticket to `review`,
and a hook sees the move. Inside the worker it says only to stop and report:
a worker never dispatches a reviewer. When the worker's report reaches the
foreman, the foreman dispatches `kerjaan-reviewer` — and when the foreman makes
the move itself, the hook tells it to do the same. The foreman waits for the verdict before the next worker starts. Nobody
performs the review but the reviewer. From this moment the ticket's code is
untouchable: an edit made now, even to strengthen a test, is one the reviewer
judges without knowing it happened. If something genuinely remains, move the
ticket back to `in_progress` and finish it there.

### Out of `review`

The reviewer decides and moves the ticket — to `done/`, or back to
`in_progress/` with evidence. Whoever executed a ticket never marks their own
work `done`. A returned ticket goes back to **the same worker**, resumed from
its transcript so it fixes without reading everything again, and the second
round goes to the same reviewer the same way. **Read `references/foreman.md`
and `references/review.md` when a ticket comes back from review** — they cover
resuming, fixing a returned ticket, and when to stop and ask the owner
instead.

### When the user says "mark it done"

The user owns the board, so this is theirs to say, but "done" means passed
review. Unless they explicitly want to skip review, tick `Done when` as above
and move the ticket to `review`; tell them in one line that the reviewer will
move it to `done`. If they do want to skip it — "langsung done saja", "no
review needed" — move it to `done` and append to `## Notes`:
`Moved to done by <owner> without review, <date>.` A `done` with no review
behind it must say so.

### When the board goes quiet

When `todo`, `in_progress` and `review` are all empty, the batch is over — and
the foreman that just ran it, holding every report, verdict and carry-forward,
knows the work better than any session after it will. Use that before the
conversation ends, without waiting to be asked:

1. Offer the reviewers' suggested follow-ups (`references/review.md`).
2. Run `"$K/release.sh" unreleased`. When it lists tickets not marked
   `(board only)`, name them to the owner and offer a release: until one is
   made, whoever runs what the project ships does not have their work. A yes
   makes the release a ticket like any other, through a worker; its release
   commit names the ID of every ticket it carries. `NO RELEASE`, or only
   board-only tickets: say nothing.
3. Dispatch the planner for the next batch (`references/foreman.md`, "Filling
   the queue"), giving it what you now know: what just finished and the
   carry-forward — what the finished work made possible, cheaper, or urgent.
   Relay its proposal and questions to the owner.

Nothing moves before the owner approves. Filling `todo` from `backlog` is
deciding what the next batch is, and that is the owner's call even when the
reasoning looks obvious; carrying the approved batch into `todo` is then the
planner's. Taking the next ticket out of a `todo` that is already ordered is
not the owner's call again: that choice was made when the batch went in (see
"Into `in_progress`").

### Cancelling

Append the reason to `## Notes` before moving the ticket to `cancel/`. Anyone
who later searches before creating reads that reason, and without it the same
idea gets filed and dropped twice.

### Editing and renaming

Edit prose and fields as ordinary markdown, then run `update-ticket.sh <id>`
with no options. The script's job is `updated`: forgetting to refresh it raises
no error and leaves a lie months later. Its first argument may be an ID or a
path; it prints the ticket's current path. A rename keeps the ID, so other
tickets' references need no attention.

### Committing

The board lives in git so that code and status travel together. Commit when
the user or the project's own rules call for it — kerjaan does not change who
decides that, except that handing tickets to workers is consent to the
commits each worker makes for its own ticket — but when you commit work for a
ticket, its files under `.kerjaan/` go in the same commit, and the message
names the ticket ID. Code
committed without the status move that goes with it leaves the history saying
the work happened while the board says it had not started. A move with no code
behind it — a verdict, a cancel, a new ticket — goes in the next commit, never
left out.

## Answering questions about the board

Read the folders directly and answer in conversation:

```bash
ls .kerjaan/in_progress/ .kerjaan/review/
grep -l 'priority: high' .kerjaan/todo/*.md
```

Never write the answer to a file. An index, board README or status summary
starts going stale the moment it exists. The two non-ticket files hold what no
folder can: `order.md` the sequence and its reasons, `settings.md` the board's
own configuration. Searching is
deliberately unscripted: a wrong search looks wrong at once, so use whatever
fits.

**Who moved it, and why.** A History line that names a session points at the
conversation that made the move — the foreman starting a ticket, a worker
handing it to review, a reviewer passing or sending it back. To read it again,
open a terminal in the folder that session was started from (the repo's root
for a foreman working on main) and run:

```bash
claude --resume 4dbcf082-290a-4f65-845c-ee75fd3b3e9c
```

A worker's or reviewer's own steps sit inside that same conversation, as its
subagents. Claude Code deletes old transcripts on startup — after 30 days
unless `cleanupPeriodDays` in `~/.claude/settings.json` says otherwise — so an
old id may open nothing: say so, and fall back on the ticket's `## Notes` and
on git, which keep the decisions themselves. A line without an id was written
outside Claude Code, or before ids were recorded, and has no conversation to
open.

**The viewer.** When the user asks to see the board, run the viewer, or show
what is in flight in a browser ("tampilkan papannya", "jalankan viewer"),
start it in the background and hand over the address it prints:

```bash
node "${CLAUDE_PLUGIN_ROOT}/viewer/server.mjs" --scan "$(dirname "$PWD")" --project "$(basename "$PWD")" --open
```

It opens this repo's board as a kanban, one column per status, and follows
`.kerjaan/` live; it writes nothing. If it says the port is already in use, a
viewer is most likely running already: hand over
`http://127.0.0.1:4321/<repo folder name>/` instead of starting another.

## Rare repairs

**Read `references/repairs.md`** when two tickets share an ID (after a merge or
a copy-paste), or when a damaged file makes `update-ticket.sh` refuse to run
and `updated` must be written by hand.
