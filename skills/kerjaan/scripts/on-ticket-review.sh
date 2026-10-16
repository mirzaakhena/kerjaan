#!/usr/bin/env bash
#
# PostToolUse hook for Bash. Registered by the plugin itself, via
# hooks/hooks.json, so it applies to every repo that uses a .kerjaan/ board
# without the user editing any settings file.
#
# When the command that just ran moved a ticket into the review folder, this
# hook injects an instruction into the session so a reviewer is dispatched
# immediately. A rule written in a CLAUDE.md is advice and can be missed; this
# hook is what makes the dispatch actually automatic. For a ticket that has
# been reviewed before, it tells the foreman to resume that reviewer instead,
# and to dispatch a new one only when that one cannot be resumed -- and which
# round this is, or that it is the review after a merge postponed.
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

# Who made the move. Only the foreman -- the main session -- dispatches
# reviewers: it counts the rounds, carries what a verdict teaches to the next
# worker, and resumes the same worker when a ticket comes back. A move made
# inside a subagent carries `agent_id` in the hook input; that is a worker
# handing its ticket over, and what it needs to hear is to stop and report,
# not to summon a reviewer of its own.
agent_id=$(printf '%s' "$payload" | jq -r '.agent_id // ""' 2>/dev/null || printf '')

if [ -n "$agent_id" ]; then
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
# Lines inside fenced blocks are prose, not records, so they are skipped.
# Rejections are the larger of the two counts, so a review from before the
# line was fixed (written in the board's language) is still counted by
# History, and a ticket from before History by its Notes. The awk prints:
# History `review` lines, reviewer openings, rejections, and whether the
# latest return was a merge postponed (1) or not (0).
counts=$(awk '
  /^```/ { infence = !infence; next }
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
  jq -n --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
    --arg scripts "$scripts" --arg rej "$rejections" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: (
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
    systemMessage: ("Ticket \($id) re-entered review after a merge postponed — resuming its reviewer.")
  }'
  exit 0
fi

if [ "$reviews" -ge 2 ] || [ "$openings" -ge 1 ] || [ "$rejections" -ge 1 ]; then
  if [ "$rejections" -ge 1 ]; then
    round="round $((rejections + 1)), after $rejections rejection(s) by its reviewer"
  else
    round="its reviewer states the round"
  fi
  jq -n --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
    --arg scripts "$scripts" --arg round "$round" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: (
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
    systemMessage: ("Ticket \($id) re-entered review — resuming its reviewer.")
  }'
  exit 0
fi

jq -n --arg id "$id" --arg repo "$repo" --arg ticket "$ticket" --arg foreman "$foreman" \
  --arg scripts "$scripts" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: (
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
  systemMessage: ("Ticket \($id) entered review — dispatching a reviewer.")
}'
