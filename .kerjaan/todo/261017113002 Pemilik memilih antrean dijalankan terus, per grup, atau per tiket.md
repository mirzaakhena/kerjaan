---
type: feature
priority: high
review: normal
labels: [sesi-8e6130e0, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 11:41:31
related: [261017113001, 261017113003]
blocked_by: [261017113001]
---

## Background
Saat ini, seberapa jauh antrean dijalankan tanpa menunggu pemilik hanya ditentukan dari kalimat pemilik saat memulai ("kerjakan antrean" atau "kerjakan tiket berikutnya"). Tidak ada tempat untuk menyimpan kebiasaan itu. Tidak ada pula cara menandai bahwa satu kelompok tertentu baru boleh dimulai setelah pemilik mencoba hasil kelompok sebelumnya. Selain itu, tiket dalam satu kelompok boleh dikerjakan berdampingan, tetapi berapa banyak yang benar-benar dijalankan bersamaan diserahkan pada penilaian sesi utama.

## Request
Pemilik bisa menetapkan di setelan papan apakah antrean dijalankan terus sampai habis, berhenti setelah setiap kelompok, atau berhenti setelah setiap tiket, dan berapa tiket paling banyak dikerjakan berdampingan. Sebuah kelompok di order.md bisa ditandai "menunggu pemilik", sehingga kelompok itu tidak dimulai tanpa izin pemilik. Perintah pemilik saat itu selalu menang atas tanda tersebut, dan tanda tersebut menang atas setelan. Bila setelan tidak diisi, antrean jalan terus dan jumlah tiket berdampingan tanpa batas. "Per tiket" berarti satu tiket pada satu waktu, juga di dalam satu kelompok. Batas jumlah berdampingan dijaga skrip: membuat worktree baru ditolak bila batas sudah tercapai. Butir Done when 1 sampai 4 ditunda sebagai skenario tangan: peninjau memeriksa panduan dan skripnya, pemilik mencobanya pada antrean berikutnya, dan rantai tidak ditahan.

## Done when
- [ ] Setelan papan punya pilihan "jalan terus", "per kelompok", dan "per tiket", dan setiap pilihan membuat antrean berhenti di tempat yang dijanjikan
- [ ] Setelan papan punya batas jumlah tiket yang dikerjakan berdampingan, batas 1 membuat semua tiket dikerjakan berurutan, dan membuat worktree melewati batas ditolak
- [ ] Kelompok bertanda "menunggu pemilik" tidak dimulai sebelum pemilik mengizinkan, dan izin yang sudah diberikan saat memulai antrean tidak ditanyakan lagi
- [ ] Perintah pemilik saat memulai (misalnya "satu tiket saja") menang atas tanda dan setelan
- [ ] Pemeriksaan antrean menerima tanda "menunggu pemilik" sebagai bentuk baris yang dikenal, dan menolak tanda ganda dalam satu kelompok
- [ ] Penjelasan setelan dan panduan sesi utama menjelaskan ketiga hal di atas beserta urutan prioritasnya

## History
- 2026-10-17 11:30:54 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 11:41:31 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo

## Notes
- 2026-10-17: lahir dari pembahasan pemilik dengan Claude tentang aturan dan format order.md, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Empat tiket dari sesi ini: 261017113001, 261017113002, 261017113003, 261017113004.
- 2026-10-17: rancangan yang disepakati pemilik: setelan `chain: queue | group | ticket` dan `max_parallel: <n>` di settings.md; penanda `<!-- wait-for-owner -->` di bawah kalimat pembuka kelompok yang harus menunggu. Penanda dipasang di kelompok yang ditunggu, bukan "berhenti setelah" di kelompok sebelumnya, karena kelompok sebelumnya bisa sudah hilang dari order.md saat penandanya dibutuhkan.
- 2026-10-17 11:36:13: answered question: Bila settings.md tidak mengisi pilihan jalannya antrean, yang berlaku apa? Pilihan: jalan terus, per kelompok, per tiket. Saran: jalan terus, karena itu perilaku sekarang saat pemilik berkata "kerjakan antrean", jadi papan yang sudah ada tidak berubah diam-diam.
  answer, 2026-10-17 11:41:05: Pemilik: "ikuti semua saran". bila tidak diisi, antrean jalan terus (queue).
- 2026-10-17 11:36:13: answered question: Bila batas jumlah tiket berdampingan tidak diisi, berapa? Pilihan: tanpa batas (seluruh kelompok, seperti sekarang), 2, atau 1. Saran: tanpa batas, supaya papan yang sudah ada tidak berubah perilaku; pemilik mengisi angka bila ingin membatasi.
  answer, 2026-10-17 11:41:05: Pemilik: "ikuti semua saran". bila tidak diisi, tanpa batas.
- 2026-10-17 11:36:14: answered question: Dengan pilihan "per tiket", apakah tiket satu kelompok masih dikerjakan berdampingan? Pilihan: (a) tidak, per tiket berarti satu tiket pada satu waktu, apa pun batasnya; (b) ya, berhenti setiap kali satu tiket selesai sementara yang lain masih berjalan. Saran: (a), karena berhenti di tengah tiket lain yang masih berjalan membingungkan pemilik tentang apa yang sedang ditunggu.
  answer, 2026-10-17 11:41:05: Pemilik: "ikuti semua saran". (a) per tiket berarti satu tiket pada satu waktu, juga di dalam satu kelompok.
- 2026-10-17 11:36:14: answered question: Batas jumlah tiket berdampingan dijaga oleh skrip (membuat worktree baru ditolak bila batas sudah tercapai) atau hanya tertulis di panduan sesi utama? Saran: dijaga skrip, karena aturan yang hanya tertulis mudah terlewat dan skrip worktree sudah menghitung worktree yang ada; ini menambah satu skrip ke pekerjaan tiket.
  answer, 2026-10-17 11:41:05: Pemilik: "ikuti semua saran". batas dijaga skrip: worktree.sh menolak membuat worktree baru bila batas sudah tercapai.
- 2026-10-17 11:36:14: answered question: Butir Done when 1 sampai 4 (antrean berhenti di tempat yang dijanjikan, batas 1, izin menunggu pemilik, perintah pemilik menang) hanya terbukti sungguh-sungguh saat antrean nyata dijalankan. Pilihan: (a) ditunda: peninjau memeriksa panduan dan skripnya, pemilik mencobanya pada antrean berikutnya, dan rantai jalan terus; (b) menahan rantai sampai pemilik mencobanya. Saran: (a), karena tiket 261017113003 tidak membutuhkan perilaku sesi utama itu, hanya tandanya di order.md.
  answer, 2026-10-17 11:41:06: Pemilik: "ikuti semua saran". (a) ditunda: peninjau memeriksa panduan dan skrip, pemilik mencobanya pada antrean berikutnya; rantai tidak ditahan.
- 2026-10-17 11:36:21: files estimated to change: `README.md`, `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/queue.sh`, `skills/kerjaan/scripts/worktree.sh`, `uji/queue.test.mjs`, `uji/update-ticket.test.mjs`, `uji/worktree.test.mjs`
