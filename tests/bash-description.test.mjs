// The viewer's activity panel shows a Bash step by its `description` and
// otherwise only by the program's name (261017155801), so every kerjaan agent
// is asked, in one sentence, to describe each command in the board's language.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SENTENCE = "Give every Bash call a short `description` in the board's language: it is what the board's viewer shows of that step.";

for (const agent of ['kerjaan-worker', 'kerjaan-reviewer', 'kerjaan-planner']) {
  test(`${agent} asks for a description of every command, once`, () => {
    const text = fs.readFileSync(path.join(root, 'agents', `${agent}.md`), 'utf8').replace(/\s+/g, ' ');
    assert.equal(text.split(SENTENCE).length - 1, 1, `${agent}.md`);
  });
}

// A command whose result is waited for runs in the foreground with a long
// timeout, and is never waited on with a check-and-sleep loop (261028102201):
// each agent carries the rule word for word, its reason included, and the
// foreman guide says the same for agents and background commands.
const WAIT = 'Run a command whose result you wait for (tests, a build, a download) in the '
  + 'foreground with a long timeout; split one that would outlast it. Never wait '
  + 'with a check-and-sleep loop, nor a way around a blocked `sleep`: an agent that '
  + 'ends its turn to wait looks finished to its sender, and a loop clutters the '
  + "owner's terminal and dodges a limit set on purpose.";
const flatDoc = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8').replace(/\s+/g, ' ');

for (const agent of ['kerjaan-worker', 'kerjaan-reviewer', 'kerjaan-planner']) {
  test(`${agent} waits for a command in the foreground, never with a check-and-sleep loop, once`, () => {
    assert.equal(flatDoc('agents', `${agent}.md`).split(WAIT).length - 1, 1, `${agent}.md`);
  });
}

test('the worker runs test-run.sh under that rule, and the reviewer still probes a server it starts in the background', () => {
  const step7 = flatDoc('agents', 'kerjaan-worker.md').split('**7. Run the checks last**')[1].split('**8. ')[0];
  assert.match(step7, /in the foreground \(step 3\)/);
  assert.match(flatDoc('agents', 'kerjaan-reviewer.md'), /start the dev or run command in the background, probe it \(`curl`, the project's CLI\), and stop it afterwards/);
});

test('the foreman guide waits for agents and background commands by their notification, never with a loop', () => {
  assert.match(flatDoc('skills', 'kerjaan', 'references', 'foreman.md'),
    /A notification arrives by itself, for an agent or a background command: never wait for one with a loop that checks and sleeps\./);
});
