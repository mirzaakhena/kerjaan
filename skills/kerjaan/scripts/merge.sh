#!/usr/bin/env bash
#
# Brings the work of a ticket done in its own worktree back into main, so that
# what lands on main is exactly what was tested and reviewed: the ticket's
# change together with everything main already holds.
#
# Why this script exists: two tickets worked side by side are each tested and
# reviewed on their own. Two changes that pass alone can break each other once
# both are on main — one renames something the other still uses — and git
# merges them without a word. So nothing from a branch reaches main until it
# has been tested with all of main inside it:
#
#   1. The worker brings main into its branch (`sync`), in its own worktree,
#      resolves any conflict there, runs test-run.sh, and commits.
#   2. The move to review is refused until the branch holds all of main's code
#      and the latest test run passed on exactly the branch's content
#      (`check`, called by update-ticket.sh). The reviewer therefore judges
#      what main will get.
#   3. Once the reviewer has passed it — or the owner accepted it over a
#      second rejection — the foreman lands it (`land`), one ticket at a time. If main's code moved meanwhile, the ticket goes back
#      to in_progress to be brought up to date and reviewed again; nothing
#      untested reaches main. Anything else that stops the merge holds this one
#      ticket for the owner, and every other ticket carries on.
#
# "Main" is the branch the main tree has checked out. Commits that touch only
# `.kerjaan/` do not count as main having moved: the board is committed on
# main all the time, and a ticket moving folders changes no code.
#
# Usage:
#   merge.sh sync <id>        in the ticket's worktree: merge main into its branch
#   merge.sh check <id>       is the branch ready to be reviewed and landed?
#   merge.sh land <id>        from the main tree: merge a ticket in done/ into main
#   merge.sh resolution <id>  what changed since the previous review, beyond
#                             what merging main brought in by itself
#
# Exit status: 0 done or ready; 1 held for the owner, or refused; 2 usage;
# 3 main moved (land: a merge postponed, the ticket is back in in_progress);
# 4 not tested.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  cat >&2 <<USAGE
Usage: merge.sh sync <id>
       merge.sh check <id> [--gate]
       merge.sh land <id>
       merge.sh resolution <id>

  sync        run in the ticket's worktree: merge the main branch into the
              ticket's branch. Conflicts are left for the worker to resolve.
  check       READY when the branch holds all of main's code and the latest
              test run passed on exactly its content; STALE or UNTESTED
              otherwise. --gate prints the record update-ticket.sh keeps.
  land        run from the main tree, for a ticket in done/: merge its branch
              into main, one merge at a time, then remove its worktree and
              branch. MERGE POSTPONED sends the ticket back to in_progress
              (no rejection, no new round); HELD keeps
              it for the owner, with the reason in its Notes. Each note it
              writes in the ticket is committed at once, on its own.
  resolution  the diff between merging main into the commit reviewed last
              time and the branch now: the part the review after a merge
              postponed has to read.
USAGE
  exit 2
}

[ "$#" -ge 2 ] || usage
cmd="$1"
id="$2"
shift 2
gate=0
case "$cmd:${1:-}" in
  check:--gate) gate=1; shift ;;
esac
[ "$#" -eq 0 ] || usage

kerjaan_is_id "$id" || { echo "'$id' is not a 12-digit ticket ID." >&2; exit 2; }

git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not inside a git repository." >&2; exit 2; }
main_tree="$(kerjaan_main_tree)"
board="$main_tree/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $main_tree" >&2; exit 2; }
settings="$board/settings.md"

linked=0
kerjaan_in_linked_worktree && linked=1

ticket="$(kerjaan_find_ticket "$board" "$id")" || exit 2
branch="$(kerjaan_ticket_branch "$id")" \
  || { echo "More than one branch carries $id:" >&2; git for-each-ref --format='  %(refname:short)' refs/heads | grep -F "$id" >&2; exit 2; }

# The branch the main tree has checked out; empty on a detached HEAD.
main="$(git -C "$main_tree" symbolic-ref -q --short HEAD || true)"

now() { date '+%Y-%m-%d %H:%M:%S'; }

# Code files main changed since <branch> last took main in, `.kerjaan/` left
# out. Empty means the branch holds all of main's code.
stale_files() {
  local base
  base="$(git merge-base "$main" "$branch")" || { echo "(no common history with $main)"; return 0; }
  git -C "$main_tree" diff --name-only "$base" "$main" -- . ':(exclude).kerjaan'
}

# The commit the latest move to review recorded for this ticket's branch.
reviewed_commit() {
  grep -E '^- [0-9-]+ [0-9:]+: review covers branch ' "$ticket" | tail -1 \
    | sed -nE 's/.* review covers branch [^ ]+ at ([0-9a-f]{40}),.*/\1/p' || true
}

case "$cmd" in
  # ---------------------------------------------------------------------------
  sync)
    [ "$linked" -eq 1 ] || {
      echo "Run sync inside the ticket's worktree, not the main tree: it merges main" >&2
      echo "into the ticket's branch, and conflicts are resolved where the work is." >&2
      exit 1
    }
    current="$(git symbolic-ref -q --short HEAD || true)"
    case "$current" in
      *"$id"*) ;;
      *) echo "This worktree is on '${current:-a detached HEAD}', not on a branch carrying $id." >&2; exit 1 ;;
    esac
    [ -n "$main" ] || { echo "The main tree ($main_tree) is on no branch, so there is no main to merge." >&2; exit 1; }
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
      echo "REFUSED: this worktree has changes that are not committed. Commit them" >&2
      echo "first, so the merge and your own work stay apart in the history." >&2
      exit 1
    fi
    if git merge-base --is-ancestor "$main" HEAD; then
      echo "UP TO DATE: $current already holds all of $main."
      exit 0
    fi
    log="$(mktemp)"
    trap 'rm -f "$log"' EXIT
    if git merge --no-edit "$main" > "$log" 2>&1; then
      echo "MERGED: $main is merged into $current without conflicts."
      echo "Run test-run.sh now: what goes to review must be tested in this state."
      exit 0
    fi
    conflicts="$(git diff --name-only --diff-filter=U)"
    if [ -n "$conflicts" ]; then
      echo "CONFLICT: merging $main into $current stopped on these files:"
      printf '%s\n' "$conflicts" | sed 's/^/  /'
      echo "Resolve them here, git add them, and git commit --no-edit; then run"
      echo "test-run.sh. Resolving is part of this ticket's work."
      exit 1
    fi
    cat "$log" >&2
    echo "FAILED: git could not merge $main into $current; see above." >&2
    exit 1
    ;;

  # ---------------------------------------------------------------------------
  check)
    say() { if [ "$gate" -eq 1 ]; then echo "$@" >&2; else echo "$@"; fi; }
    if [ -z "$branch" ]; then
      say "NOTHING SEPARATE: no branch carries $id; its work is in the main tree."
      exit 0
    fi
    [ -n "$main" ] || { say "The main tree ($main_tree) is on no branch, so there is no main to compare with."; exit 1; }
    if git merge-base --is-ancestor "$branch" "$main"; then
      say "NOTHING SEPARATE: $branch is already part of $main."
      exit 0
    fi
    stale="$(stale_files)"
    if [ -n "$stale" ]; then
      say "STALE: $main has changed since $branch last took it in:"
      say "$(printf '%s\n' "$stale" | sed 's/^/  /')"
      say "Bring it up to date in the ticket's worktree with merge.sh sync $id,"
      say "resolve any conflict, run test-run.sh, and commit."
      exit 3
    fi
    test_command="$(kerjaan_setting "$settings" test_command)"
    tested="no test_command is set, so nothing was tested"
    if [ -n "$test_command" ]; then
      if ! evidence="$("$here/test-run.sh" --check "$id" "$branch" 2>&1)"; then
        say "UNTESTED: the latest test run does not cover $branch as committed:"
        say "$(printf '%s\n' "$evidence" | sed 's/^/  /')"
        say "Run test-run.sh in the worktree after the last change, and commit everything it ran on."
        exit 4
      fi
      tested="the latest test run passed on exactly this content"
    fi
    tip="$(git rev-parse "$branch^{commit}")"
    mhash="$(git rev-parse "$main^{commit}")"
    say "READY: $branch at ${tip:0:12} holds all of $main's code, and $tested."
    if [ "$gate" -eq 1 ]; then
      echo "- $(now): review covers branch $branch at $tip, which holds $main at $mhash (code outside .kerjaan/); $tested."
    fi
    exit 0
    ;;

  # ---------------------------------------------------------------------------
  land)
    # Tickets land from the main tree.
    kerjaan_refuse_linked_worktree 1
    cd "$main_tree"
    status="$(basename "$(dirname "$ticket")")"
    if [ "$status" != "done" ]; then
      echo "REFUSED: $id is in $status/. Only a ticket in done/ lands on main: passed by its reviewer, or accepted by the owner." >&2
      exit 2
    fi
    if [ -z "$branch" ]; then
      echo "NOTHING TO LAND: no branch carries $id; its work is already in the main tree."
      exit 0
    fi

    # Every note land writes into the ticket is committed at once, in a commit
    # of its own holding only the ticket's file, so land leaves the main tree
    # as clean as it found it. A note left uncommitted would sit in the main
    # tree until somebody noticed, and the next landing would have to work
    # around it. Only the ticket's own file goes in (both of its paths when it
    # moved): whatever else is uncommitted in the main tree — staged or not,
    # code or board — stays exactly as it was. When the ticket's file itself
    # already had uncommitted changes before land ran, the note cannot be
    # committed without them, so it is left beside them and the output says so.
    ticket_was_clean=0
    if [ -z "$(git status --porcelain --untracked-files=all -- "$ticket")" ] \
      && git ls-files --error-unmatch -- "$ticket" > /dev/null 2>&1; then
      ticket_was_clean=1
    fi
    save_note() {
      local now_file commit_log
      local -a paths
      if [ -z "$main" ]; then
        echo "NOTE NOT COMMITTED: the main tree is on no branch; the note in ${ticket#"$main_tree"/} is left uncommitted."
        return 0
      fi
      if [ "$ticket_was_clean" -ne 1 ]; then
        echo "NOTE NOT COMMITTED: ${ticket#"$main_tree"/} already had uncommitted changes before land ran,"
        echo "so its note is left uncommitted with them; commit them together."
        return 0
      fi
      now_file="$(kerjaan_ticket_file "$board" "$id" || true)"
      paths=("$ticket")
      if [ -n "$now_file" ] && [ "$now_file" != "$ticket" ]; then
        paths+=("$now_file")
        git add -- "$now_file" > /dev/null 2>&1 || true
      fi
      if commit_log="$(git commit -q --only -m "$1" -- "${paths[@]}" 2>&1)"; then
        echo "Note committed: $(git log -1 --format='%h %s')"
      else
        echo "WARNING: the note in the ticket could not be committed; commit it by hand:"
        printf '%s\n' "$commit_log" | sed 's/^/  /'
      fi
    }

    # The owner is told through the ticket and through this output; the
    # ticket stays in done/, and the start gate in update-ticket.sh lets other
    # tickets go on past its branch.
    #
    # Each note and the update-ticket.sh run after it are made under the board
    # lock (lib.sh), so a ticket being moved from elsewhere at that moment
    # cannot write its copy back over the note.
    held() {
      kerjaan_board_lock "$board" "merge.sh land $id recording a held merge"
      kerjaan_append_note "$ticket" "- $(now): merge held for the owner — $1"
      (cd "$main_tree" && "$here/update-ticket.sh" "$id" > /dev/null 2>&1) || true
      kerjaan_lock_release board
      save_note "Board: $id merge held for the owner"
      echo "HELD: ticket $id was not merged into ${main:-main} and waits for the owner."
      echo "Reason: $1"
      echo "Only this ticket waits; tickets that do not depend on it carry on."
      exit 1
    }
    # A merge postponed: main moved, or the branch changed after its review. The
    # ticket goes back to its worker, and through review again, without the
    # owner. No rejection: the review after it has no round number.
    postpone() {
      kerjaan_board_lock "$board" "merge.sh land $id sending it back"
      kerjaan_append_note "$ticket" "- $(now): merge postponed — $1; back to in_progress to be brought up to date with $main, tested and reviewed again."
      if ! (cd "$main_tree" && "$here/update-ticket.sh" "$id" --status in_progress > /dev/null); then
        held "it had to go back to in_progress ($1), but the move was refused"
      fi
      kerjaan_lock_release board
      save_note "Board: $id back to in_progress, merge postponed"
      echo "MERGE POSTPONED: ticket $id was not merged into $main, and is in in_progress again."
      echo "Reason: $1."
      echo "Its worker brings $main in (merge.sh sync $id), tests, commits and moves it to review; the review after a merge postponed is level quick, gets no round number, and is no rejection."
      exit 3
    }

    [ -n "$main" ] || held "the main tree is on no branch (a detached HEAD), so there is no main to merge into"

    trap 'kerjaan_lock_release board; kerjaan_lock_release merge' EXIT
    kerjaan_lock_acquire merge "merge.sh land $id"

    tip="$(git rev-parse "$branch^{commit}")"
    if git merge-base --is-ancestor "$tip" HEAD; then
      echo "ALREADY IN $main: $branch is part of it."
    else
      stale="$(stale_files)"
      [ -z "$stale" ] || postpone "$main changed since $branch last took it in ($(printf '%s' "$stale" | tr '\n' ' ' | sed 's/ $//'))"

      reviewed="$(reviewed_commit)"
      [ -n "$reviewed" ] || held "its Notes record no move to review covering a commit of $branch, so what the reviewer passed is not known"
      [ "$reviewed" = "$tip" ] \
        || postpone "$branch changed after it went to review (reviewed ${reviewed:0:12}, now ${tip:0:12})"

      test_command="$(kerjaan_setting "$settings" test_command)"
      carried="no test_command is set, so nothing was tested"
      if [ -n "$test_command" ]; then
        evidence="$("$here/test-run.sh" --check "$id" "$branch" 2>&1)" \
          || held "the latest test run does not vouch for $branch as it stands: $(printf '%s' "$evidence" | tr '\n' ' ')"
        carried="tests carried from the run on this exact content, not run again"
      fi

      log="$(mktemp)"
      if ! git merge --no-ff --no-commit -m "Merge $branch into $main (ticket $id)" "$branch" > "$log" 2>&1; then
        git rev-parse -q --verify MERGE_HEAD > /dev/null && git merge --abort
        reason="$(tr '\n' ' ' < "$log" | sed 's/  */ /g; s/ $//')"
        rm -f "$log"
        held "git refused the merge: $reason"
      fi
      rm -f "$log"

      # What is about to be committed, compared with what was tested and
      # reviewed. Main moving between the check above and the merge — a commit
      # made by hand, say — is the case this catches.
      merged="$(kerjaan_tree_without_board "$(git write-tree)")"
      if [ "$merged" != "$(kerjaan_tree_without_board "$tip^{tree}")" ]; then
        git merge --abort
        stale="$(stale_files)"
        [ -z "$stale" ] || postpone "$main changed while the merge was being prepared ($(printf '%s' "$stale" | tr '\n' ' ' | sed 's/ $//'))"
        held "merging $branch into $main gives content that is not what was tested and reviewed"
      fi
      if ! commit_log="$(git commit -q --no-edit 2>&1)"; then
        git rev-parse -q --verify MERGE_HEAD > /dev/null && git merge --abort
        held "the merge commit failed: $(printf '%s' "$commit_log" | tr '\n' ' ')"
      fi
      landed="$(git rev-parse HEAD)"
      kerjaan_board_lock "$board" "merge.sh land $id recording the landing"
      kerjaan_append_note "$ticket" "- $(now): landed on $main as $landed, merging $branch at $tip; $carried."
      (cd "$main_tree" && "$here/update-ticket.sh" "$id" > /dev/null 2>&1) || true
      kerjaan_lock_release board
      echo "LANDED: ticket $id is in $main as ${landed:0:12}; $carried."
      save_note "Board: $id landed on $main as ${landed:0:12}"
    fi
    kerjaan_lock_release merge

    # Leftovers are removed outside the lock: a teardown may take minutes, and
    # the next ticket's merge need not wait for it.
    if git worktree list --porcelain | grep -qx "branch refs/heads/$branch"; then
      KERJAAN_BRANCH_DELETED_NEXT=1 "$here/worktree.sh" remove "$id" \
        || { echo "WARNING: the worktree of $branch was not removed; see above. Remove it, then: git branch -d $branch"; exit 0; }
    fi
    if git branch -d "$branch" > /dev/null 2>&1; then
      echo "Branch $branch is merged into $main and deleted."
    else
      echo "WARNING: branch $branch could not be deleted; delete it once it is not needed."
    fi
    exit 0
    ;;

  # ---------------------------------------------------------------------------
  resolution)
    records="$(grep -E '^- [0-9-]+ [0-9:]+: review covers branch ' "$ticket" || true)"
    if [ "$(printf '%s' "$records" | grep -c . || true)" -lt 2 ]; then
      echo "FIRST REVIEW: ticket $id has gone to review with a branch at most once, so"
      echo "there is no earlier review to compare with. Review the whole change."
      exit 0
    fi
    prev="$(printf '%s\n' "$records" | tail -2 | head -1 | sed -nE 's/.* at ([0-9a-f]{40}),.*/\1/p')"
    cur="$(printf '%s\n' "$records" | tail -1 | sed -nE 's/.* at ([0-9a-f]{40}),.*/\1/p')"
    mcur="$(printf '%s\n' "$records" | tail -1 | sed -nE 's/.* which holds [^ ]+ at ([0-9a-f]{40}) .*/\1/p')"
    for c in "$prev" "$cur" "$mcur"; do
      git cat-file -e "$c^{commit}" 2> /dev/null \
        || { echo "Commit ${c:-?} from the review records is not in this repository; review the whole change."; exit 1; }
    done
    # The last commit of main the branch took in.
    took="$(git merge-base "$cur" "$mcur")"

    # The automatic merge of main into the commit reviewed before is computed
    # in a throwaway clone that borrows this repository's objects, so nothing
    # here — no ref, index, worktree or object — is touched.
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    git clone -q --shared --no-checkout "$(cd "$(git rev-parse --git-common-dir)" && pwd)" "$tmp/c" 2> /dev/null
    (
      cd "$tmp/c"
      git -c advice.detachedHead=false checkout -q --detach "$prev"
      git -c user.name=kerjaan -c user.email=kerjaan@localhost merge -q --no-ff --no-commit "$took" > /dev/null 2>&1 || true
      git add -A
    )
    auto="$(git -C "$tmp/c" write-tree)"
    if [ -n "$branch" ] && [ "$(git rev-parse "$branch^{commit}")" != "$cur" ]; then
      echo "Note: $branch is no longer at ${cur:0:12}, the commit that went to review."
    fi
    echo "Since the review of ${prev:0:12}: merging $main as of ${took:0:12} into it by itself,"
    echo "conflict markers included, compared with ${cur:0:12}, the commit now in review."
    echo "This is what the worker changed beyond the automatic merge; .kerjaan/ left out."
    diff="$(git -C "$tmp/c" diff "$auto" "$cur" -- . ':(exclude).kerjaan')"
    if [ -z "$diff" ]; then
      echo "EMPTY: the branch is exactly the automatic merge; the worker changed no code."
    else
      printf '%s\n' "$diff"
    fi
    exit 0
    ;;

  *)
    usage
    ;;
esac
