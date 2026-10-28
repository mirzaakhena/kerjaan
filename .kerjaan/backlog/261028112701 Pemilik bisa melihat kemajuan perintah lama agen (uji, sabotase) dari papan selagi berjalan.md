---
type: feature
priority: medium
review: normal
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 11:27:23
updated: 2026-10-28 11:27:52
related: [261016084202, 261017155801, 261028102201]
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
keluarannya berbentuk hasil uji, berapa yang hijau dan merah.

## Done when
- [ ] Selagi pengerja menjalankan uji proyek, kartu tiketnya punya tombol yang membuka kemajuan perintah itu
- [ ] Kemajuan menampilkan baris-baris keluaran terbaru dan bertambah sendiri tanpa memuat ulang halaman
- [ ] Kemajuan menunjukkan sudah berapa lama perintah berjalan dan berapa detik sejak keluaran terakhir, sehingga perintah yang macet terlihat berbeda dari yang bekerja
- [ ] Bila keluarannya berbentuk hasil uji yang dikenali, kemajuan menunjukkan jumlah hijau dan merah sejauh ini
- [ ] Hal yang sama berlaku untuk perintah lama lain yang dijalankan agen, misalnya skrip sabotase, bukan hanya uji proyek
- [ ] Sesudah perintah selesai, hasil akhirnya (lulus atau gagal, lama berjalan) tetap bisa dibuka dari tiket
- [ ] Rahasia yang mungkin ada di keluaran diperlakukan sesuai keputusan pemilik (lihat Notes)
- [ ] Pemilik melihat kemajuan sebuah uji yang sedang berjalan dari papan (langkah di Notes)

## History
- 2026-10-28 11:27:23 2894605e-2452-4259-b7ae-7187f1df18cb backlog

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup, sambil menunggu pengerja tiket POC tarif. Usulnya sendiri: SSE ke web, terpadu dengan papan, tombol untuk melihat log atau hijau/merah tiap uji. Viewer sudah memakai SSE (`viewer/app.mjs`).
- Akar teknisnya (dibaca dari `viewer/agents.mjs`, belum diukur): catatan agen Claude Code memuat hasil perintah hanya sesudah selesai, jadi kemajuan harus datang dari tempat lain — keluaran perintah yang ditulis ke berkas selagi berjalan, yang dibaca viewer. Itu berarti perintah lama agen harus lewat satu jalur yang mencatat keluarannya (`test-run.sh` untuk uji; untuk perintah lain perlu jalur serupa). Berkas itu bukan status, jadi tempatnya di luar `.kerjaan/` (aturan "no status summary in .kerjaan/").
- Kait dengan 261028102201 (agen menjalankan perintah lama di latar depan, bukan latar + perulangan): jalur pencatat yang sama bisa jadi cara yang diwajibkan untuk perintah lama, jadi kedua tiket sebaiknya tidak saling bertabrakan.
- Hijau/merah tiap uji bergantung pada bentuk keluaran proyek. Usulan: kenali bentuk umum (TAP, `node --test`) dan sisanya tampil sebagai log saja. Proyek seperti nukitu-mockup sudah punya halaman log hidup sendiri (`npm run uji` mencetak alamatnya di baris pertama); menautkan alamat seperti itu bisa jadi bagian dari ini.
- Pertanyaan terbuka untuk Mirza (dicatat dengan `queue.sh ask`).
- 2026-10-28 11:27:52: open question: Keluaran perintah selama ini tidak pernah tampil di papan karena bisa memuat rahasia. Untuk kemajuan perintah: tampilkan keluaran apa adanya (papan tetap hanya bisa dibuka dari komputer ini, dan dengan --lan siapa pun di jaringan itu), sembunyikan baris yang tampak seperti rahasia, atau tanpa log sama sekali (hanya lama berjalan, detik sejak keluaran terakhir, jumlah hijau/merah)?
