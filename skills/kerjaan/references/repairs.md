# Repairs

Read this only when something reached the board without going through the
scripts. Neither case should happen in normal use.

## When two tickets share an ID

`new-ticket.sh` locks the board while it picks a sequence number, so this
cannot come from the script. It comes from outside: a copy-paste, a git merge
of two branches, a manual rename. Detect it with:

```bash
for f in .kerjaan/*/*.md; do basename "$f" | cut -c1-12; done | sort | uniq -d
```

Resolve each duplicate:

1. Compare `created`. **The older one keeps the ID** — it is more likely to be
   referenced already.
2. The younger one takes the next free sequence number in the same minute.
   Renaming the file is enough; `created` does not change, because it records
   when the ticket was born, not when its ID was tidied up. If that minute is
   exhausted up to `99`, move into the next minute (`...160599` →
   `...160601`): an ID only needs to be unique and roughly ordered.
3. Find inbound references to the old ID:

   ```bash
   grep -rl '260905160401' .kerjaan/
   ```

   While the ID was duplicated those references are ambiguous. Read each
   referring ticket's context, decide which ticket it meant, and fix only the
   ones pointing at the ticket you renumbered. `order.md` shows up here too if
   the renumbered ticket is in `todo`.
4. Run `update-ticket.sh` on the renumbered ticket and on every ticket whose
   references changed.

## Writing `updated` by hand

Only while repairing a damaged file that `update-ticket.sh` refuses to touch.
Take the real time, never a guess or a copy:

```bash
date '+%Y-%m-%d %H:%M:%S'
```

`updated` is the board's only trace of time. Once it has been wrong, readers
cannot tell whether anything they read is current, and only git history can
restore that.
