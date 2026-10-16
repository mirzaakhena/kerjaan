---
type: feature
priority: medium
review:
labels: [paralel, mandor]
reporter: mirza
assign_to: claude
created: 2026-10-16 09:51:12
updated: 2026-10-16 09:51:29
related: [261011064201]
blocked_by: []
---

## Background
Dua tiket bisa dikerjakan bersamaan oleh dua agen, masing-masing di salinan
kerja repo sendiri (disebut *worktree*), lalu hasilnya digabung. Ini jauh
mempercepat penyelesaian antrean.

Saat ini, tiket mana yang boleh dikerjakan bersamaan hanya ditebak dari judul
dan isi tiket ketika antrean disusun. Tidak ada yang memeriksa bagian mana dari
proyek yang akan diubah oleh tiap tiket. Akibatnya dua tiket bisa tampak tidak
berhubungan, padahal keduanya mengubah file yang sama, dan tabrakannya baru
ketahuan saat hasilnya digabung.

Aturan yang berlaku sekarang juga terlalu keras: dua tiket yang menyentuh file
yang sama dianggap tidak boleh dikerjakan bersamaan sama sekali. Pemilik
menganggap tabrakan semacam itu wajar dan bisa diselesaikan, asalkan diketahui
sejak awal.

## Request
Sebelum antrean disusun, mandor memperkirakan bagian proyek mana yang akan
diubah oleh setiap tiket, lalu memakai perkiraan itu untuk mengusulkan tiket
mana yang bisa dikerjakan bersamaan.

Ada dua hal yang dibedakan dengan jelas:
- **Tiket yang bergantung pada hasil tiket lain** tetap tidak dikerjakan
  bersamaan.
- **Tiket yang hanya mengubah file yang sama** boleh dikerjakan bersamaan,
  dengan peringatan dan urutan penggabungan yang sudah ditentukan di depan.

Setelah tiket selesai, perkiraan tadi dibandingkan dengan apa yang benar-benar
diubah, supaya ketepatannya bisa dinilai dari waktu ke waktu.

## Done when
- [ ] Setiap tiket yang masuk antrean punya catatan perkiraan bagian proyek yang akan diubahnya, yang bisa dibaca di file tiket itu sendiri
- [ ] Satu perintah menampilkan pasangan tiket di antrean yang perkiraannya beririsan, beserta file yang menjadi irisannya
- [ ] Usulan susunan antrean dari mandor menyebut tiket mana yang bisa dikerjakan bersamaan dan alasannya
- [ ] Bila dua tiket yang diusulkan bersamaan beririsan, usulan itu menyebutkan irisannya dan urutan penggabungannya
- [ ] Tiket yang menunggu hasil tiket lain tidak pernah diusulkan dikerjakan bersamaan dengan tiket yang ditunggunya
- [ ] Panduan kerja paralel di skill tidak lagi melarang tiket yang menyentuh file yang sama dikerjakan bersamaan, dan menjelaskan pembedaan di atas
- [ ] Setelah tiket selesai, ada cara melihat perbedaan antara perkiraan dan file yang benar-benar diubah

## History
- 2026-10-16 09:51:12 backlog

## Notes
- 2026-10-16 Berasal dari diskusi dengan pemilik tentang kerja paralel. Cara
  pengujian dan penggabungan hasil kerja paralel (siapa menjalankan uji, di
  mana, dan kapan) masih didiskusikan dan kemungkinan menjadi tiket tersendiri.
