import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readAgents, encodeProject, stepLabel, programName, STEPS } from '../agents.mjs';
import { agentState, agentLine, agentSteps, span, ago, clock, QUIET, GONE } from '../web/agent.js';
import { tempRoot, agentLog, appendLog, line } from './helpers.mjs';

const ID = { a: '260101000001', b: '260101000002', c: '260101000003' };
const MIN = 60 * 1000;

function setup() {
  const root = tempRoot();
  const project = path.join(root, 'alpha');
  fs.mkdirSync(project);
  return { root, project, claude: path.join(root, 'claude') };
}

// ---------- reading Claude Code's logs ----------

test('log folder name: every character other than a letter or digit becomes "-"', () => {
  assert.equal(encodeProject('/Users/a/Workspace/kerjaan'), '-Users-a-Workspace-kerjaan');
  assert.equal(encodeProject('/Users/a/.claude'), '-Users-a--claude');
  assert.equal(encodeProject('/home/a/shinobi_mobile v2'), '-home-a-shinobi-mobile-v2');
});

test('agent per ticket: the most recently active one, its kind, its last step, and when it started', () => {
  const { project, claude } = setup();
  const t0 = Date.parse('2026-10-16T01:00:00Z');
  agentLog(claude, project, { session: 's1', id: 'old', description: `Work ticket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1000, 'Bash', { description: 'Old step' }), line.interrupt(t0 + 2000)] });
  agentLog(claude, project, { session: 's2', id: 'new', description: `Work ticket ${ID.a}`, lines: [line.prompt(t0 + 5000, 'x'), line.step(t0 + 6000, 'Bash', { description: 'New step' })] });
  agentLog(claude, project, { session: 's2', id: 'review', agentType: 'kerjaan:kerjaan-reviewer', description: `Review ticket ${ID.b}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 100, 'Read', { file_path: path.join(project, 'README.md') })] });
  agentLog(claude, project, { session: 's2', id: 'other', agentType: 'general-purpose', description: 'Audit without a ticket', lines: [line.prompt(t0, 'x'), line.step(t0 + 100, 'Bash', { description: 'z' })] });

  const all = readAgents(project, { claudeDir: claude });
  assert.deepEqual([...all.keys()].sort(), [ID.a, ID.b], 'an agent without a ticket ID is not used');
  const a = all.get(ID.a);
  assert.equal(a.kind, 'worker');
  assert.equal(a.step.label, 'New step', 'the most recently active agent');
  assert.equal(a.ended, null);
  assert.equal(a.startedAt, t0 + 5000);
  assert.equal(a.lastAt, t0 + 6000);
  const b = all.get(ID.b);
  assert.equal(b.kind, 'reviewer');
  assert.deepEqual(b.step, { at: t0 + 100, tool: 'Read', label: 'README.md' });

  assert.deepEqual([...readAgents(project, { claudeDir: claude, ids: [ID.b] }).keys()], [ID.b], 'only the tickets asked for');
});

test('an agent naming several tickets: only the tickets asked for get it', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'two', description: `Work ticket ${ID.a} after ${ID.c}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  assert.deepEqual([...readAgents(project, { claudeDir: claude, ids: [ID.a, ID.b] }).keys()], [ID.a]);
  assert.deepEqual([...readAgents(project, { claudeDir: claude }).keys()].sort(), [ID.a, ID.c]);
});

test('an old interrupted agent loses to the newer one, also when the newer one started first but was resumed', () => {
  const { project, claude } = setup();
  const t0 = Date.parse('2026-10-16T01:00:00Z');
  // A worker resumed after a rejection writes to its own old log again.
  agentLog(claude, project, { id: 'worker', description: `Work ticket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1000, 'SubagentHandback', { message: 'report' }), line.prompt(t0 + 90000, 'carry on'), line.step(t0 + 91000, 'Bash', { description: 'Fix the findings' })] });
  agentLog(claude, project, { id: 'reviewer', agentType: 'kerjaan:kerjaan-reviewer', description: `Review ticket ${ID.a}`, lines: [line.prompt(t0 + 2000, 'x'), line.step(t0 + 3000, 'SubagentHandback', {})] });
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(a.kind, 'worker');
  assert.equal(a.ended, null, 'resumed after handing back its report: working again');
  assert.equal(a.step.label, 'Fix the findings');
});

test('the ticket ID from the Ticket: line of the first prompt when the agent\'s description does not name it', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'x', description: 'Work the next ticket', lines: [line.prompt(t0, `Repo: /r\nTicket: .kerjaan/in_progress/${ID.c} Title.md\nSee also ${ID.a}`), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  assert.deepEqual([...readAgents(project, { claudeDir: claude }).keys()], [ID.c]);
});

test('step label: the description, a file name, or for Bash only the program name; never the command itself', () => {
  const p = '/proj';
  const cases = [
    ['Bash', { command: 'cat SECRET', description: 'Run the tests' }, 'Run the tests'],
    ['Bash', { command: 'cat SECRET' }, 'cat'],
    ['Bash', { command: 'cat SECRET', description: '  ' }, 'cat'],
    ['Bash', {}, ''],
    ['Bash', { command: ['cat', 'SECRET'] }, ''],
    ['Read', { file_path: '/proj/viewer/app.mjs' }, 'viewer/app.mjs'],
    ['Edit', { file_path: '/proj/a.md', old_string: 'SECRET', new_string: 'SECRET' }, 'a.md'],
    ['Write', { file_path: '/elsewhere/place/b.txt', content: 'SECRET' }, 'b.txt'],
    ['NotebookEdit', { notebook_path: '/proj/n.ipynb', new_source: 'SECRET' }, 'n.ipynb'],
    ['Grep', { pattern: 'SECRET', path: '/proj' }, ''],
    ['Glob', { pattern: 'SECRET*' }, ''],
    ['WebFetch', { url: 'https://x/SECRET', prompt: 'SECRET' }, ''],
    ['mcp__x__y', { query: 'SECRET' }, ''],
    ['SubagentHandback', { message: 'SECRET' }, 'handing back its report'],
    ['Bash', { description: 'line\nsecond\u0007' + 'x'.repeat(400) }, null],
    [null, null, ''],
  ];
  for (const [name, input, want] of cases) {
    const got = stepLabel(name, input, p);
    assert.ok(!JSON.stringify(got).includes('SECRET'), `${name}: ${JSON.stringify(got)}`);
    if (want !== null) assert.equal(got.label, want, name);
    else {
      assert.ok(!/[\n\u0007]/.test(got.label), 'no newline or control character');
      assert.ok(got.label.length <= 160, 'cut short');
    }
  }
});

// Each shape of command a Bash step can carry without a description: only
// the program's name is shown, and nothing else on the line, SECRET standing
// for whatever must never reach the panel.
test('Bash step without a description: the program name alone, for every shape of command', () => {
  const cases = [
    ['argument', 'cat SECRET.txt', 'cat'],
    ['options and arguments', 'node --test --test-timeout=SECRET viewer/tests/SECRET.test.mjs', 'node'],
    ['token in an argument', 'curl -H "Authorization: Bearer SECRET" https://x/SECRET', 'curl'],
    ['variable set before the program', 'API_TOKEN=SECRET node --test', 'node'],
    ['several, quoted and substituted, before the program', 'A="SECRET b" B=\'SECRET\' C=$(cat /SECRET) D=`cat SECRET` npm test', 'npm'],
    ['single-quoted value with a space', "A='SECRET b' node x", 'node'],
    ['escaped space in a value', 'A=SECRET\\ b node x', 'node'],
    ['only an assignment', 'SECRET_TOKEN=SECRET', ''],
    ['a cd first', 'cd /home/SECRET && git status SECRET', 'git'],
    ['several cd first, then a newline', 'cd "/SECRET dir"; cd SECRET\n"$K/test-run.sh" SECRET', 'test-run.sh'],
    ['a cd only', 'cd /SECRET', 'cd'],
    ['program given by its path', '/home/SECRET/bin/tool --key SECRET', 'tool'],
    ['program in a variable', '$SECRET arg', ''],
    ['program in braces', '${SECRET}/bin x', 'bin'],
    ['program from a substitution', '$(echo SECRET) x', ''],
    ['program from backticks', '`echo SECRET` x', ''],
    ['program quoted with a space', '"SECRET prog" x', ''],
    ['leading option-like word', '--SECRET', ''],
    ['comment before the program', '# SECRET\nls -la SECRET', 'ls'],
    ['subshell', '(cd SECRET && make SECRET)', 'make'],
    ['pipeline', 'echo "SECRET|x" | grep SECRET', 'echo'],
    ['heredoc', "cat > SECRET.md <<'EOF'\nSECRET\nEOF", 'cat'],
    ['negated group', '! { grep -q SECRET f; }', 'grep'],
    ['nothing but spaces', '   ', ''],
    // Array assignments, whole, whatever is inside the parentheses.
    ['array assignment alone', 'TOKENS=(SECRET other)', ''],
    ['array assignment before the program', 'A=(SECRET b) node', 'node'],
    ['array appended to before the program', 'X+=(SECRET "SECRET b") node', 'node'],
    ['array element set before the program', 'a[SECRET]=SECRET node', 'node'],
    ['array assignment, then a command', 'P=(SECRET.md); git add -- "${P[@]}"', 'git'],
    // Redirections and their targets, before the program or on a leading cd.
    ['stderr redirected before the program', '2>/tmp/SECRET.log cat x', 'cat'],
    ['input redirected before the program', '</tmp/SECRET.txt wc -l', 'wc'],
    ['output redirected before the program', '>/tmp/SECRET cat', 'cat'],
    ['appended before the program', '>> SECRET cat', 'cat'],
    ['both streams before the program', '&>>SECRET cat', 'cat'],
    ['clobbering before the program', '>|SECRET cat', 'cat'],
    ['read-write before the program', '3<>SECRET cat', 'cat'],
    ['named descriptor before the program', '{fd}>SECRET cat', 'cat'],
    ['here-string before the program', '<<<SECRET cat', 'cat'],
    ['process substitution before the program', '< <(cat SECRET) wc', 'wc'],
    ['both streams on a cd', 'cd /x &>/tmp/SECRET.log && ls', 'ls'],
    ['descriptor duplicated to a file on a cd', 'cd /x >&/tmp/SECRET && ls', 'ls'],
    ['stderr into stdout on a cd', 'cd SECRET 2>&1; ls', 'ls'],
    ['both streams on a cd, then more words', 'cd /x &>/dev/null SECRET', 'cd'],
    ['stderr into stdout on a cd, then more words', 'cd /x 2>&1 SECRET', 'cd'],
    ['clobbering on a cd, then more words', 'cd /x >|SECRET.log SECRET', 'cd'],
    ['descriptor closed on a cd', 'cd SECRET >&- ; ls', 'ls'],
    ['redirection glued to the program', 'cat>SECRET', 'cat'],
    ['heredoc on a cd', 'cd x <<EOF\nSECRET\nEOF\nls', 'ls'],
    ['indented heredoc on a cd', 'cd x <<-EOF\n\tSECRET\n\tEOF\nls', 'ls'],
    ['heredoc on a cd, to the end', "cd x <<'EOF'\nSECRET\nEOF", 'cd'],
    // Lines that cannot be read with confidence show nothing.
    ['arithmetic', '((SECRET++))', ''],
    ['test brackets', '[[ -f SECRET ]] && ls', ''],
    ['function definition', 'f() { SECRET; }', ''],
    ['quote left open before the program', 'A="SECRET node', ''],
    ['quote left open after a cd', 'cd /x; A="SECRET node', ''],
    ['substitution left open before the program', 'A=$(SECRET node', ''],
    ['quote left open after the program', 'node "SECRET', 'node'],
    ['ANSI-C quoting with an escaped quote', "A=$'SECRET\\'s' node", 'node'],
    ['substitution with quotes inside a quoted value', 'A="$(cat "SECRET b")" node', 'node'],
  ];
  for (const [shape, command, want] of cases) {
    const got = stepLabel('Bash', { command }, '/proj');
    assert.equal(got.tool, 'Bash');
    assert.ok(!got.label.includes('SECRET'), `${shape}: ${got.label}`);
    assert.equal(got.label, want, shape);
    assert.equal(got.label, programName(command), shape);
  }
});

test('Bash step without a description, read from an agent log: the panel gets the program name', () => {
  const { project, claude } = setup();
  const t0 = Date.now();
  agentLog(claude, project, { id: 'bare', description: `Work ticket ${ID.a}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { command: 'GH_TOKEN=SECRET gh pr list --search SECRET' }), line.step(t0 + 2, 'Bash', { command: 'ls SECRET', description: 'List the folder' })] });
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.deepEqual(a.steps.map((s) => [s.tool, s.label]), [['Bash', 'gh'], ['Bash', 'List the folder']]);
  assert.ok(!JSON.stringify(a).includes('SECRET'));
});

test('an agent\'s end: report handed back, a closing message, the finished mark in its meta, and interrupted', () => {
  const { project, claude } = setup();
  const t0 = Date.now() - 10 * MIN;
  const ids = ['260101000011', '260101000012', '260101000013', '260101000014', '260101000015', '260101000016'];
  agentLog(claude, project, { id: 'a', description: `Work ticket ${ids[0]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'SubagentHandback', {}), line.result(t0 + 2, 'ok')] });
  agentLog(claude, project, { id: 'b', description: `Work ticket ${ids[1]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.say(t0 + 2, 'Done.', 'end_turn')] });
  agentLog(claude, project, { id: 'c', description: `Work ticket ${ids[2]}`, finished: true, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })] });
  agentLog(claude, project, { id: 'd', description: `Work ticket ${ids[3]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.result(t0 + 2, 'r'), line.interrupt(t0 + 3)] });
  agentLog(claude, project, { id: 'e', description: `Work ticket ${ids[4]}`, lines: [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' }), line.think(t0 + 2, 'hmm'), line.say(t0 + 3, 'Reading now.')] });
  // Marked finished, then resumed: the log runs on past the meta file.
  const resumed = agentLog(claude, project, { id: 'f', description: `Work ticket ${ids[5]}`, finished: true, lines: [line.prompt(t0, 'x')] });
  const metaF = resumed.replace(/\.jsonl$/, '.meta.json');
  fs.utimesSync(metaF, new Date(t0), new Date(t0));
  appendLog(resumed, line.step(t0 + 5 * MIN, 'Bash', { description: 'again' }));

  const all = readAgents(project, { claudeDir: claude });
  assert.deepEqual(ids.map((id) => all.get(id).ended), ['finished', 'finished', 'finished', 'interrupted', null, null]);
});

test('a long log: the last 15 steps found from its tail, also behind very large lines', () => {
  const { project, claude } = setup();
  const t0 = Date.now() - 60 * MIN;
  const lines = [line.prompt(t0, 'x')];
  for (let i = 0; i < 40; i++) {
    lines.push(line.step(t0 + i * 1000, 'Bash', { description: `Step ${i}`, command: 'x' }));
    lines.push(line.request(t0 + i * 1000 + 500, 'y'.repeat(200 * 1024)));
  }
  const log = agentLog(claude, project, { id: 'large', description: `Work ticket ${ID.a}`, lines });
  assert.ok(fs.statSync(log).size > 8 * 1024 * 1024 * 0.9);
  const a = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(a.steps.length, STEPS);
  assert.deepEqual(a.steps.map((s) => s.label), Array.from({ length: 15 }, (_, i) => `Step ${25 + i}`), 'in order, the last at the end');
  assert.equal(a.startedAt, t0, 'start time from the first line');

  // Grows: only the new part is read, and a line still being written waits.
  appendLog(log, line.step(t0 + 50000, 'Bash', { description: 'New step' }));
  fs.appendFileSync(log, JSON.stringify(line.step(t0 + 60000, 'Bash', { description: 'Half' })).slice(0, 40));
  const b = readAgents(project, { claudeDir: claude }).get(ID.a);
  assert.equal(b.step.label, 'New step');
  assert.equal(b.steps.length, STEPS);
  assert.equal(b.steps[0].label, 'Step 26');
  fs.appendFileSync(log, JSON.stringify(line.step(t0 + 60000, 'Bash', { description: 'Half' })).slice(40) + '\n');
  assert.equal(readAgents(project, { claudeDir: claude }).get(ID.a).step.label, 'Half');
});

test('logs missing, unreadable, or in another format: no agent, no error', () => {
  const { root, project, claude } = setup();
  const t0 = Date.now();
  assert.equal(readAgents(project, { claudeDir: path.join(root, 'missing') }).size, 0, 'no Claude folder');
  fs.mkdirSync(claude);
  fs.writeFileSync(path.join(claude, 'projects'), 'not a folder');
  assert.equal(readAgents(project, { claudeDir: claude }).size, 0, 'projects is not a folder');
  fs.rmSync(path.join(claude, 'projects'));

  const ok = [line.prompt(t0, 'x'), line.step(t0 + 1, 'Bash', { description: 'd' })];
  agentLog(claude, project, { id: 'meta-broken', meta: '{not json', lines: ok });
  agentLog(claude, project, { id: 'meta-odd', meta: '[1,2]', lines: ok });
  agentLog(claude, project, { id: 'garbage', description: `Work ticket ${ID.a}`, lines: ['not json', '{"type":', '42', 'null', '[]'] });
  agentLog(claude, project, { id: 'no-time', description: `Work ticket ${ID.b}`, lines: [{ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { description: 'd' } }] } }] });
  agentLog(claude, project, { id: 'new-shape', description: `Work ticket ${ID.c}`, lines: [{ kind: 'step', when: t0, what: { tool: 'Bash' } }, { type: 'assistant', message: 'text', timestamp: 'yesterday' }] });
  agentLog(claude, project, { session: 'session-2', id: 'no-log', description: `Work ticket ${ID.a}` });
  fs.rmSync(path.join(claude, 'projects', encodeProject(project), 'session-2', 'subagents', 'agent-no-log.jsonl'));
  fs.writeFileSync(path.join(claude, 'projects', encodeProject(project), 'loose-file.jsonl'), 'x');
  assert.equal(readAgents(project, { claudeDir: claude }).size, 0);

  if (process.getuid?.() !== 0) {
    agentLog(claude, project, { session: 'locked', id: 'k', description: `Work ticket ${ID.a}`, lines: ok });
    const locked = path.join(claude, 'projects', encodeProject(project), 'locked');
    fs.chmodSync(locked, 0o000);
    try {
      assert.equal(readAgents(project, { claudeDir: claude }).size, 0, 'unreadable session folder');
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  }
});

// ---------- what the page makes of it ----------

const now = Date.parse('2026-10-16T05:00:00Z');
const agent = (over = {}) => ({ kind: 'worker', startedAt: now - 34 * MIN, lastAt: now - 12000, ended: null, step: { at: now - 12000, tool: 'Bash', label: 'Update README <API>' }, ...over });

test('the mark: green just after a step, yellow once quiet a few minutes, red once stopped', () => {
  const cases = [
    [agent(), 'in_progress', 'working', ''],
    [agent({ lastAt: now - QUIET + 1000 }), 'in_progress', 'working', ''],
    [agent({ lastAt: now - QUIET }), 'in_progress', 'quiet', 'quiet'],
    [agent({ lastAt: now - GONE + 1000 }), 'review', 'quiet', 'quiet'],
    [agent({ lastAt: now - GONE }), 'in_progress', 'stopped', 'silent'],
    [agent({ ended: 'interrupted' }), 'in_progress', 'stopped', 'interrupted'],
    [agent({ ended: 'interrupted' }), 'review', 'stopped', 'interrupted'],
    [agent({ ended: 'finished' }), 'in_progress', 'stopped', 'stopped'],
    [agent({ ended: 'finished' }), 'review', 'done', 'done'],
  ];
  for (const [a, status, tone, word] of cases) {
    const st = agentState(a, status, now);
    assert.deepEqual([st.tone, st.word], [tone, word], JSON.stringify([a.ended, (now - a.lastAt) / 1000, status]));
    assert.match(agentLine(a, status, now), new RegExp(`class="agent ${tone}"`));
  }
});

test('the agent line: kind, last step (escaped), and how long ago', () => {
  const html = agentLine(agent(), 'in_progress', now);
  assert.match(html, /<span class="kind">worker<\/span>/);
  assert.match(html, /<span class="step" title="Update README &lt;API&gt;">Update README &lt;API&gt;<\/span>/);
  assert.match(html, /<span class="ago">12 s ago<\/span>/);
  assert.ok(!html.includes('class="state"'), 'a working agent gets no state word');
  assert.match(agentLine(agent({ step: { at: now - 5 * MIN, tool: 'Grep', label: '' }, lastAt: now - 5 * MIN }), 'review', now), /state">quiet<\/span><span class="step" title="Grep">Grep<\/span><span class="ago">5 min ago/, 'without a label: the tool\'s name');
  assert.match(agentLine(agent({ step: null }), 'review', now), /no step yet/);
});

test('the step list: newest on top, each step\'s time, how long it ran, and it opens', () => {
  const steps = Array.from({ length: 15 }, (_, i) => ({ at: now - (15 - i) * 60000, tool: i % 2 ? 'Read' : 'Bash', label: `L${i} <x>` }));
  const a = agent({ steps, step: steps[14] });
  const html = agentSteps(a, 'in_progress', now);
  const rows = [...html.matchAll(/<li><time>([^<]+)<\/time><span class="tool">(\w+)<\/span><span class="step-label">(.*?)<\/span><\/li>/g)];
  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((r) => [r[2], r[3]]), steps.map((s) => [s.tool, s.label.replace('<x>', '&lt;x&gt;')]).reverse());
  assert.equal(rows[0][1], clock(steps[14].at, now));
  assert.match(html, /worker: last 15 steps/);
  assert.match(html, /running 34 min/);
  assert.match(html, new RegExp(`started ${clock(a.startedAt, now)}`));
  assert.ok(!/<details[^>]*open/.test(html), 'folded');
  assert.match(agentSteps(a, 'in_progress', now, { open: true }), /<details class="agent-steps" open>/);
  assert.match(agentSteps(agent({ ended: 'finished', lastAt: now - 10 * MIN }), 'review', now), /worked 24 min/, 'one that has finished: how long it worked');
  assert.match(agentSteps(agent({ steps: [] }), 'review', now), /No steps yet/);
});

test('how times are written', () => {
  assert.deepEqual([span(0), span(59999), span(60000), span(3599999), span(3600000), span(49 * 3600000)], ['0 s', '59 s', '1 min', '59 min', '1 h 0 min', '2 days']);
  assert.equal(ago(now, now), 'just now');
  assert.equal(ago(now - 5000, now), '5 s ago');
  assert.match(clock(now - 1000, now), /^\d\d:\d\d:\d\d$/);
  assert.match(clock(now - 3 * 86400000, now), /^\d\d\/\d\d \d\d:\d\d:\d\d$/, 'another day: with the date');
});
