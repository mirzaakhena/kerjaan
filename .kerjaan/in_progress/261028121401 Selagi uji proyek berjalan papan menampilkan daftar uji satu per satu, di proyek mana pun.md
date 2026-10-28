---
type: feature
priority: medium
review: normal
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 12:14:46
updated: 2026-10-28 17:06:06
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
- [ ] Selagi uji proyek berjalan, kemajuannya di papan menampilkan daftar uji satu per satu, dikelompokkan per berkas uji: apa yang diuji masing-masing (nama ujinya seperti ditulis pembuatnya), yang sedang berjalan, yang sudah hijau atau merah, dan lama masing-masing, bertambah sendiri tanpa memuat ulang halaman
- [ ] Kemajuan itu menunjukkan jumlah uji hijau dan merah sejauh ini
- [ ] Uji kerjaan sendiri muncul di daftar itu selagi berjalan
- [ ] Cara sebuah proyek dengan alat uji lain ikut melapor tertulis di panduan, dan bisa diikuti tanpa mengubah kerjaan
- [ ] Selagi uji proyek yang belum melapor per uji berjalan, papan menyebut "proyek ini belum melapor per uji" dan tetap menampilkan log hidupnya, dan jalan ujinya tidak gagal karena itu
- [ ] ~~Sesudah jalan uji selesai, daftar ujinya tetap bisa dibuka dari tiket bersama hasil akhirnya~~ (dibatalkan pemilik 28 Okt 2026 lewat jawaban 261028112701 #4: jalan uji tidak disimpan, hanya dilihat selagi tiket di in_progress atau review)
- [ ] ~~Pemilik melihat daftar uji sebuah tiket bertambah selagi ujinya berjalan (langkah di Notes)~~ (dibatalkan pemilik 28 Okt 2026: butir yang hanya bisa dicek orang dihapus)

## History
- 2026-10-28 12:14:46 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 12:47:44 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 17:06:06 a185f853-6a65-4f44-919d-97ba97774e43 in_progress

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
