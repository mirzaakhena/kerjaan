---
type: feature
priority: medium
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-16 14:16:07
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
- 2026-10-16 14:13:51 review
- 2026-10-16 14:16:07 done

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
- 2026-10-16 14:13:45: test run — `node --test` exited 0 after 2m27s, on content fingerprint 4060d88317cf0d23c98beff11ecf88b87969f9df (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 14:13:51: review covers branch tiket-261011073102 at 1b77e64d7475cc8bc27aa1b6d7d933948945b323, which holds main at e43b0a9a8c118563f0d4992fa22d6d3984f68aca (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-16 Reviewed at level normal, round 1, at commit 1b77e64 (branch tiket-261011073102, worktree /Users/mirza/Workspace/kerjaan-tanda-belum-gabung, belum digabung ke main — itu memang langkah sesudah review): tiap kriteria dibuktikan dengan menjalankan viewer pada repo buangan, uji tiket ini dijalankan ulang, dan uji-ujinya dibaca. Hasil: lolos.
  - Uji penuh tidak dijalankan ulang: `test-run.sh --check 261011073102 1b77e64` menjawab SAME — isi ini persis yang diuji worker pada 2026-10-16 14:13:45 (`node --test` exit 0, sidik 4060d88317cf0d23c98beff11ecf88b87969f9df). Lewat `test-run.sh --review` reviewer menjalankan `node --test viewer/uji/gabung.test.mjs` di worktree: 10 lulus, 0 dilewati (dua uji peramban ikut berjalan), 22 detik.
  - Percobaan sendiri: folder pindai buangan di scratchpad berisi proyek `repo` (git; done 111…, 222…, 333…, todo 444…; cabang `tiket-111111111111`, `tiket-222222222222`, `rel/333333333333`, `kerjaan/444444444444`, `develop`, masing-masing satu commit di luar main; `long_lived_branches: [develop, "rel/*"]`) dan proyek `polos` (bukan repo, tiket sama). `node viewer/server.mjs --scan <folder> --port 47391` dari worktree, lalu `curl`.
  - Kriteria 1 — terpenuhi. `/repo/api/papan`: 111 dan 222 membawa `unmerged` berisi nama cabangnya; 444 (todo) tidak, meski cabangnya belum digabung. Kartu dan warnanya diperiksa uji peramban (lebar/ponsel, terang/gelap) yang lulus di atas.
  - Kriteria 2 — terpenuhi. Sambil `/repo/events` didengarkan: `git merge tiket-111111111111` → tanda 111 hilang; `git branch -D tiket-222222222222` → tanda 222 hilang; dua `event: change` terkirim tanpa ada perubahan di `.kerjaan/`.
  - Kriteria 3 — terpenuhi. 333 (cabang `rel/333333333333`, cocok pola `rel/*`) tidak ditandai; `develop` tidak muncul di mana pun.
  - Kriteria 4 — terpenuhi. `/polos/api/papan` HTTP 200, empat tiket, tanpa tanda. Uji 8 juga mencakup repo tanpa commit dan proyek di dalam repo induk.
  - Uji dibaca: penegasannya membandingkan nilai nyata (daftar cabang per tiket, warna terhitung, posisi di dalam kartu), tidak ada yang kosong makna. Uji kesepakatan dengan gerbang mulai benar-benar menjalankan update-ticket.sh dan membandingkan daftar cabang yang ia sebut.
  - Penjelasan pemilik: `owner_explanation: off`; `explain.sh check` — belum ada penjelasan, tidak ada yang diperiksa.
  - Catatan (tidak menghalangi): (a) aturan "belum digabung" disalin ke `viewer/gabung.mjs`, tidak memanggil script; satu uji menjaga keduanya tetap sama untuk kasus-kasus dalam uji itu. Dua beda kecil di luar kasus itu: script mengambil 12 angka pertama dari nama cabang meski bagian dari deret angka yang lebih panjang, viewer hanya deret tepat 12 angka; viewer mengaitkan cabang ke setiap ID di namanya, script hanya ke yang pertama. (b) Tiket yang penggabungannya ditahan tetap ditandai — sesuai keputusan mandor di atas dan sesuai kriteria 1 (kodenya memang belum di main). (c) Selama halaman papan terbuka, server memanggil `git for-each-ref` sekali per 2 detik per proyek; ada penjaga agar panggilan tidak bertumpuk dan batas waktu 5 detik, jadi biayanya kecil. (d) Proyek dianggap repo hanya bila foldernya sendiri memuat `.git`; papan yang tidak di akar repo tidak akan pernah bertanda (diasumsikan dan ditulis di gabung.mjs).
