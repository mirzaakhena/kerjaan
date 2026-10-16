Batch penilaian skill (sesi a192c9e8). 261016141916 tidak ada di sini: tiket keputusan itu dijalankan langsung dari backlog di awal rantai, selama pemilik hadir.

**Aturan commit, jalan pintas pemilik, dan hook pengingat peninjau.** Ketiganya tidak saling menunggu hasil; 261016141907 dan 261016141908 berbagi SKILL.md, foreman.md, kerjaan-worker.md, merge.sh dan uji/merge.test.mjs, dan 261016141913 berbagi foreman.md dengan keduanya, jadi 261016141907 digabung lebih dulu, lalu 261016141908 digabung sebelum 261016141913.
<!-- lands-first: 261016141913 -->

- 261016141913 Peninjau pasti dipanggil setelah pengerja menyelesaikan tiket

**Perampingan, setelah semua aturan dan skrip di atas masuk main.** Semua penghalangnya ada di grup sebelumnya; 261016141910 dan 261016141909 berbagi kerjaan-reviewer.md dan review.md, 261016141914 dan 261016141909 berbagi references/repairs.md, jadi 261016141910 digabung lebih dulu, lalu 261016141914 digabung sebelum 261016141909.
<!-- lands-first: 261016141910, 261016141914, 261016141909 -->

- 261016141910 Aturan peninjau tidak lagi tersalin di beberapa tempat
- 261016141914 Skrip papan berbagi satu pustaka untuk pekerjaan yang sama
- 261016141909 Skill hanya memuat aturan yang dibutuhkan permintaan saat itu

**Terakhir, anggaran kata yang diukur setelah perampingan, dan deskripsi skill yang diuji terhadap skill akhirnya.** Keduanya tidak berbagi berkas dan tidak saling menunggu.

- 261016141911 Ukuran total aturan skill terjaga di bawah anggaran
- 261011073101 Deskripsi skill dipangkas tanpa membuat skill lebih jarang terpanggil
