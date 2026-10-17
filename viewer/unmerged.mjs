// Which tickets' branches still hold work outside the main line, so a ticket
// in done whose code never reached main can be marked on its card instead of
// surfacing only when the next ticket is refused at its start.
//
// The rule is the one update-ticket.sh applies at that start gate, so the
// board and the scripts agree on what "unmerged" means:
//   - a local branch is unmerged when it is not contained in HEAD
//     (`git merge-base --is-ancestor`, here asked for every branch at once
//     with `for-each-ref --no-merged=HEAD`);
//   - a branch belongs to a ticket when its name carries the ticket's ID — the
//     only link between git and the board (references/parallel-work.md);
//   - branches matching a pattern in long_lived_branches (settings.md) are
//     never named, read and matched as the script does: the `[...]` line,
//     comma-separated, quotes stripped, each a shell glob as in `case`.
// The start gate also passes over a branch whose merge is held for the owner;
// the board does not, since a held branch is exactly code that is not on main.
//
// A project is read as a repository only when its folder holds `.git` (a
// folder, or a file in a linked worktree): the board always sits at the
// repository's root, and a project that is not a repository costs no git call
// at all. Any failure of git — no commits yet, git missing, a broken repo —
// reads as "nothing unmerged": the mark is a hint, never an error on the board.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// A branch's ticket IDs: every run of exactly 12 digits in its name.
const idsIn = (branch) => branch.match(/(?<!\d)\d{12}(?!\d)/g) || [];

// The patterns in long_lived_branches, as update-ticket.sh reads them.
export function longLivedPatterns(settingsText) {
  const m = settingsText.match(/^long_lived_branches:[ \t]*\[(.*)\][ \t]*$/m);
  if (!m) return [];
  return m[1].split(',').map((p) => p.replace(/^[\s"']*/, '').replace(/[\s"']*$/, '')).filter(Boolean);
}

// A shell `case` glob as a regular expression: `*` and `?` match `/` too, and
// `[...]` / `[!...]` are character classes.
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '[') {
      const end = glob.indexOf(']', i + 2);
      if (end === -1) { re += '\\['; continue; }
      let body = glob.slice(i + 1, end);
      if (body[0] === '!') body = `^${body.slice(1)}`;
      re += `[${body.replace(/\\/g, '\\\\')}]`;
      i = end;
    } else re += c.replace(/[.+^${}()|\\/]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const isRepo = (dir) => fs.existsSync(path.join(dir, '.git'));

function git(dir, args) {
  return new Promise((resolve) => {
    execFile('git', ['-C', dir, ...args], { timeout: 5000, maxBuffer: 4 << 20 }, (err, stdout) => resolve(err ? null : stdout));
  });
}

// Map<ticket id, branch names[]> of the branches in the repository at <dir>
// that are not contained in HEAD, long-lived ones left out. Empty for a folder
// that is not a repository, or whenever git cannot answer.
export async function unmergedBranches(dir, board = path.join(dir, '.kerjaan')) {
  const found = new Map();
  if (!isRepo(dir)) return found;
  const out = await git(dir, ['for-each-ref', '--no-merged=HEAD', '--format=%(refname:short)', 'refs/heads']);
  if (!out) return found;
  let patterns = [];
  try {
    patterns = longLivedPatterns(fs.readFileSync(path.join(board, 'settings.md'), 'utf8')).map(globToRegExp);
  } catch {
    // no settings.md: nothing is long-lived
  }
  for (const branch of out.split('\n').filter(Boolean)) {
    if (patterns.some((p) => p.test(branch))) continue;
    for (const id of new Set(idsIn(branch))) {
      if (!found.has(id)) found.set(id, []);
      found.get(id).push(branch);
    }
  }
  return found;
}
