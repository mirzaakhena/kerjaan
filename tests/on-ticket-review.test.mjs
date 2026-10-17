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
  const ticket = path.join(review, `${id} A ticket.md`);
  fs.writeFileSync(ticket, '---\ntype: task\n---\n' + body);
  return { root, ticket };
}

// Ticket bodies at each round, as update-ticket.sh and the reviewer leave them.
const firstRound = `
## Done when
- [x] Something.

## History
- 2026-10-11 07:00:00 todo
- 2026-10-11 07:10:00 in_progress
- 2026-10-11 07:40:00 review

## Notes
- Worker note.
`;

// Sent back once, in a board written in Indonesian: the reviewer's block is in
// the board's language, so only History tells the round.
const secondRoundByHistory = `
## Done when
- [ ] Something.

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

// First-round tickets that only talk about the reviewer's opening line. The
// phrase counts as a review only at the start of a line in ## Notes, outside
// fenced blocks; each place a person might quote it is its own case.
const onlyOneReview = `
## History
- 2026-10-11 07:10:00 in_progress
- 2026-10-11 07:40:00 review
`;
const quotesThatAreNotReviews = {
  'in Background': `
## Background
The hook looks for the text "Reviewed at level" in review notes.
Reviewed at level quick, round 1 -- an example of the reviewer's opening line.
${onlyOneReview}
## Notes
- Worker note.
`,
  'mid-sentence in a worker note': `
${onlyOneReview}
## Notes
- Worker note: the reviewer opens its block with "Reviewed at level", so
  the hook looks for it.
`,
  'on a wrapped continuation line of a worker note': `
${onlyOneReview}
## Notes
- Worker note: the reviewer's opening line reads
  Reviewed at level quick, round 1, at commit a1b2c3d.
`,
  'in a > quote in Notes': `
${onlyOneReview}
## Notes
- Worker note, quoting another ticket:
> Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
`,
  'inside a fenced block in Notes': `
${onlyOneReview}
## Notes
- An example of a reviewer's block:
\`\`\`
- Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
\`\`\`
`,
  // Indented, so the line-start rule rejects it whether or not the fence is seen.
  'inside an indented fenced block in Notes': `
${onlyOneReview}
## Notes
- An example of a reviewer's block:
  \`\`\`markdown
  Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
  \`\`\`
`,
  // The shape of the real false positive, ticket 261011073202: a worker note
  // quoting the phrase at the start of a wrapped line, and an earlier review
  // written in the board's language, which is not a second round by itself.
  'as in ticket 261011073202': `
${onlyOneReview}
## Notes
- Worker note, 11 Oct 2026:
  - Round signals. The hook takes a ticket as reviewed before when
    \`## History\` holds \`review\` more than once, or \`## Notes\` holds
    "Reviewed at level". The second signal alone is not enough.
  - Note 1 (not blocking): the Notes signal uses \`grep -q 'Reviewed at
    level'\` over the whole file.
`,
  'outside Notes, in a section after it': `
${onlyOneReview}
## Notes
- Worker note.

## Appendix
- Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
`,
};

// A reviewer's opening line in Notes, in each shape a reviewer writes it, on a
// ticket whose History shows only the latest move.
const reviewerOpenings = {
  'as a bullet': `- Reviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'as a * bullet': `* Reviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'as a + bullet': `+ Reviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'in bold': `- **Reviewed at level normal, round 1, at commit a1b2c3d.** Sent back.`,
  'bare under a ### Review heading': `### Review 2026-10-11 — sent back\n\nReviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'after the date (the fixed line)': `- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'after the date and time': `- 2026-10-11 07:45: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.`,
  'the fixed line, then the review in Indonesian': `- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.\n  Uji proyek dijalankan sekali; kriteria 2 belum terpenuhi.`,
};

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
  const missing = path.join(root, '.kerjaan', 'review', '261011070099 Another.md');
  const payload = moveToReview(root, missing);
  payload.tool_input.command = `"$K/update-ticket.sh" 261011070099 --status review`;
  assert.equal(run(payload), null);
  assert.equal(run({ ...payload, agent_id: 'a1' }), null);
});

// The foreman guide must describe the hook message the foreman really gets: a
// worker's move to review speaks to the worker, and the reminder reaches the
// foreman with the worker's report (261016141913), resuming the same reviewer.
test('the foreman guide sends a second round to the same reviewer, and says the reminder comes with the worker\'s report', () => {
  const guide = fs.readFileSync(path.join(here, '..', 'skills', 'kerjaan', 'references', 'foreman.md'), 'utf8');
  const start = guide.indexOf('**Sent back, first time**');
  const end = guide.indexOf('**Sent back a second time**');
  assert.ok(start > 0 && end > start, 'step 5 of the guide was not found');
  const step = guide.slice(start, end);
  assert.match(step, /resume the \*\*same reviewer\*\*/);
  assert.match(step, /The hook says the same with the worker's\s+report/);
  assert.doesNotMatch(step, /no hook message reaches you/);
  const row = guide.split('\n').find((l) => l.startsWith('| `REVIEW` |'));
  assert.match(row, /attaches the instruction for this round to the report/);
  assert.match(row, /a worker that ends without moving its ticket brings none/);
  assert.doesNotMatch(row, /No hook message reaches you/);
});

for (const [where, body] of Object.entries(quotesThatAreNotReviews)) {
  test(`round one that quotes "Reviewed at level" ${where}: dispatch a reviewer, not resume`, () => {
    const { root, ticket } = board(body);
    const out = run(moveToReview(root, ticket));
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /Dispatch one subagent right now/);
    assert.doesNotMatch(text, /Resume the reviewer|later round/);
    assert.match(out.systemMessage, /dispatching a reviewer/);
  });
}

for (const [shape, line] of Object.entries(reviewerOpenings)) {
  test(`a later round told by the reviewer's opening line ${shape} in Notes: resume`, () => {
    const body = `\n## History\n- 2026-10-11 08:20:00 review\n\n## Notes\n- Worker note.\n\n${line}\n`;
    const { root, ticket } = board(body);
    const out = run(moveToReview(root, ticket));
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, /later round/);
    assert.match(text, /round 2, after 1 rejection/);
    assert.match(text, /Resume the reviewer of the round before with SendMessage/);
    assert.doesNotMatch(text, /Dispatch one subagent right now/);
    assert.match(out.systemMessage, /resuming its reviewer/);
  });
}

// History lines written inside a Claude Code session name the session between
// the time and the status; older lines, and moves made from a plain terminal,
// do not. The round is counted the same from either form, and from a mix.
const S1 = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const S2 = 'a192c9e8-0bb5-4bbf-8d56-9831b23e62ec';
const historyForms = {
  'every line naming a session': [
    `- 2026-10-11 07:10:00 ${S1} in_progress`,
    `- 2026-10-11 07:40:00 ${S1} review`,
    `- 2026-10-11 07:50:00 ${S2} in_progress`,
    `- 2026-10-11 08:20:00 ${S2} review`,
  ],
  'an old line, then one naming a session': [
    '- 2026-10-11 07:10:00 in_progress',
    '- 2026-10-11 07:40:00 review',
    `- 2026-10-11 07:50:00 ${S2} in_progress`,
    `- 2026-10-11 08:20:00 ${S2} review`,
  ],
  'a session line, then one from a plain terminal': [
    `- 2026-10-11 07:10:00 ${S1} in_progress`,
    `- 2026-10-11 07:40:00 ${S1} review`,
    '- 2026-10-11 07:50:00 in_progress',
    '- 2026-10-11 08:20:00 review',
  ],
};

for (const [form, lines] of Object.entries(historyForms)) {
  test(`History with ${form}: two review lines are a later round`, () => {
    const { root, ticket } = board(`\n## History\n${lines.join('\n')}\n\n## Notes\n- Worker note.\n`);
    const out = run(moveToReview(root, ticket));
    assert.match(out.hookSpecificOutput.additionalContext, /Resume the reviewer of the round before/);
    assert.match(out.systemMessage, /resuming its reviewer/);
  });

  test(`History with ${form}, cut after the first review: still round one`, () => {
    const { root, ticket } = board(`\n## History\n${lines.slice(0, 2).join('\n')}\n\n## Notes\n- Worker note.\n`);
    const out = run(moveToReview(root, ticket));
    assert.match(out.hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
    assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Resume the reviewer|later round/);
  });
}

// A session id is one word: a line with two words between the time and the
// status is not a History record, so it does not make a round.
test('a review line with more than one word before the status is not counted', () => {
  const body = `\n## History\n- 2026-10-11 07:40:00 ${S1} review\n- 2026-10-11 08:20:00 other words review\n\n## Notes\n- x\n`;
  const { root, ticket } = board(body);
  const out = run(moveToReview(root, ticket));
  assert.match(out.hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
});

// --- one definition of a round ----------------------------------------------------------
// A round ends with one rejection by the reviewer. A merge postponed (merge.sh
// land sending a passed ticket back) is no rejection: the review after it has
// no round number. The hook counts the same way the guides say.

const H = (...st) => st.map((x, i) => `- 2026-10-11 0${Math.floor(i / 6) + 7}:${String((i % 6) * 10).padStart(2, '0')}:00 ${x}`).join('\n');
const hookText = (body) => {
  const { root, ticket } = board(body);
  const out = run(moveToReview(root, ticket));
  return { text: out.hookSpecificOutput.additionalContext, sys: out.systemMessage };
};

test('the issue\'s case: one rejection, then a merge postponed — the review after it has no number, and the count stays at one', () => {
  const { text, sys } = hookText(`\n## History\n${H('todo', 'in_progress', 'review', 'in_progress', 'review', 'done', 'in_progress', 'review')}\n\n## Notes\n- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.\n- 2026-10-11: Reviewed at level quick, round 2, at commit b2c3d4e: passed.\n- 2026-10-11 09:00:00: merge postponed — main changed since ticket-x last took it in (a.txt); back to in_progress to be brought up to date with main, tested and reviewed again.\n`);
  assert.match(text, /after a merge postponed/);
  assert.match(text, /not a round, no round number, and not a rejection/);
  assert.match(text, /sent it back 1 time\(s\)/);
  assert.match(text, /merge\.sh" resolution 261011070001/);
  assert.match(text, /level quick/);
  assert.match(text, /Only if that reviewer cannot be resumed/);
  assert.doesNotMatch(text, /round 3|later round|Dispatch one subagent right now/);
  assert.match(sys, /after a merge postponed — resuming its reviewer/);
});

test('a merge postponed right after round 1 passed: no rejection at all', () => {
  const { text } = hookText(`\n## History\n${H('in_progress', 'review', 'done', 'in_progress', 'review')}\n\n## Notes\n- x\n`);
  assert.match(text, /after a merge postponed/);
  assert.match(text, /sent it back 0 time\(s\)/);
});

test('a merge postponed told by Notes alone, on a ticket whose History is too short', () => {
  const { text } = hookText(`\n## History\n- 2026-10-11 08:20:00 review\n\n## Notes\n- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: passed.\n- 2026-10-11 08:00:00: merge postponed — main changed while the merge was being prepared (a.txt); back to in_progress.\n`);
  assert.match(text, /after a merge postponed/);
});

test('a merge postponed, then a rejection in the review after it: the rejection counts and the next is a numbered round', () => {
  const { text } = hookText(`\n## History\n${H('in_progress', 'review', 'done', 'in_progress', 'review', 'in_progress', 'review')}\n\n## Notes\n- x\n`);
  assert.doesNotMatch(text, /after a merge postponed/);
  assert.match(text, /later round \(round 2, after 1 rejection/);
});

test('a merge postponed line in Notes before a later review does not make it the review after one', () => {
  const { text } = hookText(`\n## History\n- 2026-10-11 08:20:00 review\n\n## Notes\n- 2026-10-11 08:00:00: merge postponed — x; back to in_progress.\n- 2026-10-11: Reviewed at level quick, after merge postponed, at commit a1b2c3d: sent back.\n`);
  assert.doesNotMatch(text, /after a merge postponed,/);
  assert.match(text, /round 2, after 1 rejection/);
});

// Each count, from each record, so a rule over many cases is tested per case.
const roundsByHistory = [
  [['in_progress', 'review', 'in_progress', 'review'], 2],
  [['in_progress', 'review', 'in_progress', 'review', 'in_progress', 'review'], 3],
  [['in_progress', 'review', 'in_progress', 'review', 'done', 'in_progress', 'review', 'in_progress', 'review'], 3],
];
for (const [moves, round] of roundsByHistory) {
  test(`History ${moves.join(' > ')}: round ${round}`, () => {
    const { text } = hookText(`\n## History\n${H(...moves)}\n\n## Notes\n- Ditinjau pada level quick: ditolak.\n`);
    assert.match(text, new RegExp(`later round \\(round ${round}, after ${round - 1} rejection`));
  });
}

test('Notes alone, on an Indonesian board: two fixed lines sent back make round 3, a passed one adds nothing', () => {
  const lines = [
    '- 2026-10-11: Reviewed at level normal, round 1, at commit a1b2c3d: sent back.',
    '  Kriteria 2 gagal: uji izin tetap hijau saat pengecekan dihapus.',
    '- 2026-10-12: Reviewed at level normal, round 2, at commit b2c3d4e: sent back.',
    '  Kriteria 3 gagal.',
  ];
  let { text } = hookText(`\n## History\n- 2026-10-12 08:20:00 review\n\n## Notes\n${lines.join('\n')}\n`);
  assert.match(text, /round 3, after 2 rejection/);
  ({ text } = hookText(`\n## History\n- 2026-10-12 08:20:00 review\n\n## Notes\n${lines.slice(0, 2).join('\n')}\n- 2026-10-12: Reviewed at level quick, after merge postponed, at commit b2c3d4e: passed.\n`));
  assert.match(text, /round 2, after 1 rejection/);
});

test('History and Notes on the same events are not added together', () => {
  const { text } = hookText(`\n## History\n${H('in_progress', 'review', 'in_progress', 'review')}\n\n## Notes\n- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.\n`);
  assert.match(text, /round 2, after 1 rejection/);
});

// --- the same definition, and one name, in every document ---------------------------------
const repoDoc = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');
const flat = (t) => t.replace(/\s+/g, ' ');
const docs = {
  'foreman.md': repoDoc('skills', 'kerjaan', 'references', 'foreman.md'),
  'review.md': repoDoc('skills', 'kerjaan', 'references', 'review.md'),
  'parallel-work.md': repoDoc('skills', 'kerjaan', 'references', 'parallel-work.md'),
  'ordering-the-queue.md': repoDoc('skills', 'kerjaan', 'references', 'ordering-the-queue.md'),
  'SKILL.md': repoDoc('skills', 'kerjaan', 'SKILL.md'),
  'kerjaan-reviewer.md': repoDoc('agents', 'kerjaan-reviewer.md'),
  'kerjaan-worker.md': repoDoc('agents', 'kerjaan-worker.md'),
  'README.md': repoDoc('README.md'),
  'merge.sh': repoDoc('skills', 'kerjaan', 'scripts', 'merge.sh'),
  'on-ticket-review.sh': repoDoc('skills', 'kerjaan', 'scripts', 'on-ticket-review.sh'),
};

test('docs: the foreman guide, the review guide and the reviewer define a round the same way', () => {
  for (const name of ['foreman.md', 'review.md', 'kerjaan-reviewer.md']) {
    assert.match(flat(docs[name]), /a round ends with one rejection by the reviewer/i, name);
    assert.match(flat(docs[name]), /merge postponed/, name);
    assert.match(flat(docs[name]), /(is no|is not a|never a) rejection/, name);
  }
  assert.match(flat(docs['on-ticket-review.sh']), /a round ends with one rejection by the reviewer/i);
});

// The form is written once, in the reviewer's definition (261016141910); the
// review guide names what the foreman counts by and points at it.
test('docs: the reviewer gives the fixed opening line, in English, for both kinds of review, and the review guide points at it', () => {
  const fixed = [
    '- <YYYY-MM-DD>: Reviewed at level <level>, round <n>, at commit <hash>: <passed | sent back>.',
    '- <YYYY-MM-DD>: Reviewed at level quick, after merge postponed, at commit <hash>: <passed | sent back>.',
  ];
  for (const line of fixed) assert.ok(docs['kerjaan-reviewer.md'].includes(`\n${line}\n`), `kerjaan-reviewer.md lacks: ${line}`);
  const guide = flat(docs['review.md']);
  assert.match(guide, /agents\/kerjaan-reviewer\.md`, "The decision"/);
  for (const term of ['`Reviewed at level`', '`sent back`', '`after merge postponed`']) assert.ok(guide.includes(term), `review.md lacks ${term}`);
  assert.match(flat(docs['kerjaan-reviewer.md']), /in English on every board whatever its language/);
  assert.match(flat(docs['kerjaan-reviewer.md']), /do not translate it/);
});

test('docs: the event merge.sh land reports has one name, merge postponed, and no other', () => {
  for (const [name, text] of Object.entries(docs)) {
    for (const old of [/SENT BACK/, /re-integration/i, /reintegration/i, /re-review/i, /resumed because main moved/, /round after main moved/]) {
      assert.doesNotMatch(text, old, `${name} still says ${old}`);
    }
  }
  assert.match(docs['merge.sh'], /echo "MERGE POSTPONED: ticket/);
  assert.match(docs['foreman.md'], /\n\| `MERGE POSTPONED` \| A merge postponed/);
  assert.match(docs['kerjaan-worker.md'], /## When you are resumed after a merge postponed/);
});

// ---------------------------------------------------------------------------
// The reminder that follows a worker's report to the foreman (261016141913).
//
// A worker's move to review speaks to the worker. What reaches the foreman is
// the worker's end: the Agent tool returning (a worker run in the foreground)
// or a <task-notification> arriving as a prompt (a worker run in the
// background, or resumed with SendMessage). The hook remembers which agent
// moved which ticket, and on that end tells the foreman to get the reviewer.

const SESSION = 'session-test-0001';
const WORKER = 'a5581b3155a971061';

function stateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-hook-state-'));
}

function runIn(state, payload) {
  const r = spawnSync('bash', [hook], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: '', KERJAAN_HOOK_STATE: state },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

function workerMoves(root, ticket, agent = WORKER, session = SESSION) {
  return moveToReview(root, ticket, { session_id: session, agent_id: agent, agent_type: 'kerjaan:kerjaan-worker' });
}

// The prompt Claude Code submits when a background agent ends, as captured
// from Claude Code 2.1.302.
function notification(agent = WORKER, session = SESSION, result = 'Ticket: 261011070001 — REVIEW') {
  return {
    session_id: session,
    hook_event_name: 'UserPromptSubmit',
    prompt: `<task-notification>\n<task-id>${agent}</task-id>\n<tool-use-id>toolu_01</tool-use-id>\n` +
      `<output-file>/tmp/x/tasks/${agent}.output</output-file>\n<status>completed</status>\n` +
      `<summary>Agent "Work the ticket" finished</summary>\n<result>${result}</result>\n</task-notification>`,
  };
}

// The Agent tool's PostToolUse for a foreground run, and for a background
// launch (which has only started), as captured from Claude Code 2.1.302.
function agentReturned(agent = WORKER, session = SESSION, extra = {}) {
  return {
    session_id: session,
    hook_event_name: 'PostToolUse',
    tool_name: 'Agent',
    tool_input: { description: 'Work the ticket', prompt: `Ticket ${id}`, subagent_type: 'kerjaan:kerjaan-worker', run_in_background: false },
    tool_response: { status: 'completed', agentId: agent, content: [{ type: 'text', text: 'REVIEW' }] },
    ...extra,
  };
}
function agentLaunched(agent = WORKER, session = SESSION) {
  return agentReturned(agent, session, {
    tool_input: { prompt: `Ticket ${id}`, subagent_type: 'kerjaan:kerjaan-worker', run_in_background: true },
    tool_response: { isAsync: true, status: 'async_launched', agentId: agent },
  });
}

const workerEnds = {
  'in the background (a <task-notification>)': ['UserPromptSubmit', (a, s) => notification(a, s)],
  'in the foreground (the Agent tool returns)': ['PostToolUse', (a, s) => agentReturned(a, s)],
  'under the Agent tool\'s old name, Task': ['PostToolUse', (a, s) => ({ ...agentReturned(a, s), tool_name: 'Task' })],
};

for (const [how, [eventName, ends]] of Object.entries(workerEnds)) {
  test(`a worker that moved its ticket to review ends ${how}: the foreman is told to dispatch the reviewer`, () => {
    const state = stateDir();
    const { root, ticket } = board(firstRound);
    const moved = runIn(state, workerMoves(root, ticket));
    assert.match(moved.hookSpecificOutput.additionalContext, /Finish now with your report/);
    const out = runIn(state, ends(WORKER, SESSION));
    assert.ok(out, 'the foreman got no reminder');
    assert.equal(out.hookSpecificOutput.hookEventName, eventName);
    const text = out.hookSpecificOutput.additionalContext;
    assert.match(text, new RegExp(`Your worker subagent ${WORKER} has finished`));
    assert.match(text, /Dispatch one subagent right now/);
    assert.match(text, /kerjaan-reviewer/);
    assert.match(text, new RegExp(id));
    assert.ok(text.includes(ticket), 'the reminder names the ticket file');
    assert.match(out.systemMessage, /dispatching a reviewer/);
  });

  test(`a worker that did not move its ticket ends ${how}: no reminder`, () => {
    const state = stateDir();
    board(firstRound);
    assert.equal(runIn(state, ends(WORKER, SESSION)), null);
  });
}

test('a later round: the reminder says to resume the earlier reviewer', () => {
  const state = stateDir();
  const { root, ticket } = board(secondRoundByHistory);
  runIn(state, workerMoves(root, ticket));
  const text = runIn(state, notification()).hookSpecificOutput.additionalContext;
  assert.match(text, /Your worker subagent/);
  assert.match(text, /Resume the reviewer of the round before with SendMessage/);
  assert.match(text, /round 2, after 1 rejection/);
  assert.doesNotMatch(text, /Dispatch one subagent right now/);
});

test('after a merge postponed: the reminder says it is the review after a merge postponed', () => {
  const state = stateDir();
  const { root, ticket } = board(`
## History
- 2026-10-11 07:40:00 review
- 2026-10-11 08:00:00 done
- 2026-10-11 08:10:00 in_progress
- 2026-10-11 08:30:00 review
`);
  runIn(state, workerMoves(root, ticket));
  const out = runIn(state, notification());
  assert.match(out.hookSpecificOutput.additionalContext, /review after a merge postponed/);
  assert.match(out.systemMessage, /after a merge postponed/);
});

test('the reminder comes once: a worker resumed later that ends without moving its ticket again summons nobody', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  assert.ok(runIn(state, notification()));
  // The same task-id notifies again each time the agent is resumed and stops.
  assert.equal(runIn(state, notification()), null);
  assert.equal(runIn(state, agentReturned()), null);
});

test('a worker resumed after a rejection that moves its ticket to review again: a new reminder', () => {
  const state = stateDir();
  const { root, ticket } = board(secondRoundByHistory);
  runIn(state, workerMoves(root, ticket));
  assert.ok(runIn(state, notification()));
  runIn(state, workerMoves(root, ticket));
  assert.match(runIn(state, notification()).hookSpecificOutput.additionalContext, /Resume the reviewer/);
});

test('a worker that moved its ticket to review and then back out of it: no reminder', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  const back = path.join(root, '.kerjaan', 'in_progress');
  fs.mkdirSync(back, { recursive: true });
  fs.renameSync(ticket, path.join(back, path.basename(ticket)));
  assert.equal(runIn(state, notification()), null);
});

test('a background launch is not the worker ending: no reminder yet, and the one at its end still comes', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  assert.equal(runIn(state, agentLaunched()), null);
  assert.match(runIn(state, notification()).hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
});

test('only the agent that moved the ticket, in the session it moved it in, brings the reminder', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  assert.equal(runIn(state, notification('aother000000000001')), null, 'another agent');
  assert.equal(runIn(state, agentReturned('aother000000000001')), null, 'another agent, foreground');
  assert.equal(runIn(state, notification(WORKER, 'other-session')), null, 'another session');
  assert.ok(runIn(state, notification()), 'the worker itself');
});

test('an agent that ends inside a subagent is not reported to the foreman by that subagent\'s hook', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  assert.equal(runIn(state, { ...agentReturned(), agent_id: 'aparent0000000001' }), null);
  assert.equal(runIn(state, { ...notification(), agent_id: 'aparent0000000001' }), null);
  assert.ok(runIn(state, notification()));
});

test('an ordinary prompt from the owner summons nobody', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  assert.equal(runIn(state, { session_id: SESSION, hook_event_name: 'UserPromptSubmit', prompt: `continue ticket ${id} and ${WORKER}` }), null);
  // Even one that quotes the tag, outside a <task-notification>.
  assert.equal(runIn(state, { session_id: SESSION, hook_event_name: 'UserPromptSubmit', prompt: `what does <task-id>${WORKER}</task-id> mean?` }), null);
  assert.ok(runIn(state, notification()), 'the note is still there for the real end');
});

test('a notification naming several agents reminds for each that moved a ticket', () => {
  const state = stateDir();
  const { root, ticket } = board(firstRound);
  runIn(state, workerMoves(root, ticket));
  const both = notification();
  both.prompt = notification('aother000000000001').prompt + '\n' + both.prompt;
  const out = runIn(state, both);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`Your worker subagent ${WORKER}`));
});

test('a state folder that cannot be written costs the reminder, not the worker\'s message', () => {
  const blocker = path.join(stateDir(), 'a-file');
  fs.writeFileSync(blocker, '');
  const { root, ticket } = board(firstRound);
  const out = runIn(blocker, workerMoves(root, ticket));
  assert.match(out.hookSpecificOutput.additionalContext, /Finish now with your report/);
  assert.equal(runIn(blocker, notification()), null);
});

// Every way of writing the move to review. Each is run through the real
// update-ticket.sh by a real shell, so the quotes are the shell's to strip,
// and the hook then reads the command text and the output it printed.
const update = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'update-ticket.sh');
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
};
function realBoard() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-hook-real-')));
  const g = (...a) => assert.equal(spawnSync('git', a, { cwd: root, env: gitEnv }).status, 0);
  g('init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), '---\nlanguage: English\ntest_command:\nlong_lived_branches: []\n---\n');
  fs.writeFileSync(path.join(root, '.kerjaan', 'in_progress', `${id} A ticket.md`),
    '---\ntype: task\npriority: medium\nreview: quick\nlabels: []\nreporter: mirza\nassign_to: claude\n' +
    'created: 2026-10-11 07:00:00\nupdated: 2026-10-11 07:10:00\nrelated: []\nblocked_by: []\n---\n\n' +
    '## Background\nSomething.\n\n## Request\nSomething.\n\n## Done when\n- [x] Something.\n\n## History\n- 2026-10-11 07:10:00 in_progress\n\n## Notes\n(none yet)\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'initial');
  return root;
}

const reviewForms = {
  'bare': `--status review`,
  'in double quotes': `--status "review"`,
  'in single quotes': `--status 'review'`,
  'joined with =': `--status=review`,
  'joined with = and double quotes': `--status="review"`,
  'joined with = and single quotes': `--status='review'`,
  'after two spaces': `--status  review`,
  'after a tab': `--status\treview`,
  'before a pipe': `--status review | cat`,
  'before &&': `--status "review" && true`,
  'before ;': `--status=review; true`,
};

for (const [form, flag] of Object.entries(reviewForms)) {
  const command = `bash "${update}" ${id} ${flag}`;

  test(`the move written ${form} (${flag}): the ticket arrives and the foreman is told to dispatch`, () => {
    const root = realBoard();
    const r = spawnSync('bash', ['-c', command], { cwd: root, encoding: 'utf8', env: { ...gitEnv, CLAUDE_CODE_SESSION_ID: '' } });
    assert.equal(r.status, 0, r.stderr);
    const ticket = path.join(root, '.kerjaan', 'review', `${id} A ticket.md`);
    assert.ok(fs.existsSync(ticket), 'update-ticket.sh did not move the ticket');
    const payload = { cwd: root, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command }, tool_response: { stdout: r.stdout, stderr: '' } };
    const out = runIn(stateDir(), payload);
    assert.ok(out, `the hook did not recognise: ${command}`);
    assert.match(out.hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
  });

  test(`the move written ${form} (${flag}) by a worker: told to report, and the foreman reminded at its end`, () => {
    const state = stateDir();
    const { root, ticket } = board(firstRound);
    const payload = workerMoves(root, ticket);
    payload.tool_input.command = `"$K/update-ticket.sh" ${id} ${flag}`;
    const out = runIn(state, payload);
    assert.ok(out, `the hook did not recognise: ${payload.tool_input.command}`);
    assert.match(out.hookSpecificOutput.additionalContext, /Finish now with your report/);
    assert.match(runIn(state, notification()).hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
  });
}

for (const flag of ['--status reviewed', '--status=reviewer', '--status in_progress', '--status=done', '--title review']) {
  test(`a command that does not move to review (${flag}) summons nobody, even with the ticket in review/`, () => {
    const state = stateDir();
    const { root, ticket } = board(firstRound);
    const payload = moveToReview(root, ticket);
    payload.tool_input.command = `"$K/update-ticket.sh" ${id} ${flag}`;
    assert.equal(runIn(state, payload), null);
    assert.equal(runIn(state, { ...payload, session_id: SESSION, agent_id: WORKER }), null);
    assert.equal(runIn(state, notification()), null);
  });
}

test('update-ticket.sh refuses --status= with no value', () => {
  const root = realBoard();
  const r = spawnSync('bash', [update, id, '--status='], { cwd: root, encoding: 'utf8', env: gitEnv });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--status needs a value/);
});

test('hooks.json sends the Agent tool and every prompt to the review hook, as well as Bash', () => {
  const conf = JSON.parse(fs.readFileSync(path.join(here, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  const script = /on-ticket-review\.sh/;
  const post = conf.PostToolUse.find((h) => h.matcher.split('|').includes('Agent'));
  assert.ok(post && post.hooks.some((h) => script.test(h.command)), 'no PostToolUse hook on Agent');
  assert.ok(post.matcher.split('|').includes('Task'));
  assert.ok(conf.UserPromptSubmit.some((g) => !g.matcher && g.hooks.some((h) => script.test(h.command))), 'no UserPromptSubmit hook');
  assert.ok(conf.PostToolUse.some((g) => g.matcher === 'Bash' && g.hooks.some((h) => script.test(h.command))));
});

for (const [which, response] of [['status async_launched', { status: 'async_launched', agentId: WORKER }], ['isAsync', { isAsync: true, agentId: WORKER }]]) {
  test(`a background launch told by ${which} alone is not the worker ending`, () => {
    const state = stateDir();
    const { root, ticket } = board(firstRound);
    runIn(state, workerMoves(root, ticket));
    assert.equal(runIn(state, agentReturned(WORKER, SESSION, { tool_response: response })), null);
    assert.ok(runIn(state, notification()));
  });
}
