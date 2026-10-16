---
type: feature
priority: high
review: normal
labels: [paralel, mandor, uji]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:10:01
updated: 2026-10-16 10:56:12
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
- Bila penggabungan otomatis sebuah tiket gagal, hanya tiket itu yang ditahan
  menunggu pemilik. Tiket lain yang tidak bergantung padanya tetap berjalan.

## Done when
- [ ] Dua tiket yang dikerjakan bersamaan dan mengubah bagian yang sama berakhir di main dengan uji lulus, tanpa campur tangan pemilik
- [ ] Tiket yang masuk review selalu sudah berada di atas main terbaru, dan catatan ujinya membuktikan uji dijalankan pada keadaan tergabung itu
- [ ] Tiket pertama yang digabung ke main tanpa perubahan di main tidak menjalankan uji untuk kedua kalinya
- [ ] Penggabungan yang lolos tanpa tabrakan teks tetapi membuat uji gagal tidak pernah masuk ke main
- [ ] Bila tiket disesuaikan ulang setelah review dan kodenya berubah, reviewer memeriksa ulang bagian itu sebelum tiket digabung
- [ ] Dua penggabungan ke main tidak pernah berjalan berbarengan
- [ ] Pemilik diberi tahu bila penggabungan otomatis gagal, beserta tiket dan alasannya; hanya tiket itu yang ditahan, dan tiket lain yang tidak bergantung padanya tetap berjalan
- [ ] Uji yang dijalankan reviewer ikut antre di kunci uji yang sama dengan uji pengerja, sehingga keduanya tidak pernah berjalan berbarengan

## History
- 2026-10-16 10:10:01 backlog
- 2026-10-16 10:24:38 todo
- 2026-10-16 10:56:12 in_progress

## Notes
- 2026-10-16 Keputusan pemilik dalam diskusi kerja paralel: penyesuaian ke
  main dilakukan sebelum review; penyelesaian tabrakan diperiksa ulang dengan
  level `quick`; penggabungan ke main otomatis bila uji lulus, bergiliran.
  Ini mengubah aturan sekarang bahwa penggabungan menunggu persetujuan pemilik.
- 2026-10-16 Keputusan mirza sebelum rantai dimulai: dikerjakan berurutan (101002, 101001, 095101) karena ketiganya mengubah panduan yang sama; review `normal`; tidak ada pemeriksaan yang hanya bisa dilakukan manusia; setelah ketiganya done, mandor merilis 1.12.0.
- 2026-10-16 Keputusan mirza: bila penggabungan otomatis gagal, hanya tiket itu yang menunggu pemilik; antrean tidak berhenti total.
- 2026-10-16 Tambahan dari mandor, berasal dari tindak lanjut review 261016101002: reviewer masih menjalankan uji di luar kunci uji, sehingga ujinya bisa bertabrakan dengan uji pengerja di salinan lain. Kunci dan slot tersedia di skills/kerjaan/scripts/lib.sh; nama kunci lain (misalnya `merge`) bisa dipakai untuk penggabungan berurutan.
