---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, tests]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:08
updated: 2026-10-16 16:28:28
related: [261016141901, 261016141902, 261016141914]
blocked_by: []
---

## Background

Suite uji berjalan sekitar 150 detik dan lulus 116 dari 116 uji. Tetapi skrip
yang paling sering mengubah papan hanya teruji secara tidak langsung, yaitu
skrip pemindah tiket (pemangkasan daftar urutan, penyisipan riwayat,
penyesuaian nama di daftar urutan) dan skrip pembuat tiket (pembagian ID saat
bersamaan, batas 99 tiket per menit, pengambilalihan kunci basi). Rekaman uji
hanya teruji lewat skrip penggabungan; kasus berkas baru yang belum dilacak
dan isi yang berubah saat uji berjalan belum diuji.

Menjalankan uji dengan menyebut foldernya saja juga gagal, dan belum ada
perintah uji yang tertulis untuk penyumbang.

## Request

Skrip yang paling sering mengubah papan punya uji langsung, dan cara
menjalankan suite tertulis dengan jelas.

## Done when
- [ ] Ada uji langsung untuk pemangkasan daftar urutan, penyisipan riwayat dan penggantian nama di daftar urutan
- [ ] Ada uji untuk pembuatan tiket bersamaan dan batas jumlah tiket per menit
- [ ] Ada uji rekaman uji untuk berkas yang belum dilacak dan isi yang berubah saat uji berjalan
- [ ] README menyebut satu perintah untuk menjalankan semua uji, dan perintah itu berhasil
- [ ] Waktu jalan suite sebelum dan sesudah tercatat di Notes

## History
- 2026-10-16 14:19:08 backlog
- 2026-10-16 14:46:21 todo
- 2026-10-16 16:28:28 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- 2026-10-16 14:36:46: files estimated to change: `README.md`, `uji/new-ticket.test.mjs`, `uji/test-run.test.mjs`, `uji/update-ticket.test.mjs`
