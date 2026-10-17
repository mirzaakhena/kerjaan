import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../web/markdown.js';

const known = { '261006110801': { title: 'Title <b>', status: 'done' } };
const opts = { ticket: (id) => known[id] || null, href: (id) => `/p/ticket/${id}` };

test('ticket text never becomes HTML', () => {
  const html = render('Hello <script>alert(1)</script> <img src=x onerror=y>\n\n## <i>title</i>', opts);
  assert.ok(!/<script|<img|<i>/.test(html), html);
  assert.match(html, /&lt;script&gt;/);
});

test('links only for http, https, and mailto', () => {
  const html = render('[a](javascript:alert(1)) [b](https://example.org/?x=1&y=2) [c](data:text/html,x)', opts);
  assert.ok(!html.includes('href="javascript'), html);
  assert.ok(!html.includes('href="data'), html);
  assert.match(html, /href="https:\/\/example\.org\/\?x=1&amp;y=2"/);
});

test('Done when checkboxes', () => {
  const html = render('- [x] done\n- [ ] not yet', opts);
  assert.equal((html.match(/class="task done"/g) || []).length, 1);
  assert.equal((html.match(/class="task"/g) || []).length, 1);
});

test('ticket IDs become links; a [[ID]] that does not exist is marked', () => {
  const html = render('See [[261006110801]], [[999999999999]], and 261006110801. The number 123456789012 is no ticket.', opts);
  assert.match(html, /<a class="ticket" data-id="261006110801" href="\/p\/ticket\/261006110801"/);
  assert.match(html, /<span class="t">Title &lt;b&gt;<\/span>/);
  assert.match(html, /class="missing"[^>]*>\[\[999999999999\]\]/);
  assert.equal((html.match(/data-id="261006110801"/g) || []).length, 2);
  assert.ok(!html.includes('data-id="123456789012"'));
});

test('code blocks are not interpreted, headings inside them included', () => {
  const html = render('```\n## Notes\n- [ ] x\n**y**\n```\n\n~~~\n<b>\n~~~', opts);
  assert.ok(!html.includes('<h2>'), html);
  assert.ok(!html.includes('class="task'), html);
  assert.match(html, /<pre><code>## Notes\n- \[ \] x\n\*\*y\*\*<\/code><\/pre>/);
  assert.match(html, /<pre><code>&lt;b&gt;<\/code><\/pre>/);
});

test('nested lists and continuation lines', () => {
  const html = render('- one\n  continued\n  - child\n- two', opts);
  assert.equal(html, '<ul><li>one continued<ul><li>child</li></ul></li><li>two</li></ul>');
});

test('tables, quotes, strikethrough, and inline code', () => {
  const html = render('| a | b |\n|---|---|\n| `x` | ~~y~~ |\n\n> quote', opts);
  assert.match(html, /<table><thead><tr><th>a<\/th><th>b<\/th><\/tr><\/thead><tbody><tr><td><code>x<\/code><\/td><td><del>y<\/del><\/td><\/tr><\/tbody><\/table>/);
  assert.match(html, /<blockquote><p>quote<\/p><\/blockquote>/);
});

// ## History: each line is `- <time> <status>` (older lines, moves made from a
// plain terminal) or `- <time> <session-id> <status>` (moves made inside a
// Claude Code session). Both render as one row: time, status, and the session
// set apart when there is one.
const SID = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const historyRows = (html) => [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);

test('history lines with and without a session id become rows of the same shape', () => {
  const md = `## History\n- 2026-10-16 14:00:00 backlog\n- 2026-10-16 14:16:07 ${SID} in_progress\n- 2026-10-16 15:00:00 review\n- 2026-10-16 16:00:00 ${SID} done\n\n## Notes\n- x`;
  const html = render(md, opts);
  assert.equal((html.match(/<ul class="history">/g) || []).length, 1, html);
  const rows = historyRows(html.split('<ul class="history">')[1].split('</ul>')[0]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0], '<span class="time">2026-10-16 14:00:00</span><span class="status s-backlog">backlog</span><span class="session blank"></span>');
  assert.equal(rows[1], `<span class="time">2026-10-16 14:16:07</span><span class="status s-in_progress">in progress</span><code class="session" title="The Claude Code session that moved this ticket. Open it again: claude --resume ${SID}">${SID}</code>`);
  assert.match(rows[2], /<span class="status s-review">review<\/span><span class="session blank"><\/span>$/);
  assert.match(rows[3], new RegExp(`<span class="status s-done">done</span><code class="session"[^>]*>${SID}</code>$`));
});

test('every status gets its own colour in the history', () => {
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    for (const line of [`- 2026-10-16 14:00:00 ${s}`, `- 2026-10-16 14:00:00 ${SID} ${s}`]) {
      assert.match(render(`## History\n${line}`, opts), new RegExp(`class="status s-${s}"`), line);
    }
  }
});

test('history-shaped lines outside ## History, or in a code block, stay ordinary markdown', () => {
  const line = `- 2026-10-16 14:16:07 ${SID} done`;
  for (const md of [`## Notes\n${line}`, `${line}`, `## History\n\`\`\`\n${line}\n\`\`\``, `## History\n### Other\n${line}`]) {
    const html = render(md, opts);
    assert.ok(!html.includes('class="history"'), md + '\n' + html);
  }
  // The records end at the next heading.
  assert.match(render(`## History\n- 2026-10-16 14:00:00 todo\n\n## Notes\n- 2026-10-16 14:00:00 todo`, opts), /<ul class="history">.*<\/ul>\n<h2>Notes<\/h2>\n<ul><li>2026-10-16 14:00:00 todo<\/li><\/ul>/s);
});

test('a history line not shaped as a record renders as usual, and the rest stays tidy', () => {
  const html = render(`## History\n- 2026-10-16 14:00:00 todo\n- a note by hand <b>\n- 2026-10-16 15:00:00 ${SID} review`, opts);
  assert.equal((html.match(/<ul class="history">/g) || []).length, 2, html);
  assert.match(html, /<ul><li>a note by hand &lt;b&gt;<\/li><\/ul>/);
});

test('a session id never becomes HTML or a ticket link', () => {
  const html = render('## History\n- 2026-10-16 14:00:00 0000-261006110801 done', opts);
  assert.ok(!html.includes('data-id='), html);
  assert.match(html, /<code class="session"[^>]*>0000-261006110801<\/code>/);
});
