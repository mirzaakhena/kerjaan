// The handoff before the context is summarized (261026152201). The main
// session holds what the board does not -- agents running, decisions given in
// conversation, reminders -- and a summary can drop it. handoff.sh, a hook,
// estimates how full the context is from the transcript and, near
// `handoff_at` (80% by default), tells the session to write .kerjaan/handoff.md
// in a fixed form, or to rewrite it in place; right after the summary it hands
// the file to the session, to act on first and then delete. The file is kept
// out of git and out of every board check.
//
// Every test builds a throwaway repository with a board and a transcript, and
// runs the real hook with the JSON Claude Code would give it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const scripts = path.join(root, 'skills', 'kerjaan', 'scripts');
const hook = path.join(scripts, 'handoff.sh');
const flat = (t) => t.replace(/\s+/g, ' ');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const ID = '261026100001';
const SESSION = 'sess-handoff-1';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};
delete gitEnv.CLAUDE_CODE_SESSION_ID;
delete gitEnv.CLAUDE_PROJECT_DIR;
delete gitEnv.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
delete gitEnv.CLAUDE_CODE_DISABLE_1M_CONTEXT;

const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: gitEnv });

function repo(settings = '') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-handoff-')));
  git(dir, 'init', '-q', '-b', 'main');
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    fs.mkdirSync(path.join(dir, '.kerjaan', s), { recursive: true });
    fs.writeFileSync(path.join(dir, '.kerjaan', s, '.gitkeep'), '');
  }
  fs.writeFileSync(path.join(dir, '.kerjaan', 'settings.md'), `---\nlanguage: English\ntest_command:\nlong_lived_branches: []\n${settings}---\n`);
  fs.writeFileSync(path.join(dir, '.kerjaan', 'backlog', `${ID} One ticket.md`), `---
type: task
priority: medium
review:
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-26 10:00:00
updated: 2026-10-26 10:00:00
related: []
blocked_by: []
---

## Background
Something.

## Request
Something.

## Done when
- [ ] One

## History
- 2026-10-26 10:00:00 backlog

## Notes
(none yet)
`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'initial');
  const state = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-handoff-state-'));
  const transcript = path.join(state, 'transcript.jsonl');
  fs.writeFileSync(transcript, '');
  return { dir, state, transcript, file: path.join(dir, '.kerjaan', 'handoff.md') };
}

// One answer of the model, as the transcript records it: the tokens it was
// given are how full the context was.
function answer(r, tokens, { model = 'claude-sonnet-4-5', sidechain = false } = {}) {
  fs.appendFileSync(r.transcript, JSON.stringify({
    type: 'assistant', isSidechain: sidechain,
    message: { model, role: 'assistant', usage: { input_tokens: 2, cache_creation_input_tokens: 1000, cache_read_input_tokens: tokens - 1012, output_tokens: 10 } },
  }) + '\n');
}
const summarized = (r) => fs.appendFileSync(r.transcript, JSON.stringify({ type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted' }) + '\n');

function run(r, event, extra = {}, env = {}) {
  const input = { session_id: SESSION, transcript_path: r.transcript, cwd: r.dir, hook_event_name: event, ...extra };
  const p = spawnSync('bash', [hook], {
    cwd: r.dir, input: JSON.stringify(input), encoding: 'utf8',
    env: { ...gitEnv, KERJAAN_HOOK_STATE: r.state, ...env },
  });
  assert.equal(p.status, 0, p.stderr);
  if (!p.stdout.trim()) return null;
  const out = JSON.parse(p.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, event);
  return out;
}
const prompt = (r, env) => run(r, 'UserPromptSubmit', { prompt: 'go on' }, env);
const toolDone = (r, env) => run(r, 'PostToolUse', { tool_name: 'Bash', tool_input: { command: 'ls' } }, env);
const afterSummary = (r, source = 'compact') => run(r, 'SessionStart', { source });
const told = (out) => (out ? out.hookSpecificOutput.additionalContext : '');

const template = () => spawnSync('bash', [hook, 'template'], { encoding: 'utf8' });
const SECTIONS = ['## Agents running', '## Merge queue', '## Owner decisions not yet in a ticket',
  '## Questions waiting for the owner', '## Reminders for the owner', '## Next steps'];

// --- the form ----------------------------------------------------------------

test('the form holds every section the ticket names, in a fixed order', () => {
  const t = template();
  assert.equal(t.status, 0, t.stderr);
  assert.match(t.stdout, /^# Handoff\n/);
  const at = SECTIONS.map((s) => t.stdout.indexOf(`\n${s}\n`));
  for (const [i, s] of SECTIONS.entries()) assert.ok(at[i] > 0, `${s} missing:\n${t.stdout}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at);
  const agents = t.stdout.split('## Agents running\n')[1].split('\n')[0];
  for (const part of ['<ticket ID>', 'worker | reviewer | planner', 'agent <agent ID>', 'waiting for:']) assert.ok(agents.includes(part), agents);
});

test('the form points at the merge queue on the board and does not copy it', () => {
  const queue = template().stdout.split('## Merge queue\n')[1].split('\n## ')[0];
  assert.match(queue, /merge\.sh" queue` lists it/);
  assert.match(queue, /Not copied here/);
  assert.doesNotMatch(queue, /\d{12}|joined as number/);
});

test('handoff.sh with an unknown word prints its usage and exits 2', () => {
  const p = spawnSync('bash', [hook, 'nonsense'], { encoding: 'utf8', input: '' });
  assert.equal(p.status, 2);
  assert.match(p.stderr, /handoff\.sh template/);
});

// --- near the limit ------------------------------------------------------------

test('no reminder below handoff_at; at 80% by default the session is told to write handoff.md in the form', () => {
  const r = repo();
  answer(r, 159000);
  assert.equal(prompt(r), null);
  answer(r, 161000);
  const out = prompt(r);
  assert.ok(out);
  const text = told(out);
  assert.match(text, /about 80% of its window \(handoff_at is 80%/);
  assert.ok(text.includes(`Write ${r.file} now, in exactly this form`), text);
  for (const s of SECTIONS) assert.ok(text.includes(s), s);
  assert.match(text, /an estimate, it may be off by a few percent/);
  assert.match(out.systemMessage, /write handoff\.md/);
});

for (const [settings, below, at] of [
  ['handoff_at: 50\n', 99000, 100000],
  ['handoff_at: "60%"\n', 119000, 120000],
  ['handoff_at:\n', 159000, 161000],
  ['handoff_at: 80\ncontext_window: 100k\n', 79000, 80000],
  ['context_window: 1M\n', 799000, 801000],
]) {
  test(`settings ${JSON.stringify(settings)}: silent at ${below} tokens, reminded at ${at}`, () => {
    const r = repo(settings);
    answer(r, below);
    assert.equal(toolDone(r), null);
    answer(r, at);
    assert.ok(toolDone(r));
  });
}

test('a reminder once at the limit, and again only after another 5 points; with the file there, to rewrite it in place', () => {
  const r = repo();
  answer(r, 162000);
  assert.ok(toolDone(r));
  answer(r, 169000);
  assert.equal(toolDone(r), null, 'reminded again before 5 more points');
  assert.equal(prompt(r), null);
  fs.writeFileSync(r.file, '# Handoff\nfirst\n');
  answer(r, 172000);
  const text = told(toolDone(r));
  assert.ok(text.includes(`${r.file} exists: rewrite it in place now`), text);
  assert.match(text, /keeping one file -- never a second one/);
  assert.doesNotMatch(text, /Write .* now, in exactly this form/);
  assert.deepEqual(fs.readdirSync(path.join(r.dir, '.kerjaan')).filter((f) => !fs.statSync(path.join(r.dir, '.kerjaan', f)).isDirectory()).sort(), ['handoff.md', 'settings.md']);
});

test('inside a subagent nothing is said: a worker\'s context is its own', () => {
  const r = repo();
  answer(r, 190000);
  assert.equal(run(r, 'PostToolUse', { agent_id: 'a123', tool_name: 'Bash' }), null);
  assert.equal(run(r, 'SessionStart', { agent_id: 'a123', source: 'compact' }), null);
});

test('a session with no board is never reminded', () => {
  const r = repo();
  fs.rmSync(path.join(r.dir, '.kerjaan'), { recursive: true });
  answer(r, 190000);
  assert.equal(prompt(r), null);
});

test('the subagents\' answers in the transcript do not count, and a line cut short is skipped', () => {
  const r = repo();
  answer(r, 100000);
  answer(r, 190000, { sidechain: true });
  fs.appendFileSync(r.transcript, '{"type":"assistant","message":{"usage":{"input_tok');
  assert.equal(prompt(r), null);
});

test('what was used before the last summary does not count', () => {
  const r = repo();
  answer(r, 190000);
  summarized(r);
  assert.equal(prompt(r), null);
  answer(r, 30000);
  assert.equal(prompt(r), null);
});

test('the window: 1M for a model that runs with one, or once the context passed 200,000; the variables Claude Code reads win', () => {
  let r = repo();
  answer(r, 170000, { model: 'claude-opus-5-5' });
  assert.equal(prompt(r), null, 'Opus 5.5 runs with a 1M window');
  answer(r, 810000, { model: 'claude-opus-5-5' });
  assert.ok(prompt(r));

  r = repo();
  answer(r, 170000, { model: 'claude-opus-4-6' });
  assert.ok(prompt(r), 'Opus 4.6 without [1m] has 200K');

  r = repo();
  answer(r, 250000, { model: 'claude-opus-4-6' });
  assert.equal(prompt(r), null, 'past 200K the window is the larger one');

  r = repo();
  answer(r, 170000, { model: 'claude-opus-5-5' });
  assert.match(told(prompt(r, { CLAUDE_CODE_DISABLE_1M_CONTEXT: '1' })), /about 85%/);

  r = repo();
  answer(r, 170000, { model: 'claude-opus-5-5' });
  assert.match(told(prompt(r, { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '200k' })), /about 85%/);

  r = repo('context_window: 400000\n');
  answer(r, 170000, { model: 'claude-sonnet-4-5' });
  assert.equal(prompt(r, { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '200000' }), null, 'settings.md wins over the variable');
});

// Each kind of model the window is told from, one case each.
for (const [model, window] of [
  ['claude-opus-4-7', '1M'], ['claude-opus-5-5', '1M'], ['claude-sonnet-5', '1M'], ['claude-sonnet-5-1', '1M'],
  ['claude-haiku-5-5', '1M'], ['claude-haiku-6', '1M'], ['claude-fable-1', '1M'], ['claude-opus-4-6[1m]', '1M'],
  ['claude-opus-4-6', '200K'], ['claude-opus-4-5', '200K'], ['claude-sonnet-4-6', '200K'], ['claude-haiku-4-5', '200K'], ['claude-haiku-5', '200K'],
]) {
  test(`the window for ${model} is ${window}`, () => {
    const r = repo();
    answer(r, 170000, { model });
    const out = prompt(r);
    if (window === '1M') assert.equal(out, null);
    else assert.match(told(out), /about 85%/);
  });
}

// --- right after the summary ---------------------------------------------------

test('after the summary the file is handed over whole, to act on before anything else and then delete', () => {
  const r = repo();
  const body = '# Handoff\n\n## Agents running\n- 261026100001 — worker — agent a77 — waiting for: REVIEW\n';
  fs.writeFileSync(r.file, body);
  summarized(r);
  const out = afterSummary(r);
  const text = told(out);
  assert.match(text, /Before any other action, read it, and carry on from it/);
  assert.ok(text.includes(body.trim()), text);
  assert.ok(text.includes(`Then delete it (rm "${r.file}")`), text);
  assert.match(text, /merge\.sh" queue/);
  assert.match(out.systemMessage, /handoff\.md handed to the session/);
});

test('a long handoff is not quoted: the session is told to read the whole file first', () => {
  const r = repo();
  fs.writeFileSync(r.file, `# Handoff\n${'x'.repeat(9000)}\n`);
  const text = told(afterSummary(r));
  assert.match(text, /read the whole file with the Read tool first/);
  assert.ok(!text.includes('x'.repeat(100)));
});

test('only a summary hands it over: a new, resumed or cleared session does not, nor a summary with no file', () => {
  const r = repo();
  assert.equal(afterSummary(r), null);
  fs.writeFileSync(r.file, '# Handoff\n');
  for (const source of ['startup', 'resume', 'clear']) assert.equal(afterSummary(r, source), null, source);
});

test('a file handed over once and left unchanged is named stale, not handed over again; a rewritten one is', () => {
  const r = repo();
  fs.writeFileSync(r.file, '# Handoff\nfirst\n');
  assert.match(told(afterSummary(r)), /first/);
  const again = told(afterSummary(r));
  assert.match(again, /It is stale: do not act on it again\. Delete it now/);
  assert.doesNotMatch(again, /first/);
  fs.writeFileSync(r.file, '# Handoff\nsecond\n');
  assert.match(told(afterSummary(r)), /second/);
});

test('after a summary the next crossing of the limit is a first reminder again', () => {
  const r = repo();
  answer(r, 170000);
  assert.ok(prompt(r));
  summarized(r);
  afterSummary(r);
  answer(r, 162000);
  assert.ok(prompt(r), 'the reminder before the summary still blocked this one');
});

// The scenario of the ticket, as far as a test can play the session: the limit
// is reached, the file is written, the context grows and the file is updated,
// the conversation is summarized, the file is handed over and deleted, and the
// next summary hands nothing.
test('scenario: limit reached → handoff written → updated → summarized → handed over, deleted, not read twice', () => {
  const r = repo();
  answer(r, 120000);
  assert.equal(prompt(r), null);
  answer(r, 161000);
  assert.match(told(toolDone(r)), /Write .*handoff\.md now/);
  fs.writeFileSync(r.file, '# Handoff\nworker a1 on 261026100001\n');
  answer(r, 176000);
  assert.match(told(prompt(r)), /rewrite it in place/);
  fs.writeFileSync(r.file, '# Handoff\nworker a1 on 261026100001; reviewer b2 waiting\n');
  summarized(r);
  answer(r, 20000);
  const text = told(afterSummary(r));
  assert.match(text, /reviewer b2 waiting/);
  fs.rmSync(r.file);
  summarized(r);
  assert.equal(afterSummary(r), null);
  assert.equal(prompt(r), null);
});

// --- not a ticket, not in git ----------------------------------------------------

test('git ignores handoff.md once the session is told to write it, through the repository\'s own exclude file', () => {
  const r = repo();
  answer(r, 165000);
  assert.ok(prompt(r));
  fs.writeFileSync(r.file, '# Handoff\n');
  assert.equal(git(r.dir, 'status', '--porcelain', '--untracked-files=all').stdout, '');
  assert.equal(git(r.dir, 'check-ignore', '.kerjaan/handoff.md').status, 0);
  assert.match(fs.readFileSync(path.join(r.dir, '.git', 'info', 'exclude'), 'utf8'), /^\/\.kerjaan\/handoff\.md$/m);
  assert.equal(git(r.dir, 'add', '-A').status, 0);
  assert.doesNotMatch(git(r.dir, 'diff', '--cached', '--name-only').stdout, /handoff/);
  // Told again, the line is not written twice.
  answer(r, 180000);
  assert.ok(prompt(r));
  const lines = fs.readFileSync(path.join(r.dir, '.git', 'info', 'exclude'), 'utf8').split('\n').filter((l) => l.includes('handoff'));
  assert.equal(lines.length, 1);
});

test('a handoff written without a reminder is ignored by git as soon as it is handed over', () => {
  const r = repo();
  fs.writeFileSync(r.file, '# Handoff\n');
  assert.match(git(r.dir, 'status', '--porcelain', '--untracked-files=all').stdout, /handoff\.md/);
  assert.ok(afterSummary(r));
  assert.equal(git(r.dir, 'status', '--porcelain', '--untracked-files=all').stdout, '');
});

// The folders the hook makes -- its state folder, and git's info/ for the
// exclude file -- are made by kerjaan_make_dir (lib.sh), as the lock folder
// is: a path with a newline, a relative one, or one whose parent is missing is
// refused and nothing is built, and the hook answers as it always does.
const listAll = (dir) => fs.readdirSync(dir, { recursive: true }).sort();

test('a state folder with a newline, not absolute, or with no parent is refused; the reminder still comes, and nothing is built', () => {
  const r = repo();
  const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-handoff-odd-')));
  fs.mkdirSync(path.join(out, 'odd\nname'));
  fs.mkdirSync(path.join(r.dir, 'here'));
  answer(r, 165000);
  for (const [what, state] of [
    ['a newline', path.join(out, 'odd\nname', 'state')],
    ['cut text in front', `Cut text:\n${out}/state`],
    ['not absolute', 'state'],
    ['not absolute, its parent there from where the hook runs', 'here/state'],
    ['its parent missing', path.join(out, 'missing', 'state')],
  ]) {
    const before = [listAll(out), listAll(r.dir)];
    for (let i = 0; i < 2; i++) {
      assert.match(told(prompt(r, { KERJAAN_HOOK_STATE: state })), /Write .*handoff\.md now/, what);
    }
    fs.writeFileSync(r.file, '# Handoff\n');
    assert.match(told(run(r, 'SessionStart', { source: 'compact' }, { KERJAAN_HOOK_STATE: state })), /Before any other action, read it/, what);
    fs.rmSync(r.file);
    assert.deepEqual([listAll(out), listAll(r.dir)], before, what);
  }
  // A state folder whose parent is there is made, and remembers.
  const fresh = path.join(out, 'fresh');
  assert.ok(prompt(r, { KERJAAN_HOOK_STATE: fresh }));
  assert.equal(prompt(r, { KERJAAN_HOOK_STATE: fresh }), null);
  assert.ok(fs.existsSync(path.join(fresh, SESSION, '.handoff-reminded')));
});

test('a git common dir with a newline or with no parent gets no info/ folder; the reminder still comes', () => {
  const r = repo();
  const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-handoff-odd-')));
  const bin = path.join(out, 'bin');
  fs.mkdirSync(bin);
  const realGit = spawnSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  // git -C <repo> rev-parse --git-common-dir answers what the test says.
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/bash
[ "$3 $4" = "rev-parse --git-common-dir" ] && { printf '%s\\n' "$FAKE_COMMON"; exit 0; }
exec "${realGit}" "$@"
`, { mode: 0o755 });
  fs.mkdirSync(path.join(out, 'odd\nname'));
  answer(r, 165000);
  let n = 0;
  for (const [what, common] of [
    ['a newline', path.join(out, 'odd\nname')],
    ['cut text in front', `Cut text:\n${out}`],
    ['its parent missing', path.join(out, 'missing', 'common')],
  ]) {
    const before = [listAll(out), listAll(r.dir)];
    const env = { PATH: `${bin}:${gitEnv.PATH}`, FAKE_COMMON: common, KERJAAN_HOOK_STATE: path.join(r.state, `s${n++}`) };
    assert.match(told(prompt(r, env)), /Write .*handoff\.md now/, what);
    fs.rmSync(path.join(r.state, `s${n - 1}`), { recursive: true });
    assert.deepEqual([listAll(out), listAll(r.dir)], before, what);
  }
  // With git's own answer, a missing info/ is made, and the exclude written.
  fs.rmSync(path.join(r.dir, '.git', 'info'), { recursive: true, force: true });
  assert.ok(prompt(r));
  assert.match(fs.readFileSync(path.join(r.dir, '.git', 'info', 'exclude'), 'utf8'), /^\/\.kerjaan\/handoff\.md$/m);
});

test('the queue check, the duplicate-ID check and the board reader pass over handoff.md', async () => {
  const r = repo();
  fs.writeFileSync(r.file, '# Handoff\n\n## Agents running\n- 261026100001 — worker — agent a1 — waiting for: REVIEW\n');
  const check = spawnSync('bash', [path.join(scripts, 'queue.sh'), 'check'], { cwd: r.dir, encoding: 'utf8', env: gitEnv });
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /READY/);
  assert.doesNotMatch(check.stdout + check.stderr, /handoff/);
  const dup = spawnSync('bash', [path.join(scripts, 'repair.sh'), 'duplicate-id'], { cwd: r.dir, encoding: 'utf8', env: gitEnv });
  assert.equal(dup.status, 0, dup.stdout + dup.stderr);
  assert.doesNotMatch(dup.stdout + dup.stderr, /handoff/);
  const upd = spawnSync('bash', [path.join(scripts, 'update-ticket.sh'), ID], { cwd: r.dir, encoding: 'utf8', env: gitEnv });
  assert.equal(upd.status, 0, upd.stderr);
  const { readBoard } = await import(pathToFileURL(path.join(scripts, 'board.mjs')));
  const board = readBoard(path.join(r.dir, '.kerjaan'));
  assert.deepEqual(board.tickets.map((t) => t.id), [ID]);
});

test('queue.sh check names a handoff_at or context_window it cannot read', () => {
  for (const [settings, said] of [
    ['handoff_at: 0\n', /handoff_at in settings\.md is '0': write a percentage from 1 to 100/],
    ['handoff_at: 120\n', /handoff_at in settings\.md is '120'/],
    ['handoff_at: lots\n', /handoff_at in settings\.md is 'lots'/],
    ['context_window: big\n', /context_window in settings\.md is 'big': write the tokens the context holds/],
  ]) {
    const r = repo(settings);
    const p = spawnSync('bash', [path.join(scripts, 'queue.sh'), 'check'], { cwd: r.dir, encoding: 'utf8', env: gitEnv });
    assert.equal(p.status, 1, `${settings}\n${p.stdout}`);
    assert.match(p.stdout, said, p.stdout);
  }
  for (const settings of ['handoff_at: 80\ncontext_window: 1M\n', 'handoff_at: 75%\ncontext_window: 200,000\n', 'handoff_at:\ncontext_window:\n']) {
    const r = repo(settings);
    const p = spawnSync('bash', [path.join(scripts, 'queue.sh'), 'check'], { cwd: r.dir, encoding: 'utf8', env: gitEnv });
    assert.equal(p.status, 0, `${settings}\n${p.stdout}`);
  }
});

test('a handoff_at the hook cannot read falls back to 80', () => {
  const r = repo('handoff_at: lots\n');
  answer(r, 159000);
  assert.equal(prompt(r), null);
  answer(r, 161000);
  assert.ok(prompt(r));
});

// --- wiring and documents -----------------------------------------------------------

test('hooks.json sends every prompt, every tool call and the start after a summary to handoff.sh', () => {
  const conf = JSON.parse(read('hooks/hooks.json')).hooks;
  const ours = (g) => g.hooks.some((h) => /handoff\.sh"$/.test(h.command));
  assert.ok(conf.UserPromptSubmit.some((g) => !g.matcher && ours(g)));
  assert.ok(conf.PostToolUse.some((g) => g.matcher === '*' && ours(g)));
  assert.ok(conf.SessionStart.some((g) => g.matcher === 'compact' && ours(g)));
});

test('the foreman guide says when the handoff is written, what it holds, and when it is deleted', () => {
  const section = flat(read('skills/kerjaan/references/foreman.md').split('## Before the context is summarized')[1].split('\n## ')[0]);
  for (const phrase of ['`handoff_at`', '80% by default', '`.kerjaan/handoff.md`', 'agents running (ticket, role, agent ID, what you await)',
    'pointer to `merge.sh queue`, never a copy', 'owner decisions not yet in a ticket', 'questions and reminders for the owner', 'next steps',
    'rewrite it in place', 'After the summary', 'then delete it', 'Git ignores it', 'no ticket or status page']) {
    assert.ok(section.includes(phrase), `foreman.md: ${phrase}`);
  }
  assert.match(flat(read('skills/kerjaan/SKILL.md')), /Never write a status summary, index or dashboard into `\.kerjaan\/`; only `handoff\.md`, briefly \(`references\/foreman\.md`, "Before the context is summarized"\)/);
});

test('the settings guide explains handoff_at and context_window, with their defaults', () => {
  const guide = read('skills/kerjaan/SETTINGS.md');
  const front = guide.split('---')[1];
  assert.match(front, /\nhandoff_at: 80\n/);
  assert.match(front, /\ncontext_window:\n/);
  const g = flat(guide);
  for (const phrase of ['- `handoff_at` —', 'Empty or missing means 80', 'a few percent either way', 'rewrites the same file in place',
    'the agents running, each with its ticket, role, agent ID and what is awaited from it', 'the merge queue as a pointer to `merge.sh queue`, never a copy',
    'acts on it before anything else and then deletes it', 'Git ignores it', 'no substitute for the board', '- `context_window` —', '`queue.sh check` reports a value of `handoff_at` or `context_window`']) {
    assert.ok(g.includes(phrase), `SETTINGS.md: ${phrase}`);
  }
});
