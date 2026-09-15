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

set -euo pipefail

STATUSES=(backlog todo in_progress review done cancel)

usage() {
  cat >&2 <<USAGE
Usage: update-ticket.sh <id|path> [--status <status>] [--title "<new title>"]

  <id|path>   12-digit ID, or the path to a ticket file
  --status    move to one of: ${STATUSES[*]}
  --title     rename (the file is renamed; the ID stays)

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
      echo "Resolve it first, following 'When two tickets share an ID' in SKILL.md." >&2
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

# --- refresh `updated` -----------------------------------------------------
# Only lines inside the first frontmatter block are touched, so an "updated:"
# that happens to appear in the prose is left alone.
now="$(date '+%Y-%m-%d %H:%M:%S')"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

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

cat "$tmp" > "$file"

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
    # A group starts at its bold lead-in and runs to the next one, so a lead-in
    # wrapped over two lines stays whole. Treating every non-bullet line as a
    # new group would cut such a sentence in half and throw away the first
    # line, which is the one carrying the reasoning.
    awk -v id="$id" '
      function flush(   i) {
        if (started && kept) { for (i = 0; i < n; i++) print buf[i] }
        n = 0; kept = 0
      }
      BEGIN { n = 0; kept = 0; started = 0 }
      {
        if ($0 ~ /^\*\*/) { flush(); started = 1 }
        if ($0 ~ /^- /) {
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
            echo "  git worktree remove <path> && git branch -d $branch" >&2
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

printf '%s\n' "$dest"
