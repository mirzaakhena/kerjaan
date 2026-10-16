---
type: task
priority: high
review: normal
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-16 14:21:57
related: [261011073101, 261016141911]
blocked_by: [261016141904, 261016141905, 261016141907, 261016141908]
---

## Background

Setiap kali skill dipanggil, seluruh berkas utamanya dimuat: sekitar 740
baris, kira-kira 8 sampai 9 ribu token. Permintaan sesederhana "catat ini ke
backlog" ikut membawa aturan tentang mandor, kerja berdampingan,
penggabungan, review dan commit, yang tidak dibutuhkannya.

Banyak aturan juga ditulis berulang: batas ukuran tiket di enam tempat, peran
penyusun antrean di empat tempat, dan larangan meninjau pekerjaan sendiri di
tiga tempat. Sebagian prosa menjelaskan cara kerja dalam skrip yang tidak
perlu diketahui model, atau menyuruh model melakukan dengan tangan hal yang
sudah dilakukan skrip.

## Request

Berkas utama skill hanya memuat yang dibutuhkan hampir setiap permintaan.
Sisanya dibaca dari panduan terpisah saat memang diperlukan, dan setiap aturan
punya satu tempat.

## Done when
- [ ] Berkas utama skill paling banyak sekitar 350 baris, dengan jumlah kata sebelum dan sesudah tercatat di Notes
- [ ] Ringkasan perintah di awal skill hanya memuat perintah yang dipakai hampir setiap sesi
- [ ] Setiap aturan tertulis lengkap di satu tempat, dan tempat lain hanya merujuk dalam satu baris
- [ ] Panduan tidak lagi menyuruh menjalankan dengan tangan hal yang sudah dikerjakan skrip
- [ ] Sesi baru yang diminta "catat ini ke backlog" membuat tiket yang benar tanpa membuka panduan mana pun
- [ ] Sesi baru yang diminta mengerjakan todo tetap menemukan dan mengikuti panduan mandor

## History
- 2026-10-16 14:19:07 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Kandidat pindah ke panduan: SKILL.md:418-741 (dari "Into `todo`" sampai
  akhir). Penjelasan yang bisa dipangkas: algoritme ID (129-132), mekanika
  sidik jari uji (594-604), daftar pengecualian cabang (513-521), sejarah
  History (213-222).
- Ringkasan gerbang di SKILL.md:77-83 adalah contoh gaya rujukan yang tepat.
- `K="${CLAUDE_PLUGIN_ROOT}/..."` di baris 21 tidak punya cadangan bila
  variabelnya kosong, padahal ketiga agen punya.
- Prosa yang mengerjakan tugas skrip: `ordering-the-queue.md:136-138` (diff
  manual) dan `parallel-work.md:60-64` (perintah git worktree mentah).
