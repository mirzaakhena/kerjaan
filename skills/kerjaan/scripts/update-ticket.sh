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
# owner (queue.sh ask). A move to review is accepted only from in_progress, and
# for work on a branch of its own only once that branch holds all of main's
# code and passed its tests in that state (merge.sh).
#
# Every run ends with ticket-size.sh, which warns -- never refuses -- when the
# ticket's "Done when" list is longer than the board allows.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  cat >&2 <<USAGE
Usage: update-ticket.sh <id|path> [--status <status>] [--title "<new title>"] [--ack-unmerged] [--accept-size]

  <id|path>        12-digit ID, or the path to a ticket file
  --status         move to one of: ${KERJAAN_STATUSES[*]}
                   (--status=<status> works too, as does --title=<title>)
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
    --status=*)
      new_status="${1#--status=}"
      [ -n "$new_status" ] || { echo "--status needs a value." >&2; usage; }
      shift
      ;;
    --title)
      [ "$#" -ge 2 ] || { echo "--title needs a value." >&2; usage; }
      new_title="$2"
      title_given=1
      shift 2
      ;;
    --title=*)
      new_title="${1#--title=}"
      title_given=1
      shift
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

kerjaan_refuse_linked_worktree 1

board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 1; }

# --- one writer at a time ----------------------------------------------------
# Everything below reads a ticket or order.md, changes it, and writes it back.
# Two workers starting two tickets of one order.md group at the same moment
# would each drop their own line from the copy they read, and the second write
# would put the first one's line back. So the whole run holds the board lock
# (lib.sh), from finding the ticket — which another run may be moving — to the
# last write. A run called by a script that already holds it (test-run.sh,
# merge.sh, queue.sh) shares that hold. A wait longer than lock_timeout ends
# with the holder named and nothing changed.
lock_who="update-ticket.sh $target"
[ -z "$new_status" ] || lock_who="$lock_who --status $new_status"
[ "$title_given" -eq 0 ] || lock_who="$lock_who --title"
trap 'kerjaan_lock_release board' EXIT
kerjaan_board_lock "$board" "$lock_who" 1

# --- locate the ticket file ------------------------------------------------
file="$(kerjaan_ticket_arg "$board" "$target")" || exit 1

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

if ! kerjaan_is_status "$current_status"; then
  echo "File does not sit directly inside one of the status folders: $file" >&2
  exit 1
fi

# --- work out the destination ----------------------------------------------
dest_status="$current_status"
if [ -n "$new_status" ]; then
  if ! kerjaan_is_status "$new_status"; then
    echo "Invalid status: '$new_status'" >&2
    usage
  fi
  dest_status="$new_status"
fi

stem="$(basename "$file" .md)"
dest_title="${stem:13}"
if [ "$title_given" -eq 1 ]; then
  dest_title="$(kerjaan_tidy_title "$new_title")"
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
# ticket coming back from review or done — rejected by its reviewer, or a
# merge postponed by merge.sh land — is not new work, so it is not a start.

# --- the way into todo -------------------------------------------------------
# `todo` means ready to be worked without asking anything more. A question the
# owner has not answered yet, recorded with `queue.sh ask`, says the opposite,
# and a ticket carrying one into the queue reaches a worker who finds out only
# after the owner has gone. Refused, not warned: the queue is worked from when
# nobody is watching.

if [ "$dest_status" = "todo" ] && [ "$current_status" != "todo" ]; then
  open_questions="$(kerjaan_questions "$file" | awk -F '\t' '$2 == "open"')"
  if [ -n "$open_questions" ]; then
    echo "REFUSED: $id was not moved to todo." >&2
    echo "It still holds questions waiting for the owner:" >&2
    # Numbered as `queue.sh answer` numbers them, answered ones counted too.
    printf '%s\n' "$open_questions" | awk -F '\t' '{ print "  " $1 ". " $3 }' >&2
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
  done < <(kerjaan_blockers "$file")
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
  while IFS= read -r pat; do
    [ -n "$pat" ] && long_lived+=("$pat")
  done < <(kerjaan_setting_list "$board/settings.md" long_lived_branches)

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
        f="$(kerjaan_ticket_file "$board" "$bid" 2> /dev/null || true)"
        [ -z "$f" ] || line="$line — ticket $bid is in $(basename "$(dirname "$f")")/"
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
trap 'rm -f "$tmp" "$tmp.history"; kerjaan_lock_release board' EXIT

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
# Inside a Claude Code session the line also names the session that made the
# move, `- <time> <session-id> <status>`, so the owner can open that
# conversation again; anywhere else it stays `- <time> <status>`. lib.sh's
# kerjaan_history_line decides which. The status is always the last word.
#
# Headings inside fenced blocks are prose, not sections, so they are skipped.
# The file itself is written once, below, so a ticket this cannot place a
# line in is refused with nothing changed — not even `updated`.

if [ "$dest_status" != "$current_status" ]; then
  if ! KERJAAN_LINE="$(kerjaan_history_line "$now" "$dest_status")" awk -v fence="$KERJAAN_FENCE" '
    BEGIN { fm = 0; body = 0; infence = 0; inhist = 0; hist = 0; lasthist = 0; notes = 0; line = ENVIRON["KERJAAN_LINE"] }
    { lines[NR] = $0 }
    !body { if ($0 == "---" && ++fm == 2) body = 1; next }
    $0 ~ fence { infence = !infence }
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
if [ -n "${review_record:-}" ]; then
  kerjaan_append_note "$file" "$review_record"
fi

if [ "${#unmerged[@]}" -gt 0 ]; then
  kerjaan_append_note "$file" "- $now: started while these branches held unmerged work, acknowledged with --ack-unmerged: ${unmerged[*]}"
fi

# The wording is fixed and English, like the line above: ticket-size.sh stops
# warning about this ticket on exactly this sentence (lib.sh).
if [ "$accept_size" -eq 1 ]; then
  kerjaan_append_note "$file" "- $now: $KERJAAN_SIZE_ACCEPTED"
fi

# --- move or rename if needed ----------------------------------------------
if [ "$dest" != "$file" ]; then
  mv "$file" "$dest"
fi

# --- keep the ordering file in step ----------------------------------------
# `.kerjaan/order.md` lists the tickets still being worked on — in `todo/`,
# `in_progress/` and `review/` — in the order they are picked up, with which
# lands first (references/ordering-the-queue.md). Two ways of breaking it raise
# no error at all: leaving a ticket listed there after it has finished, and
# renaming a ticket so the file spells its title the old way. Both are exactly
# the silent half-action this script exists to make impossible, so they are
# bound into the same command.
#
# A ticket's line stays while it is worked on and reviewed: two tickets of one
# group running side by side need the lands-first line most exactly then. It
# goes when the ticket leaves the work for good — done, cancelled, or back to
# backlog.
#
# A board that has never written an order file is left completely alone.

order="$board/order.md"

active() { case "$1" in todo | in_progress | review) return 0 ;; esac; return 1; }

if [ -f "$order" ] && active "$current_status" && ! active "$dest_status"; then
  if grep -qE "^- $id( |\$)" "$order"; then
    otmp="$(mktemp)"
    # Drops the ticket's line, then drops any group left with no ticket at
    # all — a lead-in introducing nothing is worse than no group. A block runs
    # from its bold lead-in to the next one.
    #
    # Only a block that actually held a ticket line is a group. The goal line
    # at the top (`**Goal.**`, the same on a board in any language) is never
    # one: it is printed as it stands, whatever comes under it. Any other bold
    # line that never held a ticket is outside the grammar, and is left exactly
    # as written for queue.sh check to report by its line number — this script
    # never deletes what it does not understand.
    #
    # The group's other lines go with it, its wait-for-owner line
    # (`<!-- wait-for-owner -->`) included: it marks that group alone, and
    # never passes to the next one.
    #
    # The ticket's ID also comes off its group's lands-first line
    # (`<!-- lands-first: <id>, <id> -->`), keeping the others in their order;
    # a line left naming nobody goes. A line in any other shape is left
    # exactly as written for queue.sh check to report.
    awk -v id="$id" '
      function flush(   i) {
        if (started && (kept || !had_bullet)) { for (i = 0; i < n; i++) print buf[i] }
        n = 0; kept = 0; had_bullet = 0
      }
      function unmark(line,   s, parts, k, i, out) {
        s = line
        if (!(sub(/^[ \t]*<!--[ \t]*lands-first:/, "", s) && sub(/-->[ \t]*$/, "", s) \
            && s ~ /^[ \t]*[0-9]{12}([ \t]*,[ \t]*[0-9]{12})*[ \t]*$/)) return line
        gsub(/[ \t,]+/, " ", s)
        k = split(s, parts, " ")
        out = ""
        for (i = 1; i <= k; i++) if (parts[i] != id) out = out (out == "" ? "" : ", ") parts[i]
        if (out == "") return ""
        return "<!-- lands-first: " out " -->"
      }
      BEGIN { n = 0; kept = 0; had_bullet = 0; started = 0 }
      {
        if ($0 ~ /^\*\*Goal\.\*\*/) { flush(); started = 0; print; next }
        if ($0 ~ /^\*\*/) { flush(); started = 1 }
        if ($0 ~ /^- /) {
          had_bullet = 1
          if ($0 == "- " id || index($0, "- " id " ") == 1) { next }
          kept = 1
        }
        if ($0 ~ /^[ \t]*<!--[ \t]*lands-first:/ && index($0, id)) {
          $0 = unmark($0)
          if ($0 == "") next
        }
        if (started) { buf[n++] = $0 } else { print }
      }
      END { flush() }
    ' "$order" > "$otmp"
    cat "$otmp" > "$order"
    rm -f "$otmp"
  elif [ "$current_status" = "todo" ]; then
    echo "Note: $id was not listed in $order — check whether that file is still true." >&2
  fi
elif [ -f "$order" ] && [ "$title_given" -eq 1 ]; then
  otmp="$(mktemp)"
  # The title goes through the environment, not -v, so backslashes survive.
  # Only this ticket's own line changes, whatever folder the ticket is in.
  KERJAAN_TITLE="$dest_title" awk -v id="$id" '
    { if ($0 == "- " id || index($0, "- " id " ") == 1) { print "- " id " " ENVIRON["KERJAAN_TITLE"] } else { print } }
  ' "$order" > "$otmp"
  cat "$otmp" > "$order"
  rm -f "$otmp"
fi

if [ -f "$order" ] && [ "$dest_status" = "todo" ] && [ "$current_status" != "todo" ] \
    && ! grep -qE "^- $id( |\$)" "$order"; then
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
            echo "  $here/worktree.sh remove $id && git branch -d $branch" >&2
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
"$here/ticket-size.sh" "$dest" || true

printf '%s\n' "$dest"
