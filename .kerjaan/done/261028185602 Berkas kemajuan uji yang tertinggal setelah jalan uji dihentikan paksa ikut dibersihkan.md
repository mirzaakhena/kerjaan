---
type: bug
priority: low
review: quick
labels: [viewer, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:44
updated: 2026-10-28 19:19:03
related: [261028112701, 261028121401]
blocked_by: []
---

## Background
Selagi uji proyek berjalan, keluarannya disalin ke berkas sementara di dalam
folder git proyek supaya papan bisa menampilkan kemajuannya (261028112701,
261028121401). Berkas itu dihapus ketika jalan uji selesai. Bila jalan uji
dihentikan paksa di tengah, sebagian berkas itu tertinggal dan tidak pernah
dibersihkan: jalan uji berikutnya hanya membersihkan berkas keterangan
jalannya, bukan berkas log dan daftar uji yang menyertainya. Lama-lama berkas
sisa itu menumpuk di folder git proyek.

## How to reproduce
1. Di repo yang memakai papan, mulai jalan uji sebuah tiket lewat jalur uji kerjaan
2. Hentikan proses jalan uji itu secara paksa selagi masih berjalan
3. Jalankan uji sekali lagi sampai selesai
4. Lihat isi folder kemajuan di dalam folder git proyek

Berkas log atau daftar uji dari jalan yang dihentikan masih ada.

## Request
Berkas kemajuan dari jalan uji yang sudah tidak hidup selalu dibersihkan,
apa pun jenisnya, tanpa menyentuh berkas jalan uji yang masih berjalan.

## Done when
- [x] Langkah di atas tidak lagi meninggalkan berkas apa pun dari jalan yang dihentikan
- [x] Berkas milik jalan uji lain yang masih berjalan tidak ikut terhapus
- [x] Uji proyek ini lulus, termasuk uji baru untuk kedua hal di atas

## History
- 2026-10-28 18:56:44 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 18:59:30 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 19:09:21 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 19:18:08 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 19:19:03 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Saran lanjutan peninjau 261028112701 dan 261028121401; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Yang tertinggal: berkas `.log`, `.tmp`, dan `.tests` di `<git common dir>/kerjaan-progress/`; pembersihan sekarang hanya dipicu oleh `.json`.
- 2026-10-28 18:59:16: files estimated to change: `skills/kerjaan/scripts/test-run.sh`, `tests/test-run.test.mjs`, `viewer/runs.mjs`
- Perbaikan: pembersihan di `progress_start` (test-run.sh) kini menelusuri setiap `<id>.<pid>.{json,log,tests,tmp}` dan menghapus berkas yang pid-nya mati, satu per satu, tanpa bergantung pada adanya `.json`. `viewer/runs.mjs` tidak diubah: ia tidak menghapus apa pun dan sudah menyaring run berdasar pid hidup.
- Uji baru (tests/test-run.test.mjs): tiap jenis berkas yang tertinggal sendirian (pid mati dihapus, pid hidup dan berkas lain di folder tetap), dan jalan uji sungguhan yang di-SIGKILL di tengah perintah lalu jalan berikutnya tidak menyisakan apa pun, sementara berkas jalan hidup tetap.
- Sabotase: loop kembali ke `*.json` saja → 6 uji merah (uji .log, .tests, .tmp tertinggal dan uji SIGKILL); cek `kill -0` dibuang → 6 uji merah (semua yang memastikan berkas jalan hidup tetap).
- 2026-10-28 19:17:57: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 6m49s, on content fingerprint 99d398246cd91e71b89b4aa5296cd1233208fed4 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level quick, round 1, at commit 881c586: passed.
  Level quick: uji proyek tidak dijalankan ulang (lihat di bawah), perubahan dibaca baris demi baris terhadap tiap kriteria.
  - Uji: `test-run.sh --check 261028185602` → SAME, jalan 2026-10-28 19:17:57 (exit 0, 6m49s) pada sidik 99d398246cd91e71b89b4aa5296cd1233208fed4; tidak dijalankan lagi.
  - Kriteria 1 (tak ada berkas tertinggal): loop di `progress_start` kini menelusuri `*.*.*`, menerima `.json/.log/.tests/.tmp`, mengambil pid dari bagian sebelum akhiran, dan menghapus berkas itu sendiri bila pid mati — tak lagi bergantung pada `.json`. Uji baru: tiap jenis yang tertinggal sendirian, dan jalan sungguhan yang di-SIGKILL di tengah perintah lalu jalan berikutnya tidak menyisakan apa pun. Terpenuhi.
  - Kriteria 2 (berkas jalan hidup tetap): penghapusan hanya terjadi bila `kill -0 <pid>` gagal; berkas di luar pola `<id>.<pid>.<jenis>` dan pid bukan angka dilewati. Uji baru memeriksa berkas pid hidup (`process.pid`) dan `notes.txt` tetap ada. Terpenuhi.
  - Kriteria 3 (uji lulus, termasuk uji baru): jalan yang dibawa (SAME) lulus dan memuat lima uji baru di `tests/test-run.test.mjs`. Terpenuhi.
  - Kode keluar test-run.sh: loop berada di bawah `set -e`; `kill -0 … || rm -f` hanya bisa menghentikan skrip bila `rm -f` gagal karena folder tak bisa ditulis — pola yang sama sudah ada sebelum perubahan ini, jadi tidak ada regresi.
  - Catatan (tidak menahan): seperti sebelumnya, pid yang dipakai ulang oleh proses lain membuat berkas mati tetap tersimpan sampai pid itu berakhir; dan `kill -0` pada proses milik pengguna lain dianggap mati. Keduanya sudah ada sebelum tiket ini.
  - Klaim sabotase pekerja di Notes tidak diperiksa (level quick).
  - Dinilai hanya dengan membaca: kriteria 1 dan 2 (bukti dari uji yang lulus, tanpa dijalankan sendiri).
