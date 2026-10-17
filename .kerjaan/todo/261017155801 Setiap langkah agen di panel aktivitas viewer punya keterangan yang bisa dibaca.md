---
type: bug
priority: medium
review: normal
labels: [sesi-8e6130e0, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 15:58:20
updated: 2026-10-17 16:01:22
related: [261016084202]
blocked_by: []
---

## Background
Laci tiket di viewer punya panel "langkah terakhir worker" yang menunjukkan apa yang sedang dikerjakan agen. Hampir semua baris di panel itu hanya bertuliskan "Bash —": waktu dan nama alat ada, tetapi tidak ada keterangan apa pun. Di satu worker proyek nukitu-mockup, dari 47 perintah yang dijalankan tidak satu pun punya keterangan. Panel itu jadi tidak berguna justru untuk langkah yang paling sering.

Penyebabnya dua. Agen kerjaan (pengerja, peninjau, penyusun antrean) tidak diminta menulis keterangan singkat saat menjalankan perintah, padahal Claude Code menyediakan tempatnya. Viewer sengaja tidak pernah menampilkan isi perintah, karena perintah bisa memuat rahasia, jadi tanpa keterangan yang tersisa hanya tanda pisah.

## How to reproduce
1. Jalankan satu tiket lewat rantai mandor di proyek mana pun
2. Buka papan di viewer dan buka laci tiket yang sedang dikerjakan
3. Lihat daftar langkah terakhir worker

Baris Bash tampil tanpa keterangan, hanya "—".

## Request
Setiap langkah di panel aktivitas punya keterangan yang bisa dibaca. Agen kerjaan menulis keterangan singkat dalam bahasa papan setiap kali menjalankan perintah. Bila keterangan tetap tidak ada, viewer menampilkan nama program yang dijalankan saja (misalnya "cat" atau "node --test"), tanpa argumen apa pun, sehingga isi perintah tetap tidak pernah terlihat.

## Done when
- [ ] Langkah di reproduksi di atas menampilkan keterangan singkat dalam bahasa papan pada hampir setiap baris Bash, bukan "—"
- [ ] Panduan pengerja, peninjau, dan penyusun antrean masing-masing meminta keterangan itu dalam satu kalimat, tanpa menambah aturan lain
- [ ] Langkah Bash tanpa keterangan menampilkan nama program saja, dan tidak pernah argumen, nama berkas, isi variabel, atau teks lain dari perintahnya
- [ ] Perintah yang memuat rahasia (misalnya token di argumen atau variabel lingkungan di depan perintah) tetap tidak memperlihatkan rahasia itu di panel

## History
- 2026-10-17 15:58:20 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 16:01:22 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo

## Notes
- 2026-10-17: lahir dari pertanyaan pemilik di sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`) sambil melihat tangkapan layar panel aktivitas nukitu-mockup. Pemilik setuju kedua lapis: aturan keterangan di definisi agen, dan cadangan nama program di viewer (melonggarkan aturan "tidak ada isi perintah" sebatas nama program). Pemilik khawatir soal tambahan context: tambahannya sekitar 5-10 token per perintah dan satu kalimat per definisi agen; cadangan di viewer tidak menambah context agen sama sekali. Pemilik minta tiket ini langsung masuk todo.
- 2026-10-17 15:59:14: files estimated to change: `agents/kerjaan-planner.md`, `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `viewer/agen.mjs`, `viewer/uji/agen.test.mjs`
- 2026-10-17 15:59:14: answered question: Butir Done when 1 (keterangan muncul di hampir setiap baris Bash pada reproduksi) baru bisa dicek setelah definisi agen yang baru ikut rilis dan dipakai satu rantai nyata; agen yang sedang dipakai mandor datang dari plugin terpasang 1.15.0. Pilihan: (a) ditunda: peninjau memeriksa kalimat di ketiga definisi agen dan cadangan nama program di viewer, pemilik melihat panelnya pada rantai pertama setelah rilis, dan rantai jalan terus; (b) menahan rantai sampai pemilik melihatnya. Saran: (a), karena tidak ada tiket lain yang bergantung pada butir ini dan pengecekannya memang hanya mungkin setelah rilis.
  answer, 2026-10-17 16:01:21: Pemilik: "Ditunda". (a) ditunda: peninjau memeriksa kalimat di ketiga definisi agen dan cadangan nama program di viewer, pemilik melihat panelnya pada rantai pertama setelah rilis, dan rantai jalan terus.
