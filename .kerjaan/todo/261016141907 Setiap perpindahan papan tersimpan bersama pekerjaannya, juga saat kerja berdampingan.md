---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, skill, git]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:46:23
related: [261016130801]
blocked_by: []
---

## Background

Aturan skill mengatakan perubahan papan disimpan (di-commit) bersama
pekerjaannya. Ada tiga celah:

- Putusan peninjau untuk tiket yang dikerjakan langsung di main tidak
  di-commit oleh siapa pun. Peninjau dilarang commit, pengerja berikutnya hanya
  meng-commit tiketnya sendiri, dan mandor hanya commit setelah penggabungan.
- Saat kerja berdampingan, folder papan tidak ikut di worktree, sehingga
  "satu commit bersama kode" mustahil. Pengerja juga tidak diberi tahu di mana
  berkas tiketnya harus di-commit.
- Di sisi lain, sekitar separuh riwayat git repo ini (60 dari 123 commit)
  adalah commit papan saja. Satu tiket menghasilkan 4 sampai 6 commit, dan
  langkah pencatatan terpisah sudah pernah menimbulkan bug sendiri
  (261016130801).

## How to reproduce

1. Kerjakan satu tiket langsung di main sampai peninjau memindahkannya ke done
2. Jalankan `git status`

Berkas tiket di done dan catatan peninjau tercantum sebagai perubahan yang
belum di-commit, dan tidak ada langkah di panduan mana pun yang
meng-commit-nya.

## Request

Tidak ada perubahan papan yang tertinggal tanpa disimpan, baik saat kerja
biasa maupun berdampingan, dan riwayat git satu tiket jauh lebih ringkas.

## Done when
- [ ] Setelah putusan peninjau, baik lolos maupun dikembalikan, tidak ada perubahan papan yang tertinggal belum tersimpan: peninjau meng-commit sendiri berkas tiketnya
- [ ] Panduan pengerja menyebut di mana kode dan di mana berkas tiket di-commit saat kerja berdampingan
- [ ] Aturan commit di skill tidak lagi menuntut sesuatu yang mustahil di kerja berdampingan
- [ ] Satu tiket yang dikerjakan biasa, dari mulai sampai done, menghasilkan paling banyak tiga commit
- [ ] Perpindahan tanpa kode (backlog, todo, cancel) tetap ikut di commit berikutnya

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:23 todo

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: SKILL.md:694-706; `agents/kerjaan-reviewer.md:472-474`;
  `agents/kerjaan-worker.md:108-112`; `foreman.md:192-195`, `:213`;
  `parallel-work.md:63`, `:100-103`; `explanation.md:60-62` (ikut hilang
  bersama 261016141904).
- 2026-10-16 14:36:47: files estimated to change: `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/merge.sh`, `uji/merge.test.mjs`
- 2026-10-16 14:38:08: answered question: Siapa yang menyimpan (commit) putusan peninjau untuk tiket yang dikerjakan di main: (a) peninjau sendiri, khusus berkas tiketnya; (b) mandor tepat setelah setiap putusan; (c) skrip pemindah tiket otomatis? Saran: (a), karena peninjau yang terakhir menyentuh berkas itu, dan langkah yang bergantung pada mandor ingat adalah celah yang sama dengan 261016141913.
  answer, 2026-10-16 14:45:46: (a) Peninjau meng-commit sendiri putusannya, hanya berkas tiketnya.
