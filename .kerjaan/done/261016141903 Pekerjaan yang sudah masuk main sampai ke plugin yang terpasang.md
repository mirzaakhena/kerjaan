---
type: task
priority: high
review:
labels: [sesi-a192c9e8, release]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 16:28:05
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
- [x] Versi plugin dinaikkan melewati 1.12.0, dengan catatan rilis yang menyebut tiket-tiket yang belum ikut rilis sebelumnya
- [ ] Setelah plugin diperbarui, sesi baru menolak grup antrean yang tidak menyebut urutan penggabungan (perilaku tiket 261016122402) — menunggu mirza: skenario tangan di Notes
- [x] Saat papan kosong, mandor menyebut tiket selesai yang belum ikut rilis mana pun dan menawarkan rilis
- [x] Panduan rilis di README menjelaskan kapan versi harus dinaikkan

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:20 todo
- 2026-10-16 16:10:31 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-16 16:26:54 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review
- 2026-10-16 16:28:05 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec done

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
- 2026-10-16 16:22:45: dikerjakan. Rilis 1.13.0: `.claude-plugin/plugin.json` naik dari 1.12.0 ke 1.13.0 (`marketplace.json` tidak memuat versi, jadi tetap). Catatan rilis ada di pesan commit `Release 1.13.0`, seperti rilis sebelumnya, dan menyebut ID setiap tiket yang dibawanya: 261011073102, 261016105301, 261016122401, 261016122402, 261016125401, 261016130801, 261016141901, 261016141902 (termasuk pengaturan `lock_timeout` dan `test_lock_timeout`), 261016144601, 261016141903, dan 261016141916 sebagai keputusan papan tanpa kode. 261016105301 tidak ada di daftar carry-forward, tetapi skrip baru menemukannya: tiket itu masih di todo saat commit 1.12.0 dibuat.
- 2026-10-16 16:22:45: pengingat rilis. Skrip baru `skills/kerjaan/scripts/release.sh unreleased` mencari rilis terakhir (tag terbaru, atau commit terakhir yang mengubah baris versi di `.claude-plugin/plugin.json`, `package.json`, `pyproject.toml` atau `Cargo.toml`; yang paling baru menang), lalu menyebut tiket di done/ yang tidak ikut rilis itu: belum ada di done/ pada commit rilis dan ID-nya tidak disebut di pesan commit rilis. Tiket yang commit-nya tidak mengubah apa pun di luar `.kerjaan/` ditandai `(board only)`. Proyek tanpa tanda rilis mendapat `NO RELEASE`, sehingga mandor di proyek lain tidak diganggu. SKILL.md, "When the board goes quiet", langkah 2: mandor menjalankannya, menyebut tiketnya kepada pemilik dan menawarkan rilis; rilis yang disetujui menjadi tiket biasa lewat pengerja. Diuji di repo ini sebelum rilis: LAST RELEASE 26581c8 Release 1.12.0, UNRELEASED: 10, 261016141916 bertanda (board only). README mendapat bagian "Releasing a new version" (kapan versi naik, patch/minor/major, cara membuat commit rilis, push dan /plugin update oleh pemilik) dan satu baris di Usage. foreman.md tidak diubah: langkah itu sudah dirujuk dari "The summary" lewat SKILL.md.
- 2026-10-16 16:22:45: uji yang dibuktikan bisa merah (uji/release.test.mjs, 14 uji; file disalin lalu dipulihkan dari salinan). Yang dirusak, dan yang merah: pengecekan done/ pada commit rilis dihapus (7 uji merah); ID di pesan rilis diabaikan (1); batas angka 12 digit dihapus (1, uji angka yang lebih panjang); pemilihan rilis terbaru diganti kandidat pertama (1); syarat baris versi (-G) dihapus (1, uji perubahan manifest tanpa ganti versi); tanda board only dihapus (10); `|| true` setelah pencarian ID dihapus (2 — kesalahan ini sempat benar-benar ada: skrip keluar diam-diam bila rilis tidak menyebut ID apa pun, ditemukan oleh uji); tiap manifest diganti nama satu per satu: plugin.json (5), package.json (3), pyproject.toml (1), Cargo.toml (1), pola versi toml (1); tag diabaikan (2); penolakan worktree tertaut dimatikan (1); jalur NO RELEASE dimatikan (1); membaca semua folder, bukan hanya done/ (1); pengecekan argumen dilonggarkan (1). Semua kembali hijau setelah dipulihkan.
- 2026-10-16 16:22:45: skenario tangan untuk butir 2 (menunggu mirza, sesudah push dan /plugin update):
  1. Push main ke GitHub, jalankan `/plugin update kerjaan` di Claude Code, lalu tutup sesi dan buka sesi baru.
  2. Di terminal: `cat ~/.claude/plugins/installed_plugins.json | grep -A3 kerjaan@kerjaan` — `version` harus `1.13.0` dan `installPath` berakhir dengan `/1.13.0`.
  3. `K=~/.claude/plugins/cache/kerjaan/kerjaan/1.13.0/skills/kerjaan/scripts`, lalu buat papan coba: `mkdir -p /tmp/coba-rilis && cd /tmp/coba-rilis && git init -q && mkdir -p .kerjaan/{backlog,todo,in_progress,review,done,cancel} && git commit -q --allow-empty -m awal`.
  4. `$K/new-ticket.sh todo "Tiket satu"` dan `$K/new-ticket.sh todo "Tiket dua"`; catat kedua ID yang tercetak (sebut A dan B). Abaikan catatan bahwa settings.md belum ada.
  5. `$K/queue.sh estimate A a.js` dan `$K/queue.sh estimate B a.js` (ganti A dan B dengan ID-nya).
  6. Tulis `.kerjaan/order.md` berisi satu grup: baris `**Dua tiket bersamaan.** A dan B sama-sama mengubah a.js.`, baris kosong, lalu `- A Tiket satu` dan `- B Tiket dua`.
  7. `$K/queue.sh check` harus berakhir dengan `NOT READY: 1 problem(s) above.`, dengan baris `A and B share a group and the files a.js; its lead-in names both but not which lands first`.
  8. Tambahkan `; A digabung lebih dulu` di akhir kalimat pengantar, jalankan lagi `$K/queue.sh check`: hasilnya `READY`.
  (Langkah 3–8 sudah dicoba dengan skrip repo ini, yang sama dengan isi 1.13.0; yang belum terbukti hanyalah bahwa salinan terpasang sudah 1.13.0.)
- 2026-10-16 16:26:39: test run — `node --test` exited 0 after 3m48s, on content fingerprint a9613c28b26e242a65790e74114c118c643ced2d (the same before and after the run; .kerjaan/ left out).
- 2026-10-16: Reviewed at level quick (kolom `review:` kosong, jadi quick), round 1, at commit d5ede10: uji proyek tidak dijalankan ulang karena hasil pengerja terbawa, dan perubahan dibaca terhadap tiap butir Done when.
  - Uji: `test-run.sh --check 261016141903 HEAD` menjawab SAME — `node --test` exit 0 pada 2026-10-16 16:26:39, fingerprint a9613c28b26e242a65790e74114c118c643ced2d. Dihitung sebagai satu-satunya jalankan penuh untuk review ini; tidak dijalankan lagi.
  - `explain.sh check`: belum ada penjelasan (owner_explanation: off). Repo ini tidak punya CLAUDE.md atau AGENTS.md, jadi tidak ada aturan proyek tertulis yang diterapkan.
  - Butir 1, terpenuhi: `.claude-plugin/plugin.json` naik 1.12.0 → 1.13.0 di 020ebaa. Diperiksa dengan git: setiap ID di done/ pada HEAD yang belum ada di done/ pada commit 1.12.0 (26581c8), sepuluh tiket, disebut di pesan commit `Release 1.13.0`, ditambah tiket ini sendiri. `release.sh unreleased` sekarang menjawab `LAST RELEASE: 020ebaa Release 1.13.0` dan `UNRELEASED: none`.
  - Butir 2, menunggu mirza: keputusan pemilik tercatat di Notes (2026-10-16 14:45:45), dan skenario tangannya berupa langkah yang bisa diikuti dengan hasil yang harus terlihat (`NOT READY` lalu `READY`). Butir ini memang butuh orang: yang belum terbukti hanyalah salinan plugin terpasang sesudah push dan /plugin update. Bukan alasan menolak.
  - Butir 3, terpenuhi menurut bacaan: SKILL.md, "When the board goes quiet", langkah 2 menjalankan `release.sh unreleased`, menyebut tiket yang tidak bertanda `(board only)` kepada pemilik dan menawarkan rilis; foreman.md sudah merujuk bagian itu. Skrip dibaca dan dijalankan sekali di repo ini (keluaran di atas).
  - Butir 4, terpenuhi: README mendapat bagian "Releasing a new version" (kapan versi naik, patch/minor/major, cara membuat commit rilis, push dan /plugin update oleh pemilik) dan satu baris di Usage.
  - Catatan, tidak memblokir: README mengatakan tiket yang hanya mengubah `uji/` tidak butuh rilis, tetapi skrip hanya menandai tiket yang hanya mengubah `.kerjaan/`; tiket yang hanya mengubah uji akan tetap terdaftar tanpa tanda, sehingga mandor bisa menawarkan rilis yang sebenarnya tidak perlu.
  - Dinilai hanya dengan membaca: butir 3 (perilaku mandor saat papan sepi adalah instruksi di SKILL.md, tidak bisa dijalankan); keabsahan 14 uji di `uji/release.test.mjs` tidak diperiksa pada level quick.

### Suggested follow-up

- **`release.sh unreleased` tidak membedakan tiket yang hanya mengubah uji.** README menyebut tiket yang hanya mengubah `uji/` (atau `.kerjaan/`) tidak butuh rilis, tetapi skrip hanya menandai `(board only)`. Akibatnya mandor bisa menawarkan rilis untuk pekerjaan yang tidak mengubah apa pun yang dipasang. Hasil yang diinginkan: tiket yang tidak mengubah apa pun yang dikirim plugin diberi tanda sendiri dan tidak memicu tawaran rilis, atau README disesuaikan dengan perilaku skrip.
