---
type: feature
priority: medium
review: normal
labels: [sesi-8e6130e0, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 19:34:30
updated: 2026-10-17 19:47:23
related: [261006121501]
blocked_by: []
---

## Background
Viewer papan hanya bisa dibuka dari Mac yang menjalankannya, di alamat seperti http://127.0.0.1:4322/<nama-repo>/. Pemilik ingin memantau papan dari HP-nya, yang tersambung ke Wi-Fi yang sama, tanpa harus kembali ke Mac.

## Request
Saat viewer dijalankan dengan pilihan tambahan untuk jaringan, papan bisa dibuka dari perangkat lain di jaringan yang sama, dan viewer mencetak alamat yang bisa diketik di HP. Tanpa pilihan itu, viewer tetap hanya bisa dibuka dari Mac itu sendiri, seperti sekarang. Tidak ada kunci atau kata sandi: siapa pun di jaringan yang sama bisa membuka papan selama pilihan itu aktif.

## Done when
- [ ] Viewer yang dijalankan dengan pilihan jaringan bisa dibuka dari HP di Wi-Fi yang sama, lengkap dengan kanban, laci tiket, dan pembaruan langsung saat papan berubah
- [ ] Saat pilihan jaringan aktif, viewer mencetak alamat untuk perangkat lain (alamat IP Mac di jaringan itu), selain alamat untuk Mac sendiri
- [ ] Saat pilihan jaringan aktif, viewer mencetak peringatan singkat bahwa siapa pun di jaringan yang sama bisa membaca papan
- [ ] Tanpa pilihan jaringan, perangkat lain tetap tidak bisa membuka viewer
- [ ] Halaman viewer pas dan terbaca di layar HP tanpa harus digeser ke samping
- [ ] Cara menjalankannya untuk HP tertulis di README dan di bagian viewer pada skill

## History
- 2026-10-17 19:34:30 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 19:47:08 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 19:47:23 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress

## Notes
- 2026-10-17: lahir dari permintaan pemilik di sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`): "saya ingin bisa akses via HP, yang mana HP ini masih di network yang sama dengan macbook ini". Keputusan pemilik lewat pilihan: diaktifkan dengan opsi `--lan` (bawaan tetap 127.0.0.1); tanpa pengaman (tidak ada kunci di alamat); dikerjakan sekarang, berdampingan dengan 261017113002. Viewer tetap hanya-baca. Pemilik juga meminta tidak ada bahasa Indonesia di skill: semua teks baru (pesan server, README, nama opsi) berbahasa Inggris.
- 2026-10-17 19:34:54: files estimated to change: `README.md`, `skills/kerjaan/SKILL.md`, `viewer/server.mjs`, `viewer/uji/peramban.test.mjs`, `viewer/uji/server.test.mjs`, `viewer/web/gaya.css`
- 2026-10-17 19:34:55: answered question: Butir Done when 1 (papan terbuka dari HP di Wi-Fi yang sama) dan sebagian butir 5 (pas di layar HP) hanya bisa dipastikan dengan HP sungguhan. Peninjau bisa membuktikan sendiri bahwa viewer menerima sambungan dari alamat jaringan Mac dan halaman pas di lebar layar HP pada peramban uji. Pilihan: (a) ditunda: pemilik mencobanya dari HP setelah tiket selesai, dan rantai jalan terus; (b) menahan rantai sampai pemilik mencobanya. Saran: (a), karena tidak ada tiket lain yang bergantung padanya dan pemilik bisa mencobanya kapan saja dengan satu perintah.
  answer, 2026-10-17 19:47:08: Pemilik: "Ditunda". (a) ditunda: pemilik mencobanya dari HP setelah tiket selesai, dan rantai jalan terus.
