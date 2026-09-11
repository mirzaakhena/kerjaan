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
└── cancel/       abandoned
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

## Writing style

Structure is always English: folder names, frontmatter keys, `type` values,
`priority` values, and the content headings. These never vary from ticket
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

**The reviewer decides, and the reviewer moves the file.** Whoever executed the
ticket does not get to mark their own work `done`; the last word on whether the
`Done when` list is satisfied belongs to something that did not write the code
and has no stake in it passing. It judges by running the checks itself rather
than by believing what `## Notes` claims, and when a criterion fails it hands
the ticket back with the evidence rather than quietly fixing the code — the
gap belongs to whoever created it.

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
