# Review: choosing its depth, and what to do with the verdict

Read this before moving a ticket to `review` when its depth is worth a thought,
when a ticket comes back from review, and when a batch of tickets has finished
reviewing.

## How deeply a ticket gets reviewed

The `review:` field is `quick` (also when empty), `normal` or `strict`. What
each level makes the reviewer do is defined in one place, the table in
`agents/kerjaan-reviewer.md`, "How thorough to be": in short, `quick` reads the
change against the criteria beside one run of the checks, `normal` proves each
criterion by running something, and `strict` also breaks the code on purpose.

Most tickets want `quick`. Depth is expensive, and a review that always costs
the most is one people learn to route around. `normal` fits criteria that
describe behaviour rather than content; `strict` fits work where being wrong is
expensive.

The level bounds effort, not honesty: what holds at every level, `quick`
included, is listed under the same table. Every review records its level in
`## Notes`.

### Suggesting a level

The level is the owner's call. Suggesting one is the planner's
(`agents/kerjaan-planner.md`, step 7), because it reads the code a ticket will
touch; the foreman relays it (`references/foreman.md`, "Filling the queue"),
and the planner writes the owner's choice into `review:`:

> 260905160502 touches the payment callback — the planner suggests `review:
> strict`, so the reviewer breaks the code on purpose and checks the tests
> actually catch it. Agree?

What earns more than `quick` is in the planner's step 7. Then the owner's
answer stands, and:

- **When the owner has asked for speed, stop offering.** "It's just a mock",
  "MVP first", "as long as it runs", "don't take long" settle it for the work
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

**Every review opens with one fixed line**, in English on every board, whose
form is given in `agents/kerjaan-reviewer.md`, "The decision": it starts
`Reviewed at level` and ends in `passed` or `sent back`, and the review after
a merge postponed says `after merge postponed` where the round would stand.
Counting the lines that end in `sent back` gives the rejections. `## History`
tells the same: a move into `in_progress` straight from `review` is a
rejection, one from `done` is a merge postponed. Count both; they agree when
both reach back to the start, and when one misses some — a review from before
the fixed line, a ticket from before History — the larger count holds.

## When a review sends the ticket back

The same worker fixes it and the same reviewer judges the fix, both resumed
(`references/foreman.md`, "One ticket, start to finish", step 5); how the
worker fixes is in its definition.

**After the second rejection, ask before trying again.** Only rejections
count ("Rounds", above). Put the choice to the ticket's owner in one line:

> The reviewer sent this back twice; what is left is that two permission tests cannot fail.
> Fix and review a third time, or accept it as is and ticket the tests?

If they accept: append to `## Notes` that the owner accepted the ticket over
the named findings, create the follow-up ticket with `related: [<this ID>]`,
and move this one to `done` yourself; from there it is landed like any passed
ticket (`references/foreman.md`, step 5). A review after a merge postponed
then reads only the resolution and does not reopen what the owner accepted.
If they want a third round, resume the same worker as before.

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
bullet's bold lead, description is the rest plus the ticket it came from;
several questions, grouped by source ticket, when one does not hold them all.

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
