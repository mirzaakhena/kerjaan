// The board scripts share one library (lib.sh) for the work they all do:
// refusing to run from a linked worktree, finding a ticket by its ID, adding a
// line to Notes, reading settings, taking the board lock, and skipping fenced
// blocks. Each rule is checked here against every script it applies to, one
// case per script: a rule tested on one script proves one script.
//
// Every test builds a throwaway repository with a board and runs the real
// scripts against it, the way the skill runs them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, '..', 'skills', 'kerjaan', 'scripts');
const S = (name) => path.join(scripts, name);

const A = '261017100001';
const B = '261017100002';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Uji',
  GIT_AUTHOR_EMAIL: 'uji@example.com',
  GIT_COMMITTER_NAME: 'Uji',
  GIT_COMMITTER_EMAIL: 'uji@example.com',
};
delete gitEnv.CLAUDE_CODE_SESSION_ID;

function ticketText({ created = '2026-10-17 10:00:00', background = 'Sesuatu.', doneWhen = '- [ ] Satu', notes = '(none yet)', history = `- ${created} backlog` } = {}) {
  return `---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: ${created}
updated: ${created}
related: []
blocked_by: []
---

## Background
${background}

## Request
Sesuatu.

## Done when
${doneWhen}

## History
${history}

## Notes
${notes}
`;
}

function git(root, ...args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function repo({ gitRepo = true } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-pustaka-')));
  if (gitRepo) git(root, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(root, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), `---
language: Bahasa Indonesia
test_command: true
long_lived_branches: []
---
`);
  fs.writeFileSync(path.join(root, 'kode.txt'), 'satu\n');
  if (gitRepo) {
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'awal');
  }
  return root;
}

function add(root, id, { status = 'backlog', title = `Tiket ${id}`, ...t } = {}) {
  const file = path.join(root, '.kerjaan', status, `${id} ${title}.md`);
  fs.writeFileSync(file, ticketText(t));
  return file;
}

function run(cwd, script, ...args) {
  const r = spawnSync('bash', [script, ...args], { cwd, encoding: 'utf8', env: gitEnv });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

// Every file under .kerjaan/, with its content, so "nothing changed" can be
// checked whole.
function snapshot(root) {
  const out = {};
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out[path.relative(root, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(path.join(root, '.kerjaan'));
  return out;
}

// --- refusing to run from a linked worktree ------------------------------------------
// Every script that acts on the board refuses from a linked worktree with the
// same words, naming the main tree, and changes nothing.

const fromWorktree = {
  'new-ticket.sh': ['new-ticket.sh', 'backlog', 'Tiket baru'],
  'update-ticket.sh': ['update-ticket.sh', A, '--status', 'todo'],
  'worktree.sh add': ['worktree.sh', 'add', A, 'jalan-lain'],
  'queue.sh': ['queue.sh', 'estimate', A, 'kode.txt'],
  'release.sh': ['release.sh', 'unreleased'],
  'merge.sh land': ['merge.sh', 'land', A],
  'repair.sh': ['repair.sh', 'duplicate-id', A],
};

for (const [name, [script, ...args]] of Object.entries(fromWorktree)) {
  test(`${name} refuses to run from a linked worktree, naming the main tree, and changes nothing`, () => {
    const root = repo();
    add(root, A, { status: name === 'merge.sh land' ? 'done' : 'backlog' });
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'tiket');
    const wt = `${root}-wt`;
    git(root, 'worktree', 'add', '-q', '-b', 'samping', wt);
    const before = snapshot(root);
    const r = run(wt, S(script), ...args);
    assert.notEqual(r.code, 0, r.out);
    assert.match(r.err, /^This is a linked git worktree, and the board does not live here\.$/m);
    assert.match(r.err, new RegExp(`^Run ${script.replace('.', '\\.')} from the main tree instead:\\n  ${root}$`, 'm'));
    assert.deepEqual(snapshot(root), before);
    assert.equal(fs.readdirSync(path.join(wt, '.kerjaan', 'backlog')).filter((n) => n.endsWith('.md')).length,
      name === 'merge.sh land' ? 0 : 1, 'the worktree copy of the board is untouched too');
    git(root, 'worktree', 'remove', '--force', wt);
  });
}

// --- finding a ticket by its ID ------------------------------------------------------
// Two tickets with one ID: no script picks one of them. Each refuses, lists
// both, names the repair command, and changes nothing.

const byId = {
  'update-ticket.sh': (root) => ['update-ticket.sh', A],
  'ticket-size.sh': (root) => ['ticket-size.sh', A],
  'test-run.sh': (root) => ['test-run.sh', A],
  'queue.sh estimate': (root) => ['queue.sh', 'estimate', A, 'kode.txt'],
  'queue.sh check': (root) => ['queue.sh', 'check', A],
  'merge.sh check': (root) => ['merge.sh', 'check', A],
  'worktree.sh add': (root) => ['worktree.sh', 'add', A, path.join(path.dirname(root), `${path.basename(root)}-wt`)],
};

for (const [name, argsOf] of Object.entries(byId)) {
  test(`${name}, given an ID two tickets share, refuses and names the repair, changing nothing`, () => {
    const root = repo();
    const one = add(root, A, { title: 'Pertama', status: 'in_progress' });
    const two = add(root, A, { title: 'Kedua', status: 'in_progress', created: '2026-10-17 11:00:00' });
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'tiket');
    const before = snapshot(root);
    const [script, ...args] = argsOf(root);
    const r = run(root, S(script), ...args);
    assert.notEqual(r.code, 0, r.out + r.err);
    assert.match(r.err, new RegExp(`ID ${A} is used by more than one ticket`));
    assert.ok(r.err.includes(one) && r.err.includes(two), r.err);
    assert.match(r.err, new RegExp(`repair\\.sh duplicate-id ${A}`));
    assert.deepEqual(snapshot(root), before);
    assert.equal(git(root, 'worktree', 'list').split('\n').length, 1, 'no worktree made');
  });
}

for (const [name, argsOf] of Object.entries(byId)) {
  test(`${name}, given an ID no ticket has, says so`, () => {
    const root = repo();
    add(root, B);
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'tiket');
    const [script, ...args] = argsOf(root);
    const r = run(root, S(script), ...args);
    assert.notEqual(r.code, 0);
    assert.match(r.err, new RegExp(`No ticket with ID ${A}\\.`));
  });
}

// --- fenced blocks ----------------------------------------------------------------------
// A fence opened with ``` and one opened with ~~~ are the same thing to every
// script: what is inside is an example, never a heading or a record.

for (const fence of ['```', '~~~']) {
  test(`update-ticket.sh, ${fence}: a "## History" inside a fenced block is not where the move is recorded`, () => {
    const root = repo({ gitRepo: false });
    const example = `${fence}markdown\n## History\n- 2026-01-01 00:00:00 todo\n${fence}`;
    const file = add(root, A, { background: `Contoh:\n\n${example}` });
    const r = run(root, S('update-ticket.sh'), A, '--status', 'todo');
    assert.equal(r.code, 0, r.err);
    const text = fs.readFileSync(r.out.trim(), 'utf8');
    assert.ok(text.includes(`Contoh:\n\n${example}\n`), 'the example is left as it was');
    assert.match(text, /\n## History\n- 2026-10-17 10:00:00 backlog\n- \d{4}-\d\d-\d\d \d\d:\d\d:\d\d todo\n\n## Notes/);
    assert.equal(fs.existsSync(file), false);
  });

  test(`ticket-size.sh, ${fence}: checkboxes inside a fenced block in Done when are not counted`, () => {
    const root = repo({ gitRepo: false });
    const doneWhen = '- [ ] Satu\n\n' + `${fence}\n` + Array.from({ length: 9 }, (_, i) => `- [ ] Contoh ${i}`).join('\n') + `\n${fence}`;
    add(root, A, { doneWhen });
    assert.doesNotMatch(run(root, S('ticket-size.sh'), A).err, /WARNING/);
  });

  test(`ticket-size.sh, ${fence}: the acceptance sentence inside a fenced block is an example, not the owner's decision`, () => {
    const root = repo({ gitRepo: false });
    const doneWhen = Array.from({ length: 9 }, (_, i) => `- [ ] Butir ${i}`).join('\n');
    const sentence = 'size accepted by the owner with --accept-size: this ticket stays whole although its "Done when" list is over the board\'s limit.';
    add(root, A, { doneWhen, notes: `- Contoh:\n${fence}\n- 2026-10-17 10:00:00: ${sentence}\n${fence}` });
    assert.match(run(root, S('ticket-size.sh'), A).err, /WARNING: 261017100001 has 9/);
  });

  test(`queue.sh, ${fence}: a question or an estimate inside a fenced block is not a record`, () => {
    const root = repo();
    add(root, A, { notes: `- Contoh:\n${fence}\n- 2026-10-17 10:00:00: open question: ini contoh?\n- 2026-10-17 10:00:00: files estimated to change: \`kode.txt\`\n${fence}` });
    const r = run(root, S('queue.sh'), 'check', A);
    assert.doesNotMatch(r.out, /open question/);
    assert.match(r.out, /no estimate of the files/);
    // A real question is numbered 1, the example not counted.
    const ask = run(root, S('queue.sh'), 'ask', A, 'Yang sungguhan?');
    assert.equal(ask.code, 0, ask.err);
    assert.match(ask.out, /as question 1\./);
    // Its answer goes under the real question, not under the example.
    const answer = run(root, S('queue.sh'), 'answer', A, '1', 'Ya.');
    assert.equal(answer.code, 0, answer.err);
    const text = fs.readFileSync(path.join(root, '.kerjaan', 'backlog', `${A} Tiket ${A}.md`), 'utf8');
    assert.ok(text.includes(`${fence}\n- 2026-10-17 10:00:00: open question: ini contoh?\n`), 'the example is left as it was');
    assert.match(text, /: answered question: Yang sungguhan\?\n  answer, [^\n]+: Ya\.\n$/);
  });

  test(`on-ticket-review.sh, ${fence}: a reviewer's opening line inside a fenced block is not a review`, () => {
    const root = repo({ gitRepo: false });
    const ticket = add(root, A, {
      status: 'review',
      history: '- 2026-10-17 10:00:00 in_progress\n- 2026-10-17 10:30:00 review',
      notes: `- Contoh blok peninjau:\n${fence}\n- 2026-10-17: Reviewed at level quick, round 1, at commit a1b2c3d: sent back.\n${fence}`,
    });
    const payload = {
      cwd: root,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: `"$K/update-ticket.sh" ${A} --status review` },
      tool_response: { stdout: `${ticket}\n`, stderr: '' },
    };
    const r = spawnSync('bash', [S('on-ticket-review.sh')], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } });
    assert.equal(r.status, 0, r.stderr);
    const text = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
    assert.match(text, /Dispatch one subagent right now/);
    assert.doesNotMatch(text, /later round|Resume the reviewer/);
  });
}

// The hook finds the ticket in review/ through the same lookup when the
// command's output was swallowed, from any of its roots.
test('on-ticket-review.sh finds the ticket in review/ from the session cwd when the output was swallowed', () => {
  const root = repo({ gitRepo: false });
  add(root, A, { status: 'review', history: '- 2026-10-17 10:30:00 review' });
  const payload = {
    cwd: root,
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: `"$K/update-ticket.sh" ${A} --status review > /dev/null` },
    tool_response: { stdout: '', stderr: '' },
  };
  const r = spawnSync('bash', [S('on-ticket-review.sh')], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, new RegExp(`${A} Tiket ${A}\\.md`));
});

// --- settings ---------------------------------------------------------------------------
// Settings are read by one function: the same quoting and the same rule that
// only the frontmatter holds settings, for every key.

test('long_lived_branches is read like every other setting: quoted items, and only from the frontmatter', () => {
  const root = repo();
  git(root, 'branch', 'develop');
  git(root, 'checkout', '-q', 'develop');
  fs.writeFileSync(path.join(root, 'kode.txt'), 'dua\n');
  git(root, 'commit', '-q', '-am', 'di develop');
  git(root, 'checkout', '-q', 'main');
  add(root, A, { status: 'todo' });
  const settings = path.join(root, '.kerjaan', 'settings.md');
  // Below the frontmatter: prose, so develop counts as unmerged work.
  fs.writeFileSync(settings, '---\nlanguage: Bahasa Indonesia\n---\n\nlong_lived_branches: [develop]\n');
  const refused = run(root, S('update-ticket.sh'), A, '--status', 'in_progress');
  assert.equal(refused.code, 1);
  assert.match(refused.err, /develop/);
  fs.writeFileSync(settings, `---\nlanguage: Bahasa Indonesia\nlong_lived_branches: ["develop", 'release/*']\n---\n`);
  const started = run(root, S('update-ticket.sh'), A, '--status', 'in_progress');
  assert.equal(started.code, 0, started.err);
});

test('done_when_limit may be quoted, like any setting', () => {
  const root = repo({ gitRepo: false });
  fs.writeFileSync(path.join(root, '.kerjaan', 'settings.md'), '---\ndone_when_limit: "2"\n---\n');
  add(root, A, { doneWhen: '- [ ] a\n- [ ] b\n- [ ] c' });
  assert.match(run(root, S('ticket-size.sh'), A).err, /has 3 "Done when" items, over this board's limit of 2/);
});

// --- one implementation each -----------------------------------------------------------
// The behaviour above holds today; this keeps it from drifting apart again. No
// script but lib.sh carries its own copy of the shared work.

const code = (name) => fs.readFileSync(S(name), 'utf8').split('\n')
  .map((line, i) => ({ line, n: i + 1 }))
  .filter(({ line }) => !/^\s*#/.test(line));
const others = fs.readdirSync(scripts).filter((n) => n.endsWith('.sh') && n !== 'lib.sh');

const copies = {
  'a test for a linked worktree': /\/gitdir"|git-common-dir.*!=|worktree list --porcelain \| sed -n '1s/,
  'a search for a ticket by its ID': /"\$[a-z_]+ "\*\.md/,
  'a line appended to a ticket by hand': />> "\$(file|ticket|f|dest)"/,
  'a frontmatter or settings reader of its own': /(awk|sed)\b.*settings|\^(blocked_by|long_lived_branches|done_when_limit|test_command):|index\(\$0, k(ey)? ":"\)/,
  'a lock of its own': /mkdir "\$lock|\.kerjaan\/\.lock|\$board\/\.lock/,
  'a fence pattern of its own': /```|~~~/,
  'the acceptance sentence written out again': /size accepted by the owner/,
};

for (const [what, pattern] of Object.entries(copies)) {
  test(`no script but lib.sh holds ${what}`, () => {
    const found = [];
    for (const name of others) {
      for (const { line, n } of code(name)) if (pattern.test(line)) found.push(`${name}:${n}: ${line.trim()}`);
    }
    assert.deepEqual(found, []);
  });
}

test('every board script sources lib.sh', () => {
  for (const name of others) {
    assert.match(fs.readFileSync(S(name), 'utf8'), /^\s*\. "\$[a-z_]+\/lib\.sh"$|lib\.sh"$/m, name);
  }
});
