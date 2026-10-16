---
type: feature
priority: medium
review:
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:53:31
updated: 2026-10-16 12:29:44
related: [261006121501]
blocked_by: []
---

## Background
Penampil papan (halaman web yang menampilkan tiket setiap proyek) punya dua
halaman: daftar proyek berupa kartu dengan tab "aktif" dan "arsip", dan halaman
papan sebuah proyek yang menampilkan kolom per status. Untuk pindah dari papan
satu proyek ke papan proyek lain, saat ini harus kembali dulu ke daftar proyek
lalu mengeklik proyek berikutnya. Pemilik sering berpindah antarproyek, dan
bolak-balik lewat daftar ini terasa repot.

## Request
Dari halaman papan sebuah proyek, pemilik bisa langsung pindah ke papan proyek
lain lewat tombol di kepala halaman (baris paling atas, tempat nama proyek),
tanpa harus kembali ke daftar proyek.

## Done when
- [ ] Di kepala halaman papan ada tombol di dekat nama proyek yang membuka daftar proyek lain
- [ ] Daftar itu memuat proyek yang sedang aktif (bukan yang diarsipkan), dan proyek yang sedang dibuka ditandai
- [ ] Mengeklik salah satu proyek di daftar langsung membuka papan proyek tersebut
- [ ] Proyek di daftar diurutkan menurut nama (abjad), dan masing-masing diberi tanda 1 sampai 9, lalu a, b, c, dan seterusnya bila proyek aktif lebih dari sembilan
- [ ] Di halaman papan, menekan tanda itu di papan ketik langsung membuka papan proyek tersebut, tanpa perlu membuka daftar dulu
- [ ] Tombol itu tidak memindah proyek saat sedang mengetik di kotak pencarian atau kotak isian lain, dan tidak mengganggu pintasan peramban seperti Cmd+1 atau Ctrl+1 untuk pindah tab
- [ ] Tampilannya tetap rapi di layar ponsel dan di mode gelap

## History
- 2026-10-16 10:53:31 todo
- 2026-10-16 12:29:44 in_progress

## Notes
Keputusan awal yang diambil saat tiket dibuat (bisa diubah pemilik):
- Proyek yang diarsipkan tidak ikut di daftar, agar daftar tetap pendek. Arsip
  disimpan per peramban, jadi daftar mengikuti arsip di peramban yang sama.
- Tombol pintasnya angka 1 sampai 9, diteruskan dengan huruf a, b, c, dan
  seterusnya, sesuai permintaan pemilik. Lebih dari sembilan proyek aktif
  jarang terjadi, tetapi tetap ditangani.
- Urutan menurut nama proyek, supaya tanda tiap proyek mudah ditebak dan
  tidak bergantung pada urutan lain. Tanda tetap bisa bergeser saat proyek
  ditambah atau diarsipkan.
- 2026-10-16 Keputusan mandor atas instruksi pemilik untuk langsung mengerjakan tanpa pertanyaan lagi: butir tampilan di ponsel dan mode gelap diperiksa lewat peramban dengan ukuran layar ponsel dan tema gelap; bila tidak bisa dipastikan otomatis, butir itu ditandai menunggu mirza dengan skenario tangan, dan rantai tidak menunggu.
