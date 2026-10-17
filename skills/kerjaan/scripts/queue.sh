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
#   queue.sh estimate <id> --none        record that <id> changes no file of
#                                        the project: a decision ticket
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
  kerjaan_refuse_linked_worktree 2
  cd "$(git rev-parse --show-toplevel)"
fi
board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 2; }

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"; kerjaan_lock_release board' EXIT

# The commands that write a ticket hold the board lock (lib.sh) from reading it
# to the refresh after, which update-ticket.sh shares, so a ticket moved by
# someone else at that moment cannot overwrite the record, nor the reverse.
case "$cmd" in
  estimate | ask | answer) kerjaan_board_lock "$board" "queue.sh $cmd ${1:-}" ;;
esac

now() { date '+%Y-%m-%d %H:%M:%S'; }

# Prints the path of ticket <id>, or exits with the reason.
ticket_of() {
  kerjaan_find_ticket "$board" "$1" || exit 2
}

status_of() { basename "$(dirname "$1")"; }

# Refreshes `updated` the way every change to a ticket must.
refresh() {
  "$here/update-ticket.sh" "$1" > /dev/null
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
    case "$(kerjaan_estimate_kind "$file")" in
      paths) kerjaan_estimate "$file" ;;
      none) echo "(none: $id changes no file of the project)" ;;
      *) echo "No estimate recorded for $id." >&2; exit 1 ;;
    esac
    exit 0
  fi
  if [ "$1" = "--none" ]; then
    [ "$#" -eq 1 ] || { echo "--none stands alone: a ticket either changes these files or none." >&2; exit 2; }
    kerjaan_append_note "$file" "- $(now): files estimated to change: none"
    refresh "$id"
    echo "Estimate recorded for $id: no file of the project changes."
    exit 0
  fi
  : > "$tmpdir/paths"
  for p in "$@"; do
    [ "$p" != "--none" ] || { echo "--none stands alone: a ticket either changes these files or none." >&2; exit 2; }
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
    elif [ "$#" -gt 0 ] && [ "$(kerjaan_estimate_kind "$f")" != "none" ]; then
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
  if [ ! -s "$tmpdir/est" ] && [ "$(kerjaan_estimate_kind "$file")" != "none" ]; then
    echo "No estimate was recorded for $id. Changed by its commits:"
    if [ -s "$tmpdir/changed" ]; then sed 's/^/  /' "$tmpdir/changed"; else echo "  (nothing)"; fi
    exit 1
  fi
  # An estimate of "none" leaves est empty, and awk would then read the changed
  # files as the estimate: every changed file is unestimated, so say that.
  # A line holding a backquote stands in, since no estimated path may hold one.
  [ -s "$tmpdir/est" ] || echo '`none`' > "$tmpdir/est"
  awk -v outdir="$tmpdir" 'NR == FNR { if ($0 != "`none`") est[++n] = $0; next }
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
  # The answer goes through the environment, not -v, so backslashes survive.
  KERJAAN_ANSWER="  answer, $(now): $a" awk -v n="$n" -v fence="$KERJAAN_FENCE" '
    function flushans() { if (pending) { print ENVIRON["KERJAAN_ANSWER"]; pending = 0 } }
    !body { print; if ($0 == "---" && ++fm == 2) body = 1; next }
    pending && !/^[ \t]+[^ \t]/ { flushans() }
    $0 ~ fence { infence = !infence; print; next }
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
# This is the one definition of a ticket ready for todo. SKILL.md, "Into
# `todo`", says the same conditions in words, one bullet per problem kind
# below; every other document points here or there instead of listing them.
# Per ticket: `type` and `priority` filled in, no open question, within the
# size limit (or kept whole by the owner), an estimate (a list of files, or
# none at all), and every ticket it waits for either finished — landed, not
# held — or ahead of it: in flight, queued in todo, or a backlog ticket named
# in the same batch. With no IDs, todo is checked as a whole: also every
# ticket in order.md and no stale entry, a blocker in todo placed in an
# earlier group (so, with no order.md, nothing in todo waits for another
# ticket of todo), no group holding a ticket together with one it waits for
# (directly or through others), and every two tickets of one group that share
# files ordered by that group's lands-first line. Questions still open in
# tickets in flight are shown too, without counting against todo.
#
# The lands-first line is the one fixed marker for which lands first, the same
# on a board in any language, documented in references/ordering-the-queue.md
# ("Saying which lands first"):
#
#   <!-- lands-first: <id>, <id> -->
#
# one line per group, its IDs in the order they land. Of two tickets sharing
# files, the one listed earlier lands first, and a listed one lands before any
# the line leaves out; two left out are unordered. The prose of the lead-in is
# never read for it: free wording in every language could not be matched
# reliably. update-ticket.sh takes a ticket's ID off the line when its ticket
# line goes, so an ID naming no ticket of its group is a hand edit and reported.

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

order="$board/order.md"

while IFS= read -r id; do
  [ -n "$id" ] || continue
  f="$(ticket_of "$id")"
  echo "$id ($(status_of "$f")) $(basename "$f" .md | cut -c14-)"
  before="$problems"

  for k in type priority; do
    [ -n "$(kerjaan_field "$f" "$k")" ] || problem "\`$k\` is empty"
  done

  while IFS=$'\t' read -r k state q; do
    [ "$state" = "open" ] && problem "open question $k: $q"
  done < <(kerjaan_questions "$f")

  [ -n "$(kerjaan_estimate_kind "$f")" ] \
    || problem "no estimate of the files it will change (queue.sh estimate $id <path>..., or --none when it changes no file of the project)"

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
      in_progress | review) ;;
      todo)
        # Its place ahead of this one is order.md's to give, judged below.
        [ "$whole" -eq 1 ] && [ ! -f "$order" ] \
          && problem "blocked_by $b, which is in todo too, and no order.md places it in an earlier group"
        ;;
      backlog)
        grep -qx "$b" "$tmpdir/targets" \
          || problem "blocked_by $b, which is still in backlog and not part of this batch"
        ;;
    esac
  done < <(kerjaan_blockers "$f")

  [ "$problems" -gt "$before" ] || echo "  ready"
done < "$tmpdir/targets"

# A question a worker recorded mid-work sits in a ticket in flight. It is not
# todo's problem, but it is waiting for the same owner, so it is shown.
if [ "$whole" -eq 1 ]; then
  : > "$tmpdir/waiting"
  while IFS= read -r id; do
    f="$(ticket_of "$id")"
    while IFS=$'\t' read -r k state q; do
      [ "$state" = "open" ] && echo "  $id ($(status_of "$f")) question $k: $q" >> "$tmpdir/waiting"
    done < <(kerjaan_questions "$f")
  done < <(ids_in in_progress review)
  if [ -s "$tmpdir/waiting" ]; then
    echo "in flight, waiting for the owner (not counted against todo)"
    cat "$tmpdir/waiting"
  fi
fi
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
      kerjaan_blockers "$f" | sed "s/^/$fid /" >> "$tmpdir/edges"
    done
  done

  # order.md has a fixed grammar (references/ordering-the-queue.md, "The
  # lines it may hold"): every line is one of a goal line, a lead-in, a
  # lands-first line, a ticket line or a blank line, and anything else is
  # reported by its line number. The file is never rewritten here; a line
  # that fits none of them is the owner's or the planner's to move to where
  # it belongs.
  #
  # Groups: "<n> <id>" per ticket line. A group runs from one lead-in to the
  # next. Ticket lines go to "listed" as "<line number> <id> <title>" for the
  # title check. Its lands-first lines go to "marks" as "<n> <line number>
  # <id>..." when they read as the fixed shape, and to "badmarks" as "<line
  # number>" when they only look like it — a comment mentioning lands first,
  # in any letter case and joined by a hyphen, a space or nothing — so a
  # misspelt marker is reported rather than passed over. Lines outside the
  # grammar go to "badlines" as "<line number>\t<what is wrong>".
  awk -v gl="$tmpdir/groups" -v ml="$tmpdir/marks" -v bl="$tmpdir/badmarks" \
      -v tl="$tmpdir/listed" -v xl="$tmpdir/badlines" '
    function bad(ln, msg) { printf "%d\t%s\n", ln, msg > xl }
    function close_group() {
      if (g > 0 && !count[g]) bad(lead[g], "is a lead-in with no ticket under it: give it its tickets, or remove it")
    }
    BEGIN { printf "" > gl; printf "" > ml; printf "" > bl; printf "" > tl; printf "" > xl; cont = 0 }
    /^[ \t\r]*$/ { cont = 0; next }
    /^\*\*Goal\.\*\*/ {
      if (goal) bad(NR, "is a second goal line: order.md holds one, on its first line")
      else if (seen) bad(NR, "is a goal line below the top: it goes on the first line, above every group")
      goal = NR; seen = 1; cont = 0; next
    }
    /^\*\*/ {
      close_group()
      g++; lead[g] = NR; seen = 1; cont = NR
      if (!index(substr($0, 3), "**"))
        bad(NR, "opens a bold lead-in that does not close on the same line: write the lead-in as one line")
      next
    }
    /^- [0-9]{12}( |$)/ {
      id = substr($0, 3, 12)
      if (g == 0) bad(NR, "lists " id " under no lead-in: put it in a group, below a bold lead-in")
      if (id in at) bad(NR, "lists " id " again, after line " at[id] ": one line per ticket")
      else at[id] = NR
      count[g]++; seen = 1; cont = 0
      print g + 0, id > gl
      print NR, id, substr($0, 16) > tl
      next
    }
    tolower($0) ~ /^[ \t]*<!--.*lands[- _]*first/ {
      seen = 1; cont = 0
      if (g == 0) { bad(NR, "is a lands-first line outside any group: put it under the lead-in of its group"); next }
      s = $0
      if (sub(/^[ \t]*<!--[ \t]*lands-first:/, "", s) && sub(/-->[ \t]*$/, "", s) \
          && s ~ /^[ \t]*[0-9]{12}([ \t]*,[ \t]*[0-9]{12})*[ \t]*$/) {
        gsub(/[ \t,]+/, " ", s); sub(/^ /, "", s); sub(/ $/, "", s)
        print g + 0, NR, s > ml
      } else print NR > bl
      next
    }
    {
      if (cont) bad(NR, "continues the lead-in of line " cont ": a lead-in is one sentence on one line")
      else bad(NR, "is none of the lines order.md holds (a goal line, a lead-in, a lands-first line, a ticket line, a blank line): move what it says where ordering-the-queue.md, \"Where everything else goes\", sends it")
      seen = 1
    }
    END { close_group() }
  ' "$order"

  while IFS=$'\t' read -r ln msg; do
    problem "order.md line $ln $msg"
  done < <(sort -s -n -k1,1 "$tmpdir/badlines")

  # order.md covers every ticket still being worked on: todo, in_progress and
  # review. update-ticket.sh takes a ticket's line off when it leaves them
  # (done, cancel, or back to backlog), so a line naming any other ticket is
  # stale. The title on a line is a label for people, kept in step by
  # update-ticket.sh --title; one that differs from its ticket's was edited by
  # hand, and is reported so it never silently names the wrong work.
  ids_in todo in_progress review > "$tmpdir/active"
  while IFS= read -r id; do
    [ -n "$id" ] || continue
    awk -v id="$id" '$2 == id { f = 1 } END { exit !f }' "$tmpdir/groups" \
      || problem "$id is in todo but has no place in order.md"
  done < "$tmpdir/targets"
  while read -r g id; do
    grep -qx "$id" "$tmpdir/active" || problem "order.md lists $id, which is not in todo, in_progress or review"
  done < "$tmpdir/groups"
  while read -r ln id title; do
    grep -qx "$id" "$tmpdir/active" || continue
    f="$(kerjaan_ticket_file "$board" "$id" 2> /dev/null || true)"
    [ -n "$f" ] || continue
    want="$(basename "$f" .md | cut -c14-)"
    title="${title%"${title##*[![:space:]]}"}"
    [ "$title" = "$want" ] \
      || problem "order.md line $ln gives $id the title \"$title\", but its ticket is titled \"$want\": copy the ticket's title (update-ticket.sh --title renames both)"
  done < "$tmpdir/listed"

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

  # The lands-first lines themselves: readable, one per group, and naming only
  # tickets of their group, each once. "firsts" holds "<n> <position> <id>"
  # from the first line of each group.
  while read -r ln; do
    problem "order.md line $ln is not a lands-first line check can read: write it as <!-- lands-first: <id>, <id> -->, the IDs in the order they land"
  done < "$tmpdir/badmarks"
  : > "$tmpdir/firsts"
  while read -r g ln ids; do
    if awk -v g="$g" -v ln="$ln" '$1 == g && $2 < ln { f = 1 } END { exit !f }' "$tmpdir/marks"; then
      problem "order.md line $ln is a second lands-first line in its group: write one, with every ID in the order they land"
      continue
    fi
    pos=0
    for mid in $ids; do
      pos=$((pos + 1))
      if awk -v g="$g" -v id="$mid" '$1 == g && $3 == id { f = 1 } END { exit !f }' "$tmpdir/firsts"; then
        problem "order.md line $ln names $mid twice"
        continue
      fi
      awk -v g="$g" -v id="$mid" '$1 == g && $2 == id { f = 1 } END { exit !f }' "$tmpdir/groups" \
        || problem "order.md line $ln names $mid, which is not a ticket of its group"
      echo "$g $pos $mid" >> "$tmpdir/firsts"
    done
  done < "$tmpdir/marks"

  # Two tickets of one group that share files: allowed, once the group's
  # lands-first line says which of them lands first.
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
      # Either one listed settles the pair: the earlier, or the only one listed.
      awk -v g="$ga" -v a="$a" -v b="$b" '$1 == g && ($3 == a || $3 == b) { f = 1 } END { exit !f }' "$tmpdir/firsts" \
        && continue
      if awk -v g="$ga" '$1 == g { f = 1 } END { exit !f }' "$tmpdir/marks"; then
        problem "$a and $b share a group and the files $shared; its lands-first line names neither, so which lands first is open (add one of them to it)"
      else
        problem "$a and $b share a group and the files $shared; the group has no line saying which lands first (write <!-- lands-first: <id> --> under its lead-in)"
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
