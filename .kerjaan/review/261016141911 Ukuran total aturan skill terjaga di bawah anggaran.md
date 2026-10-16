---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 06:44:17
related: [261016141909, 261016141910, 261016141916]
blocked_by: [261016141909, 261016141910]
---

## Background

Dalam enam minggu, total aturan skill (berkas utama, panduan dan definisi
agen) tumbuh dari sekitar 2.300 menjadi 25.100 kata. Satu-satunya upaya
perampingan hanya memindahkan teks, tidak menghapusnya. Polanya: setiap
insiden menjadi aturan permanen ditambah satu pilihan skrip, dan saran tindak
lanjut dari peninjau terus melahirkan tiket proses baru.

Catatan kerja di tiket done juga membengkak, 900 sampai 2.450 kata per tiket,
kebanyakan berupa log uji mutasi, padahal catatan itu dibaca ulang oleh
peninjau.

## Request

Pertumbuhan aturan skill punya batas yang diperiksa otomatis, dan setiap
aturan baru harus menyebut aturan lama yang digantikannya.

## Done when
- [x] Ada anggaran 18.000 kata untuk berkas utama, panduan dan definisi agen bersama-sama, dan uji otomatis gagal bila anggaran terlampaui
- [x] Total kata setelah tiket 261016141909 dan 261016141910 selesai berada di bawah anggaran itu, dengan angkanya tercatat di Notes
- [x] README menjelaskan aturan bahwa tambahan aturan baru menyebut apa yang dihapus atau digantikan
- [x] Panduan pengerja meminta catatan kerja di tiket berupa ringkasan, bukan log lengkap

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:25 todo
- 2026-10-17 06:35:54 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 06:44:17 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Usulan awal anggaran: 15.000 kata untuk SKILL.md + references + agents.
- 2026-10-16 14:36:48: files estimated to change: `README.md`, `agents/kerjaan-worker.md`, `uji/anggaran.test.mjs`
- 2026-10-16 14:38:10: answered question: Berapa anggaran kata? Total sekarang sekitar 25.200 (berkas utama 6.200, panduan 10.100, definisi agen 8.900). 261016141904 dan 261016141910 memangkas sekitar 4.000; 261016141909 cukup memindahkan teks agar berkas utama di bawah 350 baris, jadi total bisa tetap sekitar 21.000. Pilihan: (a) 15.000, dan 261016141909 wajib memangkas sekitar 6.000 kata lagi; (b) 18.000, dan 261016141909 diberi butir bahwa total kata ikut turun, bukan hanya pindah; (c) 21.000, sekadar menahan pertumbuhan. Saran: (b), terjangkau dan tetap memaksa penghapusan salinan.
  answer, 2026-10-16 14:45:49: (b) 18.000 kata, dan 261016141909 mendapat butir Done when baru bahwa total kata turun, bukan hanya pindah.
- 2026-10-17, pengerja: ringkasan kerja.
  - Anggaran 18.000 kata ada di satu tempat, `uji/skill-ringkas.test.mjs` (`BUDGET`), menggantikan batas lama 21.000 di uji yang sama; tidak ada uji anggaran kedua. Cakupannya `SKILL.md`, semua `.md` di `references/` dan di `agents/`, dibaca dari folder sehingga berkas baru ikut terhitung.
  - Angka (hitungan uji, kata dipisah spasi): sebelum tiket ini 19.535; sesudah 17.495 — SKILL.md 2.855, foreman.md 3.164, ordering-the-queue.md 1.025, parallel-work.md 1.931, repairs.md 403, review.md 1.129, kerjaan-planner.md 1.650, kerjaan-reviewer.md 2.989, kerjaan-worker.md 2.349.
  - Yang dipangkas: penjelasan "mengapa", contoh dan salinan yang sudah ada di dokumen lain (terutama parallel-work.md −1.050, ordering-the-queue.md −390, foreman.md −520, review.md −130). Tidak ada aturan yang dihapus; dua potongan aturan yang sempat hilang saat memangkas dikembalikan (batas waktu kunci ada di `settings.md`; jawaban pemilik ikut commit pengerja).
  - README punya bagian baru "Keeping the rules small": anggaran, uji yang memeriksanya, aturan bahwa aturan baru menyebut aturan yang dihapus atau digantikan, dan bahwa Notes tiket berupa ringkasan. Definisi pengerja, langkah 5, meminta Notes berupa ringkasan, bukan log.
  - Uji dibuat merah dengan sengaja, lalu dipulihkan dari salinan: +600 kata di repairs.md, +600 di SKILL.md, berkas baru 600 kata di `agents/` dan di `references/` → uji anggaran merah; kalimat aturan di README diganti → uji README merah; kalimat ringkasan di definisi pengerja diganti → uji pengerja merah.
  - Berkas di luar estimasi: `skills/kerjaan/references/foreman.md`, `ordering-the-queue.md`, `parallel-work.md`, `review.md` (pemangkasan) dan `uji/skill-ringkas.test.mjs` (dipakai sebagai ganti `uji/anggaran.test.mjs` yang diestimasi, sesuai arahan agar tidak ada uji anggaran kedua).
- 2026-10-17 06:44:11: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m16s, on content fingerprint 2d810c939b880dc8a4123800442565349d97df04 (the same before and after the run; .kerjaan/ left out).
