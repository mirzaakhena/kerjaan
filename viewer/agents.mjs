// What Claude Code's agents are doing on a board's tickets, read from the logs
// Claude Code writes while they work:
//
//   <claude>/projects/<project path, every non-alphanumeric character as "-">/
//     <session>/subagents/agent-<id>.meta.json   { agentType, description, finished? }
//     <session>/subagents/agent-<id>.jsonl       one JSON object per line
//
// The format is Claude Code's own and undocumented, so it may change without
// notice. Every read here is therefore best-effort: whatever cannot be read or
// no longer looks as expected is skipped, and a ticket whose agent cannot be
// made out simply has none. Nothing here throws.
//
// What leaves this module is a short label per step and never what the step
// carried: no tool result, no thinking, no message text, and of a command only
// the name of the program it runs. A label is a tool's own `description`
// (Bash and the like); for a Bash step without one, the program's name alone,
// never its arguments, assignments or anything else on the line; or the name
// of the file a tool opened. Any other tool shows only its name.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STEPS = 15;
const LABEL_MAX = 160;
const TAIL_START = 256 * 1024;
const TAIL_MAX = 8 * 1024 * 1024;
const HEAD_MAX = 1024 * 1024;
const ID = /\b\d{12}\b/g;

export const defaultClaudeDir = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

// Claude Code names a project's log folder after the folder it was started
// in, every character other than a letter or digit turned into "-"
// ("/Users/a/.claude" -> "-Users-a--claude"). Very long names are cut and
// given a suffix, so a cut name is matched by its first 200 characters.
export function encodeProject(dir) {
  return dir.replace(/[^a-zA-Z0-9]/g, '-');
}

function logFolders(claudeDir, projectDir) {
  const base = path.join(claudeDir, 'projects');
  const wanted = new Set([encodeProject(projectDir)]);
  try { wanted.add(encodeProject(fs.realpathSync(projectDir))); } catch {}
  let names;
  try { names = fs.readdirSync(base); } catch { return []; }
  const found = names.filter((n) => wanted.has(n) || [...wanted].some((w) => w.length > 200 && n.startsWith(w.slice(0, 200) + '-')));
  return found.map((n) => path.join(base, n));
}

// ---------- reading one agent ----------

// Caches keyed by file path, so a board polled every two seconds reads only
// what an agent appended since the last look.
const metaCache = new Map();
const logCache = new Map();

function readMeta(file) {
  let st;
  try { st = fs.statSync(file); } catch { return null; }
  const hit = metaCache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.meta;
  let meta = null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (raw && typeof raw === 'object') {
      meta = {
        agentType: typeof raw.agentType === 'string' ? raw.agentType : '',
        description: typeof raw.description === 'string' ? raw.description : '',
        finished: raw.finished === true,
        mtimeMs: st.mtimeMs,
      };
    }
  } catch {}
  metaCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, meta });
  return meta;
}

const time = (v) => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX);

// A command line read as the shell would split it: words, the operators
// between commands, and redirections. Quotes are taken off; a substitution, an
// array's parentheses or an arithmetic `((...))` stay inside their word, raw. A
// redirection's target is marked and a heredoc's body passed over, so neither
// is ever taken for a program. Past anything left unclosed the line is not understood, and
// a `broken` mark ends the list.
// Only program names are ever kept from this (programName, below).
function closing(s, k) {
  // From an opening `'`, `"`, `` ` `` or `(` at k, the index of what closes it.
  const open = s[k];
  if (open === "'") return s.indexOf("'", k + 1);
  if (open === '`') {
    for (let j = k + 1; j < s.length; j++) {
      if (s[j] === '\\') j++;
      else if (s[j] === '`') return j;
    }
    return -1;
  }
  let depth = 0;
  for (let j = k + (open === '"' ? 1 : 0); j < s.length; j++) {
    const c = s[j];
    if (c === '\\') j++;
    else if (open === '"' && c === '"') return j;
    else if (open === '"' && c === '$' && s[j + 1] === '(') { j = closing(s, j + 1); if (j < 0) return -1; }
    else if (open === '"' && c === '`') { j = closing(s, j); if (j < 0) return -1; }
    else if (open === '"') continue;
    else if (c === "'" || c === '"' || c === '`') { j = closing(s, j); if (j < 0) return -1; }
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return j;
  }
  return -1;
}

function shellTokens(command) {
  const out = [];
  const heredocs = [];
  let word = null;
  let target = false;
  let heredoc = null;
  const push = () => {
    if (word === null) return;
    if (heredoc) heredocs.push({ end: word, tabs: heredoc === '<<-' });
    out.push({ word, skip: target || heredoc !== null });
    word = null; target = false; heredoc = null;
  };
  const s = command;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '$' && s[k + 1] === "'") {
      // $'...' quoting, where \' does not close it.
      let end = k + 2;
      while (end < s.length && s[end] !== "'") end += s[end] === '\\' ? 2 : 1;
      if (end >= s.length) return [...out, { broken: true }];
      word = (word ?? '') + s.slice(k, end + 1);
      k = end;
    } else if (c === "'" || c === '"' || c === '`' || (c === '$' && s[k + 1] === '(') || (c === '(' && (word !== null || s[k + 1] === '('))) {
      // Quotes lose their marks; everything else keeps its raw text.
      const at = c === '$' ? k + 1 : k;
      const end = closing(s, at);
      if (end < 0) return [...out, { broken: true }];
      word = (word ?? '') + (c === "'" || c === '"' ? s.slice(at + 1, end) : s.slice(k, end + 1));
      k = end;
    } else if (c === '\\') {
      if (s[k + 1] !== '\n') word = (word ?? '') + (s[k + 1] ?? '');
      k++;
    } else if (c === '<' || c === '>' || (c === '&' && s[k + 1] === '>')) {
      // A redirection: a file descriptor before it is part of it, and the
      // word after it is its target, also when written as `>&1` or `>&-`.
      if (word !== null && !/^(\d+|\{[A-Za-z_][A-Za-z0-9_]*\})$/.test(word)) push();
      word = null;
      let op = c;
      while (op.length < 3 && (/[<>&]/.test(s[k + 1]) || (s[k + 1] === '-' && op === '<<') || (s[k + 1] === '|' && op === '>'))) op += s[++k];
      if (op === '<<' || op === '<<-') heredoc = op;
      else target = true;
      if (s[k + 1] === '(') {
        const end = closing(s, k + 1);
        if (end < 0) return [...out, { broken: true }];
        word = s.slice(k + 1, end + 1);
        k = end;
      }
    } else if (c === '\n' || c === ';' || c === '&' || c === '|' || c === '(' || c === ')') {
      push();
      out.push({ op: c });
      if ((c === '&' || c === '|') && (s[k + 1] === c || (c === '|' && s[k + 1] === '&'))) k++;
      if (c === '\n') {
        // A heredoc's body runs to the line holding only its delimiter.
        for (const h of heredocs.splice(0)) {
          let next = s.indexOf('\n', k + 1);
          while (true) {
            const lineEnd = next < 0 ? s.length : next;
            const text = s.slice(k + 1, lineEnd);
            k = lineEnd;
            if ((h.tabs ? text.replace(/^\t+/, '') : text) === h.end || next < 0) break;
            next = s.indexOf('\n', k + 1);
          }
          if (k >= s.length) return out;
        }
      }
    } else if (/\s/.test(c)) push();
    else if (c === '#' && word === null) {
      while (k + 1 < s.length && s[k + 1] !== '\n') k++;
    } else word = (word ?? '') + c;
  }
  push();
  return out;
}

// The program a Bash command runs, by name only: "node" for
// `API_TOKEN=x node --test`, "test-run.sh" for `"$K/test-run.sh" 2610...`.
// Assignments (arrays included) and redirections before the program are
// skipped, and so is a leading `cd <dir>` with its operator, since the program
// after it says more. When in doubt it shows nothing: a name that is not a
// plain word once its folder is dropped (a variable, a substitution, a quoted
// phrase, arithmetic), or a line that cannot be read to its end, gives no
// label at all rather than any part of itself.
const PROGRAM = /^[A-Za-z0-9_][A-Za-z0-9._+-]{0,39}$/;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/;
export function programName(command) {
  if (typeof command !== 'string') return '';
  let first = '';
  let skipping = false;
  for (const t of shellTokens(command)) {
    if (t.broken) return '';
    if (t.op) { skipping = false; continue; }
    if (skipping || t.skip || ASSIGNMENT.test(t.word) || t.word === '{' || t.word === '!') continue;
    const name = t.word.slice(t.word.lastIndexOf('/') + 1);
    if (name === 'cd' || name === 'pushd') { first ||= name; skipping = true; continue; }
    return PROGRAM.test(name) ? name : '';
  }
  return first;
}

// The one place a step's label is made. Only these fields are ever read.
export function stepLabel(name, input, projectDir) {
  const tool = clean(typeof name === 'string' && name ? name : '?');
  if (tool === 'SubagentHandback') return { tool, label: 'handing back its report' };
  const i = input && typeof input === 'object' ? input : {};
  if (typeof i.description === 'string' && i.description.trim()) return { tool, label: clean(i.description) };
  if (tool === 'Bash') return { tool, label: programName(i.command) };
  const file = typeof i.file_path === 'string' ? i.file_path : typeof i.notebook_path === 'string' ? i.notebook_path : null;
  if (file) {
    const rel = path.isAbsolute(file) && projectDir ? path.relative(projectDir, file) : null;
    const shown = rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : path.basename(file);
    return { tool, label: clean(shown) };
  }
  return { tool, label: '' };
}

const INTERRUPTED = '[Request interrupted by user';
function isInterrupt(message) {
  const c = message?.content;
  if (typeof c === 'string') return c.startsWith(INTERRUPTED);
  return Array.isArray(c) && c.some((b) => b && b.type === 'text' && typeof b.text === 'string' && b.text.startsWith(INTERRUPTED));
}

// Folds one log line into the running state: { steps, lastAt, ended, firstAt }.
function fold(state, line, projectDir) {
  let o;
  try { o = JSON.parse(line); } catch { return; }
  if (!o || typeof o !== 'object') return;
  const at = time(o.timestamp);
  if (at !== null) {
    if (state.firstAt === null) state.firstAt = at;
    if (state.lastAt === null || at > state.lastAt) state.lastAt = at;
  }
  if (o.type === 'user' && isInterrupt(o.message)) {
    state.ended = 'interrupted';
    return;
  }
  if (o.type !== 'assistant') return;
  const content = o.message?.content;
  if (!Array.isArray(content)) return;
  // A step means the agent is at work again (a resumed agent included); its
  // report handed back, or a closing message, means it is done. Thinking and
  // text in between change neither.
  let stepped = false;
  for (const b of content) {
    if (!b || b.type !== 'tool_use') continue;
    const { tool, label } = stepLabel(b.name, b.input, projectDir);
    state.steps.push({ at, tool, label });
    state.ended = tool === 'SubagentHandback' ? 'finished' : null;
    stepped = true;
  }
  if (!stepped && o.message?.stop_reason === 'end_turn') state.ended = 'finished';
  if (state.steps.length > STEPS * 2) state.steps.splice(0, state.steps.length - STEPS);
}

function readRange(fd, start, end) {
  const buf = Buffer.alloc(end - start);
  let got = 0;
  while (got < buf.length) {
    const n = fs.readSync(fd, buf, got, buf.length - got, start + got);
    if (n === 0) break;
    got += n;
  }
  return buf.subarray(0, got);
}

// Complete lines in buf (which starts at file offset `start`), and the offset
// just past the last newline. A line still being written is left for later.
function lines(buf, start, skipFirst) {
  const last = buf.lastIndexOf(0x0a);
  if (last === -1) return { list: [], next: start };
  let text = buf.subarray(0, last).toString('utf8');
  if (skipFirst) {
    const nl = text.indexOf('\n');
    text = nl === -1 ? '' : text.slice(nl + 1);
  }
  return { list: text.split('\n').filter(Boolean), next: start + last + 1 };
}

function readStart(fd, size) {
  const buf = readRange(fd, 0, Math.min(size, HEAD_MAX));
  const nl = buf.indexOf(0x0a);
  const first = (nl === -1 ? buf : buf.subarray(0, nl)).toString('utf8');
  let startedAt = null;
  let prompt = '';
  try {
    const o = JSON.parse(first);
    startedAt = time(o.timestamp);
    const c = o.message?.content;
    prompt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b?.type === 'text').map((b) => b.text).join('\n') : '';
  } catch {
    startedAt = time(first.match(/"timestamp":"([^"]+)"/)?.[1]);
  }
  // Only the ticket ID is kept from the first prompt, for an agent whose
  // description does not name it.
  const ids = (prompt.match(/^Ticket:[^\n]*/m)?.[0] || '').match(ID) || [];
  return { startedAt, promptIds: ids };
}

function readLog(file, projectDir) {
  let st;
  try { st = fs.statSync(file); } catch { return null; }
  const hit = logCache.get(file);
  if (hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs) return hit;
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    let state;
    if (hit && st.size > hit.next && hit.next > 0 && st.size >= hit.size) {
      // Grown since the last look: read only the new part.
      state = { ...hit, steps: [...hit.steps] };
      const { list, next } = lines(readRange(fd, hit.next, st.size), hit.next, false);
      for (const l of list) fold(state, l, projectDir);
      state.next = next;
    } else {
      const head = readStart(fd, st.size);
      // Read back from the end, a window that doubles until it holds enough
      // steps or the whole file.
      let win = TAIL_START;
      for (;;) {
        const from = Math.max(0, st.size - win);
        state = { steps: [], lastAt: null, firstAt: null, ended: null, ...head };
        const { list, next } = lines(readRange(fd, from, st.size), from, from > 0);
        for (const l of list) fold(state, l, projectDir);
        state.next = next;
        if (from === 0 || state.steps.length >= STEPS || win >= TAIL_MAX) break;
        win *= 2;
      }
    }
    state.steps = state.steps.slice(-STEPS);
    state.size = st.size;
    state.mtimeMs = st.mtimeMs;
    logCache.set(file, state);
    return state;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

const kindOf = (agentType) => {
  const t = clean(agentType || '').split(':').pop() || 'agent';
  if (/worker$/.test(t)) return 'worker';
  if (/reviewer$/.test(t)) return 'reviewer';
  return t;
};

// ---------- every agent of a project ----------

// Returns Map<ticketId, agent> holding, for each ticket named in `ids`, the
// agent most recently active on it. `agent` is what the page may show:
//   { kind, startedAt, lastAt, ended: null|'finished'|'interrupted', step, steps }
export function readAgents(projectDir, { claudeDir = defaultClaudeDir(), ids } = {}) {
  const out = new Map();
  try {
    const wanted = ids ? new Set(ids) : null;
    for (const folder of logFolders(claudeDir, projectDir)) {
      let sessions;
      try { sessions = fs.readdirSync(folder, { withFileTypes: true }); } catch { continue; }
      for (const s of sessions) {
        if (!s.isDirectory()) continue;
        const dir = path.join(folder, s.name, 'subagents');
        let files;
        try { files = fs.readdirSync(dir); } catch { continue; }
        for (const f of files) {
          const m = f.match(/^(agent-[\w-]+)\.meta\.json$/);
          if (!m) continue;
          const one = readOne(path.join(dir, f), path.join(dir, `${m[1]}.jsonl`), projectDir, wanted);
          if (!one) continue;
          for (const id of one.ids) {
            const prev = out.get(id);
            if (!prev || one.agent.lastAt > prev.lastAt) out.set(id, one.agent);
          }
        }
      }
    }
  } catch {
    // An unreadable log folder: no agents rather than an error.
  }
  return out;
}

function readOne(metaFile, logFile, projectDir, wanted) {
  try {
    const meta = readMeta(metaFile);
    if (!meta) return null;
    let ids = meta.description.match(ID) || [];
    // Cheap first test, before the log is opened at all.
    if (ids.length && wanted && !ids.some((id) => wanted.has(id))) return null;
    const log = readLog(logFile, projectDir);
    if (!log) return null;
    if (!ids.length) ids = log.promptIds;
    ids = [...new Set(ids)].filter((id) => !wanted || wanted.has(id));
    if (!ids.length) return null;
    const lastAt = log.lastAt;
    if (lastAt === null) return null;
    let ended = log.ended;
    // Newer Claude Code marks a finished agent in its meta file; an agent
    // resumed after that writes to its log again, which outdates the mark.
    if (!ended && meta.finished && lastAt <= meta.mtimeMs + 5000) ended = 'finished';
    const steps = log.steps.filter((s) => s.at !== null);
    return {
      ids,
      agent: {
        kind: kindOf(meta.agentType),
        startedAt: log.startedAt ?? log.firstAt,
        lastAt,
        ended,
        step: steps[steps.length - 1] || null,
        steps,
      },
    };
  } catch {
    return null;
  }
}

// The card needs no step list; this is what the board summary and the live
// events carry.
export const summary = ({ steps, ...a }) => a;
