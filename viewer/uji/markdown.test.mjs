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
