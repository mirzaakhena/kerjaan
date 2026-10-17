// The skill, its scripts, the agent definitions, the viewer and the tests are
// written in English (261017175101, 261017184401). Nothing stopped Indonesian
// from coming back: the viewer's "diam" label got through exactly because no
// check looked. This test fails when a common Indonesian word appears in any
// file of the repo, and names the file and the line (261017184402).
//
// What is not read: a board's own folder, `.kerjaan/`, written in whatever
// language its settings say (this repo's board is Indonesian), and the
// exceptions below, each an example that shows a board in another language on
// purpose. An exception names its file and, where it can, a piece of the line
// it allows, so new Indonesian elsewhere in the same file is still caught.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const SELF = 'tests/english-only.test.mjs';

// Common Indonesian words that are not English words, so English text never
// trips them ("data", "label", "status" and the like are left out on purpose).
// The plugin's own name, "kerjaan", is not in the list.
const WORDS = [
  // everyday function words
  'yang', 'dan', 'dengan', 'tidak', 'untuk', 'belum', 'sudah', 'sedang', 'ini', 'itu',
  'dari', 'dalam', 'tanpa', 'atau', 'juga', 'karena', 'bila', 'jika', 'kalau', 'harus',
  'bisa', 'boleh', 'akan', 'ada', 'oleh', 'pada', 'saat', 'setelah', 'sebelum', 'sesudah',
  'masih', 'hanya', 'tetap', 'lagi', 'saja', 'dulu', 'dahulu', 'lebih', 'sama', 'antara',
  'semua', 'baru', 'siapa', 'bagaimana', 'mengapa', 'kenapa', 'nanti', 'sekarang', 'jadi',
  // the words a board, a ticket or a screen would use
  'diam', 'tiket', 'papan', 'proyek', 'urutan', 'agen', 'aset', 'gaya', 'selesai',
  'dikerjakan', 'kerjakan', 'tinjau', 'ditinjau', 'tinjauan', 'peninjau', 'pekerja',
  'perencana', 'pemilik', 'tugas', 'berjalan', 'jalan', 'menunggu', 'catat', 'catatan',
  'simpan', 'hapus', 'dihapus', 'batal', 'dibatalkan', 'kembali', 'tutup', 'buka', 'pilih',
  'cari', 'gagal', 'berhasil', 'lulus', 'ditolak', 'diterima', 'tandai', 'berikutnya',
  'langsung', 'mulai', 'lanjut', 'berhenti', 'jawab', 'jawaban', 'pertanyaan', 'tanya',
  'keputusan', 'pecah', 'dipecah', 'tujuan', 'latar', 'permintaan', 'riwayat', 'prioritas',
  'rendah', 'tinggi', 'ringkasan', 'judul', 'alasan', 'pengecualian', 'uji', 'pengujian',
  'kriteria', 'putaran', 'izin', 'pengecekan', 'hijau', 'merah', 'masuk', 'keluar', 'ulang',
  'ubah', 'mengubah', 'tambah', 'kirim', 'terima', 'gabung', 'digabung', 'gabungkan',
  'cabang', 'berkas', 'baris', 'kata', 'bahasa', 'pesan', 'galat', 'kesalahan',
  'peringatan', 'kosong', 'penuh', 'tampil', 'tampilkan', 'lihat', 'muat', 'memuat',
  'tanggal', 'bulan', 'tahun', 'minggu', 'hari', 'menit', 'detik',
];

// The one list of what is allowed, each with its reason. `line` is a piece of
// the allowed line; without it the whole file is allowed.
const EXCEPTIONS = [
  { file: SELF,
    reason: 'this test: it holds the word list and the Indonesian it plants to prove itself' },
  { file: 'tests/real-order/old.md',
    reason: 'a real order.md written in Indonesian, kept so the tests prove it is rejected' },
  { file: 'tests/trigger/previous-description.txt',
    reason: 'the skill description before 261017184401, with its Indonesian trigger phrases, kept to compare triggering before and after' },
  { file: 'tests/trigger/results-before.json', line: '"description": ',
    reason: 'the same old description, recorded with the trigger results it produced' },
  { file: 'tests/queue.test.mjs', line: '**Tujuan.** One batch.',
    reason: 'a goal line in another language must be read as a lead-in, not as the goal' },
  { file: 'tests/queue.test.mjs', line: 'dan ${B} mengubah src/web/b.js;',
    reason: 'the old free wording about which ticket lands first, in Indonesian, must no longer be read' },
  { file: 'tests/on-ticket-review.test.mjs', line: 'Ditinjau pada level quick',
    reason: 'a review note on an Indonesian board, which the hook must still read' },
  { file: 'tests/on-ticket-review.test.mjs', line: 'Uji proyek dijalankan sekali; kriteria 2 belum terpenuhi.',
    reason: 'a review note on an Indonesian board, which the hook must still read' },
  { file: 'tests/on-ticket-review.test.mjs', line: "'  Kriteria 2 gagal: uji izin tetap hijau saat pengecekan dihapus.',",
    reason: 'a review note on an Indonesian board, which the hook must still read' },
  { file: 'tests/on-ticket-review.test.mjs', line: "'  Kriteria 3 gagal.',",
    reason: 'a review note on an Indonesian board, which the hook must still read' },
  { file: 'viewer/tests/server.test.mjs', line: "'/api/proyek', '/aset/gaya.css', '/aset/proyek.js', '/aset/pil.js',",
    reason: 'the viewer\'s old Indonesian addresses, which must now answer 404' },
  { file: 'viewer/tests/server.test.mjs', line: "`/alpha/tiket/${ID.a}`, '/alpha/urutan', '/alpha/api/papan', '/alpha/api/urutan',",
    reason: 'the viewer\'s old Indonesian addresses, which must now answer 404' },
  { file: 'viewer/tests/server.test.mjs', line: '`/alpha/api/tiket/${ID.a}`, `/alpha/api/agen/${ID.a}`,',
    reason: 'the viewer\'s old Indonesian addresses, which must now answer 404' },
];

// A word stands alone: no letter, digit or underscore on either side, and no
// dot before it, so a file name like `tox.ini` is not the word "ini".
const pattern = new RegExp(`(?<![\\p{L}\\p{N}_.])(${WORDS.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');

// Every file git knows of or would add, committed or not, outside `.kerjaan/`.
function files(dir) {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: dir, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f && f !== '.kerjaan' && !f.startsWith('.kerjaan/'));
}

// Every Indonesian word found in `dir`, with the exception that allows it, if any.
function scan(dir, exceptions = EXCEPTIONS) {
  const hits = [];
  for (const file of [...new Set(files(dir))]) {
    let text;
    try { text = fs.readFileSync(path.join(dir, file), 'utf8'); } catch { continue; }
    if (text.includes('\0')) continue;
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(pattern)) {
        const allowed = exceptions.find((e) => e.file === file && (e.line === undefined || line.includes(e.line)));
        hits.push({ file, line: i + 1, word: m[1], text: line.trim(), allowed });
      }
    });
  }
  return hits;
}

const show = (h) => `${h.file}:${h.line}: "${h.word}" in: ${h.text.slice(0, 160)}`;

test('no common Indonesian word in the skill, the scripts, the agents, the viewer or the tests', () => {
  const caught = scan(root).filter((h) => !h.allowed);
  assert.equal(caught.length, 0,
    `Indonesian found (write it in English, or add an exception with its reason to ${SELF}):\n`
    + caught.map(show).join('\n'));
});

test('every exception gives its reason and still allows something', () => {
  const used = new Set(scan(root).filter((h) => h.allowed).map((h) => h.allowed));
  for (const e of EXCEPTIONS) {
    assert.ok(typeof e.reason === 'string' && e.reason.length > 20, `${e.file}: no reason given`);
    assert.ok(used.has(e), `${e.file}${e.line ? ` "${e.line}"` : ''} allows nothing any more: remove it`);
  }
});

test('the scan names the file and line, reads every kind of file, and skips the board', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kerjaan-english-'));
  try {
    const put = (p, t) => {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
      fs.writeFileSync(path.join(dir, p), t);
    };
    execFileSync('git', ['init', '-q'], { cwd: dir });
    put('viewer/web/agent.js', "const a = 'running';\nconst b = 'diam';\n");
    put('skills/kerjaan/scripts/queue.sh', 'echo "ok"\necho "Tiket tidak ditemukan"\n');
    put('skills/kerjaan/SKILL.md', '# Skill\n\nSee `tox.ini` and the data label.\n');
    put('.kerjaan/todo/261017000000 Tiket yang diam.md', '## Background\nTiket ini sedang menunggu.\n');
    put('.kerjaan/settings.md', 'language: Bahasa Indonesia\n');
    const hits = scan(dir, []);
    assert.deepEqual(hits.map((h) => `${h.file}:${h.line}:${h.word}`).sort(), [
      'skills/kerjaan/scripts/queue.sh:2:Tiket',
      'skills/kerjaan/scripts/queue.sh:2:tidak',
      'viewer/web/agent.js:2:diam',
    ]);
    // An exception allows only its own line: a second Indonesian line in the same file is caught.
    put('viewer/web/agent.js', "const b = 'diam';\nconst c = 'selesai';\n");
    const narrow = [{ file: 'viewer/web/agent.js', line: "'diam'", reason: 'an example' }];
    assert.deepEqual(scan(dir, narrow).filter((h) => !h.allowed && h.file.startsWith('viewer/')).map(show),
      ["viewer/web/agent.js:2: \"selesai\" in: const c = 'selesai';"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
