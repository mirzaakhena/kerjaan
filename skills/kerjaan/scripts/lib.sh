# shellcheck shell=bash
#
# Shared pieces for the kerjaan scripts that deal with more than one working
# copy of a repo at once, and with bringing their work back to main. Sourced,
# never run:
#
#   . "$(dirname "$0")/lib.sh"
#
# What lives here:
#   kerjaan_setting <file> <key>       one value from settings.md's frontmatter
#   kerjaan_lock_acquire <name> <who>  wait for a named lock shared by every
#   kerjaan_lock_release <name>        worktree of this repository, then hold it
#   kerjaan_slot                       this worktree's slot number
#   kerjaan_ticket_file <board> <id>   the ticket's path
#   kerjaan_ticket_branch <id>         the branch carrying the ticket's ID
#   kerjaan_tree_without_board <tree>  a tree with .kerjaan/ left out
#   kerjaan_append_note <file> <note>  a line at the end of ## Notes
#   kerjaan_merge_state <file>         held / postponed / landed (merge.sh)
#
# Why locks and slots live together: both are shared by every worktree of one
# repository, so both are kept in git's common directory — the one `.git`
# every linked worktree points back to. Nothing is kept in `.kerjaan/`, which
# would turn bookkeeping into commits, and nothing in /tmp, which two clones of
# the same project would share by mistake.

# Prints the value of <key> from the first frontmatter block of <file>, with
# surrounding quotes and trailing spaces removed. Prints nothing when the file
# or the key is missing.
kerjaan_setting() {
  [ -f "$1" ] || return 0
  awk -v key="$2" '
    $0 == "---" { fence++; next }
    fence == 1 && index($0, key ":") == 1 { sub(/^[^:]*:[[:space:]]*/, ""); print; exit }
  ' "$1" | sed -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
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

kerjaan_locks_dir() {
  local common
  common="$(git rev-parse --git-common-dir)"
  common="$(cd "$common" && pwd)"
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
# <who> describes the holder to anyone who has to wait. Afterwards:
#   KERJAAN_LOCK_WAITED  seconds spent waiting, empty when the lock was free
#   KERJAAN_LOCK_HOLDER  who held it when this process started waiting
# KERJAAN_LOCK_POLL sets the polling interval in seconds (default 1).
kerjaan_lock_acquire() {
  local name="$1" who="$2" lock owner pid start ownerless=0 waited=0
  lock="$(kerjaan_locks_dir)/$name.lock"
  KERJAAN_LOCK_WAITED=""
  KERJAAN_LOCK_HOLDER=""
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
    sleep "${KERJAAN_LOCK_POLL:-1}"
  done
  printf '%s\t%s\n' "$$" "$who" > "$lock/owner"
  [ "$waited" -eq 0 ] || KERJAAN_LOCK_WAITED=$(( SECONDS - start ))
  return 0
}

# Releases the lock called <name>, but only when this process holds it.
kerjaan_lock_release() {
  local lock owner
  lock="$(kerjaan_locks_dir)/$1.lock"
  owner="$(cat "$lock/owner" 2> /dev/null || true)"
  [ "${owner%%$'\t'*}" = "$$" ] && rm -rf "$lock"
  return 0
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

# Prints the path of the ticket with <id> on the board <board>, or nothing.
# Returns 2 when the ID is used by more than one ticket.
kerjaan_ticket_file() {
  local board="$1" id="$2" f found=""
  for f in "$board"/*/"$id "*.md; do
    [ -e "$f" ] || continue
    [ -z "$found" ] || return 2
    found="$f"
  done
  [ -z "$found" ] || printf '%s\n' "$found"
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
kerjaan_append_note() {
  local file="$1" note="$2" tmp
  if [ "$(awk 'NF { last = $0 } END { print last }' "$file")" = "(none yet)" ]; then
    tmp="$(mktemp)"
    awk -v note="$note" '{ lines[NR] = $0; if (NF) lastnf = NR }
      END { for (i = 1; i <= NR; i++) print (i == lastnf ? note : lines[i]) }' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
  else
    printf '%s\n' "$note" >> "$file"
  fi
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
