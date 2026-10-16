---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-16 14:11:03
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
- [x] Tiket di done yang cabangnya punya perubahan di luar jalur utama
      ditandai "belum digabung" di papan, beserta nama cabangnya
- [x] Tanda itu hilang dengan sendirinya setelah cabangnya digabung atau
      dihapus
- [x] Cabang yang tercatat sebagai cabang jangka panjang di pengaturan papan
      tidak ikut ditandai
- [x] Proyek yang bukan repo git tetap tampil tanpa galat dan tanpa tanda

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
- 2026-10-16 Dikerjakan di viewer: modul baru `viewer/gabung.mjs`, dipakai `viewer/app.mjs` untuk `api/papan`; kartu di `viewer/web/proyek.js` + `gaya.css`; README bagian viewer. Aturan "belum digabung" ditiru (bukan memanggil script): cabang lokal yang tidak termuat di HEAD (`git for-each-ref --no-merged=HEAD`, satu panggilan git untuk semua cabang, setara `merge-base --is-ancestor` di gerbang mulai update-ticket.sh), dikaitkan ke tiket lewat ID 12 digit di namanya, cabang yang cocok dengan pola `long_lived_branches` dilewati (dibaca dan dicocokkan seperti `case` di script). Satu uji menjalankan update-ticket.sh pada repo yang sama dan memastikan cabang yang dinamai keduanya sama. Bedanya dengan gerbang, disengaja: tiket yang penggabungannya ditahan tetap ditandai (keputusan mandor di atas).
- 2026-10-16 Biaya git: proyek dianggap repo hanya bila foldernya memuat `.git` (papan selalu di akar repo), jadi proyek bukan repo tidak memanggil git sama sekali dan tidak "meminjam" cabang repo induk; papan tanpa tiket done juga tidak memanggil git. Kegagalan git apa pun (repo tanpa commit, dll.) dibaca sebagai "tidak ada yang belum digabung". Agar tanda hilang tanpa perubahan di `.kerjaan/` (cabang dihapus/digabung dengan tangan), selama halaman papan terbuka server memeriksa cabang setiap 2 detik bersama pemeriksaan agen dan mengirim `change` bila berubah.
- 2026-10-16 Bukti uji bisa merah (`viewer/uji/gabung.test.mjs`), tiap rusakan dipulihkan dari salinan: (1) syarat status done di app.mjs dihapus -> uji 3, 4, 9 merah; (2) pengecualian long_lived dihapus -> 3, 4, 6, 9 merah; (3) cek `.git` dihapus -> 8 merah (proyek bukan repo meminjam cabang repo induk); (4) `--no-merged=HEAD` dihapus -> 3, 4, 6, 7, 9 merah; (5) kiriman `change` dari pemeriksaan cabang dimatikan -> 7 dan 10 (peramban) merah; (6) galat git dilempar alih-alih dibaca kosong -> 8 merah; (7) warna tanda diganti -> 9 merah; (8) baris tanda di kartu dihapus -> 9, 10 merah. Pemeriksaan "ada tiket done" sebelum memanggil git hanya penghemat, tidak dijaga uji.
- 2026-10-16 Diperiksa sendiri di Chrome headless (lebar 1280 dan ponsel 375, terang dan gelap; `GABUNG_SHOT=<awalan>` menyimpan gambarnya): tanda terbaca di keempatnya, tetap di dalam kartu, nama cabang panjang patah di dalam kartu tanpa gulir samping, hanya kartu done yang cabangnya belum digabung yang bertanda.
- 2026-10-16 14:11:03: test run — `node --test` exited 0 after 2m12s, on content fingerprint a932eacce2c682104cde7207f71c5ee313d8d51b (the same before and after the run; .kerjaan/ left out). Waited 0m39s for the test lock first, held by another run (ticket 261016130801, slot 1, /Users/mirza/Workspace/kerjaan-catatan-gabung).
