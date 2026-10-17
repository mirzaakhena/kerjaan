// The skill's description calls the skill as often, and stays silent as
// often, as the one before it (261011073101), also after its Indonesian
// example phrases were taken out (261017184401). The trigger test itself calls
// Claude and is run by hand (tests/trigger/run.mjs); this file checks that its
// stored results belong to the prompts and descriptions in the repo, and that
// the current description is not worse than the previous one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPTS, sha, words, summarize, skillDescription } from './trigger/run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(fs.readFileSync(path.join(here, 'trigger', f), 'utf8'));
const prompts = load('prompts.json');
const before = load('results-before.json');
const after = load('results-after.json');
const previousDescription = fs.readFileSync(path.join(here, 'trigger', 'previous-description.txt'), 'utf8').trim();

test('the prompt set has prompts that should and should not call the skill, with a board and without', () => {
  assert.ok(prompts.length >= 30 && prompts.length <= 45, `${prompts.length} prompts`);
  for (const should of [true, false]) {
    for (const repo of ['board', 'empty']) {
      assert.ok(prompts.some((p) => p.should === should && p.repo === repo), `${repo} should=${should}`);
    }
  }
  assert.equal(new Set(prompts.map((p) => p.id)).size, prompts.length, 'ids are unique');
});

const has = (prompt, repo, should) => assert.ok(
  prompts.some((p) => p.prompt === prompt && p.repo === repo && p.should === should), `${prompt} (${repo}, should=${should})`);
test('the set holds the queue requests and the plain review/done in a repo without a board', () => {
  has('work the next ticket', 'board', true);
  has('work the queue', 'board', true);
  has('review this code', 'empty', false);
  has("it's done", 'empty', false);
});

for (const [name, r, description] of [['previous', before, previousDescription], ['current', after, skillDescription()]]) {
  test(`the ${name} description's results were run on this prompt set and this description`, () => {
    assert.equal(r.promptsSha, sha(PROMPTS), 'prompts.json changed after the run; run node tests/trigger/run.mjs again for both descriptions');
    assert.equal(r.description, description, 'the description changed after the run; run node tests/trigger/run.mjs again (README, "Running the tests")');
    assert.ok(r.repeat >= 3, `repeat ${r.repeat}`);
    assert.deepEqual(r.results.map((x) => x.id), prompts.map((p) => p.id));
    for (const x of r.results) assert.equal(x.runs.length, r.repeat, x.id);
    assert.deepEqual(r.summary, summarize(r.results), 'the summary is the one computed from the runs');
  });
}

test('the current description is shorter than the previous one', () => {
  assert.ok(words(skillDescription()) < words(previousDescription), `${words(skillDescription())} vs ${words(previousDescription)} words`);
});

test('the current description calls the skill at least as often where it should', () => {
  const [b, a] = [before.summary.should, after.summary.should];
  assert.ok(a.called >= b.called, `runs: current ${a.called}, previous ${b.called}`);
  assert.ok(a.promptsPassed >= b.promptsPassed, `prompts: current ${a.promptsPassed}, previous ${b.promptsPassed}`);
});

test('the current description calls the skill no more often where it should not', () => {
  const [b, a] = [before.summary.shouldNot, after.summary.shouldNot];
  assert.ok(a.called <= b.called, `runs: current ${a.called}, previous ${b.called}`);
  assert.ok(a.promptsPassed >= b.promptsPassed, `prompts: current ${a.promptsPassed}, previous ${b.promptsPassed}`);
});

// Per prompt, not per group: every queue request calls the skill in every run,
// and every plain review/done/todo in a repo without a board calls it in none.
for (const x of after.results.filter((x) => x.group === 'queue')) {
  test(`the current description calls the skill for the queue request "${x.prompt}"`, () => {
    assert.ok(x.runs.every((o) => o === 'skill'), x.runs.join(', '));
  });
}
for (const x of after.results.filter((x) => x.group === 'review-without-board')) {
  test(`the current description does not call the skill for "${x.prompt}" without a board`, () => {
    assert.ok(x.runs.every((o) => o !== 'skill'), x.runs.join(', '));
  });
}
