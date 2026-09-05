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

printf '%s\n' "$dest"
