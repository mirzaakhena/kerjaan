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

The level is the owner's call. Suggesting one is the planner's
(`agents/kerjaan-planner.md`), because it is the agent that reads the code a
ticket will touch and knows whether it sits somewhere that punishes a
mistake. Its report names a level for every ticket it proposes, with the
reason rather than the level alone; the foreman, which never reads the code,
puts those suggestions to the owner in the same message as the planner's
questions, adds none of its own, and the planner writes the owner's choice
into `review:`:

> 260905160502 touches the payment callback — the planner suggests `review:
> strict`, so the reviewer breaks the code on purpose and checks the tests
> actually catch it. Agree?

The planner suggests more than `quick` when the work lands on money,
authentication, permissions, data that cannot be recovered, or anything a
customer hits first — and equally when it is unsure the change can be got
right. That last case is the most valuable and the easiest to skip.

Then the owner's answer stands, and:

- **When the owner has asked for speed, stop offering.** "Ini cuma mock", "buat
  MVP dulu", "yang penting jalan", "jangan lama-lama" settle it for the work
  that follows: use `quick` and say nothing further about levels.
- **Ask once per ticket.** Declined is settled.
- **Never raise the level silently.** A review that costs ten minutes when the
  owner expected one is a review they will start working around.

**A level cannot rescue a thin checklist.** The reviewer blocks on `Done when`
and nothing else, so criteria that describe only the happy path pass even at
`strict`. If what worries the planner is an input nobody validated or an error
nobody handled, it asks for a criterion saying so. The criterion first, the
level second.

If you only realise after the move that a ticket needed a deeper look, edit the
field and dispatch `kerjaan-reviewer` again by hand.

### Your own checks are not evidence

`## Notes` is the claim under test, never evidence. The one exception is the
line `test-run.sh` writes: it carries a fingerprint of the content the checks
ran on, the reviewer compares that with what it is reviewing through git, and
a match with a passing run spares the second run. A run described in your own
words spares nothing. Everything else you write about testing your own work —
including breaking the code yourself to watch the
tests fail — can only be recorded by the reviewer as a report. If doing so
found a test that cannot fail, fix the test and commit it: a test in the repo
is something the reviewer runs; a sentence about one is not.

## Rounds

One definition, used by the foreman, the reviewer and the review hook alike:
**a round ends with one rejection by the reviewer.** Round 1 is the first
review; round 2 is the review after the first rejection; round N is the
review after N-1 rejections. The rejections are what is counted, and the
second one stops the chain.

A **merge postponed** is the other way a ticket comes back to `in_progress`:
it passed review, and `merge.sh land` sent it back because main or its branch
changed before it could land (`references/parallel-work.md`, "Back into
main"). That is its one name, everywhere. It is no rejection and has no
findings; the review that follows it is **the review after a merge
postponed**, which has no round number, is always level `quick`, and reads
only `merge.sh resolution <id>`. A ticket passed in round 1 and reviewed again
after a merge postponed has still had no rejection; if that review sends it
back, that is a rejection like any other.

**Every review opens with one fixed line**, in English whatever the board's
language, so whoever comes later — a replacement reviewer, the hook — finds
every earlier review on any board:

```
- <YYYY-MM-DD>: Reviewed at level <level>, round <n>, at commit <hash>: <passed | sent back>.
- <YYYY-MM-DD>: Reviewed at level quick, after merge postponed, at commit <hash>: <passed | sent back>.
```

The line stands alone; the rest of the review follows it in the board's
language. Counting the lines that end in `sent back` gives the rejections.
Reviews written before this line was fixed may open in the board's language;
for those, `## History` tells the same: a move into `in_progress` straight
from `review` is a rejection, one from `done` is a merge postponed.

## When a review sends the ticket back

The foreman resumes **the worker that did the ticket**, with `SendMessage` to
its agent ID, and hands it the findings; once it reports, the foreman resumes
**the reviewer of the round before** the same way. Neither starts over, which
is what makes a second round cheap. Only when one of them can no longer be
resumed does a fresh agent take its place, working from `## Notes`
(`references/foreman.md`, "One ticket, start to finish").

**Fix the kind of mistake, not the instance named.** The reviewer groups what
it found by kind, but cannot promise it found every place. Before moving the
ticket to `review` again, look for the same shape across everything the ticket
touched. Patching only the quoted line is how one mistake becomes three rounds.

The next review narrows itself: the reviewer reads its earlier entry, checks
what changed through git, and does not re-prove untouched ground. **Do not
write instructions for the reviewer into `## Notes`** — a request for a lighter
look from whoever did the work is exactly what an independent gate exists to
ignore.

**After the second rejection, ask before trying again.** Only rejections
count ("Rounds", above): a merge postponed has no findings against it, and the
review after it is a short one of the conflict resolution alone. The reviewer
states the round in its opening line, and the foreman counts the rejections: a
second one stops the chain. Put the choice to the ticket's owner in one line:

> The reviewer sent this back twice; what is left is that two permission tests cannot fail.
> Fix and review a third time, or accept it as is and ticket the tests?

If they accept: append to `## Notes` that the owner accepted the ticket over
the named findings, create the follow-up ticket with `related: [<this ID>]`,
and move this one to `done` yourself. From there it is a passed ticket: when it
was worked in a worktree, land it with `"$K/merge.sh" land <id>` as for any
ticket its reviewer passed (`references/foreman.md`, step 5). The owner
accepted the findings, not a branch left beside main. Should `land` answer
`MERGE POSTPONED`, the review after it reads only the resolution, as always,
and does not reopen what the owner accepted. If they want a third round,
resume the same worker as before.

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
the hook existed — is reviewed by the foreman dispatching `kerjaan-reviewer` with its ID.
