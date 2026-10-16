---
type: feature
priority: medium
review:
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:54:01
updated: 2026-10-16 12:56:32
related: [261016105301]
blocked_by: []
---

## Background
Halaman papan sebuah proyek sekarang punya tombol panah di samping nama
proyek. Tombol itu membuka daftar proyek aktif, dan dari daftar itu pemilik
memilih proyek tujuan. Jadi berpindah proyek butuh dua kali klik: buka
daftar, lalu pilih proyeknya. Proyek juga bisa dipilih dengan menekan angka
atau huruf di papan ketik.

Pemilik ingin cukup satu kali klik: semua proyek aktif langsung terlihat
sebagai tombol di kepala halaman (baris paling atas, tempat nama proyek),
seperti tab.

## Request
Kepala halaman papan menampilkan setiap proyek aktif sebagai tombol, sehingga
pindah ke proyek lain cukup satu klik. Tombol panah dengan daftarnya dihapus,
begitu juga pintasan papan ketik untuk berpindah proyek.

## Done when
- [ ] Di kepala halaman papan, setiap proyek aktif tampil sebagai tombol bernama proyek itu, diurutkan menurut nama
- [ ] Tombol proyek yang sedang dibuka ditandai berbeda dari yang lain
- [ ] Satu klik pada tombol proyek lain langsung membuka papan proyek tersebut
- [ ] Proyek yang diarsipkan tidak tampil sebagai tombol
- [ ] Tombol panah dan daftar proyeknya tidak ada lagi
- [ ] Menekan angka atau huruf di papan ketik tidak lagi memindah proyek
- [ ] Bila tombol tidak muat dalam satu baris, termasuk di layar ponsel, deretan tombol bisa digeser ke samping tanpa membuat halaman melebar
- [ ] Tampilannya rapi di layar lebar, di layar ponsel, dan di mode gelap

## History
- 2026-10-16 12:54:01 backlog
- 2026-10-16 12:56:31 todo
- 2026-10-16 12:56:32 in_progress

## Notes
- 2026-10-16 Keputusan mirza, dengan gambar contoh berupa tiga kotak di
  kepala halaman di antara nama proyek dan tanda "langsung": semua proyek
  aktif ditampilkan, termasuk yang sedang dibuka; tombol panah dihapus;
  pintasan papan ketik 1, 2, 3, a, b, c dihapus.
- 2026-10-16 Keputusan mandor: pemilik memilih "sisanya lewat tombol panah"
  untuk proyek yang tidak muat, tetapi juga memilih tombol panah dihapus.
  Karena itu proyek yang tidak muat ditangani dengan menggeser deretan
  tombol ke samping. Pemilik bisa mengubahnya.
- 2026-10-16 12:56:31: files estimated to change: `README.md`, `viewer/app.mjs`, `viewer/uji/pindah.test.mjs`, `viewer/web/gaya.css`, `viewer/web/pindah.js`, `viewer/web/proyek.html`, `viewer/web/proyek.js`
