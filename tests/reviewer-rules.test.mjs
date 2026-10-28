// The reviewer's rules each have one place (261016141910): the definition of
// the reviewer stays short, the table of review levels is written once (in
// the reviewer's definition), the other documents point at it instead of
// copying it, the case of a ticket branch already merged before review is
// gone, since a branch is merged only after its ticket is done, and the
// separate explanation of the reviewer that once sat in docs/ is gone with
// every pointer to it (261017184401).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const flat = (t) => t.replace(/\s+/g, ' ');
const words = (t) => t.split(/\s+/).filter(Boolean).length;

const REVIEWER = 'agents/kerjaan-reviewer.md';
const REVIEW = 'skills/kerjaan/references/review.md';

// Every document a person or an agent reads for the rules.
const mdIn = (dir) => fs.readdirSync(path.join(root, dir))
  .filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);
const allDocs = ['README.md', 'skills/kerjaan/SKILL.md', ...mdIn('skills/kerjaan/references'), ...mdIn('agents')];

const headings = (t) => [...t.matchAll(/^#{2,4} (.+)$/gm)].map((m) => m[1].trim());

test('the reviewer definition is at most about 3,000 words', () => {
  const n = words(read(REVIEWER));
  assert.ok(n <= 3000, `${REVIEWER} has ${n} words`);
});

// A table of levels: a row whose first cell is a level, or a header row
// that has the levels as its columns.
const levelRow = /^\|\s*`(quick|normal|strict)`/m;
const levelHeader = /^\|.*\|\s*`quick`\s*\|\s*`normal`\s*\|\s*`strict`\s*\|/m;
for (const file of allDocs) {
  test(`the table of review levels is only in the reviewer definition: ${file}`, () => {
    const text = read(file);
    const hasTable = levelRow.test(text) || levelHeader.test(text);
    assert.equal(hasTable, file === REVIEWER, `${file} ${hasTable ? 'holds' : 'lacks'} a table of review levels`);
  });
}

test('the reviewer\'s table covers every level, and every row of it names all three', () => {
  const text = read(REVIEWER);
  const table = text.slice(text.indexOf('## How thorough to be')).split('\n\n')
    .find((block) => levelHeader.test(block));
  assert.ok(table, 'no table of levels under "How thorough to be"');
  const rows = table.split('\n').slice(2);
  assert.ok(rows.length >= 5, 'too few rows');
  for (const row of rows) assert.equal(row.split('|').length - 2, 4, `a row without a cell per level: ${row}`);
});

// Every document that mentions what a level does points at the table, by the
// heading the reviewer definition actually has.
for (const file of [REVIEW, 'README.md']) {
  test(`${file} points at the reviewer's table instead of copying it`, () => {
    assert.ok(headings(read(REVIEWER)).includes('How thorough to be'));
    assert.match(flat(read(file)), /kerjaan-reviewer\.md`?\]?(\([^)]*\))?,? "How thorough to\s?be"|"How thorough to be"/);
    assert.match(read(file), /kerjaan-reviewer\.md/);
  });
}

// The plugin ships no docs/ folder any more; a pointer to one would lead
// nowhere. A web address such as docs.claude.com is not a pointer to it.
test('there is no docs/ folder, and no document points into one', () => {
  assert.equal(fs.existsSync(path.join(root, 'docs')), false, 'docs/ exists');
  for (const file of allDocs) {
    assert.doesNotMatch(read(file), /(^|[^\w./-])docs\//m, `${file} points into docs/`);
  }
});

test('the explanation of a carried test run is written once in the reviewer definition', () => {
  const text = read(REVIEWER);
  const count = (re) => (text.match(re) || []).length;
  assert.equal(count(/\*\*SAME\*\*/g), 1);
  assert.equal(count(/CI badge/g), 1);
  assert.equal(count(/^## Test runs$/gm), 1);
});

test('the fixed opening line is given once, by the reviewer, and the review guide points at it', () => {
  const line = '- <YYYY-MM-DD>: Reviewed at level <level>, round <n>, at commit <hash>: <passed | sent back>.';
  assert.equal(read(REVIEWER).split(`\n${line}\n`).length, 2);
  assert.ok(!read(REVIEW).includes(line));
  assert.match(flat(read(REVIEW)), /form is given in `agents\/kerjaan-reviewer\.md`, "The decision"/);
  assert.ok(headings(read(REVIEWER)).some((h) => h.startsWith('The decision')));
});

test('the reviewer points at the review guide for how rounds are counted, and that section exists', () => {
  assert.match(flat(read(REVIEWER)), /`references\/review\.md` in the kerjaan skill, "Rounds"/);
  assert.ok(headings(read(REVIEW)).includes('Rounds'));
  assert.match(flat(read(REVIEW)), /the larger count holds/);
  assert.doesNotMatch(flat(read(REVIEWER)), /the larger count holds/);
});

test('the case of a ticket branch already merged before review is gone', () => {
  const text = flat(read(REVIEWER));
  assert.doesNotMatch(text, /merge-base --is-ancestor/);
  assert.doesNotMatch(text, /already been folded/);
  assert.doesNotMatch(text, /for a merged branch/);
  assert.match(text, /merged only after `done`/);
});

// A passing review is short and a rejection stays in full (261028171401): one
// line per criterion, no sentence on what the level means, no command output;
// the next worker starts from a rejection, so it keeps the command and output.
test('a passing review is one line per criterion without restating the level; a rejection stays in full', () => {
  const decision = flat(read(REVIEWER).split('## The decision')[1].split('\n## ')[0]);
  const passed = decision.split('**Every criterion met:**')[1].split('**Any criterion not met:**')[0];
  assert.match(passed, /one line per criterion with its evidence/);
  assert.match(passed, /A passing review is short: no sentence on what the level means, no command output\./);
  assert.doesNotMatch(decision, /what that level meant here/);
  assert.doesNotMatch(passed, /the commands you ran and their results/);
  const rejected = decision.split('**Any criterion not met:**')[1].split('**Commit your verdict**')[0];
  assert.match(rejected, /write it in full for the next worker/);
  assert.match(rejected, /the failed criteria with the command and output that show it/);
});
