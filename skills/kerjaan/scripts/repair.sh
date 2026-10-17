#!/usr/bin/env bash
#
# Repairs what reached the board without going through the scripts. One repair
# so far: two tickets sharing an ID, which new-ticket.sh never makes but a
# copy-paste, a git merge of two branches or a manual rename can.
#
# Usage:
#   repair.sh duplicate-id             list every ID used by more than one ticket
#   repair.sh duplicate-id <id>        give each ticket sharing <id> but the oldest
#                                      a new ID of its own
#   repair.sh duplicate-id <path>      give that ticket a new ID, when the age of
#                                      the two cannot tell which keeps it
#
# What counts as oldest: the earliest `created`. The oldest keeps the ID, since
# it is the one more likely to be referred to already. When two share the
# earliest `created`, or one has none, nothing is changed and the command says
# so: then name the file to renumber.
#
# A renumbered ticket takes the next free sequence number in the minute of its
# old ID, or of the first minute after it with one left. Its `created` stays:
# it records when the ticket was born, not when its ID was tidied up. Its
# Notes record the change, and `updated` is refreshed. Its line in order.md,
# found by its title, follows it. Every other reference to the old ID -- in
# another ticket, a lands-first line, a branch name -- could mean either
# ticket, so each one is listed for a person to read and fix, never changed.
#
# Exit 0: nothing shared, or repaired. 1: duplicates listed, or nothing could
# be repaired. 2: misuse, or the wrong place. Run from the main tree.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  sed -n '/^# Usage:/,/^# What counts/p' "${BASH_SOURCE[0]}" | sed -e '$d' -e 's/^# \{0,1\}//' >&2
  exit 2
}

[ "$#" -ge 1 ] && [ "$1" = duplicate-id ] && [ "$#" -le 2 ] || usage
shift

kerjaan_refuse_linked_worktree 2
if git rev-parse --git-dir > /dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi
board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 2; }

# Every ID used by more than one ticket, one per line.
shared_ids() {
  local f
  for f in "$board"/*/*.md; do
    [ -e "$f" ] || continue
    basename "$f" | cut -c1-12
  done | grep -E '^[0-9]{12}$' | sort | uniq -d || true
}

# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------
if [ "$#" -eq 0 ]; then
  ids="$(shared_ids)"
  if [ -z "$ids" ]; then
    echo "No two tickets share an ID."
    exit 0
  fi
  while IFS= read -r id; do
    echo "$id is used by:"
    kerjaan_ticket_files "$board" "$id" | while IFS= read -r f; do
      echo "  ${f#"$board"/} (created $(kerjaan_field "$f" created))"
    done
  done <<< "$ids"
  echo "Repair each with: $here/repair.sh duplicate-id <id>"
  exit 1
fi

# ---------------------------------------------------------------------------
# repair
# ---------------------------------------------------------------------------
target="$1"
if [ -f "$target" ]; then
  chosen="$(cd "$(dirname "$target")" && pwd)/$(basename "$target")"
  case "$chosen" in
    "$board"/*/*.md) ;;
    *) echo "Not a ticket on this board: $target" >&2; exit 2 ;;
  esac
  id="$(basename "$chosen" | cut -c1-12)"
  kerjaan_is_id "$id" || { echo "$target does not start with a ticket ID." >&2; exit 2; }
elif kerjaan_is_id "$target"; then
  chosen=""
  id="$target"
else
  echo "'$target' is neither a 12-digit ID nor an existing file path." >&2
  exit 2
fi

# The board lock (lib.sh), held from reading the board to the last rename, so a
# ticket created or renumbered at the same moment cannot take the same number.
# The update-ticket.sh runs below share it.
trap 'kerjaan_lock_release board' EXIT
kerjaan_board_lock "$board" "repair.sh duplicate-id $target" 2

files=()
while IFS= read -r f; do files+=("$f"); done < <(kerjaan_ticket_files "$board" "$id")
if [ "${#files[@]}" -lt 2 ]; then
  echo "No other ticket uses ID $id; there is nothing to repair." >&2
  exit 1
fi

# Which keep the ID and which are renumbered.
renumber=()
if [ -n "$chosen" ]; then
  renumber=("$chosen")
  kept=()
  for f in "${files[@]}"; do [ "$f" = "$chosen" ] || kept+=("$f"); done
else
  oldest=""
  oldest_created=""
  for f in "${files[@]}"; do
    c="$(kerjaan_field "$f" created)"
    if ! printf '%s' "$c" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'; then
      echo "REFUSED: nothing was changed. ${f#"$board"/} has no readable created:" >&2
      echo "line, so its age cannot tell which ticket keeps $id. Read both, then" >&2
      echo "name the one to renumber: $here/repair.sh duplicate-id <path>" >&2
      exit 1
    fi
    if [ -z "$oldest" ] || [[ "$c" < "$oldest_created" ]]; then
      oldest="$f"
      oldest_created="$c"
    fi
  done
  for f in "${files[@]}"; do
    [ "$f" = "$oldest" ] && continue
    if [ "$(kerjaan_field "$f" created)" = "$oldest_created" ]; then
      echo "REFUSED: nothing was changed. ${oldest#"$board"/} and ${f#"$board"/}" >&2
      echo "were both created at $oldest_created, so their age cannot tell which keeps" >&2
      echo "$id. Read both, then name the one to renumber: $here/repair.sh duplicate-id <path>" >&2
      exit 1
    fi
    renumber+=("$f")
  done
  kept=("$oldest")
fi

# The minute after <yymmddHHMM>, rolling over hours, days, months and years.
next_minute() {
  local m="$1" yy mo dd hh mi dim
  yy=$((10#${m:0:2})); mo=$((10#${m:2:2})); dd=$((10#${m:4:2})); hh=$((10#${m:6:2})); mi=$((10#${m:8:2}))
  mi=$((mi + 1))
  if [ "$mi" -gt 59 ]; then mi=0; hh=$((hh + 1)); fi
  if [ "$hh" -gt 23 ]; then hh=0; dd=$((dd + 1)); fi
  case "$mo" in
    2) if [ $((yy % 4)) -eq 0 ]; then dim=29; else dim=28; fi ;;
    4 | 6 | 9 | 11) dim=30 ;;
    *) dim=31 ;;
  esac
  if [ "$dd" -gt "$dim" ]; then dd=1; mo=$((mo + 1)); fi
  if [ "$mo" -gt 12 ]; then mo=1; yy=$(((yy + 1) % 100)); fi
  printf '%02d%02d%02d%02d%02d\n' "$yy" "$mo" "$dd" "$hh" "$mi"
}

now="$(date '+%Y-%m-%d %H:%M:%S')"
order="$board/order.md"
moved=()
for f in "${renumber[@]}"; do
  minute="${id:0:10}"
  tries=0
  until new="$(kerjaan_next_id "$board" "$minute")"; do
    minute="$(next_minute "$minute")"
    tries=$((tries + 1))
    [ "$tries" -lt 1440 ] || { echo "No free ID in the day after $id; nothing more was changed." >&2; exit 1; }
  done
  name="$(basename "$f")"
  title="${name:13}"
  title="${title%.md}"
  dest="$(dirname "$f")/$new ${name:13}"

  kerjaan_append_note "$f" "- $now: renumbered from $id to $new by repair.sh duplicate-id: $id was also used by $(basename "${kept[0]}" .md), which keeps it."
  mv "$f" "$dest"

  # Its own line in order.md is the one naming its title; with two tickets of
  # one title it could be either, and is listed below instead.
  case "$(basename "$(dirname "$dest")")" in todo | in_progress | review) listed=1 ;; *) listed=0 ;; esac
  if [ -f "$order" ] && [ "$listed" -eq 1 ]; then
    same_title=0
    for k in "${kept[@]}"; do
      [ "$(basename "$k" | cut -c14-)" = "${name:13}" ] && same_title=1
    done
    if [ "$same_title" -eq 0 ]; then
      tmp="$(mktemp)"
      KERJAAN_OLD="- $id $title" KERJAAN_NEW="- $new $title" awk '
        { line = $0; sub(/[ \t]+$/, "", line)
          if (line == ENVIRON["KERJAAN_OLD"]) print ENVIRON["KERJAAN_NEW"]; else print }
      ' "$order" > "$tmp"
      cat "$tmp" > "$order"
      rm -f "$tmp"
    fi
  fi

  "$here/update-ticket.sh" "$dest" > /dev/null
  moved+=("$dest")
  echo "Renumbered: ${f#"$board"/} -> ${dest#"$board"/}"
done
echo "Kept $id: ${kept[0]#"$board"/}"

# What still names the old ID, and may have meant the renumbered ticket.
refs="$(grep -rnF -- "$id" "$board" --include='*.md' 2> /dev/null | grep -vF -- "${kept[0]}:" || true)"
for m in "${moved[@]}"; do
  refs="$(printf '%s\n' "$refs" | grep -vF -- "$m:" || true)"
done
# The kept ticket's own line in order.md means the kept ticket.
for k in "${kept[@]}"; do
  kline="- $(basename "$k" .md)"
  refs="$(printf '%s\n' "$refs" | KERJAAN_ORDER="$order:" KERJAAN_KLINE="$kline" awk '
    BEGIN { o = ENVIRON["KERJAAN_ORDER"]; want = ENVIRON["KERJAAN_KLINE"] }
    index($0, o) == 1 {
      rest = substr($0, length(o) + 1); sub(/^[0-9]+:/, "", rest); sub(/[ \t]+$/, "", rest)
      if (rest == want) next
    }
    { print }' || true)"
done
branches="$(git for-each-ref --format='%(refname:short)' refs/heads 2> /dev/null | grep -F -- "$id" || true)"
if [ -n "$refs" ] || [ -n "$branches" ]; then
  echo "These still name $id. Each could mean either ticket: read it, and change"
  echo "the ones meant for the renumbered one, then run update-ticket.sh on each"
  echo "ticket you changed."
  [ -z "$refs" ] || printf '%s\n' "$refs" | sed -e "s|^$board/|  .kerjaan/|"
  [ -z "$branches" ] || printf '%s\n' "$branches" | sed 's/^/  branch /'
else
  echo "Nothing else on the board names $id."
fi
exit 0
