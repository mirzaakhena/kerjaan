---
type: bug
priority: medium
review:
labels: [paralel, mandor]
reporter: mirza
assign_to: claude
created: 2026-10-16 13:08:01
updated: 2026-10-16 13:54:35
related: [261016101001, 261016122401]
blocked_by: []
---

## Background
Setelah sebuah tiket lolos review, mandor menggabungkan hasil kerjanya ke
jalur utama proyek (*main*) dengan skrip penggabungan. Skrip itu menulis
satu baris "sudah masuk main" ke catatan tiket, tetapi tidak menyimpan
perubahan itu ke git. File tiket tertinggal dalam keadaan berubah di salinan
kerja utama.

Penggabungan berikutnya menolak berjalan bila salinan kerja utama punya
perubahan yang belum disimpan, dan menahan tiketnya untuk pemilik. Jadi satu
baris catatan yang tertinggal bisa menahan tiket berikutnya, padahal tidak ada
yang salah dengan tiket itu. Hari ini hal ini terjadi dua kali dan baris
catatannya disimpan mandor dengan tangan.

## How to reproduce
1. Kerjakan dua tiket di dua salinan kerja terpisah sampai keduanya lolos review
2. Gabungkan tiket pertama ke main dengan skrip penggabungan
3. Lihat status git di salinan kerja utama
4. Gabungkan tiket kedua

Pada langkah 3 file tiket pertama tercatat berubah tetapi belum disimpan. Pada
langkah 4 penggabungan bisa ditahan karena perubahan itu.

## Request
Penggabungan ke main meninggalkan salinan kerja utama dalam keadaan bersih:
catatan yang ditulisnya ke tiket ikut tersimpan ke git, sehingga penggabungan
berikutnya bisa langsung berjalan.

## Done when
- [ ] Langkah di atas berakhir dengan salinan kerja utama yang bersih pada langkah 3
- [ ] Penggabungan tiket kedua pada langkah 4 berjalan tanpa campur tangan
- [ ] Catatan "sudah masuk main" tetap ada di tiket, dan riwayat git menunjukkan kapan catatan itu disimpan
- [ ] Bila salinan kerja utama sudah punya perubahan lain sebelum penggabungan, perubahan itu tidak ikut tersimpan bersama catatan tiket

## History
- 2026-10-16 13:08:01 backlog
- 2026-10-16 13:54:34 todo
- 2026-10-16 13:54:35 in_progress

## Notes
- 2026-10-16 Berasal dari saran reviewer 261016122401 dan pengamatan mandor
  saat menggabungkan 261016122402 dan 261016122401.
- 2026-10-16 13:54:33: files estimated to change: `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/merge.sh`, `uji/merge.test.mjs`
