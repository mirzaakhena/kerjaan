#!/usr/bin/env bash
#
# Warns when a ticket's "Done when" list has grown past the board's limit.
# Never refuses and never changes the ticket: a big ticket is a reason to
# split, which is a conversation with the owner, not something a script can do.
#
# Why this script exists: nothing stops a checklist from growing. Tickets of
# twenty criteria get written, queued and started before anyone notices, and by
# then one of them has already been built in a single long round — reviewed in
# a hurry, corrected late, and held back whole by any one part that fails.
# The moment to notice is when the ticket is written, so update-ticket.sh and
# new-ticket.sh run this on every ticket they touch. The foreman can also run
# it on its own, to check a ticket without changing it.
#
# Usage: ticket-size.sh <id|path>
#
# What counts as an item: a top-level `- [ ]` or `- [x]` line under
# `## Done when`, outside fenced blocks. Not counted: indented continuation
# lines and sub-bullets, which belong to the item above them, and items struck
# through (`- [ ] ~~...~~`), which were voided or moved to another ticket.
#
# The limit is `done_when_limit` in .kerjaan/settings.md, 8 when unset.
# A ticket whose `## Notes` holds a line starting with "- " that says
# "size accepted by the owner" is never warned about again; that line is
# written by `update-ticket.sh <id> --accept-size`, on the owner's word only.
#
# Prints nothing on stdout. Exit 0 whether or not it warned; 1 on bad usage.

set -euo pipefail

DEFAULT_LIMIT=8

[ "$#" -eq 1 ] || { echo "Usage: ticket-size.sh <id|path>" >&2; exit 1; }

target="$1"
board="$PWD/.kerjaan"

if [ -f "$target" ]; then
  file="$target"
else
  case "$target" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;;
    *) echo "'$target' is neither a 12-digit ID nor an existing file path." >&2; exit 1 ;;
  esac
  file=""
  for f in "$board"/*/"$target "*.md; do
    [ -e "$f" ] || continue
    file="$f"
    break
  done
  [ -n "$file" ] || { echo "No ticket with ID $target." >&2; exit 1; }
fi

base="$(basename "$file")"
id="${base:0:12}"
status="$(basename "$(dirname "$file")")"

# A claim already made is not split: a ticket in review, done or cancel is
# past the point where a warning could change anything.
case "$status" in
  review|done|cancel) exit 0 ;;
esac

# --- the board's limit -------------------------------------------------------
limit="$DEFAULT_LIMIT"
settings="$(cd "$(dirname "$file")/.." && pwd)/settings.md"
if [ -f "$settings" ]; then
  raw="$(awk '
    $0 == "---" { if (++fm == 2) exit; next }
    fm == 1 && /^done_when_limit:/ { sub(/^done_when_limit:[ \t]*/, ""); sub(/[ \t]+$/, ""); print; exit }
  ' "$settings")"
  if [ -n "$raw" ]; then
    case "$raw" in
      *[!0-9]*) bad=1 ;;
      *) bad=0; [ "$((10#$raw))" -ge 1 ] || bad=1 ;;
    esac
    if [ "$bad" -eq 0 ]; then
      limit="$((10#$raw))"
    else
      echo "Note: done_when_limit in $settings is '$raw', not a whole number of 1 or more;" >&2
      echo "  the default of $DEFAULT_LIMIT is used instead." >&2
    fi
  fi
fi

# --- count, and look for the owner's acceptance -----------------------------
read -r count accepted < <(awk '
  BEGIN { fm = 0; body = 0; infence = 0; sec = ""; n = 0; ok = 0 }
  !body { if ($0 == "---" && ++fm == 2) body = 1; next }
  /^(```|~~~)/ { infence = !infence; next }
  infence { next }
  /^## / { sec = $0; sub(/[ \t]+$/, "", sec); next }
  sec == "## Done when" && /^- \[[ xX]\]/ {
    if ($0 ~ /^- \[[ xX]\][ \t]*~~/) next
    n++
    next
  }
  sec == "## Notes" && /^- / && tolower($0) ~ /size accepted by the owner/ { ok = 1 }
  END { print n, ok }
' "$file")

[ "$accepted" -eq 1 ] && exit 0
[ "$count" -le "$limit" ] && exit 0

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cat >&2 <<WARN
WARNING: $id has $count "Done when" items, over this board's limit of $limit.
  A ticket this big is reviewed less sharply, shows its result late, runs a
  worker out of context more often, and one failing part holds back the rest.
  Offer the owner a split by outcome -- pieces each of which can be tried on
  its own -- before it goes to todo or is started (SKILL.md, "How big a ticket is").
  If the owner decides it stays whole, record that with:
    $here/update-ticket.sh $id --accept-size
  The ticket was saved as it is.
WARN
exit 0
