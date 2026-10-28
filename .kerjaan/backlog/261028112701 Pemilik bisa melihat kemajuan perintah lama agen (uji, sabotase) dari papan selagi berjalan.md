---
type: feature
priority: medium
review: normal
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 11:27:23
updated: 2026-10-28 12:16:49
related: [261016084202, 261017155801, 261028102201, 261028121401, 261028121402]
blocked_by: []
---

## Background
Papan di peramban sudah menunjukkan langkah terakhir agen pada tiap tiket
(261016084202): misalnya "● worker · Menjalankan uji · 12 dtk lalu". Tapi
sebagian besar waktu pengerja habis di satu langkah yang lama: jalan uji
proyek, atau skrip yang membuang penjaga satu per satu untuk membuktikan
ujinya bisa merah. Satu langkah seperti itu bisa berjalan tujuh menit atau
lebih. Selama itu papan hanya menunjukkan langkah yang sama dengan waktu yang
terus bertambah, jadi agen yang sedang menguji tampak sama dengan agen yang
macet.

Catatan langkah agen baru memuat hasil sebuah perintah sesudah perintah itu
selesai, jadi papan tidak bisa membaca kemajuannya dari sana. Papan juga
sengaja tidak pernah menampilkan isi perintah atau hasilnya, karena bisa
memuat rahasia (261016084202, 261017155801).

Pemilik (28 Okt 2026) sering gelisah menunggu pengerja dan ingin yakin
pengerja benar-benar bekerja: melihat log uji yang sedang berjalan, atau
hijau/merah tiap uji, dari papan.

## Request
Selagi agen menjalankan perintah yang lama, pemilik bisa membuka kemajuannya
dari kartu tiket di papan dan melihatnya bergerak sendiri: keluaran
terbarunya, berapa lama sudah berjalan, kapan terakhir ada keluaran, dan bila
keluarannya berbentuk hasil uji, berapa yang hijau dan merah (daftar ujinya
satu per satu: 261028121401).

Untuk uji, pemilik tidak cukup hanya melihat jumlah hijau dan merah: ia ingin
melihat daftar ujinya satu per satu, yaitu apa yang diuji oleh masing-masing
uji, uji mana yang sedang berjalan, mana yang sudah hijau atau merah, dan
berapa lama masing-masing. Ini harus berlaku di proyek mana pun yang memakai
papan, bukan hanya di proyek yang kebetulan memakai satu alat uji tertentu.
Setiap uji yang dibuat harus melaporkan dirinya ke papan selagi berjalan, dan
harus ada jaminan bahwa uji yang tidak melapor tidak bisa lolos diam-diam.
Tiket ini memuat bagian pertama: kemajuan perintah itu sendiri. Daftar uji
satu per satu ada di 261028121401, jaminannya di 261028121402.

## Done when
- [ ] Selagi pengerja menjalankan uji proyek, kartu tiketnya punya tombol yang membuka kemajuan perintah itu
- [ ] Kemajuan menampilkan baris-baris keluaran terbaru dan bertambah sendiri tanpa memuat ulang halaman
- [ ] Kemajuan menunjukkan sudah berapa lama perintah berjalan dan berapa detik sejak keluaran terakhir, sehingga perintah yang macet terlihat berbeda dari yang bekerja
- [ ] ~~Bila keluarannya berbentuk hasil uji yang dikenali, kemajuan menunjukkan jumlah hijau dan merah sejauh ini~~ (pindah ke 261028121401)
- [ ] Hal yang sama berlaku untuk perintah lama lain yang dijalankan agen, misalnya skrip sabotase, bukan hanya uji proyek
- [ ] Sesudah perintah selesai, hasil akhirnya (lulus atau gagal, lama berjalan) tetap bisa dibuka dari tiket
- [ ] Rahasia yang mungkin ada di keluaran diperlakukan sesuai keputusan pemilik (lihat Notes)
- [ ] Pemilik melihat kemajuan sebuah uji yang sedang berjalan dari papan (langkah di Notes)
- [ ] ~~Selagi uji proyek berjalan, papan menampilkan daftar uji satu per satu: apa yang diuji masing-masing, yang sedang berjalan, yang sudah hijau atau merah, dan lama masing-masing, bertambah sendiri~~ (pindah ke 261028121401)
- [ ] ~~Hal itu berlaku di proyek mana pun yang memakai papan, apa pun alat ujinya, dan cara sebuah proyek ikut melapor tertulis di panduan~~ (pindah ke 261028121401)
- [ ] ~~Uji baru yang tidak melapor ke papan membuat jalan uji gagal atau ditolak peninjau, sehingga tidak ada uji yang lolos tanpa terlihat di papan~~ (pindah ke 261028121402)

## History
- 2026-10-28 11:27:23 2894605e-2452-4259-b7ae-7187f1df18cb backlog

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup, sambil menunggu pengerja tiket POC tarif. Usulnya sendiri: SSE ke web, terpadu dengan papan, tombol untuk melihat log atau hijau/merah tiap uji. Viewer sudah memakai SSE (`viewer/app.mjs`).
- Akar teknisnya (dibaca dari `viewer/agents.mjs`, belum diukur): catatan agen Claude Code memuat hasil perintah hanya sesudah selesai, jadi kemajuan harus datang dari tempat lain — keluaran perintah yang ditulis ke berkas selagi berjalan, yang dibaca viewer. Itu berarti perintah lama agen harus lewat satu jalur yang mencatat keluarannya (`test-run.sh` untuk uji; untuk perintah lain perlu jalur serupa). Berkas itu bukan status, jadi tempatnya di luar `.kerjaan/` (aturan "no status summary in .kerjaan/").
- Kait dengan 261028102201 (agen menjalankan perintah lama di latar depan, bukan latar + perulangan): jalur pencatat yang sama bisa jadi cara yang diwajibkan untuk perintah lama, jadi kedua tiket sebaiknya tidak saling bertabrakan.
- Hijau/merah tiap uji bergantung pada bentuk keluaran proyek. Usulan: kenali bentuk umum (TAP, `node --test`) dan sisanya tampil sebagai log saja. Proyek seperti nukitu-mockup sudah punya halaman log hidup sendiri (`npm run uji` mencetak alamatnya di baris pertama); menautkan alamat seperti itu bisa jadi bagian dari ini.
- Pertanyaan terbuka untuk Mirza (dicatat dengan `queue.sh ask`).
- 2026-10-28 11:27:52: answered question: Keluaran perintah selama ini tidak pernah tampil di papan karena bisa memuat rahasia. Untuk kemajuan perintah: tampilkan keluaran apa adanya (papan tetap hanya bisa dibuka dari komputer ini, dan dengan --lan siapa pun di jaringan itu), sembunyikan baris yang tampak seperti rahasia, atau tanpa log sama sekali (hanya lama berjalan, detik sejak keluaran terakhir, jumlah hijau/merah)?
  answer, 2026-10-28 11:28:43: Log apa adanya: keluaran tampil seperti di terminal. Papan hanya terbuka dari Mac ini; dengan --lan siapa pun di jaringan itu ikut membaca, dan papan sudah memperingatkannya.
- Diperluas atas permintaan mirza, 2026-10-28 (sesi a185f853-6a65-4f44-919d-97ba97774e43), kata-katanya: "untuk tiket 2701 khusus soal test, saya ingin bukan hanya 'berapa banyak yang green atau red' tetapi juga apa saja yang diuji untuk masing-masingnya. mirip seperti /Users/mirza/Workspace/nukitu-mockup/test/uji-ui.mjs tapi bisa dibuat lebih baik dan bisa berfungsi secara general untuk segala project. Intinya, setiap test yang dibuat harus menyertakan sse event sehingga bisa dibuka oleh viewer. Harus ada jaminan agar test selalu menyertakan sse event ini." Tiga butir terakhir Done when berasal dari sini.
- Contoh rujukan pemilik: `nukitu-mockup/test/uji-ui.mjs` dengan `test/laporan.mjs` dan `laporan-halaman.mjs`. Pelari uji itu melapor mulai/selesai tiap wilayah dan tiap uji ke log hidup (server HTTP sendiri di porta pilihan sistem, halaman di peramban, catatan di `test/log/`), dengan perkiraan jumlah uji dari run terakhir. Yang diminta: versi umum yang dibaca viewer kerjaan, bukan server per proyek.
- Dengan perluasan ini tiket memuat 11 butir, di atas batas 8: planner memecahnya per hasil.
- Dipecah oleh planner (28 Okt 2026, sesi a185f853-6a65-4f44-919d-97ba97774e43) per hasil: tiket ini tetap kemajuan perintah lama (log hidup, lama berjalan, hasil akhir); daftar uji satu per satu dan jumlah hijau/merah pindah ke 261028121401; jaminan bahwa uji yang tidak melapor membuat jalan uji gagal pindah ke 261028121402. Butir yang pindah dicoret di Done when.
- 2026-10-28 12:15:49: files estimated to change: `README.md`, `skills/kerjaan/scripts/test-run.sh`, `tests/test-run.test.mjs`, `viewer/app.mjs`, `viewer/runs.mjs`, `viewer/tests/helpers.mjs`, `viewer/tests/runs.test.mjs`, `viewer/web/drawer.js`, `viewer/web/project.js`, `viewer/web/run.js`, `viewer/web/style.css`
- 2026-10-28 12:16:48: open question: Perintah lama mana saja yang kemajuannya tampil di papan? Saran: semua jalan uji yang lewat jalur uji kerjaan, yaitu jalan uji pengerja dan setiap jalan uji peninjau, termasuk sabotase (peninjau sudah wajib menjalankan sabotase lewat jalur itu), karena tidak perlu aturan baru untuk agen yang aturannya sudah hampir penuh; butir Done when ke-5 lalu ditulis ulang sebagai 'jalan uji peninjau, termasuk sabotase'. Pilihan lain: juga perintah lama apa pun di luar uji (memasang paket, build), yang butuh jalur baru dan aturan baru di ketiga definisi agen, sehingga aturan lain harus dipangkas dulu.
- 2026-10-28 12:16:48: open question: Tombol di kartu membuka kemajuan di mana? Saran: di laci kanan tiket itu, langsung di bagian Kemajuan, karena pemilik sudah biasa membuka tiket di sana dan langkah agen sudah tampil di laci yang sama. Pilihan lain: halaman sendiri yang bisa dibuka di tab lain dan dibiarkan terbuka.
- 2026-10-28 12:16:48: open question: Berapa lama hasil sebuah jalan uji disimpan agar tetap bisa dibuka dari tiket? Saran: 10 jalan terakhir per tiket, tetap bisa dibuka sesudah tiket selesai, disimpan di folder git proyek (tidak ikut commit, tidak di .kerjaan/), karena cukup untuk melihat ronde tinjauan terakhir tanpa memenuhi disk. Pilihan lain: hanya jalan terakhir per tiket; atau semua jalan tanpa batas.
- 2026-10-28 12:16:49: open question: Butir 'Pemilik melihat kemajuan sebuah uji yang sedang berjalan dari papan' hanya bisa dicek orang. Saran: ditunda, yaitu pengerja menulis langkahnya sebagai skenario tangan dan rantai berjalan terus, karena tiket berikutnya tidak bergantung pada pengecekan ini. Pilihan lain: rantai berhenti sampai pemilik mengeceknya sendiri.
