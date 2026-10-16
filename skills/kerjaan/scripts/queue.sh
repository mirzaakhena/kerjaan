#!/usr/bin/env bash
#
# The queue planner's tools: what a ticket is expected to change, which tickets
# would change the same files, the questions still waiting for the owner, and
# whether `todo` and `order.md` are fit to be worked from.
#
# Why this script exists: deciding which tickets may run side by side used to
# be guessed from their titles. Two tickets that change the same file can
# still run together — the second to land merges the first in — but only when
# that is known before they start, and only a written estimate per ticket lets
# anyone know it. And a ticket whose question nobody answered looks exactly as
# ready as any other once it sits in `todo`; the worker who picks it up finds
# out after the owner has left. Both are silent, so both are written down in a
# fixed form a script can find, and checked here.
#
# Usage:
#   queue.sh estimate <id> [<path>...]   record the files and folders <id> is
#                                        expected to change; with no paths,
#                                        print the latest estimate
#   queue.sh overlap [<id>...]           pairs of tickets whose estimates share
#                                        files, and the files they share
#   queue.sh compare <id>                the estimate against what the ticket's
#                                        commits actually changed
#   queue.sh ask <id> "<question>"       record a question for the owner
#   queue.sh answer <id> <n> "<answer>"  record the owner's answer to question
#                                        <n>: the nth asked in that ticket, as
#                                        `check` and `ask` number it
#   queue.sh check [<id>...]             are these tickets ready for todo? With
#                                        no IDs: is todo, with order.md, ready
#                                        to be worked from?
#
# The records are fixed English lines in the ticket's ## Notes (lib.sh shows
# them). A path ending in "/" in an estimate stands for everything under it.
# Run from the main tree, not from a linked worktree.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  sed -n '/^# Usage:/,/^# The records/p' "${BASH_SOURCE[0]}" | sed -e '$d' -e 's/^# \{0,1\}//' >&2
  exit 2
}

[ "$#" -ge 1 ] || usage
cmd="$1"
shift
case "$cmd" in estimate|overlap|compare|ask|answer|check) ;; *) usage ;; esac

in_git=0
if git rev-parse --git-dir > /dev/null 2>&1; then
  in_git=1
  if [ -f "$(git rev-parse --git-dir)/gitdir" ]; then
    echo "This is a linked git worktree, and the board does not live here." >&2
    echo "Run queue.sh from the main tree:" >&2
    echo "  $(git worktree list --porcelain | sed -n '1s/^worktree //p')" >&2
    exit 2
  fi
  cd "$(git rev-parse --show-toplevel)"
fi
board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 2; }

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

now() { date '+%Y-%m-%d %H:%M:%S'; }

is_id() {
  case "$1" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) return 0 ;;
    *) return 1 ;;
  esac
}

# Prints the path of ticket <id>, or exits with the reason.
ticket_of() {
  local f rc=0
  is_id "$1" || { echo "'$1' is not a 12-digit ticket ID." >&2; exit 2; }
  f="$(kerjaan_ticket_file "$board" "$1")" || rc=$?
  [ "$rc" -eq 0 ] || { echo "ID $1 is used by more than one ticket; see references/repairs.md." >&2; exit 2; }
  [ -n "$f" ] || { echo "No ticket with ID $1." >&2; exit 2; }
  printf '%s\n' "$f"
}

status_of() { basename "$(dirname "$1")"; }

# Refreshes `updated` the way every change to a ticket must.
refresh() {
  "$here/update-ticket.sh" "$1" > /dev/null
}

blockers_of() {
  awk '$0 == "---" { if (++fence == 2) exit; next }
       fence == 1 && /^blocked_by:/ { print }' "$1" | grep -oE '[0-9]{12}' || true
}

one_line() {
  printf '%s' "$1" | tr '\n\t' '  ' | sed -e 's/  */ /g' -e 's/^ //' -e 's/ $//'
}

# Every ticket in the given statuses, as IDs, oldest first.
ids_in() {
  local st f
  for st in "$@"; do
    for f in "$board/$st"/*.md; do
      [ -e "$f" ] || continue
      basename "$f" | cut -c1-12
    done
  done | sort
}

# Shared paths of two estimates, given as two files of one path per line. A
# folder ("x/") shares with anything under it; what is shared is the narrower.
shared_paths() {
  awk 'NR == FNR { a[++na] = $0; next } { b[++nb] = $0 }
    END {
      for (i = 1; i <= na; i++) for (j = 1; j <= nb; j++) {
        p = a[i]; q = b[j]; s = ""
        if (p == q) s = p
        else if (p ~ /\/$/ && index(q, p) == 1) s = q
        else if (q ~ /\/$/ && index(p, q) == 1) s = p
        if (s != "" && !(s in seen)) { seen[s] = 1; print s }
      }
    }' "$1" "$2" | sort
}

# ---------------------------------------------------------------------------
# estimate
# ---------------------------------------------------------------------------
if [ "$cmd" = "estimate" ]; then
  [ "$#" -ge 1 ] || usage
  id="$1"; shift
  file="$(ticket_of "$id")"
  if [ "$#" -eq 0 ]; then
    est="$(kerjaan_estimate "$file")"
    if [ -z "$est" ]; then
      echo "No estimate recorded for $id." >&2
      exit 1
    fi
    printf '%s\n' "$est"
    exit 0
  fi
  : > "$tmpdir/paths"
  for p in "$@"; do
    while case "$p" in ./*) true ;; *) false ;; esac; do p="${p#./}"; done
    case "$p" in
      '' | /* | .. | ../* | */.. | */../* | *'`'* | .kerjaan | .kerjaan/*)
        echo "'$p' is not a path inside the project, relative to its root." >&2
        echo "The board itself (.kerjaan/) is never part of an estimate." >&2
        exit 2
        ;;
    esac
    case "$p" in */) ;; *) [ -d "$p" ] && p="$p/" ;; esac
    printf '%s\n' "$p" >> "$tmpdir/paths"
  done
  list="$(sort -u "$tmpdir/paths" | sed 's/.*/`&`/' | paste -sd ',' - | sed 's/,/, /g')"
  kerjaan_append_note "$file" "- $(now): files estimated to change: $list"
  refresh "$id"
  echo "Estimate recorded for $id: $list"
  exit 0
fi

# ---------------------------------------------------------------------------
# overlap
# ---------------------------------------------------------------------------
if [ "$cmd" = "overlap" ]; then
  if [ "$#" -gt 0 ]; then
    for id in "$@"; do ticket_of "$id" > /dev/null; done
    printf '%s\n' "$@" | sort -u > "$tmpdir/ids"
  else
    ids_in backlog todo in_progress review > "$tmpdir/ids"
  fi
  : > "$tmpdir/have"
  while IFS= read -r id; do
    [ -n "$id" ] || continue
    f="$(ticket_of "$id")"
    kerjaan_estimate "$f" > "$tmpdir/est.$id"
    if [ -s "$tmpdir/est.$id" ]; then
      printf '%s\t%s\n' "$id" "$(status_of "$f")" >> "$tmpdir/have"
    elif [ "$#" -gt 0 ]; then
      echo "No estimate recorded for $id; it is left out." >&2
    fi
  done < "$tmpdir/ids"

  found=0
  while IFS=$'\t' read -r a sa; do
    while IFS=$'\t' read -r b sb; do
      [ "$a" \< "$b" ] || continue
      shared_paths "$tmpdir/est.$a" "$tmpdir/est.$b" > "$tmpdir/shared"
      [ -s "$tmpdir/shared" ] || continue
      found=1
      echo "$a ($sa) and $b ($sb) share:"
      sed 's/^/  /' "$tmpdir/shared"
    done < "$tmpdir/have"
  done < "$tmpdir/have"
  [ "$found" -eq 1 ] || echo "No two of these tickets share a file in their estimates."
  exit 0
fi

# ---------------------------------------------------------------------------
# compare
# ---------------------------------------------------------------------------
if [ "$cmd" = "compare" ]; then
  [ "$#" -eq 1 ] || usage
  id="$1"
  file="$(ticket_of "$id")"
  [ "$in_git" -eq 1 ] || { echo "Not inside a git repository; there are no commits to compare." >&2; exit 2; }
  kerjaan_estimate "$file" > "$tmpdir/est"
  rev="HEAD"
  git rev-parse --verify -q HEAD > /dev/null 2>&1 && rev="$(kerjaan_code_rev "$id")"
  kerjaan_changed_files "$id" "$rev" > "$tmpdir/changed"
  [ "$rev" = "HEAD" ] || echo "Read from ${rev#refs/heads/}, which is not merged into HEAD."
  if [ ! -s "$tmpdir/est" ]; then
    echo "No estimate was recorded for $id. Changed by its commits:"
    if [ -s "$tmpdir/changed" ]; then sed 's/^/  /' "$tmpdir/changed"; else echo "  (nothing)"; fi
    exit 1
  fi
  awk -v outdir="$tmpdir" 'NR == FNR { est[++n] = $0; next }
    {
      hit = 0
      for (i = 1; i <= n; i++) {
        p = est[i]
        if ($0 == p || (p ~ /\/$/ && index($0, p) == 1)) { used[i] = 1; hit = 1 }
      }
      print > (outdir (hit ? "/both" : "/extra"))
    }
    END {
      printf "" > (outdir "/both"); printf "" > (outdir "/extra"); printf "" > (outdir "/missed")
      for (i = 1; i <= n; i++) if (!(i in used)) print est[i] > (outdir "/missed")
    }' "$tmpdir/est" "$tmpdir/changed"
  section() {
    echo "$1"
    if [ -s "$2" ]; then sed 's/^/  /' "$2"; else echo "  (none)"; fi
  }
  section "Estimated and changed:" "$tmpdir/both"
  section "Estimated, not changed:" "$tmpdir/missed"
  section "Changed, not estimated:" "$tmpdir/extra"
  exit 0
fi

# ---------------------------------------------------------------------------
# ask / answer
# ---------------------------------------------------------------------------
if [ "$cmd" = "ask" ]; then
  [ "$#" -eq 2 ] || usage
  file="$(ticket_of "$1")"
  q="$(one_line "$2")"
  [ -n "$q" ] || { echo "The question is empty." >&2; exit 2; }
  kerjaan_append_note "$file" "- $(now): open question: $q"
  refresh "$1"
  echo "Recorded for $1 as question $(kerjaan_questions "$file" | wc -l | tr -d ' ')."
  exit 0
fi

if [ "$cmd" = "answer" ]; then
  [ "$#" -eq 3 ] || usage
  file="$(ticket_of "$1")"
  n="$2"
  case "$n" in '' | *[!0-9]* | 0) echo "'$n' is not a question number (1, 2, ...)." >&2; exit 2 ;; esac
  a="$(one_line "$3")"
  [ -n "$a" ] || { echo "The answer is empty." >&2; exit 2; }
  state="$(kerjaan_questions "$file" | awk -F '\t' -v n="$n" '$1 == n { print $2 }')"
  case "$state" in
    open) ;;
    answered) echo "Question $n of $1 is already answered." >&2; exit 2 ;;
    *) echo "$1 has no question number $n." >&2; exit 2 ;;
  esac
  # The nth question line outside fences becomes answered, and the answer goes
  # right under it, after any lines that continue the question.
  awk -v n="$n" -v ans="  answer, $(now): $a" '
    function flushans() { if (pending) { print ans; pending = 0 } }
    !body { print; if ($0 == "---" && ++fm == 2) body = 1; next }
    pending && !/^[ \t]+[^ \t]/ { flushans() }
    /^(```|~~~)/ { infence = !infence; print; next }
    !infence && /^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: (open|answered) question: / {
      if (++k == n) { sub(/: open question: /, ": answered question: "); print; pending = 1; next }
    }
    { print }
    END { flushans() }
  ' "$file" > "$tmpdir/answered"
  cat "$tmpdir/answered" > "$file"
  refresh "$1"
  echo "Answer recorded for $1, question $n."
  exit 0
fi

# ---------------------------------------------------------------------------
# check
# ---------------------------------------------------------------------------
# Per ticket: no open question, an estimate, within the size limit (or kept
# whole by the owner), and every ticket it waits for either finished — landed,
# not held — or itself queued. With no IDs, todo is checked as a whole: also
# every ticket in order.md and no stale entry, no group holding a ticket
# together with one it waits for (directly or through others), nothing placed
# before what it waits for, and every two tickets of one group that share
# files named in that group's lead-in, which says which lands first in the
# wording lands_first and lands_before below recognise.

# Which of two tickets sharing files lands first, as the lead-in says it. The
# wording is fixed so a planner can write it and this can find it, and it is
# documented in references/ordering-the-queue.md ("Saying which lands first"):
# the ID, then "lands first" — or "lands before <other ID>" — or the same in
# Indonesian ("digabung lebih dulu", "digabung sebelum <other ID>"; "mendarat"
# for "digabung", "dahulu" for "dulu", "lebih" optional). Backticks, bold or
# italics around an ID are fine, letter case is not significant, and a lead-in
# wrapped over several lines is one sentence here.
first_re='lands first|(digabung|mendarat)( lebih)? (dulu|dahulu)'
before_re='lands before|(digabung|mendarat)( lebih (dulu|dahulu))? sebelum'
# The lead-in, on one line with single spaces. Fed to grep -q as a here-string,
# not a pipe: under pipefail a writer cut off by grep's early exit would turn
# a match into a failure.
squeeze() { printf '%s\n' "$1" | tr '\t' ' ' | sed 's/  */ /g'; }
# lands_first <lead-in> <id>
lands_first() {
  grep -Eiq "(^|[^0-9])$2[\`*_]* ($first_re)([^[:alpha:]]|\$)" <<< "$(squeeze "$1")"
}
# lands_before <lead-in> <id> <other id>
lands_before() {
  grep -Eiq "(^|[^0-9])$2[\`*_]* ($before_re) [\`*_]*$3([^0-9]|\$)" <<< "$(squeeze "$1")"
}

whole=0
if [ "$#" -gt 0 ]; then
  for id in "$@"; do ticket_of "$id" > /dev/null; done
  printf '%s\n' "$@" | sort -u > "$tmpdir/targets"
else
  whole=1
  ids_in todo > "$tmpdir/targets"
fi

problems=0
problem() { problems=$((problems + 1)); echo "  - $1"; }

while IFS= read -r id; do
  [ -n "$id" ] || continue
  f="$(ticket_of "$id")"
  echo "$id ($(status_of "$f")) $(basename "$f" .md | cut -c14-)"
  before="$problems"

  while IFS=$'\t' read -r k state q; do
    [ "$state" = "open" ] && problem "open question $k: $q"
  done < <(kerjaan_questions "$f")

  [ -n "$(kerjaan_estimate "$f")" ] \
    || problem "no estimate of the files it will change (queue.sh estimate $id <path>...)"

  if "$here/ticket-size.sh" "$f" 2>&1 > /dev/null | grep -q '^WARNING'; then
    problem "over the size limit: split it by outcome, or the owner keeps it whole (--accept-size)"
  fi

  while IFS= read -r b; do
    [ -n "$b" ] || continue
    bf="$(kerjaan_ticket_file "$board" "$b" 2> /dev/null || true)"
    if [ -z "$bf" ]; then
      problem "blocked_by $b, which is no ticket on this board"
      continue
    fi
    case "$(status_of "$bf")" in
      done)
        [ "$(kerjaan_merge_state "$bf")" != "held" ] \
          || problem "blocked_by $b, whose merge into main is held for the owner"
        ;;
      cancel) problem "blocked_by $b, which was cancelled: ask the owner whether the dependency is gone" ;;
      todo | in_progress | review) ;;
      backlog)
        grep -qx "$b" "$tmpdir/targets" \
          || problem "blocked_by $b, which is still in backlog and not part of this batch"
        ;;
    esac
  done < <(blockers_of "$f")

  [ "$problems" -gt "$before" ] || echo "  ready"
done < "$tmpdir/targets"

order="$board/order.md"
if [ "$whole" -eq 1 ] && [ -f "$order" ]; then
  echo "order.md"
  before="$problems"

  # Edges "<ticket> <ticket it waits for>" across the whole board, so a chain
  # through a ticket outside todo still counts.
  : > "$tmpdir/edges"
  for st in backlog todo in_progress review done cancel; do
    for f in "$board/$st"/*.md; do
      [ -e "$f" ] || continue
      fid="$(basename "$f" | cut -c1-12)"
      blockers_of "$f" | sed "s/^/$fid /" >> "$tmpdir/edges"
    done
  done

  # Groups: "<n> <id>" per bullet, and "<n>\t<lead-in>" per group. A group runs
  # from one bold opening line to the next; only blocks holding bullets count.
  awk -v gl="$tmpdir/groups" -v ll="$tmpdir/leadins" '
    /^\*\*/ { g++; lead[g] = $0; inlead = 1; next }
    /^- [0-9]{12}( |$)/ { inlead = 0; print g + 0, substr($0, 3, 12) > gl; has[g + 0] = 1; next }
    inlead && NF { lead[g] = lead[g] " " $0; next }
    { inlead = 0 }
    END { printf "" > gl; printf "" > ll; for (i = 0; i <= g; i++) if (has[i]) print i "\t" lead[i] > ll }
  ' "$order"

  while IFS= read -r id; do
    [ -n "$id" ] || continue
    awk -v id="$id" '$2 == id { f = 1 } END { exit !f }' "$tmpdir/groups" \
      || problem "$id is in todo but has no place in order.md"
  done < "$tmpdir/targets"
  while read -r g id; do
    grep -qx "$id" "$tmpdir/targets" || problem "order.md lists $id, which is not in todo"
  done < "$tmpdir/groups"

  # Waiting, directly or through others, on a ticket in the same group or a
  # later one.
  while IFS= read -r msg; do
    [ -n "$msg" ] && problem "$msg"
  done < <(awk '
    FILENAME == ARGV[1] { dep[$1] = dep[$1] " " $2; next }
    { grp[$2] = $1; order[++n] = $2 }
    function reach(from, to,    stack, top, seen, cur, parts, i, k) {
      top = 0; stack[++top] = from
      while (top > 0) {
        cur = stack[top--]
        k = split(dep[cur], parts, " ")
        for (i = 1; i <= k; i++) {
          if (parts[i] == to) return 1
          if (!(parts[i] in seen)) { seen[parts[i]] = 1; stack[++top] = parts[i] }
        }
      }
      return 0
    }
    END {
      for (i = 1; i <= n; i++) for (j = 1; j <= n; j++) {
        a = order[i]; b = order[j]
        if (a == b || !reach(a, b)) continue
        if (grp[a] == grp[b])
          print a " and " b " share a group, but " a " waits for the result of " b ": they never run together"
        else if (grp[b] > grp[a])
          print a " is placed before " b ", which it waits for"
      }
    }' "$tmpdir/edges" "$tmpdir/groups")

  # Two tickets of one group that share files: allowed, once the lead-in names
  # them and says which lands first.
  while read -r ga a; do
    while read -r gb b; do
      [ "$ga" = "$gb" ] && [ "$a" \< "$b" ] || continue
      fa="$(kerjaan_ticket_file "$board" "$a" 2> /dev/null || true)"
      fb="$(kerjaan_ticket_file "$board" "$b" 2> /dev/null || true)"
      [ -n "$fa" ] && [ -n "$fb" ] || continue
      kerjaan_estimate "$fa" > "$tmpdir/ea"
      kerjaan_estimate "$fb" > "$tmpdir/eb"
      shared="$(shared_paths "$tmpdir/ea" "$tmpdir/eb" | paste -sd ',' - | sed 's/,/, /g')"
      [ -n "$shared" ] || continue
      leadin="$(awk -F '\t' -v g="$ga" '$1 == g { print substr($0, length($1) + 2) }' "$tmpdir/leadins")"
      case "$leadin" in
        *"$a"*"$b"* | *"$b"*"$a"*) ;;
        *)
          problem "$a and $b share a group and the files $shared; its lead-in must name both and say which lands first"
          continue
          ;;
      esac
      lands_before "$leadin" "$a" "$b" && continue
      lands_before "$leadin" "$b" "$a" && continue
      first_a=0; first_b=0
      lands_first "$leadin" "$a" && first_a=1
      lands_first "$leadin" "$b" && first_b=1
      [ "$first_a" -ne "$first_b" ] && continue
      if [ "$first_a" -eq 1 ]; then
        problem "$a and $b share a group and the files $shared; its lead-in says both land first, so which one is unclear"
      else
        problem "$a and $b share a group and the files $shared; its lead-in names both but not which lands first (write \"<id> lands first\")"
      fi
    done < "$tmpdir/groups"
  done < "$tmpdir/groups"

  [ "$problems" -gt "$before" ] || echo "  in step with todo"
fi

if [ "$problems" -eq 0 ]; then
  echo "READY"
  exit 0
fi
echo "NOT READY: $problems problem(s) above."
exit 1
