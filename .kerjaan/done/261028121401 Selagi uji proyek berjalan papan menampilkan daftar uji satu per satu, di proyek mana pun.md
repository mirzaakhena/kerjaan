---
type: feature
priority: medium
review: normal
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 12:14:46
updated: 2026-10-28 17:50:49
related: [261028112701, 261028121402]
blocked_by: [261028112701]
---

## Background
Selagi pengerja menjalankan uji proyek, papan akan bisa menampilkan keluaran
perintah itu selagi berjalan (261028112701). Keluaran itu hanya deretan baris
teks: pemilik masih harus membacanya sendiri untuk tahu uji mana yang sedang
berjalan, mana yang sudah lulus, dan mana yang gagal.

Proyek nukitu-mockup sudah punya halaman log hidup sendiri untuk ujinya: tiap
uji melapor saat mulai dan selesai, dan sebuah halaman di peramban
menunjukkan daftarnya. Tapi halaman itu buatan proyek itu saja, dengan server
sendiri, dan tidak terlihat dari papan. Proyek lain, termasuk kerjaan sendiri,
tidak punya apa-apa seperti itu.

## Request
Selagi uji proyek berjalan, pemilik bisa melihat dari papan daftar ujinya
satu per satu: apa yang diuji oleh masing-masing (nama uji seperti ditulis
pembuatnya, dikelompokkan per berkas uji), yang sedang berjalan, yang sudah
lulus (hijau) atau gagal (merah), dan berapa lama masing-masing, dengan
jumlah hijau dan merah sejauh ini. Kerjaan menetapkan satu bentuk laporan
sederhana dan membawa penghubung untuk node --test; proyek dengan alat uji
lain ikut melapor dengan mengikuti panduan. Proyek yang belum melapor tetap
mendapat log hidupnya, dan papan menyebut bahwa proyek itu belum melapor per
uji; tidak ada yang gagal karenanya.

## Done when
- [x] Selagi uji proyek berjalan, kemajuannya di papan menampilkan daftar uji satu per satu, dikelompokkan per berkas uji: apa yang diuji masing-masing (nama ujinya seperti ditulis pembuatnya), yang sedang berjalan, yang sudah hijau atau merah, dan lama masing-masing, bertambah sendiri tanpa memuat ulang halaman
- [x] Kemajuan itu menunjukkan jumlah uji hijau dan merah sejauh ini
- [x] Uji kerjaan sendiri muncul di daftar itu selagi berjalan
- [x] Cara sebuah proyek dengan alat uji lain ikut melapor tertulis di panduan, dan bisa diikuti tanpa mengubah kerjaan
- [x] Selagi uji proyek yang belum melapor per uji berjalan, papan menyebut "proyek ini belum melapor per uji" dan tetap menampilkan log hidupnya, dan jalan ujinya tidak gagal karena itu
- [ ] ~~Sesudah jalan uji selesai, daftar ujinya tetap bisa dibuka dari tiket bersama hasil akhirnya~~ (dibatalkan pemilik 28 Okt 2026 lewat jawaban 261028112701 #4: jalan uji tidak disimpan, hanya dilihat selagi tiket di in_progress atau review)
- [ ] ~~Pemilik melihat daftar uji sebuah tiket bertambah selagi ujinya berjalan (langkah di Notes)~~ (dibatalkan pemilik 28 Okt 2026: butir yang hanya bisa dicek orang dihapus)

## History
- 2026-10-28 12:14:46 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 12:47:44 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 17:06:06 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 17:41:22 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 17:50:49 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Dipecah dari 261028112701 oleh planner (28 Okt 2026, sesi a185f853-6a65-4f44-919d-97ba97774e43), karena tiket itu memuat 11 butir. Butir dari sana: "jumlah hijau dan merah bila keluarannya hasil uji yang dikenali", "daftar uji satu per satu", dan "berlaku di proyek mana pun, cara ikut melapor tertulis di panduan". Permintaan asli pemilik dan contoh rujukannya (nukitu-mockup `test/uji-ui.mjs`, `test/laporan.mjs`, `test/laporan-halaman.mjs`) ada di Notes 261028112701.
- Menunggu 261028112701: daftar ini tampil di tempat kemajuan perintah yang dibuat tiket itu.
- Catatan planner (belum diukur): `test-run.sh` sudah menjadi satu-satunya jalur jalan uji pengerja dan peninjau, jadi di situlah tempat yang wajar untuk memberi tahu uji ke mana melapor (misalnya lewat variabel lingkungan, seperti `KERJAAN_TICKET` sekarang). Penghubung untuk alat uji yang dipakai kerjaan sendiri (`node --test`) ikut dibuat di sini, dan hanya itu (keputusan pemilik: ramping, tanpa TAP/JUnit). Pengerja boleh mengubah `test_command` di `.kerjaan/settings.md` agar uji kerjaan sendiri melapor (izin pemilik, jawaban #3). Panduan cara ikut melapor sebaiknya di `skills/kerjaan/SETTINGS.md` di samping `test_command`, karena berkas itu di luar anggaran 18.000 kata aturan skill.
- Penghubung yang dirujuk dari `test_command` tidak boleh memakai alamat folder plugin yang berganti tiap versi (`.../kerjaan/1.17.0/...`); `test-run.sh` bisa memberi alamatnya lewat lingkungan.
- Jalur pelaporan ini tidak boleh mengubah kode keluar jalan uji atau sidik isi yang dicatat `test-run.sh`.
- 2026-10-28 12:15:53: files estimated to change: `README.md`, `skills/kerjaan/scripts/reporters/`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/SETTINGS.md`, `tests/reporters.test.mjs`, `tests/test-run.test.mjs`, `viewer/runs.mjs`, `viewer/tests/runs.test.mjs`, `viewer/web/run.js`, `viewer/web/style.css`
- 2026-10-28 12:16:49: answered question: Bagaimana setiap uji melapor ke papan di proyek mana pun, apa pun alat ujinya? Saran: kerjaan menetapkan satu bentuk laporan sederhana dan membawa penghubung siap pakai untuk alat uji yang umum (node --test, alat yang mencetak format TAP atau JUnit). Proyek memasangnya sekali di perintah ujinya, dan sejak itu setiap uji, termasuk uji baru, melapor sendiri tanpa penulis uji melakukan apa pun; proyek dengan alat lain (seperti pelari uji buatan sendiri di nukitu-mockup) menulis penghubung kecil sekali mengikuti panduan. Cara ini juga yang membuat jaminan di 261028121402 bisa diperiksa. Pilihan lain: (b) papan hanya membaca keluaran uji yang bentuknya sudah dikenal, tanpa proyek memasang apa pun, tapi proyek dengan alat lain hanya mendapat log, tanpa daftar dan tanpa jaminan; (c) setiap berkas uji memanggil pelapor kerjaan sendiri-sendiri: paling harfiah, tapi mudah terlupa dan setiap proyek harus mengubah semua ujinya.
  answer, 2026-10-28 12:47:02: Ramping: satu bentuk laporan sederhana dari kerjaan dan penghubung untuk node --test saja (tanpa TAP/JUnit). Proyek lain ikut melapor dengan mengikuti panduan.
- 2026-10-28 12:16:49: answered question: 'Apa yang diuji masing-masing' ditampilkan sebagai apa? Saran: nama uji seperti ditulis pembuatnya, dikelompokkan per berkas uji (di kerjaan nama uji berupa kalimat bahasa Inggris, misalnya 'a ticket with an open question cannot enter todo'), karena tidak menuntut apa pun dari proyek. Pilihan lain: setiap uji wajib punya keterangan tambahan dalam bahasa awam, yang berarti semua uji yang sudah ada di setiap proyek harus diberi keterangan dulu.
  answer, 2026-10-28 12:47:02: Nama uji seperti ditulis pembuatnya, dikelompokkan per berkas uji.
- 2026-10-28 12:16:49: answered question: Apakah uji kerjaan sendiri ikut melapor dalam batch ini? Saran: ya, di tiket ini: pengerja mengubah test_command di setelan papan kerjaan (.kerjaan/settings.md) supaya memakai penghubung node --test, karena kerjaan memakai alat itu dan jadi bukti pertama bahwa daftarnya benar. Setelan itu milik pemilik, jadi perlu izin di sini. Pilihan lain: nanti di tiket tersendiri; butir 'Uji kerjaan sendiri muncul di daftar itu' lalu dihapus dan daftar hanya dibuktikan dengan proyek contoh dalam uji.
  answer, 2026-10-28 12:47:02: Ya, di tiket ini: pengerja boleh mengubah test_command di .kerjaan/settings.md (izin pemilik).
- 2026-10-28 12:16:50: answered question: Selagi uji berjalan, perlu perkiraan jumlah total uji ('38 dari sekitar 412'), seperti halaman log nukitu-mockup? Saran: ya, dihitung dari jalan uji terakhir yang selesai di proyek itu dan disebut perkiraan, karena tanpa itu pemilik tidak tahu masih berapa lama lagi; menambah satu butir Done when. Pilihan lain: tanpa perkiraan, hanya jumlah yang sudah berjalan.
  answer, 2026-10-28 12:47:02: Tanpa perkiraan jumlah total.
- 2026-10-28 12:16:50: answered question: Butir 'Pemilik melihat daftar uji sebuah tiket bertambah selagi ujinya berjalan' hanya bisa dicek orang. Saran: ditunda (skenario tangan, rantai berjalan terus), karena 261028121402 tidak bergantung pada pengecekan mata ini. Pilihan lain: rantai berhenti sampai pemilik mengeceknya.
  answer, 2026-10-28 12:47:03: Hapus semua: butir yang hanya bisa dicek orang dicoret, dibatalkan pemilik.
- 2026-10-28 17:33:39: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node-test.mjs --test-reporter-destination=/dev/null` exited 1 after 3m59s, on content fingerprint e0b575c5b77a7d08d9059c9849bb91c9410de6f3 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28 17:50:00: catatan pengerja (ringkasan).
  - Bentuk laporan: satu objek JSON per baris di berkas `$KERJAAN_TEST_REPORT` (`<id>.<pid>.tests` di samping `.log`/`.json` di `.git/kerjaan-progress/`, dihapus bersama keduanya; berkas sisa pid yang sama dihapus sebelum perintah mulai). Baris: `file`, `name` (tanpa nama = berkas itu sendiri: `start`/`end`/`fail`), `state` (`start`, `pass`, `fail`, `skip`, `group`), `at`, `ms`. Panduan di `skills/kerjaan/SETTINGS.md`, bagian "Reporting each test to the board"; README menunjuk ke sana.
  - Penghubung node --test: `skills/kerjaan/scripts/reporters/node.mjs`; `test-run.sh` mengekspor `KERJAAN_NODE_REPORTER` (alamatnya di salinan kerjaan yang berjalan) dan `KERJAAN_TEST_REPORT` (kosong bila salinan keluaran tak bisa dibuat, jadi nilai warisan run luar tidak dipakai). Perintah di panduan memakai `${KERJAAN_NODE_REPORTER:+...}`, jadi dijalankan tangan tetap `node --test` biasa.
  - Keputusan: berkas dinamai `node.mjs`, bukan `node-test.mjs`, karena `node --test` tanpa daftar berkas menjalankan `*-test.mjs` sebagai berkas uji (terlihat di jalan uji pertama: penghubung muncul di daftar). Ada uji yang menjaga nama ini.
  - Keputusan: `test_command` kerjaan (izin pemilik #3) menunjuk penghubung lewat jalur di repo (`./skills/kerjaan/scripts/reporters/node.mjs`), bukan lewat variabel, supaya uji repo ini selalu memakai salinan repo, juga bila `test-run.sh` plugin terpasang (1.17.0) yang belum mengenal variabel itu. Reporter `tap` disebut eksplisit karena menyebut satu reporter mengganti pilihan bawaan node; keluaran jalan uji tetap TAP seperti sebelumnya.
  - Keputusan: kalimat "proyek ini belum melapor per uji" ditulis dalam bahasa Inggris di penampil ("This project does not report per test yet; its live output is below."), karena berkas penampil wajib bahasa Inggris (tests/english-only.test.mjs).
  - Batas yang diketahui (dari node, bukan dari kerjaan): runner node melaporkan uji per berkas menurut urutan berkas, jadi uji berkas yang berjalan di samping berkas sebelumnya baru muncul begitu berkas itu selesai; berkasnya sendiri sudah tampil "running" sejak mulai. Tertulis di panduan.
  - Grup (describe, uji bersub-uji) tidak dihitung; namanya menjadi awalan "luar > dalam". Grup atau berkas yang gagal di luar ujinya dihitung satu merah; uji yang masih berjalan di berkas yang gagal sendiri tampil "did not finish".
  - Dirusak sengaja, lalu dipulihkan dari salinan: kedua reset `KERJAAN_TEST_REPORT` di test-run.sh sekaligus -> "an outer run's report is not passed on" merah; hapus `.tests` di progress_end -> "told where to report" (worker dan reviewer) merah; hapus `.tests` sisa run mati -> "killed is removed with its copy" merah; hapus `.tests` pid sendiri sebelum mulai -> "pid used again" merah; `KERJAAN_NODE_REPORTER` kosong atau `KERJAAN_TEST_REPORT` selalu kosong -> 4 uji test-run merah.
  - Penghubung: aturan grup gagal-sendiri, pengenalan berkas, todo bukan kegagalan, nama "luar > dalam", `fail` berkas -> masing-masing "each test is reported" merah; buka berkas tanpa try -> 3 uji "keeps its exit status" merah; tanpa try di tulis dan di handle sekaligus -> 3 merah (masing-masing sendiri dilindungi yang lain); nilai bawaan bila variabel kosong -> 3 merah; nama berkas seperti berkas uji -> "not named like a test file" merah.
  - Penampil: cocokkan ke entri terbuka paling awal, tanda "unfinished", sembunyikan grup, grup gagal ditampilkan, hitungan berkas gagal, potong nama, berkas tanpa nama hanya start/end/fail -> uji baca merah; `testsSize` di readRuns atau di runsMark -> 4 uji (server, SSE, peramban) merah; `esc` nama uji -> 3 merah, `esc` nama berkas -> 1 merah; detik uji berjalan tidak dihitung ulang -> 2 uji peramban merah. Penjaga "baris setengah ditulis" dibuang: baris setengah memang bukan JSON dan sudah dilewati.
  - `tests/time-limits.test.mjs` menjalankan test_command di folder sementara: jalur `--test-reporter=./...` kini dijadikan mutlak, dan `KERJAAN_TEST_REPORT` dikosongkan; tanpa itu uji sampel di dalamnya tercatat di daftar run luar (dicoba: 6 baris "sample" masuk ke laporan luar, dengan pengosongan tidak ada).
  - Dicek dengan tangan: selama jalan uji penuh lewat `test-run.sh` repo, penampil (`viewer/server.mjs --scan ~/Workspace`) di `api/progress/261028121401` memberi daftar uji kerjaan sendiri per berkas dengan hitungan hijau/merah dan uji yang sedang berjalan (jalan uji terakhir, detik 45: 21 lulus, 1 berjalan di tests/board-lock.test.mjs; detik 120: 73 lulus di 38 berkas; penghubung sendiri tidak terdaftar sebagai berkas uji).
- 2026-10-28 17:41:09: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 5m14s, on content fingerprint 09c4f9e0c224de1aaf6e1fc623dfadc7cdaddd95 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level normal, round 1, at commit 6132f9c: passed.
  Level normal di sini: jalan uji pengerja dibawa lewat `test-run.sh --check` (SAME), tiap butir dibuktikan dengan menjalankan sesuatu (dua proyek contoh di folder sementara dan uji kerjaan sendiri, diamati lewat penampil yang berjalan), dan uji baru dibaca untuk mencari pernyataan yang tak bisa gagal.
  - Perintah: `test-run.sh --check 261028121401 6132f9c` -> SAME (jalan 2026-10-28 17:41:09, sidik 09c4f9e0c224de1aaf6e1fc623dfadc7cdaddd95, keluar 0). Tambahan sebagai bukti butir 3: `skills/kerjaan/scripts/test-run.sh --review 261028121401` (salinan repo) -> 784 uji, 784 lulus, 0 dilewati (uji peramban ikut berjalan, Chrome ada), keluar 0 setelah 4m47s; folder `.git/kerjaan-progress/` kosong lagi sesudahnya.
  - Butir 1 (daftar per berkas, nama, berjalan/hijau/merah, lama, bertambah sendiri): proyek contoh dengan `test_command` persis dari SETTINGS.md, dijalankan lewat `test-run.sh` repo; `api/progress` penampil di detik 5 memberi `an empty cart costs nothing` pass 3002 ms dan `checkout > adds tax` running dengan `at`, di detik 11 bertambah `checkout > rejects a negative price` fail dan `slow one` running, dikelompokkan per `tests/a.test.mjs`/`tests/b.test.mjs`. Gambar di halaman dan pertambahan tanpa muat ulang dibuktikan uji peramban "window 1280x800 / phone 390x844: the Progress lists the run's tests one by one, which grow and count on by themselves" (ok 746, 747), yang dibaca: menambah baris ke berkas `.tests` lalu menunggu halaman berubah.
  - Butir 2 (jumlah hijau dan merah): `counts` {pass 2, fail 1, running 1} selagi berjalan; laporan lengkap proyek contoh {pass 4, fail 1, skip 1}, sama dengan ringkasan node sendiri (pass 4, fail 1, skipped 1).
  - Butir 3 (uji kerjaan sendiri): selama jalan penuh di atas, `api/progress/261028121401` penampil (`--scan ~/Workspace`) memberi daftar per berkas kerjaan, misalnya `tests/bash-description.test.mjs` dengan `kerjaan-worker asks for a description of every com...` pass, hitungan naik 8 -> 16 -> 21 -> 73 lulus.
  - Butir 4 (panduan alat lain): SETTINGS.md "Reporting each test to the board" memberi bentuk baris, arti tiap kolom, dan aturan kode keluar; perintah node di panduan dipakai apa adanya di proyek contoh dan bekerja tanpa mengubah kerjaan. Dinilai cukup untuk diikuti; tidak dicoba dengan alat uji lain sungguhan.
  - Butir 5 (proyek belum melapor): proyek contoh dengan `test_command` shell biasa: `api/progress` memberi `testsSize -1`, `tests null`, log hidup `line 1..3`; `test-run.sh` keluar 0 dan `--check` SAME. Kalimat di halaman dibuktikan uji peramban ok 748. Kalimatnya berbahasa Inggris ("This project does not report per test yet; its live output is below."): sesuai, karena seluruh penampil berbahasa Inggris dan itu dijaga `tests/english-only.test.mjs`; isinya sama dengan yang diminta.
  - Kode keluar dan sidik: proyek contoh dengan uji gagal keluar 1 lewat `test-run.sh` dan 1 dengan `node --test` biasa; berkas `.tests` di bawah `.git/`, tidak dibaca `test-run.sh`, jadi di luar sidik. Uji "keeps its exit status and its output" dibaca: membandingkan keluaran dan kode dengan dan tanpa penghubung, termasuk berkas yang tak bisa ditulis dan pipa yang ditutup pembaca.
  - Uji baru dibaca (reporters, runs, test-run): tidak ada pernyataan yang tak bisa gagal; semuanya memeriksa isi baris laporan, HTML, atau ukuran yang dikirim lewat SSE.
  - Catatan: di repo ini daftar uji baru muncul di papan bila uji dijalankan dengan `test-run.sh` yang mengenal `KERJAAN_TEST_REPORT`; plugin terpasang (1.17.0) belum, jadi sampai versi plugin berikutnya terpasang, jalan uji pengerja lewat `$K/test-run.sh` tetap tampil sebagai log saja, di bawah kalimat "This project does not report per test yet", karena skrip lama tidak memberi berkas `.tests` (kalimat itu keliru untuk repo ini sampai plugin diperbarui). Bukan pelanggaran butir: butir 3 terpenuhi dengan skrip di tiket ini.
  - Catatan: karena urutan pelaporan node (tertulis di panduan), berkas kedua dan seterusnya tampil "running"/"done" dengan daftar kosong sampai berkas sebelumnya selesai; terlihat di proyek contoh (`tests/b.test.mjs` "ended" tanpa uji selama `a` berjalan).
  - Tidak ada CLAUDE.md/AGENTS.md di akar repo.

### Suggested follow-up

- **Berkas yang sudah selesai tampil "done" tanpa uji selagi berkas sebelumnya masih berjalan.** Penghubung node meneruskan urutan laporan node, sehingga pemilik melihat berkas kosong berlabel selesai lalu ujinya muncul belakangan. Layak tiket: beri label "uji menyusul" pada berkas yang selesai tetapi belum ada ujinya, atau sembunyikan sampai ujinya datang.
