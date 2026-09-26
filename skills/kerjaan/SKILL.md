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
"$K/test-run.sh" 260905160401                                      # run test_command, record it
ls .kerjaan/*/"260905160401 "*.md                                  # find by ID; the folder is its status
```

The rules that are broken most often, each explained further down:

1. **Work starts from a ticket** the user has seen — search first, create if none.
2. **Move a ticket to `in_progress` before the first change to the repo.**
3. **Every change to a ticket goes through `update-ticket.sh`**, never a bare `mv`.
4. **Before `review`, tick `Done when` line by line** against what the work produced.
5. **Once a ticket is in `review/`, stop touching its code.**
6. **Never review your own work.** The reviewer decides and moves the file.
7. **Never pass `--ack-unmerged` on your own.** That decision is the owner's.
8. Never write a status summary, index or dashboard into `.kerjaan/`.

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
└── settings.md   language, test command, long-lived branches
```

The folder is the only thing that determines status. There is no `status`
field in the file, so two sources of truth can never disagree. Each folder
holds a `.gitkeep` so empty folders survive in git.

`update-ticket.sh` enforces one gate — see "Into `in_progress`" — and no
sequence otherwise. The other gates in "The life of a ticket" are yours to keep.

### Settings

`.kerjaan/settings.md` holds what the board cannot guess: the language ticket
prose is written in, the command that runs the project's checks (the reviewer
runs it first), and which branches live outside `HEAD` on purpose. When it is
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
the ticket is and whether to resume it; for `review`, dispatch
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
that one in `related` — the map and the reviewer's follow-ups rely on the trail.

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
not.

### Into `todo`

`todo` answers what somebody should pick up next. Nothing breaks when a ticket
lands there too early, so it rots quietly unless two separate questions are
kept separate.

**Is it ready?** Mechanical. All four must hold:

- `blocked_by` is empty, or every ID in it is in `done/`. A blocker sitting in
  `cancel/` does not count as finished: tell the user, and ask whether the
  dependency is gone (drop it from `blocked_by`) or this ticket should be
  cancelled too.
- `Done when` can be checked by a non-technical person. "The refactor is
  complete" is a feeling, not a criterion.
- No decision is still waiting on the user.
- `type` and `priority` are filled in (`assign_to` may stay empty).

**Should it be next?** A judgement, and the user's. A ticket earns its place
when it holds up other tickets, is groundwork the rest stands on, is small
enough to clear quickly, or belongs with something just finished or in flight.

**Size is a reason to split, not to wait.** A ticket too big to start usually
holds several outcomes in its `Request`; split by outcome. The original keeps
its ID and becomes the first piece; criteria that moved are struck through
with a pointer to the ticket that took them, and each new ticket carries
`related: [<original ID>]`.

**When the user asks for a move you would not have made**, name in one line the
single check that failed, then do as they say:

> This one is still `blocked_by` 260907135503, which is sitting in `todo`
> itself — move it anyway?

**The order of the queue.** When `todo` holds several tickets and sequence
matters, it is written in `.kerjaan/order.md`. `update-ticket.sh` keeps that
file in step (removes a ticket's line when it leaves `todo`, rewrites renamed
titles). **Read `references/ordering-the-queue.md` before writing or editing
`order.md`, and before refilling `todo` from `backlog`.**

### Into `in_progress`

**Clear the whole queue first.** Before the first ticket leaves `todo`, read
every ticket in `todo` as the person about to execute it: a line you would have
to guess at, two possible readings, a criterion you could not check? Collect
those questions from every ticket and ask them together, in one message. Write
each answer back into its ticket (`Request`, `Done when`, or `## Notes`) and
run `update-ticket.sh` on it — an answer left in the conversation is gone when
the session ends. Asked this way the user gives one sitting and the queue can
then run to the end; asked one ticket at a time, each question stalls the work
after the user has left. A ticket joining `todo` later is swept before the next
move out of `todo`; a question that surfaces mid-work is asked then and
written back the same way.

**Then move the ticket to `in_progress` before the first change to the repo** —
even when you fully expect to finish in one sitting. Especially then. The board
is not for whoever is doing the work; it is for whoever opens the repo later
and needs to know what is in flight. Work stops half-done more often than
anyone plans: a session ends, a connection drops. What is left is a board
saying `todo` and a working tree that disagrees, and `git status` shows which
files changed but not which ticket they belonged to. The tempting thought — *"I
will start and finish in one breath"* — plans only for the case where the step
was unnecessary. The rule costs one command.

**The script refuses the move while other work sits unmerged.** If any local
branch holds commits outside `HEAD` — other than branches of tickets in
`in_progress` or `review`, this ticket's own, and `long_lived_branches` in
`settings.md` — `update-ticket.sh` prints them and changes nothing. That is how
a ticket that passed review on a branch nobody merged gets noticed: at the
moment somebody is deciding what happens next. Put the list to the owner and
let them decide each branch: merge it, delete it, add it to
`long_lived_branches`, or start anyway. Only on that last answer rerun with
`--ack-unmerged`; the script writes the branches into the ticket's `## Notes`,
so the decision outlives the conversation.

One ticket at a time is normal. Two tickets in the same `order.md` group are
declared independent and may run side by side in separate git worktrees — but
a worktree checks out a second copy of `.kerjaan/`, which silently disagrees
with the first, and the scripts refuse to run there. **Read
`references/parallel-work.md` before creating a worktree.**

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

**Depth of review** comes from the `review` field. Leave it empty (`quick`)
unless the ticket needs more; the level is the user's call, and suggesting a
higher one is yours. **Read `references/review.md` before the move** whenever
the work touched money, authentication, permissions, unrecoverable data or
anything a customer hits first, or when you are unsure your change is right.

**The move hands the ticket off.** A hook sees the move and tells the session
to dispatch the `kerjaan-reviewer` subagent. Dispatch it, and do not wait for
it — pick up the next ticket. The session that did the work dispatches the
reviewer; it never performs the review itself. From this moment the ticket's
code is not yours: an edit made now, even to strengthen a test, is one the
reviewer judges without knowing it happened. If something genuinely remains,
move the ticket back to `in_progress` and finish it there.

### Out of `review`

The reviewer decides and moves the ticket — to `done/`, or back to
`in_progress/` with evidence. Whoever executed a ticket never marks their own
work `done`. **Read `references/review.md` when a ticket comes back from
review** — it covers fixing a returned ticket and when to stop and ask the
owner instead.

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
the session that just worked through it knows the code better than any session
after it will. Use that before the conversation ends, without waiting to be
asked:

1. Offer the reviewers' suggested follow-ups (`references/review.md`).
2. Read `backlog` with what you now know, and propose the next few candidates
   for `todo`: which ones, in what order, and why — what the finished work made
   possible, cheaper, or urgent. Follow `references/ordering-the-queue.md`.

Propose; do not move. Filling `todo` is deciding what happens next, and that is
the owner's call even when the reasoning looks obvious.

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
decides that — but when you commit work for a ticket, its files under
`.kerjaan/` go in the same commit, and the message names the ticket ID. Code
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

**The map.** When the user asks to see the board, a map, a graph, what depends
on what, or what should be next on a board too big to answer by reading
("tampilkan petanya"), start it in the background and hand over the address it
prints:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts/map.mjs" "$PWD" --open
```

It reads `.kerjaan/` live and writes nothing. Its advice panel groups each open
ticket under the done ticket it came from (via `related`/`blocked_by`) — a
reading of links, not a decision. When the user pastes back decisions from it,
apply them through the operations above, with the same checks as if they had
asked in words.

## Rare repairs

**Read `references/repairs.md`** when two tickets share an ID (after a merge or
a copy-paste), or when a damaged file makes `update-ticket.sh` refuse to run
and `updated` must be written by hand.
