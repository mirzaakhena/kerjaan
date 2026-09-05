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
`priority` values, and the four content headings. These never vary from ticket
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

### The four headings

Fixed order, identical for all three types. There is no per-type variation —
that uniformity is what makes a ticket readable at a glance.

**`## Background`** — the situation as it stands, for a reader who knows
nothing. No file names, no function names, no unexplained abbreviations. If a
technical term is unavoidable, explain it once where it first appears.

**`## Request`** — the outcome that is wanted, not the technical means of
getting there. The means change during execution; the wanted outcome does not.

**`## Done when`** — a `- [ ]` checklist of criteria a **non-technical person
could verify on their own**. This is the most honest test of a ticket's
quality: if the criteria can only be checked by reading code, the ticket is not
finished being written.

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

## Request
Messages that arrive together must all still get a reply, with none lost.

## Done when
- [ ] Send three messages within one second; all three receive a reply
- [ ] Run for a full day with no reports of a missed message
```

Notice that the good version names no file and no library. Technical detail is
not forbidden — but technical decisions belong to whoever executes the work,
not baked into the ticket as a constraint from the start.

## Operations

### Creating a ticket

```bash
~/.claude/skills/kerjaan/scripts/new-ticket.sh backlog "Send notifications through Telegram"
```

Run it from the repo root. The script creates the `.kerjaan/` structure if it
is missing, determines the ID, copies the template, then prints the path of the
file it created.

Then fill that file in: complete `type`, `priority`, `labels`, `reporter`,
`assign_to`, and write all four prose sections. A file straight out of the
script is empty — leaving it that way is the same as not having created a
ticket at all.

If there is not enough information to write `Background` and `Request`
properly, ask the user first. A half-written ticket is worse than no ticket,
because it looks like the work has been recorded.

### Changing a ticket

All three kinds of change go through the same script, always from the repo
root:

```bash
UPD=~/.claude/skills/kerjaan/scripts/update-ticket.sh

$UPD 260905160401 --status in_progress             # move status
$UPD 260905160401 --title "A clearer title"        # rename
$UPD 260905160401                                  # after editing the prose
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

Renaming does not change the ID, and references from other tickets need no
attention, because references use the ID.

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
