---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, scripts, parallel]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 16:06:59
related: [261016141914, 261016141915]
blocked_by: []
---

## Background

Saat dua tiket dikerjakan berdampingan, dua pengerja bisa memindahkan
tiketnya masing-masing pada saat yang hampir bersamaan. Setiap perpindahan
membaca berkas urutan antrean dan berkas tiket, mengubahnya, lalu menulisnya
kembali. Karena tidak ada giliran, perubahan dari satu pengerja bisa tertimpa
perubahan dari pengerja lain tanpa ada yang tahu. Contohnya, baris sebuah tiket
yang sudah dimulai masih tertinggal di daftar urutan.

Hal yang sama berlaku untuk pencatatan hasil uji dari sebuah worktree ke tiket
di folder utama. Di sisi lain, giliran yang sudah ada untuk uji tidak punya
batas waktu: uji yang macet membuat semua pengerja lain ikut menunggu tanpa
pesan yang jelas.

## How to reproduce

1. Siapkan dua tiket di todo dalam satu grup daftar urutan
2. Jalankan perintah pindah ke in_progress untuk keduanya pada saat yang sama
   (dua terminal, atau dua proses latar belakang)
3. Ulangi beberapa kali, lalu buka daftar urutan

Sesekali salah satu tiket masih tercantum di daftar urutan walaupun sudah
berada di in_progress.

## Request

Perubahan papan dari beberapa pengerja yang berjalan bersamaan tidak pernah
saling menimpa, dan menunggu giliran yang terlalu lama berakhir dengan pesan
yang jelas.

## Done when
- [x] Dua tiket dari grup yang sama dimulai bersamaan berulang kali, dan setiap kali keduanya hilang dari daftar urutan
- [x] Hasil uji dua worktree yang selesai bersamaan sama-sama tercatat di tiketnya masing-masing
- [x] Giliran yang ditunggu lebih lama dari batas waktu berakhir dengan pesan yang menyebut siapa yang memegangnya
- [x] Batas waktu itu bisa diatur, dan nilai bawaannya tertulis di panduan
- [x] Ada uji otomatis yang menjalankan perpindahan bersamaan

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:20 todo
- 2026-10-16 15:46:25 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Temuan teknis: `update-ticket.sh` menulis ulang berkas (baris ~451 dan
  ~530) tanpa kunci; `test-run.sh:290-297` juga. `lib.sh` sudah punya
  `kerjaan_lock_acquire` yang bekerja lintas worktree; kunci itu yang
  sebaiknya dipakai. Kunci di `lib.sh:90` tidak punya batas waktu.
- 2026-10-16 14:36:45: files estimated to change: `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `uji/test-run.test.mjs`, `uji/update-ticket.test.mjs`
- 2026-10-16 16:02:00: dikerjakan. Ringkasan:
  - `lib.sh`: kunci bernama `board` dipakai setiap penulisan papan
    (`kerjaan_board_lock`, `kerjaan_board_lock_try`). `kerjaan_lock_acquire`
    kini menerima batas waktu: lewat batas, ia berhenti dengan pesan yang
    menyebut pemegang kunci dan PID-nya. Kunci bisa dipakai bersama oleh proses
    anak lewat `KERJAAN_HELD_LOCKS` (baris `<folder kunci>=<pid>`), hanya bila
    kunci itu masih dipegang PID yang disebut dan PID itu masih hidup — tanpa
    ini test-run.sh yang memanggil update-ticket.sh akan menunggu dirinya
    sendiri. Folder kunci kini dihitung dengan `pwd -P` agar sama dari main
    tree dan dari worktree; papan di luar git memakai `.kerjaan/.locks`.
  - Yang memegang kunci papan: seluruh `update-ticket.sh` (dari mencari tiket
    sampai tulisan terakhir, termasuk order.md), catatan hasil `test-run.sh`
    beserta penyegaran `updated` (tiket dicari ulang di dalam kunci),
    ketiga catatan `merge.sh land` (landed, postponed, held), dan
    `queue.sh estimate|ask|answer`. `new-ticket.sh` tetap dengan kuncinya
    sendiri (penyatuan milik 261016141914).
  - Pengaturan baru: `lock_timeout` (kunci papan, bawaan 120 detik) dan
    `test_lock_timeout` (kunci uji, bawaan 3600 detik). `0` = tanpa batas.
    Tertulis di `SETTINGS.md` dan `references/parallel-work.md` (bagian baru
    "Changes to the board take turns too"). Dua angka, bukan satu: giliran
    papan berlangsung kurang dari sedetik, sedangkan giliran uji selama satu
    suite penuh.
  - Uji baru: `uji/kunci-papan.test.mjs` (15 uji), plus 3 uji di
    `uji/merge.test.mjs` (catatan land menunggu kunci papan).
- 2026-10-16 16:02:00: bukti uji bisa merah (setiap pengaman dirusak di setiap
  tempat pasangnya, berkas disalin dulu lalu dipulihkan dari salinan):
  - kunci di `update-ticket.sh` dibuang: merah uji mulai bersamaan 8 putaran
    (balapan nyata, baris tiket tertinggal di order.md), menunggu kunci saat
    pindah status, ganti judul/penyegaran, hasil uji saat tiket yang sama
    disegarkan bersamaan, batas waktu kunci papan, KERJAAN_HELD_LOCKS.
  - kunci catatan di `test-run.sh` dibuang: merah 3 uji (catatan menunggu
    kunci, balapan dengan penyegaran, batas waktu saat mencatat).
  - batas waktu kunci uji di `test-run.sh` dibuang: merah uji test_lock_timeout.
  - kunci di `queue.sh` dibuang: merah estimate, ask, answer.
  - kunci di `merge.sh`, satu per satu (held, postponed, landed): masing-masing
    hanya uji jenisnya yang merah.
  - di `lib.sh`: pemeriksaan batas waktu dibuang (3 uji batas waktu merah),
    pemeriksaan PID pada KERJAAN_HELD_LOCKS dibuang (1 merah), pemakaian
    bersama dibuang (2 merah), pembacaan settings dibuang (uji nilai bawaan
    merah).
  - Catatan jujur: uji "hasil uji dua worktree yang selesai bersamaan" tetap
    hijau tanpa kunci, karena dua tiket berbeda tidak menulis berkas yang
    sama. Balapan nyata untuk hasil uji adalah dengan tiket yang sama
    dipindah/disegarkan dari main tree; itu yang dijaga uji kedua dan yang
    merah tanpa kunci.
- 2026-10-16 16:06:51: test run — `node --test` exited 0 after 3m47s, on content fingerprint 067fc045df6622b488892fba733433822e589418 (the same before and after the run; .kerjaan/ left out).
