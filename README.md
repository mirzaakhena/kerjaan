# kerjaan

A ticket tracker that is nothing but markdown files inside your repo. No
server, no database, no board view. Built as a
[Claude Code skill](https://docs.claude.com/en/docs/claude-code/skills), though
the format works just as well by hand.

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
└── cancel/       abandoned
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

```bash
git clone https://github.com/mirzaakhena/kerjaan.git ~/.claude/skills/kerjaan
```

The skill then applies in every project. To scope it to one project instead,
clone into `<project>/.claude/skills/kerjaan`.

## Usage

Usually it is enough to just ask in plain language — "note this down as a bug",
"move that to review", "what are we working on" — and Claude reaches for the
skill on its own. The commands themselves, run from the repo root:

```bash
K=~/.claude/skills/kerjaan/scripts

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

## Design principles

These four produced every rule in the skill, and they are enough to derive new
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
keys, `type` and `priority` values, and the headings never vary. Not sure
which side something falls on? Ask whether the word is identical in every
ticket. If it is, it is structure.

## Deliberately absent

- **No board view, index, or summary.** The moment a summary exists it starts
  going stale and quietly lying. To find out what is in flight, read the
  folders.
- **No change log inside the ticket.** Just `updated`. Git already holds the
  full history.
- **No opinion about git.** How tickets relate to commits is left to each
  repo's own habits.
- **Only three types:** `bug`, `feature`, `task`. Every additional type forces
  the author to think about categorisation, when what actually matters is the
  content.

## License

MIT — see [LICENSE](LICENSE).
