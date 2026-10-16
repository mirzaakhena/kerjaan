---
type: bug
priority: medium
review: normal
labels: [explain]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-16 15:02:19
related: [261006121502]
blocked_by: []
---

## Background

Sebelum tiket masuk review, papan bisa meminta pemilik menjelaskan kode
tiket itu dengan kata-katanya sendiri. Untuk itu kerjaan menampilkan daftar
berkas dan baris yang diubah oleh tiket tersebut. Daftar ini disusun dari
setiap perubahan tersimpan (commit) yang pesannya menyebut ID tiket.

Masalahnya, commit yang sekadar menyebut ID tiket, misalnya saat
memindahkan tiket ke todo sambil mengerjakan hal lain, ikut terhitung. Pemilik
lalu diminta menjelaskan perubahan yang bukan pekerjaan tiket itu.

## How to reproduce
1. Di repo `invoice-to-paid` dengan kerjaan 1.7.0, lihat commit `847a419`
   ("Move first-version scope to the README; queue 302 and the login
   ticket"). Commit itu memindahkan tiket 261001213302 ke todo dan sekaligus
   menambahkan bagian "First version" ke README, dan pesannya menyebut
   `261001213302`.
2. Jalankan `explain.sh changes 261001213302`.

Daftarnya memuat `README.md: lines 14-52`, padahal bagian README itu bukan
pekerjaan tiket 261001213302.

## Request

Daftar perubahan sebuah tiket hanya memuat perubahan yang memang dibuat untuk
mengerjakan tiket itu, sehingga pemilik tidak diminta menjelaskan pekerjaan
lain.

## Done when
- [ ] Langkah di atas tidak lagi memuat `README.md: lines 14-52`
- [ ] Perubahan yang dibuat selama tiket dikerjakan tetap tercantum
      seluruhnya
- [ ] Bila aturan baru menuntut cara tertentu menulis pesan commit, aturan
      itu tertulis di bagian "Committing" di SKILL.md
- [ ] Ada uji otomatis yang membuktikan commit yang hanya menyebut ID tiket,
      di luar masa pengerjaannya, tidak ikut terhitung

## History
- 2026-10-11 07:31:49 backlog
- 2026-10-16 15:02:19 cancel

## Notes
- Berasal dari CATATAN-BERIKUTNYA.md butir 4. Pilihan perbaikan, belum
  diputuskan:
  - Hanya menghitung commit yang ID-nya ada di awal subjek pesan
    (`261001213302: ...`), dan menuliskan konvensi itu di SKILL.md.
  - Hanya menghitung commit sejak tiket masuk `in_progress`. Waktu itu sudah
    tercatat di History tiket, yang sudah dibaca script ini, jadi commit
    perencanaan sebelum pekerjaan dimulai tidak ikut terhitung.
  - Keduanya digabung. Pilihan kedua menutup kasus ini tanpa bergantung pada
    disiplin menulis pesan commit.
- Tiket 261006121502 (garis waktu) punya masalah yang sama saat mencari
  commit sebuah tiket; keputusan di sini sebaiknya dipakai juga di sana.
- Dibatalkan oleh mirza, 2026-10-16: fitur penjelasan pemilik akan dihapus seluruhnya (261016141904), jadi daftar perubahan untuk penjelasan tidak diperlukan lagi.
