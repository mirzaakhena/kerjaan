---
type: feature
priority: medium
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

Beberapa kerusakan pada papan tidak menimbulkan galat apa pun, sehingga baru
ketahuan jauh kemudian, kalau sempat ketahuan. Contohnya: tiket yang
menunggu tiket lain yang sudah dibatalkan (sehingga tidak akan pernah bisa
dimulai), tiket yang menyebut ID yang tidak ada, tiket di done yang Done
when-nya masih ada yang belum dicentang, atau `order.md` yang menyebut tiket
yang sudah tidak di todo.

## Request

Satu halaman per proyek mendaftar semua masalah seperti itu, dikelompokkan per
jenis, masing-masing dengan penjelasan singkat kenapa itu masalah dan tiket
mana yang terkena. Halaman depan menunjukkan berapa masalah yang dimiliki
setiap proyek.

## Done when
- [ ] Tiket yang menunggu (blocked_by) tiket di cancel, atau ID yang tidak ada,
      terdaftar
- [ ] Tiket yang menyebut ID yang tidak ada di related atau di tautan `[[ID]]`
      terdaftar
- [ ] Dua berkas yang memakai ID yang sama terdaftar
- [ ] Berkas tanpa frontmatter, dengan kunci frontmatter yang hilang, atau
      dengan nilai type/priority/review di luar yang diizinkan terdaftar
- [ ] Tiket di done yang masih punya butir Done when belum dicentang dan tidak
      dicoret terdaftar
- [ ] Tiket di todo yang tidak ada di `order.md`, dan baris `order.md` yang
      menyebut tiket yang tidak di todo, terdaftar (hanya bila `order.md` ada)
- [ ] Tiket yang sudah lama di in_progress atau review tanpa disentuh terdaftar,
      dengan lamanya
- [ ] Papan tanpa masalah menampilkan bahwa tidak ada yang ditemukan, bukan
      halaman kosong
- [ ] Halaman depan menampilkan jumlah masalah per proyek

## History
- 2026-10-06 12:15:31 backlog

## Notes
- "Lama tanpa disentuh" perlu batas; usulan awal 3 hari dari `updated`.
  Perlu persetujuan Mirza.
- blocked_by yang menunjuk tiket di done bukan masalah (syaratnya sudah
  terpenuhi), jadi tidak didaftar.
