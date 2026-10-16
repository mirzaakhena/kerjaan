---
type: bug
priority: high
review:
labels: [sesi-a192c9e8, tests, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 18:35:52
updated: 2026-10-16 18:43:39
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
- [ ] Langkah di atas, diulang beberapa kali dengan Chrome lain berjalan, tidak lagi membuat uji viewer gagal karena folder profil
- [ ] Kegagalan membersihkan folder profil Chrome tidak membuat uji gagal dan tidak meninggalkan proses yang terus hidup
- [ ] Uji yang macet dihentikan oleh batas waktu dan dilaporkan gagal, sehingga rangkaian uji selalu selesai
- [ ] Batas waktu itu tidak membuat uji yang sehat gagal di mesin yang sedang sibuk
- [ ] Setelah rangkaian uji selesai, tidak ada proses uji atau Chrome sisa yang masih berjalan

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
