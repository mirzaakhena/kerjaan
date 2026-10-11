// The review hook, run the way Claude Code runs it: hook JSON on stdin.
//
// Only the foreman -- the main session -- is told to dispatch a reviewer. A
// worker subagent that moves its ticket into review is told to stop and
// report instead, because the foreman resumes it when the ticket comes back.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'on-ticket-review.sh');
const id = '261011070001';

function board(body = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-hook-'));
  const review = path.join(root, '.kerjaan', 'review');
  fs.mkdirSync(review, { recursive: true });
  const ticket = path.join(review, `${id} Sebuah tiket.md`);
  fs.writeFileSync(ticket, '---\ntype: task\n---\n' + body);
  return { root, ticket };
}

// Ticket bodies at each round, as update-ticket.sh and the reviewer leave them.
const firstRound = `
## Done when
- [x] Sesuatu.

## History
- 2026-10-11 07:00:00 todo
- 2026-10-11 07:10:00 in_progress
- 2026-10-11 07:40:00 review

## Notes
- Catatan pengerja.
`;

// Sent back once, in a board written in Indonesian: the reviewer's block is in
// the board's language, so only History tells the round.
const secondRoundByHistory = `
## Done when
- [ ] Sesuatu.

## History
- 2026-10-11 07:00:00 todo
- 2026-10-11 07:10:00 in_progress
- 2026-10-11 07:40:00 review
- 2026-10-11 07:50:00 in_progress
- 2026-10-11 08:20:00 review

## Notes
- Ditinjau pada level quick, putaran 1, pada commit a1b2c3d: ditolak.
`;

// A ticket from before History existed, on an English board: History holds
// only the latest move, so the reviewer's opening line is what tells.
const secondRoundByNotes = `
## Done when
- [ ] Something.

## History
- 2026-10-11 08:20:00 review

## Notes
- Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
`;

// Lines that look like records but are not: a review line in Notes and one in
// a fenced example are prose, and must not make a first round look like a second.
const firstRoundWithLookalikes = `
## History
- 2026-10-11 07:10:00 in_progress
- 2026-10-11 07:40:00 review

## Notes
- 2026-10-11 07:30:00 review
\`\`\`
## History
- 2026-10-11 07:20:00 review
\`\`\`
`;

function run(payload) {
  const r = spawnSync('bash', [hook], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

function moveToReview(root, ticket, extra = {}) {
  return {
    cwd: root,
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: `"$K/update-ticket.sh" ${id} --status review` },
    tool_response: { stdout: `${ticket}\n`, stderr: '' },
    ...extra,
  };
}

test('from the foreman, the hook says to dispatch kerjaan-reviewer', () => {
  const { root, ticket } = board();
  const out = run(moveToReview(root, ticket));
  const text = out.hookSpecificOutput.additionalContext;
  assert.match(text, /Dispatch one subagent right now/);
  assert.match(text, /kerjaan-reviewer/);
  assert.match(text, /foreman\.md/);
  assert.match(out.systemMessage, /dispatching a reviewer/);
});

test('round one, from the foreman: dispatch a reviewer, nothing about resuming', () => {
  for (const body of [firstRound, firstRoundWithLookalikes]) {
    const { root, ticket } = board(body);
    const out = run(moveToReview(root, ticket));
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /Dispatch one subagent right now/);
    assert.doesNotMatch(text, /Resume the reviewer/);
    assert.match(out.systemMessage, /dispatching a reviewer/);
  }
});

for (const [name, body] of [['History', secondRoundByHistory], ['the reviewer block in Notes', secondRoundByNotes]]) {
  test(`a later round told by ${name}: resume the earlier reviewer, a new one only if that fails`, () => {
    const { root, ticket } = board(body);
    const out = run(moveToReview(root, ticket));
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /later round/);
    assert.match(text, /Resume the reviewer of the round before with SendMessage/);
    assert.match(text, /Only if that reviewer cannot be resumed/);
    assert.match(text, /kerjaan-reviewer/);
    assert.match(text, new RegExp(id));
    assert.match(text, /foreman\.md/);
    assert.doesNotMatch(text, /Dispatch one subagent right now/);
    assert.match(out.systemMessage, /resuming its reviewer/);
  });

  test(`a later round told by ${name}, from a worker: still only report`, () => {
    const { root, ticket } = board(body);
    const out = run(moveToReview(root, ticket, { agent_id: 'a1' }));
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /Finish now with your report/);
    assert.doesNotMatch(text, /Resume the reviewer|Dispatch one subagent/);
  });
}

test('from a worker subagent, the hook says to report, never to dispatch', () => {
  const { root, ticket } = board();
  const out = run(moveToReview(root, ticket, { agent_id: 'a1b2c3', agent_type: 'kerjaan:kerjaan-worker' }));
  const text = out.hookSpecificOutput.additionalContext;
  assert.match(text, /Do not dispatch a reviewer/);
  assert.match(text, /Finish now with your report/);
  assert.doesNotMatch(text, /Dispatch one subagent/);
  assert.equal(out.systemMessage, undefined);
});

test('any subagent counts as a worker, whatever its type', () => {
  const { root, ticket } = board();
  const out = run(moveToReview(root, ticket, { agent_id: 'x9', agent_type: 'general-purpose' }));
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Dispatch one subagent/);
});

test('a session started with --agent has a type but no id, and is still the foreman', () => {
  const { root, ticket } = board();
  const out = run(moveToReview(root, ticket, { agent_type: 'some-agent' }));
  assert.match(out.hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
});

test('a ticket that never reached review summons nobody, from either side', () => {
  const { root } = board();
  const missing = path.join(root, '.kerjaan', 'review', '261011070099 Lain.md');
  const payload = moveToReview(root, missing);
  payload.tool_input.command = `"$K/update-ticket.sh" 261011070099 --status review`;
  assert.equal(run(payload), null);
  assert.equal(run({ ...payload, agent_id: 'a1' }), null);
});

// The foreman guide must not promise a hook message the foreman never gets: a
// worker's move to review speaks to the worker, so the guide's second round
// rests on the worker's report and resumes the same reviewer.
test('the foreman guide sends a second round to the same reviewer, with no phantom hook message', () => {
  const guide = fs.readFileSync(path.join(here, '..', 'skills', 'kerjaan', 'references', 'foreman.md'), 'utf8');
  const start = guide.indexOf('**Sent back, first time**');
  const end = guide.indexOf('**Sent back a second time**');
  assert.ok(start > 0 && end > start, 'step 5 of the guide was not found');
  const step = guide.slice(start, end);
  assert.doesNotMatch(step, /the hook asks/i);
  assert.match(step, /resume the \*\*same reviewer\*\*/);
  assert.match(step, /no hook message reaches you/);
  const row = guide.split('\n').find((l) => l.startsWith('| `REVIEW` |'));
  assert.doesNotMatch(row, /as the hook says/);
});
