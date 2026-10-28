---
type: bug
priority: low
review: quick
labels: [viewer, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:45
updated: 2026-10-28 19:50:27
related: [261028121401]
blocked_by: []
---

## Background
Selagi uji proyek berjalan, papan menampilkan daftar uji per berkas uji
(261028121401). Alat uji `node --test` menjalankan beberapa berkas
bersamaan, tetapi melaporkan uji tiap berkas menurut urutan berkas. Berkas
yang sudah selesai tetapi berada di belakang berkas yang masih berjalan
tampil "done" dengan daftar kosong sampai berkas di depannya selesai. Pemilik
bisa mengira berkas itu tidak berisi uji atau ujinya hilang.

## How to reproduce
1. Buka papan selagi uji lengkap repo ini berjalan
2. Buka bagian Progress di laci tiketnya
3. Perhatikan berkas uji yang sudah ditandai selesai sementara berkas di atasnya masih berjalan

Berkas itu tampil "done" tanpa satu uji pun.

## Request
Berkas uji yang sudah selesai tetapi daftar ujinya belum tiba ditampilkan
dengan jelas sebagai menunggu daftar, bukan sebagai berkas selesai yang
kosong.

## Done when
- [x] Pada langkah di atas, berkas itu menyebut bahwa daftar ujinya menyusul, bukan tampil selesai dan kosong
- [x] Begitu daftar ujinya tiba, berkas itu tampil seperti berkas selesai lainnya tanpa memuat ulang halaman
- [x] Uji proyek ini lulus, termasuk uji baru untuk kedua hal di atas

## History
- 2026-10-28 18:56:45 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 18:59:31 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 19:35:48 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 19:49:51 a185f853-6a65-4f44-919d-97ba97774e43 review
- 2026-10-28 19:50:27 a185f853-6a65-4f44-919d-97ba97774e43 done

## Notes
- Saran lanjutan peninjau 261028121401; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Usul peninjau: label seperti "tests to follow", atau sembunyikan berkas itu sampai ujinya tiba. Urutan pelaporan node sudah dijelaskan di panduan `SETTINGS.md` ("Reporting each test to the board"). Teks di viewer berbahasa Inggris.
- 2026-10-28 18:59:17: files estimated to change: `viewer/tests/runs.test.mjs`, `viewer/web/run.js`
- Keputusan pekerja: berkas berstatus `ended` tanpa uji diberi label "tests to follow" (kelas `to-follow`), bukan disembunyikan, supaya jumlah berkas tetap terlihat. Akibatnya berkas uji yang memang tanpa uji juga berlabel itu selama run berjalan; run yang selesai tidak tampil lagi, jadi label itu tidak tertinggal.
- Sabotase: `toFollow = false` → uji murni "a file that ended…" dan dua uji browser (1280×800, 390×844) merah; `toFollow` tanpa syarat daftar kosong → empat uji itu ditambah uji gambar daftar uji merah. Dipulihkan dari salinan.
- 2026-10-28 19:49:42: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 7m19s, on content fingerprint 9b899e4b47dbc006e319fe18e6eec830a1cc3830 (the same before and after the run; .kerjaan/ left out).
- 2026-10-28: Reviewed at level quick, round 1, at commit 77077e9: passed.
  Level quick di sini: perubahan dibaca baris demi baris terhadap tiap kriteria, dan uji lengkap tidak dijalankan ulang karena `test-run.sh --check 261028185604` menjawab SAME (run 2026-10-28 19:49:42, exit 0, sidik 9b899e4b47dbc006e319fe18e6eec830a1cc3830). Tidak ada server yang dijalankan.
  - Kriteria 1 (berkas menyebut daftarnya menyusul): `viewer/web/run.js`, fungsi baru `testFile` memberi berkas berstatus `ended` tanpa uji tulisan "tests to follow" dan kelas `to-follow`; berkas lain tetap seperti sebelumnya, termasuk "failed on its own". Uji murni baru dan dua uji browser (1280×800, 390×844) memeriksa tulisan itu terlihat dan tidak ada daftar di bawahnya. Dinilai dengan membaca diff.
  - Kriteria 2 (tampil seperti berkas selesai lain tanpa memuat ulang): uji murni memeriksa label hilang dan daftar muncul setelah ujinya tiba; uji browser menambah baris uji ke berkas laporan, menunggu uji itu tergambar, dan memeriksa penanda `window.__kept` masih ada, jadi halaman tidak dimuat ulang. Dinilai dengan membaca diff dan uji.
  - Kriteria 3 (uji lulus, termasuk uji baru): run yang tercatat lulus pada isi yang sama persis (SAME); uji baru untuk kedua hal ada di `viewer/tests/runs.test.mjs`.
  - Catatan: berkas uji yang memang tanpa uji akan berlabel "tests to follow" selama run berjalan; pekerja sudah mencatat ini dan run yang selesai tidak tampil lagi, jadi bukan temuan.
