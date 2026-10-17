---
type: task
priority: medium
review: normal
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 18:44:41
updated: 2026-10-17 21:14:07
related: [261017175101, 261017184402]
blocked_by: [261017175101]
---

## Background
kerjaan dipakai di proyek berbahasa apa pun, tetapi sebagian skrip, definisi agen, panduan, dan uji skill masih berbahasa Indonesia: pesan, komentar, nama folder uji (uji/), nama uji, dan contoh kalimat di deskripsi skill. Ada juga dokumen penjelasan peninjau yang seluruhnya berbahasa Indonesia. Isi papan sebuah proyek (tiket, pesan commit, settings.md) tidak termasuk: itu mengikuti setelan language papan masing-masing, termasuk papan repo ini yang tetap berbahasa Indonesia.

## Request
Skrip papan, definisi agen, panduan, README, dan uji skill sepenuhnya berbahasa Inggris, termasuk nama berkas dan folder, nama variabel, nama uji, dan komentar. Kalimat contoh Indonesia di deskripsi skill dan kalimat Indonesia di uji pemicu dihapus, lalu uji pemicu diulang untuk membuktikan skill tidak lebih jarang terpanggil. Dokumen penjelasan peninjau (docs/cara-kerja-reviewer.md) dihapus.

## Done when
- [ ] Pesan yang dicetak skrip papan dan teks definisi agen, panduan, dan README tidak memuat bahasa Indonesia, kecuali contoh yang sengaja menunjukkan papan berbahasa lain
- [ ] Deskripsi skill tidak lagi memuat kalimat contoh berbahasa Indonesia, dan uji pemicu hanya memakai kalimat berbahasa Inggris
- [ ] Uji pemicu yang diulang dengan deskripsi baru menunjukkan skill terpanggil sama seringnya atau lebih sering, dan diam sama seringnya, dibanding deskripsi sebelumnya pada kalimat yang sama
- [ ] Dokumen penjelasan peninjau sudah tidak ada, dan tidak ada panduan atau README yang masih merujuknya
- [ ] Nama berkas, folder, variabel, uji, dan komentar di skrip dan uji skill berbahasa Inggris, dan semua uji tetap lulus setelah penggantian nama
- [ ] Papan yang sudah ada (tiket, order.md, settings.md berbahasa Indonesia) tetap bisa dipindah, diperiksa, dan diubah oleh skrip seperti sebelumnya

## History
- 2026-10-17 18:44:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 18:45:42 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 21:14:07 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress

## Notes
- 2026-10-17: dipecah dari 261017175101 atas jawaban pemilik (sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02). Keputusan pemilik di tiket asal: #2 "Hapus, lalu ukur" (kalimat contoh Indonesia di deskripsi dan uji pemicu dihapus, lalu uji pemicu diulang); #3 "Hapus" (docs/cara-kerja-reviewer.md dihapus). Isi papan repo ini tetap berbahasa Indonesia.
- 2026-10-17 18:45:34: files estimated to change: `README.md`, `agents/`, `docs/cara-kerja-reviewer.md`, `skills/kerjaan/`, `uji/`
