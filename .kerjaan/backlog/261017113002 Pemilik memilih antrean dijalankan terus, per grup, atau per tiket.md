---
type: feature
priority: high
review:
labels: [sesi-8e6130e0, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 11:31:42
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
