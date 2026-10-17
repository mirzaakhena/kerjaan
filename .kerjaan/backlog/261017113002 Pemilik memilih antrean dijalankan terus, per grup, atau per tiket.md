---
type: feature
priority: high
review:
labels: [sesi-8e6130e0, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 11:36:22
related: [261017113001, 261017113003]
blocked_by: [261017113001]
---

## Background
Saat ini, seberapa jauh antrean dijalankan tanpa menunggu pemilik hanya ditentukan dari kalimat pemilik saat memulai ("kerjakan antrean" atau "kerjakan tiket berikutnya"). Tidak ada tempat untuk menyimpan kebiasaan itu. Tidak ada pula cara menandai bahwa satu kelompok tertentu baru boleh dimulai setelah pemilik mencoba hasil kelompok sebelumnya. Selain itu, tiket dalam satu kelompok boleh dikerjakan berdampingan, tetapi berapa banyak yang benar-benar dijalankan bersamaan diserahkan pada penilaian sesi utama.

## Request
Pemilik bisa menetapkan di setelan papan apakah antrean dijalankan terus sampai habis, berhenti setelah setiap kelompok, atau berhenti setelah setiap tiket, dan berapa tiket paling banyak dikerjakan berdampingan. Sebuah kelompok di order.md bisa ditandai "menunggu pemilik", sehingga kelompok itu tidak dimulai tanpa izin pemilik. Perintah pemilik saat itu selalu menang atas tanda tersebut, dan tanda tersebut menang atas setelan.

## Done when
- [ ] Setelan papan punya pilihan "jalan terus", "per kelompok", dan "per tiket", dan setiap pilihan membuat antrean berhenti di tempat yang dijanjikan
- [ ] Setelan papan punya batas jumlah tiket yang dikerjakan berdampingan, dan batas 1 membuat semua tiket dikerjakan berurutan
- [ ] Kelompok bertanda "menunggu pemilik" tidak dimulai sebelum pemilik mengizinkan, dan izin yang sudah diberikan saat memulai antrean tidak ditanyakan lagi
- [ ] Perintah pemilik saat memulai (misalnya "satu tiket saja") menang atas tanda dan setelan
- [ ] Pemeriksaan antrean menerima tanda "menunggu pemilik" sebagai bentuk baris yang dikenal, dan menolak tanda ganda dalam satu kelompok
- [ ] Penjelasan setelan dan panduan sesi utama menjelaskan ketiga hal di atas beserta urutan prioritasnya

## History
- 2026-10-17 11:30:54 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog

## Notes
- 2026-10-17: lahir dari pembahasan pemilik dengan Claude tentang aturan dan format order.md, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Empat tiket dari sesi ini: 261017113001, 261017113002, 261017113003, 261017113004.
- 2026-10-17: rancangan yang disepakati pemilik: setelan `chain: queue | group | ticket` dan `max_parallel: <n>` di settings.md; penanda `<!-- wait-for-owner -->` di bawah kalimat pembuka kelompok yang harus menunggu. Penanda dipasang di kelompok yang ditunggu, bukan "berhenti setelah" di kelompok sebelumnya, karena kelompok sebelumnya bisa sudah hilang dari order.md saat penandanya dibutuhkan.
- 2026-10-17 11:36:13: open question: Bila settings.md tidak mengisi pilihan jalannya antrean, yang berlaku apa? Pilihan: jalan terus, per kelompok, per tiket. Saran: jalan terus, karena itu perilaku sekarang saat pemilik berkata "kerjakan antrean", jadi papan yang sudah ada tidak berubah diam-diam.
- 2026-10-17 11:36:13: open question: Bila batas jumlah tiket berdampingan tidak diisi, berapa? Pilihan: tanpa batas (seluruh kelompok, seperti sekarang), 2, atau 1. Saran: tanpa batas, supaya papan yang sudah ada tidak berubah perilaku; pemilik mengisi angka bila ingin membatasi.
- 2026-10-17 11:36:14: open question: Dengan pilihan "per tiket", apakah tiket satu kelompok masih dikerjakan berdampingan? Pilihan: (a) tidak, per tiket berarti satu tiket pada satu waktu, apa pun batasnya; (b) ya, berhenti setiap kali satu tiket selesai sementara yang lain masih berjalan. Saran: (a), karena berhenti di tengah tiket lain yang masih berjalan membingungkan pemilik tentang apa yang sedang ditunggu.
- 2026-10-17 11:36:14: open question: Batas jumlah tiket berdampingan dijaga oleh skrip (membuat worktree baru ditolak bila batas sudah tercapai) atau hanya tertulis di panduan sesi utama? Saran: dijaga skrip, karena aturan yang hanya tertulis mudah terlewat dan skrip worktree sudah menghitung worktree yang ada; ini menambah satu skrip ke pekerjaan tiket.
- 2026-10-17 11:36:14: open question: Butir Done when 1 sampai 4 (antrean berhenti di tempat yang dijanjikan, batas 1, izin menunggu pemilik, perintah pemilik menang) hanya terbukti sungguh-sungguh saat antrean nyata dijalankan. Pilihan: (a) ditunda: peninjau memeriksa panduan dan skripnya, pemilik mencobanya pada antrean berikutnya, dan rantai jalan terus; (b) menahan rantai sampai pemilik mencobanya. Saran: (a), karena tiket 261017113003 tidak membutuhkan perilaku sesi utama itu, hanya tandanya di order.md.
- 2026-10-17 11:36:21: files estimated to change: `README.md`, `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/queue.sh`, `skills/kerjaan/scripts/worktree.sh`, `uji/queue.test.mjs`, `uji/update-ticket.test.mjs`, `uji/worktree.test.mjs`
