# The owner's explanation

Read this before moving a ticket to `review` on a board whose `settings.md` sets
`owner_explanation` to `allow-to-skip` or `strict`.

Before the reviewer sees the work, the owner writes down, in their own words,
what the AI built. This is the owner's share of the review. They stay involved,
they know what code is in their repo, and where their understanding and the
code part ways, it shows up while the session that wrote the code is still
there to point at it.

| `owner_explanation` | What happens |
|---|---|
| `off` *(empty)* | Nothing. No explanation is asked for. The reviewer still runs; only the human's account is missing |
| `allow-to-skip` | Asked for, and the owner may decline. A decline is recorded |
| `strict` | Required. `update-ticket.sh` refuses the move to `review` until it is written |

A ticket whose commits change nothing outside `.kerjaan/`, such as a decision
or a plan, has no code to explain. The script lets it through on its own, so
there is nothing to override and nothing that looks like a breach.

Turning the setting on is also the owner's consent to the commits this step
needs: the work before the question, the owner's raw text, and the move. Make
them without asking each time.

## The section

The explanation has its own section, between `## Done when` and `## Notes`.
The owner's words sit inside a fenced block, exactly as written:

````markdown
## Explanation

```
The server now reads MONGO_URL from the environment instead of a fixed
address, so the same build runs on my laptop and on the server.
```
````

**Nothing inside the fence is ever the AI's.** The AI does not reword it,
shorten it, fix it, or translate it in place, even when the result would be
better, and even when it is already right. The owner's own sentences are the
evidence that they understood the work, and a single changed word makes them
the AI's. A wrong passage is corrected by the owner, and anything the AI has to
say goes outside the fence.

The section is exempt from `language` in `settings.md`. The owner writes in
whatever language they think in, even on a board that keeps everything else in
English. Every other rule about ticket prose stays as it is.

## The steps

They come after `Done when` is ticked and the last `test-run.sh`. The
fingerprint leaves `.kerjaan/` out, so nothing below costs a second test run.

1. **Commit the work**, with the ticket ID in the message, and put the
   placeholder under the heading in the same commit, so `grep` shows which
   tickets are waiting:

   ```markdown
   ## Explanation

   (waiting for the owner's explanation)
   ```

2. **Show the changes and ask.** Run `"$K/explain.sh" changes <id>` and give
   the owner its output: every file the ticket's commits touched, with the
   line ranges they wrote that are still there. Never type file names or line
   numbers yourself. Then ask the owner to write below the last line of the
   ticket, in any form and any language. The ticket stays in `in_progress`
   while you wait, since one of its conditions is not met yet.

3. **Find what they wrote through `git diff`** on the ticket, and check it
   against the ticket's code changes.

   - **Not right yet:** give a clue, not the answer. Point at a file and a line
     and ask a question: *"Look at `server/src/index.ts` line 7. Where does
     `MONGO_URL` point?"* Never explain it yourself, because an explanation
     you supply is one the owner copies. They write again below, and you
     check again.
   - **Typos:** point them out and offer the fix. The owner applies it to
     their raw text. The words stay theirs.
   - **Right:** go on.

4. **Commit the raw text as it stands.**

5. **Move it into the fence, in a commit of its own.** Cut the raw text from
   the bottom, paste it inside the fence, and drop the placeholder. Copy it as
   it is. Line breaks may move, but nothing else changes. Then run
   `"$K/explain.sh" check <id>`. It compares the words that left the bottom
   with the words now in the fence and refuses any word changed, added,
   dropped or reordered, and any other edit to the ticket in the same change.
   Commit only when it says OK. Anyone can then open that commit's diff and
   see that it only moved text.

6. **Move the ticket to `review`.** On `strict`, `update-ticket.sh` refuses
   while the fence is empty. On both settings it refuses when the fence does
   not hold the owner's words.

A revised explanation goes the same way: the owner writes below, and the move
replaces what the fence held or appends to it. Git keeps the old version.

### When the owner skips it

On `allow-to-skip`, the owner may stop at any point.

- **Nothing written:** remove the placeholder and append to `## Notes`:
  `Explanation skipped by <owner>, <date>.` The history then says so, the same
  way a `done` without review does.
- **Written, but not right yet:** steps 4 and 5 as usual, then, in a later
  commit, note in `## Notes` which part does not match the code. Keep the note
  outside the fence.

On `strict`, there is no skip. If the owner wants out, the setting is theirs
to change.

### A translation

When `explanation_translation` is `true` and the explanation is not in the
board's `language`, add a translation after the fence, in its own commit and
labelled as yours:

```markdown
*English rendering by AI, from the explanation above:*

> The server now reads ...
```

The original stays above it, unchanged. On a board without this setting,
leave the explanation untranslated.

## Who checks what

The check before `review` is done by the session that did the work. That is
not approving your own work, because what gets judged is the owner's
understanding, not your code.

The reviewer runs `explain.sh check`. A fence that does not hold the owner's
words is a blocking finding. On `strict` it also reads the explanation against
the code. A misunderstanding found there returns the ticket, with a reason that
keeps the two apart: *the code passes; the explanation needs revising.*
