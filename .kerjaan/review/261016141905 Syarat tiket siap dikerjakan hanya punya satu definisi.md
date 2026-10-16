---
type: task
priority: high
review:
labels: [sesi-a192c9e8, skill, queue]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 04:02:54
related: [261016141909]
blocked_by: []
---

## Background

Aturan kapan sebuah tiket siap masuk todo tertulis di beberapa tempat dan
isinya tidak sama.

Skill menulis "keempat syarat harus terpenuhi" lalu mendaftar enam butir.
Penyusun antrean menyebut "empat syarat" dan hanya mendaftar empat. Skill juga
mensyaratkan setiap tiket penghalang sudah selesai, padahal penyusun antrean
dan panduan urutan sengaja menaruh penghalang di grup yang lebih awal dalam
todo yang sama. Mandor yang mengikuti skill akan menganggap setiap batch dari
penyusun antrean bermasalah.

Pertanyaan untuk pemilik juga punya dua bentuk. Penyusun antrean memberinya
nomor sehingga terlihat oleh pemeriksaan antrean, sedangkan pengerja
menuliskannya bebas di Notes sehingga tidak terlihat. Selain itu, saran level
review tidak punya pemilik yang jelas: tugas itu diberikan kepada mandor, yang
justru tidak pernah membaca kodenya.

## Request

Ada satu definisi tiket siap dikerjakan, yang sama di semua tempat dan sama
dengan yang diperiksa skrip, dan semua pertanyaan untuk pemilik memakai satu
bentuk.

## Done when
- [x] Skill dan penyusun antrean menyebut jumlah syarat yang sama dengan daftar yang sama
- [x] Tiket yang penghalangnya berada di grup lebih awal dalam todo yang sama dianggap siap, baik oleh skill, penyusun antrean, maupun pemeriksaan antrean
- [x] Panduan menunjuk pemeriksaan antrean sebagai satu-satunya acuan syarat siap, bukan menyalin daftarnya
- [x] Pertanyaan yang muncul saat pengerjaan dicatat pengerja dengan nomor seperti pertanyaan penyusun antrean, dan terlihat oleh pemeriksaan antrean
- [x] Usulan level review untuk setiap tiket datang dari penyusun antrean dalam laporannya, lalu disampaikan mandor kepada pemilik
- [x] Tiket keputusan yang tidak mengubah berkas proyek apa pun (seperti 261016141916) bisa dinyatakan siap oleh pemeriksaan antrean, tanpa perkiraan berkas palsu

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:22 todo
- 2026-10-17 03:21:10 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 04:02:54 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: SKILL.md:424-442 ("All four must hold" + 6 butir) dan :426-428,
  :459-460; `agents/kerjaan-planner.md:54-57`; `ordering-the-queue.md:26-28`,
  `:56-57`; `agents/kerjaan-worker.md:43-45`; `foreman.md:73`, `:109-120`;
  `review.md:28-29`.
- 2026-10-16 14:36:46: files estimated to change: `agents/kerjaan-planner.md`, `agents/kerjaan-worker.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/references/review.md`, `skills/kerjaan/scripts/queue.sh`, `uji/queue.test.mjs`
- Keputusan pemilik, 2026-10-16: celah tiket keputusan (261016141916 tidak bisa diberi perkiraan berkas sehingga tidak pernah lolos pemeriksaan antrean) ditambahkan ke tiket ini sebagai butir Done when.
- Hasil pengerjaan (pengerja, 2026-10-17):
  - Satu definisi: lima syarat di SKILL.md "Into `todo`" (`type`/`priority`
    terisi; tak ada pertanyaan terbuka — penilaian seperti `Done when` yang
    tak bisa dicek orang awam masuk lewat pertanyaan; ukuran; perkiraan berkas
    atau `--none`; penghalang selesai atau berada di depan). `queue.sh check`
    menguji persis kelima itu (ditambah pemeriksaan `type` dan `priority`).
    Penyusun antrean menyebut "the five conditions of SKILL.md" tanpa
    menyalin; ordering-the-queue.md, foreman.md, README menunjuk ke
    `queue.sh check`.
  - Penghalang di grup lebih awal dalam todo: siap, baik per ID maupun
    seluruh todo. Baru: tanpa order.md, tiket todo yang menunggu tiket todo
    lain dinyatakan tidak siap (tak ada yang menaruh penghalangnya di depan).
  - Pertanyaan pengerja lewat `queue.sh ask` (agents/kerjaan-worker.md);
    `queue.sh check` tanpa ID kini juga menampilkan pertanyaan terbuka di
    tiket `in_progress`/`review`, bernomor, tanpa dihitung sebagai masalah todo.
    Mandor menjawabnya dengan `queue.sh answer`.
  - Level review: langkah 7 penyusun antrean + baris `Review levels:` di
    laporannya; mandor menyampaikannya tanpa usulan sendiri (foreman.md,
    review.md, SKILL.md); jawaban pemilik ditulis penyusun ke `review:`.
  - Tiket keputusan: `queue.sh estimate <id> --none` (baris tetap
    `files estimated to change: none`); `check` menyatakannya siap, `overlap`
    tidak memasangkannya, `compare` menaruh semua berkas yang berubah di
    "Changed, not estimated". Dicoba pada salinan 261016141916 di repo
    sementara: NOT READY sebelum, READY sesudah `--none`, lalu masuk todo.
  - Uji bisa merah (laporan, bukan bukti): tiap penjaga dirusak satu per satu
    dari salinan berkas, `node --test uji/queue.test.mjs`, lalu dipulihkan.
    Merah semua: pemeriksaan type/priority, `kerjaan_estimate_kind` di check,
    penolakan `--none` bersama path (dua tempat), penghalang todo tanpa
    order.md, tampilan pertanyaan in-flight, sentinel compare, overlap diam
    untuk none, `$0 == "none"` di lib.sh (3 uji), tampilan estimate none,
    compare none tidak keluar 1; serta dokumen: "All five"→"four" di SKILL.md,
    "five"→"four" di penyusun, langkah tanya pengerja, baris `Review levels:`.
- 2026-10-17 04:02:45: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m22s, on content fingerprint 4fd097b5cb1fa4d8cc3b0d8d08564d681ccbf94e (the same before and after the run; .kerjaan/ left out).
