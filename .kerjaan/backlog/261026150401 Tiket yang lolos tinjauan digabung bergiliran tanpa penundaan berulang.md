---
type: feature
priority: high
review: normal
labels: [merge, worktree]
reporter: mirza
assign_to: claude
created: 2026-10-26 15:04:42
updated: 2026-10-26 15:25:02
related: [261016130801, 261017113002]
blocked_by: []
---

## Background
Saat banyak tiket dikerjakan berdampingan di worktree, beberapa tiket bisa lolos tinjauan hampir bersamaan. Penggabungan ke main hanya diizinkan bila cabang tiket sudah memuat main terbaru dan uji proyek sudah lulus pada isi gabungan itu persis. Uji bisa memakan 5–10 menit dan hanya satu uji yang jalan pada satu waktu. Akibatnya, setiap kali satu tiket masuk main, tiket lain yang sudah lolos tertinggal lagi: penggabungannya ditunda, pengerja menyelaraskan dengan main dan menguji ulang, peninjau meninjau singkat, lalu sering tertinggal lagi karena tiket lain masuk lebih dulu selama ujinya berjalan. Di proyek video-system-design (26-10-2026, ±10 tiket berdampingan) satu tiket bisa tertunda empat kali berturut-turut. Tidak ada yang rusak, tetapi waktu dan token habis untuk penyelarasan berulang, dan sesi utama harus mengatur antrean penggabungan dengan tangan.

## Request
Tiket yang sudah lolos tinjauan masuk ke antrean penggabungan dan digabung ke main satu per satu dengan urutan yang jelas. Hanya tiket di depan antrean yang diselaraskan dan diuji ulang, sehingga setiap tiket paling banyak diselaraskan sekali sebelum masuk dan tidak ada tiket yang tertunda berulang karena tiket lain menyalip. Urutannya adalah urutan lolos tinjauan: yang lolos lebih dulu digabung lebih dulu; tiket yang keluar dari antrean lalu lolos lagi masuk di belakang. Antrean dicatat di berkas papan dan keluaran skrip yang dibaca sesi utama; tampilan di viewer dan "kereta penggabungan" tidak termasuk tiket ini.

## Done when
- [ ] Saat beberapa tiket lolos tinjauan berdekatan, berkas papan dan keluaran skrip menunjukkan urutan penggabungannya, dan sesi utama mengikuti urutan itu tanpa harus menyusunnya sendiri (pemilik memeriksanya sendiri pada pemakaian nyata; rantai menunggu sampai itu dilihat)
- [ ] Selama tiket di depan antrean sedang diselaraskan dan diuji ulang, tidak ada tiket lain yang digabung ke main lebih dulu
- [ ] Tiket di belakang antrean tidak diminta menyelaraskan sebelum gilirannya, sehingga dengan N tiket lolos bersamaan jumlah penyelarasan paling banyak N, bukan bertambah setiap kali ada tiket yang masuk
- [ ] Pembuatan dan perbaikan tiket lain tetap berjalan berdampingan; hanya langkah masuk ke main yang antre
- [ ] Bila tiket di depan antrean ditolak saat ditinjau ulang atau ujinya gagal, ia keluar dari antrean dan tiket berikutnya maju tanpa menunggu; setelah diperbaiki dan lolos lagi ia masuk di belakang antrean
- [ ] Panduan sesi utama dan pengerja menjelaskan antrean ini, dan skenario dengan beberapa tiket lolos bersamaan diuji otomatis

## History
- 2026-10-26 15:04:42 55ce84d0-5e6a-481d-a7c3-df4acf92bf37 backlog
## Notes
- Permintaan mirza, 2026-10-26: "Apakah problem semacam ini bisa kerap terjadi lagi dimasa depan? Apakah solusi yang kamu jalankan bisa di generalisir untuk bisa diapply di case berikutnya? karena jika iya, saya ingin kamu buat tiket untuk skill kerjaan."
- Yang dilakukan sesi utama di video-system-design sebagai jalan sementara: tiket yang lolos dicatat dalam antrean di log sesi; hanya tiket terdepan yang diminta sync → buat-indeks → test-run → pindah ke review; tiket lain diminta menunggu; setelah land, tiket berikutnya baru diminta sync.
- Gagasan lanjutan yang bisa dipertimbangkan pengerja (bukan keharusan): "kereta penggabungan" — beberapa tiket lolos digabung bersama dalam satu cabang integrasi, diuji sekali, lalu masuk main bersama; bila gagal, dipecah. Lebih cepat untuk tiket yang hanya berbagi sedikit berkas (di kasus itu hanya index.html, satu baris per tiket).
- Jebakan terkait yang ditemukan pengerja: memakai keluaran update-ticket.sh sebagai path membuat folder "REFUSED: …" bila perpindahan ditolak; dan memipakan update-ticket.sh ke tail lalu '&& git commit' membuat commit tetap jalan walau perpindahan ditolak.
- 2026-10-26 15:10:18: answered question: Butir pertama Done when bilang 'papan menunjukkan urutan penggabungannya'. Di mana pemilik melihatnya? (a) di berkas papan dan keluaran skrip saja, yang dibaca sesi utama; tampilan di viewer jadi tiket terpisah; (b) juga di viewer, misalnya kartu done yang menunggu digabung diberi nomor antrean. Saran: (a), karena viewer sudah menandai tiket done yang belum masuk main, dan menambah tampilan viewer memperlebar tiket ini ke berkas viewer sehingga lebih lama ditinjau.
  answer, 2026-10-26 15:24:41: (a) "Berkas & skrip saja" — hanya di berkas papan dan keluaran skrip yang dibaca sesi utama; tampilan viewer jadi tiket terpisah.
- 2026-10-26 15:10:18: answered question: Urutan antrean ditentukan oleh apa? (a) urutan tiket lolos tinjauan: yang lolos lebih dulu digabung lebih dulu; (b) mengikuti baris lands-first di order.md bila ada, baru urutan lolos. Saran: (a), karena panduan sudah menyebut lands-first sebagai rencana, bukan kunci, dan menunggu tiket yang belum lolos justru menimbulkan penundaan yang ingin dihapus tiket ini.
  answer, 2026-10-26 15:24:41: (a) "Urutan lulus tinjauan" — yang lulus duluan, digabung duluan.
- 2026-10-26 15:10:19: answered question: Tiket depan antrean yang ditolak atau gagal uji keluar dari antrean (butir 5). Setelah diperbaiki dan lolos lagi, ia masuk di mana? (a) di belakang antrean, seperti tiket yang baru lolos; (b) kembali ke depan. Saran: (a), karena adil dan sederhana, dan tidak membuat tiket lain yang sudah menunggu tertunda lagi.
  answer, 2026-10-26 15:24:42: (a) "Di belakang" — seperti tiket yang baru lulus.
- 2026-10-26 15:10:19: answered question: Catatan menyebut 'kereta penggabungan' (beberapa tiket lolos digabung dalam satu cabang, diuji sekali, masuk bersama) sebagai gagasan yang boleh dipertimbangkan. Masuk tiket ini atau tidak? (a) tidak: tiket ini hanya antrean satu per satu, kereta jadi tiket terpisah bila nanti masih terasa lambat; (b) boleh, bila pengerja menilainya cocok. Saran: (a), karena kereta mengubah cara uji dan tinjauan sekaligus, dan bila dibiarkan pilihan pengerja tiket ini bisa melebar tanpa batas yang jelas.
  answer, 2026-10-26 15:24:42: (a) "Tidak, tiket terpisah" — tiket ini hanya antrean satu per satu; merge train jadi tiketnya sendiri bila masih lambat.
- 2026-10-26 15:10:19: answered question: Butir 1 ('sesi utama mengikuti urutan itu tanpa menyusunnya sendiri') hanya benar-benar terbukti saat beberapa tiket berjalan berdampingan sungguhan. Apakah itu (a) ditunda: skenario uji otomatis di butir 6 cukup untuk lulus, dan pemakaian sungguhan dicatat sebagai skenario tangan yang dicek pada batch berdampingan berikutnya; atau (b) menahan rantai sampai pemilik melihatnya sendiri? Saran: (a), karena papan ini jarang menjalankan banyak tiket berdampingan, sehingga menahan rantai bisa berarti menunggu berhari-hari.
  answer, 2026-10-26 15:24:42: (b) "Tahan rantai" — rantai menunggu sampai pemilik melihat sendiri pemakaian nyata (kriteria 1) saat beberapa tiket berjalan berdampingan.
- 2026-10-26 15:10:26: files estimated to change: `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `README.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/merge.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `tests/merge.test.mjs`, `tests/update-ticket.test.mjs`
- Catatan penyusun antrean untuk pengerja (2026-10-26): (1) gerbang mulai di update-ticket.sh kini menolak memulai tiket baru selama ada cabang tiket done yang belum masuk main, kecuali yang ditahan untuk pemilik; tiket yang menunggu di antrean penggabungan harus dikecualikan juga, atau butir 4 gagal. (2) Panduan skill dibatasi anggaran kata yang diuji tests/skill-size.test.mjs, dan teks skill harus berbahasa Inggris (tests/english-only.test.mjs). (3) Estimasi belum memuat berkas viewer; bila pemilik memilih tampilan di viewer (pertanyaan 1), estimasi diperbarui.
- 2026-10-26 15:25:02: open question: Jawaban #5 (tahan rantai) bertemu satu kendala: antrean baru bisa dipakai sungguhan setelah tiket ini masuk main dan plugin yang terpasang, padahal butir yang ditahan membuat peninjau tidak boleh meluluskannya sebelum pemilik melihat pemakaian nyata. Jalan mana? (a) tiket boleh lolos dan digabung berdasarkan uji otomatis, lalu rantai berhenti setelahnya: tiket berdampingan berikutnya tidak dimulai sampai pemilik sudah melihat antrean bekerja pada batch berdampingan pertama, dan butir 1 dicentang saat itu; (b) sebelum lolos, pengerja menyiapkan peragaan sungguhan di proyek percobaan dengan beberapa tiket berdampingan, dan pemilik menontonnya sebelum tinjauan selesai; (c) kembali ke 'ditunda'. Saran: (a), karena itu tetap menahan rantai seperti keinginan pemilik tanpa membuat tiket ini menunggu fitur yang baru ada setelah ia sendiri masuk main.
