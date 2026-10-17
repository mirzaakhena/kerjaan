import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../web/markdown.js';

const known = { '261006110801': { title: 'Judul <b>', status: 'done' } };
const opts = { ticket: (id) => known[id] || null, href: (id) => `/p/tiket/${id}` };

test('teks tiket tidak pernah menjadi HTML', () => {
  const html = render('Halo <script>alert(1)</script> <img src=x onerror=y>\n\n## <i>judul</i>', opts);
  assert.ok(!/<script|<img|<i>/.test(html), html);
  assert.match(html, /&lt;script&gt;/);
});

test('tautan hanya untuk http, https, dan mailto', () => {
  const html = render('[a](javascript:alert(1)) [b](https://contoh.id/?x=1&y=2) [c](data:text/html,x)', opts);
  assert.ok(!html.includes('href="javascript'), html);
  assert.ok(!html.includes('href="data'), html);
  assert.match(html, /href="https:\/\/contoh\.id\/\?x=1&amp;y=2"/);
});

test('kotak centang Done when', () => {
  const html = render('- [x] sudah\n- [ ] belum', opts);
  assert.equal((html.match(/class="task done"/g) || []).length, 1);
  assert.equal((html.match(/class="task"/g) || []).length, 1);
});

test('ID tiket menjadi tautan; [[ID]] yang tidak ada ditandai', () => {
  const html = render('Lihat [[261006110801]], [[999999999999]], dan 261006110801. Angka 123456789012 bukan tiket.', opts);
  assert.match(html, /<a class="tiket" data-id="261006110801" href="\/p\/tiket\/261006110801"/);
  assert.match(html, /<span class="t">Judul &lt;b&gt;<\/span>/);
  assert.match(html, /class="missing"[^>]*>\[\[999999999999\]\]/);
  assert.equal((html.match(/data-id="261006110801"/g) || []).length, 2);
  assert.ok(!html.includes('data-id="123456789012"'));
});

test('blok kode tidak ditafsirkan, termasuk judul di dalamnya', () => {
  const html = render('```\n## Notes\n- [ ] x\n**y**\n```\n\n~~~\n<b>\n~~~', opts);
  assert.ok(!html.includes('<h2>'), html);
  assert.ok(!html.includes('class="task'), html);
  assert.match(html, /<pre><code>## Notes\n- \[ \] x\n\*\*y\*\*<\/code><\/pre>/);
  assert.match(html, /<pre><code>&lt;b&gt;<\/code><\/pre>/);
});

test('daftar bertingkat dan baris lanjutan', () => {
  const html = render('- satu\n  lanjut\n  - anak\n- dua', opts);
  assert.equal(html, '<ul><li>satu lanjut<ul><li>anak</li></ul></li><li>dua</li></ul>');
});

test('tabel, kutipan, coretan, dan kode sebaris', () => {
  const html = render('| a | b |\n|---|---|\n| `x` | ~~y~~ |\n\n> kutip', opts);
  assert.match(html, /<table><thead><tr><th>a<\/th><th>b<\/th><\/tr><\/thead><tbody><tr><td><code>x<\/code><\/td><td><del>y<\/del><\/td><\/tr><\/tbody><\/table>/);
  assert.match(html, /<blockquote><p>kutip<\/p><\/blockquote>/);
});

// ## History: each line is `- <time> <status>` (older lines, moves made from a
// plain terminal) or `- <time> <session-id> <status>` (moves made inside a
// Claude Code session). Both render as one row: time, status, and the session
// set apart when there is one.
const SID = '4dbcf082-290a-4f65-845c-ee75fd3b3e9c';
const historyRows = (html) => [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);

test('riwayat dengan dan tanpa pengenal sesi menjadi baris yang sama bentuknya', () => {
  const md = `## History\n- 2026-10-16 14:00:00 backlog\n- 2026-10-16 14:16:07 ${SID} in_progress\n- 2026-10-16 15:00:00 review\n- 2026-10-16 16:00:00 ${SID} done\n\n## Notes\n- x`;
  const html = render(md, opts);
  assert.equal((html.match(/<ul class="riwayat">/g) || []).length, 1, html);
  const rows = historyRows(html.split('<ul class="riwayat">')[1].split('</ul>')[0]);
  assert.equal(rows.length, 4);
  assert.equal(rows[0], '<span class="waktu">2026-10-16 14:00:00</span><span class="status s-backlog">backlog</span><span class="sesi kosong"></span>');
  assert.equal(rows[1], `<span class="waktu">2026-10-16 14:16:07</span><span class="status s-in_progress">in progress</span><code class="sesi" title="Sesi Claude Code yang memindahkan tiket ini. Buka lagi: claude --resume ${SID}">${SID}</code>`);
  assert.match(rows[2], /<span class="status s-review">review<\/span><span class="sesi kosong"><\/span>$/);
  assert.match(rows[3], new RegExp(`<span class="status s-done">done</span><code class="sesi"[^>]*>${SID}</code>$`));
});

test('setiap status mendapat warnanya sendiri di riwayat', () => {
  for (const s of ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancel']) {
    for (const line of [`- 2026-10-16 14:00:00 ${s}`, `- 2026-10-16 14:00:00 ${SID} ${s}`]) {
      assert.match(render(`## History\n${line}`, opts), new RegExp(`class="status s-${s}"`), line);
    }
  }
});

test('baris berbentuk riwayat di luar ## History, atau di blok kode, tetap markdown biasa', () => {
  const line = `- 2026-10-16 14:16:07 ${SID} done`;
  for (const md of [`## Notes\n${line}`, `${line}`, `## History\n\`\`\`\n${line}\n\`\`\``, `## History\n### Lain\n${line}`]) {
    const html = render(md, opts);
    assert.ok(!html.includes('class="riwayat"'), md + '\n' + html);
  }
  // The records end at the next heading.
  assert.match(render(`## History\n- 2026-10-16 14:00:00 todo\n\n## Notes\n- 2026-10-16 14:00:00 todo`, opts), /<ul class="riwayat">.*<\/ul>\n<h2>Notes<\/h2>\n<ul><li>2026-10-16 14:00:00 todo<\/li><\/ul>/s);
});

test('baris riwayat yang tidak berbentuk catatan dirender biasa, sisanya tetap rapi', () => {
  const html = render(`## History\n- 2026-10-16 14:00:00 todo\n- catatan tangan <b>\n- 2026-10-16 15:00:00 ${SID} review`, opts);
  assert.equal((html.match(/<ul class="riwayat">/g) || []).length, 2, html);
  assert.match(html, /<ul><li>catatan tangan &lt;b&gt;<\/li><\/ul>/);
});

test('pengenal sesi tidak pernah menjadi HTML atau tautan tiket', () => {
  const html = render('## History\n- 2026-10-16 14:00:00 0000-261006110801 done', opts);
  assert.ok(!html.includes('data-id='), html);
  assert.match(html, /<code class="sesi"[^>]*>0000-261006110801<\/code>/);
});
