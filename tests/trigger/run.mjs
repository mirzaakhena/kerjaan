#!/usr/bin/env node
// Trigger test for the kerjaan skill's description (261011073101, 261017184401).
//
// Runs every prompt in prompts.json through `claude -p` in a fresh session,
// with the plugin taken from a copy of this repo whose skill description is
// replaced, and records whether that session calls the `kerjaan:kerjaan`
// skill. The installed kerjaan plugin is switched off so it is not loaded too.
// Prompts with `repo: board` run in a scratch repo that has a `.kerjaan/`,
// `repo: empty` in a scratch repo without a board; both are rebuilt clean
// before every run.
//
// Usage (from the repo root):
//   node tests/trigger/run.mjs --description tests/trigger/previous-description.txt --out tests/trigger/results-before.json
//   node tests/trigger/run.mjs --out tests/trigger/results-after.json      # the description in SKILL.md now
// Options: --repeat 3 (runs per prompt), --parallel 6, --only id1,id2,
// --tmp <work folder>. Uses Claude quota: 40 prompts x 3 runs.
//
// The outcome of a run, read from the assistant messages in stream-json:
//   skill            the first Skill call is kerjaan:kerjaan             -> called
//   other-skill:<n>  the first Skill call is another skill              -> not called
//   agent:<n>        a kerjaan agent dispatched straight, without skill -> not called
//   none             no Skill call in the first 4 tool calls, or the session ended
//   timeout          past the time limit                                -> not called
// The session is stopped as soon as the outcome is known, so no work goes on.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');

export const PROMPTS = path.join(here, 'prompts.json');
export const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
export const words = (t) => t.split(/\s+/).filter(Boolean).length;
export const skillDescription = () => fs.readFileSync(path.join(root, 'skills/kerjaan/SKILL.md'), 'utf8')
  .match(/^description: (.*)$/m)[1];

// The summary of a set of results: how many runs called the skill, split
// between prompts that should call it and those that should not, and how many
// prompts passed by majority vote.
export function summarize(results) {
  const s = { should: { runs: 0, called: 0, promptsPassed: 0, prompts: 0 },
              shouldNot: { runs: 0, called: 0, promptsPassed: 0, prompts: 0 } };
  for (const r of results) {
    const g = r.should ? s.should : s.shouldNot;
    const n = r.runs.filter((o) => o === 'skill').length;
    g.runs += r.runs.length;
    g.called += n;
    g.prompts += 1;
    const majority = n * 2 > r.runs.length;
    if (majority === r.should) g.promptsPassed += 1;
  }
  return s;
}

const reset = (dir, board) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const w = (p, t) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), t); };
  const git = (...a) => spawnSync('git', a, { cwd: dir, stdio: 'ignore' });
  w('README.md', '# Shop\n\nA small shop app. Run it with `node main.js`.\nThe sourse lives in main.js.\n');
  w('main.js', [
    'function add(a, b) {', '  return a + b;', '}', '',
    'function average(xs) {', '  let total = 0;', '  for (let i = 0; i <= xs.length; i++) total += xs[i] ?? 0;',
    '  return total / xs.length;', '}', '',
    '// TODO: move into its own module', 'module.exports = { add, average };', ''].join('\n'));
  if (board) {
    w('.kerjaan/settings.md', '---\nlanguage: English\ntest_command: node --test\nlong_lived_branches: []\n---\n');
    const ticket = (folder, id, title, background) => w(`.kerjaan/${folder}/${id} ${title}.md`,
      `---\ntype: bug\npriority: medium\nreview: normal\nlabels: []\nreporter: mirza\nassign_to: claude\ncreated: 2026-10-01 09:00:00\nupdated: 2026-10-01 09:00:00\nrelated: []\nblocked_by: []\n---\n\n## Background\n\n${background}\n\n## Request\n\n${title}.\n\n## Done when\n- [ ] ${title}\n\n## History\n- 2026-10-01 09:00:00 ${folder}\n\n## Notes\n`);
    ticket('backlog', '261001090001', 'Import orders from CSV', 'The old orders are in a CSV file.');
    ticket('todo', '261001090002', 'Login timeout is too short', 'Users are logged out after two minutes.');
    ticket('todo', '261001090003', 'Orders page has no pagination', 'The orders page loads every row at once.');
    ticket('review', '261001090004', 'Prices shown without thousands separators', 'A price of 1500000 is hard to read.');
    w('.kerjaan/order.md', '# Order\n\n1. 261001090002\n2. 261001090003\n');
  }
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'initial');
  // An uncommitted change, so that "review this code" and "commit" have something to work on.
  fs.appendFileSync(path.join(dir, 'main.js'), '\nfunction multiply(a, b) { return a * b }\nmodule.exports.multiply = multiply;\n');
};

const copyPlugin = (dest, description) => {
  fs.rmSync(dest, { recursive: true, force: true });
  for (const d of ['.claude-plugin', 'skills', 'agents', 'hooks']) {
    fs.cpSync(path.join(root, d), path.join(dest, d), { recursive: true });
  }
  const f = path.join(dest, 'skills/kerjaan/SKILL.md');
  const t = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, t.replace(/^description: .*$/m, () => `description: ${description}`));
};

function oneRun(prompt, cwd, plugin, limitMs) {
  return new Promise((finish) => {
    const env = { ...process.env }; delete env.CLAUDECODE;
    const p = spawn('claude', ['-p', prompt, '--plugin-dir', plugin,
      '--settings', JSON.stringify({ enabledPlugins: { 'kerjaan@kerjaan': false } }),
      '--permission-mode', 'default', '--no-session-persistence',
      '--output-format', 'stream-json', '--verbose'], { cwd, env, stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = ''; let tools = 0; let model = null; let skills = null; let outcome = null;
    const stop = (o) => { if (outcome) return; outcome = o; clearTimeout(t); p.kill('SIGKILL'); };
    const t = setTimeout(() => stop('timeout'), limitMs);
    p.stdout.on('data', (c) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type === 'system' && e.subtype === 'init') { model = e.model; skills = e.skills; }
        if (e.type === 'result') stop('none');
        if (e.type !== 'assistant') continue;
        for (const b of e.message?.content ?? []) {
          if (b.type !== 'tool_use' || outcome) continue;
          tools += 1;
          if (b.name === 'Skill') stop(b.input?.skill === 'kerjaan:kerjaan' ? 'skill' : `other-skill:${b.input?.skill}`);
          else if (['Agent', 'Task'].includes(b.name) && String(b.input?.subagent_type).startsWith('kerjaan:')) stop(`agent:${b.input.subagent_type}`);
          else if (tools >= 4) stop('none');
        }
      }
    });
    p.on('close', () => { clearTimeout(t); finish({ outcome: outcome ?? 'none', model, skillLoaded: skills?.includes('kerjaan:kerjaan') ?? false }); });
  });
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const descriptionFile = arg('description');
  const description = descriptionFile ? fs.readFileSync(descriptionFile, 'utf8').trim() : skillDescription();
  const repeat = Number(arg('repeat', 3));
  const parallel = Number(arg('parallel', 6));
  const out = arg('out');
  const only = arg('only')?.split(',');
  const tmp = arg('tmp', path.join(os.tmpdir(), 'kerjaan-trigger'));
  if (!out) { console.error('--out <results file> is required'); process.exit(2); }

  const prompts = JSON.parse(fs.readFileSync(PROMPTS, 'utf8')).filter((p) => !only || only.includes(p.id));
  const plugin = path.join(tmp, 'plugin');
  copyPlugin(plugin, description);
  const jobs = prompts.flatMap((p) => Array.from({ length: repeat }, (_, n) => ({ p, n })));
  const runs = Object.fromEntries(prompts.map((p) => [p.id, []]));
  const models = new Set(); let withoutSkill = 0; let next = 0;

  await Promise.all(Array.from({ length: parallel }, async (_, slot) => {
    while (next < jobs.length) {
      const { p, n } = jobs[next++];
      const cwd = path.join(tmp, `slot${slot}`, p.repo);
      reset(cwd, p.repo === 'board');
      const r = await oneRun(p.prompt, cwd, plugin, 180000);
      if (r.model) models.add(r.model);
      if (!r.skillLoaded) withoutSkill += 1;
      runs[p.id][n] = r.outcome;
      console.error(`${p.should ? 'should    ' : 'should not'}  ${r.outcome.padEnd(28)} ${p.id} #${n + 1}`);
    }
  }));

  if (withoutSkill) { console.error(`${withoutSkill} runs without the kerjaan skill loaded; no results written`); process.exit(1); }
  const results = prompts.map((p) => ({ id: p.id, repo: p.repo, should: p.should, group: p.group, prompt: p.prompt, runs: runs[p.id] }));
  const claudeVersion = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const record = { date: new Date().toISOString(), claude: claudeVersion, model: [...models], repeat,
    promptsSha: sha(PROMPTS), description, descriptionWords: words(description), summary: summarize(results), results };
  fs.writeFileSync(out, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record.summary, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
