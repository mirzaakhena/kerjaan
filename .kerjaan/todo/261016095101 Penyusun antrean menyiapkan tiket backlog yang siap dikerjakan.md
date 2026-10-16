---
type: feature
priority: high
review: normal
labels: [paralel, mandor, antrean]
reporter: mirza
assign_to: claude
created: 2026-10-16 09:51:12
updated: 2026-10-16 10:24:38
related: [261011064201, 261016101001, 261016101002]
blocked_by: []
---

## Background
Setiap memulai kerja, pemilik bertanya tiket mana dari backlog yang bisa
dimasukkan ke antrean untuk dikerjakan hari ini. Sesi utama (mandor) lalu
membaca semua tiket di backlog, menilai kesiapannya, dan menawarkan beberapa
tiket. Pekerjaan membaca ini menghabiskan banyak ruang ingatan mandor,
padahal ruang itu dibutuhkan untuk mengawal tiket-tiket yang sedang
dikerjakan.

Selain itu, pertanyaan yang belum terjawab pada sebuah tiket baru disapu saat
tiket akan mulai dikerjakan, bukan saat tiket masuk antrean. Akibatnya antrean
bisa berisi tiket yang sebenarnya belum siap.

Dua tiket bisa dikerjakan bersamaan oleh dua agen, masing-masing di salinan
kerja repo sendiri (*worktree*). Saat ini, tiket mana yang boleh dikerjakan
bersamaan hanya ditebak dari judul dan isi tiket, tanpa memeriksa bagian
proyek mana yang akan diubah oleh tiap tiket. Aturan yang berlaku juga
melarang dua tiket yang menyentuh file yang sama dikerjakan bersamaan.
Pemilik menganggap tabrakan semacam itu wajar dan bisa diselesaikan, asalkan
diketahui sejak awal.

## Request
Ada agen tersendiri, penyusun antrean, yang menyiapkan isi antrean dari
backlog sehingga semua tiket di antrean siap dikerjakan tanpa pertanyaan lagi,
baik bersamaan maupun berurutan.

- Mandor memanggil penyusun antrean dan hanya menerima laporan ringkasnya.
- Penyusun antrean menilai kesiapan tiap tiket, memecah tiket yang terlalu
  besar, dan memperkirakan bagian proyek yang akan diubah tiap tiket.
- Pertanyaan yang masih perlu jawaban pemilik dititipkan ke mandor. Mandor
  menanyakannya ke pemilik sekaligus, lalu penyusun antrean menuliskan
  jawabannya ke tiket.
- Usulannya membedakan tiket yang bergantung pada hasil tiket lain (tidak
  boleh bersamaan) dari tiket yang hanya mengubah file yang sama (boleh
  bersamaan, dengan urutan penggabungan yang sudah ditentukan).
- Setelah pemilik menyetujui, penyusun antrean sendiri yang memindahkan tiket
  ke antrean dan menuliskan urutannya.

## Done when
- [ ] Ketika pemilik bertanya tiket apa yang bisa dikerjakan hari ini, mandor menyerahkan pekerjaan menilai backlog ke penyusun antrean dan tidak membaca tiket backlog sendiri
- [ ] Laporan penyusun antrean ke mandor memuat usulan tiket, urutannya, mana yang bisa bersamaan beserta alasannya, dan pertanyaan per tiket
- [ ] Setiap tiket yang diusulkan memuat perkiraan bagian proyek yang akan diubahnya, dan satu perintah menampilkan pasangan tiket yang perkiraannya beririsan beserta file irisannya
- [ ] Tiket yang hanya beririsan file bisa diusulkan bersamaan dengan urutan penggabungannya, tiket yang menunggu hasil tiket lain tidak pernah diusulkan bersamaan dengan tiket yang ditunggunya, dan panduan kerja paralel di skill menjelaskan pembedaan ini
- [ ] Pertanyaan dari beberapa tiket sampai ke pemilik dalam satu kali tanya, jawabannya tertulis di tiket masing-masing, dan tiket yang masih punya pertanyaan terbuka tidak pernah masuk antrean
- [ ] Tiket yang melewati batas ukuran sudah dipecah per hasil sebelum diusulkan
- [ ] Setelah pemilik menyetujui, tiket berpindah ke antrean dan urutannya beserta alasannya tertulis di file urutan antrean, tanpa mandor melakukannya
- [ ] Setelah tiket selesai, ada cara melihat perbedaan antara perkiraan bagian proyek yang diubah dan yang benar-benar diubah

## History
- 2026-10-16 09:51:12 backlog
- 2026-10-16 10:24:38 todo

## Notes
- 2026-10-16 Berasal dari diskusi dengan pemilik tentang kerja paralel.
  Pengujian dan penggabungan hasil kerja paralel dicatat di 261016101001 dan
  261016101002.
- 2026-10-16 Tiket ini semula hanya tentang memperkirakan bagian proyek yang
  diubah tiap tiket dan mengusulkan tiket yang bisa bersamaan. Atas keputusan
  pemilik, tiket ini dilebur menjadi tiket penyusun antrean, karena perkiraan
  itu menjadi tugas penyusun antrean.
- 2026-10-16 Wewenang penyusun antrean yang diputuskan pemilik: menulis
  jawaban pemilik ke tiket, menulis perkiraan bagian proyek yang diubah,
  memecah tiket yang terlalu besar, dan memindahkan tiket yang sudah disetujui
  ke antrean beserta menulis urutannya. Ini berarti pemecahan tiket tidak lagi
  menunggu keputusan pemilik per tiket ketika dilakukan oleh penyusun antrean.
- 2026-10-16 Keputusan mirza sebelum rantai dimulai: dikerjakan berurutan (101002, 101001, 095101) karena ketiganya mengubah panduan yang sama; review `normal`; tidak ada pemeriksaan yang hanya bisa dilakukan manusia; setelah ketiganya done, mandor merilis 1.12.0.
