---
type: task
priority: medium
review:
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 18:44:41
updated: 2026-10-17 18:45:43
related: [261017175101, 261017184401]
blocked_by: [261017184401]
---

## Background
Setelah viewer (261017175101) dan skrip, definisi agen, panduan, serta README (261017184401) berbahasa Inggris, tidak ada yang mencegah teks Indonesia masuk lagi. Label "diam" di viewer lolos justru karena tidak ada pemeriksaan seperti itu.

## Request
Sebuah uji otomatis gagal bila kata Indonesia yang umum muncul lagi di berkas skill atau viewer, dengan daftar pengecualian yang tertulis untuk contoh yang sengaja menunjukkan papan berbahasa lain. Isi papan (.kerjaan/) tidak diperiksa.

## Done when
- [ ] Sebuah uji otomatis gagal bila kata Indonesia yang umum muncul lagi di berkas skill atau viewer, dan menyebut berkas serta barisnya
- [ ] Pengecualian untuk contoh papan berbahasa lain tertulis di satu daftar, dan setiap pengecualian menyebut alasannya
- [ ] Uji itu lulus pada repo saat ini, dan papan repo ini yang berbahasa Indonesia tidak membuatnya gagal
- [ ] Menambahkan satu kata Indonesia, misalnya "diam", ke teks viewer atau pesan skrip membuat uji itu gagal

## History
- 2026-10-17 18:44:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 18:45:43 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo

## Notes
- 2026-10-17: dipecah dari 261017175101 atas jawaban pemilik #1 "Pecah jadi tiga" (sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02).
- 2026-10-17 18:45:34: files estimated to change: `uji/`
