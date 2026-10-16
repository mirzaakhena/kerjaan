#!/usr/bin/env bash
#
# Creates one empty ticket file inside .kerjaan/<status>/ and prints its path.
# It handles only what must be deterministic: choosing the ID and laying down
# the skeleton. Filling in the prose, moving between statuses, and editing are
# all done without a script.
#
# Usage: new-ticket.sh <status> "<title>"

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$script_dir/lib.sh"

usage() {
  cat >&2 <<USAGE
Usage: new-ticket.sh <status> "<title>"

  <status>  one of: ${KERJAAN_STATUSES[*]}
  <title>   ticket title, without the "/" character

Run from the repo root. Prints the path of the created file to stdout.
USAGE
  exit 1
}

[ "$#" -eq 2 ] || usage

status="$1"

if ! kerjaan_is_status "$status"; then
  echo "Invalid status: '$status'" >&2
  usage
fi

title="$(kerjaan_tidy_title "$2")"
if [ -z "$title" ]; then
  echo "Title is empty after tidying." >&2
  exit 1
fi

kerjaan_refuse_linked_worktree 1

# --- make sure the board exists --------------------------------------------
board="$PWD/.kerjaan"
for s in "${KERJAAN_STATUSES[@]}"; do
  mkdir -p "$board/$s"
  [ -e "$board/$s/.gitkeep" ] || : > "$board/$s/.gitkeep"
done

# --- lock the board while choosing the ID ----------------------------------
# Without a lock, two concurrent creations both read the same highest sequence
# number and produce the same ID. It is the board lock every other write takes
# (lib.sh), held until the file exists, so a ticket moved or renumbered at the
# same moment cannot take the number either.
trap 'kerjaan_lock_release board' EXIT
kerjaan_board_lock "$board" "new-ticket.sh choosing an ID" 1

# --- choose the ID ---------------------------------------------------------
prefix="$(date +%y%m%d%H%M)"
if ! id="$(kerjaan_next_id "$board" "$prefix")"; then
  echo "Minute $prefix already holds 99 tickets. Wait a minute and retry." >&2
  exit 1
fi
created="$(date '+%Y-%m-%d %H:%M:%S')"

# --- write the file from the template --------------------------------------
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
if ! existing="$(kerjaan_ticket_file "$board" "$id")" || [ -n "$existing" ]; then
  echo "ID $id is already taken by: ${existing:-more than one ticket}" >&2
  exit 1
fi

# {{STATUS}} appears only in the first ## History line, which inside a Claude
# Code session also names the session: `- <time> <session-id> <status>`
# (lib.sh, kerjaan_history_line). The session id holds only letters, digits
# and dashes, so it is safe inside the sed expression.
hist="$(kerjaan_history_line "$created" "$status")"
hist_status="${hist#- "$created" }"
sed -e "s/{{CREATED}}/$created/g" -e "s/{{STATUS}}/$hist_status/g" "$template" > "$dest"

# A board without settings still works, but its language, its test command and
# its long-lived branches are then guesses. Say so every time rather than once,
# since nothing else will.
if [ ! -f "$board/settings.md" ]; then
  echo "Note: $board/settings.md does not exist yet. Ask the owner for the" >&2
  echo "  board's language, test command and long-lived branches, then write it" >&2
  echo "  from $(cd "$script_dir/.." && pwd)/SETTINGS.md." >&2
fi

# A skeleton never exceeds the limit, but a TEMPLATE.md a project has filled
# in with its own standing criteria could; the check is cheap, so it runs.
"$script_dir/ticket-size.sh" "$dest" || true

printf '%s\n' "$dest"
