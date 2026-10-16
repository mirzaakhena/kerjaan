---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, scripts, parallel]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:46:20
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
- [ ] Dua tiket dari grup yang sama dimulai bersamaan berulang kali, dan setiap kali keduanya hilang dari daftar urutan
- [ ] Hasil uji dua worktree yang selesai bersamaan sama-sama tercatat di tiketnya masing-masing
- [ ] Giliran yang ditunggu lebih lama dari batas waktu berakhir dengan pesan yang menyebut siapa yang memegangnya
- [ ] Batas waktu itu bisa diatur, dan nilai bawaannya tertulis di panduan
- [ ] Ada uji otomatis yang menjalankan perpindahan bersamaan

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
- Temuan teknis: `update-ticket.sh` menulis ulang berkas (baris ~451 dan
  ~530) tanpa kunci; `test-run.sh:290-297` juga. `lib.sh` sudah punya
  `kerjaan_lock_acquire` yang bekerja lintas worktree; kunci itu yang
  sebaiknya dipakai. Kunci di `lib.sh:90` tidak punya batas waktu.
- 2026-10-16 14:36:45: files estimated to change: `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `uji/test-run.test.mjs`, `uji/update-ticket.test.mjs`
