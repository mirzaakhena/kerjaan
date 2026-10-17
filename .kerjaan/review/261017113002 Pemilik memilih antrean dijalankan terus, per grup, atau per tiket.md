---
type: feature
priority: high
review: normal
labels: [sesi-8e6130e0, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 11:30:54
updated: 2026-10-17 19:35:51
related: [261017113001, 261017113003]
blocked_by: [261017113001]
---

## Background
Saat ini, seberapa jauh antrean dijalankan tanpa menunggu pemilik hanya ditentukan dari kalimat pemilik saat memulai ("kerjakan antrean" atau "kerjakan tiket berikutnya"). Tidak ada tempat untuk menyimpan kebiasaan itu. Tidak ada pula cara menandai bahwa satu kelompok tertentu baru boleh dimulai setelah pemilik mencoba hasil kelompok sebelumnya. Selain itu, tiket dalam satu kelompok boleh dikerjakan berdampingan, tetapi berapa banyak yang benar-benar dijalankan bersamaan diserahkan pada penilaian sesi utama.

## Request
Pemilik bisa menetapkan di setelan papan apakah antrean dijalankan terus sampai habis, berhenti setelah setiap kelompok, atau berhenti setelah setiap tiket, dan berapa tiket paling banyak dikerjakan berdampingan. Sebuah kelompok di order.md bisa ditandai "menunggu pemilik", sehingga kelompok itu tidak dimulai tanpa izin pemilik. Perintah pemilik saat itu selalu menang atas tanda tersebut, dan tanda tersebut menang atas setelan. Bila setelan tidak diisi, antrean jalan terus dan jumlah tiket berdampingan tanpa batas. "Per tiket" berarti satu tiket pada satu waktu, juga di dalam satu kelompok. Batas jumlah berdampingan dijaga skrip: membuat worktree baru ditolak bila batas sudah tercapai. Butir Done when 1 sampai 4 ditunda sebagai skenario tangan: peninjau memeriksa panduan dan skripnya, pemilik mencobanya pada antrean berikutnya, dan rantai tidak ditahan.

## Done when
- [ ] Setelan papan punya pilihan "jalan terus", "per kelompok", dan "per tiket", dan setiap pilihan membuat antrean berhenti di tempat yang dijanjikan — menunggu mirza: skenario tangan di Notes
- [ ] Setelan papan punya batas jumlah tiket yang dikerjakan berdampingan, batas 1 membuat semua tiket dikerjakan berurutan, dan membuat worktree melewati batas ditolak — menunggu mirza: skenario tangan di Notes
- [ ] Kelompok bertanda "menunggu pemilik" tidak dimulai sebelum pemilik mengizinkan, dan izin yang sudah diberikan saat memulai antrean tidak ditanyakan lagi — menunggu mirza: skenario tangan di Notes
- [ ] Perintah pemilik saat memulai (misalnya "satu tiket saja") menang atas tanda dan setelan — menunggu mirza: skenario tangan di Notes
- [x] Pemeriksaan antrean menerima tanda "menunggu pemilik" sebagai bentuk baris yang dikenal, dan menolak tanda ganda dalam satu kelompok
- [x] Penjelasan setelan dan panduan sesi utama menjelaskan ketiga hal di atas beserta urutan prioritasnya

## History
- 2026-10-17 11:30:54 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 11:41:31 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 19:05:20 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 19:35:51 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review

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
- 2026-10-17: pengerjaan (worker), ringkasan:
  - Setelan: `chain: queue | group | ticket` (kosong = queue) dan `max_parallel: <n>` (kosong = tanpa batas) di SETTINGS.md, dibaca lib.sh (`kerjaan_chain_mode`, `kerjaan_max_parallel`, `kerjaan_parallel_limit`). `chain: ticket` membuat batas 1 apa pun isi `max_parallel`.
  - `worktree.sh add` menghitung worktree tertaut yang foldernya masih ada, di bawah kunci `worktrees`, dan menolak (exit 1, tidak ada folder/cabang dibuat) bila jumlahnya sudah mencapai batas, sambil menyebut worktree yang dipakai. Nilai yang tak terbaca ditolak dengan exit 2. Keputusan: yang dihitung worktree, bukan tiket di in_progress, sesuai jawaban pemilik ("skrip worktree sudah menghitung worktree yang ada"); tiket yang dikerjakan di main tree tidak dihitung, karena tiket berdampingan selalu di worktree.
  - Penanda `<!-- wait-for-owner -->`: bentuk baris keenam tata bahasa order.md. `queue.sh check` menerimanya di mana saja dalam kelompok, menolak (nomor baris) yang di luar kelompok, yang kedua dalam satu kelompok, dan yang mirip tapi tak terbaca; lalu menyebut setiap kelompok yang menunggu, dan "has started" bila ada tiketnya yang sedang jalan. `check` tanpa ID juga melaporkan nilai `chain`/`max_parallel` yang tak terbaca.
  - update-ticket.sh tidak perlu diubah: penanda ikut terhapus bersama kelompoknya dan tidak pindah ke kelompok berikutnya (diuji). board.mjs `readOrderGroups` memberi `waitForOwner`; urutan.test.mjs membandingkannya dengan check.
  - Panduan: foreman.md bagian baru "How far the chain runs" (urutan prioritas: perintah pemilik > penanda > setelan; izin di awal dicatat di Notes tiket kelompok itu dan tidak ditanya lagi), langkah 2 menanyakan kelompok yang menunggu; tabel tata bahasa di ordering-the-queue.md; planner dan parallel-work menyebutnya; README. Anggaran kata dibayar dengan membuang bagian "Why this is not a banned index", paragraf yang mengulang "While tickets are worked on", dan beberapa kalimat ganda; total 17960/18000 setelah 261017155801 masuk.
  - Penjaga yang sengaja dirusak, dan uji yang memerah: perbandingan batas `-ge` diganti `-gt` (worktree: 6 uji batas); cabang `chain: ticket` dimatikan (uji chain: ticket); validasi `max_parallel` dan `chain` dimatikan masing-masing (uji worktree nilai tak terbaca + uji check settings); syarat folder masih ada dibuang (uji folder hilang); main tree ikut dihitung (uji batas); penghitungan dipindah ke luar kunci (uji dua add bersamaan); aturan penanda di awk dibuang (uji tata bahasa, kelompok menunggu, docs); deteksi penanda kedua, di luar kelompok, dan tak terbaca dimatikan masing-masing (uji penolakan); deteksi "has started" dimatikan; laporan settings di check dimatikan; keluaran kelompok menunggu dibuang (uji check dan urutan); `waitForOwner` dan syarat lead-in di board.mjs dirusak masing-masing (uji urutan).
  - Skenario tangan untuk butir 1–4 (pemilik, pada antrean berikutnya):
    1. Di papan dengan dua kelompok di order.md (A; lalu B dan C), tulis `chain: group` di settings.md, lalu katakan "kerjakan antrean". Yang terlihat: sesi utama berhenti setelah A lolos, memberi ringkasan, dan baru memulai B/C setelah Anda berkata lanjut.
    2. Ganti ke `chain: ticket` dan ulangi dengan kelompok B dan C: B dan C dikerjakan satu per satu, dengan berhenti setelah masing-masing. Dengan `max_parallel: 1` (dan `chain: queue`): B dan C tidak pernah berjalan berbarengan; `worktree.sh add` untuk tiket kedua saat worktree pertama masih ada menjawab `REFUSED: no worktree for ...`.
    3. Tambahkan `<!-- wait-for-owner -->` di bawah kalimat pembuka kelompok B/C, `chain: queue`. Saat memulai, pesan pertanyaan sesi utama menanyakan apakah kelompok itu boleh dimulai tanpa bertanya lagi. Jawab "ya": rantai lewat ke B/C tanpa bertanya, dan izinnya tercatat di Notes tiket B dan C. Jawab "tidak": rantai berhenti setelah A.
    4. Dengan `chain: queue` dan penanda di atas, mulai dengan "satu tiket saja": hanya satu tiket dikerjakan, lalu sesi berhenti.
- 2026-10-17 19:35:47: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m33s, on content fingerprint 8db28d6b809a1e482879ca690ebe3a8f58d242db (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 19:35:51: review covers branch tiket-261017113002 at 287a27ae1e50d0b136655d6d27c06a31f3d50dfb, which holds main at b230e8e4fd1205af15d98197db6b8cc8e1fa547b (code outside .kerjaan/); the latest test run passed on exactly this content.
