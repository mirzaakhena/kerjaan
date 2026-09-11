#!/usr/bin/env bash
#
# Creates one empty ticket file inside .kerjaan/<status>/ and prints its path.
# It handles only what must be deterministic: choosing the ID and laying down
# the skeleton. Filling in the prose, moving between statuses, and editing are
# all done without a script.
#
# Usage: new-ticket.sh <status> "<title>"

set -euo pipefail

STATUSES=(backlog todo in_progress review done cancel)

usage() {
  cat >&2 <<USAGE
Usage: new-ticket.sh <status> "<title>"

  <status>  one of: ${STATUSES[*]}
  <title>   ticket title, without the "/" character

Run from the repo root. Prints the path of the created file to stdout.
USAGE
  exit 1
}

[ "$#" -eq 2 ] || usage

status="$1"
title="$2"

# --- validate status -------------------------------------------------------
valid=0
for s in "${STATUSES[@]}"; do
  [ "$s" = "$status" ] && valid=1
done
if [ "$valid" -ne 1 ]; then
  echo "Invalid status: '$status'" >&2
  usage
fi

# --- tidy the title --------------------------------------------------------
# "/" and newlines break file names, so they become spaces. Runs of spaces are
# collapsed so file names never contain gaps that make searching awkward.
title="$(printf '%s' "$title" | tr '\n/' '  ' | sed -e 's/  */ /g' -e 's/^ //' -e 's/ $//')"
if [ -z "$title" ]; then
  echo "Title is empty after tidying." >&2
  exit 1
fi

# --- make sure the board exists --------------------------------------------
board="$PWD/.kerjaan"
for s in "${STATUSES[@]}"; do
  mkdir -p "$board/$s"
  [ -e "$board/$s/.gitkeep" ] || : > "$board/$s/.gitkeep"
done

# --- lock the board while choosing the ID ----------------------------------
# Without a lock, two concurrent creations both read the same highest sequence
# number and produce the same ID. mkdir is atomic, so exactly one process wins.
lock="$board/.lock"
acquired=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if mkdir "$lock" 2>/dev/null; then
    acquired=1
    break
  fi
  # A lock left behind for over a minute belongs to a process that died
  # mid-flight, not one that is still working. Take it over.
  if [ -n "$(find "$lock" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
    rmdir "$lock" 2>/dev/null || true
  fi
  sleep 0.2
done

if [ "$acquired" -ne 1 ]; then
  echo "Could not lock $board. If no other process is running," >&2
  echo "remove '$lock' and try again." >&2
  exit 1
fi
trap 'rmdir "$lock" 2>/dev/null || true' EXIT

# --- choose the ID ---------------------------------------------------------
# The sequence number is searched across ALL six folders, not just the target
# one, so an ID is never reused even after a ticket has moved status.
prefix="$(date +%y%m%d%H%M)"
max=0
for s in "${STATUSES[@]}"; do
  for f in "$board/$s/$prefix"*.md; do
    [ -e "$f" ] || continue
    seq="$(basename "$f")"
    seq="${seq:10:2}"
    case "$seq" in
      [0-9][0-9])
        if [ "$((10#$seq))" -gt "$max" ]; then max="$((10#$seq))"; fi
        ;;
    esac
  done
done

next="$((max + 1))"
if [ "$next" -gt 99 ]; then
  echo "Minute $prefix already holds 99 tickets. Wait a minute and retry." >&2
  exit 1
fi

id="$(printf '%s%02d' "$prefix" "$next")"
created="$(date '+%Y-%m-%d %H:%M:%S')"

# --- write the file from the template --------------------------------------
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
template="$script_dir/../TEMPLATE.md"
if [ ! -f "$template" ]; then
  echo "TEMPLATE.md not found at $template" >&2
  exit 1
fi

dest="$board/$status/$id $title.md"
if [ -e "$dest" ]; then
  echo "File already exists: $dest" >&2
  exit 1
fi

# Final check: no other file anywhere may carry this ID. The lock above already
# prevents it, but files can arrive from outside this script through copy-paste
# or a git merge.
for existing in "$board"/*/"$id "*.md; do
  [ -e "$existing" ] || continue
  echo "ID $id is already taken by: $existing" >&2
  exit 1
done

sed -e "s/{{CREATED}}/$created/g" "$template" > "$dest"

printf '%s\n' "$dest"
