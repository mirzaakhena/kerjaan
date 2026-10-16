---
type: feature
priority: high
review: normal
labels: [viewer, ux]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:42:23
updated: 2026-10-16 09:02:45
related: [261006121501, 261016084901]
blocked_by: [261016084901]
---

## Background

Di papan yang dibuka lewat peramban, mengeklik sebuah kartu membuka "laci"
(panel di sisi kanan layar) yang berisi tiket itu. Bagian atas laci memuat
judul dan sebelas keterangan tiket, satu per baris: tipe, prioritas, tingkat
review, label, pelapor, yang mengerjakan, tanggal dibuat, tanggal diubah,
jumlah butir Done when yang tercentang, tiket terkait, dan tiket yang
ditunggu.

Bagian atas itu diam di tempat. Hanya isi di bawahnya yang ikut bergulir saat
layar digulir. Bagian yang paling sering dibaca, yaitu Background, Request,
dan Done when, hanya kebagian sisa ruang di bawah sebelas baris keterangan
tadi. Di layar laptop sisanya kira-kira separuh tinggi laci, dan di layar
yang lebih pendek jauh lebih sedikit.

## Request

Isi tiket mendapat hampir seluruh tinggi laci. Yang tetap terlihat saat
digulir hanya yang perlu dilihat sekilas: tiket mana ini (status, ID, judul)
dan keadaannya (tipe, prioritas, berapa butir Done when yang sudah selesai).
Keterangan lain tetap ada dan mudah ditemukan, tetapi ikut bergulir bersama
isi. Tidak ada keterangan yang hilang dari laci.

Usulan tata letak (pelaksana boleh mengubah rinciannya selama hasilnya sama):

- Bagian yang diam dibuat ringkas: satu baris status, ID, dan tombol tutup;
  judul paling banyak dua baris; satu baris penanda tipe, prioritas, review,
  dan deretan pil kemajuan Done when yang sama dengan di kartu
  (tiket 261016084901).
- Saat isi digulir ke bawah, judul ikut mengecil menjadi satu baris supaya
  ruang baca bertambah lagi.
- Keterangan lainnya (label, pelapor, yang mengerjakan, tanggal, terkait,
  menunggu) disusun rapat dua kolom sebagai blok pertama di dalam isi yang
  bergulir, sebelum Background.

## Done when
- [ ] Di jendela peramban setinggi 800 piksel, bagian laci yang diam saat isi digulir tidak lebih tinggi dari seperlima tinggi laci
- [ ] Saat isi digulir, status, ID, judul, tipe, prioritas, dan kemajuan Done when tetap terlihat di bagian atas laci
- [ ] Label, pelapor, yang mengerjakan, tanggal dibuat dan diubah, tiket terkait, dan tiket yang ditunggu tetap tampil di laci, ikut bergulir bersama isi
- [ ] Tautan ke tiket terkait dan tiket yang ditunggu tetap bisa diklik dan membuka tiket itu
- [ ] Tiket dengan judul sangat panjang tidak membuat bagian yang diam lebih tinggi dari batas di butir pertama
- [ ] Di layar selebar ponsel (sekitar 390 piksel) laci tetap terbaca tanpa geser ke samping
- [ ] Tampilan terang dan gelap sama-sama terbaca
- [ ] Pemeriksaan proyek (`node --test`) lulus

## History
- 2026-10-16 08:42:23 todo
- 2026-10-16 09:02:45 in_progress

## Notes
- Usulan tata letak di Request datang dari percakapan dengan mirza, 2026-10-16,
  setelah ia menunjukkan bahwa keterangan tiket memakan separuh laci.
- Tiket 261016084202 (progres agen) akan menaruh satu baris progres di bagian
  laci yang diam, jadi bagian itu sebaiknya disisakan tempat untuk satu baris
  tambahan tanpa melanggar batas seperlima.
- Keputusan mirza, 2026-10-16 ("yang ada di todo langsung dieksekusi"):
  pemeriksaan yang hanya bisa dilakukan orang (tampilan terang/gelap, layar
  ponsel, kesan visual) ditunda: worker menulis skenario uji manual di Notes,
  rantai tidak menunggu. Tingkat review `normal`. Usulan tata letak di Request
  dipakai.
