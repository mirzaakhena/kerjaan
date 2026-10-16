---
type: feature
priority: medium
review: normal
labels: [paralel, uji]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:10:02
updated: 2026-10-16 10:53:24
related: [261016095101, 261016101001]
blocked_by: []
---

## Background
Salinan kerja repo yang terpisah (*worktree*) hanya memisahkan file. Beberapa
hal lain tetap dipakai bersama oleh semua salinan: nomor port, database atau
layanan yang berjalan di komputer, file sementara di lokasi tetap, dan cache.
Bila dua salinan menjalankan uji pada saat yang sama, keduanya bisa saling
mengganggu, dan uji gagal bukan karena kodenya salah.

Selain itu, file yang tidak disimpan di git, misalnya file konfigurasi rahasia
(`.env`) atau paket pustaka yang sudah dipasang, tidak ikut ke salinan baru.
Salinan baru bisa langsung gagal diuji hanya karena hal-hal itu belum ada.

## Request
Uji dari beberapa salinan kerja tidak pernah saling mengganggu, tanpa proyek
harus melakukan apa pun. Proyek yang ingin ujinya berjalan berbarengan diberi
cara untuk itu.

- Bawaannya, uji dari salinan yang berbeda dijalankan bergiliran. Pengerjaannya
  tetap bersamaan, hanya ujinya yang antre.
- Proyek bisa menyatakan bahwa ujinya aman berjalan berbarengan.
- Setiap salinan memberi uji sebuah nomor urut salinan dan ID tiketnya,
  sehingga proyek bisa memilih port atau nama database yang berbeda per
  salinan.
- Proyek bisa menetapkan satu perintah yang dijalankan ketika salinan dibuat
  (misalnya menyalin konfigurasi dan memasang pustaka) dan satu perintah ketika
  salinan dihapus (misalnya menghapus database uji milik salinan itu).
- Data uji yang tersimpan di luar repo dimiliki oleh satu tiket. Setiap tiket
  membawa datanya sendiri, kecuali data yang mudah dibuat ulang. Pembersihan
  hanya menghapus data milik tiket itu sendiri, dan data bersama hanya boleh
  dibaca. Uji tiket pertama tidak boleh menghapus data yang masih dibutuhkan
  tiket kedua.

## Done when
- [x] Dua salinan yang menjalankan uji pada saat yang sama tanpa pengaturan apa pun membuat uji kedua menunggu, dan catatan uji menunjukkan bahwa ia sempat menunggu
- [x] Setelah proyek menyatakan ujinya aman berbarengan di pengaturan papan, uji dari dua salinan berjalan berbarengan
- [x] Uji yang dijalankan di sebuah salinan bisa membaca nomor urut salinannya dan ID tiketnya, dan dua salinan yang berjalan bersamaan tidak pernah mendapat nomor yang sama
- [x] Perintah persiapan dari pengaturan papan dijalankan setiap kali salinan dibuat, dan salinan tidak dipakai bila perintah itu gagal
- [x] Perintah pembersihan dari pengaturan papan dijalankan setiap kali salinan dihapus
- [x] Dua tiket yang ujinya memakai data di luar repo tetap lulus ketika diuji bergantian dalam urutan apa pun, termasuk ketika pembersihan tiket pertama sudah berjalan sebelum tiket kedua diuji
- [x] Panduan kerja paralel menjelaskan aturan kepemilikan data uji: data milik tiket diberi nama sesuai tiket atau salinannya, pembersihan hanya menghapus milik sendiri, data bersama hanya dibaca, dan data yang mudah dibuat ulang dibuat ulang oleh perintah persiapan
- [x] Pengaturan baru ini dijelaskan di file pengaturan papan dan di panduan kerja paralel

## History
- 2026-10-16 10:10:02 backlog
- 2026-10-16 10:24:38 todo
- 2026-10-16 10:24:52 in_progress

## Notes
- 2026-10-16 Keputusan pemilik dalam diskusi kerja paralel: uji bergiliran
  lewat kunci sebagai bawaan; disediakan nomor urut salinan dan ID tiket,
  perintah persiapan, dan perintah pembersihan salinan.
- 2026-10-16 Pemilik menambahkan: pengerjaan boleh bersamaan, tetapi pengujian
  serial. Data uji dibawa oleh tiketnya masing-masing kecuali mudah dibuat
  ulang, supaya agen pertama tidak menghapus data yang dibutuhkan agen kedua.
- 2026-10-16 Keputusan mirza sebelum rantai dimulai: dikerjakan berurutan (101002, 101001, 095101) karena ketiganya mengubah panduan yang sama; review `normal`; tidak ada pemeriksaan yang hanya bisa dilakukan manusia; setelah ketiganya done, mandor merilis 1.12.0.
- 2026-10-16 Pengerja: yang dibangun.
  - `skills/kerjaan/scripts/lib.sh` (baru, di-*source*, tidak dijalankan):
    pembaca pengaturan, kunci bernama (`kerjaan_lock_acquire/release`) dan
    nomor slot (`kerjaan_slot`). Kunci berupa folder di
    `.git/kerjaan-locks/<nama>.lock` (direktori bersama semua worktree), berisi
    PID pemegang; kunci yang ditinggal proses mati diambil alih. Nomor slot
    disimpan di `.git/worktrees/<nama>/kerjaan-slot`, jadi bebas sendiri ketika
    git menghapus worktree itu. Main tree selalu slot 0. Kunci ini dipakai lagi
    oleh 261016101001 bila perlu kunci penggabungan: cukup nama kunci lain.
  - `test-run.sh`: tanpa pengaturan, menunggu kunci `tests` sebelum
    `test_command`; baris catatannya diakhiri "Waited XmYs for the test lock
    first, held by another run (ticket …, slot …, …)". `parallel_tests: true`
    melewati kunci. `test_command` menerima `KERJAAN_TICKET`, `KERJAAN_SLOT`,
    `KERJAAN_WORKTREE`, `KERJAAN_MAIN_TREE`.
  - `skills/kerjaan/scripts/worktree.sh` (baru): `add <id> <path>` membuat
    worktree (cabang `tiket-<id>`, `.kerjaan/` di luar checkout), memberi slot,
    menjalankan `worktree_setup`; bila gagal, worktree dihapus lagi (termasuk
    `worktree_teardown`) dan keluar 1. `remove <id|path>` menolak worktree yang
    belum bersih, menjalankan `worktree_teardown` (gagal → worktree tetap ada),
    lalu menghapus worktree; cabangnya dibiarkan. `slot` mencetak slot.
    Langkah git-nya bergiliran di bawah kunci `worktrees`, karena dua
    `sparse-checkout set` bersamaan saling menolak di `.git/config` (ketemu
    saat uji bersamaan).
  - Dokumen: `SETTINGS.md` (tiga pengaturan baru dan variabelnya),
    `references/parallel-work.md` (bagian "Tests take turns", "Setup and
    teardown", "Who owns test data"), `SKILL.md`, `README.md`,
    `agents/kerjaan-worker.md` (test-run.sh dijalankan dari worktree, bukan
    dari main tree — petunjuk lama menyuruh dari main tree, yang berarti
    menguji pohon yang salah), petunjuk di `update-ticket.sh`.
  - Uji: `uji/worktree.test.mjs` (16 uji, repo git sungguhan sekali pakai).
- 2026-10-16 Pengerja: tentang "dijelaskan di file pengaturan papan". Yang
  diubah adalah templat `skills/kerjaan/SETTINGS.md`, sumber setiap
  `settings.md` papan. `.kerjaan/settings.md` milik papan ini tidak saya
  sentuh (bukan wewenang pengerja); tanpa ketiga baris itu nilainya sudah
  bawaan yang benar (bergiliran, tanpa persiapan/pembersihan). Bila pemilik
  ingin barisnya tampil juga di papan ini, mandor bisa menyalinnya dari templat.
- 2026-10-16 Pengerja: pertanyaan tidak mendesak. Peninjau masih menjalankan
  `test_command` langsung di worktree (agents/kerjaan-reviewer.md), tanpa
  kunci `tests`, jadi uji peninjau bisa berbarengan dengan uji pengerja di
  worktree lain. Saran: beri `test-run.sh` mode jalan-tanpa-catat untuk
  peninjau, atau tangani bersama 261016101001 yang memang mengatur pengujian
  keadaan tergabung. Tidak saya kerjakan di sini agar tidak melebar.
- 2026-10-16 Pengerja: laporan uji sabotase (setiap pengaman dirusak di
  salinan file, uji dijalankan, file dipulihkan dari salinan):
  - kunci `tests` di test-run.sh dimatikan → merah: bergiliran antar
    worktree, main tree + worktree, `parallel_tests: false`, dua uji data,
    kunci basi.
  - pemeriksaan `parallel_tests` diabaikan (selalu mengunci) → merah: uji
    berbarengan.
  - slot selalu 1 → merah: uji slot/ID, uji nomor berbeda, uji persiapan,
    uji pembersihan.
  - kunci `slots` dimatikan → merah: "pemberian nomor slot menunggu kunci
    slots" (uji bersamaan saja tetap hijau karena celahnya sempit; karena itu
    uji kunci langsung ditambahkan).
  - kunci `worktrees` dimatikan, di `add` dan di `remove` masing-masing →
    merah: "langkah git … menunggu kunci worktrees".
  - `KERJAAN_TICKET` tidak diekspor oleh test-run.sh → merah: uji bergiliran,
    berbarengan, slot/ID, dua uji data.
  - kegagalan `worktree_setup` diabaikan → merah: uji persiapan gagal.
  - `worktree_teardown` tidak dipanggil saat setup gagal → merah: uji
    persiapan gagal.
  - `worktree_teardown` tidak dipanggil saat remove → merah: uji pembersihan,
    uji penolakan, dua uji data.
  - variabel pembersihan diambil dari lingkungan pemanggil, bukan diekspor →
    merah: uji pembersihan (pemanggil sengaja membawa `KERJAAN_TICKET` tiket
    lain), uji persiapan, dua uji data.
  - pemeriksaan worktree belum bersih dihapus → merah: uji penolakan.
  - kegagalan `worktree_teardown` diabaikan → merah: uji penolakan.
  - pengambilalihan kunci basi dimatikan → merah: uji kunci basi (berhenti
    lewat batas waktu 60 detik).
  - penolakan dari worktree tertaut dimatikan → merah: uji penolakan worktree
    tertaut.
  - `sparse-checkout` dihapus → merah: uji persiapan (`.kerjaan/` muncul).
  - Ditemukan saat sabotase: `worktree.sh slot` di worktree buatan tangan
    pertama keluar diam-diam dengan status 1 (glob tanpa hasil + `pipefail`).
    Diperbaiki; mengembalikan bug itu → merah: uji kunci slots.

- 2026-10-16 10:53:24: test run — `node --test` exited 0 after 1m5s, on content fingerprint 032a95bd5d450dec9aa8f841c5f4da32ee6798b0 (the same before and after the run; .kerjaan/ left out).
