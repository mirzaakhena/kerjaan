---
type: bug
priority: low
review: normal
labels: [sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:44
updated: 2026-10-28 19:30:34
related: [261028172801]
blocked_by: []
---

## Background
Tiket 261028172801 memperbaiki skrip papan yang membuat folder aneh di akar
repo ketika keluarannya dipotong: sisa keluaran yang tak terkirim ikut masuk
ke alamat folder yang dihitung skrip, lalu dibuat sebagai folder. Perbaikan
itu hanya mengenai folder kunci papan. Peninjaunya menemukan pola yang sama
di dua tempat lain: bagian jalur uji yang menyiapkan folder kemajuan, dan
hook yang menulis catatan serah-terima sebelum percakapan diringkas. Risikonya
rendah karena di kedua tempat itu hampir belum ada keluaran yang bisa
terpotong, tetapi akibatnya sama bila terjadi.

## Request
Kedua tempat itu menolak alamat folder yang tidak wajar dengan cara yang sama
seperti folder kunci papan, sehingga keluaran yang terpotong tidak pernah
menjadi folder di repo.

## Done when
- [x] Alamat folder kemajuan uji dan alamat catatan serah-terima yang memuat baris baru, bukan alamat lengkap, atau induknya tidak ada ditolak, dan tidak ada folder yang dibuat
- [x] Jalan uji dan catatan serah-terima tetap bekerja seperti biasa dengan alamat yang wajar
- [x] Uji proyek ini lulus, termasuk uji baru yang memberi kedua tempat itu alamat tidak wajar

## History
- 2026-10-28 18:56:44 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 18:59:30 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 19:19:19 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 19:30:34 a185f853-6a65-4f44-919d-97ba97774e43 review

## Notes
- Saran lanjutan peninjau 261028172801; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Tempatnya: `progress_start` di `test-run.sh` dan `handoff.sh`; keduanya mengambil alamat lewat `$(...)` lalu `mkdir -p`. Pemeriksaan yang dipakai 261028172801 di `kerjaan_locks_dir`: alamat diawali `/`, tanpa baris baru, induknya ada, dibuat dengan `mkdir` bukan `mkdir -p`.
- Bila jalan uji tidak bisa menyiapkan folder kemajuan, jalan uji itu sendiri tetap harus berjalan dan kode keluarnya tidak berubah (261028112701).
- 2026-10-28 18:59:16: files estimated to change: `skills/kerjaan/scripts/handoff.sh`, `skills/kerjaan/scripts/test-run.sh`, `tests/handoff.test.mjs`, `tests/test-run.test.mjs`
- Keputusan: satu pembantu bersama `kerjaan_make_dir` di lib.sh (tolak baris baru, alamat tak lengkap, induk tak ada; `mkdir` biasa), dipakai `kerjaan_locks_dir`, `progress_start`, folder `info/` untuk exclude, dan folder status hook. Folder status hook dibuat dua tingkat (dasar `KERJAAN_HOOK_STATE`/bawaan `$TMPDIR/kerjaan-review-hook`, lalu folder sesi), masing-masing dengan pembantu itu; akibatnya `KERJAAN_HOOK_STATE` yang induknya tidak ada kini ditolak, bukan dibuat berantai. Bila ditolak, hook tetap memberi peringatan/serah-terima, hanya tidak mengingatnya.
- Uji integrasi jalan uji memakai `git` palsu di PATH yang menjawab `rev-parse --git-common-dir` dengan folder nyata bernama berbaris baru (`--review`, `parallel_tests: true`): repo yang alamatnya sendiri memuat baris baru tidak bisa dipakai karena `kerjaan_main_tree` membaca `worktree list` per baris.
- Sabotase: hapus tolakan baris baru → 4 uji baru merah (make_dir, jalan uji, kedua uji hook); hapus tolakan alamat tak lengkap → uji make_dir dan uji folder status hook merah (kasus `here/...` yang induknya ada di cwd); ganti cek induk + `mkdir` jadi `mkdir -p` → uji make_dir dan kedua uji hook merah; kembalikan `mkdir -p` di `progress_start` → uji jalan uji merah; di `ignore_handoff` → uji info/ merah; di `make_state_dir` → uji folder status merah. Cek induk sendiri saja tidak bisa dibuat merah: `mkdir` biasa sudah gagal bila induk tak ada; cek itu tinggal sebagai penjelas.
- 2026-10-28 19:30:25: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 5m9s, on content fingerprint e857576cb164bbd220aa14f2aadf2980f00fbb83 (the same before and after the run; .kerjaan/ left out).
