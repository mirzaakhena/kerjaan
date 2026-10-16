#!/usr/bin/env bash
#
# Review hook. Registered by the plugin itself, via hooks/hooks.json, so it
# applies to every repo that uses a .kerjaan/ board without the user editing
# any settings file. One script, three events, one job: once a ticket is in
# review, the foreman -- the main session -- is told to get it a reviewer. A
# rule written in a CLAUDE.md is advice and can be missed; this hook is what
# makes the dispatch actually automatic.
#
#   PostToolUse on Bash: a command moved a ticket into .kerjaan/review/.
#     Run by the foreman itself, the hook tells it to dispatch the reviewer.
#     Run inside a subagent -- a worker handing its ticket over -- it tells
#     the worker to stop and report, and remembers that this agent moved this
#     ticket, so the reminder can follow the worker's report to the foreman.
#   PostToolUse on Agent: a worker run in the foreground has returned.
#   UserPromptSubmit: a <task-notification> arrived, the way a worker run in
#     the background -- or resumed with SendMessage -- reports that it ended.
#     In both cases, when that agent moved a ticket to review and the ticket
#     is still there, the foreman gets the same instruction it gets for a move
#     of its own, attached to the worker's report. It no longer rests on the
#     foreman reading the report and remembering to act on it.
#
# SubagentStop is not used: its output goes back to the subagent and keeps it
# running, it never reaches the session that sent it. The two events above
# are the ones Claude Code delivers to the main session when a subagent ends
# (checked on Claude Code 2.1.302).
#
# A move counts when both hold:
#   1. the command text moves a ticket to `review`, whichever way the status
#      is written: --status review, --status "review", --status 'review',
#      --status=review, --status="review"
#   2. the ticket file really is sitting in .kerjaan/review/ afterwards
# Condition (2) is what keeps an `echo`, a dry run, or a failed move from
# summoning a reviewer for a ticket that never arrived. It cannot rule out
# every false positive — a command that merely names a ticket already sitting
# in review/ still fires — but in that case a reviewer is what the board wants
# anyway, so the wrong answer is a harmless one.
#
# What a worker moved is remembered in a file per agent, under
# $KERJAAN_HOOK_STATE (default: $TMPDIR/kerjaan-review-hook), in a folder per
# session. The reminder uses it up: a worker resumed later that finishes
# without moving its ticket again summons nobody. A ticket that has left
# review/ by the time the worker ends -- moved back by the worker itself --
# summons nobody either.
#
# Anything that does not match must exit 0 and print nothing. A non-zero exit
# from a hook surfaces to the user as an error, and this hook runs alongside
# every ticket command and every prompt there is.
#
# Reads the hook JSON on stdin, writes hook JSON to stdout only when it fires.

set -euo pipefail

# A machine without jq should lose the automation, not break every Bash call.
command -v jq > /dev/null 2>&1 || exit 0

payload=$(cat)
field() { printf '%s' "$payload" | jq -r "$1" 2>/dev/null || printf ''; }

event=$(field '.hook_event_name // "PostToolUse"')
tool=$(field '.tool_name // "Bash"')
# Inside a subagent the hook input carries `agent_id`; in the main session it
# does not (a session started with --agent has a type but no id).
agent_id=$(field '.agent_id // ""')

# Only letters, digits, `-` and `_` go into a path, whatever the input holds.
safe() { printf '%s' "$1" | tr -cd 'A-Za-z0-9_-'; }
session=$(safe "$(field '.session_id // ""')")
[ -n "$session" ] || session=nosession
state_dir="${KERJAAN_HOOK_STATE:-${TMPDIR:-/tmp}/kerjaan-review-hook}/$session"

# The shared pieces of the board scripts (lib.sh) are read only once the hook
# is about to fire: every prompt and every Bash call runs this hook, and nearly
# all of them leave above without needing them.
lib_loaded=0
load_lib() {
  [ "$lib_loaded" -eq 1 ] && return 0
  # shellcheck source=lib.sh
  . "$(cd "$(dirname "$0")" && pwd)/lib.sh"
  lib_loaded=1
}

# foreman_reminder <event> <id> <ticket> <lead> <lead_sys>
# Prints one hook JSON object telling the foreman what to do with a ticket in
# review: dispatch a reviewer, resume the earlier one, or resume it for the
# review after a merge postponed. <lead> goes in front of the instruction.
foreman_reminder() {
  local event="$1" id="$2" ticket="$3" lead="$4" lead_sys="$5"
  local repo scripts foreman counts reviews openings rejections postponed round
  # The reviewer may be dispatched from a session whose cwd is not the repo, so
  # tell it where the board is instead of leaving it to search.
  repo=$(dirname "$(dirname "$(dirname "$ticket")")")
  scripts="$(cd "$(dirname "$0")" && pwd)"
  foreman="$(cd "$(dirname "$0")/.." && pwd)/references/foreman.md"

  # First round, a later round, or the review after a merge postponed. The
  # definition is the one the foreman and the reviewer use (references/review.md,
  # "Rounds"): a round ends with one rejection by the reviewer, so round N is the
  # review that follows N-1 rejections. A merge postponed -- `merge.sh land`
  # sending a passed ticket back because main or the branch changed -- is no
  # rejection: the review after it has no round number and counts toward
  # nothing.
  #
  # A ticket that has been reviewed before has a reviewer already, and the
  # foreman should resume that one. Two sources, because either alone misses
  # cases:
  #   - `## History`. update-ticket.sh writes it in English whatever the board's
  #     language, status always the last word: `- <time> review`, or
  #     `- <time> <session-id> review` inside a Claude Code session. More than
  #     one `review` line means reviewed before. A move into `in_progress`
  #     straight from `review` is a rejection; from `done` it is a merge
  #     postponed. Only for tickets whose History reaches back that far.
  #   - `## Notes`. The reviewer opens every review with one fixed English line
  #     whatever the board's language:
  #       `- <date>: Reviewed at level <level>, round <n>, at commit <c>: sent back.`
  #     (`after merge postponed` in place of `round <n>` for the review after a
  #     merge postponed; `passed` in place of `sent back`). Each such line is a
  #     review, and one that ends in `sent back` a rejection. `merge.sh land`
  #     writes `- <time>: merge postponed — ...` when it sends a ticket back.
  #     Only a line in `## Notes` that starts with the phrase counts -- bare, as
  #     a top-level bullet (`- `, `* `, `+ `), optionally in bold, optionally
  #     after the date. The phrase quoted anywhere else -- Background,
  #     mid-sentence in a worker's note, a wrapped continuation line, a `>`
  #     quote -- is someone talking about a review, not a review, and a first
  #     round must stay a first round.
  # Lines inside fenced blocks are prose, not records, so they are skipped,
  # whichever of the two fences opens them (KERJAAN_FENCE in lib.sh).
  # Rejections are the larger of the two counts, so a review from before the
  # line was fixed (written in the board's language) is still counted by
  # History, and a ticket from before History by its Notes. The awk prints:
  # History `review` lines, reviewer openings, rejections, and whether the
  # latest return was a merge postponed (1) or not (0).
  load_lib
  counts=$(awk -v fence="$KERJAAN_FENCE" '
    $0 ~ fence { infence = !infence; next }
    infence { next }
    /^## / {
      inhist = ($0 ~ /^## History[ \t]*$/)
      innotes = ($0 ~ /^## Notes[ \t]*$/)
      next
    }
    inhist && $0 ~ /^- [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9] ([A-Za-z0-9-]+ )?[a-z_]+[ \t]*$/ {
      st = $NF
      if (st == "review") n++
      if (st == "in_progress" && prev == "review") { hrej++; hlast = "rejection" }
      if (st == "in_progress" && prev == "done") hlast = "postponed"
      prev = st
      next
    }
    innotes && $0 ~ /^([-*+][ \t]+)?(\*\*)?([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]( [0-9:]+)?:?[ \t]+)?(\*\*)?Reviewed at level/ {
      r++
      nlast = "review"
      if (tolower($0) ~ /sent back\.?(\*\*)?[ \t]*$/) nrej++
      next
    }
    innotes && $0 ~ /^- [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9:]+: merge postponed / { nlast = "postponed" }
    END {
      rej = (hrej > nrej) ? hrej : nrej
      post = (hlast == "postponed" || (hlast == "" && nlast == "postponed")) ? 1 : 0
      print n + 0, r + 0, rej + 0, post
    }
  ' "$ticket" 2>/dev/null || printf '0 0 0 0')
  read -r reviews openings rejections postponed <<EOF_COUNTS
  $counts
EOF_COUNTS
  reviews=${reviews:-0}; openings=${openings:-0}
  rejections=${rejections:-0}; postponed=${postponed:-0}

  if [ "$postponed" = 1 ]; then
    jq -n --arg lead_sys_ "$lead_sys" --arg event "$event" --arg lead "$lead" --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
      --arg scripts "$scripts" --arg rej "$rejections" '{
      hookSpecificOutput: {
        hookEventName: $event,
        additionalContext: ($lead +
          "Ticket \($id) is back in .kerjaan/review/ after a merge postponed, " +
          "on the board in \($repo) -- the file is \($ticket). It had passed " +
          "review, merge.sh land sent it back because main or its branch " +
          "changed first, and its worker brought main in. This is the review " +
          "after a merge postponed: not a round, no round number, and not a " +
          "rejection -- its reviewer has sent it back \($rej) time(s), and that " +
          "count is unchanged. Resume the reviewer that passed it with " +
          "SendMessage to its agent ID, saying this is the review after a " +
          "merge postponed: level quick, reading only " +
          "\"\($scripts)/merge.sh\" resolution \($id). Only if that reviewer " +
          "cannot be resumed -- no agent ID on record, or SendMessage refuses " +
          "it -- dispatch a new subagent with subagent_type " +
          "\"kerjaan-reviewer\" and a prompt naming that repo, the ticket ID " +
          "\($id), and the kerjaan scripts folder \($scripts); it finds the " +
          "merge postponed line in ## Notes and narrows itself. Either way the " +
          "reviewer decides, and moves the ticket to done/ or back to " +
          "in_progress/ itself. Do not review this ticket yourself. Ticket " +
          "\($id) is handed off now: nobody changes the code it covers. When " +
          "the verdict comes back, read \($foreman) for what to do with it; a " +
          "pass is landed again with merge.sh land."
        )
      },
      systemMessage: ($lead_sys_ + "Ticket \($id) re-entered review after a merge postponed — resuming its reviewer.")
    }'
    return 0
  fi

  if [ "$reviews" -ge 2 ] || [ "$openings" -ge 1 ] || [ "$rejections" -ge 1 ]; then
    if [ "$rejections" -ge 1 ]; then
      round="round $((rejections + 1)), after $rejections rejection(s) by its reviewer"
    else
      round="its reviewer states the round"
    fi
    jq -n --arg lead_sys_ "$lead_sys" --arg event "$event" --arg lead "$lead" --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
      --arg scripts "$scripts" --arg round "$round" '{
      hookSpecificOutput: {
        hookEventName: $event,
        additionalContext: ($lead +
          "Ticket \($id) is back in .kerjaan/review/, on the board in \($repo) " +
          "-- the file is \($ticket). It has been reviewed before, so this is a " +
          "later round (\($round)). Resume the reviewer of the round before with " +
          "SendMessage to its agent ID, saying the fix is in and at which " +
          "commit: it still holds its first round and narrows this one by " +
          "itself. Only if that reviewer cannot be resumed -- no agent ID on " +
          "record, or SendMessage refuses it -- dispatch a new subagent with " +
          "subagent_type \"kerjaan-reviewer\" and a prompt naming that repo, " +
          "the ticket ID \($id), and the kerjaan scripts folder \($scripts); it " +
          "narrows itself from the earlier review in ## Notes. Either " +
          "way the reviewer decides, and moves the ticket to done/ or back to " +
          "in_progress/ itself. Do not review this ticket yourself. Ticket " +
          "\($id) is handed off now: nobody changes the code it covers, even to " +
          "improve it, even to strengthen a test. If something genuinely " +
          "remains, move the ticket back to in_progress instead. When the " +
          "verdict comes back, read \($foreman) for what to do with it -- a " +
          "second rejection by the reviewer stops the chain; a merge postponed " +
          "is never one."
        )
      },
      systemMessage: ($lead_sys_ + "Ticket \($id) re-entered review — resuming its reviewer.")
    }'
    return 0
  fi

  jq -n --arg lead_sys_ "$lead_sys" --arg event "$event" --arg lead "$lead" --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
    --arg scripts "$scripts" '{
    hookSpecificOutput: {
      hookEventName: $event,
      additionalContext: ($lead +
        "Ticket \($id) has just landed in .kerjaan/review/, on the board in " +
        "\($repo) -- the file is \($ticket). Dispatch one subagent right now " +
        "with subagent_type \"kerjaan-reviewer\" and a prompt naming that " +
        "repo, the ticket ID \($id), and the kerjaan scripts folder " +
        "\($scripts). That reviewer decides, and " +
        "moves the ticket to done/ or back to in_progress/ itself. Do not " +
        "review this ticket yourself. Ticket \($id) is handed off now: nobody " +
        "changes the code it covers, even to improve it, even to strengthen a " +
        "test. Moving it here was the claim that it is finished, and an edit " +
        "made now is one the reviewer judges without knowing it happened. If " +
        "something genuinely remains, move the ticket back to in_progress " +
        "instead. When the verdict comes back, read \($foreman) for what to do " +
        "with it and with the rest of the chain."
      )
    },
    systemMessage: ($lead_sys_ + "Ticket \($id) entered review — dispatching a reviewer.")
  }'
}

# remind_for_agent <agent id>
# The worker <agent id> has ended. For every ticket it moved to review that is
# still there, print the foreman's instruction, then forget what it moved.
remind_for_agent() {
  local agent marker ticket id tid out=()
  agent=$(safe "$1")
  [ -n "$agent" ] || return 0
  marker="$state_dir/$agent"
  [ -f "$marker" ] || return 0
  while IFS= read -r ticket; do
    [ -n "$ticket" ] || continue
    [ -f "$ticket" ] || continue
    case "$ticket" in */.kerjaan/review/*) ;; *) continue ;; esac
    tid=$(basename "$ticket" | grep -oE '^[0-9]{12}' || true)
    [ -n "$tid" ] || continue
    out+=("$(foreman_reminder "$event" "$tid" "$ticket" \
      "Your worker subagent $agent has finished, and the ticket it moved is in review. " \
      "Worker finished: ")")
  done < "$marker"
  rm -f "$marker"
  [ "${#out[@]}" -gt 0 ] || return 0
  # One ticket is the usual case; several are joined into one message.
  printf '%s\n' "${out[@]}" | jq -s '{
    hookSpecificOutput: {
      hookEventName: .[0].hookSpecificOutput.hookEventName,
      additionalContext: (map(.hookSpecificOutput.additionalContext) | join("\n\n"))
    },
    systemMessage: (map(.systemMessage) | join(" "))
  }'
}

# --- a worker reported back ------------------------------------------------
# Only in the main session: a subagent that runs one of its own is not the
# foreman, and its reminder would land with the wrong reader.
if [ "$event" = "UserPromptSubmit" ]; then
  [ -z "$agent_id" ] || exit 0
  prompt=$(field '.prompt // ""')
  case "$prompt" in *"<task-notification>"*) ;; *) exit 0 ;; esac
  for task in $(printf '%s' "$prompt" | grep -oE '<task-id>[^<]+</task-id>' \
                  | sed -e 's/<task-id>//' -e 's#</task-id>##' || true); do
    remind_for_agent "$task"
  done
  exit 0
fi

if [ "$event" = "PostToolUse" ] && { [ "$tool" = "Agent" ] || [ "$tool" = "Task" ]; }; then
  [ -z "$agent_id" ] || exit 0
  # A worker launched in the background has only started; its end arrives
  # later as a <task-notification>.
  status=$(field '.tool_response.status // ""')
  [ "$status" != "async_launched" ] || exit 0
  [ "$(field '.tool_response.isAsync // false')" != "true" ] || exit 0
  remind_for_agent "$(field '.tool_response.agentId // ""')"
  exit 0
fi

[ "$tool" = "Bash" ] || exit 0

# --- a command moved a ticket ----------------------------------------------
cmd=$(field '.tool_input.command // ""')

# The status may be written bare, quoted either way, or joined with `=`; it
# must be followed by the end of a word so `--status reviewed` is not it.
printf '%s' "$cmd" | grep -Eq -- "update-ticket\.sh.*--status(=|[[:space:]]+)[\"']?review[\"']?([[:space:];&|)]|\$)" \
  || exit 0

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

stdout=$(field '
  .tool_response
  | if type == "object" then (.stdout // "") else (. // "" | tostring) end
')

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
  load_lib
  hook_cwd=$(field '.cwd // ""')
  for root in "${CLAUDE_PROJECT_DIR:-}" "$hook_cwd" "$PWD"; do
    [ -n "$root" ] || continue
    ticket="$(kerjaan_ticket_file "$root/.kerjaan" "$id" review 2>/dev/null || true)"
    [ -z "$ticket" ] || break
  done
fi

[ -n "$ticket" ] || exit 0

# Who made the move. Only the foreman dispatches reviewers: it counts the
# rounds, carries what a verdict teaches to the next worker, and resumes the
# same worker when a ticket comes back. A move made inside a subagent is a
# worker handing its ticket over, and what it needs to hear is to stop and
# report, not to summon a reviewer of its own. What it moved is written down
# so the foreman is reminded when the worker ends (remind_for_agent). Losing
# that note -- an unwritable folder -- costs the reminder, never the move.
if [ -n "$agent_id" ]; then
  agent=$(safe "$agent_id")
  if [ -n "$agent" ] && mkdir -p "$state_dir" 2>/dev/null; then
    if ! grep -qxF -- "$ticket" "$state_dir/$agent" 2>/dev/null; then
      printf '%s\n' "$ticket" >> "$state_dir/$agent" 2>/dev/null || true
    fi
  fi
  jq -n --arg id "$id" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: (
        "Ticket \($id) is now in .kerjaan/review/. You are working inside a " +
        "subagent, so the reviewer is not yours to dispatch: the session that " +
        "sent you dispatches it once your report arrives. Do not dispatch a " +
        "reviewer, do not review the ticket yourself, and stop changing the " +
        "code it covers. Finish now with your report."
      )
    }
  }'
  exit 0
fi

foreman_reminder "$event" "$id" "$ticket" "" ""
