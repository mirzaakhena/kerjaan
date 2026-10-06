---
type: feature
priority: medium
review: normal
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-06 12:15:31
updated: 2026-10-06 12:17:19
related: [261006121501, 261006110801]
blocked_by: [261006121501]
---

## Background

Papan tiket kerjaan hanya berupa folder dan berkas teks di dalam repo:
folder menentukan status (backlog, todo, in_progress, review, done, cancel),
dan setiap tiket satu berkas. Satu-satunya tampilan visual yang ada sekarang
adalah "peta" (graf hubungan antartiket), yang harus dijalankan sendiri untuk
satu repo pada satu waktu.

Sejak tiket 261006110801, setiap perpindahan status tercatat di bagian History
tiket itu sendiri, lengkap dengan waktunya. Tiket yang dibuat sebelum itu tidak
punya catatan ini. Untuk tiket-tiket itu, satu-satunya jejak adalah riwayat
git, dan riwayat git hanya tahu kapan perpindahan disimpan (di-commit), bukan
kapan terjadinya: di tiket 261006110801 sendiri, git menempatkan "mulai
dikerjakan" 15 menit lebih lambat dari kenyataan dan tidak tahu tiket itu
pernah di todo.

Yang benar dari git: kalau sebuah tiket terlihat di suatu status pada sebuah
commit, tiket itu sudah di status itu *paling lambat* pada waktu commit itu.

## Request

Di halaman sebuah tiket, riwayat hidupnya tampil sebagai garis waktu: setiap
status yang pernah dilaluinya dan kapan, berapa lama ia tinggal di setiap
status, putaran review, dan perubahan kode yang dibuat untuknya.

Waktu yang tepat (dari History) dan waktu yang hanya batas atas (dari git)
dibedakan dengan jelas, sehingga tidak ada yang membaca perkiraan sebagai
fakta. Lama tinggal di sebuah status hanya dihitung dari waktu yang tepat.

## Done when
- [ ] Tiket yang punya History menampilkan setiap barisnya pada garis waktu,
      dengan lama tinggal di setiap status
- [ ] Tiket tanpa History (atau dengan History yang dimulai belakangan)
      menampilkan perpindahan dari git dengan label "paling lambat <waktu>",
      dan tanpa angka lama tinggal untuk perpindahan itu
- [ ] Tiket 261006110801 di papan kerjaan menampilkan review dan done dari
      History (tepat) dan in_progress dari git (paling lambat), sesuai tabel di
      percakapan 6 Oktober yang dicatat di Notes tiket ini
- [ ] Proyek yang bukan repo git tetap menampilkan riwayat dari History, tanpa
      galat
- [ ] Perubahan kode yang pesannya menyebut ID tiket tampil di garis waktu:
      waktu, pesan, dan berkas yang diubah
- [ ] Setiap catatan review di Notes tampil sebagai titik di garis waktu dengan
      tanggal dan keputusannya bila tertulis (lolos atau dikembalikan)
- [ ] Halaman proyek bisa diurutkan menurut lama tiket tinggal di statusnya
      sekarang, hanya untuk tiket yang waktu masuknya tepat

## History
- 2026-10-06 12:15:31 backlog

## Notes
- Perbandingan untuk tiket 261006110801 (6 Oktober 2026): sebenarnya todo
  11:08:24, in_progress sekitar 11:13, review 11:28:28, done 11:30:24.
  History mencatat review 11:28:28 dan done 11:30:24. Git: todo tidak ada,
  in_progress 11:28:28 (commit a4872e6), review 11:28:28, done 11:30:46.
- Pencarian commit berdasarkan ID di pesan juga menangkap commit yang sekadar
  menyebut ID tiket itu (CATATAN-BERIKUTNYA.md butir 4). Perlu diputuskan saat
  dikerjakan: tampilkan semua dengan tanda, atau saring.
- Bentuk judul catatan review di papan nukitu tidak seragam ("### Review
  2026-…", "### Tinjauan, …", "Review — …", atau tanpa judul, hanya butir
  "Reviewed at level …").
