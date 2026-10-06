---
language: Bahasa Indonesia
test_command:
long_lived_branches: []
owner_explanation: off
explanation_translation: false
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
