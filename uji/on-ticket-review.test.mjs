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
Hook mencari teks "Reviewed at level" di catatan tinjauan.
Reviewed at level quick, round 1 -- contoh baris pembuka peninjau.
${onlyOneReview}
## Notes
- Catatan pengerja.
`,
  'mid-sentence in a worker note': `
${onlyOneReview}
## Notes
- Catatan pengerja: peninjau membuka bloknya dengan "Reviewed at level", jadi
  hook mencarinya.
`,
  'on a wrapped continuation line of a worker note': `
${onlyOneReview}
## Notes
- Catatan pengerja: baris pembuka peninjau berbunyi
  Reviewed at level quick, round 1, at commit a1b2c3d.
`,
  'in a > quote in Notes': `
${onlyOneReview}
## Notes
- Catatan pengerja, mengutip tiket lain:
> Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
`,
  'inside a fenced block in Notes': `
${onlyOneReview}
## Notes
- Contoh blok peninjau:
\`\`\`
- Reviewed at level quick, round 1, at commit a1b2c3d: sent back.
\`\`\`
`,
  // Indented, so the line-start rule rejects it whether or not the fence is seen.
  'inside an indented fenced block in Notes': `
${onlyOneReview}
## Notes
- Contoh blok peninjau:
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
- Catatan pengerja, 11 Okt 2026:
  - Sinyal putaran. Hook menganggap tiket sudah pernah ditinjau bila
    \`## History\` memuat \`review\` lebih dari sekali, atau \`## Notes\` memuat
    "Reviewed at level". Sinyal kedua saja tidak cukup.
  - Catatan 1 (tidak memblokir): sinyal Notes memakai \`grep -q 'Reviewed at
    level'\` atas seluruh berkas.
`,
  'outside Notes, in a section after it': `
${onlyOneReview}
## Notes
- Catatan pengerja.

## Lampiran
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
    const body = `\n## History\n- 2026-10-11 08:20:00 review\n\n## Notes\n- Catatan pengerja.\n\n${line}\n`;
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
    const { root, ticket } = board(`\n## History\n${lines.join('\n')}\n\n## Notes\n- Catatan pengerja.\n`);
    const out = run(moveToReview(root, ticket));
    assert.match(out.hookSpecificOutput.additionalContext, /Resume the reviewer of the round before/);
    assert.match(out.systemMessage, /resuming its reviewer/);
  });

  test(`History with ${form}, cut after the first review: still round one`, () => {
    const { root, ticket } = board(`\n## History\n${lines.slice(0, 2).join('\n')}\n\n## Notes\n- Catatan pengerja.\n`);
    const out = run(moveToReview(root, ticket));
    assert.match(out.hookSpecificOutput.additionalContext, /Dispatch one subagent right now/);
    assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Resume the reviewer|later round/);
  });
}

// A session id is one word: a line with two words between the time and the
// status is not a History record, so it does not make a round.
test('a review line with more than one word before the status is not counted', () => {
  const body = `\n## History\n- 2026-10-11 07:40:00 ${S1} review\n- 2026-10-11 08:20:00 kata lain review\n\n## Notes\n- x\n`;
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
  const { text, sys } = hookText(`\n## History\n${H('todo', 'in_progress', 'review', 'in_progress', 'review', 'done', 'in_progress', 'review')}\n\n## Notes\n- 2026-10-11: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.\n- 2026-10-11: Reviewed at level quick, round 2, at commit b2c3d4e: passed.\n- 2026-10-11 09:00:00: merge postponed — main changed since tiket-x last took it in (a.txt); back to in_progress to be brought up to date with main, tested and reviewed again.\n`);
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

test('docs: the review guide and the reviewer give the same fixed opening line, in English, for both kinds of review', () => {
  const fixed = [
    '- <YYYY-MM-DD>: Reviewed at level <level>, round <n>, at commit <hash>: <passed | sent back>.',
    '- <YYYY-MM-DD>: Reviewed at level quick, after merge postponed, at commit <hash>: <passed | sent back>.',
  ];
  for (const name of ['review.md', 'kerjaan-reviewer.md']) {
    for (const line of fixed) assert.ok(docs[name].includes(`\n${line}\n`), `${name} lacks: ${line}`);
  }
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
