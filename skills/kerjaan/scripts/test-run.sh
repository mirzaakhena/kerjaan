#!/usr/bin/env bash
#
# Runs the board's test_command and records in a ticket exactly which content
# it ran against, so the reviewer can confirm the same content is under review
# without running the whole suite a second time.
#
# Why this script exists: the worker runs the checks before handing a ticket
# over, and the reviewer used to run them again on the same content. The second
# run adds nothing but a wait, and during that wait the worker may not touch
# the code under test. A commit name cannot prove "same content": checks are
# usually run before committing, so a run names the commit before the one under
# review, and files not yet added to git leave no trace at all. What is compared
# instead is a fingerprint of the content itself.
#
# The fingerprint is the git tree of every file in the working tree — tracked,
# and untracked but not ignored — with `.kerjaan/` left out, so moving or
# editing tickets never changes it. Ignored files are outside it, exactly as
# they are outside every commit.
#
# Usage:
#   test-run.sh <id>                  run test_command, record the run in <id>
#   test-run.sh --check <id> [<rev>]  compare the recorded run with <rev>,
#                                     or with this working tree when omitted
#
# --check writes nothing to the repository: the objects it builds go to a
# temporary directory, which is what lets the reviewer use it.

set -euo pipefail

usage() {
  cat >&2 <<USAGE
Usage: test-run.sh <id>
       test-run.sh --check <id> [<rev>]

  <id>      12-digit ticket ID
  <rev>     the commit or branch under review; omitted, the working tree of the
            current directory is compared instead

Without --check: runs test_command from .kerjaan/settings.md at the top of the
current git tree, then appends the run and its content fingerprint to the
ticket's Notes. Exits with the test command's own status.

With --check: prints SAME, DIFFERENT (with the files), or NO EVIDENCE.
Exit status 0, 1 and 2 respectively. Writes nothing to the repository.
USAGE
  exit 2
}

check=0
if [ "${1:-}" = "--check" ]; then
  check=1
  shift
fi
[ "$#" -ge 1 ] || usage
id="$1"
rev="${2:-}"
[ "$check" -eq 1 ] || [ "$#" -eq 1 ] || usage
[ "$#" -le 2 ] || usage

case "$id" in
  [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;;
  *) echo "'$id' is not a 12-digit ticket ID." >&2; exit 2 ;;
esac

here="$(cd "$(dirname "$0")" && pwd)"

git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not inside a git repository." >&2; exit 2; }

# The tree whose content is fingerprinted is the one this command runs in, which
# may be a linked worktree. The board, however, has one home: the main
# worktree, listed first by git (see references/parallel-work.md).
top="$(git rev-parse --show-toplevel)"
cd "$top"
main_tree="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
board="$main_tree/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $main_tree" >&2; exit 2; }

ticket=""
for f in "$board"/*/"$id "*.md; do
  [ -e "$f" ] || continue
  [ -z "$ticket" ] || { echo "ID $id is used by more than one ticket; see references/repairs.md." >&2; exit 2; }
  ticket="$f"
done
[ -n "$ticket" ] || { echo "No ticket with ID $id." >&2; exit 2; }

test_command=""
if [ -f "$board/settings.md" ]; then
  test_command="$(awk '
    $0 == "---" { fence++; next }
    fence == 1 && /^test_command:/ { sub(/^test_command:[[:space:]]*/, ""); print; exit }
  ' "$board/settings.md" | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")"
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Drops `.kerjaan` from the top level of a tree and prints the resulting tree.
# The board always sits at the repository root, so one level is enough.
without_board() {
  git ls-tree "$1" | awk -F '\t' '$2 != ".kerjaan"' | git mktree
}

# Fingerprint of the working tree. A private index, seeded from the real one so
# unchanged files are not rehashed, takes in every change git would see with
# `git add -A`; the real index is never touched. Entries outside a sparse
# checkout stay as the index has them, which keeps a worktree that leaves
# `.kerjaan/` out comparable with the main tree.
worktree_fingerprint() {
  local idx="$tmpdir/index.$1" real_index
  real_index="$(git rev-parse --git-path index)"
  [ -f "$real_index" ] && cp "$real_index" "$idx"
  if ! GIT_INDEX_FILE="$idx" git add -A > "$tmpdir/add.log" 2>&1; then
    cat "$tmpdir/add.log" >&2
    echo "Could not read the working tree into a fingerprint." >&2
    exit 2
  fi
  without_board "$(GIT_INDEX_FILE="$idx" git write-tree)"
}

# ---------------------------------------------------------------------------
# --check: compare the recorded run with the version under review
# ---------------------------------------------------------------------------
if [ "$check" -eq 1 ]; then
  no_evidence() {
    echo "NO EVIDENCE: $*"
    echo "Run the checks as usual."
    exit 2
  }

  # Only the latest run counts: a later run supersedes every earlier one.
  record="$(grep -E '^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]{8}: test run — ' "$ticket" | tail -1 || true)"
  [ -n "$record" ] || no_evidence "ticket $id records no test run."

  when="$(printf '%s' "$record" | sed -E 's/^- ([0-9-]+ [0-9:]+): .*/\1/')"
  printf '%s\n' "$record" | grep -q 'content changed during the run' \
    && no_evidence "the latest run ($when) saw the content change while it ran."
  recorded_cmd="$(printf '%s' "$record" | sed -E 's/^[^`]*`(.*)` exited [0-9]+ .*/\1/')"
  code="$(printf '%s' "$record" | sed -nE 's/.*` exited ([0-9]+) .*/\1/p')"
  fp="$(printf '%s' "$record" | sed -nE 's/.*fingerprint ([0-9a-f]{40,64}).*/\1/p')"
  [ -n "$fp" ] && [ -n "$code" ] || no_evidence "the latest run ($when) could not be read: $record"
  [ -n "$test_command" ] || no_evidence "test_command is empty in .kerjaan/settings.md."
  [ "$recorded_cmd" = "$test_command" ] \
    || no_evidence "the latest run ($when) ran \`$recorded_cmd\`, but test_command is now \`$test_command\`."
  [ "$code" = "0" ] || no_evidence "the latest run ($when) exited $code."

  # Everything built from here on lands in a throwaway object store that falls
  # back on the repository's own, so the reviewer changes nothing in the repo.
  objects="$(cd "$(git rev-parse --git-path objects)" && pwd)"
  export GIT_OBJECT_DIRECTORY="$tmpdir/objects"
  export GIT_ALTERNATE_OBJECT_DIRECTORIES="$objects"
  mkdir -p "$GIT_OBJECT_DIRECTORY"

  if [ -n "$rev" ]; then
    git rev-parse --verify -q "$rev^{tree}" > /dev/null || no_evidence "'$rev' is not a commit or branch here."
    target="$(without_board "$rev^{tree}")"
    label="$rev ($(git rev-parse --short "$rev^{commit}" 2> /dev/null || echo tree))"
  else
    target="$(worktree_fingerprint check)"
    label="the working tree at $top"
  fi

  if [ "$target" = "$fp" ]; then
    echo "SAME: $label has exactly the content the run of $when tested, .kerjaan/ aside."
    echo "\`$test_command\` exited 0 on it; it need not be run again."
    exit 0
  fi

  echo "DIFFERENT: $label is not the content the run of $when tested."
  if git cat-file -e "$fp^{tree}" 2> /dev/null; then
    echo "Files that differ (as the run saw them -> as they are now):"
    git diff-tree -r --no-renames --name-status "$fp" "$target" | sed 's/^/  /'
  else
    echo "The run's snapshot is not in this repository, so the files cannot be listed."
  fi
  exit 1
fi

# ---------------------------------------------------------------------------
# Record: run test_command between two fingerprints
# ---------------------------------------------------------------------------
if [ -z "$test_command" ]; then
  echo "test_command is empty in $board/settings.md; there is nothing to run." >&2
  echo "Fill it in, or run the project's checks by hand and say so in the ticket." >&2
  exit 2
fi

before="$(worktree_fingerprint before)"
start="$SECONDS"
set +e
bash -c "$test_command"
code=$?
set -e
elapsed=$(( SECONDS - start ))
after="$(worktree_fingerprint after)"

duration="$(( elapsed / 60 ))m$(( elapsed % 60 ))s"
now="$(date '+%Y-%m-%d %H:%M:%S')"

if [ "$before" = "$after" ]; then
  note="- $now: test run — \`$test_command\` exited $code after $duration, on content fingerprint $after (the same before and after the run; .kerjaan/ left out)."
else
  changed="$(git diff-tree -r --no-renames --name-only "$before" "$after" | tr '\n' ' ' | sed 's/ $//')"
  note="- $now: test run — \`$test_command\` exited $code after $duration, but the content changed during the run ($changed), so it vouches for no version."
  echo "The content changed while the checks ran: $changed" >&2
  echo "This run is recorded but proves nothing. If the run itself writes these" >&2
  echo "files, add them to .gitignore; otherwise stop editing and run again." >&2
fi

# Notes is always the last section of a ticket.
if [ "$(awk 'NF { last = $0 } END { print last }' "$ticket")" = "(none yet)" ]; then
  awk -v note="$note" '{ lines[NR] = $0; if (NF) lastnf = NR }
    END { for (i = 1; i <= NR; i++) print (i == lastnf ? note : lines[i]) }' "$ticket" > "$tmpdir/ticket"
  cat "$tmpdir/ticket" > "$ticket"
else
  printf '%s\n' "$note" >> "$ticket"
fi
(cd "$main_tree" && "$here/update-ticket.sh" "$id" > /dev/null)

echo "$note" >&2
exit "$code"
