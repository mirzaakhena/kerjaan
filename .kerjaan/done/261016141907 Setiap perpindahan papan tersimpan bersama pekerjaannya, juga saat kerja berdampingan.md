---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, skill, git]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 04:30:32
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
- [x] Setelah putusan peninjau, baik lolos maupun dikembalikan, tidak ada perubahan papan yang tertinggal belum tersimpan: peninjau meng-commit sendiri berkas tiketnya
- [x] Panduan pengerja menyebut di mana kode dan di mana berkas tiket di-commit saat kerja berdampingan
- [x] Aturan commit di skill tidak lagi menuntut sesuatu yang mustahil di kerja berdampingan
- [x] Satu tiket yang dikerjakan biasa, dari mulai sampai done, menghasilkan paling banyak tiga commit
- [x] Perpindahan tanpa kode (backlog, todo, cancel) tetap ikut di commit berikutnya

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:23 todo
- 2026-10-17 04:16:07 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 04:28:13 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review
- 2026-10-17 04:30:32 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec done

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
- 2026-10-17: dikerjakan. Pembagian commit yang dipilih, untuk satu tiket di
  main tree: (1) mandor meng-commit mulai (tiket, `order.md`, dan perubahan
  papannya sendiri yang belum tersimpan); (2) pengerja memindah ke review
  lebih dulu, lalu meng-commit kode dan tiket dalam satu commit (sidik
  `test-run.sh` tidak memuat `.kerjaan/`, jadi commit sesudah run tetap
  cocok); (3) peninjau meng-commit putusannya, hanya berkas tiketnya. Semua
  memakai satu bentuk perintah di SKILL.md "Committing":
  `git add -A -- <files> '.kerjaan/*/<id> *'` lalu
  `git commit -m "<message>" -- <files> '.kerjaan/*/<id> *'`; pola itu
  menangkap kedua jalur tiket sesudah pindah folder, dan perubahan orang lain
  (termasuk yang sudah di-stage) tidak ikut. Kerja berdampingan: kode di-commit
  di cabang, berkas tiket di main tree sesudah pindah ke review (perintahnya
  `git -C <main tree> ...`). Perpindahan tanpa kode masuk commit berikutnya
  dari pembuatnya: perencana saat lapor, mandor di commit mulai berikutnya
  atau sebelum ringkasan akhir rantai. Pengerja yang berhenti tanpa memindah
  tiket meng-commit berkas tiketnya saja. `merge.sh` tidak diubah: `land`
  sudah meng-commit catatannya sendiri, dan kini tidak lagi menemukan putusan
  yang belum tersimpan.
- 2026-10-17: uji baru `uji/commit-papan.test.mjs` mengambil perintah git
  langsung dari blok kode di SKILL.md, foreman.md, kerjaan-worker.md dan
  kerjaan-reviewer.md, lalu menjalankannya di repo uji yang juga memuat
  pekerjaan orang lain (berkas yang di-stage dan tiket yang disunting tangan):
  satu tiket biasa = tepat 3 commit dan tidak ada perubahan papan tertinggal;
  tiket yang dikembalikan = putusan tersimpan juga (5 commit untuk dua
  putaran); kerja berdampingan = tidak ada commit cabang yang memuat
  `.kerjaan/`, berkas tiket di-commit sendiri di main, dan `land` menjawab
  `Note committed`, bukan `NOTE NOT COMMITTED`.
- 2026-10-17: sabotase, tiap kali satu, dari salinan lalu dipulihkan dari
  salinan itu: (a) perintah peninjau tanpa pathspec di `git commit` → uji 1, 2
  dan uji dokumen merah (berkas orang lain yang di-stage ikut ter-commit);
  (b) perintah peninjau tanpa `git add` → uji 1, 2, 3 merah; (c) perintah
  pengerja di main tree tanpa pola tiket → uji 1, 2 merah; (d) perintah
  pengerja di worktree tanpa `-C <main tree>` → uji 3 merah; (e) perintah
  mandor tanpa pola tiket lain → uji 1, 2, 3 merah (tiket yang dibatalkan dan
  yang masuk todo tertinggal); (f) SKILL.md kembali menuntut kode dan tiket
  satu commit di worktree → uji dokumen merah; (g) peninjau kembali dilarang
  `commit` → uji dokumen peninjau merah (pertama kali tetap hijau karena
  regex terlalu sempit; regex diperbaiki lalu sabotase diulang dan merah).
- 2026-10-17 04:28:06: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m17s, on content fingerprint 51a462d577534b18d0bd5f7c3f69fb4751d83c5b (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level normal, round 1, at commit 7215c31: passed.
  Pemeriksaan proyek dijalankan sekali (diambil dari run pengerja), uji baru
  dijalankan sendiri, dan tiap kriteria dibaca terhadap perubahannya.
  - Uji penuh tidak diulang: `test-run.sh --check 261016141907` menjawab SAME,
    run pengerja 2026-10-17 04:28:06 (`node --test --test-timeout=900000
    --test-force-exit`, exit 0, sidik 51a462d577534b18d0bd5f7c3f69fb4751d83c5b)
    mencakup isi yang ditinjau.
  - Dijalankan sendiri: `test-run.sh --review 261016141907 -- node --test
    --test-force-exit uji/commit-papan.test.mjs` → 5 lulus, 0 gagal.
  - Pekerjaan langsung di main, tanpa cabang tiket.
  - Kriteria 1 (putusan tersimpan): `agents/kerjaan-reviewer.md` kini memuat
    "Commit your verdict" dengan perintah ber-pathspec; uji 1 dan 2 menjalankan
    perintah itu dari dokumen dan memastikan tidak ada perubahan papan
    tertinggal, baik lolos maupun dikembalikan. Terpenuhi.
  - Kriteria 2 (panduan pengerja saat berdampingan): langkah 9 di
    `agents/kerjaan-worker.md` menyebut kode di cabang dalam worktree dan
    berkas tiket di main tree via `git -C <main tree>`; uji 3 menjalankannya.
    Terpenuhi.
  - Kriteria 3 (tidak menuntut yang mustahil): SKILL.md "Committing" bagian
    "Side by side" menyatakan kode dan tiket tidak bisa satu commit dan memberi
    pembagiannya; parallel-work.md menyesuaikan. Terpenuhi (lihat catatan).
  - Kriteria 4 (paling banyak tiga commit): uji 1 menghitung tepat 3 commit
    dari mulai sampai done; tiket ini sendiri juga 33b66a3, 7215c31, dan
    putusan ini. Terpenuhi.
  - Kriteria 5 (perpindahan tanpa kode): SKILL.md menyebut backlog/todo/cancel
    ikut commit berikutnya pembuatnya; uji 1 memeriksa tiket yang dibatalkan
    dan yang masuk todo ikut di commit mulai mandor. Terpenuhi.
  - Uji `uji/commit-papan.test.mjs` dibaca: menjalankan perintah langsung dari
    blok kode dokumen di repo uji yang memuat pekerjaan orang lain, dan
    memeriksa isi tiap commit; tidak ada asersi kosong.
  - `explain.sh` tidak ada di repo ini dan `owner_explanation` tidak diatur;
    langkah penjelasan pemilik tidak berlaku. Repo tidak punya CLAUDE.md atau
    AGENTS.md.
  - Catatan, tidak memblokir: SKILL.md "Committing" kalimat pembuka masih
    berbunyi umum "its files under `.kerjaan/` go in the same commit" sebelum
    pengecualian "Side by side" beberapa paragraf di bawahnya; menambahkan "in
    the main tree" di kalimat itu akan menghilangkan kesan bertentangan.
