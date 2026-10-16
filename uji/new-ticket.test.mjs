// new-ticket.sh: the first ## History line of a new ticket names the Claude
// Code session that created it, and only when there is one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const create = path.join(here, '..', 'skills', 'kerjaan', 'scripts', 'new-ticket.sh');
const SESSION = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const TIME = String.raw`\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}`;

function board() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-new-')));
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), '---\nlanguage: English\n---\n');
  return root;
}

function create1(root, session, status = 'backlog') {
  const env = { ...process.env };
  if (session === undefined) delete env.CLAUDE_CODE_SESSION_ID;
  else env.CLAUDE_CODE_SESSION_ID = session;
  const r = spawnSync('bash', [create, status, 'Sebuah tiket'], { cwd: root, encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  const text = fs.readFileSync(r.stdout.trim(), 'utf8');
  const created = text.match(/^created: (.*)$/m)[1];
  const history = text.split('## History\n')[1].split('\n\n## Notes')[0].split('\n');
  return { created, history };
}

test('inside a Claude Code session the first line is "- <created> <session-id> <status>"', () => {
  const { created, history } = create1(board(), SESSION, 'todo');
  assert.deepEqual(history, [`- ${created} ${SESSION} todo`]);
});

for (const [where, session] of [['with no CLAUDE_CODE_SESSION_ID', undefined], ['with it empty', ''], ['with a value that is not one word', 'dua kata']]) {
  test(`${where} the first line is "- <created> <status>"`, () => {
    const { created, history } = create1(board(), session);
    assert.match(created, new RegExp(`^${TIME}$`));
    assert.deepEqual(history, [`- ${created} backlog`]);
  });
}
