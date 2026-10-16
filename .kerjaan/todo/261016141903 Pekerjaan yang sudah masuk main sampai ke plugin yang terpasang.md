---
type: task
priority: high
review:
labels: [sesi-a192c9e8, release]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:46:20
related: [261016122402]
blocked_by: []
---

## Background

Sesi Claude Code memakai salinan plugin kerjaan yang terpasang, bukan isi repo
ini. Pada 2026-10-16 repo sudah berada di versi 1.12.0 ditambah beberapa
perbaikan, sedangkan plugin yang terpasang masih 1.11.0. Rilis 1.12.0 dibuat
sebelum tiket 261016122401, 261016122402 dan 261016125401 selesai, dan setelah
itu nomor versinya tidak dinaikkan lagi.

Akibatnya sebuah tiket bisa lolos review dan masuk main, tetapi tidak pernah
aktif bagi siapa pun yang memakai plugin. Tidak ada langkah di papan yang
mengingatkan hal ini.

## Request

Pekerjaan yang sudah selesai benar-benar sampai ke plugin yang dipakai sesi,
dan papan mengingatkan bila ada pekerjaan selesai yang belum dirilis.

## Done when
- [ ] Versi plugin dinaikkan melewati 1.12.0, dengan catatan rilis yang menyebut tiket-tiket yang belum ikut rilis sebelumnya
- [ ] Setelah plugin diperbarui, sesi baru menolak grup antrean yang tidak menyebut urutan penggabungan (perilaku tiket 261016122402)
- [ ] Saat papan kosong, mandor menyebut tiket selesai yang belum ikut rilis mana pun dan menawarkan rilis
- [ ] Panduan rilis di README menjelaskan kapan versi harus dinaikkan

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:20 todo

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- 2026-10-16 14:36:45: files estimated to change: `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `README.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/foreman.md`
- 2026-10-16 14:38:07: answered question: Rilis butuh git push (main 77 commit di depan origin, plugin dipasang dari GitHub) lalu /plugin update; agen tidak boleh push. Siapa yang push, dan butir 2 (sesi baru menolak grup tanpa urutan penggabungan) ditunda sebagai skenario tangan atau menahan rantai sampai pemilik mengeceknya? Saran: pemilik yang push dan update kapan sempat; butir 2 ditunda, karena sisa batch tidak bergantung padanya.
  answer, 2026-10-16 14:45:45: Pemilik yang push dan menjalankan /plugin update kapan sempat; butir 2 ditunda sebagai skenario tangan.
- 2026-10-16 14:38:08: answered question: Kapan rilis: (a) di grup 2, memuat 4 tiket lama ditambah 261016141901 dan 261016141902, lalu rilis lagi sesudah batch atas pengingat dari tiket ini; atau (b) sekali saja di akhir batch? Saran: (a), agar penyusun antrean dan perbaikan skrip sudah aktif di plugin selama sisa batch.
  answer, 2026-10-16 14:45:46: (a) Rilis di grup 2, lalu rilis lagi di akhir batch saat pengingat dari tiket ini muncul.
