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
#   test-run.sh --review <id> [--dir <path>] [-- <command>...]
#                                     the reviewer's run: test_command, or the
#                                     command given, in <path> (a clean export,
#                                     say) or this tree; takes its turn like
#                                     any other run, and records nothing
#
# --check writes nothing to the repository: the objects it builds go to a
# temporary directory, which is what lets the reviewer use it.
#
# Runs from several worktrees of one repository take turns. Worktrees separate
# files, but not the ports, local databases, fixed temp paths and caches a
# test suite tends to use, so two suites running at once can fail each other
# with nothing wrong in either. A run therefore waits for the `tests` lock
# (lib.sh), held by at most one run in the whole repository, and the recorded
# line says how long it waited, up to test_lock_timeout seconds (default 3600);
# past that it gives up, naming the run it waited for, and runs nothing. The
# result is written into the ticket under the board lock (lib.sh), like every
# other change to the board. A board whose tests are safe side by side sets
# `parallel_tests: true` in settings.md, and the lock is skipped. The
# reviewer's runs (--review) wait for the same lock: a reviewer's suite
# running beside a worker's shares exactly what two workers' suites would.
#
# While a run goes, the viewer can show it (viewer/runs.mjs): what it has
# printed so far, how long it has run, and when it last printed. What the
# command prints still reaches stdout and stderr as before; a copy goes to
# <git common dir>/kerjaan-progress/<id>.<pid>.log, beside <id>.<pid>.json
# saying whose run it is. The worker's runs and the reviewer's (--review) are
# copied alike. Both files are removed when the run ends, passed or failed:
# nothing is kept. Under .git/ they are never committed and stay outside the
# fingerprint. The exit status is still the command's own: the copy is made by
# process substitutions beside the command, never by a pipe whose status could
# stand in for the command's. Making the copy is best-effort: when it cannot
# be made, the run goes exactly as it would without it.
#
# The run's tests may also report one by one, for the viewer's list of them:
# the test command's reporter writes each test's start and end to the file
# KERJAAN_TEST_REPORT names, <id>.<pid>.tests beside the other two, removed
# with them. The format, and how a project connects its test tool, are in
# SETTINGS.md, "Reporting each test to the board"; reporters/node.mjs
# connects `node --test`. Nothing here reads that file, so what a reporter writes, or
# fails to, never changes the run's exit status or its fingerprint.
#
# The test command sees, in its environment:
#   KERJAAN_TICKET     the ticket ID given to this script
#   KERJAAN_SLOT       0 in the main tree; 1, 2, ... in linked worktrees, never
#                      the same for two worktrees that exist at once
#   KERJAAN_WORKTREE   the top of the tree being tested
#   KERJAAN_MAIN_TREE  the top of the main tree, where the board lives
#   KERJAAN_TEST_REPORT  the file the tests report to one by one, or empty
#                      when the run's progress cannot be shown
#   KERJAAN_NODE_REPORTER  the path of reporters/node.mjs, the connector
#                      for `node --test`, in this copy of kerjaan

set -euo pipefail

usage() {
  cat >&2 <<USAGE
Usage: test-run.sh <id>
       test-run.sh --check <id> [<rev>]
       test-run.sh --review <id> [--dir <path>] [-- <command>...]

  <id>      12-digit ticket ID
  <rev>     the commit or branch under review; omitted, the working tree of the
            current directory is compared instead

Without --check: runs test_command from .kerjaan/settings.md at the top of the
current git tree, then appends the run and its content fingerprint to the
ticket's Notes. Exits with the test command's own status.

With --check: prints SAME, DIFFERENT (with the files), or NO EVIDENCE.
Exit status 0, 1 and 2 respectively. Writes nothing to the repository.

With --review: the reviewer's run. Runs test_command, or the command after
--, in <path> or at the top of the current tree, waiting for the same test
lock as every other run unless parallel_tests is true. Run it from inside the
repository even when <path> is outside it. Records nothing; exits with the
command's own status.
USAGE
  exit 2
}

check=0
review=0
review_dir=""
review_cmd=""
case "${1:-}" in
  --check) check=1; shift ;;
  --review) review=1; shift ;;
esac
[ "$#" -ge 1 ] || usage
id="$1"
rev="${2:-}"
if [ "$review" -eq 1 ]; then
  shift
  rev=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --dir) [ "$#" -ge 2 ] || usage; review_dir="$2"; shift 2 ;;
      --) shift; [ "$#" -ge 1 ] || usage; review_cmd="$*"; break ;;
      *) usage ;;
    esac
  done
else
  [ "$check" -eq 1 ] || [ "$#" -eq 1 ] || usage
  [ "$#" -le 2 ] || usage
fi

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

kerjaan_is_id "$id" || { echo "'$id' is not a 12-digit ticket ID." >&2; exit 2; }

git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not inside a git repository." >&2; exit 2; }

# The tree whose content is fingerprinted is the one this command runs in, which
# may be a linked worktree. The board, however, has one home: the main
# worktree, listed first by git (see references/parallel-work.md).
top="$(git rev-parse --show-toplevel)"
cd "$top"
main_tree="$(kerjaan_main_tree)"
board="$main_tree/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $main_tree" >&2; exit 2; }

ticket="$(kerjaan_find_ticket "$board" "$id")" || exit 2

test_command="$(kerjaan_setting "$board/settings.md" test_command)"

tmpdir="$(mktemp -d)"
progress=""
progress_end() {
  [ -z "$progress" ] || rm -f "$progress.json" "$progress.log" "$progress.tests" "$progress.tmp" 2> /dev/null || true
  progress=""
}
trap 'progress_end; rm -rf "$tmpdir"' EXIT

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
  kerjaan_tree_without_board "$(GIT_INDEX_FILE="$idx" git write-tree)"
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
    target="$(kerjaan_tree_without_board "$rev^{tree}")"
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
[ -n "$review_cmd" ] && test_command="$review_cmd"
if [ -z "$test_command" ]; then
  echo "test_command is empty in $board/settings.md; there is nothing to run." >&2
  echo "Fill it in, or run the project's checks by hand and say so in the ticket." >&2
  exit 2
fi

slot="$(kerjaan_slot)"
holder="ticket $id, slot $slot, $top"
if [ "$review" -eq 1 ]; then
  run_dir="${review_dir:-$top}"
  [ -d "$run_dir" ] || { echo "No directory $run_dir" >&2; exit 2; }
  run_dir="$(cd "$run_dir" && pwd)"
  holder="the reviewer of ticket $id, in $run_dir"
fi
waited_note=""
case "$(kerjaan_setting "$board/settings.md" parallel_tests)" in
  true | yes) ;;
  *)
    trap 'progress_end; kerjaan_lock_release tests; rm -rf "$tmpdir"' EXIT
    if ! kerjaan_lock_acquire tests "$holder" "$(kerjaan_lock_timeout "$board" test_lock_timeout 3600)"; then
      echo "Nothing was run. The limit is test_lock_timeout in $board/settings.md." >&2
      exit 2
    fi
    if [ -n "$KERJAAN_LOCK_WAITED" ]; then
      waited_note=" Waited $(( KERJAAN_LOCK_WAITED / 60 ))m$(( KERJAAN_LOCK_WAITED % 60 ))s for the test lock first, held by another run (${KERJAAN_LOCK_HOLDER:-unknown})."
      echo "Got the test lock after waiting ${KERJAAN_LOCK_WAITED}s." >&2
    fi
    ;;
esac

export KERJAAN_TICKET="$id" KERJAAN_SLOT="$slot" KERJAAN_WORKTREE="$top" KERJAAN_MAIN_TREE="$main_tree"
export KERJAAN_NODE_REPORTER="$here/reporters/node.mjs" KERJAAN_TEST_REPORT=""

# The copy of the output, for the viewer (see the top of this file).
progress_start() {  # <who: worker | reviewer>
  local dir f pid
  # The folder is checked before anything in it is touched: a path refused by
  # kerjaan_make_dir (lib.sh) -- output cut short can leave text in front of
  # it -- is never built or cleaned, and the run goes on without a copy.
  dir="$(cd "$(git rev-parse --git-common-dir)" 2> /dev/null && pwd -P)" || return 0
  dir="$dir/kerjaan-progress"
  kerjaan_make_dir "$dir" || return 0
  # Files left by a run that was killed before it could remove them: every
  # <id>.<pid>.<kind> whose pid is no longer alive, whatever its kind, since a
  # run killed half-way may leave any of them without the others.
  for f in "$dir"/*.*.*; do
    [ -e "$f" ] || continue
    case "$f" in *.json | *.log | *.tests | *.tmp) ;; *) continue ;; esac
    pid="${f%.*}"
    pid="${pid##*.}"
    case "$pid" in '' | *[!0-9]*) continue ;; esac
    kill -0 "$pid" 2> /dev/null || rm -f "$f"
  done
  progress="$dir/$id.$$"
  rm -f "$progress.tests" 2> /dev/null || true
  if ! { : > "$progress.log"; } 2> /dev/null \
      || ! printf '{"ticket":"%s","pid":%s,"who":"%s","startedAt":%s000,"command":"%s"}\n' \
        "$id" "$$" "$1" "$(date +%s)" "$(json_text "$test_command")" > "$progress.tmp" 2> /dev/null \
      || ! mv "$progress.tmp" "$progress.json" 2> /dev/null; then
    rm -f "$progress.tmp" "$progress.log" 2> /dev/null || true
    progress=""
  fi
  # Where the tests report one by one; empty when there is no copy, so a value
  # inherited from an outer run is never written to.
  export KERJAAN_TEST_REPORT="${progress:+$progress.tests}"
  return 0
}
# A string as JSON may hold it between quotes: control characters become
# spaces, backslashes and quotes are escaped.
json_text() {
  printf '%s' "$1" | LC_ALL=C tr '\000-\037' ' ' | sed 's/\\/\\\\/g; s/"/\\"/g'
}
# Runs `bash -c "$test_command"` in <dir>, its output copied as it comes, and
# returns the command's own status: the copies run beside it, so neither their
# failure nor their status can stand in for it. Then waits, a few seconds at
# most, for the copies to pass on what they still hold, so the command's last
# lines come out before this script's own; a process the command left behind,
# still holding its output open, does not keep the run waiting longer.
run_command() {  # <dir>
  local code i=0
  if [ -z "$progress" ]; then
    (cd "$1" && bash -c "$test_command")
    return
  fi
  (cd "$1" && bash -c "$test_command") \
    > >(tee -a "$progress.log"; : > "$tmpdir/copied.out") \
    2> >(tee -a "$progress.log" >&2; : > "$tmpdir/copied.err")
  code=$?
  while [ "$i" -lt 100 ] && { [ ! -e "$tmpdir/copied.out" ] || [ ! -e "$tmpdir/copied.err" ]; }; do
    sleep 0.05
    i=$((i + 1))
  done
  return "$code"
}

# The reviewer's run proves nothing to anyone but the reviewer, so it leaves no
# record: the ticket's latest run stays the worker's, which --check compares.
if [ "$review" -eq 1 ]; then
  export KERJAAN_WORKTREE="$run_dir"
  progress_start reviewer
  start="$SECONDS"
  set +e
  run_command "$run_dir"
  code=$?
  set -e
  progress_end
  elapsed=$(( SECONDS - start ))
  echo "Reviewer's run in $run_dir: \`$test_command\` exited $code after $(( elapsed / 60 ))m$(( elapsed % 60 ))s.$waited_note" >&2
  exit "$code"
fi

# Taken after the wait, so content changed while waiting is not mistaken for
# content changed by the run.
before="$(worktree_fingerprint before)"
progress_start worker
start="$SECONDS"
set +e
run_command "$top"
code=$?
set -e
progress_end
elapsed=$(( SECONDS - start ))
after="$(worktree_fingerprint after)"

duration="$(( elapsed / 60 ))m$(( elapsed % 60 ))s"
now="$(date '+%Y-%m-%d %H:%M:%S')"

if [ "$before" = "$after" ]; then
  note="- $now: test run — \`$test_command\` exited $code after $duration, on content fingerprint $after (the same before and after the run; .kerjaan/ left out).$waited_note"
else
  changed="$(git diff-tree -r --no-renames --name-only "$before" "$after" | tr '\n' ' ' | sed 's/ $//')"
  note="- $now: test run — \`$test_command\` exited $code after $duration, but the content changed during the run ($changed), so it vouches for no version.$waited_note"
  echo "The content changed while the checks ran: $changed" >&2
  echo "This run is recorded but proves nothing. If the run itself writes these" >&2
  echo "files, add them to .gitignore; otherwise stop editing and run again." >&2
fi

# Written word for word: --check compares the command in it with settings.md.
#
# Under the board lock, held across the note and the refresh of `updated`: a
# worker or the foreman may be moving this very ticket from the main tree at
# the moment a run in a worktree finishes, and update-ticket.sh writes back the
# copy it read. The ticket is looked up again inside the lock, since it may
# have changed folders while the tests ran. Should the wait run out, the result
# is still printed below, so the run is not lost to the person watching.
trap 'progress_end; kerjaan_lock_release board; kerjaan_lock_release tests; rm -rf "$tmpdir"' EXIT
if ! kerjaan_board_lock_try "$board" "test-run.sh $id recording its result"; then
  echo "The run was not recorded in $id; this is its result:" >&2
  echo "$note" >&2
  exit 2
fi
ticket="$(kerjaan_ticket_file "$board" "$id" || true)"
[ -n "$ticket" ] || { echo "Ticket $id disappeared during the run; nothing recorded." >&2; echo "$note" >&2; exit 2; }
kerjaan_append_note "$ticket" "$note"
# A ticket at the front of the merge queue, back in in_progress to be brought
# up to date, whose run fails leaves the queue at once, so the ticket behind it
# need not wait for the fix (lib.sh, "the merge queue"). Once it passes review
# again it joins at the back.
left_queue=0
if [ "$code" -ne 0 ] && [ "$(basename "$(dirname "$ticket")")" = in_progress ] \
    && [ -n "$(kerjaan_queue_number "$ticket")" ]; then
  kerjaan_queue_leave "$ticket" "its test run failed (exit $code)"
  left_queue=1
fi
(cd "$main_tree" && "$here/update-ticket.sh" "$id" > /dev/null)
kerjaan_lock_release board

echo "$note" >&2
if [ "$left_queue" -eq 1 ]; then
  echo "MERGE QUEUE: $id left the merge queue because this run failed; once fixed and passed again, it joins at the back." >&2
  kerjaan_queue_next "$board" "$here" >&2
fi
exit "$code"
