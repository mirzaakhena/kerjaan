---
type: bug
priority: high
review: strict
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 22:28:57
updated: 2026-10-17 22:31:05
related: [261017184401, 261016183501]
blocked_by: []
---

## Background
Setiap tiket di repo ini baru boleh masuk review setelah seluruh uji proyek lulus, dan peninjau boleh memakai hasil uji itu tanpa menjalankannya ulang. Saat mengerjakan 261017184401, pengerja menemukan bahwa hasil "semua lulus" itu tidak bisa dipercaya penuh. Perintah uji papan ini memakai pilihan yang memaksa uji berhenti di akhir, dan dengan pilihan itu sebuah berkas uji kadang berhenti sebelum semua ujinya sempat berjalan, tanpa dilaporkan gagal. Satu berkas yang berisi 95 uji tercatat menjalankan 70, 88, dan 95 uji pada tiga kali jalan, dan berkas lain 63 dan 67 dari 67. Tanpa pilihan itu, jumlahnya selalu penuh.

Akibatnya, sebuah tiket bisa lolos dengan uji yang sebenarnya tidak pernah dijalankan.

## How to reproduce
1. Di repo kerjaan, jalankan perintah uji dari settings.md beberapa kali
2. Catat berapa uji yang dijalankan di berkas uji pengingat peninjau dan berkas uji antrean
3. Jalankan lagi tanpa pilihan pemaksa berhenti

Pada langkah 2 jumlahnya berubah-ubah dan kadang kurang dari jumlah uji di berkas, tetapi hasilnya tetap lulus. Pada langkah 3 jumlahnya selalu penuh.

## Request
Hasil uji yang lulus berarti semua uji benar-benar dijalankan. Penyebab berhentinya uji di tengah ditemukan dan diperbaiki, atau pilihan pemaksa berhenti tidak dipakai lagi. Bila sebuah jalan uji tetap berakhir dengan uji yang belum berjalan, hasilnya dihitung gagal, bukan lulus. Bila perbaikannya membutuhkan perubahan perintah uji di setelan papan ini, pengerja melaporkan perubahannya dan mandor yang mengubah setelan itu, atas izin pemilik yang sudah diberikan.

## Done when
- [ ] Langkah reproduksi di atas, diulang lima kali, selalu menjalankan jumlah uji yang penuh di kedua berkas
- [ ] Perintah uji papan ini tidak pernah menggantung, termasuk saat Chrome lain sedang berjalan (seperti dijanjikan 261016183501)
- [ ] Jalan uji yang berakhir dengan uji yang belum berjalan dicatat sebagai gagal oleh pencatat hasil uji papan, sehingga tiket tidak bisa masuk review dengannya
- [ ] Penyebabnya tertulis di Notes tiket ini, dan aturan untuk proyek lain yang memakai pilihan serupa tertulis di penjelasan setelan perintah uji

## History
- 2026-10-17 22:28:57 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 22:30:49 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 22:31:05 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress

## Notes
- 2026-10-17: lahir dari temuan pengerja 261017184401 (pertanyaan #1 tiket itu) dan saran tindak lanjut peninjaunya, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Pilihan yang dimaksud: `--test-force-exit` di test_command `.kerjaan/settings.md`; berkas yang terdampak saat itu: tests/on-ticket-review.test.mjs (70/88/95 dari 95) dan tests/queue.test.mjs (63/67 dari 67). Peninjau 261017184401 menjalankan ulang tanpa pilihan itu: 668 uji lulus semua. Keputusan pemilik lewat pilihan: buat tiket dan kerjakan berikutnya, sebelum 261017184402. Semua teks baru di skill berbahasa Inggris.
- 2026-10-17 22:29:40: files estimated to change: `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/scripts/test-run.sh`, `tests/on-ticket-review.test.mjs`, `tests/queue.test.mjs`, `tests/test-run.test.mjs`, `viewer/tests/browser.mjs`
- 2026-10-17 22:29:40: answered question: Bila perbaikannya ternyata membuang --test-force-exit dari test_command di .kerjaan/settings.md, siapa yang mengubahnya? Pengerja dilarang menyentuh settings.md, dan worktree tidak memuat .kerjaan/. Pilihan: (a) pengerja melaporkan perubahan yang dibutuhkan, lalu mandor mengubah settings.md di tree utama atas izin pemilik yang diberikan sekarang; (b) pengerja boleh mengubah settings.md khusus untuk tiket ini; (c) settings.md tidak boleh berubah, jadi penyebabnya harus diperbaiki di uji sehingga pilihan itu tetap aman. Saran: (a), karena aturan pengerja tetap utuh dan pemilik tidak perlu ditanya lagi di tengah rantai.
  answer, 2026-10-17 22:30:49: Pemilik: "Mandor, izin sekarang". (a) pengerja melaporkan perubahan settings.md yang dibutuhkan, lalu mandor mengubah .kerjaan/settings.md di tree utama atas izin pemilik yang diberikan sekarang.
