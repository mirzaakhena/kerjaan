---
type: task
priority: low
review: normal
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-16 14:46:25
related: [261016141909]
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

Penilaian 2026-10-16 menemukan dua celah lain. Pertama, deskripsi tidak
menyebut pekerjaan terbesar skill ini, yaitu menjalankan antrean lewat
pengerja dan peninjau ("kerjakan tiket berikutnya", "work the queue").
Kedua, kata tunggal seperti "review", "done" dan "todo" bisa memanggil skill
di repo tanpa papan, misalnya saat pengguna meminta review kode biasa, dan
setiap pemanggilan yang salah memuat ribuan token.

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
- [ ] Kalimat uji mencakup permintaan menjalankan antrean ("kerjakan tiket
      berikutnya", "work the queue"), dan deskripsi baru memanggil skill
      untuk kalimat-kalimat itu
- [ ] Kalimat uji mencakup "review kode ini" dan "sudah done" di repo tanpa
      `.kerjaan/`, dan deskripsi baru tidak memanggil skill untuk keduanya
- [ ] Hasil uji deskripsi baru tidak lebih buruk dari deskripsi lama, baik
      untuk kalimat yang harus memanggil maupun yang tidak boleh memanggil
- [ ] Bila tidak ada deskripsi lebih pendek yang lolos, deskripsi lama tetap
      dipakai dan hasil ujinya dicatat di Notes sebagai alasan

## History
- 2026-10-11 07:31:49 backlog
- 2026-10-16 14:46:25 todo

## Notes
- Berasal dari CATATAN-BERIKUTNYA.md butir 1. Uji pemicu bisa memakai
  fasilitas eval dari skill `skill-creator`.
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16), yang menambahkan dua
  butir Done when di atas. Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo.
- 2026-10-16 14:36:48: files estimated to change: `skills/kerjaan/SKILL.md`, `uji/pemicu/`
- 2026-10-16 14:38:10: answered question: Uji pemicu memanggil Claude berkali-kali (claude -p atau eval skill-creator) dan memakai kuota. Setuju, dengan batas sekitar 40 kalimat dikali 3 ulangan per deskripsi? Saran: setuju dengan batas itu.
  answer, 2026-10-16 14:45:49: Setuju, dengan batas sekitar 40 kalimat dikali 3 ulangan per deskripsi.
