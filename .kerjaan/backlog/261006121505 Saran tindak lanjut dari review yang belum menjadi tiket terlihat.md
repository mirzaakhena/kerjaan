---
type: feature
priority: low
review: normal
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-06 12:15:31
updated: 2026-10-06 12:17:19
related: [261006121501]
blocked_by: [261006121501]
---

## Background

Papan tiket kerjaan hanya berupa folder dan berkas teks di dalam repo:
folder menentukan status (backlog, todo, in_progress, review, done, cancel),
dan setiap tiket satu berkas. Satu-satunya tampilan visual yang ada sekarang
adalah "peta" (graf hubungan antartiket), yang harus dijalankan sendiri untuk
satu repo pada satu waktu.

Reviewer menulis "Suggested follow-up" di tiket yang ditinjaunya: pekerjaan
yang layak jadi tiket berikutnya. Di papan nukitu-mockup 99 tiket punya bagian
ini (dihitung 6 Oktober 2026). Saran itu baru menjadi pekerjaan kalau ada yang
membuat tiket untuknya, dan tidak ada cara melihat saran mana yang sudah dan
mana yang terlupa.

Tiket yang lahir dari tiket lain mencantumkan tiket asalnya di `related`. Itu
satu-satunya jejak yang ada, dan jejak itu tidak pasti: tiket yang menyebut
tiket asal bisa saja lahir dari pecahan lain, bukan dari sarannya.

## Request

Satu halaman per proyek menampilkan setiap tiket yang punya saran tindak
lanjut, beserta sarannya dan tiket yang mungkin menjadi turunannya. Tiket yang
sarannya belum punya turunan sama sekali ditampilkan paling atas. Karena
hubungan saran–tiket hanya dugaan, halaman menyebutnya "mungkin turunan",
bukan "sudah ditindaklanjuti".

Tiket berlabel `utang` tampil di halaman yang sama: yang masih terbuka dan
yang sudah selesai.

## Done when
- [ ] Setiap tiket dengan bagian Suggested follow-up tampil bersama butir-butir
      sarannya
- [ ] Di sebelahnya tampil tiket yang menyebut tiket itu di related dan dibuat
      sesudah catatan review yang memuat saran itu, berlabel "mungkin turunan"
- [ ] Tiket yang sarannya tidak punya satu pun kemungkinan turunan tampil
      paling atas
- [ ] Tiket berlabel `utang` tampil dalam dua kelompok: terbuka dan selesai
- [ ] Jumlah butir saran dan jumlah tiket dengan saran tanpa turunan tampil di
      atas halaman

## History
- 2026-10-06 12:15:31 backlog

## Notes
- Bentuk judulnya bisa `## Suggested follow-up` atau `### Suggested follow-up`
  (keduanya ada di nukitu).
