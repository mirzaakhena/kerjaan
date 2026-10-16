---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, review, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-16 14:21:57
related: [261016141911]
blocked_by: [261016141904, 261016141906]
---

## Background

Definisi peninjau sudah sekitar 5.600 kata, hampir sama panjang dengan berkas
utama skill. Tabel level review ada dalam tiga salinan (panduan review,
definisi peninjau, dan dokumen cara kerja peninjau), dan salah satunya sudah
tidak sesuai kenyataan. Penjelasan hasil pemeriksaan bukti uji juga tertulis
dua kali. Ada pula kasus "cabang sudah digabung" yang tidak mungkin terjadi
lagi, karena penggabungan sekarang hanya dilakukan setelah tiket done.

Di repo ini ke-17 tiket done lolos di putaran pertama, dan level `strict`
belum pernah dipakai.

## Request

Definisi peninjau jauh lebih ringkas, setiap aturannya punya satu tempat, dan
bagian yang tidak bisa terjadi lagi dihapus.

## Done when
- [ ] Definisi peninjau paling banyak sekitar 3.000 kata, dengan angka sebelum dan sesudah tercatat di Notes
- [ ] Tabel level review hanya ada di satu tempat
- [ ] Dokumen cara kerja peninjau tidak lagi menyalin aturan, cukup menjelaskan dan merujuk
- [ ] Kasus yang tidak bisa terjadi lagi sudah dihapus
- [ ] Tiket uji yang sengaja ditolak (seperti 261011073201) tetap ditolak oleh peninjau yang baru

## History
- 2026-10-16 14:19:07 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi salinan tabel: `review.md:9-13`, `agents/kerjaan-reviewer.md:35-42`,
  `docs/cara-kerja-reviewer.md:38-42`. Kasus usang:
  `agents/kerjaan-reviewer.md:176-183`. "runs the checks once" di review.md
  sudah tidak tepat.
