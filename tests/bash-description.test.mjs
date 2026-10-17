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
