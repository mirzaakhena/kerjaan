#!/usr/bin/env bash
#
# Creates and removes the git worktree a ticket is worked on when two tickets
# run side by side, so the steps that are easy to forget happen every time.
#
# Why this script exists: a worktree separates files and nothing else. What a
# fresh checkout lacks — the `.env` that is never committed, installed
# packages — makes its first test run fail for no reason in the code, and what
# the project keeps outside the repo — a test database, a cache folder — is
# shared with every other worktree unless each one is given its own. The board
# settings name one command to run when a worktree is made and one when it is
# removed; this script is where they run, so they cannot be skipped by
# creating or removing a worktree some other way it describes.
#
# Usage:
#   worktree.sh add <id> <path> [--branch <name>]
#       create <path> on branch tiket-<id> (or <name>, or the existing branch
#       carrying <id>), with .kerjaan/ left out of its checkout; give it a slot;
#       run worktree_setup inside it. When the setup fails, the worktree is
#       removed again (worktree_teardown included) and the exit status is 1.
#   worktree.sh remove <id|path>
#       run worktree_teardown inside the worktree, then remove it. Refused,
#       with nothing removed, when the worktree holds uncommitted changes or the
#       teardown fails. The branch is left alone: merging it is a decision.
#       merge.sh land sets KERJAAN_BRANCH_DELETED_NEXT=1 when it calls this,
#       because it deletes the merged branch right after; the message then
#       leaves the branch to land, which says what became of it.
#   worktree.sh slot
#       print the slot of the tree this runs in (0 for the main tree).
#
# Both commands run with, in their environment:
#   KERJAAN_TICKET     the ticket ID the worktree belongs to
#   KERJAAN_SLOT       the worktree's slot number (see lib.sh)
#   KERJAAN_WORKTREE   the worktree's top directory, also the working directory
#   KERJAAN_MAIN_TREE  the main tree, where `.env` and the board live

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  cat >&2 <<USAGE
Usage: worktree.sh add <id> <path> [--branch <name>]
       worktree.sh remove <id|path>
       worktree.sh slot

  add      create a worktree for ticket <id> at <path>, .kerjaan/ left out,
           and run worktree_setup from .kerjaan/settings.md inside it
  remove   run worktree_teardown inside the worktree, then remove it
  slot     print this tree's slot number: 0 in the main tree, 1, 2, ... in
           linked worktrees, never shared by two worktrees at once

add and remove run from the main tree.
USAGE
  exit 2
}

[ "$#" -ge 1 ] || usage
cmd="$1"
shift

git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not inside a git repository." >&2; exit 2; }

if [ "$cmd" = "slot" ]; then
  [ "$#" -eq 0 ] || usage
  kerjaan_slot
  exit 0
fi

# --- from the main tree only -------------------------------------------------
# Same test as update-ticket.sh: a linked worktree has a `gitdir` file in its
# private git directory, and the main repository never does.
main_tree="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
if [ -f "$(git rev-parse --git-dir)/gitdir" ]; then
  echo "This is a linked git worktree. Worktrees are created and removed from" >&2
  echo "the main tree, where the board lives:" >&2
  echo "  $main_tree" >&2
  exit 1
fi
cd "$main_tree"
board="$main_tree/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $main_tree" >&2; exit 2; }
settings="$board/settings.md"

is_id() {
  case "$1" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) return 0 ;;
    *) return 1 ;;
  esac
}

# Runs the setting named <key> inside <dir> for ticket <id>. Returns its status;
# an empty setting succeeds without running anything.
run_hook() {
  local key="$1" dir="$2" id="$3" command slot
  command="$(kerjaan_setting "$settings" "$key")"
  [ -n "$command" ] || return 0
  slot="$(cd "$dir" && kerjaan_slot)"
  echo "Running $key in $dir (ticket ${id:-none}, slot $slot): $command" >&2
  (
    cd "$dir"
    export KERJAAN_TICKET="$id" KERJAAN_SLOT="$slot" KERJAAN_WORKTREE="$dir" KERJAAN_MAIN_TREE="$main_tree"
    bash -c "$command"
  )
}

case "$cmd" in
  # -------------------------------------------------------------------------
  add)
    [ "$#" -ge 2 ] || usage
    id="$1"
    path="$2"
    shift 2
    branch=""
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --branch) [ "$#" -ge 2 ] || usage; branch="$2"; shift 2 ;;
        *) usage ;;
      esac
    done
    is_id "$id" || { echo "'$id' is not a 12-digit ticket ID." >&2; exit 2; }
    found=0
    for f in "$board"/*/"$id "*.md; do
      [ -e "$f" ] && found=1
    done
    [ "$found" -eq 1 ] || { echo "No ticket with ID $id." >&2; exit 2; }
    [ ! -e "$path" ] || { echo "$path already exists." >&2; exit 1; }

    # A ticket sent back from review may still have its branch: reuse it.
    if [ -z "$branch" ]; then
      branch="$(git for-each-ref --format='%(refname:short)' refs/heads | grep -F "$id" | head -1 || true)"
      [ -n "$branch" ] || branch="tiket-$id"
    fi
    # Two worktrees created at the same moment both write the shared
    # .git/config (the sparse checkout below), and git refuses the second
    # write rather than wait. The git steps therefore take turns; the setup,
    # which may take minutes, does not.
    trap 'kerjaan_lock_release worktrees' EXIT
    kerjaan_lock_acquire worktrees "worktree.sh add $id"
    created_branch=0
    if git show-ref --verify -q "refs/heads/$branch"; then
      git worktree add "$path" "$branch" >&2
    else
      git worktree add -b "$branch" "$path" >&2
      created_branch=1
    fi
    path="$(cd "$path" && pwd -P)"
    # The worktree must not carry a second copy of the board
    # (references/parallel-work.md, "The board has one home").
    git -C "$path" sparse-checkout set --no-cone '/*' '!/.kerjaan/' >&2

    slot="$(cd "$path" && kerjaan_slot)"
    kerjaan_lock_release worktrees

    if ! run_hook worktree_setup "$path" "$id"; then
      echo "worktree_setup failed in $path, so the worktree is not used." >&2
      echo "Removing it again, worktree_teardown included." >&2
      run_hook worktree_teardown "$path" "$id" \
        || echo "worktree_teardown failed too; check what the setup left behind." >&2
      kerjaan_lock_acquire worktrees "worktree.sh add $id, undoing"
      git worktree remove --force "$path" >&2
      if [ "$created_branch" -eq 1 ]; then
        git branch -D "$branch" > /dev/null
      fi
      kerjaan_lock_release worktrees
      echo "FAILED: no worktree for $id. Fix worktree_setup in .kerjaan/settings.md and run add again." >&2
      exit 1
    fi

    echo "Worktree for $id at $path, branch $branch, slot $slot." >&2
    printf '%s\n' "$path"
    ;;

  # -------------------------------------------------------------------------
  remove)
    [ "$#" -eq 1 ] || usage
    target="$1"
    path=""
    branch=""
    # Each record in the porcelain list is "worktree <path>", then "HEAD",
    # then "branch refs/heads/<name>" or "detached"; the first is the main tree.
    while IFS=$'\t' read -r wpath wbranch; do
      [ "$wpath" = "$main_tree" ] && continue
      if is_id "$target"; then
        case "$wbranch" in *"$target"*) path="$wpath"; branch="$wbranch" ;; esac
      elif [ -e "$target" ] && [ "$(cd "$target" && pwd -P)" = "$wpath" ]; then
        path="$wpath"
        branch="$wbranch"
      fi
    done < <(git worktree list --porcelain | awk '
      /^worktree / { if (p != "") print p "\t" b; p = substr($0, 10); b = "" }
      /^branch refs\/heads\// { b = substr($0, 19) }
      END { if (p != "") print p "\t" b }')
    [ -n "$path" ] || { echo "No linked worktree found for '$target'." >&2; exit 1; }

    id="$target"
    is_id "$id" || id="$(printf '%s' "$branch" | grep -oE '[0-9]{12}' | head -1 || true)"

    if [ -d "$path" ]; then
      # Checked before the teardown runs: data removed from a worktree that
      # then refuses to go is the worst of both.
      dirty="$(git -C "$path" status --porcelain)"
      if [ -n "$dirty" ]; then
        echo "REFUSED: $path holds changes that are not committed:" >&2
        printf '%s\n' "$dirty" | sed 's/^/  /' >&2
        echo "Commit them, or delete what is not needed. Files worktree_setup creates" >&2
        echo "(.env, installed packages) belong in .gitignore." >&2
        exit 1
      fi
      if ! run_hook worktree_teardown "$path" "$id"; then
        echo "REFUSED: worktree_teardown failed in $path; the worktree is kept so it" >&2
        echo "can be run again. Fix it and rerun: worktree.sh remove $target" >&2
        exit 1
      fi
      trap 'kerjaan_lock_release worktrees' EXIT
      kerjaan_lock_acquire worktrees "worktree.sh remove $target"
      git worktree remove "$path" >&2
      kerjaan_lock_release worktrees
    else
      # The folder is already gone, so there is nowhere to run the teardown.
      echo "$path no longer exists; worktree_teardown cannot run there." >&2
      echo "Clean up what it would have removed by hand (ticket ${id:-unknown})." >&2
      git worktree prune >&2
    fi
    if [ "${KERJAAN_BRANCH_DELETED_NEXT:-}" = "1" ]; then
      echo "Removed the worktree at $path." >&2
    else
      echo "Removed the worktree at $path.${branch:+ Branch $branch is kept; merge or delete it.}" >&2
    fi
    ;;

  *)
    usage
    ;;
esac
