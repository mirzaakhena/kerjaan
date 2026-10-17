// The skill loads only what nearly every request needs (261016141909): its
// main file stays near 350 lines, its quick reference holds only the
// everyday commands, everything else is in a guide that SKILL.md names, each
// rule is written in full in one place, no guide has a step done by hand that
// a script already does, and the documents together stay shorter than before.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const flat = (t) => t.replace(/\s+/g, ' ');
const words = (t) => t.split(/\s+/).filter(Boolean).length;

const SKILL = 'skills/kerjaan/SKILL.md';
const refs = fs.readdirSync(path.join(root, 'skills', 'kerjaan', 'references'))
  .filter((f) => f.endsWith('.md')).map((f) => `skills/kerjaan/references/${f}`);
const agents = fs.readdirSync(path.join(root, 'agents'))
  .filter((f) => f.endsWith('.md')).map((f) => `agents/${f}`);
const docs = [SKILL, ...refs, ...agents];

test('SKILL.md is at most about 350 lines', () => {
  const n = read(SKILL).split('\n').length;
  assert.ok(n <= 360, `${SKILL} has ${n} lines`);
});

// The budget for the rules a session reads (261016141911): the main file, every
// guide and every agent definition together, 18,000 words. Before 261016141909
// they held 25,617. This is the one place the number is checked; a new rule
// names what it removes or replaces (README, "Keeping the rules small").
const BUDGET = 18000;
test(`the main file, the guides and the agent definitions together stay within ${BUDGET} words`, () => {
  assert.deepEqual(docs.slice(0, 1), [SKILL]);
  assert.ok(refs.length >= 5 && agents.length >= 3, docs.join(', '));
  const n = docs.reduce((sum, f) => sum + words(read(f)), 0);
  assert.ok(n <= BUDGET, `${n} words in ${docs.join(', ')}, over the budget of ${BUDGET}`);
});

test('the README gives the budget and the rule that a new rule names what it removes', () => {
  const section = flat(read('README.md').split('## Keeping the rules small')[1].split('\n## ')[0]);
  assert.match(section, new RegExp(`${BUDGET.toLocaleString('en-US')} words`));
  assert.match(section, /uji\/skill-ringkas\.test\.mjs/);
  assert.match(section, /A new rule names the rule it removes or replaces/);
});

test('the worker writes its Notes as a summary, not a full log', () => {
  const step = flat(read('agents/kerjaan-worker.md').split('**5. Prove the tests can go red.**')[1].split('**6. ')[0]);
  assert.match(step, /What you write in `## Notes` is a summary, never a log/);
  assert.match(step, /No commands with their output/);
});

const quickReference = () => read(SKILL).split('## Quick reference')[1].match(/```bash\n([\s\S]*?)```/)[1];

test('the quick reference names only the commands nearly every session uses', () => {
  const named = [...quickReference().matchAll(/"\$K\/([a-z-]+\.sh)"/g)].map((m) => m[1]);
  assert.ok(named.length >= 3, quickReference());
  for (const s of named) assert.ok(['new-ticket.sh', 'update-ticket.sh'].includes(s), `${s} is in the quick reference`);
  assert.doesNotMatch(quickReference(), /--accept-size|--ack-unmerged/);
});

// Each script a person or agent runs is still findable: named in SKILL.md or
// in a guide SKILL.md points at.
const scripts = fs.readdirSync(path.join(root, 'skills', 'kerjaan', 'scripts'))
  .filter((f) => f.endsWith('.sh') && !['lib.sh', 'on-ticket-review.sh'].includes(f));
for (const s of scripts) {
  test(`${s} is named in SKILL.md or one of its guides`, () => {
    assert.ok([SKILL, ...refs].some((f) => read(f).includes(s)), s);
  });
}

// SKILL.md says when each guide is read, in its table under the quick reference.
const guideTable = () => read(SKILL).split('## Quick reference')[1].split('\n\n')
  .find((block) => block.startsWith('| When | Read |'));
for (const guide of refs) {
  test(`SKILL.md says when to read ${path.basename(guide)}`, () => {
    const row = guideTable().split('\n').find((l) => l.endsWith(`| \`references/${path.basename(guide)}\` |`));
    assert.ok(row, `no row for ${guide} in:\n${guideTable()}`);
    assert.ok(row.split('|')[1].trim().length > 10, row);
  });
}

test('the foreman guide is read before any ticket is worked on and whenever a worker or reviewer reports', () => {
  const row = guideTable().split('\n').find((l) => l.includes('`references/foreman.md`'));
  assert.match(row, /Any ticket is about to be worked on/);
  assert.match(row, /a worker or reviewer reports/);
  assert.match(flat(read(SKILL)), /every ticket goes to a `kerjaan-worker` subagent \(`references\/foreman\.md`\)/);
});

// The scripts folder is found when CLAUDE_PLUGIN_ROOT is empty, as the agents
// find it, and taken from CLAUDE_PLUGIN_ROOT when it is set.
function resolveK(env) {
  const lines = quickReference().split('\n').filter((l) => /^(K=|\[ -d "\$K" \])/.test(l)).join('\n');
  const r = spawnSync('bash', ['-c', `${lines}\nprintf %s "$K"`], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

test('the quick reference finds the scripts folder with CLAUDE_PLUGIN_ROOT empty or unset', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-home-'));
  const dir = path.join(home, '.claude', 'plugins', 'cache', 'kerjaan', 'kerjaan', '9.9.9', 'skills', 'kerjaan', 'scripts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'new-ticket.sh'), '');
  assert.equal(resolveK({ HOME: home, CLAUDE_PLUGIN_ROOT: '' }), dir);
  assert.equal(resolveK({ HOME: home }), dir);
  const plugin = path.join(home, 'plugin');
  fs.mkdirSync(path.join(plugin, 'skills', 'kerjaan', 'scripts'), { recursive: true });
  assert.equal(resolveK({ HOME: home, CLAUDE_PLUGIN_ROOT: plugin }), path.join(plugin, 'skills', 'kerjaan', 'scripts'));
});

// What a script already does is not written as commands to run by hand.
const byHand = {
  'creating a worktree with git': /git worktree add/,
  'setting the sparse checkout': /git sparse-checkout set/,
  'diffing todo against order.md': /diff <\(/,
};
// The code blocks of a document, fence by fence, so that the closing fence of
// one block is never read as the opening of the next.
function codeBlocks(text) {
  const out = [];
  let open = null;
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      if (open) { out.push(open.join('\n')); open = null; } else open = [];
    } else if (open) open.push(line);
  }
  return out;
}
for (const file of docs) {
  test(`${file} has no step done by hand that a script does`, () => {
    const blocks = codeBlocks(read(file)).join('\n');
    for (const [what, re] of Object.entries(byHand)) assert.doesNotMatch(blocks, re, `${file}: ${what}`);
  });
}

test('the code blocks are read fence by fence', () => {
  const text = 'a\n```markdown\nx\n```\nprose diff <(\n```bash\ny\n```\n';
  assert.deepEqual(codeBlocks(text), ['x', 'y']);
});

// Each of these rules is written in full in exactly one document; the others
// point at it in a line.
const onePlace = [
  ['how one ticket splits into at most three commits', /at most three commits\*\*/, 'skills/kerjaan/references/foreman.md'],
  ['what to do with unmerged branches at the start gate', /add it to `long_lived_branches`, or start anyway/, 'skills/kerjaan/references/foreman.md'],
  ['the tiny text change the foreman may make itself', /tiny change in text the owner asks for/, 'skills/kerjaan/references/foreman.md'],
  ['when the queue is filled, and that nothing moves before the owner approves', /Nothing moves before the owner approves/, 'skills/kerjaan/references/foreman.md'],
  ['marking a ticket done on the owner\'s word', /without review, <date>/, 'skills/kerjaan/references/foreman.md'],
  ['tickets whose work is a decision', /Into `in_progress` before the first answer is written/, 'skills/kerjaan/references/foreman.md'],
  ['how a ticket is split', /Split by outcome, never by file or by technical layer/, SKILL],
  ['the size limit', /About 6 to 8 items in `Done when` is the limit/, SKILL],
  ['fixing the kind of mistake after a rejection', /Fix the kind of mistake, not the instance named/, 'agents/kerjaan-worker.md'],
  ['which tickets may share a group', /\*\*never\*\* share a group/, 'skills/kerjaan/references/ordering-the-queue.md'],
  ['when the queue is refilled', /Refill when `todo`, `in_progress` and `review` are all three empty/, 'skills/kerjaan/references/ordering-the-queue.md'],
  ['the order to take tickets in', /take\s+the first ticket, or any ticket in its first group/, 'skills/kerjaan/references/foreman.md'],
];
for (const [what, re, home] of onePlace) {
  test(`one place for ${what}`, () => {
    const holders = docs.filter((f) => re.test(flat(read(f))) || re.test(read(f)));
    assert.deepEqual(holders, [home]);
  });
}

// A reference to a section names a section that exists.
const files = {};
for (const f of docs) {
  files[path.basename(f)] = f;
  files[f.replace(/^skills\/kerjaan\//, '')] = f;
}
const headings = (f) => [...read(f).matchAll(/^#{1,4} (.+)$/gm)].map((m) => m[1].trim());
const references = docs.flatMap((from) => [...flat(read(from))
  .matchAll(/`?((?:references\/|agents\/)?[A-Za-z-]+\.md)`?(?: in the kerjaan skill)?, (?:step \d+ of )?"([^"]+)"/g)]
  .filter((m) => files[m[1]]).map((m) => [from, m[1], m[2]]));
test('the documents point at sections by name', () => assert.ok(references.length >= 20, references.length));
for (const [from, to, name] of references) {
  test(`${from} → ${to}, "${name}" exists`, () => {
    assert.ok(headings(files[to]).some((h) => h === name || h.startsWith(`${name}`)), `${to} has no section "${name}"`);
  });
}
