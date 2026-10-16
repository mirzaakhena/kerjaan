---
language:
test_command:
long_lived_branches: []
owner_explanation: off
explanation_translation: false
done_when_limit: 8
parallel_tests: false
worktree_setup:
worktree_teardown:
---

Settings for this board, read by the kerjaan skill, its reviewer, and
`update-ticket.sh`. Change them by editing this file.

- `language` — the language ticket prose is written in. Headings and
  frontmatter stay English whatever this says.
- `test_command` — the command that runs this project's checks, such as
  `npm test` or `make check`. The worker runs it through `test-run.sh`
  before a ticket goes to review, and the reviewer does not run it again when
  that run passed on exactly the content under review. Empty means the
  project has none, and reviews say so rather than inventing one.
- `long_lived_branches` — branches that hold work outside `HEAD` on purpose,
  so starting a ticket is not refused because of them. Glob patterns work:
  `[develop, release/*]`. List the main branch too if work usually happens on
  another branch.
- `owner_explanation` — whether the owner explains each ticket's code in their
  own words before it goes to review: `off`, `allow-to-skip` (asked, and may
  be declined on the record) or `strict` (required; the move to review is
  refused without it). Anything but `off` also lets the AI make the commits
  that step needs without asking. Tickets with no code are never asked.
- `explanation_translation` — `true` lets the AI add a labelled translation
  under an explanation written in a language other than `language`. The
  explanation itself is never changed.
- `done_when_limit` — how many items a ticket's `Done when` may hold before
  `update-ticket.sh` and `new-ticket.sh` warn that it should be split. Empty
  or missing means 8. The warning never stops a ticket being saved, and the
  owner can keep one ticket whole with `update-ticket.sh <id> --accept-size`.
- `parallel_tests` — whether test runs from different worktrees of this repo
  may overlap. `false`, the default, makes `test-run.sh` wait its turn: one
  run at a time across the whole repository, reviewers' runs included, and a
  run that had to wait says so in the line it records. Set `true` only when the tests share nothing
  between worktrees — no fixed port, local database, fixed temp path or
  cache — for instance because they choose those from `KERJAAN_SLOT`.
- `worktree_setup` — a command run inside every worktree `worktree.sh add`
  creates, before it is used: copy `.env` from `$KERJAAN_MAIN_TREE`, install
  packages, create this ticket's own test database. When it fails, the
  worktree is removed again and not used. Empty means nothing is run.
- `worktree_teardown` — a command run inside a worktree when `worktree.sh
  remove` removes it, and when a failed setup is undone: drop the test
  database or folders that belong to this ticket or slot. It removes only
  what this worktree owns, never shared data. When it fails, the worktree is
  kept. Empty means nothing is run.

The test command and both worktree commands see `KERJAAN_TICKET` (the ticket
ID), `KERJAAN_SLOT` (0 in the main tree; 1, 2, ... in linked worktrees, never
the same for two worktrees at once), `KERJAAN_WORKTREE` and
`KERJAAN_MAIN_TREE`. Who owns which test data is set out in
`references/parallel-work.md` in the kerjaan skill.
