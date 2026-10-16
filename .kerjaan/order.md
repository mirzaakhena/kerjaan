Batch penilaian skill (sesi a192c9e8). 261016141916 tidak ada di sini: tiket keputusan itu dijalankan langsung dari backlog di awal rantai, selama pemilik hadir.

**Dua perbaikan skrip dan riwayat bersesi lebih dulu, karena semua tiket sesudahnya menulis ke tiket lewat kode ini, dan pemilik memprioritaskan riwayat bersesi.** Ketiganya tidak saling menunggu hasil; 261016141901 dan 261016141902 sama-sama mengubah lib.sh, update-ticket.sh, test-run.sh, uji/update-ticket.test.mjs dan uji/test-run.test.mjs, dan 261016144601 berbagi update-ticket.sh dan uji/update-ticket.test.mjs dengan keduanya, jadi 261016141901 digabung lebih dulu, lalu 261016144601 digabung sebelum 261016141902.

- 261016141902 Pekerjaan berdampingan yang mulai bersamaan tidak saling menimpa catatan papan

**Lalu rilis, penghapusan penjelasan pemilik, dan uji skrip papan, bersamaan.** Rilis membawa grup pertama dan empat tiket sebelumnya, penghapusan membuat tiket aturan sesudahnya tidak perlu mengurus fitur itu, dan uji ditulis atas perilaku yang sudah diperbaiki; 261016141903 dan 261016141904 berbagi SKILL.md, README.md dan foreman.md, dan ketiganya berbagi README.md, jadi 261016141903 digabung lebih dulu, lalu 261016141915 digabung sebelum 261016141904.

- 261016141903 Pekerjaan yang sudah masuk main sampai ke plugin yang terpasang
- 261016141904 Fitur penjelasan pemilik dihapus dari kerjaan
- 261016141915 Skrip yang paling sering mengubah papan punya uji sendiri

**Aturan antrean dan review.** Ketiganya tidak saling menunggu hasil; 261016141912 dan 261016141905 berbagi queue.sh, uji/queue.test.mjs, ordering-the-queue.md, kerjaan-planner.md dan SKILL.md, 261016141905 dan 261016141906 berbagi foreman.md, review.md dan kerjaan-worker.md, 261016141912 dan 261016141906 berbagi parallel-work.md, jadi 261016141912 digabung lebih dulu, lalu 261016141905 digabung sebelum 261016141906.

- 261016141912 Urutan penggabungan ditulis dengan penanda tetap, bukan kalimat bebas
- 261016141905 Syarat tiket siap dikerjakan hanya punya satu definisi
- 261016141906 Putaran review dihitung sama oleh mandor, peninjau, dan hook

**Aturan commit, jalan pintas pemilik, dan hook pengingat peninjau.** Ketiganya tidak saling menunggu hasil; 261016141907 dan 261016141908 berbagi SKILL.md, foreman.md, kerjaan-worker.md, merge.sh dan uji/merge.test.mjs, dan 261016141913 berbagi foreman.md dengan keduanya, jadi 261016141907 digabung lebih dulu, lalu 261016141908 digabung sebelum 261016141913.

- 261016141907 Setiap perpindahan papan tersimpan bersama pekerjaannya, juga saat kerja berdampingan
- 261016141908 Jalan pintas dari pemilik punya aturan yang jelas
- 261016141913 Peninjau pasti dipanggil setelah pengerja menyelesaikan tiket

**Perampingan, setelah semua aturan dan skrip di atas masuk main.** Semua penghalangnya ada di grup sebelumnya; 261016141910 dan 261016141909 berbagi kerjaan-reviewer.md dan review.md, 261016141914 dan 261016141909 berbagi references/repairs.md, jadi 261016141910 digabung lebih dulu, lalu 261016141914 digabung sebelum 261016141909.

- 261016141910 Aturan peninjau tidak lagi tersalin di beberapa tempat
- 261016141914 Skrip papan berbagi satu pustaka untuk pekerjaan yang sama
- 261016141909 Skill hanya memuat aturan yang dibutuhkan permintaan saat itu

**Terakhir, anggaran kata yang diukur setelah perampingan, dan deskripsi skill yang diuji terhadap skill akhirnya.** Keduanya tidak berbagi berkas dan tidak saling menunggu.

- 261016141911 Ukuran total aturan skill terjaga di bawah anggaran
- 261011073101 Deskripsi skill dipangkas tanpa membuat skill lebih jarang terpanggil
