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

function board() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-hook-'));
  const review = path.join(root, '.kerjaan', 'review');
  fs.mkdirSync(review, { recursive: true });
  const ticket = path.join(review, `${id} Sebuah tiket.md`);
  fs.writeFileSync(ticket, '---\ntype: task\n---\n');
  return { root, ticket };
}

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
