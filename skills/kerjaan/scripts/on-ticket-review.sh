#!/usr/bin/env bash
#
# PostToolUse hook for Bash. Registered by the plugin itself, via
# hooks/hooks.json, so it applies to every repo that uses a .kerjaan/ board
# without the user editing any settings file.
#
# When the command that just ran moved a ticket into the review folder, this
# hook injects an instruction into the session so a reviewer is dispatched
# immediately. A rule written in a CLAUDE.md is advice and can be missed; this
# hook is what makes the dispatch actually automatic.
#
# Two conditions must both hold before it fires:
#   1. the command text moves a ticket to `review`
#   2. the ticket file really is sitting in .kerjaan/review/ afterwards
# Condition (2) is what keeps an `echo`, a dry run, or a failed move from
# summoning a reviewer for a ticket that never arrived. It cannot rule out
# every false positive — a command that merely names a ticket already sitting
# in review/ still fires — but in that case a reviewer is what the board wants
# anyway, so the wrong answer is a harmless one.
#
# Anything that does not match must exit 0 and print nothing. A non-zero exit
# from a PostToolUse hook surfaces to the user as an error, and this hook runs
# alongside every ticket command there is.
#
# Reads the hook JSON on stdin, writes hook JSON to stdout only when it fires.

set -euo pipefail

# A machine without jq should lose the automation, not break every Bash call.
command -v jq > /dev/null 2>&1 || exit 0

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null || printf '')

case "$cmd" in
  *"update-ticket.sh"*"--status review"*) ;;
  *) exit 0 ;;
esac

# `|| true` matters: with `set -o pipefail`, a grep that finds nothing would
# otherwise abort the script with a non-zero status.
id=$(printf '%s' "$cmd" | grep -oE '[0-9]{12}' | head -1 || true)
[ -n "$id" ] || exit 0

# Where the board is. The session's cwd is the obvious guess and the wrong one
# to lean on: a `cd` written inside the command dies with that command, and a
# session can be rooted somewhere that has no board at all -- a bot's home
# folder, a workspace one directory up. All three roots below then point at the
# same boardless place and the hook goes quiet on a ticket that did arrive.
#
# What does know is the command's own output. update-ticket.sh prints the
# ticket's absolute destination path, so read that first and fall back to the
# roots only when the output was swallowed (redirected, piped, discarded).
ticket=""

stdout=$(printf '%s' "$payload" | jq -r '
  .tool_response
  | if type == "object" then (.stdout // "") else (. // "" | tostring) end
' 2>/dev/null || printf '')

# The path must be absolute, name this ticket, sit in review/, and really
# exist. A line that only mentions the ticket -- an echo, a log, a command
# repeated back -- fails the last test and summons nobody.
while IFS= read -r line; do
  line="${line%$'\r'}"
  case "$line" in
    /*"/.kerjaan/review/$id "*.md) ;;
    *) continue ;;
  esac
  [ -f "$line" ] || continue
  ticket="$line"
  break
done <<STDOUT
$stdout
STDOUT

if [ -z "$ticket" ]; then
  hook_cwd=$(printf '%s' "$payload" | jq -r '.cwd // ""' 2>/dev/null || printf '')
  for root in "${CLAUDE_PROJECT_DIR:-}" "$hook_cwd" "$PWD"; do
    [ -n "$root" ] || continue
    for f in "$root/.kerjaan/review/$id "*.md; do
      [ -f "$f" ] || continue
      ticket="$f"
      break 2
    done
  done
fi

[ -n "$ticket" ] || exit 0

# The reviewer may be dispatched from a session whose cwd is not the repo, so
# tell it where the board is instead of leaving it to search.
repo=$(dirname "$(dirname "$(dirname "$ticket")")")

jq -n --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: (
      "Ticket \($id) has just landed in .kerjaan/review/, on the board in " +
      "\($repo) -- the file is \($ticket). Dispatch one subagent right now " +
      "with subagent_type \"kerjaan-reviewer\" and a prompt naming that " +
      "repo and the ticket ID \($id). That reviewer decides, and " +
      "moves the ticket to done/ or back to in_progress/ itself. Do not " +
      "review this ticket yourself, and do not wait for the reviewer to " +
      "finish. Ticket \($id) is handed off now: stop changing the code it " +
      "covers, even to improve it, even to strengthen a test. Moving it here " +
      "was the claim that it is finished, and an edit made now is one the " +
      "reviewer judges without knowing it happened. If something genuinely " +
      "remains, move the ticket back to in_progress instead of working on it " +
      "where it is. Otherwise pick up a different ticket."
    )
  },
  systemMessage: ("Ticket \($id) entered review — dispatching a reviewer.")
}'
