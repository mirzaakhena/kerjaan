---
type: feature
priority: medium
review:
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 12:14:46
updated: 2026-10-28 12:47:29
related: [261028112701, 261028121401]
blocked_by: []
---

## Background
Uji sebuah proyek akan bisa melaporkan dirinya ke papan satu per satu selagi
berjalan (261028121401). Tapi melapor itu harus dipasang: proyek yang belum
memasangnya, atau uji yang ditambahkan dengan cara yang tidak ikut melapor,
tetap berjalan dan bisa lulus seperti biasa, hanya tidak terlihat di papan.
Pemilik lalu mengira daftar di papan lengkap padahal tidak.

Pemilik ingin jaminan: tidak ada uji yang lolos tanpa terlihat di papan.

## Request
Jalan uji yang memuat uji yang tidak melapor ke papan tidak bisa dianggap
lulus, sehingga pekerjaan dengan uji seperti itu tidak bisa diserahkan ke
peninjauan sampai ujinya ikut melapor.

## Done when
- [ ] Jalan uji yang semua ujinya lulus tetapi sebagian ujinya tidak melapor ke papan tercatat gagal di tiket, dengan nama atau jumlah uji yang tidak melapor
- [ ] Jalan uji yang semua ujinya melapor tetap tercatat seperti sekarang, lulus atau gagal menurut ujinya sendiri
- [ ] Pengerja tidak bisa membawa tiket dengan jalan uji seperti itu ke peninjauan sebagai lulus, dan peninjau melihatnya sebagai gagal
- [ ] Proyek yang belum ikut melapor diperlakukan sesuai keputusan pemilik (lihat Notes)
- [ ] Pemilik melihat sebuah jalan uji dengan satu uji yang sengaja tidak melapor tercatat gagal (langkah di Notes)

## History
- 2026-10-28 12:14:46 a185f853-6a65-4f44-919d-97ba97774e43 backlog

## Notes
- Dipecah dari 261028112701 oleh planner (28 Okt 2026, sesi a185f853-6a65-4f44-919d-97ba97774e43). Butir dari sana: "uji baru yang tidak melapor ke papan membuat jalan uji gagal atau ditolak peninjau". Kata-kata pemilik: "Harus ada jaminan agar test selalu menyertakan sse event ini" (Notes 261028112701).
- Menunggu 261028121401: yang dihitung di sini adalah laporan uji yang dibuat tiket itu.
- Catatan planner (belum diukur): jaminan paling murah lewat `test-run.sh`, yang sudah dipakai pengerja dan peninjau dan yang catatannya sudah dibaca peninjau lewat `test-run.sh --check` (jalan yang gagal tidak pernah "SAME"). Bila kegagalannya dicatat di sana, peninjau tidak perlu aturan baru; `agents/kerjaan-reviewer.md` sudah 2.994 dari 3.000 kata.
- 2026-10-28 12:15:54: files estimated to change: `README.md`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/SETTINGS.md`, `tests/test-run.test.mjs`
- 2026-10-28 12:16:50: answered question: Bila ada uji yang tidak melapor ke papan, apa yang gagal? Saran: jalan uji itu sendiri dicatat gagal oleh jalur uji kerjaan (dengan jumlah atau nama uji yang tidak melapor), sehingga pengerja tidak bisa menyerahkannya sebagai lulus dan peninjau otomatis melihatnya gagal lewat pemeriksaan yang sudah ada. Ini mesin yang memeriksa, bukan ingatan peninjau, dan tidak butuh aturan baru di definisi peninjau yang sudah penuh (2.994 dari 3.000 kata). Pilihan lain: (b) hanya peninjau yang memeriksa dan menolak: perlu aturan baru di definisi peninjau, aturan lain harus dipangkas, dan bisa terlewat; (c) keduanya: (a) ditambah aturan peninjau.
  answer, 2026-10-28 12:47:03: Tiket dibatalkan pemilik (lihat Notes).
- 2026-10-28 12:16:50: answered question: Proyek yang belum memasang pelapor (misalnya nukitu-mockup hari ini) diperlakukan bagaimana? Saran: jaminan dinyalakan per papan lewat satu setelan, mati sebagai bawaan, dan papan kerjaan sendiri menyalakannya di tiket ini (setelan papan milik pemilik, jadi perlu izin di sini). Tanpa itu, begitu plugin diperbarui, setiap jalan uji di proyek yang belum memasang pelapor langsung tercatat gagal dan pekerjaan di sana berhenti sampai pelapor dipasang. Pilihan lain: (b) wajib di semua proyek sejak rilis; (c) bukan gagal, hanya peringatan di catatan jalan uji untuk proyek yang belum ikut.
  answer, 2026-10-28 12:47:03: Tiket dibatalkan pemilik (lihat Notes).
- 2026-10-28 12:16:51: answered question: Butir 'Pemilik melihat sebuah jalan uji dengan satu uji yang sengaja tidak melapor tercatat gagal' hanya bisa dicek orang. Saran: ditunda (skenario tangan, rantai berjalan terus), karena uji otomatis tiket ini membuktikan hal yang sama. Pilihan lain: rantai berhenti sampai pemilik mengeceknya.
  answer, 2026-10-28 12:47:03: Tiket dibatalkan pemilik (lihat Notes).
- Dibatalkan pemilik 28 Okt 2026 (sesi a185f853-6a65-4f44-919d-97ba97774e43): jaminan ini dinilai terlalu berat dibanding manfaatnya. Jaminan per uji yang sungguhan butuh daftar uji yang diharapkan, terpisah dari laporannya, dan daftar itu khas tiap alat uji; jaminan yang keliru entah meloloskan diam-diam, entah menghentikan pengerja di setiap papan. Penggantinya: tanda "proyek ini belum melapor per uji" di 261028121401.
