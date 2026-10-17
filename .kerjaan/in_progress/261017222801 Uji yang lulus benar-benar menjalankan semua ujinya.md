---
type: bug
priority: high
review: strict
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 22:28:57
updated: 2026-10-17 23:10:44
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
- [x] Jalan uji yang berakhir dengan uji yang belum berjalan dicatat sebagai gagal oleh pencatat hasil uji papan, sehingga tiket tidak bisa masuk review dengannya
- [x] Penyebabnya tertulis di Notes tiket ini, dan aturan untuk proyek lain yang memakai pilihan serupa tertulis di penjelasan setelan perintah uji

## History
- 2026-10-17 22:28:57 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 22:30:49 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 22:31:05 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress

## Notes
- 2026-10-17: lahir dari temuan pengerja 261017184401 (pertanyaan #1 tiket itu) dan saran tindak lanjut peninjaunya, sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`). Pilihan yang dimaksud: `--test-force-exit` di test_command `.kerjaan/settings.md`; berkas yang terdampak saat itu: tests/on-ticket-review.test.mjs (70/88/95 dari 95) dan tests/queue.test.mjs (63/67 dari 67). Peninjau 261017184401 menjalankan ulang tanpa pilihan itu: 668 uji lulus semua. Keputusan pemilik lewat pilihan: buat tiket dan kerjakan berikutnya, sebelum 261017184402. Semua teks baru di skill berbahasa Inggris.
- 2026-10-17 22:29:40: files estimated to change: `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/scripts/test-run.sh`, `tests/on-ticket-review.test.mjs`, `tests/queue.test.mjs`, `tests/test-run.test.mjs`, `viewer/tests/browser.mjs`
- 2026-10-17 22:29:40: answered question: Bila perbaikannya ternyata membuang --test-force-exit dari test_command di .kerjaan/settings.md, siapa yang mengubahnya? Pengerja dilarang menyentuh settings.md, dan worktree tidak memuat .kerjaan/. Pilihan: (a) pengerja melaporkan perubahan yang dibutuhkan, lalu mandor mengubah settings.md di tree utama atas izin pemilik yang diberikan sekarang; (b) pengerja boleh mengubah settings.md khusus untuk tiket ini; (c) settings.md tidak boleh berubah, jadi penyebabnya harus diperbaiki di uji sehingga pilihan itu tetap aman. Saran: (a), karena aturan pengerja tetap utuh dan pemilik tidak perlu ditanya lagi di tengah rantai.
  answer, 2026-10-17 22:30:49: Pemilik: "Mandor, izin sekarang". (a) pengerja melaporkan perubahan settings.md yang dibutuhkan, lalu mandor mengubah .kerjaan/settings.md di tree utama atas izin pemilik yang diberikan sekarang.
- 2026-10-17 23:40: pengerja — penyebab: `--test-force-exit` membuat proses tiap berkas uji memanggil `process.exit()` begitu ujinya selesai. Di macOS, tulisan ke pipe bersifat asinkron, jadi hasil uji yang belum sempat tertulis ke pipe menuju pelari uji ikut terbuang; berkas itu tetap keluar dengan status 0, sehingga pelari menghitung lebih sedikit uji dan run tetap lulus. Tidak ada uji yang salah; laporan pelari sendiri (ringkasan `# tests`) kadang ikut terpotong dengan cara yang sama. Terulang di luar repo ini: 6 berkas x 400 uji sepele memberi 2321 sampai 2394 dari 2400, tanpa pilihan itu selalu 2400. Dengan perintah lama, kedua berkas di tiket ini memberi 142, 159 dan 144 dari 162 dalam lima kali jalan.
- Perbaikan: `--test-force-exit` dibuang. Penggantinya `tests/complete-runs.mjs`, dimuat dengan `--import` ke setiap proses berkas uji: proses berakhir sendiri seperti biasa (semua hasil terkirim); bila sesuatu yang tertinggal (server, proses anak, timer) masih menahannya 5 detik setelah semua ujinya selesai, proses itu diakhiri setelah keluarannya terkirim, jadi janji 261016183501 tetap (uji yang macet tetap dihentikan `--test-timeout`); dan berkas yang berakhir sebelum ujinya selesai (misalnya `process.exit(0)` di tengah uji) keluar dengan status 1, sehingga pelari melaporkannya gagal dan test-run.sh mencatat run itu gagal. test-run.sh tidak diubah: ia tidak bisa tahu jumlah uji yang seharusnya untuk sembarang pelari uji, jadi keputusannya tetap pada status keluar perintah, dan aturan di SETTINGS.md mewajibkan perintah gagal bila ada uji yang tidak berjalan sampai akhir.
- Perlu perubahan settings.md (izin pemilik #1, dikerjakan mandor): test_command menjadi `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs`. tests/time-limits.test.mjs menguji perintah dari settings.md, jadi run akhir test-run.sh baru bisa lulus setelah perubahan itu.
- Ukuran (perintah baru, dijalankan langsung dengan settings.md sementara di worktree, Chrome pemilik sedang berjalan): lima kali seluruh rangkaian, tiap kali 672 dari 672 lulus, on-ticket-review.test.mjs 95/95 dan queue.test.mjs 67/67, tanpa satu pun berkas yang perlu diakhiri karena tertahan.
- Bukti merah (dirusak dari salinan, dipulihkan dari salinan): perintah dengan `--test-force-exit` ditambahkan -> time-limits "test_command uses ... not --test-force-exit" dan "every test is counted, five runs in a row" merah; perintah lama -> keduanya, ditambah "a file that ends before its tests have finished" merah; `process.exitCode = 1` dibuang dari penjaga -> time-limits "a file that ends before..." dan test-run "a node --test run that stops half-way is recorded as failed" merah; pengakhiran setelah 5 detik dibuang -> time-limits "a failed test with a server still open..." dan "a passed test with a server still open..." merah.
