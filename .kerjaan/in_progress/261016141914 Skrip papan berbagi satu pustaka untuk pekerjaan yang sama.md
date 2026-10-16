---
type: task
priority: low
review: normal
labels: [sesi-a192c9e8, scripts]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 05:35:25
related: [261016141915]
blocked_by: [261016141901, 261016141902]
---

## Background

Skrip-skrip papan punya pustaka bersama, tetapi banyak pekerjaan yang sama
masih ditulis ulang di tiap skrip:

- menolak dijalankan dari worktree: lima salinan;
- mencari tiket berdasarkan ID: lima salinan, salah satunya diam-diam
  mengambil kecocokan pertama bila ada ID kembar;
- menambah catatan ke Notes: tiga salinan;
- membaca pengaturan.

Ada juga dua desain kunci yang berbeda, dan penanganan blok kode tidak
konsisten (sebagian mengenali dua jenis pagar, sebagian hanya satu).

Pemeriksaan "ukuran diterima pemilik" juga terlalu longgar: baris apa pun yang
memuat kalimat itu, termasuk kalimat yang menyangkalnya, mematikan peringatan
ukuran. Perbaikan ID kembar masih dilakukan dengan tangan, padahal itu
prosedur yang paling rawan salah.

## Request

Setiap pekerjaan yang sama dikerjakan oleh satu fungsi di pustaka bersama,
dan pemeriksaan-pemeriksaan yang terlalu longgar menjadi tepat.

## Done when
- [ ] Penolakan dari worktree, pencarian tiket, penambahan catatan dan pembacaan pengaturan masing-masing hanya punya satu penerapan
- [ ] Hanya ada satu desain kunci
- [ ] Kedua jenis pagar blok kode diperlakukan sama oleh semua skrip
- [ ] Peringatan ukuran hanya dimatikan oleh kalimat persis yang ditulis pilihan terima-ukuran
- [ ] Dua tiket dengan ID kembar bisa diperbaiki dengan satu perintah skrip
- [ ] Semua uji lulus

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:24 todo
- 2026-10-17 05:35:25 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi duplikasi: `new-ticket.sh:63`, `update-ticket.sh:102`, `:128`,
  `:291`, `worktree.sh:75`, `:124`, `queue.sh:53`, `merge.sh:88`,
  `test-run.sh:124`, `:139`, `:290`, `ticket-size.sh:46`, `:68`, `:98`.
  Kunci: `new-ticket.sh:84` vs `lib.sh`. Pagar: `update-ticket.sh:423`,
  `on-ticket-review.sh:142` vs `lib.sh:263`.
- 2026-10-16 14:36:48: files estimated to change: `skills/kerjaan/references/repairs.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/merge.sh`, `skills/kerjaan/scripts/new-ticket.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `skills/kerjaan/scripts/queue.sh`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/scripts/ticket-size.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `skills/kerjaan/scripts/worktree.sh`, `uji/repair.test.mjs`
