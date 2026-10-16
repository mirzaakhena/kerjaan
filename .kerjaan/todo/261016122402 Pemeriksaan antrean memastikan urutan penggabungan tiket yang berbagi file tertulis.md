---
type: feature
priority: low
review:
labels: [paralel, antrean]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:24:02
updated: 2026-10-16 12:38:09
related: [261016095101]
blocked_by: []
---

## Background
Tiket yang mengubah file yang sama boleh dikerjakan bersamaan, asalkan file
urutan antrean menyebut kedua tiket itu, file yang mereka bagi, dan tiket mana
yang digabung ke jalur utama proyek lebih dulu.

Pemeriksaan antrean saat ini hanya memastikan kedua tiket disebut dalam
kalimat pengantar grupnya. Bila urutan penggabungannya tidak ditulis,
pemeriksaan tetap menyatakan antrean siap. Panduannya meminta urutan itu
ditulis, tetapi tidak ada yang memeriksanya.

## Request
Pemeriksaan antrean menolak grup yang berisi tiket-tiket yang berbagi file
bila urutan penggabungannya tidak tertulis.

## Done when
- [ ] Grup berisi dua tiket yang berbagi file, yang pengantarnya menyebut kedua tiket tetapi tidak menyebut mana yang digabung lebih dulu, dinyatakan belum siap beserta alasannya
- [ ] Grup yang sama, setelah pengantarnya menyebut tiket mana yang digabung lebih dulu, dinyatakan siap
- [ ] Panduan urutan antrean menjelaskan cara menuliskan urutan penggabungan sehingga pemeriksaan bisa mengenalinya

## History
- 2026-10-16 12:24:02 backlog
- 2026-10-16 12:38:09 todo

## Notes
- 2026-10-16 Berasal dari catatan reviewer 261016095101.
- 2026-10-16 12:38:09: files estimated to change: `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/scripts/queue.sh`, `uji/queue.test.mjs`
