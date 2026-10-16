#!/usr/bin/env bash
#
# Records a change to a ticket. Always refreshes `updated`, and optionally moves
# the ticket to another status or renames its title in the same action.
#
# Why this script exists: moving a file or renaming it without refreshing
# `updated` raises no error at all. The failure is silent, and only surfaces
# months later when somebody asks when this ticket was last touched. Binding
# both into one command makes half an action impossible.
#
# Usage:
#   update-ticket.sh <id|path>                       after editing the prose
#   update-ticket.sh <id|path> --status <status>     move status
#   update-ticket.sh <id|path> --title "<new title>" rename
#   update-ticket.sh <id|path> --status in_progress --ack-unmerged
#                                                    start despite unmerged branches
#   update-ticket.sh <id|path> --accept-size         the owner keeps a ticket whole
#                                                    although it is over the size limit
#
# A move to todo is refused while the ticket holds an open question for the
# owner (queue.sh ask). A move to review is accepted only from in_progress, and only once the
# owner's explanation is in place when settings.md asks for one (explain.sh).
#
# Every run ends with ticket-size.sh, which warns -- never refuses -- when the
# ticket's "Done when" list is longer than the board allows.

set -euo pipefail

STATUSES=(backlog todo in_progress review done cancel)

usage() {
  cat >&2 <<USAGE
Usage: update-ticket.sh <id|path> [--status <status>] [--title "<new title>"] [--ack-unmerged] [--accept-size]

  <id|path>        12-digit ID, or the path to a ticket file
  --status         move to one of: ${STATUSES[*]}
  --title          rename (the file is renamed; the ID stays)
  --ack-unmerged   start the ticket although other branches hold unmerged
                   work; the branches are recorded in the ticket's Notes
  --accept-size    the owner decided this ticket stays whole although its
                   "Done when" list is over the board's limit; recorded in
                   the ticket's Notes, and the size warning stops for it

With no options, only \`updated\` is refreshed — use that after editing prose.
Run from the repo root. Prints the ticket's current path to stdout.
USAGE
  exit 1
}

[ "$#" -ge 1 ] || usage

target="$1"
shift

new_status=""
new_title=""
title_given=0
ack_unmerged=0
accept_size=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --status)
      [ "$#" -ge 2 ] || { echo "--status needs a value." >&2; usage; }
      new_status="$2"
      shift 2
      ;;
    --title)
      [ "$#" -ge 2 ] || { echo "--title needs a value." >&2; usage; }
      new_title="$2"
      title_given=1
      shift 2
      ;;
    --ack-unmerged)
      ack_unmerged=1
      shift
      ;;
    --accept-size)
      accept_size=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

# --- refuse to run from a linked git worktree ------------------------------
# The board lives inside the repository, so every worktree checks out its own
# copy of `.kerjaan/`. Treating that copy as a board forks the one guarantee
# the format makes: a ticket has exactly one status, held by exactly one
# folder. Nothing about that failure is loud — two boards simply start
# disagreeing, and both look perfectly normal.
#
# A linked worktree is recognised by the marker git puts in its git dir: a
# `gitdir` file, which the main repository's `.git` never has. Comparing the
# output of `--git-dir` against `--git-common-dir` looks like the obvious test
# and is wrong — from a subdirectory git answers one of them absolutely and the
# other relatively, so an ordinary repo would be accused of being a worktree.

if git rev-parse --git-dir > /dev/null 2>&1 \
  && [ -f "$(git rev-parse --git-dir)/gitdir" ]; then
  main_tree="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
  echo "This is a linked git worktree, and the board does not live here." >&2
  echo "Acting on the copy of .kerjaan/ in a worktree forks the board: one" >&2
  echo "ticket ends up with two different statuses, and nothing reports it." >&2
  echo "Run this from the main worktree instead:" >&2
  echo "  $main_tree" >&2
  exit 1
fi

board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 1; }

# --- locate the ticket file ------------------------------------------------
if [ -f "$target" ]; then
  file="$target"
else
  case "$target" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;;
    *)
      echo "'$target' is neither a 12-digit ID nor an existing file path." >&2
      exit 1
      ;;
  esac

  matches=()
  for f in "$board"/*/"$target "*.md; do
    [ -e "$f" ] || continue
    matches+=("$f")
  done

  case "${#matches[@]}" in
    0)
      echo "No ticket with ID $target." >&2
      exit 1
      ;;
    1)
      file="${matches[0]}"
      ;;
    *)
      echo "ID $target is used by more than one ticket:" >&2
      printf '  %s\n' "${matches[@]}" >&2
      echo "Resolve it first, following references/repairs.md in the kerjaan skill." >&2
      exit 1
      ;;
  esac
fi

# A path given as an argument may be relative; normalise it to an absolute path
# first so the comparison against the destination cannot wrongly report a clash.
file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"

case "$file" in
  "$board"/*) ;;
  *)
    echo "File is outside $board: $file" >&2
    exit 1
    ;;
esac

id="$(basename "$file")"
id="${id:0:12}"
current_status="$(basename "$(dirname "$file")")"

valid=0
for s in "${STATUSES[@]}"; do
  [ "$s" = "$current_status" ] && valid=1
done
if [ "$valid" -ne 1 ]; then
  echo "File does not sit directly inside one of the status folders: $file" >&2
  exit 1
fi

# --- work out the destination ----------------------------------------------
dest_status="$current_status"
if [ -n "$new_status" ]; then
  valid=0
  for s in "${STATUSES[@]}"; do
    [ "$s" = "$new_status" ] && valid=1
  done
  if [ "$valid" -ne 1 ]; then
    echo "Invalid status: '$new_status'" >&2
    usage
  fi
  dest_status="$new_status"
fi

stem="$(basename "$file" .md)"
dest_title="${stem:13}"
if [ "$title_given" -eq 1 ]; then
  dest_title="$(printf '%s' "$new_title" | tr '\n/' '  ' | sed -e 's/  */ /g' -e 's/^ //' -e 's/ $//')"
  if [ -z "$dest_title" ]; then
    echo "Title is empty after tidying." >&2
    exit 1
  fi
fi

mkdir -p "$board/$dest_status"
dest="$board/$dest_status/$id $dest_title.md"

if [ "$dest" != "$file" ] && [ -e "$dest" ]; then
  echo "Destination already occupied: $dest" >&2
  exit 1
fi

# --- unmerged work elsewhere blocks starting a ticket ----------------------
# A ticket can reach `done` while its branch was never merged: the reviewer
# that moves it there is forbidden to touch the repo, and a warning printed at
# that moment lands in a subagent's report where nobody acts on it. The one
# point in the cycle where somebody is deciding what happens next is the start
# of the next ticket, so that is where the question is put — and refused
# rather than warned, because a warning is exactly what already failed.
#
# The question is not "does this ticket's branch lag behind" but "does any work
# sit outside the main line", so branch names are not trusted to carry an ID.
# Excluded, because they are not left-over work:
#   - branches already contained in HEAD
#   - branches carrying this ticket's ID (a ticket returned from review)
#   - branches carrying the ID of a ticket in in_progress/ or review/, which
#     are in flight by definition
#   - branches listed in long_lived_branches in .kerjaan/settings.md
#   - branches of tickets whose merge is held for the owner (merge.sh land
#     wrote "merge held for the owner" last): the owner has already been told,
#     and only that ticket waits — every ticket that does not depend on it
#     carries on. One that does depend on it, through blocked_by, is refused.
# A repo without git, or a move that is not a start, is left entirely alone. A
# ticket coming back from review or done — sent back by its reviewer, or by
# merge.sh land because main moved — is not new work, so it is not a start.

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

# --- the way into todo -------------------------------------------------------
# `todo` means ready to be worked without asking anything more. A question the
# owner has not answered yet, recorded with `queue.sh ask`, says the opposite,
# and a ticket carrying one into the queue reaches a worker who finds out only
# after the owner has gone. Refused, not warned: the queue is worked from when
# nobody is watching.

if [ "$dest_status" = "todo" ] && [ "$current_status" != "todo" ]; then
  open_questions="$(kerjaan_open_questions "$file")"
  if [ -n "$open_questions" ]; then
    echo "REFUSED: $id was not moved to todo." >&2
    echo "It still holds questions waiting for the owner:" >&2
    printf '%s\n' "$open_questions" | awk '{ print "  " NR ". " $0 }' >&2
    echo "Put them to the owner, record each answer with" >&2
    echo "  $here/queue.sh answer $id <n> \"<answer>\"" >&2
    echo "and move it again." >&2
    exit 1
  fi
fi

unmerged=()
if [ "$dest_status" = "in_progress" ] && [ "$current_status" != "in_progress" ] \
  && [ "$current_status" != "review" ] && [ "$current_status" != "done" ] \
  && git rev-parse --git-dir > /dev/null 2>&1 \
  && git rev-parse --verify -q HEAD > /dev/null 2>&1; then

  held_blockers=()
  while IFS= read -r bid; do
    [ -n "$bid" ] || continue
    bfile="$(kerjaan_ticket_file "$board" "$bid" 2> /dev/null || true)"
    [ "$(kerjaan_merge_state "$bfile")" = "held" ] && held_blockers+=("$bid")
  done < <(awk '$0 == "---" { if (++fence == 2) exit; next }
                fence == 1 && /^blocked_by:/ { print }' "$file" | grep -oE '[0-9]{12}' || true)
  if [ "${#held_blockers[@]}" -gt 0 ]; then
    echo "REFUSED: $id was not moved to in_progress." >&2
    echo "It is blocked_by ${held_blockers[*]}, whose merge into main is held for the" >&2
    echo "owner, so the work it depends on is not on main yet. It waits until the" >&2
    echo "owner has settled that merge (see the Notes of ${held_blockers[*]})." >&2
    exit 1
  fi

  in_flight_ids=("$id")
  for st in in_progress review; do
    for f in "$board/$st"/*.md; do
      [ -e "$f" ] || continue
      b="$(basename "$f")"
      in_flight_ids+=("${b:0:12}")
    done
  done

  long_lived=()
  if [ -f "$board/settings.md" ]; then
    while IFS= read -r pat; do
      [ -n "$pat" ] && long_lived+=("$pat")
    done < <(sed -n 's/^long_lived_branches:[[:space:]]*\[\(.*\)\][[:space:]]*$/\1/p' "$board/settings.md" \
               | tr ',' '\n' | sed -e 's/^[[:space:]"'"'"']*//' -e 's/[[:space:]"'"'"']*$//')
  fi

  while IFS= read -r branch; do
    [ -n "$branch" ] || continue
    git merge-base --is-ancestor "refs/heads/$branch" HEAD 2> /dev/null && continue
    skip=0
    for fid in "${in_flight_ids[@]}"; do
      case "$branch" in *"$fid"*) skip=1; break ;; esac
    done
    if [ "$skip" -eq 0 ] && [ "${#long_lived[@]}" -gt 0 ]; then
      for pat in "${long_lived[@]}"; do
        # Unquoted on purpose: the setting holds glob patterns like release/*.
        # shellcheck disable=SC2254
        case "$branch" in $pat) skip=1; break ;; esac
      done
    fi
    [ "$skip" -eq 1 ] && continue
    bid="$(printf '%s' "$branch" | grep -oE '[0-9]{12}' | head -1 || true)"
    if [ -n "$bid" ]; then
      bfile="$(kerjaan_ticket_file "$board" "$bid" 2> /dev/null || true)"
      if [ "$(kerjaan_merge_state "$bfile")" = "held" ]; then
        echo "Note: $branch is not in HEAD, but its merge is held for the owner (ticket $bid); not waiting for it." >&2
        continue
      fi
    fi
    unmerged+=("$branch")
  done < <(git for-each-ref --format='%(refname:short)' refs/heads)

  if [ "${#unmerged[@]}" -gt 0 ] && [ "$ack_unmerged" -ne 1 ]; then
    echo "REFUSED: $id was not moved to in_progress." >&2
    echo "These branches hold commits that are not in HEAD:" >&2
    for branch in "${unmerged[@]}"; do
      line="    $branch — $(git log -1 --format='%s (%cr)' "refs/heads/$branch")"
      bid="$(printf '%s' "$branch" | grep -oE '[0-9]{12}' | head -1 || true)"
      if [ -n "$bid" ]; then
        for f in "$board"/*/"$bid "*.md; do
          [ -e "$f" ] || continue
          line="$line — ticket $bid is in $(basename "$(dirname "$f")")/"
        done
      fi
      echo "$line" >&2
    done
    echo "Before new work starts, the owner decides for each one: merge it, or" >&2
    echo "delete it. A branch meant to live long -- develop, release/*, or main" >&2
    echo "while HEAD is on another branch -- belongs in long_lived_branches in" >&2
    echo ".kerjaan/settings.md. To start anyway, knowingly, rerun with" >&2
    echo "--ack-unmerged; the branches are then recorded in this ticket." >&2
    exit 1
  fi
fi

# --- the way into review ---------------------------------------------------
# Review judges work, and work happens in in_progress. A ticket arriving from
# anywhere else skipped the step that tells the board something is in flight,
# which is easy to do on a ticket whose work is a conversation rather than
# code: the answers get written down, and the ticket still says todo. Refused,
# not warned, for the same reason as the unmerged-branch gate above.
#
# Then the owner's explanation, when the board asks for one: explain.sh reads
# owner_explanation from settings.md and decides.

if [ "$dest_status" = "review" ] && [ "$current_status" != "review" ]; then
  if [ "$current_status" != "in_progress" ]; then
    echo "REFUSED: $id was not moved to review." >&2
    echo "It is in $current_status/, and only a ticket in in_progress/ goes to review." >&2
    echo "Work on a ticket happens in in_progress, including a ticket whose work is" >&2
    echo "settling decisions with the owner. Move it to in_progress first, and say" >&2
    echo "in its Notes that the move came late if work was already done." >&2
    exit 1
  fi
  if git rev-parse --git-dir > /dev/null 2>&1; then
    "$here/explain.sh" gate "$id" || exit 1
    # Work done on a branch of its own goes to review only once it holds all
    # of main's code and the latest test run passed on exactly that content,
    # so the reviewer judges what main will get (merge.sh). The commit it
    # covers is recorded; merge.sh land merges that commit and nothing else.
    if ! review_record="$("$here/merge.sh" check "$id" --gate)"; then
      echo "REFUSED: $id was not moved to review; see above." >&2
      exit 1
    fi
  fi
fi

# --- refresh `updated` -----------------------------------------------------
# Only lines inside the first frontmatter block are touched, so an "updated:"
# that happens to appear in the prose is left alone.
now="$(date '+%Y-%m-%d %H:%M:%S')"
tmp="$(mktemp)"
trap 'rm -f "$tmp" "$tmp.history"' EXIT

if ! awk -v now="$now" '
  BEGIN { fence = 0; done = 0 }
  {
    if ($0 == "---") { fence++ }
    if (fence == 1 && done == 0 && $0 ~ /^updated:/) {
      print "updated: " now
      done = 1
      next
    }
    print
  }
  END { if (done == 0) exit 3 }
' "$file" > "$tmp"; then
  echo "No 'updated:' line found in the frontmatter of $file" >&2
  echo "This file does not follow the ticket format. Check its contents." >&2
  exit 1
fi

# --- record the move in ## History -----------------------------------------
# The folder says where a ticket is, never when it got there, and git cannot
# answer either: a move is committed whenever somebody next commits, often in
# the same commit as the code, so the time git shows for "started" is really
# the time the work was saved. The ticket records it itself, with the same
# timestamp as `updated`, and only on a real move — a rename or a refresh is
# not one, and a refused move has already exited above.
#
# History sits just before Notes, so Notes stays the last section and every
# writer that appends to the end of the file keeps landing in Notes. A ticket
# from before History existed gets the section on its next move, holding that
# move alone: what came before is unknown and is not made up.
#
# Headings inside fenced blocks are prose, not sections, so they are skipped.
# The file itself is written once, below, so a ticket this cannot place a
# line in is refused with nothing changed — not even `updated`.

if [ "$dest_status" != "$current_status" ]; then
  if ! awk -v line="- $now $dest_status" '
    BEGIN { fm = 0; body = 0; infence = 0; inhist = 0; hist = 0; lasthist = 0; notes = 0 }
    { lines[NR] = $0 }
    !body { if ($0 == "---" && ++fm == 2) body = 1; next }
    /^```/ { infence = !infence }
    infence { if (inhist) lasthist = NR; next }
    /^## / {
      inhist = 0
      if (!hist && $0 ~ /^## History[ \t]*$/) { hist = NR; lasthist = NR; inhist = 1 }
      else if ($0 ~ /^## Notes[ \t]*$/) { notes = NR }
      next
    }
    inhist && NF { lasthist = NR }
    END {
      if (hist) { at = lasthist; text = line }
      else if (notes) { at = notes - 1; text = "## History\n" line "\n" }
      else { exit 3 }
      for (i = 1; i <= NR; i++) {
        print lines[i]
        if (i == at) print text
      }
    }
  ' "$tmp" > "$tmp.history"; then
    echo "REFUSED: $id was not changed." >&2
    echo "Its file has neither a '## History' nor a '## Notes' heading, so the" >&2
    echo "move has nowhere to be recorded: $file" >&2
    echo "This file does not follow the ticket format. Check its contents." >&2
    exit 1
  fi
  cat "$tmp.history" > "$tmp"
fi

cat "$tmp" > "$file"

# An acknowledged start, and an owner's decision to keep a big ticket whole,
# are written into the ticket, so the decision outlives the terminal it was
# made in. Notes is always the last section.
append_note() {
  if [ "$(awk 'NF { last = $0 } END { print last }' "$file")" = "(none yet)" ]; then
    awk -v note="$1" '{ lines[NR] = $0; if (NF) lastnf = NR }
      END { for (i = 1; i <= NR; i++) print (i == lastnf ? note : lines[i]) }' "$file" > "$tmp"
    cat "$tmp" > "$file"
  else
    printf '%s\n' "$1" >> "$file"
  fi
}

if [ -n "${review_record:-}" ]; then
  append_note "$review_record"
fi

if [ "${#unmerged[@]}" -gt 0 ]; then
  append_note "- $now: started while these branches held unmerged work, acknowledged with --ack-unmerged: ${unmerged[*]}"
fi

# The wording is fixed and English, like the line above: ticket-size.sh looks
# for "size accepted by the owner" to stop warning about this ticket.
if [ "$accept_size" -eq 1 ]; then
  append_note "- $now: size accepted by the owner with --accept-size: this ticket stays whole although its \"Done when\" list is over the board's limit."
fi

# --- move or rename if needed ----------------------------------------------
if [ "$dest" != "$file" ]; then
  mv "$file" "$dest"
fi

# --- keep the ordering file in step ----------------------------------------
# `.kerjaan/order.md` lists the tickets sitting in `todo/` in the order they
# should be picked up. Two ways of breaking it raise no error at all: leaving a
# ticket listed there after it has moved on, and renaming a ticket so the file
# spells its title the old way. Both are exactly the silent half-action this
# script exists to make impossible, so they are bound into the same command.
#
# A board that has never written an order file is left completely alone.

order="$board/order.md"

if [ -f "$order" ] && [ "$current_status" = "todo" ] && [ "$dest_status" != "todo" ]; then
  if grep -q "^- $id " "$order"; then
    otmp="$(mktemp)"
    # Drops the ticket's bullet, then drops any group left with no bullets at
    # all — a lead-in sentence introducing nothing is worse than no group.
    # A block runs from its bold opening line to the next one, so a lead-in
    # wrapped over two lines stays whole. Treating every non-bullet line as a
    # new block would cut such a sentence in half and throw away the first
    # line, which is the one carrying the reasoning.
    #
    # Only a block that actually held a bullet is a group. Prose that merely
    # starts in bold — a note at the head of the file, a paragraph between two
    # groups — never had one, so emptiness says nothing about it and it is
    # printed untouched. Without that distinction every such paragraph
    # disappears the first time any ticket leaves `todo`, silently, which is
    # the one failure this file cannot afford: what it carries is the
    # reasoning, and nothing else records it.
    awk -v id="$id" '
      function flush(   i) {
        if (started && (kept || !had_bullet)) { for (i = 0; i < n; i++) print buf[i] }
        n = 0; kept = 0; had_bullet = 0
      }
      BEGIN { n = 0; kept = 0; had_bullet = 0; started = 0 }
      {
        if ($0 ~ /^\*\*/) { flush(); started = 1 }
        if ($0 ~ /^- /) {
          had_bullet = 1
          if (index($0, "- " id " ") == 1) { next }
          kept = 1
        }
        if (started) { buf[n++] = $0 } else { print }
      }
      END { flush() }
    ' "$order" > "$otmp"
    cat "$otmp" > "$order"
    rm -f "$otmp"
  else
    echo "Note: $id was not listed in $order — check whether that file is still true." >&2
  fi
elif [ -f "$order" ] && [ "$current_status" = "todo" ] && [ "$title_given" -eq 1 ]; then
  otmp="$(mktemp)"
  awk -v id="$id" -v t="$dest_title" '
    { if (index($0, "- " id " ") == 1) { print "- " id " " t } else { print } }
  ' "$order" > "$otmp"
  cat "$otmp" > "$order"
  rm -f "$otmp"
fi

if [ -f "$order" ] && [ "$dest_status" = "todo" ] && [ "$current_status" != "todo" ]; then
  echo "Note: $id now sits in todo/ and needs a place in $order." >&2
fi

# --- work left behind in a branch ------------------------------------------
# A ticket reaching `done` or `cancel` while its branch still holds commits
# nobody merged is the expensive silent failure of working in parallel: the
# board says finished, the work sits in a branch no one will think to look for
# again, and nothing raises an error. Git already knows the answer, so nothing
# is recorded anywhere — the branch is derived from the ticket's own ID.

case "$dest_status" in
  done|cancel)
    # Only on a real move. Refreshing `updated` on a ticket that has sat in
    # done/ for weeks must not announce that it "has just been moved".
    if [ "$dest_status" != "$current_status" ] && git rev-parse --git-dir > /dev/null 2>&1; then
      # The link between a branch and a ticket is the ID inside the branch
      # name, whatever prefix a project puts in front of it — `kerjaan/<id>`,
      # `tiket-<id>`, anything. Matching on the ID rather than on a prefix is
      # what lets a project keep the naming it already uses, and an ID is
      # distinctive enough that it cannot match something unrelated.
      branches="$(git for-each-ref --format='%(refname:short)' refs/heads | grep -F "$id" || true)"
      while IFS= read -r branch; do
        [ -n "$branch" ] || continue
        if git merge-base --is-ancestor "refs/heads/$branch" HEAD 2> /dev/null; then
          if git worktree list --porcelain 2> /dev/null | grep -qx "branch refs/heads/$branch"; then
            echo "Note: $branch is merged, but its worktree is still checked out." >&2
            echo "  $(dirname "$0")/worktree.sh remove $id && git branch -d $branch" >&2
          fi
        else
          echo "WARNING: $branch holds commits that are not in HEAD, and the ticket" >&2
          echo "  has just been moved to '$dest_status'. That work is unmerged:" >&2
          echo "  git log --oneline HEAD..$branch" >&2
        fi
      done <<< "$branches"
    fi
    ;;
esac

# --- an idle board with worktrees left over ---------------------------------
# Nothing in todo, in_progress or review means nothing is in flight, so any
# worktree still checked out at that moment holds work the board has lost track
# of. That is the one instant where this can be said with certainty, and it is
# produced by a move — so the check rides on the move instead of waiting for
# somebody to remember to run it.

if [ "$dest_status" != "$current_status" ] && git rev-parse --git-dir > /dev/null 2>&1; then
  in_flight=0
  for st in todo in_progress review; do
    for f in "$board/$st"/*.md; do
      [ -e "$f" ] || continue
      in_flight=1
      break 2
    done
  done

  if [ "$in_flight" -eq 0 ]; then
    worktrees="$(git worktree list --porcelain | grep -c '^worktree ' || true)"
    if [ "${worktrees:-0}" -gt 1 ]; then
      echo "Note: the board is now idle — nothing in todo, in_progress or review —" >&2
      echo "  yet these worktrees are still checked out:" >&2
      git worktree list | tail -n +2 | sed 's/^/    /' >&2
    fi
  fi
fi

# --- a ticket grown too big -------------------------------------------------
# Last, so the warning is about the ticket exactly as it now stands, and so it
# is the final thing on the screen rather than lost above other notes.
"$(cd "$(dirname "$0")" && pwd)/ticket-size.sh" "$dest" || true

printf '%s\n' "$dest"
