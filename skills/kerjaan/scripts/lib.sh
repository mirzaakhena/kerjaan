# shellcheck shell=bash
#
# The work every kerjaan board script does the same way, written once: each
# piece below is the only place that does it, so the scripts cannot drift
# apart (tests/shared-library.test.mjs holds them to that). Sourced, never run:
#
#   . "$(dirname "$0")/lib.sh"
#
# What lives here:
#   KERJAAN_STATUSES                   the six status folders, in board order
#   KERJAAN_FENCE                      the line that opens or closes a fenced block
#   KERJAAN_SIZE_ACCEPTED              the sentence --accept-size writes
#   kerjaan_is_id <word>               is it a 12-digit ticket ID
#   kerjaan_is_status <word>           is it one of the six statuses
#   kerjaan_tidy_title <title>         a title fit for a file name
#   kerjaan_main_tree                  the main worktree, where the board lives
#   kerjaan_in_linked_worktree         does this command run in a linked worktree
#   kerjaan_refuse_linked_worktree <status>  exit when it does, saying why
#   kerjaan_field <file> <key>         one value from a file's frontmatter
#   kerjaan_setting <file> <key>       the same, read from settings.md
#   kerjaan_setting_list <file> <key>  a [a, b] value, one item per line
#   kerjaan_blockers <file>            the IDs in a ticket's blocked_by
#   kerjaan_lock_acquire <name> <who>  wait for a named lock shared by every
#   kerjaan_lock_release <name>        worktree of this repository, then hold it
#   kerjaan_board_lock <board> <who>   the lock every write to the board takes
#   kerjaan_lock_timeout <board> <key> <default>  how long a wait may last
#   kerjaan_slot                       this worktree's slot number
#   kerjaan_ticket_file <board> <id> [<status>]  the ticket's path
#   kerjaan_find_ticket <board> <id>   the same, or the reason it has none
#   kerjaan_ticket_arg <board> <id|path>  a ticket named on a command line
#   kerjaan_next_id <board> <minute>   the next free ID in a minute
#   kerjaan_ticket_branch <id>         the branch carrying the ticket's ID
#   kerjaan_tree_without_board <tree>  a tree with .kerjaan/ left out
#   kerjaan_append_note <file> <note>  a line at the end of ## Notes
#   kerjaan_history_line <time> <st>   one ## History line, naming the session
#   kerjaan_merge_state <file>         held / postponed / landed (merge.sh)
#   kerjaan_estimate <file>            the files a ticket is estimated to change
#   kerjaan_estimate_kind <file>       paths / none / nothing: was one recorded
#   kerjaan_questions <file>           every question asked, numbered for answering
#   kerjaan_code_rev <id>              where the ticket's commits are read from
#   kerjaan_changed_files <id> <rev>   files outside .kerjaan/ its commits changed
#
# Why locks and slots live together: both are shared by every worktree of one
# repository, so both are kept in git's common directory — the one `.git`
# every linked worktree points back to. Nothing is kept in `.kerjaan/`, which
# would turn bookkeeping into commits, and nothing in /tmp, which two clones of
# the same project would share by mistake.

# --- words every script uses the same way ----------------------------------------

KERJAAN_STATUSES=(backlog todo in_progress review done cancel)

# A line starting with either of these opens a fenced block, and the next one
# starting with either closes it. Lines inside are examples or quotes, never
# records or headings, and every script skips them the same way. Used in awk
# as `-v fence="$KERJAAN_FENCE"` and `$0 ~ fence`; it holds no backslash, so
# -v hands it over unchanged.
KERJAAN_FENCE='^(```|~~~)'

# The sentence `update-ticket.sh --accept-size` writes after the time stamp,
# and the only one that stops ticket-size.sh from warning: a line that merely
# mentions an acceptance, or denies one, is not the owner's decision.
KERJAAN_SIZE_ACCEPTED="size accepted by the owner with --accept-size: this ticket stays whole although its \"Done when\" list is over the board's limit."

kerjaan_is_id() {
  case "$1" in
    [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) return 0 ;;
    *) return 1 ;;
  esac
}

kerjaan_is_status() {
  local s
  for s in "${KERJAAN_STATUSES[@]}"; do
    [ "$s" = "$1" ] && return 0
  done
  return 1
}

# "/" and newlines break file names, so they become spaces. Runs of spaces are
# collapsed so file names never contain gaps that make searching awkward.
kerjaan_tidy_title() {
  printf '%s' "$1" | tr '\n/' '  ' | sed -e 's/  */ /g' -e 's/^ //' -e 's/ $//'
}

# --- where the board lives --------------------------------------------------------
# The board lives inside the repository, so every worktree checks out its own
# copy of `.kerjaan/`. Treating that copy as a board forks the one guarantee
# the format makes: a ticket has exactly one status, held by exactly one
# folder. Nothing about that failure is loud — two boards simply start
# disagreeing, and both look perfectly normal. Its one home is the main
# worktree, which git always lists first.

kerjaan_main_tree() {
  git worktree list --porcelain | sed -n '1s/^worktree //p'
}

# A linked worktree is recognised by the marker git puts in its git dir: a
# `gitdir` file, which the main repository's `.git` never has. Comparing the
# output of `--git-dir` against `--git-common-dir` looks like the obvious test
# and is wrong — from a subdirectory git answers one of them absolutely and the
# other relatively, so an ordinary repo would be accused of being a worktree.
# Outside git there is no worktree at all.
kerjaan_in_linked_worktree() {
  local gitdir
  gitdir="$(git rev-parse --git-dir 2> /dev/null)" || return 1
  [ -f "$gitdir/gitdir" ]
}

# Exits with <status> (default 1), saying where to run instead, when this
# command runs in a linked worktree; returns quietly anywhere else.
kerjaan_refuse_linked_worktree() {
  kerjaan_in_linked_worktree || return 0
  echo "This is a linked git worktree, and the board does not live here." >&2
  echo "Acting on the copy of .kerjaan/ in a worktree forks the board: one" >&2
  echo "ticket ends up with two different statuses, and nothing reports it." >&2
  echo "Run $(basename "$0") from the main tree instead:" >&2
  echo "  $(kerjaan_main_tree)" >&2
  exit "${1:-1}"
}

# --- frontmatter --------------------------------------------------------------------

# Prints the value of <key> from the first frontmatter block of <file>, with
# surrounding quotes and trailing spaces removed. Prints nothing when the file
# or the key is missing. A ticket's fields and the board's settings are read
# alike.
kerjaan_field() {
  [ -f "$1" ] || return 0
  awk -v key="$2" '
    $0 == "---" { if (++fence == 2) exit; next }
    fence == 1 && index($0, key ":") == 1 { sub(/^[^:]*:[[:space:]]*/, ""); print; exit }
  ' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

kerjaan_setting() {
  kerjaan_field "$@"
}

# Prints the items of a list setting written `key: [a, "b", 'c/*']`, one per
# line, each trimmed and unquoted. Prints nothing for an empty list, a missing
# key, or a value that is not written as a list.
kerjaan_setting_list() {
  local v
  v="$(kerjaan_field "$1" "$2")"
  case "$v" in \[*\]) ;; *) return 0 ;; esac
  v="${v#\[}"
  v="${v%\]}"
  printf '%s\n' "$v" | tr ',' '\n' \
    | sed -e 's/^[[:space:]"'"'"']*//' -e 's/[[:space:]"'"'"']*$//' -e '/^$/d'
}

# --- how far the chain runs ------------------------------------------------
# Two settings bound the foreman's chain (SETTINGS.md): `chain` says where it
# stops for the owner, and `max_parallel` how many tickets run side by side,
# each in its own linked worktree. Both are read here, so worktree.sh, which
# enforces the limit, and queue.sh check, which reports a value it cannot
# read, read them alike.

# Prints the `chain` setting of <settings>: queue, group or ticket; empty or
# missing is queue. Any other value is named on stderr, and returns 2.
kerjaan_chain_mode() {
  local v
  v="$(kerjaan_setting "$1" chain)"
  case "$v" in
    '') echo queue ;;
    queue | group | ticket) echo "$v" ;;
    *)
      echo "chain in settings.md is '$v': write queue, group or ticket, or leave it empty (queue)." >&2
      return 2
      ;;
  esac
}

# Prints the `max_parallel` setting of <settings>: a whole number from 1 up,
# or nothing when it is empty or missing (no limit). Any other value is named
# on stderr, and returns 2.
kerjaan_max_parallel() {
  local v
  v="$(kerjaan_setting "$1" max_parallel)"
  case "$v" in
    *[!0-9]* | 0*)
      echo "max_parallel in settings.md is '$v': write a whole number from 1 up, or leave it empty (no limit)." >&2
      return 2
      ;;
  esac
  [ -z "$v" ] || echo "$v"
}

# Prints how many linked worktrees may exist at once under <settings>:
# `max_parallel`, or 1 under `chain: ticket` (one ticket at a time, even
# inside a group); nothing when there is no limit. Returns 2 when either
# setting cannot be read.
kerjaan_parallel_limit() {
  local v mode
  v="$(kerjaan_max_parallel "$1")" || return 2
  mode="$(kerjaan_chain_mode "$1")" || return 2
  if [ "$mode" = ticket ]; then
    echo 1
  elif [ -n "$v" ]; then
    echo "$v"
  fi
}

# Prints the ticket IDs in the blocked_by field of ticket <file>, one per line.
kerjaan_blockers() {
  kerjaan_field "$1" blocked_by | grep -oE '[0-9]{12}' || true
}

# --- locks -----------------------------------------------------------------
# A lock is a directory: `mkdir` either creates it or fails, atomically, on
# every filesystem git runs on, so it needs no flock(1), which macOS lacks.
# Inside it, `owner` holds the holder's PID and a line describing it for
# whoever has to wait.
#
# A holder that dies without releasing — killed, or the machine slept and was
# rebooted — leaves the directory behind. A waiter that finds the holder's PID
# gone breaks the lock, under a second, short-lived lock so that two waiters
# cannot both break it and the second remove the first one's fresh claim.
#
# A holder that is alive but stuck is another matter: no PID check can tell it
# from one that is merely slow. So a wait has a limit, and a waiter that
# reaches it gives up with a message naming the holder, instead of everyone
# behind it waiting in silence. The limits are settings (see below).
#
# A lock is held by a process and everything it runs: a script that holds the
# `board` lock and runs update-ticket.sh, which takes the same lock, must not
# wait for itself. KERJAAN_HELD_LOCKS, exported to children, lists the locks
# this process tree holds, one `<lock dir>=<pid>` per line (a path may hold
# spaces); a child finding its lock there, still owned by that live PID, goes
# ahead without taking it again, and its release leaves it alone.

kerjaan_locks_dir() {
  local common
  if ! common="$(git rev-parse --git-common-dir 2> /dev/null)"; then
    # A board outside any git repository: nothing is committed there, so the
    # board folder itself can hold the locks. Every script that writes the
    # board runs from the folder holding .kerjaan/.
    common="$(pwd -P)/.kerjaan/.locks"
    mkdir -p "$common"
    printf '%s\n' "$common"
    return 0
  fi
  common="$(cd "$common" && pwd -P)"  # physical: the same lock is one path from every tree
  mkdir -p "$common/kerjaan-locks"
  printf '%s\n' "$common/kerjaan-locks"
}

# Removes <lock> if its owner file still reads <seen>, i.e. nobody claimed it
# again since the waiter judged it dead.
kerjaan_lock_break() {
  local lock="$1" seen="$2" bpid
  if mkdir "$lock.break" 2> /dev/null; then
    printf '%s\n' "$$" > "$lock.break/pid"
    if [ "$(cat "$lock/owner" 2> /dev/null || true)" = "$seen" ]; then
      rm -rf "$lock"
    fi
    rm -rf "$lock.break"
  else
    # A breaker that itself died would block every waiter forever.
    bpid="$(cat "$lock.break/pid" 2> /dev/null || true)"
    if [ -n "$bpid" ] && ! kill -0 "$bpid" 2> /dev/null; then
      rm -rf "$lock.break"
    fi
  fi
}

# Waits until the lock called <name> is free, then holds it for this process.
# <who> describes the holder to anyone who has to wait. <timeout> is the most
# seconds to wait; empty or 0 waits for as long as it takes. Returns 1, having
# said who holds the lock, when the wait reached <timeout>. Afterwards:
#   KERJAAN_LOCK_WAITED  seconds spent waiting, empty when the lock was free
#   KERJAAN_LOCK_HOLDER  who held it when this process started waiting
# KERJAAN_LOCK_POLL sets the polling interval in seconds (default 1, or the
# <poll> given).
kerjaan_lock_acquire() {
  local name="$1" who="$2" limit="${3:-0}" poll="${KERJAAN_LOCK_POLL:-${4:-1}}"
  local lock owner pid start ownerless=0 waited=0 entry
  lock="$(kerjaan_locks_dir)/$name.lock"
  KERJAAN_LOCK_WAITED=""
  KERJAAN_LOCK_HOLDER=""
  case "$limit" in '' | *[!0-9]*) limit=0 ;; esac

  # Already held by the process tree this one runs in.
  while IFS= read -r entry; do
    [ "${entry%=*}" = "$lock" ] || continue
    pid="${entry##*=}"
    owner="$(cat "$lock/owner" 2> /dev/null || true)"
    if [ "${owner%%$'\t'*}" = "$pid" ] && kill -0 "$pid" 2> /dev/null; then
      return 0
    fi
  done <<< "${KERJAAN_HELD_LOCKS:-}"

  start="$SECONDS"
  while ! mkdir "$lock" 2> /dev/null; do
    owner="$(cat "$lock/owner" 2> /dev/null || true)"
    pid="${owner%%$'\t'*}"
    if [ -z "$owner" ]; then
      # Claimed a moment ago and the owner line not yet written — or claimed
      # by a process that died in between. Only the second lasts.
      ownerless=$(( ownerless + 1 ))
      if [ "$ownerless" -gt 10 ]; then
        kerjaan_lock_break "$lock" ""
        ownerless=0
        continue
      fi
    else
      ownerless=0
      if ! kill -0 "$pid" 2> /dev/null; then
        echo "The $name lock was left by process $pid, which no longer runs; taking it over." >&2
        kerjaan_lock_break "$lock" "$owner"
        continue
      fi
    fi
    if [ "$waited" -eq 0 ]; then
      waited=1
      KERJAAN_LOCK_HOLDER="${owner#*$'\t'}"
      echo "Waiting for the $name lock, held by ${KERJAAN_LOCK_HOLDER:-a process just starting}." >&2
    fi
    if [ "$limit" -gt 0 ] && [ $(( SECONDS - start )) -ge "$limit" ]; then
      if [ -n "$owner" ]; then
        echo "Gave up waiting for the $name lock after ${limit}s. It is held by ${owner#*$'\t'}" >&2
        echo "(process $pid, still running). If that process is stuck, stop it; its lock" >&2
        echo "is taken over as soon as it is gone. Otherwise try again once it finishes." >&2
      else
        echo "Gave up waiting for the $name lock after ${limit}s. It was claimed by a process" >&2
        echo "that never said who it is: $lock" >&2
      fi
      return 1
    fi
    sleep "$poll"
  done
  printf '%s\t%s\n' "$$" "$who" > "$lock/owner"
  KERJAAN_HELD_LOCKS="${KERJAAN_HELD_LOCKS:+$KERJAAN_HELD_LOCKS$'\n'}$lock=$$"
  export KERJAAN_HELD_LOCKS
  [ "$waited" -eq 0 ] || KERJAAN_LOCK_WAITED=$(( SECONDS - start ))
  return 0
}

# Releases the lock called <name>, but only when this process holds it — not
# when it only rode on a parent's.
kerjaan_lock_release() {
  local lock owner entry kept=""
  lock="$(kerjaan_locks_dir)/$1.lock"
  owner="$(cat "$lock/owner" 2> /dev/null || true)"
  [ "${owner%%$'\t'*}" = "$$" ] || return 0
  rm -rf "$lock"
  while IFS= read -r entry; do
    [ -z "$entry" ] || [ "$entry" = "$lock=$$" ] || kept="${kept:+$kept$'\n'}$entry"
  done <<< "${KERJAAN_HELD_LOCKS:-}"
  export KERJAAN_HELD_LOCKS="$kept"
  return 0
}

# The limits on waiting, in seconds, from <board>/settings.md:
#
#   lock_timeout       the `board` lock, held for the moment it takes to rewrite
#                      a ticket or order.md. Default 120: a wait that long means
#                      the holder is stuck, not busy.
#   test_lock_timeout  the `tests` lock (test-run.sh), held for a whole run of
#                      test_command. Default 3600: long enough for a slow suite
#                      to finish ahead of you, short enough that a hung one is
#                      reported within the hour.
#
# 0 waits without limit. A value that is not a whole number counts as missing.
kerjaan_lock_timeout() {
  local board="$1" key="$2" default="$3" v
  v="$(kerjaan_setting "$board/settings.md" "$key")"
  case "$v" in '' | *[!0-9]*) v="$default" ;; esac
  printf '%s\n' "$v"
}

# Takes the `board` lock: every change to a ticket file or to order.md is made
# under it, so two workers moving tickets at the same moment, or a test run
# recording its result while the ticket is being moved, cannot each read the
# file, change it, and write back over the other's change. <who> says what is
# being done, for whoever has to wait. Returns 1, having named the holder and
# the setting, when the wait reaches lock_timeout.
kerjaan_board_lock_try() {
  local board="$1" who="$2"
  kerjaan_lock_acquire board "$who, process $$" \
      "$(kerjaan_lock_timeout "$board" lock_timeout 120)" 0.1 && return 0
  echo "The limit is lock_timeout in $board/settings.md." >&2
  return 1
}

# The same, for a script that has changed nothing yet: exits it with <status>
# (default 2) when the wait runs out.
kerjaan_board_lock() {
  kerjaan_board_lock_try "$1" "$2" && return 0
  echo "Nothing was changed." >&2
  exit "${3:-2}"
}

# --- slots -------------------------------------------------------------------
# Every worktree of a repository gets a small number, its slot, so a project
# can give each one its own port, database name or cache folder. The main tree
# is always 0; a linked worktree gets the lowest number from 1 up that no other
# linked worktree holds.
#
# The number is stored in the linked worktree's private git directory
# (`.git/worktrees/<name>/kerjaan-slot`), not in the worktree itself: git
# deletes that directory when the worktree is removed or pruned, so a slot is
# freed exactly when its worktree stops existing, and no list kept elsewhere
# can go stale. Handing out numbers happens under the `slots` lock, so two
# worktrees created at the same moment cannot take the same one.
#
# A worktree made by hand rather than by worktree.sh gets its slot the first
# time one is asked for.

kerjaan_slot() {
  local gitdir common file n used
  gitdir="$(git rev-parse --absolute-git-dir)"
  common="$(git rev-parse --git-common-dir)"
  common="$(cd "$common" && pwd)"
  if [ "$gitdir" = "$common" ]; then
    echo 0
    return 0
  fi
  file="$gitdir/kerjaan-slot"
  n="$(cat "$file" 2> /dev/null || true)"
  case "$n" in
    '' | *[!0-9]*) ;;
    *) echo "$n"; return 0 ;;
  esac

  kerjaan_lock_acquire slots "slot assignment for $(git rev-parse --show-toplevel)" 2> /dev/null
  n="$(cat "$file" 2> /dev/null || true)"
  case "$n" in
    '' | *[!0-9]*)
      # No slot handed out yet is not an error: the glob then matches nothing.
      used=" $(cat "$common"/worktrees/*/kerjaan-slot 2> /dev/null | tr '\n' ' ' || true)"
      n=1
      while case "$used" in *" $n "*) true ;; *) false ;; esac; do
        n=$(( n + 1 ))
      done
      printf '%s\n' "$n" > "$file"
      ;;
  esac
  kerjaan_lock_release slots
  echo "$n"
}

# --- tickets, branches and merge records -------------------------------------
# Used by merge.sh, and by update-ticket.sh at the two gates that depend on
# where a ticket's branch stands: the move to review and the start of a ticket.

# Prints the path of every ticket carrying <id> on the board <board>, one per
# line: normally one or none. With <status>, only that folder is searched.
kerjaan_ticket_files() {
  local board="$1" id="$2" st="${3:-*}" f
  for f in "$board"/$st/"$id "*.md; do
    [ -e "$f" ] && printf '%s\n' "$f"
  done
  return 0
}

# Prints the path of the ticket with <id> on the board <board>, or nothing.
# Returns 2 when the ID is used by more than one ticket, printing nothing:
# taking the first of two would act on a ticket nobody chose. With <status>,
# only that folder is searched.
kerjaan_ticket_file() {
  local found
  found="$(kerjaan_ticket_files "$@")"
  case "$found" in *$'\n'*) return 2 ;; esac
  [ -z "$found" ] || printf '%s\n' "$found"
}

# Prints the path of the ticket with <id> on <board>. When there is none, says
# why on stderr and returns 1: <id> is no ticket ID, no ticket carries it, or
# more than one does -- then each of them is listed with the command that
# repairs it. The one lookup every script uses, so the same ID gets the same
# answer from all of them.
kerjaan_find_ticket() {
  local board="$1" id="$2" f rc=0
  if ! kerjaan_is_id "$id"; then
    echo "'$id' is not a 12-digit ticket ID." >&2
    return 1
  fi
  f="$(kerjaan_ticket_file "$board" "$id")" || rc=$?
  if [ "$rc" -eq 2 ]; then
    echo "ID $id is used by more than one ticket:" >&2
    kerjaan_ticket_files "$board" "$id" | sed 's/^/  /' >&2
    echo "Repair it first: $(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/repair.sh duplicate-id $id" >&2
    echo "(references/repairs.md in the kerjaan skill says what it does)." >&2
    return 1
  fi
  if [ -z "$f" ]; then
    echo "No ticket with ID $id." >&2
    return 1
  fi
  printf '%s\n' "$f"
}

# A ticket named on a command line, as an ID or as the path of its file:
# prints the file, or says why there is none and returns 1.
kerjaan_ticket_arg() {
  if [ -f "$2" ]; then
    printf '%s\n' "$2"
  elif kerjaan_is_id "$2"; then
    kerjaan_find_ticket "$1" "$2"
  else
    echo "'$2' is neither a 12-digit ID nor an existing file path." >&2
    return 1
  fi
}

# Prints the next free ID in <minute> (yymmddHHMM) on <board>: one more than
# the highest sequence number any ticket of that minute holds, searched across
# every status folder, so an ID is never reused after its ticket moved on.
# Returns 1, printing nothing, when the minute already holds 99. Run it under
# the board lock, and create the file before letting go of it, or two callers
# get the same number.
kerjaan_next_id() {
  local board="$1" minute="$2" f seq max=0
  for f in "$board"/*/"$minute"*.md; do
    [ -e "$f" ] || continue
    seq="$(basename "$f")"
    seq="${seq:10:2}"
    case "$seq" in
      [0-9][0-9]) [ "$((10#$seq))" -le "$max" ] || max="$((10#$seq))" ;;
    esac
  done
  [ "$max" -lt 99 ] || return 1
  printf '%s%02d\n' "$minute" "$((max + 1))"
}

# Prints the local branch whose name carries <id> (the only link between a
# branch and a ticket; see references/parallel-work.md), or nothing. Returns 2
# when more than one branch carries it.
kerjaan_ticket_branch() {
  local branches
  branches="$(git for-each-ref --format='%(refname:short)' refs/heads | grep -F "$1" || true)"
  [ -n "$branches" ] || return 0
  [ "$(printf '%s\n' "$branches" | wc -l | tr -d ' ')" -eq 1 ] || return 2
  printf '%s\n' "$branches"
}

# Prints <tree> with `.kerjaan` dropped from its top level, as a tree ID. The
# board always sits at the repository root, so one level is enough. Code is
# compared this way everywhere, because board moves are committed on main all
# the time and never change what the code does.
kerjaan_tree_without_board() {
  git ls-tree "$1" | awk -F '\t' '$2 != ".kerjaan"' | git mktree
}

# Appends <note> to the ticket <file>; Notes is always its last section. A
# Notes section holding only "(none yet)" has that line replaced.
#
# Free text reaches awk through the environment, never through `awk -v`: -v
# reads its value as a string literal, so `\d+` would become `d+` and `C:\temp`
# a tab. ENVIRON hands the bytes over untouched. Every awk in these scripts
# that carries text a person wrote follows the same rule.
kerjaan_append_note() {
  local file="$1" note="$2" tmp
  if [ "$(awk 'NF { last = $0 } END { print last }' "$file")" = "(none yet)" ]; then
    tmp="$(mktemp)"
    KERJAAN_NOTE="$note" awk '{ lines[NR] = $0; if (NF) lastnf = NR }
      END { for (i = 1; i <= NR; i++) print (i == lastnf ? ENVIRON["KERJAAN_NOTE"] : lines[i]) }' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    printf '%s\n' "$note" >> "$file"
  fi
}

# Prints one ## History line for a move into <status> at <time>:
#
#   - <time> <session-id> <status>   inside a Claude Code session
#   - <time> <status>                anywhere else
#
# The session is the one `claude --resume <session-id>` opens again, so the
# owner can go from any line back to the conversation that made the move.
# Claude Code hands it to every command it runs as CLAUDE_CODE_SESSION_ID, and
# a subagent (worker, reviewer) gets the same value as the main session that
# dispatched it -- that main session is the one with a transcript of its own,
# and the subagents' transcripts are kept inside it.
#
# A value that is empty, or holds anything but letters, digits and dashes, is
# left out rather than written: the status must stay the last word of the line,
# and an empty marker would read as a damaged line. Readers accept both forms.
kerjaan_history_line() {
  local sid="${CLAUDE_CODE_SESSION_ID:-}"
  case "$sid" in
    '' | *[!A-Za-z0-9-]*) printf -- '- %s %s\n' "$1" "$2" ;;
    *) printf -- '- %s %s %s\n' "$1" "$sid" "$2" ;;
  esac
}

# Prints where the ticket <file> stands with merge.sh land, from the last
# record land wrote into its Notes: `held` (waiting for the owner),
# `postponed` (sent back to be brought up to date), `landed`, or nothing when
# land never ran on it. The records are fixed English lines whatever the
# board's language, like test-run.sh's.
kerjaan_merge_state() {
  [ -f "$1" ] || return 0
  grep -E '^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9:]{8}: (merge held for the owner|merge postponed|landed on) ' "$1" \
    | tail -1 \
    | sed -E -e 's/^[^:]*:[0-9]{2}:[0-9]{2}: //' \
        -e 's/^merge held for the owner .*/held/' \
        -e 's/^merge postponed .*/postponed/' \
        -e 's/^landed on .*/landed/' \
    || true
}

# --- what the queue planner writes into a ticket ------------------------------
# Used by queue.sh, and by update-ticket.sh at the gate into todo. Both records
# are fixed English lines in ## Notes whatever the board's language, like
# test-run.sh's, so a script can find them; the prose around them is the
# board's own.
#
#   - 2026-10-16 11:40:00: files estimated to change: `src/a.js`, `docs/`
#   - 2026-10-16 11:40:00: files estimated to change: none
#   - 2026-10-16 11:40:00: open question: <the question, in the board's language>
#   - 2026-10-16 11:40:00: answered question: <the same question>
#     answer, 2026-10-16 12:05:10: <the owner's answer>
#
# Lines inside fenced blocks are examples, not records, and are skipped.

# Prints the body lines of ticket <file> that sit outside fenced blocks.
kerjaan_unfenced_lines() {
  awk -v fence="$KERJAAN_FENCE" '
    !body { if ($0 == "---" && ++fm == 2) body = 1; next }
    $0 ~ fence { infence = !infence; next }
    !infence { print }
  ' "$1"
}

# Prints the latest estimate in ticket <file>, one path per line; a path ending
# in "/" is a whole folder. Prints nothing when no estimate was recorded.
kerjaan_estimate() {
  [ -f "$1" ] || return 0
  kerjaan_unfenced_lines "$1" \
    | grep -E '^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: files estimated to change: ' \
    | tail -1 | grep -oE '`[^`]+`' | tr -d '`' || true
}

# Prints what the latest estimate in ticket <file> is: "paths" for a list of
# files, "none" for a ticket that changes no file of the project (a decision
# ticket, whose work is the conversation with the owner), and nothing when no
# estimate was recorded. kerjaan_estimate prints no path for "none", so such a
# ticket shares files with nobody.
kerjaan_estimate_kind() {
  [ -f "$1" ] || return 0
  kerjaan_unfenced_lines "$1" \
    | grep -E '^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: files estimated to change: ' \
    | tail -1 | sed -E -e 's/^.*: files estimated to change: //' -e 's/[ \t]+$//' \
    | awk '$0 == "none" { print "none" } /`[^`]+`/ { print "paths" }' || true
}

# Prints every question ever recorded in ticket <file>, numbered in the order
# asked, answered ones included, so a number never shifts when another is
# answered: "<n>\topen|answered\t<text>". That number is the one
# `queue.sh answer` takes, so every message that lists questions uses it.
kerjaan_questions() {
  [ -f "$1" ] || return 0
  kerjaan_unfenced_lines "$1" \
    | sed -nE 's/^- [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}: (open|answered) question: /\1\t/p' \
    | awk -F '\t' '{ print NR "\t" $1 "\t" substr($0, length($1) + 2) }'
}

# --- the code a ticket wrote ---------------------------------------------------
# A ticket's commits are the ones whose message names its ID — the skill
# requires that of every commit made for a ticket. Work on a branch carrying the ID that is not merged into HEAD
# yet is read from that branch.

# Prints the revision to read <id>'s commits from: HEAD, or refs/heads/<branch>.
kerjaan_code_rev() {
  local branch
  while IFS= read -r branch; do
    [ -n "$branch" ] || continue
    if ! git merge-base --is-ancestor "refs/heads/$branch" HEAD 2> /dev/null; then
      printf 'refs/heads/%s\n' "$branch"
      return 0
    fi
  done < <(git for-each-ref --format='%(refname:short)' refs/heads | grep -F "$1" || true)
  echo HEAD
}

# Prints, sorted, every file outside .kerjaan/ that a commit naming <id>
# changed, read from <rev>.
kerjaan_changed_files() {
  git rev-parse --verify -q HEAD > /dev/null 2>&1 || return 0
  git log --no-merges --format= --name-only -F --grep="$1" "$2" -- . ':(exclude).kerjaan' \
    | sed '/^$/d' | sort -u
}
