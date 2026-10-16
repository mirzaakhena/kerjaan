---
name: kerjaan
description: Ticket tracker made of plain markdown files inside a repo, under a `.kerjaan/` folder whose subfolders (backlog, todo, in_progress, review, done, cancel) are the ticket status. Use this skill for creating tickets, moving them between statuses, editing them, and answering questions about what is planned or in flight. Trigger it whenever the user mentions ticket, backlog, todo, in progress, review, done, cancel, `.kerjaan`, or asks to record, track, or update a bug, feature, idea, or task in a repo — including indirect phrasings with no such word at all, like "note this down for later", "put that on the backlog", "not now, maybe later", "mark that as done", "scrap that one", "what are we working on", or their Indonesian equivalents such as "catat ini dulu", "masukkan ke backlog", "tandai sudah selesai", and "apa saja yang sedang dikerjakan". Prefer this skill over writing an ad-hoc TODO list, notes file, or issue text, since those drift away from the agreed format.
---

# kerjaan

A ticket tracker that is nothing but markdown files inside a repo. Three kinds
of people read the tickets: the owner of the work, whoever executes it, and
non-technical readers who open one file with no context and must understand at
once what is happening and what is asked. That third audience drives most
rules below.

## Quick reference

```bash
K="${CLAUDE_PLUGIN_ROOT}/skills/kerjaan/scripts"      # always run from the repo root
[ -d "$K" ] || K=$(dirname "$(find ~/.claude/plugins ~/.claude/skills -path '*kerjaan/scripts/new-ticket.sh' 2>/dev/null | head -1)")

"$K/new-ticket.sh" backlog "Send notifications through Telegram"   # prints the new path
"$K/update-ticket.sh" 260905160401 --status todo                   # move
"$K/update-ticket.sh" 260905160401 --title "A clearer title"       # rename
"$K/update-ticket.sh" 260905160401                                 # after editing prose
ls .kerjaan/*/"260905160401 "*.md                                  # find by ID; the folder is its status
```

Everything else lives in a guide. Read the guide before the step, not after:

| When | Read |
|---|---|
| Any ticket is about to be worked on (one or a whole `todo`), the owner asks what can be worked on, a worker or reviewer reports, the owner says "mark it done" or "langsung saja", the board goes quiet | `references/foreman.md` |
| Writing or editing `order.md` | `references/ordering-the-queue.md` |
| Two tickets are going to run side by side (`worktree.sh`, `merge.sh`) | `references/parallel-work.md` |
| A review level is worth a thought, a ticket comes back from review, reviewers left follow-ups | `references/review.md` |
| Two tickets share an ID (`repair.sh`), or a damaged file makes the scripts refuse | `references/repairs.md` |

The rules that are broken most often:

1. **Work starts from a ticket** the user has seen — search first, create if none.
2. **The main session never writes a ticket's code.** It is the foreman: every
   ticket goes to a `kerjaan-worker` subagent (`references/foreman.md`).
3. **Move a ticket to `in_progress` before the first change to the repo.**
4. **Every change to a ticket goes through `update-ticket.sh`**, never a bare `mv`.
5. **Once a ticket is in `review/`, stop touching its code.**
6. **Never review your own work.** The reviewer decides and moves the file;
   only the foreman dispatches it.
7. **Never pass `--ack-unmerged` or `--accept-size` on your own.** Those
   decisions are the owner's.
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
└── settings.md   language, test command, long-lived branches, limits
```

The folder is the only thing that determines status; there is no `status`
field. `update-ticket.sh` enforces a few gates and no other sequence; the rest
of a ticket's life is yours to keep.

**Settings.** When `.kerjaan/settings.md` is missing (`new-ticket.sh` says
so), work out likely values from the repo — the language of existing tickets,
`package.json`/`Makefile`/CI, the branches — put them to the owner in one
message, and write the file from `$K/../SETTINGS.md`, which explains each key.

**Starting a session.** The first time you touch the board in a session, run
`ls .kerjaan/in_progress/ .kerjaan/review/`. What this session did not put
there is stuck or forgotten: before anything new, ask the user whether to
resume each `in_progress` ticket (a new worker, from its `## Notes`), and
dispatch `kerjaan-reviewer` on each in `review`.

## Ticket files

`<ticket_id> <title>.md`, e.g. `260905160401 Send notifications through Telegram.md`.

- **The title and the ID live only in the file name**: no `title:` or `id:`
  key, no H1. A ticket names other tickets (`related`, `blocked_by`), never
  itself. Rename only through the script.
- **The ID is `yymmddhhmmxx`** — creation minute plus a sequence — and never
  changes, so every cross-reference uses it. `new-ticket.sh` picks it; never
  compute one yourself.
- **File names contain spaces: always quote them.**

## Anatomy of a ticket

A good ticket — any reader understands it and can check it without help:

```markdown
---
type: bug
priority: high
review:
labels: [telegram-bot]
reporter: mirza
assign_to: claude
created: 2026-09-05 16:04:01
updated: 2026-09-05 16:04:01
related: [260904091233]
blocked_by: []
---

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

## History
- 2026-09-05 16:04:01 todo

## Notes
(none yet)
```

Poor: a Background of "`notifier.py` still uses a polling loop, causing a race
condition", a Request to "refactor to async using `asyncio.Queue`", and a
Done when of "`test_notifier.py` passes" — legible only to someone who knows
the repo. Technical detail is not forbidden; technical decisions belong to
whoever executes the work, not baked into the ticket from the start.

| Field | Value |
|---|---|
| `type` | `bug`, `feature`, or `task` — nothing else; anything neither a defect nor a new capability is a `task` |
| `priority` | `high`, `medium`, or `low` |
| `review` | `quick`, `normal`, or `strict`; empty means `quick` (`references/review.md`) |
| `labels` | list; may be `[]` |
| `reporter` | who asked for this |
| `assign_to` | who executes it; may be empty |
| `created` | `YYYY-MM-DD HH:MM:SS`, never changes |
| `updated` | refreshed by the script on every change |
| `related` | peer tickets ("connected to that"); may be `[]` |
| `blocked_by` | tickets that must finish first; may be `[]` |

Every field is always present, empty rather than deleted. Only `blocked_by`
affects the order of work; a ticket born out of another has it in `related`.

### The headings, in this order

**`## Background`** — the situation as it stands, for a reader who knows
nothing. No file names, no function names, no unexplained abbreviations.

**`## How to reproduce`** — bug tickets only, omitted elsewhere. Numbered steps
from a cold start that anyone can follow, ending with what actually happens.

**`## Request`** — the outcome wanted, not the technical means. The means
change during execution; the outcome does not.

**`## Done when`** — a `- [ ]` checklist a non-technical person could verify on
their own. If a criterion can only be checked by reading code, the ticket is
not finished being written. On a bug, point at the reproduction's outcome
rather than restating the steps. How many items it may hold: "How big a
ticket is", below.

**`## History`** — written only by the scripts: `- <time> [<session-id>]
<status>` per status entered. **`## Notes`** — always last: cross-references,
decisions, findings, `(none yet)` when empty.

**Language.** Folder names, frontmatter and headings are always English; prose
is in the board's `language` (`settings.md`), in words someone outside the
technical team understands without follow-up questions.

## Creating

**Work starts from a ticket.** When the user asks for work on a repo that has
a board and no ticket covers it, search, create it, and show the user its
`Request` and `Done when` before any code is touched; start once they agree or
correct it. When the user says "no ticket for this" or "langsung saja", that
skips the ticket, not the worker, and a `kerjaan-reviewer` always checks the
work (`references/foreman.md`, "Work without a ticket").

**Search first.** Two tickets for one outcome split its history in half. Pick
two or three keywords, in the board's language and in English, and search
titles and prose — the title is only in the file name, which `grep` misses:

```bash
ls .kerjaan/*/ | grep -i -e 'telegram' -e 'notif'       # titles
grep -ril -e 'telegram' -e 'notif' .kerjaan/*/          # prose
```

By where a match sits:

- **`backlog`, `todo` or `in_progress`, same outcome** — update that ticket
  instead (widen `Background`/`Request`/`Done when`, rename if the title no
  longer fits) and tell the user which ticket absorbed the request.
- **Connected but a different outcome** — create a new one, linked with
  `related`, or `blocked_by` when one really must finish first.
- **`review` or `done`** — its claim has been made; do not widen it. Create a
  new ticket with `related: [<that ID>]`.
- **`cancel`** — read why it was dropped and tell the user before creating
  anything; it may already have been decided against.
- **Unclear whether it is the same outcome** — ask.

Then run `new-ticket.sh` (it creates `.kerjaan/` if missing) and fill in the
file it prints: every frontmatter field you can, and all prose sections; a bug
also gets `## How to reproduce`. If there is not enough to write `Background`
and `Request` properly, ask first: a half-written ticket looks like the work
has been recorded when it has not. Then run `update-ticket.sh <id>`, which
refreshes `updated` and checks the size.

### How big a ticket is

**About 6 to 8 items in `Done when` is the limit** — `done_when_limit` in
`settings.md`, 8 without it. Past that a ticket holds more than one round of
work: the review gets duller, the result shows up late, the worker runs out of
room, and one failing part holds back the rest. Every item counts, including
one only a person can check; items struck through as voided or moved do not.

**Split by outcome, never by file or by technical layer.** Each piece must be
something the owner can try on its own and see working; "the database part"
and "the tests" are not pieces. A screen with twenty items becomes "the list
shows", "a category can be added and edited", "a category can be archived".
The original keeps its ID and becomes the first piece; each new piece carries
`related: [<first piece>]`, and `blocked_by` when it really cannot start
before another; criteria that moved are struck through with a pointer to the
ticket that took them.

**The scripts warn; they never refuse.** `new-ticket.sh` and
`update-ticket.sh` print a `WARNING` when a ticket in `backlog`, `todo` or
`in_progress` is over the limit, and save it as it is; `"$K/ticket-size.sh"
<id>` runs the check alone. The planner splits on its own when it fills the
queue (`agents/kerjaan-planner.md`); in conversation, offer the owner the split
and make it once they agree. When the owner keeps a ticket whole, run
`update-ticket.sh <id> --accept-size`: it records that in `## Notes` and the
warning stops — on the owner's word only.

## Moving

### Into `todo`

**Is it ready?** Mechanical, and one definition: what `"$K/queue.sh" check`
tests, nothing more and nothing less. All five must hold:

- **`type` and `priority` are filled in.** `assign_to` may stay empty.
- **No question is still open.** A question recorded with `queue.sh ask` and
  not yet answered with `queue.sh answer` also makes `update-ticket.sh` refuse
  the move into `todo`. Every judgement a reader has to make goes through this
  one: a `Done when` line a non-technical person could not check, two readings
  where the wrong one means rework, a decision left in `## Notes` without an
  answer — each is asked, numbered, and is no longer open once answered.
- **Its size is within the limit, or the owner kept it whole**
  (`ticket-size.sh <id>` prints nothing).
- **It carries an estimate of the files it will change** (`queue.sh estimate
  <id> <path>...`), which decides whether it may run beside another ticket. A
  ticket that changes no file of the project records exactly that with
  `queue.sh estimate <id> --none`, never a made-up file.
- **Every ticket in its `blocked_by` is finished or ahead of it.** Finished is
  in `done/` and, when it was worked on a branch, landed on main. Ahead of it
  is in flight (`in_progress` or `review`), or in `todo` in an earlier group of
  `order.md`; a blocker in `backlog` is ahead only when it goes into `todo` in
  the same batch. One in `cancel/` is neither: ask the user whether the
  dependency is gone or this ticket should be cancelled too.

`"$K/queue.sh" check <id>...` judges candidates by these five; with no IDs it
judges `todo` and `order.md` together. `READY` is the answer, and no list
anywhere else overrides it.

**Should it be next?** A judgement, and the user's. When the user asks for a
move you would not have made, name in one line the single check that failed,
then do as they say. Filling `todo` from `backlog` is the planner's
(`references/foreman.md`, "Filling the queue").

### Into `in_progress`, `review`, and out of it

**Move the ticket to `in_progress` before the first change to the repo** —
even when you expect to finish in one sitting: work stops half-done more often
than anyone plans, and a board saying `todo` beside a changed tree tells
nobody what was going on. The script refuses the start while other work sits
unmerged; what to do then is in `references/foreman.md`, step 1 of "One
ticket, start to finish".

The worker ticks `Done when`, runs the checks through `test-run.sh` and moves
the ticket to `review` (`agents/kerjaan-worker.md`, steps 4 to 8); anyone else
moving one there follows the same steps. From then on its code is untouchable:
if something genuinely remains, move it back to `in_progress`. The reviewer
moves it on, and `references/foreman.md` says what follows each verdict.

### Editing, renaming, cancelling

Edit prose and fields as ordinary markdown, then run `update-ticket.sh <id>`
with no options: a forgotten `updated` raises no error and leaves a lie months
later. It takes an ID or a path and prints the current path; a rename keeps
the ID. Before moving a ticket to `cancel/`, append the reason to `## Notes`,
so whoever searches before creating reads why it was dropped.

### Committing

Commit when the user or the project's rules call for it; handing tickets to
the chain is consent to the commits the chain makes for them. When you commit
work for a ticket, its files under `.kerjaan/` go in the same commit and the
message names the ticket ID, so code and status travel together. How a
ticket's work splits into commits — at most three, and how side by side
differs — is `references/foreman.md`, "Commits".

**Every commit names its paths**, so nobody sweeps up other people's work:

```bash
git add -A -- <files> '.kerjaan/*/<id> *'
git commit -m "<message>" -- <files> '.kerjaan/*/<id> *'
```

`<files>` are the code files, or nothing for a board-only commit. The quoted
pattern catches the ticket's old and new path after a move; add one per
ticket the commit carries. Everything else in the tree stays as it was.

**A move with no code behind it** — a ticket created, moved to `backlog`,
`todo` or `cancel`, an answer written in — goes in the next commit of
whoever made it, never left out: the planner commits its own when it reports,
and the foreman carries its own in the next start commit, or commits them
before its summary when the chain ends.

## Answering questions about the board

Read the folders directly (`ls .kerjaan/review/`, `grep -l 'priority: high'
.kerjaan/todo/*.md`) and answer in conversation. Never write the answer to a
file: an index or status summary starts going stale the moment it exists. `order.md` and `settings.md` hold what no folder
can.

**Who moved it, and why.** A History line's session id opens the conversation
that made the move, its subagents included: `claude --resume <session-id>`,
from the folder that session started in. Old transcripts are deleted (after 30
days by default); then say so, and fall back on `## Notes` and git.

**The viewer.** When the user asks to see the board in a browser ("tampilkan
papannya"), start it in the background and hand over the address it prints;
it writes nothing. If the port is in use, one is already running: hand over
`http://127.0.0.1:4321/<repo folder name>/` instead.

```bash
node "$K/../../../viewer/server.mjs" --scan "$(dirname "$PWD")" --project "$(basename "$PWD")" --open
```
