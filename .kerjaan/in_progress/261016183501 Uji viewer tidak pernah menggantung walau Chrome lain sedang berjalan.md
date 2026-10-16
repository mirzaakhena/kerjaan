---
type: bug
priority: high
review:
labels: [sesi-a192c9e8, tests, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 18:35:52
updated: 2026-10-16 19:41:31
related: [261016141915, 261016105301]
blocked_by: []
---

## Background

Sebagian uji viewer membuka peramban Chrome tanpa layar untuk memeriksa
tampilan papan, lalu menghapus folder profil Chrome sementara saat selesai.
Bila pada saat yang sama ada rangkaian uji lain di mesin yang juga menjalankan
Chrome, penghapusan itu bisa gagal karena isi folder belum selesai ditulis.
Uji itu lalu gagal. Lebih buruk lagi, prosesnya tidak pernah berhenti, dan
karena perintah uji tidak punya batas waktu, seluruh rangkaian uji ikut
menunggu tanpa akhir.

Pada 2026-10-16 ini terjadi saat tiket 261016141915 menjalankan uji akhirnya.
Semua uji lain lulus, tetapi satu uji tombol proyek gagal membersihkan
profilnya, dan rangkaian uji baru selesai setelah prosesnya dihentikan dengan
tangan 30 menit kemudian. Akibatnya tiket itu tidak bisa masuk review.

## How to reproduce

1. Jalankan rangkaian uji lain yang memakai Chrome di mesin yang sama,
   misalnya uji Playwright dengan beberapa pekerja
2. Bersamaan dengan itu jalankan seluruh uji kerjaan dengan perintah uji di
   pengaturan papan
3. Tunggu sampai semua hasil uji keluar

Sesekali satu uji viewer gagal dengan pesan bahwa folder profil Chrome tidak
kosong, dan proses ujinya tetap hidup tanpa batas waktu, sehingga rangkaian
uji tidak pernah selesai.

## Request

Uji viewer yang memakai Chrome tidak gagal hanya karena Chrome lain sedang
berjalan, dan rangkaian uji kerjaan selalu selesai dalam waktu wajar, lulus
atau gagal, tanpa pernah menggantung.

## Done when
- [x] Langkah di atas, diulang beberapa kali dengan Chrome lain berjalan, tidak lagi membuat uji viewer gagal karena folder profil
- [x] Kegagalan membersihkan folder profil Chrome tidak membuat uji gagal dan tidak meninggalkan proses yang terus hidup
- [x] Uji yang macet dihentikan oleh batas waktu dan dilaporkan gagal, sehingga rangkaian uji selalu selesai
- [x] Batas waktu itu tidak membuat uji yang sehat gagal di mesin yang sedang sibuk
- [x] Setelah rangkaian uji selesai, tidak ada proses uji atau Chrome sisa yang masih berjalan

## History
- 2026-10-16 18:35:52 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec backlog
- 2026-10-16 18:43:00 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec todo
- 2026-10-16 18:43:39 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari rantai batch penilaian skill di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Pemilik memutuskan
  tiket ini dikerjakan sebelum 261016141915 dilanjutkan.
- Temuan teknis dari pengerja 261016141915: `viewer/uji/pindah.test.mjs:205`
  gagal dengan `ENOTEMPTY ... rmdir '<tmp>/kerjaan-chrome-*/Default/Cache/Cache_Data/index-dir'`,
  lalu proses `node viewer/uji/pindah.test.mjs` tidak keluar (0% CPU,
  port localhost masih terbuka, tanpa anak Chrome). `node:test` tidak punya
  batas waktu bawaan. Pembantu Chrome bersama ada di `viewer/uji/peramban.mjs`
  dan `viewer/uji/bantu.mjs`; uji lain yang memakainya kemungkinan punya
  kelemahan yang sama.
- Pemicu nyata: sesi Claude lain di proyek pencatat-keuangan menjalankan
  Playwright dengan 8 pekerja ditambah 8 proses `yes` sebagai beban.
- 2026-10-16 18:37:41: files estimated to change: `viewer/uji/agen-papan.test.mjs`, `viewer/uji/arsip.test.mjs`, `viewer/uji/bantu.mjs`, `viewer/uji/gabung.test.mjs`, `viewer/uji/laci.test.mjs`, `viewer/uji/peramban.mjs`, `viewer/uji/pindah.test.mjs`, `viewer/uji/riwayat.test.mjs`
- 2026-10-16 18:37:53: answered question: Batas waktu untuk uji yang macet dipasang di mana? (a) Hanya di uji viewer yang memakai Chrome dan pembantunya (peramban.mjs, bantu.mjs): pembersihan profil tidak lagi bisa gagal, server dan Chrome selalu ditutup, dan uji Chrome punya batas waktu sendiri. Pengerja bisa melakukan ini seluruhnya. (b) Seperti (a), ditambah batas waktu untuk seluruh rangkaian uji dengan mengubah test_command di .kerjaan/settings.md menjadi misalnya `node --test --test-timeout=120000 --test-force-exit`; settings.md tidak boleh diubah pengerja, jadi perubahan itu dibuat mandor atas izin pemilik, dan run uji 261016141915 berikutnya memakai perintah baru. Saran: (b), karena hanya (b) yang menjamin rangkaian uji selalu selesai, juga bila uji lain di luar viewer suatu saat macet; (a) saja menutup penyebab hari ini tetapi tidak semua kemungkinan.
  answer, 2026-10-16 18:42:58: (b): uji viewer yang memakai Chrome dan pembantunya diperbaiki, ditambah batas waktu untuk seluruh rangkaian uji. Mandor sudah mengubah test_command di .kerjaan/settings.md menjadi node --test --test-timeout=120000 --test-force-exit.
- Temuan penyusun antrean (2026-10-16): penyebab menggantung terbaca di kode.
  `page.close()` di `viewer/uji/peramban.mjs` memanggil `fs.rmSync(profile, ...)`
  tanpa menangkap galat, dan di `pindah.test.mjs`, `arsip.test.mjs` serta
  `riwayat.test.mjs` blok `finally` memanggil `await page.close()` sebelum
  `v.server.close()`; begitu `close()` melempar ENOTEMPTY, server viewer tidak
  pernah ditutup dan proses uji tetap hidup. `laci.test.mjs` dan
  `agen-papan.test.mjs` punya urutan yang sama lewat `browserTest`.
  `gabung.test.mjs` sama: `page.close()` di `finally` dalam, `v.close()` di luar.
  Node di mesin ini v22.20.0, yang punya `--test-timeout` dan `--test-force-exit`.
- Tidak ada butir Done when yang hanya bisa diperiksa orang: pengerja bisa
  membuat beban Chrome sendiri (beberapa Chrome tanpa layar ditambah proses
  `yes`) lalu menjalankan rangkaian uji berulang kali.
- 2026-10-16 19:32:41: laporan pengerja (belum selesai, berhenti untuk keputusan #2). Dikerjakan, belum di-commit, di main tree: `viewer/uji/peramban.mjs` (Chrome dijalankan dalam grup prosesnya sendiri dan selalu dihentikan sekelompok, karena pembantu Chrome (jaringan, renderer) terbukti tetap hidup sampai 25 detik setelah proses utamanya keluar dan terus menulis ke profil, inilah sumber ENOTEMPTY; penghapusan profil diulang sampai 10 kali dan kegagalannya tidak pernah dilempar; Chrome yang belum ditutup dimatikan saat proses berakhir lewat exit, SIGINT, SIGTERM, SIGHUP; tiap langkah ke Chrome gagal sendiri setelah 30 detik atau langsung bila Chrome mati; Chrome mulai diberi waktu 30 detik, bukan 10; `until` bawaan 15 detik, bukan 5; tema terang/gelap dipaksa lewat `Emulation.setEmulatedMedia`), `viewer/uji/pindah.test.mjs`, `arsip.test.mjs`, `riwayat.test.mjs` (`v.server.close()` diganti `await v.close()`; `setup()` di pindah menutup Chrome dan server bila langkah awalnya gagal), uji baru `viewer/uji/peramban.test.mjs` (8 uji) dan `uji/batas-waktu.test.mjs` (3 uji, menjalankan test_command dari settings.md pada berkas uji buangan).
- Temuan tambahan: macOS mesin ini beralih ke tampilan gelap pada malam hari (`AppleInterfaceStyleSwitchesAutomatically` = 1), dan Chrome 155 tanpa layar mengikutinya, sehingga uji tema terang di `gabung.test.mjs` dan `pindah.test.mjs` (yang terakhir adalah "uji 5 yang goyah") gagal dengan `dark: true` mulai sekitar 19:00. Diperbaiki di `peramban.mjs` dengan memaksa skema warna per halaman.
- Pengukuran beban: 4 Chrome tanpa layar dengan halaman sibuk ditambah 4 proses `yes`, di atas Playwright sesi lain (load 70 sampai 133 di 8 inti). Uji viewer dijalankan 5 kali dengan test_command papan: 0 kegagalan karena profil, 0 proses Chrome atau uji tersisa, 0 profil baru tertinggal; tetapi kelima kalinya `viewer/uji/gabung.test.mjs` dibatalkan sebagai satu berkas: 'test timed out after 120000ms'. Tanpa batas waktu, uji viewer yang sama lulus 106/106 dalam 164 detik di bawah beban itu. Seluruh rangkaian tanpa batas waktu (load 16 sampai 45): 326/326 lulus dalam 251 detik. Dengan test_command papan pada load 38 sampai 64: `uji/merge.test.mjs` dan `uji/queue.test.mjs` dibatalkan tepat di 120000 ms walau keduanya sehat (lulus semua dalam 270 detik tanpa batas). Beban sudah dihentikan; tidak ada proses `yes` atau Chrome beban yang tersisa.
- Bukti merah (tiap penjaga dirusak lalu dipulihkan dari salinan): penghapusan profil tanpa try/catch → uji peramban 2 merah; bunuh hanya proses utama, bukan grupnya → uji 6 merah (uji 1 tetap hijau karena `shutDown` menunggu grupnya habis, dan pembantu yang tersisa memang habis dalam 5 detik setelah SIGKILL); tanpa penangan exit → uji 6 merah; tanpa penangan sinyal → uji 7 dan 8 merah; langkah tanpa batas waktu → uji 4 macet sampai berkasnya dibatalkan; tanpa penolakan saat sambungan putus → uji 5 merah; tanpa `setEmulatedMedia` → uji 3 merah (mesin sedang gelap). `uji/batas-waktu.test.mjs` pada salinan yang membuang `--test-force-exit` → uji 1 dan 3 merah; yang membuang `--test-timeout` → uji 1 dan 2 merah (2 tidak selesai dalam 60 detik). Retry `rm` (maxRetries) tidak punya uji yang bisa membuatnya merah secara pasti; jalur kegagalannya ditutup uji 2.
- 2026-10-16 19:32:53: answered question: Batas waktu di test_command terlalu pendek untuk mesin yang sibuk: di Node 22 `--test-timeout` tidak hanya berlaku per uji, tetapi juga untuk tiap berkas uji secara utuh, dan berkas yang sehat butuh lebih dari 120 detik di bawah beban (uji/merge.test.mjs dan uji/queue.test.mjs sekitar 4 menit pada load 25 sampai 45, viewer/uji/gabung.test.mjs lebih dari 2 menit pada load 70 ke atas), sehingga dengan perintah sekarang butir 'Batas waktu itu tidak membuat uji yang sehat gagal di mesin yang sedang sibuk' tidak bisa dipenuhi dan run akhir 261016141915 juga akan gagal. Node 22 tidak punya batas terpisah untuk uji dan untuk berkas. Pengerja tidak boleh mengubah settings.md. Pilihan: (a) test_command menjadi `node --test --test-timeout=900000 --test-force-exit` (15 menit): rangkaian uji tetap selalu selesai, uji yang macet dilaporkan gagal paling lambat 15 menit, dan langkah Chrome di uji viewer sekarang sudah gagal sendiri dalam 30 detik; (b) `--test-timeout=600000` (10 menit): uji macet berhenti lebih cepat, sisa ruang di mesin sibuk sekitar 2 kali lipat saja; (c) tetap 120000 dan menerima bahwa berkas yang lambat gagal saat mesin sibuk (butir 4 dicoret). Saran: (a), karena berkas paling lambat yang terukur sekitar 4 menit dan beban di mesin ini sering naik di atas 60; 15 menit memberi ruang hampir 4 kali lipat dan tetap menjamin rangkaian uji berakhir. Setelah diputuskan, mandor mengubah settings.md lalu pengerja tinggal menjalankan test-run.sh; kode tidak perlu diubah karena uji/batas-waktu.test.mjs membaca perintah dari settings.md.
  answer, 2026-10-16 19:36:54: (a) Batas 15 menit per berkas uji: test_command menjadi node --test --test-timeout=900000 --test-force-exit, diubah mandor atas keputusan pemilik.
- 2026-10-16 19:41:31: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 4m25s, on content fingerprint 129ffcafcfc32dee9c3973f76bc54caa928d91a4 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 19:41:51: setelah jawaban #2 (test_command 900000 ms): kode di-commit (0737872), test-run.sh lulus 327/327 dalam 4m25s dengan Playwright sesi lain berjalan (load sekitar 28); sesudahnya 0 proses Chrome atau uji kerjaan tersisa. Butir 4 bertumpu pada pengukuran sebelumnya: berkas paling lambat sekitar 4 menit pada load 25 sampai 45, dan uji viewer 164 detik pada load sampai 133, jauh di bawah 15 menit.
