---
type: feature
priority: high
review: normal
labels: [viewer, ux]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:42:23
updated: 2026-10-16 09:12:50
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
- [x] Di jendela peramban setinggi 800 piksel, bagian laci yang diam saat isi digulir tidak lebih tinggi dari seperlima tinggi laci
- [x] Saat isi digulir, status, ID, judul, tipe, prioritas, dan kemajuan Done when tetap terlihat di bagian atas laci
- [x] Label, pelapor, yang mengerjakan, tanggal dibuat dan diubah, tiket terkait, dan tiket yang ditunggu tetap tampil di laci, ikut bergulir bersama isi
- [x] Tautan ke tiket terkait dan tiket yang ditunggu tetap bisa diklik dan membuka tiket itu
- [x] Tiket dengan judul sangat panjang tidak membuat bagian yang diam lebih tinggi dari batas di butir pertama
- [x] Di layar selebar ponsel (sekitar 390 piksel) laci tetap terbaca tanpa geser ke samping
- [ ] Tampilan terang dan gelap sama-sama terbaca — menunggu mirza: skenario uji manual di Notes
- [x] Pemeriksaan proyek (`node --test`) lulus

## History
- 2026-10-16 08:42:23 todo
- 2026-10-16 09:02:45 in_progress
- 2026-10-16 09:11:20 review
- 2026-10-16 09:12:50 done

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
- Pengerjaan (worker, 2026-10-16):
  - Bagian laci yang diam kini: satu baris status, ID, tombol Tutup; judul
    dipotong dua baris (satu baris begitu isi digulir); satu baris tipe,
    prioritas, review, dan deretan pil Done when (dari `pil.js`) dengan
    hitungan `n/m`. Label, pelapor, yang mengerjakan, dibuat, diubah,
    terkait, dan menunggu menjadi blok pertama isi yang bergulir, dua
    pasang per baris (satu kolom di bawah 480 px); Terkait dan Menunggu
    selebar blok. Bila judul terpotong, judul utuh tampil di awal isi.
  - HTML laci dipisah ke `viewer/web/laci.js` (murni, diuji di Node);
    `proyek.js` hanya memasang dan mengatur lipatan judul. Lipatan judul
    hanya terjadi bila isi masih bisa digulir lebih dari 64 px, supaya
    tidak berkedip saat bagian diam menyusut.
  - Ukuran terukur di Chrome (papan ini sendiri): 1280×800 bagian diam 91 px
    dari 800 (batas 160), jadi tersisa sekitar 69 px untuk baris progres
    agen dari 261016084202; 390×844 bagian diam 113 px (judul dua baris),
    91 px setelah digulir.
  - Uji baru `viewer/uji/laci.test.mjs`: empat uji murni (apa di bagian diam,
    apa di bagian bergulir, nilai kosong, catatan rusak/ID ganda) dan enam uji
    di Chrome headless lewat DevTools (`viewer/uji/peramban.mjs`, tanpa
    dependensi; dilewati bila Chrome tidak terpasang): tinggi bagian diam
    ≤ seperlima (dan masih ada 20 px untuk satu baris lagi di 800 px)
    sebelum dan sesudah digulir untuk judul pendek dan sangat panjang, di
    1280×800 dan 390×844; status/ID/judul/tipe/prioritas/pil tetap terlihat
    setelah digulir; tidak ada geser ke samping maupun teks yang terpotong
    ke samping; urutan keterangan sebelum Background; tautan Terkait dan
    Menunggu membuka tiketnya; Tutup dan Escape menutup laci.
  - Bukti uji bisa merah (tiap penjaga dirusak dari salinan, lalu
    dipulihkan dari salinan itu):
    - clamp dua baris judul dihapus: merah uji tinggi 1280 dan 390, uji
      judul utuh.
    - clamp satu baris saat digulir dihapus: merah uji tinggi 1280 dan 390.
    - lipatan judul tidak pernah aktif (`foldTitle`): merah uji tinggi
      1280 dan 390.
    - judul utuh tidak pernah ditampilkan: merah uji judul utuh.
    - keterangan dipindah kembali ke bagian diam: merah enam uji peramban.
    - `.facts .tag` tidak boleh membungkus: merah uji geser samping 1280
      dan 390.
    - `overflow-wrap` di `.facts dd` dihapus: merah uji geser samping 390
      (awalnya hijau karena teksnya terpotong diam-diam; uji ditambah
      pemeriksaan teks yang melebihi kotaknya, baru merah).
    - `data-id` di tautan tiket dihapus: merah uji murni tautan dan uji klik.
    - pasangan Pelapor dihapus: merah tiga uji (dua murni, satu peramban).
    - pil dihapus dari bagian diam: merah uji murni bagian diam dan uji
      tinggi/terlihat 1280 dan 390.
    - padding bagian diam dibesarkan 40 px: merah uji tinggi 1280 (sisa
      satu baris).
  - Laci order.md diperiksa di peramban: terbuka, judulnya tampil, Tutup
    kembali ke papan.
- Skenario uji manual (menunggu mirza, butir terang/gelap):
  1. Jalankan viewer dari akar repo ini (seperti biasa) dan buka papan
     `kerjaan` di peramban dengan sistem dalam mode terang.
  2. Klik kartu 261016084201. Di bagian atas laci: titik dan tulisan status,
     ID, tombol Tutup; judul; baris tipe (feature), prioritas (high),
     "review normal", dan deretan pil dengan hitungan di kanan.
  3. Gulir isi laci ke bawah: judul menjadi satu baris, baris-baris tadi
     tetap di atas; blok keterangan abu-abu (Label sampai Menunggu) ikut
     tergulir hilang.
  4. Ganti sistem ke mode gelap dan ulangi langkah 2–3.
  5. Yang harus terlihat di kedua mode: semua tulisan di bagian atas dan di
     blok keterangan terbaca jelas di atas latarnya, label di blok
     keterangan tampak sebagai kotak kecil yang terpisah dari latar blok,
     pil tercentang (hijau) dan belum (bergaris tepi) mudah dibedakan.
  6. (Ponsel, opsional) Buka tiket yang sama di ponsel: tidak ada geser ke
     samping, blok keterangan satu kolom.
- 2026-10-16 09:11:12: test run — `node --test` exited 0 after 0m10s, on content fingerprint 3e43cc822476c3078f7ee457e0bc828c64f62aa3 (the same before and after the run; .kerjaan/ left out).
- Review (reviewer, 2026-10-16). Ditinjau di tingkat normal, putaran 1, pada
  commit e51a246: setiap butir Done when dibuktikan dengan menjalankan
  sesuatu, dan uji-ujinya dibaca untuk memastikan uji itu benar-benar
  memeriksa yang dijanjikan namanya.
  - `node --test` tidak dijalankan ulang: `test-run.sh --check` menjawab
    SAME, isi pohon kerja sama persis dengan yang diuji worker pada
    2026-10-16 09:11:12 (sidik 3e43cc822476c3078f7ee457e0bc828c64f62aa3,
    keluar 0). Hasil itu dipakai sebagai satu-satunya jalankan uji penuh.
  - `node --test viewer/uji/laci.test.mjs` dijalankan sendiri: 10 lulus,
    0 dilewati. Jadi keenam uji Chrome benar-benar berjalan, bukan dilewati.
  - Uji di `laci.test.mjs` dibaca: semuanya mengukur hal nyata di peramban
    (tinggi bagian diam dibanding seperlima laci, terlihat di layar setelah
    digulir, lebar gulir halaman/laci, teks yang melebihi kotaknya, klik
    tautan yang mengganti tiket dan alamat). Tidak ada uji yang kosong.
  - Pemeriksaan tambahan sendiri di Chrome headless, dengan tiket 25 butir
    Done when dan judul sangat panjang: 1280×800 bagian diam 113 px
    (batas 160), 91 px setelah digulir; 390×844 dan 320×568 juga 113/91 px,
    tanpa geser ke samping, deretan pil tetap di dalam laci.
  - Butir 1–6 dan 8: terpenuhi, dibuktikan oleh uji Chrome yang dijalankan
    di atas dan oleh pemeriksaan tambahan tadi.
  - Butir 7 (terang/gelap): menunggu mirza, sesuai keputusannya yang
    tercatat di Notes. Skenario uji manual ada dan bisa diikuti, serta
    berakhir pada apa yang harus terlihat. Butir ini tidak menghalangi.
  - Catatan, tidak menghalangi: proyek ini tidak punya CLAUDE.md atau
    AGENTS.md, jadi tidak ada aturan proyek tertulis yang diperiksa. Pekerjaan
    ada langsung di main; tidak ada cabang terpisah untuk tiket ini.

### Suggested follow-up

- **Mode gelap belum pernah diperiksa mesin.** `viewer/uji/peramban.mjs`
  sudah bisa membuka Chrome dalam mode gelap (`openBrowser({ dark: true })`),
  tetapi tidak ada uji yang memakainya. Layak jadi tiket: uji yang membuka
  laci dalam mode terang dan gelap dan memeriksa kontras tulisan terhadap
  latarnya, supaya pemeriksaan terang/gelap tidak selalu menunggu orang.
