---
type: bug
priority: high
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-28 17:28:43
updated: 2026-10-28 18:30:18
related: []
blocked_by: []
---

## Background
Agen yang membaca papan sering memotong keluaran skrip papan yang panjang supaya hanya beberapa baris pertama yang tampil. Di proyek video-system-design, setiap kali itu terjadi muncul folder kosong baru di akar repo. Nama folder itu adalah sepotong keluaran skrip, misalnya `Estimated and changed:` atau `261026004834 (backlog) and 261026004837 (backlog) share:`, diikuti baris baru. Di dalamnya ada tumpukan folder kosong yang meniru jalur lengkap repo sampai `.kerjaan/.locks`. Pemilik melihatnya di daftar berkas editornya dua kali dalam beberapa menit pada 2026-10-28, lalu harus menanyakannya. Folder itu tidak berisi apa-apa, tetapi mengotori repo dan bisa ikut ter-commit.

## Request
Memotong atau menghentikan keluaran skrip papan mana pun tidak boleh meninggalkan berkas atau folder apa pun di repo, dan skrip yang hanya membaca papan tidak membuat apa-apa sama sekali.

## Done when
- [x] Langkah di "How to reproduce" tidak lagi memunculkan folder baru; isi akar repo sebelum dan sesudahnya sama
- [x] Hal yang sama berlaku bila keluaran `queue.sh overlap`, `queue.sh check`, dan skrip papan lain yang hanya membaca dipotong dengan cara yang sama
- [x] Skrip yang hanya membaca papan tidak membuat folder kunci, juga saat berjalan normal tanpa dipotong
- [x] Uji proyek ini lulus, termasuk uji baru yang mengulang langkah reproduksi

## How to reproduce
1. Masuk ke repo git mana pun yang punya papan dengan satu tiket di `done/` yang commit-nya mengubah banyak berkas (di video-system-design: 261026004830)
2. Jalankan dari akar repo, dengan galat ikut ke pipa dan keluaran dipotong:
   `for i in 261026004830 261026004817; do <scripts>/queue.sh compare $i; done 2>&1 | head -3`
3. Lihat isi akar repo (`ls -A`)

Ada folder baru bernama `Estimated and changed:` diikuti baris baru, berisi folder kosong bertingkat `/Users/.../<repo>/.kerjaan/.locks`. Tanpa `2>&1` (`queue.sh compare <id> | head -1`) folder tidak muncul.

## History
- 2026-10-28 17:28:43 d771d2d5-e699-4565-8927-73760abccc14 backlog
- 2026-10-28 17:32:47 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 17:51:34 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 18:27:36 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 18:30:18 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Ditemukan 2026-10-28 di /Users/mirza/Workspace/video-system-design oleh planner (kerjaan 1.15.0). Langkah di atas dijalankan ulang oleh foreman di repo itu dan memunculkan folder yang sama; foldernya dihapus.
- Dugaan penyebab dari membaca kode, belum dibuktikan: saat pipa ditutup, `queue.sh` berhenti dan trap EXIT-nya (`rm -rf "$tmpdir"; kerjaan_lock_release board`) tetap melepas kunci, padahal `compare`, `overlap`, dan `check` tidak pernah mengambilnya. `kerjaan_lock_release` memanggil `kerjaan_locks_dir`, yang entah kenapa jatuh ke cabang "bukan repo git" (`common="$(pwd -P)/.kerjaan/.locks"; mkdir -p "$common"`), dan sisa keluaran yang tidak terkirim ikut masuk ke nama jalurnya. Kenapa `git rev-parse --git-common-dir` gagal di situ belum diketahui.
- Arah perbaikan yang terpikir (keputusan tetap di worker): lepas kunci hanya bila proses ini benar-benar memegangnya; tolak jalur kunci yang tidak absolut atau memuat baris baru sebelum `mkdir -p`.
- 2026-10-28 17:32:46: files estimated to change: `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/queue.sh`, `tests/board-lock.test.mjs`
- Penyebab terbukti (direproduksi di repo buangan di scratchpad, bash 3.2): setelah tulisan ke pipa yang sudah ditutup gagal, bash 3.2 menyimpan teks yang tak terkirim dan menuliskannya lagi dari subshell berikutnya, jadi `$(pwd -P)` dan `$(git rev-parse ...)` di `kerjaan_locks_dir` ikut memuat keluaran yang dipotong, lalu `mkdir -p` membangunnya sebagai folder. Terjadi baik SIGPIPE diabaikan (seperti di Claude Code) maupun tidak.
- Perbaikan di `lib.sh`: (1) `kerjaan_lock_release` mengambil jalur kunci dari entri `KERJAAN_HELD_LOCKS` milik proses ini dan tidak menghitung folder kunci sama sekali bila proses ini tidak memegangnya, jadi skrip yang hanya membaca tidak menyentuh folder apa pun, juga saat berjalan normal; pemilik dibaca dengan `read`, bukan `$(cat ...)`. (2) `kerjaan_locks_dir` kini mengisi variabel `kerjaan_locks` (tanpa `$(...)` di pemanggil), menolak jalur yang tidak absolut, memuat baris baru, atau induknya tidak ada, dan hanya membuat folder terakhir (`mkdir`, bukan `mkdir -p`); kunci lalu tidak diambil dan skrip berhenti dengan pesan. `queue.sh` tidak perlu diubah.
- Uji baru di `tests/board-lock.test.mjs`: langkah reproduksi untuk 10 perintah baca-saja (`queue.sh compare/overlap/check/check <id>`, `merge.sh queue/check/resolution`, `release.sh unreleased`, `repair.sh duplicate-id`, `test-run.sh --check`), SIGPIPE diabaikan dan default; jalan normal tanpa folder kunci di repo git dan di folder biasa; kunci yang diambil setelah keluaran dipotong ditolak; pelepasan kunci yang tidak diambil sendiri (termasuk entri basi dengan PID sama) membiarkan kunci pemegangnya.
- Dipatahkan dengan sengaja: lib.sh asli -> tiga uji baru merah; `kerjaan_lock_release` menghitung folder bila tidak memegang -> uji "output is cut" dan "run normally" merah; pemeriksaan jalur di `kerjaan_locks_dir` diganti `mkdir -p` -> uji "lock taken after the output was cut" merah; cek pemilik di release dihapus -> uji "never took" (entri basi) merah. Pemeriksaan baris baru dan pemeriksaan induk-ada saling menutupi: masing-masing sendiri cukup menolak keluaran bocor yang teramati, jadi hanya penghapusan keduanya yang diuji merah.
- 2026-10-28 18:06:00: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 1 after 7m53s, on content fingerprint 96e66cd183e078ad9e07324b0a67709c1c15d239 (the same before and after the run; .kerjaan/ left out).
- Temuan tambahan dari pemilik (lewat foreman): terjadi lagi 2026-10-28 18:10:16 di /Users/mirza/Workspace/nukitu-mockup dengan plugin terpasang 1.17.0. Nama folder `Estimated, not changed:` diikuti baris baru (baris lain dari keluaran `queue.sh compare`), berisi hanya folder kosong bertingkat sampai `/Users/mirza/Workspace/nukitu-mockup/.kerjaan/.locks`, 0 berkas; foreman menghapusnya. Jadi tidak khusus 1.15.0, tidak khusus baris `Estimated and changed:`, dan terjadi di repo lain. `kerjaan_locks_dir`, `kerjaan_lock_release` dan trap `queue.sh` di 1.17.0 sama persis dengan HEAD sebelum perbaikan ini, jadi perbaikan di `lib.sh` mencakup jalur kode itu dan ikut di rilis berikutnya; uji baru memotong keluaran di baris mana pun (`head -1` atas dua jalannya perintah), bukan hanya baris tertentu.
- 2026-10-28 18:13:49: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 1 after 7m10s, on content fingerprint 96e66cd183e078ad9e07324b0a67709c1c15d239 (the same before and after the run; .kerjaan/ left out).
- Di luar perkiraan berkas: dua kali jalan penuh merah hanya pada uji viewer `phone 390×844: the Progress lists the run's tests one by one...` (dari 261028121401), lulus bila dijalankan sendiri. Sebabnya di uji: daftar uji palsu dengan `at: Date.now() - 65000` dibuat sekali saat berkas dimuat, jadi uji browser yang jalan lebih dari 55 detik kemudian di suite yang sibuk membaca "2 min", bukan "1 min". Diperbaiki di `viewer/tests/runs.test.mjs`: daftar itu dibuat per `setup()`. Bukan pengaman baru, jadi tidak dipatahkan; buktinya jalan penuh berikutnya.
- Temuan tambahan kedua dari pemilik (lewat foreman): 2026-10-28 18:12:35 di /Users/mirza/Workspace/nukitu-mockup, plugin 1.17.0, folder bernama persis `261028165801 (backlog) and 261028165804 (backlog) share:` dari keluaran `queue.sh overlap`, kali ini tanpa baris baru di namanya; hanya folder kosong bertingkat, 0 berkas; foreman menghapusnya. Jadi teks bocor bisa juga sepotong baris tanpa baris baru: jalurnya lalu tidak diawali `/` (atau induknya tidak ada) dan ditolak oleh pemeriksaan yang sama; uji kunci-setelah-dipotong mencakup kedua bentuk.
- 2026-10-28 18:21:41: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 6m20s, on content fingerprint 4878a88ebb83e623adff454d60d24ce35221116a (the same before and after the run; .kerjaan/ left out).
- Bentuk tanpa baris baru direproduksi: dengan lib.sh asli, `printf` sepotong baris lalu `kerjaan_lock_acquire` setelah pipa ditutup membuat folder `A (backlog) and B (backlog) share:` persis seperti temuan; dengan perbaikan ditolak dan tidak ada yang dibuat. Uji itu merah dengan lib.sh asli dan bila pemeriksaan jalur diganti `mkdir -p`.
- 2026-10-28 18:27:26: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 5m0s, on content fingerprint 0300fc317f4b88d7b6c28ba6f9d108c1595cd992 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level normal, round 1, at commit 5a8da17: passed.
  Level normal di sini: uji proyek tidak dijalankan ulang (lihat di bawah), tiap kriteria dibuktikan dengan menjalankan skrip di repo buangan di scratchpad, dan uji baru dibaca apakah bisa merah. Tidak ada salinan bersih: pohon kerja tidak bergerak selama tinjauan.
  - Uji proyek: `test-run.sh --check 261028172801` menjawab SAME — jalan 2026-10-28 18:27:26 (exit 0, fingerprint 0300fc317f4b88d7b6c28ba6f9d108c1595cd992) persis atas isi yang ditinjau; tidak dijalankan lagi.
  - Kriteria 1 (langkah reproduksi): di repo buangan dengan dua tiket `done` yang commit-nya mengubah 60 berkas, `for i in 261026004830 261026004817; do queue.sh compare $i; done 2>&1 | head -3`. Dengan skrip sebelum perbaikan (5a8da17^) muncul folder `Estimated and changed:` + baris baru di akar repo, SIGPIPE diabaikan maupun tidak; dengan skrip 5a8da17 isi akar repo dan `.git/` sama sebelum dan sesudah. Terpenuhi.
  - Kriteria 2 (skrip baca-saja lain): 12 perintah (`queue.sh overlap/check/check <id>/compare`, `merge.sh queue/check/resolution`, `release.sh unreleased`, `repair.sh duplicate-id`, `test-run.sh --check`, dll.), masing-masing dua kali jalan `2>&1 | head -1`, dua mode SIGPIPE, tiga ulangan. Skrip lama: 24 perubahan (folder `261028165801 (backlog) and 261028165804 (backlog) share:` dll., serta `.git/kerjaan-locks`). Skrip baru: 0 perubahan. Terpenuhi.
  - Kriteria 3 (tanpa folder kunci saat jalan normal): `queue.sh overlap/check/check <id>` di repo git tidak membuat `.git/kerjaan-locks`; di folder biasa tanpa git skrip lama membuat `.kerjaan/.locks`, skrip baru tidak. Terpenuhi. Satu-satunya pemanggil `kerjaan_locks_dir` kini `kerjaan_lock_acquire`; `kerjaan_lock_release` hanya memakai jalur dari `KERJAAN_HELD_LOCKS` milik proses ini.
  - Kriteria 4 (uji lulus, termasuk uji reproduksi): jalan penuh SAME di atas; `tests/board-lock.test.mjs` punya uji yang mengulang langkah reproduksi untuk 10 perintah baca-saja dan membandingkan seluruh pohon repo termasuk `.git/` (tanpa objects/logs) — asersinya nyata, dan pola pemotongan yang sama terbukti memunculkan folder dengan skrip lama di repro saya. Terpenuhi.
  - Perubahan di `viewer/tests/runs.test.mjs` (di luar perkiraan): masuk akal. Cap waktu `Date.now() - 65000` untuk uji yang sedang jalan kini dihitung per `setup()`, bukan sekali saat berkas dimuat, jadi "1 min" tidak lagi menjadi "2 min" di suite yang lambat. `T0` masih dihitung sekali, tetapi tidak ada asersi yang bergantung pada umurnya.
  - Catatan (tidak memblokir): pola yang sama — jalur dari `$(...)` lalu `mkdir -p` — masih ada di `test-run.sh` `progress_start` dan `handoff.sh`. Di sana belum ada keluaran yang bisa dipotong sebelum titik itu (paling-paling satu baris "Got the test lock" di stderr), jadi risikonya kecil.

### Suggested follow-up

- **Jalur dari `$(...)` lalu `mkdir -p` masih ada di `test-run.sh` (`progress_start`) dan `handoff.sh`.** Bila suatu hari keluaran sudah tercetak dan dipotong sebelum titik itu, bash 3.2 bisa menyisipkan teks bocor ke jalur dan membangunnya sebagai folder, seperti bug ini. Layak tiket kecil: pakai pemeriksaan jalur yang sama seperti `kerjaan_locks_dir` (absolut, tanpa baris baru, induk ada, `mkdir` tanpa `-p`).
