---
type: feature
priority: high
review: normal
labels: [paralel, mandor, uji]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:10:01
updated: 2026-10-16 11:21:19
related: [261016095101, 261016101002]
blocked_by: []
---

## Background
Ketika dua tiket dikerjakan bersamaan di salinan kerja repo yang terpisah
(*worktree*), masing-masing diuji dan diperiksa reviewer secara sendiri-sendiri.
Penggabungan ke jalur utama proyek (*main*) baru dilakukan setelah tiket
selesai, dan sesudah digabung uji tidak dijalankan lagi.

Akibatnya, hasil gabungan dua pekerjaan itu tidak pernah diuji. Dua perubahan
bisa tampak baik saat berdiri sendiri, tetapi rusak ketika digabung. Contohnya,
tiket pertama mengganti nama sesuatu, sedangkan tiket kedua masih memakai nama
lama. Git bisa menggabungkan keduanya tanpa keluhan, padahal hasilnya rusak.

## Request
Tidak ada hasil kerja paralel yang masuk ke main sebelum diuji dalam keadaan
sudah tergabung dengan semua yang sudah ada di main.

- Tiket yang selesai lebih dulu masuk ke main tanpa uji ulang, bila terbukti
  main belum berubah sejak tiket itu diuji.
- Tiket berikutnya disesuaikan dulu dengan main terbaru oleh agen yang
  mengerjakannya, di salinan kerjanya sendiri. Bila ada tabrakan, agen itu yang
  menyelesaikannya, lalu menjalankan uji. Baru setelah itu tiket masuk review,
  sehingga reviewer menilai persis apa yang nanti masuk ke main.
- Bila main berubah lagi saat tiket sudah di review, tiket dikembalikan untuk
  disesuaikan ulang. Bila penyesuaian itu mengubah kode, reviewer memeriksa
  ulang secara singkat, hanya bagian penyelesaian tabrakannya.
- Tiket yang sudah lolos review dan lolos uji dalam keadaan tergabung langsung
  digabung ke main tanpa menunggu persetujuan pemilik. Penggabungan dilakukan
  satu per satu. Pemilik hanya ditanya bila ada masalah.
- Bila penggabungan otomatis sebuah tiket gagal, hanya tiket itu yang ditahan
  menunggu pemilik. Tiket lain yang tidak bergantung padanya tetap berjalan.

## Done when
- [x] Dua tiket yang dikerjakan bersamaan dan mengubah bagian yang sama berakhir di main dengan uji lulus, tanpa campur tangan pemilik
- [x] Tiket yang masuk review selalu sudah berada di atas main terbaru, dan catatan ujinya membuktikan uji dijalankan pada keadaan tergabung itu
- [x] Tiket pertama yang digabung ke main tanpa perubahan di main tidak menjalankan uji untuk kedua kalinya
- [x] Penggabungan yang lolos tanpa tabrakan teks tetapi membuat uji gagal tidak pernah masuk ke main
- [x] Bila tiket disesuaikan ulang setelah review dan kodenya berubah, reviewer memeriksa ulang bagian itu sebelum tiket digabung
- [x] Dua penggabungan ke main tidak pernah berjalan berbarengan
- [x] Pemilik diberi tahu bila penggabungan otomatis gagal, beserta tiket dan alasannya; hanya tiket itu yang ditahan, dan tiket lain yang tidak bergantung padanya tetap berjalan
- [x] Uji yang dijalankan reviewer ikut antre di kunci uji yang sama dengan uji pengerja, sehingga keduanya tidak pernah berjalan berbarengan

## History
- 2026-10-16 10:10:01 backlog
- 2026-10-16 10:24:38 todo
- 2026-10-16 10:56:12 in_progress
- 2026-10-16 11:21:19 review

## Notes
- 2026-10-16 Keputusan pemilik dalam diskusi kerja paralel: penyesuaian ke
  main dilakukan sebelum review; penyelesaian tabrakan diperiksa ulang dengan
  level `quick`; penggabungan ke main otomatis bila uji lulus, bergiliran.
  Ini mengubah aturan sekarang bahwa penggabungan menunggu persetujuan pemilik.
- 2026-10-16 Keputusan mirza sebelum rantai dimulai: dikerjakan berurutan (101002, 101001, 095101) karena ketiganya mengubah panduan yang sama; review `normal`; tidak ada pemeriksaan yang hanya bisa dilakukan manusia; setelah ketiganya done, mandor merilis 1.12.0.
- 2026-10-16 Keputusan mirza: bila penggabungan otomatis gagal, hanya tiket itu yang menunggu pemilik; antrean tidak berhenti total.
- 2026-10-16 Tambahan dari mandor, berasal dari tindak lanjut review 261016101002: reviewer masih menjalankan uji di luar kunci uji, sehingga ujinya bisa bertabrakan dengan uji pengerja di salinan lain. Kunci dan slot tersedia di skills/kerjaan/scripts/lib.sh; nama kunci lain (misalnya `merge`) bisa dipakai untuk penggabungan berurutan.
- 2026-10-16 Laporan pengerja (klaim, bukan bukti). Yang dibangun:
  - `skills/kerjaan/scripts/merge.sh`, skrip baru dengan empat perintah.
    `sync <id>` dijalankan pengerja di worktree-nya: menggabungkan main ke
    cabang tiket; bila bertabrakan, berhenti dan menyebut berkasnya.
    `check <id>` menjawab READY / STALE (kode main berubah sejak cabang
    terakhir mengambilnya) / UNTESTED (uji terakhir tidak menguji isi cabang
    yang di-commit, atau gagal). `land <id>` dijalankan mandor dari main tree
    untuk tiket di done/: di bawah kunci `merge`, menggabungkan cabang ke main
    tanpa menjalankan uji lagi, lalu menghapus worktree dan cabangnya.
    `resolution <id>` menampilkan apa yang diubah pengerja di luar gabungan
    otomatis sejak review sebelumnya (penyelesaian tabrakan), untuk review
    ulang singkat.
  - "Main" adalah cabang yang sedang dipakai main tree. Commit yang hanya
    menyentuh `.kerjaan/` tidak dihitung sebagai main berubah, karena papan
    di-commit ke main terus-menerus.
  - `update-ticket.sh`: pindah ke review menolak cabang yang belum memuat semua
    kode main atau yang uji terakhirnya tidak menguji persis isi cabang itu;
    bila lolos, commit yang masuk review dicatat di Notes ("review covers
    branch ... at ..."). `land` hanya menggabungkan commit itu; cabang yang
    berubah sesudahnya dikembalikan.
  - `land` punya tiga jawaban. LANDED. SENT BACK (exit 3): main berubah,
    atau cabang berubah setelah review; tiket dipindah sendiri ke in_progress,
    tanpa pemilik. HELD (exit 1): penggabungan gagal karena sebab lain (git
    menolak, catatan uji tidak lagi menjamin, dsb.); alasannya ditulis di
    Notes sebagai "merge held for the owner — <alasan>", tiket tetap di done/.
    Tepat sebelum commit, isi hasil gabungan dibandingkan sekali lagi dengan
    isi yang diuji, untuk menangkap main yang berubah di tengah penggabungan.
  - Gerbang mulai di `update-ticket.sh`: cabang yang penggabungannya ditahan
    tidak menghalangi tiket lain mulai (hanya disebut); tiket yang
    `blocked_by` tiket yang ditahan ditolak. Tiket yang kembali dari review
    atau done tidak lagi dihitung "mulai", jadi tidak ditolak karena cabang
    lain — tanpa ini, `land` tidak bisa mengembalikan tiket ke in_progress
    selama ada cabang lain yang belum digabung, dan reviewer pun tidak bisa
    menolak tiket.
  - `test-run.sh --review <id> [--dir <path>] [-- <perintah>]`: uji reviewer
    ikut antre di kunci `tests` yang sama, tidak mencatat apa pun di tiket.
  - Panduan: `references/parallel-work.md` (bagian baru "Back into main:
    tested together, merged one at a time"), `references/foreman.md` (langkah
    6: LANDED / SENT BACK / HELD; SENT BACK bukan penolakan dan tidak dihitung
    sebagai putaran), `references/review.md`, `SKILL.md`, `SETTINGS.md`,
    `README.md`, `agents/kerjaan-worker.md` (sync sebelum uji terakhir;
    bagian baru "When you are resumed because main moved"),
    `agents/kerjaan-reviewer.md` (semua uji lewat `test-run.sh --review`;
    putaran setelah main berubah dinilai `quick`, hanya dari
    `merge.sh resolution`).
  - Uji: `uji/merge.test.mjs`, 17 uji pada repo sementara dengan "program"
    kecil (kode.txt mendefinisikan nama, pakai*.txt memakainya, cek.sh gagal
    bila nama dipakai tanpa definisi).
- 2026-10-16 Laporan pengerja: penjaga yang sengaja dirusak (berkas disalin
  dulu, dipulihkan dari salinan), dan uji yang menjadi merah:
  - `check`: deteksi STALE dimatikan → "ke review hanya bila ..." merah.
    Pemeriksaan uji (UNTESTED) dimatikan → "ke review hanya bila ..." dan
    "penggabungan tanpa tabrakan teks ..." merah.
  - `update-ticket.sh`: panggilan `merge.sh check` di gerbang review dibuang →
    dua uji yang sama merah. Catatan "review covers" tidak ditulis → "ke
    review hanya bila ..." dan "cabang yang berubah setelah masuk review ..."
    merah.
  - `land`: deteksi main berubah dimatikan → "dua tiket yang mengubah baris
    yang sama ..." merah. Perbandingan commit yang direview dengan ujung
    cabang dimatikan → "cabang yang berubah setelah masuk review ..." merah.
    Penahanan bila catatan review tidak ada dimatikan → "tanpa catatan commit
    ..." merah. Pemeriksaan catatan uji dimatikan → "uji terakhir yang gagal
    ..." merah. Perbandingan isi tepat sebelum commit dimatikan → "main yang
    berubah di tengah penggabungan ..." merah (uji ini memakai git tiruan
    yang membuat commit ke main tepat sebelum `git merge` milik land). Kunci
    `merge` dibuang → "penggabungan menunggu kunci merge" dan "dua
    penggabungan yang dimulai bersamaan ..." merah. Syarat done/ dan syarat
    main tree dimatikan → "hanya tiket di done ..." merah. Penahanan saat git
    menolak diganti keluar 0 → "penggabungan yang gagal menahan hanya tiket
    itu ..." merah.
  - Gerbang mulai: pengecualian cabang yang ditahan, penolakan `blocked_by`
    yang ditahan, dan pembacaan status "held" di lib.sh masing-masing
    dimatikan → "penggabungan yang gagal menahan hanya tiket itu ..." merah.
    Pengecualian tiket yang kembali dari review/done dibuang → "tiket yang
    kembali dari review atau done ..." merah.
  - `test-run.sh --review`: kunci `tests` dibuang → "uji reviewer ikut antre
    ..." merah; dibiarkan mencatat ke tiket → uji yang sama merah.
  - `sync`: tiga penolakan (dari main tree, dari worktree tiket lain, dengan
    perubahan belum di-commit) masing-masing dimatikan → "sync hanya berjalan
    ..." merah. `resolution` tanpa gabungan otomatis → dua uji resolution
    merah.
- 2026-10-16 Catatan pengerja: butir 5 dan 8 sebagian berupa perilaku agen
  reviewer. Mekanismenya diuji (tiket yang main-nya berubah selalu kembali ke
  in_progress sehingga hanya bisa ke done lewat reviewer; `merge.sh
  resolution` menampilkan bagian penyelesaian tabrakan; `test-run.sh --review`
  antre di kunci yang sama). Bahwa agen reviewer benar-benar memakai keduanya
  hanya bisa dinilai dengan membaca `agents/kerjaan-reviewer.md`.
- 2026-10-16 Catatan pengerja (tidak menahan pekerjaan): versi git di mesin
  ini 2.33, tanpa `git merge-tree --write-tree`, sehingga `resolution`
  menghitung gabungan otomatis di klon sementara yang meminjam objek repo
  (`git clone --shared`), dan tidak mengubah apa pun di repo.
- 2026-10-16 11:21:05: test run — `node --test` exited 0 after 1m10s, on content fingerprint 1ed6260656f8926e9b32ab1b262a167c45f29df4 (the same before and after the run; .kerjaan/ left out).
