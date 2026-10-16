---
type: feature
priority: high
review:
labels: [sesi-a192c9e8, history]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:46:00
updated: 2026-10-16 14:49:16
related: [261006110801, 261006121502]
blocked_by: []
---

## Background

Setiap kali tiket berpindah status, sebuah baris ditambahkan ke riwayatnya:
kapan tiket itu masuk backlog, todo, in_progress, review, done, atau cancel.
Baris itu menjawab *kapan*, tetapi tidak menjawab *siapa*.

Pemindahan hampir selalu dilakukan oleh sebuah sesi Claude Code: mandor yang
memulai tiket, pengerja yang menyerahkannya ke review, atau peninjau yang
meloloskan atau mengembalikannya. Setiap sesi punya pengenal (session-id),
dan percakapannya bisa dibuka lagi selama transkripnya masih ada. Pengenal itu
tidak tercatat di tiket. Kalau pemilik ingin tahu kenapa sebuah tiket
dikembalikan atau dimulai, ia harus menebak sesi mana yang melakukannya.

## Request

Setiap baris riwayat yang ditulis dari dalam sesi Claude Code ikut mencatat
pengenal sesi itu, sehingga dari tiket mana pun pemilik bisa menelusuri balik
ke percakapan yang memindahkannya.

## Done when
- [ ] Perpindahan status dari dalam sesi Claude Code menulis baris riwayat berbentuk `- <waktu> <session-id> <status>`, misalnya `- 2026-10-16 14:16:07 4dbcf082-290a-4f65-845c-ee75fd3b3e9c done`
- [ ] Perpindahan dari terminal biasa, di luar sesi Claude Code, tetap menulis baris seperti sekarang tanpa penanda kosong
- [ ] Baris riwayat lama tanpa pengenal sesi tetap terbaca benar oleh viewer, hitungan putaran review, dan pemeriksaan antrean
- [ ] Viewer menampilkan riwayat yang memuat pengenal sesi dengan rapi
- [ ] Panduan skill menjelaskan cara membuka lagi percakapan dari pengenal di riwayat, dan bahwa transkrip lama bisa sudah terhapus
- [ ] Ada uji otomatis untuk baris riwayat dengan dan tanpa pengenal sesi

## History
- 2026-10-16 14:46:00 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel
  `sesi-a192c9e8` lahir dari penilaian yang sama:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka
  lagi dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama
  transkripnya masih ada.
- Pemilik: "session-id claude juga perlu dicantumkan dalam setiap tiket dalam
  setiap history statusnya. Hal ini digunakan agar bisa melakukan traceback."
- Temuan teknis: perintah Bash di dalam sesi Claude Code menerima variabel
  lingkungan `CLAUDE_CODE_SESSION_ID`. Perlu dipastikan nilainya di dalam
  subagen (pengerja, peninjau): apakah sama dengan sesi mandor atau milik
  subagen itu sendiri. Bila sama, baris riwayat bisa juga mencatat jenis agen
  agar pemindahan oleh pengerja dan oleh peninjau tetap bisa dibedakan.
- Penulis baris riwayat: `update-ticket.sh` (sekitar baris 401-434) dan
  `new-ticket.sh`. Pembaca: `on-ticket-review.sh` (menghitung baris review),
  `viewer/` dan `board.mjs`. Semua pembaca harus mengenali kedua bentuk:
  `- <waktu> <status>` (baris lama atau dari terminal) dan
  `- <waktu> <session-id> <status>`. Status selalu kata terakhir di baris.
- Bentuk baris ditetapkan pemilik: `- 2026-10-16 14:16:07
  4dbcf082-290a-4f65-845c-ee75fd3b3e9c done`.
