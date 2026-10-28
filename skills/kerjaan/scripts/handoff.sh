#!/usr/bin/env bash
#
# The handoff before the context is summarized. The main session -- the
# foreman -- holds what the board does not: which workers and reviewers are
# running and their agent IDs, decisions the owner gave in conversation and
# nobody wrote into a ticket yet, reminders for the owner. When the
# conversation is summarized to make room, that detail can drop out of the
# summary. So, near the limit, the foreman writes it to .kerjaan/handoff.md in
# a fixed form, and right after the summary it reads that file first, carries
# on from it, and deletes it.
#
# Claude Code tells nobody how full the context is, and fires nothing at a
# given percentage. This hook works it out: the transcript records, with every
# answer of the model, the tokens that answer was given, which is how full the
# context was at that moment. It may lag a turn, so the reminder comes around
# the limit, a few percent either way.
#
# Usage:
#   handoff.sh template   print the form handoff.md is written in
#   handoff.sh            run as a hook (hooks/hooks.json), hook JSON on stdin:
#
#   UserPromptSubmit, PostToolUse: when the context has reached `handoff_at`
#     percent of the context window (settings.md; 80 by default), tell the
#     main session to write .kerjaan/handoff.md, or to rewrite it in place
#     when it exists. Told once at the limit, and again each time the context
#     has grown by another 5 points, so the file follows the work and stays
#     one file. Never inside a subagent: a worker's context is its own.
#   SessionStart with source "compact": the conversation has just been
#     summarized. When .kerjaan/handoff.md exists, its content goes into the
#     new context, with the instruction to act on it before anything else and
#     then delete it. A file already handed over once in this session and not
#     changed since is not handed over again as news: it is named as stale,
#     to be deleted.
#
# The context window the percentage is of: `context_window` in settings.md;
# else CLAUDE_CODE_AUTO_COMPACT_WINDOW, the window Claude Code itself
# summarizes at; else 200,000 under CLAUDE_CODE_DISABLE_1M_CONTEXT=1; else
# 1,000,000 for a model the transcript names as one with a 1M window (an
# `[1m]` ID, Opus 4.7 and later, Sonnet 5 and later, Haiku 5.5 and later,
# Fable), or once the context holds more than 200,000 tokens; else 200,000.
#
# handoff.md is kept out of git: before telling the session to write it, the
# hook adds it to the repository's own exclude file (.git/info/exclude),
# which is never committed, unless git ignores it already. No board script
# reads a file at the root of .kerjaan/ as a ticket, so the board, the queue
# check and the viewer pass over it.
#
# What was reminded and handed over is remembered per session under
# $KERJAAN_HOOK_STATE (default: $TMPDIR/kerjaan-review-hook), the folder the
# review hook uses, in files whose names start with a dot so they never meet
# an agent ID. That folder is made only at an absolute path whose parent
# exists; otherwise nothing is remembered, and the hook still answers.
#
# Anything that does not apply exits 0 and prints nothing: this hook runs with
# every prompt and every tool call.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

# How many points the context must grow past the last reminder before the
# next one.
STEP=5

template() {
  cat <<EOF
# Handoff

Written <date and time>, context at about <n>%. Read first after the summary,
acted on, then deleted. Not a ticket and not a status page: the board stays
the record. Write "none" under a heading with nothing to say.

## Agents running
- <ticket ID> — <worker | reviewer | planner> — agent <agent ID> — waiting for: <what its report or verdict should bring>

## Merge queue
The board holds it: \`"$here/merge.sh" queue\` lists it, front first. Not copied here.
Only what the board cannot show: <a land under way, a conflict being resolved, or none>

## Owner decisions not yet in a ticket
- <the decision, in the owner's words, and the ticket it belongs to>

## Questions waiting for the owner
- <ticket ID> #<n>: <the question>

## Reminders for the owner
- <what to tell or remind the owner, and when>

## Next steps
1. <the first thing to do after reading this>
EOF
}

case "${1:-}" in
  template) template; exit 0 ;;
  '') ;;
  *) sed -n '/^# Usage:/,/^#   UserPromptSubmit/p' "${BASH_SOURCE[0]}" | sed -e '$d' -e 's/^# \{0,1\}//' >&2; exit 2 ;;
esac

# --- as a hook ------------------------------------------------------------
# A machine without jq loses the reminder, never a tool call.
command -v jq > /dev/null 2>&1 || exit 0

payload=$(cat)
field() { printf '%s' "$payload" | jq -r "$1" 2>/dev/null || printf ''; }

event=$(field '.hook_event_name // ""')
[ -z "$(field '.agent_id // ""')" ] || exit 0

board=""
for root in "${CLAUDE_PROJECT_DIR:-}" "$(field '.cwd // ""')" "$PWD"; do
  [ -n "$root" ] || continue
  if [ -d "$root/.kerjaan" ]; then board="$(cd "$root/.kerjaan" && pwd)"; break; fi
done
[ -n "$board" ] || exit 0
file="$board/handoff.md"
settings="$board/settings.md"

safe() { printf '%s' "$1" | tr -cd 'A-Za-z0-9_-'; }
session=$(safe "$(field '.session_id // ""')")
[ -n "$session" ] || session=nosession
state_base="${KERJAAN_HOOK_STATE:-${TMPDIR:-/tmp}/kerjaan-review-hook}"
state_base="${state_base%/}"
state_dir="$state_base/$session"
reminded="$state_dir/.handoff-reminded"
delivered="$state_dir/.handoff-delivered"

# Keeps handoff.md out of git, in the repository's own exclude file. Losing
# this -- no git, an unwritable file -- costs nothing but the ignore.
ignore_handoff() {
  local repo common exclude
  repo="$(dirname "$board")"
  git -C "$repo" rev-parse --git-dir > /dev/null 2>&1 || return 0
  git -C "$repo" check-ignore -q --no-index -- .kerjaan/handoff.md 2> /dev/null && return 0
  common="$(git -C "$repo" rev-parse --git-common-dir 2> /dev/null)" || return 0
  case "$common" in /*) ;; *) common="$repo/$common" ;; esac
  exclude="$common/info/exclude"
  kerjaan_make_dir "$common/info" || return 0
  printf '%s\n' '/.kerjaan/handoff.md' >> "$exclude" 2> /dev/null || true
}

# The session's state folder, and the one above it, each made only where the
# folder above already exists (kerjaan_make_dir, lib.sh). A path refused there
# costs the memory of what was reminded or handed over, never the hook's
# answer.
make_state_dir() { kerjaan_make_dir "$state_base" && kerjaan_make_dir "$state_dir"; }

fingerprint() { cksum < "$1" | tr -s ' \t' ' '; }

emit() {
  jq -n --arg event "$1" --arg context "$2" --arg sys "$3" '{
    hookSpecificOutput: { hookEventName: $event, additionalContext: $context },
    systemMessage: $sys
  }'
}

# --- right after the summary ----------------------------------------------
if [ "$event" = "SessionStart" ]; then
  [ "$(field '.source // ""')" = compact ] || exit 0
  # The context starts again from the summary: the next reminder is the first.
  rm -f "$reminded"
  [ -f "$file" ] || exit 0
  ignore_handoff
  fp="$(fingerprint "$file")"
  if [ -f "$delivered" ] && [ "$(cat "$delivered")" = "$fp" ]; then
    emit SessionStart "$file is the handoff already handed over after an earlier summary in this session, unchanged since. It is stale: do not act on it again. Delete it now (rm \"$file\") and carry on from the board and the summary." \
      "kerjaan: stale handoff.md named for deletion."
    exit 0
  fi
  make_state_dir && printf '%s\n' "$fp" > "$delivered" 2> /dev/null || true
  size=$(wc -c < "$file" | tr -d ' ')
  if [ "$size" -le 8000 ]; then
    body="Its content, in full:

$(cat "$file")"
  else
    body="It is too long to quote here: read the whole file with the Read tool first."
  fi
  emit SessionStart "The conversation has just been summarized, and you wrote a handoff before it: $file. Before any other action, read it, and carry on from it: check each agent it lists and what you were waiting for from it, read the merge queue from the board (\"$here/merge.sh\" queue), record the owner's decisions it holds in their tickets, and keep its questions and reminders for the owner. Then delete it (rm \"$file\"): it is read once, and the board stays the record. $body" \
    "kerjaan: handoff.md handed to the session after the summary."
  exit 0
fi

# --- near the limit -------------------------------------------------------
case "$event" in UserPromptSubmit | PostToolUse) ;; *) exit 0 ;; esac
transcript=$(field '.transcript_path // ""')
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

# How full the context is: the tokens given to the main session's latest
# answer, counted from the last summary on. Only the end of the transcript is
# read; its first line may be cut, and a line still being written may be too,
# so a line that is not JSON is skipped.
read -r used model <<EOF_USED
$(tail -c 4000000 "$transcript" 2> /dev/null | jq -Rrn '
  reduce (inputs | fromjson? // empty | select(type == "object")) as $l ({used: 0, model: ""};
    if $l.type == "system" and $l.subtype == "compact_boundary" then .used = 0
    elif $l.type == "assistant" and ($l.isSidechain | not) and ($l.message.usage | type) == "object" then
      .used = ([$l.message.usage | .input_tokens, .cache_creation_input_tokens, .cache_read_input_tokens, .output_tokens]
               | map(numbers) | add // 0)
      | .model = ($l.message.model // .model)
    else . end)
  | "\(.used) \(if .model == "" then "-" else .model end)"' 2> /dev/null || echo "0 -")
EOF_USED
used=${used:-0}
case "$used" in *[!0-9]* | '') exit 0 ;; esac
[ "$used" -gt 0 ] || exit 0

at="$(kerjaan_handoff_at "$settings" 2> /dev/null || echo 80)"
window="$(kerjaan_context_window "$settings" 2> /dev/null || true)"
if [ -z "$window" ] && [ -n "${CLAUDE_CODE_AUTO_COMPACT_WINDOW:-}" ]; then
  window="$(kerjaan_token_count "$CLAUDE_CODE_AUTO_COMPACT_WINDOW" || true)"
fi
if [ -z "$window" ]; then
  if [ "${CLAUDE_CODE_DISABLE_1M_CONTEXT:-}" = 1 ]; then
    window=200000
  elif printf '%s' "$model" | grep -Eqi '\[1m\]|opus-4-([7-9]|[1-9][0-9])|opus-([5-9]|[1-9][0-9])([^0-9]|$)|sonnet-([5-9]|[1-9][0-9])([^0-9]|$)|haiku-5-([5-9]|[1-9][0-9])|haiku-([6-9]|[1-9][0-9])([^0-9]|$)|fable' \
       || [ "$used" -gt 200000 ]; then
    window=1000000
  else
    window=200000
  fi
fi
pct=$((used * 100 / window))

last=""
[ -f "$reminded" ] && last="$(tr -cd '0-9' < "$reminded")"
if [ "$pct" -lt "$at" ]; then
  # Below the limit again -- after a summary the transcript shows -- the next
  # crossing is a first reminder.
  [ -z "$last" ] || [ "$pct" -ge "$last" ] || rm -f "$reminded"
  exit 0
fi
if [ -n "$last" ] && [ "$pct" -lt $((last + STEP)) ]; then
  exit 0
fi
make_state_dir && printf '%s\n' "$pct" > "$reminded" 2> /dev/null || true
ignore_handoff

lead="The context is at about $pct% of its window (handoff_at is $at% in $settings; an estimate, it may be off by a few percent). It may be summarized soon, and what only this conversation holds would be lost."
if [ -f "$file" ]; then
  what="$file exists: rewrite it in place now with what holds at this moment, in the same form, keeping one file -- never a second one. Its form is printed by \"$here/handoff.sh\" template."
  sys="kerjaan: context at about $pct% — update handoff.md."
else
  what="Write $file now, in exactly this form (headings in English, the rest in the board's language):

$(template)"
  sys="kerjaan: context at about $pct% — write handoff.md."
fi
emit "$event" "$lead $what Then go on with the work. Right after the summary you will be handed this file: act on it first, then delete it. Git ignores it; do not commit it, and do not keep it once read." "$sys"
