// The shortcuts an owner takes each have one written path (261016141908):
// work without a ticket still goes to a worker, "mark it done" goes through
// the worker's checks instead of the foreman ticking and moving, an owner-
// accepted ticket lands like a passed one, a worker stopped on a decision is
// resumed once the owner answers, and the one thing the foreman may do itself
// — a tiny change in text the owner asks for — is stated with its limit and
// its reason. The scripts' side of these paths is tested in merge.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');
const flat = (t) => t.replace(/\s+/g, ' ');
const section = (text, start, end) => {
  const a = text.indexOf(start);
  assert.ok(a >= 0, `missing: ${start}`);
  const b = end ? text.indexOf(end, a + start.length) : text.length;
  assert.ok(b > a, `missing after ${start}: ${end}`);
  return flat(text.slice(a, b));
};

const skill = doc('skills', 'kerjaan', 'SKILL.md');
const foreman = doc('skills', 'kerjaan', 'references', 'foreman.md');
const review = doc('skills', 'kerjaan', 'references', 'review.md');
const worker = doc('agents', 'kerjaan-worker.md');

test('docs: "langsung saja" skips the ticket, not the worker', () => {
  const s = section(skill, '### Work starts from a ticket', '### Creating');
  assert.match(s, /"langsung saja"\. That skips the ticket, not the worker: the code is still written by a `kerjaan-worker`/);
  const f = section(foreman, '## Work without a ticket', '## Filling the queue');
  assert.match(f, /the ticket is skipped, not the worker/);
  assert.match(f, /No ticket: the owner asked for this directly/);
  // The worker knows what such a prompt means.
  const w = section(worker, '## When there is no ticket', '## When you are resumed after a merge postponed');
  assert.match(w, /skip `update-ticket\.sh` and `test-run\.sh`, run the project's `test_command`/);
  assert.match(flat(worker), /or, instead of a ticket, `No ticket: <the owner's request>`/);
});

test('docs: "mark it done" goes through a worker and test-run.sh, never the foreman ticking and moving', () => {
  const s = section(skill, '### When the user says "mark it done"', '### When the board goes quiet');
  // The old instruction, tick and move to review, is gone.
  assert.doesNotMatch(s, /tick `Done when` as above and move the ticket to `review`/);
  assert.match(s, /The foreman does not tick `Done when` or move a ticket to `review` itself/);
  assert.match(s, /\*\*`todo` or `in_progress`\.\*\* Move a `todo` ticket to `in_progress`/);
  assert.match(s, /runs `test-run\.sh`, moves the ticket to `review`/);
  // Skipping review still runs the checks: the foreman moves review -> done.
  assert.match(s, /the path is the same up to `review`, so the checks are still run and recorded/);
  assert.match(s, /`Moved to done by <owner> without review, <date>\.`/);
  assert.match(flat(worker), /`The owner says this work is done: <their words>`/);
  assert.match(flat(worker), /Their word is why the ticket moved, not evidence that a line is met/);
});

test('docs: a ticket the owner accepted after two rejections is landed like a passed one', () => {
  const r = section(review, '**After the second rejection, ask before trying again.**', '## Follow-ups the reviewer suggests');
  assert.match(r, /move this one to `done` yourself\. From there it is a passed ticket: when it was worked in a worktree, land it with `"\$K\/merge\.sh" land <id>`/);
  const f = section(foreman, '**5. Act on the verdict.**', '**6. Act on the landing**');
  assert.match(f, /\*\*Accepted by the owner\*\* after the second rejection/);
  assert.match(f, /land it with `"\$K\/merge\.sh" land <id>` and act on the answer \(step 6\), exactly as for a ticket its reviewer passed/);
  assert.match(doc('skills', 'kerjaan', 'scripts', 'merge.sh'), /Only a ticket in done\/ lands on main: passed by its reviewer, or accepted by the owner\./);
});

test('docs: a worker stopped on a decision is resumed once the owner answers, in written steps', () => {
  const f = section(foreman, '### When the owner answers', '## The summary');
  assert.match(f, /1\. Record each answer with `"\$K\/queue\.sh" answer <id> <n> "<answer>"`/);
  assert.match(f, /2\. Resume \*\*the same worker\*\* with `SendMessage` to its agent ID/);
  assert.match(f, /3\. Act on its report as on any other/);
  assert.match(f, /A worker that cannot be resumed is replaced by a new one/);
  // Both places that stop the chain point at the steps.
  assert.match(flat(foreman), /\| `STOPPED — decision` \| .* resume that worker \("When the owner answers"\)\. \|/);
  assert.match(flat(foreman), /then resume that worker \("When the owner answers", below\)/);
  const w = section(worker, "## When you are resumed with the owner's answer", '## When there is no ticket');
  assert.match(w, /carry on from where you stopped: step 3 onward/);
  assert.match(w, /Do not start the ticket over/);
});

test('docs: the foreman may make a tiny text change the owner asks for, scripts excluded, with the reason', () => {
  for (const [name, text] of [['SKILL.md', section(skill, '### Who does the work', '### Work starts from a ticket')],
    ['foreman.md', section(foreman, '## What stays with the foreman', '## Work without a ticket')]]) {
    assert.match(text, /tiny change in text the owner asks for directly/, name);
    // The limit: text with no logic; a script, code or test still goes to a worker.
    assert.match(text, /touches a script, code, configuration, a test, or a file a test (checks|reads)/, name);
    assert.match(text, /goes to a worker, however small/, name);
    // The reason: the cost of a worker and a reviewer against a one-word change.
    assert.match(text, /a worker and a reviewer .*cost/, name);
    // Only on the owner's own request.
    assert.match(text, /(is not covered|is sent back, not fixed)/, name);
  }
  // The rule list points at the exception instead of contradicting it.
  assert.match(flat(skill), /2\. \*\*The main session never writes a ticket's code\.\*\* .* The one exception is a tiny change in text or docs the owner asks for directly/);
});
