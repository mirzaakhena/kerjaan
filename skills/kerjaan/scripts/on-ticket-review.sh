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

# The board belongs to the project this session is in. CLAUDE_PROJECT_DIR is
# the project root; the payload's cwd and $PWD cover the cases where the hook
# runs somewhere else, such as a sub-repo inside a larger workspace.
hook_cwd=$(printf '%s' "$payload" | jq -r '.cwd // ""' 2>/dev/null || printf '')

found=0
for root in "${CLAUDE_PROJECT_DIR:-}" "$hook_cwd" "$PWD"; do
  [ -n "$root" ] || continue
  if compgen -G "$root/.kerjaan/review/$id "*.md > /dev/null 2>&1; then
    found=1
    break
  fi
done
[ "$found" -eq 1 ] || exit 0

jq -n --arg id "$id" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: (
      "Ticket \($id) has just landed in .kerjaan/review/. Dispatch one " +
      "subagent right now with subagent_type \"kerjaan-reviewer\" and a " +
      "prompt containing the ticket ID \($id). That reviewer decides, and " +
      "moves the ticket to done/ or back to in_progress/ itself. Do not " +
      "review this ticket yourself, and do not wait for the reviewer to " +
      "finish — carry on with the next piece of work."
    )
  },
  systemMessage: ("Ticket \($id) entered review — dispatching a reviewer.")
}'
