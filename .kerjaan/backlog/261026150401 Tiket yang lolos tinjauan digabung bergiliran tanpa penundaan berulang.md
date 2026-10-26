---
type: feature
priority: high
review: normal
labels: [merge, worktree]
reporter: mirza
assign_to: claude
created: 2026-10-26 15:04:42
updated: 2026-10-26 15:04:42
related: [261016130801, 261017113002]
blocked_by: []
---

## Background
Saat banyak tiket dikerjakan berdampingan di worktree, beberapa tiket bisa lolos tinjauan hampir bersamaan. Penggabungan ke main hanya diizinkan bila cabang tiket sudah memuat main terbaru dan uji proyek sudah lulus pada isi gabungan itu persis. Uji bisa memakan 5–10 menit dan hanya satu uji yang jalan pada satu waktu. Akibatnya, setiap kali satu tiket masuk main, tiket lain yang sudah lolos tertinggal lagi: penggabungannya ditunda, pengerja menyelaraskan dengan main dan menguji ulang, peninjau meninjau singkat, lalu sering tertinggal lagi karena tiket lain masuk lebih dulu selama ujinya berjalan. Di proyek video-system-design (26-10-2026, ±10 tiket berdampingan) satu tiket bisa tertunda empat kali berturut-turut. Tidak ada yang rusak, tetapi waktu dan token habis untuk penyelarasan berulang, dan sesi utama harus mengatur antrean penggabungan dengan tangan.

## Request
Tiket yang sudah lolos tinjauan masuk ke antrean penggabungan dan digabung ke main satu per satu dengan urutan yang jelas. Hanya tiket di depan antrean yang diselaraskan dan diuji ulang, sehingga setiap tiket paling banyak diselaraskan sekali sebelum masuk dan tidak ada tiket yang tertunda berulang karena tiket lain menyalip.

## Done when
- [ ] Saat beberapa tiket lolos tinjauan berdekatan, papan menunjukkan urutan penggabungannya, dan sesi utama mengikuti urutan itu tanpa harus menyusunnya sendiri
- [ ] Selama tiket di depan antrean sedang diselaraskan dan diuji ulang, tidak ada tiket lain yang digabung ke main lebih dulu
- [ ] Tiket di belakang antrean tidak diminta menyelaraskan sebelum gilirannya, sehingga dengan N tiket lolos bersamaan jumlah penyelarasan paling banyak N, bukan bertambah setiap kali ada tiket yang masuk
- [ ] Pembuatan dan perbaikan tiket lain tetap berjalan berdampingan; hanya langkah masuk ke main yang antre
- [ ] Bila tiket di depan antrean ditolak saat ditinjau ulang atau ujinya gagal, ia keluar dari antrean dan tiket berikutnya maju tanpa menunggu
- [ ] Panduan sesi utama dan pengerja menjelaskan antrean ini, dan skenario dengan beberapa tiket lolos bersamaan diuji otomatis

## History
- 2026-10-26 15:04:42 55ce84d0-5e6a-481d-a7c3-df4acf92bf37 backlog
## Notes
- Permintaan mirza, 2026-10-26: "Apakah problem semacam ini bisa kerap terjadi lagi dimasa depan? Apakah solusi yang kamu jalankan bisa di generalisir untuk bisa diapply di case berikutnya? karena jika iya, saya ingin kamu buat tiket untuk skill kerjaan."
- Yang dilakukan sesi utama di video-system-design sebagai jalan sementara: tiket yang lolos dicatat dalam antrean di log sesi; hanya tiket terdepan yang diminta sync → buat-indeks → test-run → pindah ke review; tiket lain diminta menunggu; setelah land, tiket berikutnya baru diminta sync.
- Gagasan lanjutan yang bisa dipertimbangkan pengerja (bukan keharusan): "kereta penggabungan" — beberapa tiket lolos digabung bersama dalam satu cabang integrasi, diuji sekali, lalu masuk main bersama; bila gagal, dipecah. Lebih cepat untuk tiket yang hanya berbagi sedikit berkas (di kasus itu hanya index.html, satu baris per tiket).
- Jebakan terkait yang ditemukan pengerja: memakai keluaran update-ticket.sh sebagai path membuat folder "REFUSED: …" bila perpindahan ditolak; dan memipakan update-ticket.sh ke tail lalu '&& git commit' membuat commit tetap jalan walau perpindahan ditolak.
