#!/usr/bin/env bash
#
# The owner's explanation: before a ticket goes to review, the owner writes in
# their own words what the AI built. This script does the parts of that which
# must not be typed by the AI.
#
# Why this script exists: two things in that step go wrong silently when left
# to the AI. A list of changed files and line numbers typed from memory can be
# wrong, and is stale the moment another commit lands. And "I only tidied the
# owner's text" is a claim nobody can check by eye once the text has moved. So
# the list is read from git, and the move is checked word for word.
#
# Where things live in a ticket. The explanation has its own section, between
# `## Done when` and `## History`, and the owner's words sit inside the first
# fenced block (three or more backticks) under its heading:
#
#   ## Explanation
#
#   ```
#   ...the owner's words, exactly as written...
#   ```
#
# Anything else in that section — the placeholder, a labelled translation — is
# the AI's, and is not the explanation. The owner writes their raw text below
# the last line of the ticket; once it is right, the AI moves it into the block
# in a commit of its own, and `check` proves that commit changed no word.
#
# Usage:
#   explain.sh changes <id>   files and line ranges this ticket's commits wrote
#   explain.sh check <id>     the block holds exactly the owner's words
#   explain.sh gate <id>      may the ticket go to review? (update-ticket.sh)

set -euo pipefail

usage() {
  cat >&2 <<USAGE
Usage: explain.sh changes <id>
       explain.sh check <id>
       explain.sh gate <id>

  changes   prints every file outside .kerjaan/ that commits naming <id>
            changed, with the line ranges they wrote that are still there
  check     confirms that the explanation block in <id> holds the words the
            owner wrote: same words, same order, whitespace aside. Exit 1
            when the change that put them there altered one
  gate      decides, from owner_explanation in .kerjaan/settings.md, whether
            <id> may move to review. Exit 1, with the reason, when it may not

Run from the repo root.
USAGE
  exit 2
}

[ "$#" -eq 2 ] || usage
cmd="$1"
id="$2"

case "$cmd" in changes|check|gate) ;; *) usage ;; esac
case "$id" in
  [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;;
  *) echo "'$id' is not a 12-digit ticket ID." >&2; exit 2 ;;
esac

git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not inside a git repository." >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"
board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 2; }

ticket=""
for f in "$board"/*/"$id "*.md; do
  [ -e "$f" ] || continue
  [ -z "$ticket" ] || { echo "ID $id is used by more than one ticket; see references/repairs.md." >&2; exit 2; }
  ticket="$f"
done
[ -n "$ticket" ] || { echo "No ticket with ID $id." >&2; exit 2; }

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

has_head=0
git rev-parse --verify -q HEAD > /dev/null 2>&1 && has_head=1

# ---------------------------------------------------------------------------
# The code this ticket wrote
# ---------------------------------------------------------------------------
# A ticket's commits are the ones whose message names its ID — the kerjaan
# skill requires that of every commit made for a ticket. Nothing is recorded
# when work starts: git already holds the answer, and a recorded starting
# commit would include whatever else landed on the same line meanwhile.
#
# Work on a branch that is not merged yet is read from that branch.

code_rev="HEAD"
if [ "$has_head" -eq 1 ]; then
  while IFS= read -r branch; do
    [ -n "$branch" ] || continue
    if ! git merge-base --is-ancestor "refs/heads/$branch" HEAD 2> /dev/null; then
      code_rev="refs/heads/$branch"
      break
    fi
  done < <(git for-each-ref --format='%(refname:short)' refs/heads | grep -F "$id" || true)
fi

# Files outside .kerjaan/ touched by this ticket's commits, one per line.
ticket_files() {
  [ "$has_head" -eq 1 ] || return 0
  git log --no-merges --format= --name-only -F --grep="$id" "$code_rev" -- . ':(exclude).kerjaan' \
    | sed '/^$/d' | sort -u
}

# Uncommitted changes outside .kerjaan/ in this tree, one per line.
uncommitted_files() {
  git status --porcelain -- . ':(exclude).kerjaan' | sed 's/^...//'
}

if [ "$cmd" = "changes" ]; then
  files="$(ticket_files)"
  if [ -z "$files" ]; then
    echo "NO CODE CHANGES: no commit naming $id changes anything outside .kerjaan/."
  else
    git log --no-merges --format=%H -F --grep="$id" "$code_rev" > "$tmpdir/commits"
    [ "$code_rev" = "HEAD" ] || echo "Read from ${code_rev#refs/heads/}, which is not merged into HEAD."
    while IFS= read -r file; do
      removed="$(git log --no-merges --format= --numstat -F --grep="$id" "$code_rev" -- "$file" \
        | awk '$2 ~ /^[0-9]+$/ { n += $2 } END { print n + 0 }')"
      removed_note=""
      [ "$removed" -gt 0 ] && removed_note="  ($removed lines removed along the way)"
      if ! git cat-file -e "$code_rev:$file" 2> /dev/null; then
        echo "$file: deleted"
        continue
      fi
      if git log --no-merges --format= --numstat -F --grep="$id" "$code_rev" -- "$file" | grep -q '^-'; then
        echo "$file: binary file changed"
        continue
      fi
      # Lines still in the file whose last writer is one of this ticket's
      # commits, folded into ranges.
      ranges="$(git blame --porcelain "$code_rev" -- "$file" | awk -v list="$tmpdir/commits" '
        BEGIN { while ((getline c < list) > 0) mine[c] = 1 }
        /^[0-9a-f]{40} [0-9]+ [0-9]+/ {
          if ($1 in mine) {
            n = $3 + 0
            if (start && n == prev + 1) { prev = n }
            else { if (start) { out = out sep range(start, prev); sep = ", " }; start = n; prev = n }
          }
        }
        function range(a, b) { return a == b ? a : a "-" b }
        END { if (start) out = out sep range(start, prev); print out }
      ')"
      if [ -n "$ranges" ]; then
        echo "$file: lines $ranges$removed_note"
      else
        echo "$file: no lines of its own left$removed_note"
      fi
    done <<< "$files"
  fi
  if [ "$code_rev" = "HEAD" ] && [ -n "$(uncommitted_files)" ]; then
    echo "Uncommitted, so not listed above — commit the work first:" >&2
    uncommitted_files | sed 's/^/  /' >&2
  fi
  exit 0
fi

# ---------------------------------------------------------------------------
# Reading the explanation out of a ticket
# ---------------------------------------------------------------------------
# Splits a ticket (on stdin) into two files: <prefix>.block, the lines inside
# the explanation block, and <prefix>.out, every body line outside the
# `## Explanation` section. Frontmatter is left out of both, so the script's
# own refresh of `updated` is never mistaken for an edit.
split_ticket() {
  : > "$1.block"
  : > "$1.out"
  awk -v blockf="$1.block" -v outf="$1.out" '
    BEGIN { fm = 0; body = 0; sect = 0; infence = 0; fenced = 0 }
    !body { if ($0 == "---" && ++fm == 2) body = 1; next }
    /^## / {
      sect = ($0 ~ /^## Explanation[ \t]*$/)
      if (!sect) { print > outf }
      next
    }
    sect {
      if (infence) {
        if (match($0, /^`+[ \t]*$/) && length($0) >= opener && $0 ~ "^" ticks) { infence = 0; next }
        print > blockf
        next
      }
      if (!fenced && match($0, /^```+/)) {
        opener = RLENGTH; ticks = substr($0, 1, RLENGTH); infence = 1; fenced = 1
      }
      next
    }
    { print > outf }
  '
}

# One word per line, whitespace and nothing else ignored.
words() {
  tr -s ' \t\r' '\n\n\n' < "$1" | sed '/^$/d'
}

# Compares two versions of the ticket (files $1, $2) and judges the change to
# the explanation block. Returns 0 when the owner's words survived it, 1 with a
# reason when they did not, and 3 when the block's words did not change.
judge() {
  local old="$1" new="$2" label="$3" p="$tmpdir/j"
  split_ticket "$p.old" < "$old"
  split_ticket "$p.new" < "$new"
  words "$p.old.block" > "$p.fold"
  words "$p.new.block" > "$p.fnew"
  cmp -s "$p.fold" "$p.fnew" && return 3

  diff "$p.old.out" "$p.new.out" > "$p.diff" || true
  sed -n 's/^<//p' "$p.diff" > "$p.removed"
  sed -n 's/^>//p' "$p.diff" > "$p.added"
  words "$p.removed" > "$p.r"
  words "$p.added" > "$p.a"
  cat "$p.fold" "$p.r" > "$p.expect"

  if [ ! -s "$p.r" ]; then
    # Nothing left the rest of the ticket: the text was written straight into
    # an empty block. That is the owner writing, not the AI moving.
    [ ! -s "$p.fold" ] && return 0
    echo "FAILED at $label: the words inside the explanation block changed in place."
    echo "  The owner revises below the last line of the ticket; the AI only moves"
    echo "  that text into the block. These words differ (- before, + after):"
    diff "$p.fold" "$p.fnew" | sed -n 's/^< /  - /p; s/^> /  + /p' | head -20
    return 1
  fi
  if [ -s "$p.a" ]; then
    echo "FAILED at $label: the change that moved the explanation also wrote"
    echo "  elsewhere in the ticket. Moving the owner's words is a commit of its own,"
    echo "  so its diff shows nothing but the move. Written elsewhere:"
    sed -e '/^[[:space:]]*$/d' -e 's/^ */  + /' "$p.added" | head -20
    return 1
  fi
  if cmp -s "$p.fnew" "$p.r" || cmp -s "$p.fnew" "$p.expect"; then
    return 0
  fi
  echo "FAILED at $label: the explanation block does not hold exactly the words"
  echo "  removed from the rest of the ticket — a word was changed, added, dropped"
  echo "  or reordered. (- removed from below, + now in the block):"
  diff "$p.r" "$p.fnew" | sed -n 's/^< /  - /p; s/^> /  + /p' | head -20
  return 1
}

# Walks every change to the block in history, then the working tree against
# HEAD, and judges the last one that changed its words: that one put the
# current text there. An earlier bad move that a later one replaced no longer
# describes anything in the ticket.
check_all() {
  local ok=0 rc c path label prev="$tmpdir/prev" cur="$tmpdir/cur" verdict="$tmpdir/verdict"
  : > "$verdict"
  if [ "$has_head" -eq 1 ]; then
    while IFS= read -r c; do
      [ -n "$c" ] || continue
      : > "$prev"; : > "$cur"
      path="$(git ls-tree -r --name-only "$c" -- .kerjaan | grep -F "/$id " | head -1 || true)"
      [ -n "$path" ] && git show "$c:$path" > "$cur"
      if git rev-parse --verify -q "$c^" > /dev/null; then
        path="$(git ls-tree -r --name-only "$c^" -- .kerjaan | grep -F "/$id " | head -1 || true)"
        [ -n "$path" ] && git show "$c^:$path" > "$prev"
      fi
      label="commit $(git rev-parse --short "$c")"
      rc=0; judge "$prev" "$cur" "$label" > "$verdict.next" || rc=$?
      [ "$rc" -eq 3 ] || { ok="$rc"; mv "$verdict.next" "$verdict"; }
    done < <(git log --no-merges --reverse --format=%H HEAD -- ":(glob).kerjaan/*/$id *.md")

    : > "$prev"
    path="$(git ls-tree -r --name-only HEAD -- .kerjaan | grep -F "/$id " | head -1 || true)"
    [ -n "$path" ] && git show "HEAD:$path" > "$prev"
  else
    : > "$prev"
  fi
  rc=0; judge "$prev" "$ticket" "the uncommitted edit" > "$verdict.next" || rc=$?
  [ "$rc" -eq 3 ] || { ok="$rc"; mv "$verdict.next" "$verdict"; }
  cat "$verdict"
  return "$ok"
}

explanation_written() {
  split_ticket "$tmpdir/now" < "$ticket"
  [ -n "$(words "$tmpdir/now.block")" ]
}

if [ "$cmd" = "check" ]; then
  if ! explanation_written; then
    echo "No explanation is written in $id yet; nothing to check."
    exit 0
  fi
  if check_all; then
    echo "OK: the explanation in $id holds exactly the words the owner wrote."
    exit 0
  fi
  exit 1
fi

# ---------------------------------------------------------------------------
# gate: may this ticket move to review?
# ---------------------------------------------------------------------------
mode=""
if [ -f "$board/settings.md" ]; then
  mode="$(awk '
    $0 == "---" { fence++; next }
    fence == 1 && /^owner_explanation:/ { sub(/^owner_explanation:[[:space:]]*/, ""); print; exit }
  ' "$board/settings.md" | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")"
fi

case "$mode" in
  ""|off) exit 0 ;;
  allow-to-skip|strict) ;;
  *)
    echo "REFUSED: owner_explanation in .kerjaan/settings.md is '$mode'," >&2
    echo "which is none of: off, allow-to-skip, strict. Fix the setting first." >&2
    exit 1
    ;;
esac

if [ -z "$(ticket_files)" ]; then
  if [ "$code_rev" = "HEAD" ] && [ -n "$(uncommitted_files)" ]; then
    echo "REFUSED: $id was not moved to review." >&2
    echo "owner_explanation is $mode, and the work is not committed yet, so there" >&2
    echo "is nothing to explain against. Commit it with $id in the message, show" >&2
    echo "the owner \`explain.sh changes $id\`, and ask for the explanation." >&2
    exit 1
  fi
  # A decision or planning ticket: no code, so nothing to explain.
  exit 0
fi

if explanation_written; then
  if ! check_all >&2; then
    echo "REFUSED: $id was not moved to review, because the explanation no longer" >&2
    echo "holds exactly the owner's words (above)." >&2
    exit 1
  fi
  exit 0
fi

if [ "$mode" = "allow-to-skip" ] && grep -q 'Explanation skipped by ' "$ticket"; then
  exit 0
fi

echo "REFUSED: $id was not moved to review." >&2
echo "owner_explanation is $mode, and the owner has not explained this work yet." >&2
echo "Show them \`explain.sh changes $id\` and ask them to write, in their own" >&2
echo "words, below the last line of the ticket." >&2
if [ "$mode" = "allow-to-skip" ]; then
  echo "If they choose to skip, append to Notes: Explanation skipped by <owner>, <date>." >&2
fi
exit 1
