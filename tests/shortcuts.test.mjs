// The shortcuts an owner takes each have one written path (261016141908):
// work without a ticket still goes to a worker and always to a reviewer,
// "mark it done" goes through the worker's checks instead of the foreman
// ticking and moving, an owner-accepted ticket lands like a passed one, a
// worker stopped on a decision is resumed once the owner answers, and the one
// thing the foreman may do itself — a tiny change in text the owner asks for —
// is stated with its limit and its reason. The scripts' side of these paths is
// tested in merge.test.mjs.
//
// Each rule is checked by its key terms appearing together in one paragraph
// (or one list item) somewhere in the skill's documents, not by a sentence or a section heading,
// so the documents can be reworded and rearranged (261016141909) as long as
// every rule is still said somewhere. One check per rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const refs = fs.readdirSync(path.join(root, 'skills', 'kerjaan', 'references')).map((f) => `skills/kerjaan/references/${f}`);

// The skill as the foreman reads it, and each agent's own definition.
const skillDocs = ['skills/kerjaan/SKILL.md', ...refs];
const worker = ['agents/kerjaan-worker.md'];
const reviewer = ['agents/kerjaan-reviewer.md'];

// A paragraph, or one item of a list, so that terms from two neighbouring
// rules in one list do not count as one rule.
const paragraphs = (files) => files.flatMap((f) => read(f)
  .split(/\n\s*\n|\n(?=[ ]*(?:[-*]|\d+\.) )/).map((p) => p.replace(/\s+/g, ' ')));

// Some paragraph in <files> holds every one of <terms>.
function says(files, terms, what) {
  const hit = paragraphs(files).some((p) => terms.every((t) => t.test(p)));
  assert.ok(hit, `${what}: no paragraph in ${files.join(', ')} holds all of ${terms.join(' ')}`);
}

test('docs: work without a ticket ("just do it") still goes to a worker, and always to a reviewer', () => {
  says(skillDocs, [/just do it/, /worker/, /reviewer/], 'the skill');
  says(skillDocs, [/without a ticket|skip the ticket/i, /reviewer/, /always/], 'the foreman');
  says(worker, [/No ticket/, /reviewer/, /report/], 'the worker records its work for the reviewer');
  says(reviewer, [/No ticket/, /request/], 'the reviewer has a path without a ticket');
});

test('docs: "mark it done" goes through a worker and test-run.sh, also when review is skipped', () => {
  says(skillDocs, [/mark it done|this work is done/, /test-run\.sh/, /in_progress/], 'the path from todo or in_progress');
  says(skillDocs, [/without review/, /checks are still run|test-run\.sh/], 'skipping review keeps the checks');
});

test('docs: a ticket the owner accepted after two rejections is landed like a passed one', () => {
  says(skillDocs, [/(owner|they) accept|accepted by the owner/i, /rejection/, /merge\.sh"? land/], 'the accepted ticket lands');
});

test('docs: a worker stopped on a decision is resumed once the owner answers, in written steps', () => {
  says(skillDocs, [/owner answer/, /SendMessage/, /same worker/], 'the foreman\'s steps');
  says(worker, [/STOPPED — decision/, /answer/, /resum/], 'the worker\'s side');
});

test('docs: the foreman may make a tiny text change the owner asks for, scripts excluded, with the reason', () => {
  says(skillDocs, [/tiny change in text/, /owner asks/, /script/, /goes to a worker/, /cost/], 'the exception, its limit and its reason');
});
