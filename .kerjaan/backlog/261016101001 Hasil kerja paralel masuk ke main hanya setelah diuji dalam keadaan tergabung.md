---
type: feature
priority: high
review: normal
labels: [paralel, mandor, uji]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:10:01
updated: 2026-10-16 10:11:18
related: [261016095101, 261016101002]
blocked_by: []
---

## Background
Ketika dua tiket dikerjakan bersamaan di salinan kerja repo yang terpisah
(*worktree*), masing-masing diuji dan diperiksa reviewer secara sendiri-sendiri.
Penggabungan ke jalur utama proyek (*main*) baru dilakukan setelah tiket
selesai, dan sesudah digabung uji tidak dijalankan lagi.

Akibatnya, hasil gabungan dua pekerjaan itu tidak pernah diuji. Dua perubahan
bisa tampak baik saat berdiri sendiri, tetapi rusak ketika digabung. Contohnya,
tiket pertama mengganti nama sesuatu, sedangkan tiket kedua masih memakai nama
lama. Git bisa menggabungkan keduanya tanpa keluhan, padahal hasilnya rusak.

## Request
Tidak ada hasil kerja paralel yang masuk ke main sebelum diuji dalam keadaan
sudah tergabung dengan semua yang sudah ada di main.

- Tiket yang selesai lebih dulu masuk ke main tanpa uji ulang, bila terbukti
  main belum berubah sejak tiket itu diuji.
- Tiket berikutnya disesuaikan dulu dengan main terbaru oleh agen yang
  mengerjakannya, di salinan kerjanya sendiri. Bila ada tabrakan, agen itu yang
  menyelesaikannya, lalu menjalankan uji. Baru setelah itu tiket masuk review,
  sehingga reviewer menilai persis apa yang nanti masuk ke main.
- Bila main berubah lagi saat tiket sudah di review, tiket dikembalikan untuk
  disesuaikan ulang. Bila penyesuaian itu mengubah kode, reviewer memeriksa
  ulang secara singkat, hanya bagian penyelesaian tabrakannya.
- Tiket yang sudah lolos review dan lolos uji dalam keadaan tergabung langsung
  digabung ke main tanpa menunggu persetujuan pemilik. Penggabungan dilakukan
  satu per satu. Pemilik hanya ditanya bila ada masalah.

## Done when
- [ ] Dua tiket yang dikerjakan bersamaan dan mengubah bagian yang sama berakhir di main dengan uji lulus, tanpa campur tangan pemilik
- [ ] Tiket yang masuk review selalu sudah berada di atas main terbaru, dan catatan ujinya membuktikan uji dijalankan pada keadaan tergabung itu
- [ ] Tiket pertama yang digabung ke main tanpa perubahan di main tidak menjalankan uji untuk kedua kalinya
- [ ] Penggabungan yang lolos tanpa tabrakan teks tetapi membuat uji gagal tidak pernah masuk ke main
- [ ] Bila tiket disesuaikan ulang setelah review dan kodenya berubah, reviewer memeriksa ulang bagian itu sebelum tiket digabung
- [ ] Dua penggabungan ke main tidak pernah berjalan berbarengan
- [ ] Pemilik diberi tahu bila penggabungan otomatis gagal, beserta tiket dan alasannya

## History
- 2026-10-16 10:10:01 backlog

## Notes
- 2026-10-16 Keputusan pemilik dalam diskusi kerja paralel: penyesuaian ke
  main dilakukan sebelum review; penyelesaian tabrakan diperiksa ulang dengan
  level `quick`; penggabungan ke main otomatis bila uji lulus, bergiliran.
  Ini mengubah aturan sekarang bahwa penggabungan menunggu persetujuan pemilik.
