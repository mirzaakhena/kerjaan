---
type: bug
priority: high
review:
labels: [sesi-a192c9e8, tests, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 18:35:52
updated: 2026-10-16 18:36:22
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
