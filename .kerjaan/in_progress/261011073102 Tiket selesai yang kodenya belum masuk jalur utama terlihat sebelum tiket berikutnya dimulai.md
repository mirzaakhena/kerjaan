---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-16 13:54:36
related: [261006121504]
blocked_by: []
---

## Background

Pekerjaan sebuah tiket sering dibuat di cabang tersendiri, yaitu salinan kode
yang terpisah dari jalur utama sampai digabungkan. Tiket bisa lolos review dan
pindah ke done, sementara cabangnya belum pernah digabung, sehingga hasilnya
belum benar-benar ada di jalur utama.

Saat ini hal itu baru ketahuan ketika seseorang memulai tiket berikutnya:
langkah memulai tiket ditolak selama masih ada cabang yang belum digabung,
lalu daftar cabangnya ditampilkan. Sebelum momen itu, papan tidak
menunjukkan apa-apa. Tiket di done terlihat selesai, padahal kodenya mungkin
masih tertinggal di cabang yang bisa terlupa berhari-hari.

## Request

Pemilik papan bisa melihat kapan saja tiket mana di done yang kodenya belum
masuk jalur utama, tanpa harus menunggu ada yang memulai tiket baru.

## Done when
- [ ] Tiket di done yang cabangnya punya perubahan di luar jalur utama
      ditandai "belum digabung" di papan, beserta nama cabangnya
- [ ] Tanda itu hilang dengan sendirinya setelah cabangnya digabung atau
      dihapus
- [ ] Cabang yang tercatat sebagai cabang jangka panjang di pengaturan papan
      tidak ikut ditandai
- [ ] Proyek yang bukan repo git tetap tampil tanpa galat dan tanpa tanda

## History
- 2026-10-11 07:31:49 backlog
- 2026-10-16 13:54:34 todo
- 2026-10-16 13:54:36 in_progress

## Notes
- Berasal dari CATATAN-BERIKUTNYA.md butir 3.
- Dibuat sebagai tiket sendiri, bukan ditambahkan ke 261006121504 (halaman
  masalah papan), karena tidak bergantung pada viewer. Di mana tandanya
  tampil (viewer, peta, atau keluaran script) diputuskan saat dikerjakan;
  bila owner lebih suka digabung ke 261006121504, kriteria di atas dipindah
  ke sana.
- 2026-10-16 Keputusan mandor atas instruksi pemilik untuk langsung mengerjakan: tanda "belum digabung" tampil di kartu tiket pada viewer (peta sudah dihapus sejak 1.10.0). Sejak 1.12.0 tiket yang penggabungannya ditahan (merge held for the owner) juga tetap di done dengan cabang belum digabung; tanda ini juga berlaku untuknya.
- 2026-10-16 13:54:33: files estimated to change: `README.md`, `viewer/app.mjs`, `viewer/uji/`, `viewer/web/gaya.css`, `viewer/web/proyek.js`
