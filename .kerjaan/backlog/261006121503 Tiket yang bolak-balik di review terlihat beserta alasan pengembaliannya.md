---
type: feature
priority: medium
review: normal
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-06 12:15:31
updated: 2026-10-06 12:17:19
related: [261006121501, 261006121502]
blocked_by: [261006121501]
---

## Background

Papan tiket kerjaan hanya berupa folder dan berkas teks di dalam repo:
folder menentukan status (backlog, todo, in_progress, review, done, cancel),
dan setiap tiket satu berkas. Satu-satunya tampilan visual yang ada sekarang
adalah "peta" (graf hubungan antartiket), yang harus dijalankan sendiri untuk
satu repo pada satu waktu.

Tiket yang sudah diserahkan ke review bisa dikembalikan ke in_progress oleh
reviewer bila belum memenuhi syaratnya. Di papan nukitu-mockup hal ini terjadi
31 kali (diukur dari riwayat git 6 Oktober 2026); satu tiket dikembalikan
empat kali. Alasannya tertulis di catatan review di dalam tiket, tetapi tidak
ada cara melihat polanya tanpa membuka tiket satu per satu: tiket mana yang
sering kembali, dan kenapa.

## Request

Satu halaman per proyek menampilkan tiket yang pernah dikembalikan dari review,
diurutkan dari yang paling sering, beserta alasan setiap pengembaliannya,
supaya pola kegagalannya terlihat (misalnya kriteria Done when yang ditulis
kabur, atau uji yang tidak pernah bisa merah).

## Done when
- [ ] Halaman "Bolak-balik review" menampilkan setiap tiket yang pernah pindah
      dari review ke in_progress, dengan jumlah pengembaliannya, terurut dari
      yang terbanyak
- [ ] Untuk papan nukitu-mockup, tiket 260923044806 tampil di atas dengan empat
      pengembalian
- [ ] Jumlahnya dihitung dari History bila ada, dan dari riwayat git untuk
      tiket lama; keduanya digabung tanpa menghitung satu perpindahan dua kali
- [ ] Setiap pengembalian menampilkan alasannya: kalimat keputusan dari catatan
      review itu bila ada, atau isi catatan review itu bila tidak ada kalimat
      keputusan
- [ ] Menekan sebuah tiket membuka halamannya
- [ ] Ringkasan di atas halaman: berapa persen tiket yang lolos review pada
      putaran pertama

## History
- 2026-10-06 12:15:31 backlog

## Notes
- Kalimat keputusan di nukitu ditulis dengan beberapa bentuk, misalnya
  "**Keputusan: kembali ke `in_progress`.**" dan "- Keputusan: lolos, pindah
  ke done." Bentuk yang dikenali harus didaftar dan diuji pada papan nyata.
