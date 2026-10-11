---
type: task
priority: low
review: normal
labels: [skill]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-11 07:32:20
related: []
blocked_by: []
---

## Background

Claude memutuskan kapan memakai skill kerjaan dengan membaca deskripsi singkat
skill itu. Deskripsi ini dimuat di setiap sesi, baik skill-nya dipakai maupun
tidak, jadi panjangnya adalah biaya tetap. Sekarang panjangnya sekitar 190
kata.

Kira-kira separuhnya berupa contoh kalimat dalam dua bahasa ("catat ini dulu",
"put that on the backlog", dan seterusnya). Justru contoh-contoh itulah yang
membuat skill menyala tepat saat dibutuhkan. Memangkasnya tanpa mengukur bisa
menghemat sedikit biaya, tetapi membuat skill diam-diam tidak terpanggil saat
pengguna memintanya dengan kata-kata biasa.

## Request

Deskripsi skill menjadi lebih pendek, dan terbukti lewat uji pemicu bahwa
skill tetap terpanggil (dan tetap tidak terpanggil) sama seringnya dengan
deskripsi sekarang.

## Done when
- [ ] Ada kumpulan kalimat uji, Bahasa Indonesia dan Inggris, yang
      seharusnya memanggil skill dan yang seharusnya tidak, tersimpan di repo
- [ ] Hasil uji pemicu untuk deskripsi lama tercatat sebagai pembanding
- [ ] Deskripsi baru lebih pendek dari yang lama, dengan jumlah katanya
      tercatat di Notes
- [ ] Hasil uji deskripsi baru tidak lebih buruk dari deskripsi lama, baik
      untuk kalimat yang harus memanggil maupun yang tidak boleh memanggil
- [ ] Bila tidak ada deskripsi lebih pendek yang lolos, deskripsi lama tetap
      dipakai dan hasil ujinya dicatat di Notes sebagai alasan

## History
- 2026-10-11 07:31:49 backlog

## Notes
- Berasal dari CATATAN-BERIKUTNYA.md butir 1. Uji pemicu bisa memakai
  fasilitas eval dari skill `skill-creator`.
