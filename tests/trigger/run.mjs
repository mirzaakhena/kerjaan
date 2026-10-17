#!/usr/bin/env node
// Uji pemicu deskripsi skill kerjaan (261011073101).
//
// Menjalankan setiap kalimat di kalimat.json lewat `claude -p` di sesi baru,
// dengan plugin dari salinan repo ini yang deskripsi skill-nya diganti, lalu
// mencatat apakah sesi itu memanggil skill `kerjaan:kerjaan`. Plugin kerjaan
// yang terpasang dimatikan agar tidak ikut termuat. Kalimat ber-`repo: papan`
// dijalankan di repo coba yang punya `.kerjaan/`, `repo: kosong` di repo coba
// tanpa papan; keduanya dibuat ulang bersih sebelum setiap jalan.
//
// Pemakaian (dari akar repo):
//   node uji/pemicu/jalankan.mjs --deskripsi uji/pemicu/deskripsi-lama.txt --keluar uji/pemicu/hasil-lama.json
//   node uji/pemicu/jalankan.mjs --keluar uji/pemicu/hasil-baru.json      # deskripsi di SKILL.md sekarang
// Pilihan: --ulang 3 (ulangan per kalimat), --paralel 6, --hanya id1,id2,
// --tmp <folder kerja>. Memakai kuota Claude: 40 kalimat x 3 ulangan.
//
// Keputusan per jalan, dari pesan asisten di stream-json:
//   skill            panggilan Skill pertama adalah kerjaan:kerjaan  -> terpanggil
//   skill-lain:<n>   panggilan Skill pertama adalah skill lain        -> tidak
//   agen:<n>         langsung mengutus agen kerjaan tanpa skill       -> tidak
//   tidak            tidak ada Skill dalam 4 panggilan alat pertama, atau sesi selesai
//   waktu-habis      lewat batas waktu                                -> tidak
// Sesi dihentikan begitu keputusan jatuh, jadi tidak ada pekerjaan yang diteruskan.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');

export const KALIMAT = path.join(here, 'kalimat.json');
export const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
export const kata = (t) => t.split(/\s+/).filter(Boolean).length;
export const deskripsiSkill = () => fs.readFileSync(path.join(root, 'skills/kerjaan/SKILL.md'), 'utf8')
  .match(/^description: (.*)$/m)[1];

// Ringkasan sebuah hasil: berapa jalan yang memanggil skill, dipisah antara
// kalimat yang harus memanggil dan yang tidak boleh, dan berapa kalimat lolos
// menurut suara terbanyak.
export function ringkas(hasil) {
  const r = { harus: { jalan: 0, terpanggil: 0, kalimatLolos: 0, kalimat: 0 },
              tidak: { jalan: 0, terpanggil: 0, kalimatLolos: 0, kalimat: 0 } };
  for (const h of hasil) {
    const g = h.harus ? r.harus : r.tidak;
    const n = h.jalan.filter((o) => o === 'skill').length;
    g.jalan += h.jalan.length;
    g.terpanggil += n;
    g.kalimat += 1;
    const mayoritas = n * 2 > h.jalan.length;
    if (mayoritas === h.harus) g.kalimatLolos += 1;
  }
  return r;
}

const reset = (dir, papan) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const w = (p, t) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), t); };
  const git = (...a) => spawnSync('git', a, { cwd: dir, stdio: 'ignore' });
  w('README.md', '# Toko\n\nAplikasi toko kecil. Jalankan dengan `node main.js`.\nThe sourse lives in main.js.\n');
  w('main.js', [
    'function add(a, b) {', '  return a + b;', '}', '',
    'function rataRata(xs) {', '  let total = 0;', '  for (let i = 0; i <= xs.length; i++) total += xs[i] ?? 0;',
    '  return total / xs.length;', '}', '',
    '// TODO: pindahkan ke modul sendiri', 'module.exports = { add, rataRata };', ''].join('\n'));
  if (papan) {
    w('.kerjaan/settings.md', '---\nlanguage: Bahasa Indonesia\ntest_command: node --test\nlong_lived_branches: []\n---\n');
    const tiket = (folder, id, judul, latar) => w(`.kerjaan/${folder}/${id} ${judul}.md`,
      `---\ntype: bug\npriority: medium\nreview: normal\nlabels: []\nreporter: mirza\nassign_to: claude\ncreated: 2026-10-01 09:00:00\nupdated: 2026-10-01 09:00:00\nrelated: []\nblocked_by: []\n---\n\n## Background\n\n${latar}\n\n## Request\n\n${judul}.\n\n## Done when\n- [ ] ${judul}\n\n## History\n- 2026-10-01 09:00:00 ${folder}\n\n## Notes\n`);
    tiket('backlog', '261001090001', 'Impor pesanan dari CSV', 'Pesanan lama ada di berkas CSV.');
    tiket('todo', '261001090002', 'Timeout login terlalu cepat', 'Pengguna keluar sendiri setelah dua menit.');
    tiket('todo', '261001090003', 'Halaman pesanan tanpa paginasi', 'Halaman pesanan memuat semua baris sekaligus.');
    tiket('review', '261001090004', 'Harga tampil tanpa pemisah ribuan', 'Harga 1500000 sulit dibaca.');
    w('.kerjaan/order.md', '# Order\n\n1. 261001090002\n2. 261001090003\n');
  }
  git('init', '-q'); git('add', '-A');
  git('-c', 'user.name=coba', '-c', 'user.email=coba@contoh', 'commit', '-qm', 'awal');
  // Perubahan yang belum di-commit, agar "review kode ini" dan "commit" punya bahan.
  fs.appendFileSync(path.join(dir, 'main.js'), '\nfunction kali(a, b) { return a * b }\nmodule.exports.kali = kali;\n');
};

const salinPlugin = (tujuan, deskripsi) => {
  fs.rmSync(tujuan, { recursive: true, force: true });
  for (const d of ['.claude-plugin', 'skills', 'agents', 'hooks']) {
    fs.cpSync(path.join(root, d), path.join(tujuan, d), { recursive: true });
  }
  const f = path.join(tujuan, 'skills/kerjaan/SKILL.md');
  const t = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, t.replace(/^description: .*$/m, () => `description: ${deskripsi}`));
};

function satuJalan(kalimat, cwd, plugin, batasMs) {
  return new Promise((selesai) => {
    const env = { ...process.env }; delete env.CLAUDECODE;
    const p = spawn('claude', ['-p', kalimat, '--plugin-dir', plugin,
      '--settings', JSON.stringify({ enabledPlugins: { 'kerjaan@kerjaan': false } }),
      '--permission-mode', 'default', '--no-session-persistence',
      '--output-format', 'stream-json', '--verbose'], { cwd, env, stdio: ['ignore', 'pipe', 'ignore'] });
    let buf = ''; let alat = 0; let model = null; let skills = null; let putus = null;
    const akhiri = (o) => { if (putus) return; putus = o; clearTimeout(t); p.kill('SIGKILL'); };
    const t = setTimeout(() => akhiri('waktu-habis'), batasMs);
    p.stdout.on('data', (c) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type === 'system' && e.subtype === 'init') { model = e.model; skills = e.skills; }
        if (e.type === 'result') akhiri('tidak');
        if (e.type !== 'assistant') continue;
        for (const b of e.message?.content ?? []) {
          if (b.type !== 'tool_use' || putus) continue;
          alat += 1;
          if (b.name === 'Skill') akhiri(b.input?.skill === 'kerjaan:kerjaan' ? 'skill' : `skill-lain:${b.input?.skill}`);
          else if (['Agent', 'Task'].includes(b.name) && String(b.input?.subagent_type).startsWith('kerjaan:')) akhiri(`agen:${b.input.subagent_type}`);
          else if (alat >= 4) akhiri('tidak');
        }
      }
    });
    p.on('close', () => { clearTimeout(t); selesai({ hasil: putus ?? 'tidak', model, skillTermuat: skills?.includes('kerjaan:kerjaan') ?? false }); });
  });
}

async function main() {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
  const deskripsiFile = arg('deskripsi');
  const deskripsi = deskripsiFile ? fs.readFileSync(deskripsiFile, 'utf8').trim() : deskripsiSkill();
  const ulang = Number(arg('ulang', 3));
  const paralel = Number(arg('paralel', 6));
  const keluar = arg('keluar');
  const hanya = arg('hanya')?.split(',');
  const tmp = arg('tmp', path.join(os.tmpdir(), 'kerjaan-pemicu'));
  if (!keluar) { console.error('--keluar <berkas hasil> wajib'); process.exit(2); }

  const kalimat = JSON.parse(fs.readFileSync(KALIMAT, 'utf8')).filter((k) => !hanya || hanya.includes(k.id));
  const plugin = path.join(tmp, 'plugin');
  salinPlugin(plugin, deskripsi);
  const tugas = kalimat.flatMap((k) => Array.from({ length: ulang }, (_, u) => ({ k, u })));
  const jalan = Object.fromEntries(kalimat.map((k) => [k.id, []]));
  const models = new Set(); let tanpaSkill = 0; let ke = 0;

  await Promise.all(Array.from({ length: paralel }, async (_, slot) => {
    while (ke < tugas.length) {
      const { k, u } = tugas[ke++];
      const cwd = path.join(tmp, `slot${slot}`, k.repo);
      reset(cwd, k.repo === 'papan');
      const r = await satuJalan(k.kalimat, cwd, plugin, 180000);
      if (r.model) models.add(r.model);
      if (!r.skillTermuat) tanpaSkill += 1;
      jalan[k.id][u] = r.hasil;
      console.error(`${k.harus ? 'harus' : 'tidak'}  ${r.hasil.padEnd(28)} ${k.id} #${u + 1}`);
    }
  }));

  if (tanpaSkill) { console.error(`${tanpaSkill} jalan tanpa skill kerjaan termuat; hasil tidak ditulis`); process.exit(1); }
  const hasil = kalimat.map((k) => ({ id: k.id, repo: k.repo, harus: k.harus, kelompok: k.kelompok, kalimat: k.kalimat, jalan: jalan[k.id] }));
  const claudeVersi = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const out = { tanggal: new Date().toISOString(), claude: claudeVersi, model: [...models], ulang,
    kalimatSha: sha(KALIMAT), deskripsi, kataDeskripsi: kata(deskripsi), ringkasan: ringkas(hasil), hasil };
  fs.writeFileSync(keluar, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out.ringkasan, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
