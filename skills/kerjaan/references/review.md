# Review: choosing its depth, and what to do with the verdict

Read this before moving a ticket to `review` when its depth is worth a thought,
when a ticket comes back from review, and when a batch of tickets has finished
reviewing.

## How deeply a ticket gets reviewed

| `review:` | What the reviewer does |
|---|---|
| `quick` *(empty)* | Runs the project's checks once and reads the change against the criteria |
| `normal` | Proves every criterion by running something, starts the app when a criterion is about what a user sees, and reads the tests for assertions that cannot fail |
| `strict` | All of `normal`, in a clean copy of the repo, plus deliberately breaking the code to confirm the tests catch it |

Most tickets want `quick`: a wording fix, a renamed button, a config change.
Depth is expensive — `strict` can install dependencies from scratch and rerun
tests for every piece of code it breaks on purpose — and a review that always
costs the most is one people learn to route around. `normal` fits criteria that
describe behaviour rather than content; `strict` fits work where being wrong is
expensive.

The level bounds effort, not honesty. Even `quick` judges `Done when` line by
line, refuses to take `## Notes` as evidence, and digs deeper on its own when
something does not add up. Every review records its level in `## Notes`.

### Suggesting a level

The level is the user's call; suggesting a higher one is yours, because you
just read the code and know whether it sits somewhere that punishes a mistake.
Say so in one line, before the move, naming the reason rather than the level
alone:

> This touches the payment callback — want me to set `review: strict` so the
> reviewer breaks the code on purpose and checks the tests actually catch it?

Offer it when the work landed on money, authentication, permissions, data that
cannot be recovered, or anything a customer hits first — and equally when you
are unsure your change is right. That last case is the most valuable and the
easiest to skip.

Then do what they say, and:

- **When the user has asked for speed, stop offering.** "Ini cuma mock", "buat
  MVP dulu", "yang penting jalan", "jangan lama-lama" settle it for the work
  that follows: use `quick` and say nothing further about levels.
- **Ask once per ticket.** Declined is settled.
- **Never raise the level silently.** A review that costs ten minutes when the
  user expected one is a review they will start working around.

**A level cannot rescue a thin checklist.** The reviewer blocks on `Done when`
and nothing else, so criteria that describe only the happy path pass even at
`strict`. If what worries you is an input nobody validated or an error nobody
handled, add a criterion saying so. Suggest the criterion first, the level
second.

If you only realise after the move that a ticket needed a deeper look, edit the
field and dispatch `kerjaan-reviewer` again by hand.

### Your own checks are not evidence

`## Notes` is the claim under test, never evidence, so anything you write there
about testing your own work — including breaking the code yourself to watch the
tests fail — can only be recorded by the reviewer as a report. If doing so
found a test that cannot fail, fix the test and commit it: a test in the repo
is something the reviewer runs; a sentence about one is not.

## When a review sends the ticket back

**Fix the kind of mistake, not the instance named.** The reviewer groups what
it found by kind, but cannot promise it found every place. Before moving the
ticket to `review` again, look for the same shape across everything the ticket
touched. Patching only the quoted line is how one mistake becomes three rounds.

The next review narrows itself: the reviewer reads its earlier entry, checks
what changed through git, and does not re-prove untouched ground. **Do not
write instructions for the reviewer into `## Notes`** — a request for a lighter
look from whoever did the work is exactly what an independent gate exists to
ignore.

**After the second return, ask before trying again.** The reviewer states the
round. Put the choice to the ticket's owner in one line:

> This came back twice; what is left is that two permission tests cannot fail.
> Fix and review a third time, or accept it as is and ticket the tests?

If they accept: append to `## Notes` that the owner accepted the ticket over
the named findings, create the follow-up ticket with `related: [<this ID>]`,
and move this one to `done` yourself.

## Follow-ups the reviewer suggests

A reviewer cannot ask anybody anything, so it never files tickets. Things it
noticed outside the criteria go into a `### Suggested follow-up` block in the
reviewed ticket's `## Notes`.

**Offer them once the batch has landed**, not one review at a time: when
`todo`, `in_progress` and `review` are all empty, collect the bullets from the tickets
that reached `done` this session and put them to the user as one
multiple-choice question where any number, or none, may be picked:

> The reviewers left three suggestions. Which ones should become tickets?
>
> - [ ] **Export has no timeout** — from 260905160503
> - [ ] **Import accepts an empty file** — from 260905160502
> - [ ] **Settings page has no undo** — from 260905160401

In Claude Code that is `AskUserQuestion` with `multiSelect: true`: label is the
bullet's bold lead, description is the rest plus the ticket it came from.
Split into several questions when there are more suggestions than one question
holds, grouped by source ticket. Waiting for the batch means the user decides
once, with duplicates visible side by side.

For every pick, search the board first (a follow-up is often already there),
then create it in `backlog` unless the user says otherwise, with
`related: [<reviewed ticket ID>]`. Finally record each answer next to its
bullet in the reviewed ticket and run `update-ticket.sh` on it:

```markdown
- **The export runs with no timeout.** ... — **ticketed as [[260925101201]]**
- **Settings page has no undo.** ... — **declined by the owner, 2026-09-25**
```

That mark keeps a suggestion from being offered twice. A bullet without one
is one nobody has answered yet.

## Tickets stuck in `review/`

The hook only covers moves made while this plugin is installed. A ticket
sitting in `review/` with no reviewer on it — moved there by hand, or before
the hook existed — is reviewed by dispatching `kerjaan-reviewer` with its ID.
