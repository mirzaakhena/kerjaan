#!/usr/bin/env bash
#
# Which finished tickets have not reached a release yet.
#
# Why this script exists: a ticket can pass review, land on main, and still
# never be in effect for anyone who uses what the project ships — because what
# they run is the last release, not main. Nothing fails when that happens, so
# it is noticed only when someone wonders why a fix "did not work". The board
# knows which tickets are done, and git knows when the last release was made;
# this puts the two side by side, so the foreman can say so when the board goes
# quiet and offer a release.
#
# Usage:
#   release.sh unreleased     the tickets in done/ that no release carries yet
#
# What counts as the last release, the most recent of:
#   - the newest tag reachable from HEAD;
#   - the last commit that changed the version in a manifest at the repo root:
#     .claude-plugin/plugin.json, package.json, pyproject.toml or Cargo.toml.
# A ticket is carried by that release when it was already in done/ in the
# release's commit, or when the release commit's message names its ID (the
# ticket that made the release, and tickets that were finishing alongside it).
#
# Output, fixed English lines whatever the board's language:
#   LAST RELEASE: <short hash> <first line>     or  NO RELEASE: <why>
#   UNRELEASED: <n>                            or  UNRELEASED: none
#   <id> <title>                               one per ticket, oldest ID first;
#   <id> <title> (board only)                  board only = its commits changed
#                                              nothing outside .kerjaan/
# NO RELEASE means this project shows no sign of making releases, and there is
# nothing to remind anyone of. Exit 0 in every one of these cases; 2 on misuse.
# Run from the main tree, not from a linked worktree.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

usage() {
  sed -n '/^# Usage:/,/^# What counts/p' "${BASH_SOURCE[0]}" | sed -e '$d' -e 's/^# \{0,1\}//' >&2
  exit 2
}

[ "$#" -eq 1 ] && [ "$1" = unreleased ] || usage

git rev-parse --git-dir > /dev/null 2>&1 || {
  echo "Not inside a git repository: releases are read from git." >&2
  exit 2
}
kerjaan_refuse_linked_worktree 2
cd "$(git rev-parse --show-toplevel)"
board="$PWD/.kerjaan"
[ -d "$board" ] || { echo "No .kerjaan/ in $PWD" >&2; exit 2; }

if ! git rev-parse --verify -q HEAD > /dev/null; then
  echo "NO RELEASE: the repository has no commits yet"
  exit 0
fi

# --- the last release ----------------------------------------------------------
candidates=()

tag="$(git describe --tags --abbrev=0 HEAD 2> /dev/null || true)"
[ -z "$tag" ] || candidates+=("$(git rev-list -n 1 "$tag")")

# -G picks commits whose added or removed lines match: a changed version line
# shows up as one removed and one added. The commit that added the manifest
# counts too: a project's first version is a release of sorts.
manifest_release() { # <file> <regex for its version line>
  [ -f "$1" ] || return 0
  git log -1 --format=%H -G"$2" HEAD -- "$1"
}
for pair in \
  '.claude-plugin/plugin.json|"version"[[:space:]]*:' \
  'package.json|"version"[[:space:]]*:' \
  'pyproject.toml|^version[[:space:]]*=' \
  'Cargo.toml|^version[[:space:]]*='; do
  c="$(manifest_release "${pair%%|*}" "${pair#*|}")"
  [ -z "$c" ] || candidates+=("$c")
done

if [ "${#candidates[@]}" -eq 0 ]; then
  echo "NO RELEASE: no tag, and no version in .claude-plugin/plugin.json, package.json, pyproject.toml or Cargo.toml"
  exit 0
fi

# The newest of them. Every candidate is reachable from HEAD, so the one that
# has all the others as ancestors is the latest; with history that branched,
# the latest by commit date stands in.
release=""
for c in "${candidates[@]}"; do
  newest=1
  for o in "${candidates[@]}"; do
    git merge-base --is-ancestor "$o" "$c" || { newest=0; break; }
  done
  [ "$newest" -eq 0 ] || { release="$c"; break; }
done
[ -n "$release" ] || release="$(git rev-list --no-walk=sorted --max-count=1 "${candidates[@]}")"

# The first line only: a release message may run its summary straight on.
echo "LAST RELEASE: $(git log -1 --format=%h "$release") $(git log -1 --format=%B "$release" | head -1)"

# --- what it carries -------------------------------------------------------------
released="$({
  git ls-tree --name-only "$release" .kerjaan/done/ 2> /dev/null | sed 's|^\.kerjaan/done/||'
  git log -1 --format=%B "$release"
} | grep -oE '(^|[^0-9])[0-9]{12}([^0-9]|$)' | grep -oE '[0-9]{12}' | sort -u || true)"

lines=()
for f in "$board"/done/*.md; do
  [ -e "$f" ] || continue
  name="$(basename "$f" .md)"
  id="${name%% *}"
  kerjaan_is_id "$id" || continue
  printf '%s\n' "$released" | grep -qx "$id" && continue
  if [ -z "$(kerjaan_changed_files "$id" HEAD)" ]; then
    lines+=("$name (board only)")
  else
    lines+=("$name")
  fi
done

if [ "${#lines[@]}" -eq 0 ]; then
  echo "UNRELEASED: none"
else
  echo "UNRELEASED: ${#lines[@]}"
  printf '%s\n' "${lines[@]}" | sort
fi
