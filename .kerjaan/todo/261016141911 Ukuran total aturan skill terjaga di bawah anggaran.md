---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-16 14:46:25
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
- [ ] Ada anggaran 18.000 kata untuk berkas utama, panduan dan definisi agen bersama-sama, dan uji otomatis gagal bila anggaran terlampaui
- [ ] Total kata setelah tiket 261016141909 dan 261016141910 selesai berada di bawah anggaran itu, dengan angkanya tercatat di Notes
- [ ] README menjelaskan aturan bahwa tambahan aturan baru menyebut apa yang dihapus atau digantikan
- [ ] Panduan pengerja meminta catatan kerja di tiket berupa ringkasan, bukan log lengkap

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:25 todo

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
