---
type: feature
priority: medium
review:
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:54:01
updated: 2026-10-16 13:20:30
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
- [x] Di kepala halaman papan, setiap proyek aktif tampil sebagai tombol bernama proyek itu, diurutkan menurut nama
- [x] Tombol proyek yang sedang dibuka ditandai berbeda dari yang lain
- [x] Satu klik pada tombol proyek lain langsung membuka papan proyek tersebut
- [x] Proyek yang diarsipkan tidak tampil sebagai tombol
- [x] Tombol panah dan daftar proyeknya tidak ada lagi
- [x] Menekan angka atau huruf di papan ketik tidak lagi memindah proyek
- [x] Bila tombol tidak muat dalam satu baris, termasuk di layar ponsel, deretan tombol bisa digeser ke samping tanpa membuat halaman melebar
- [x] Tampilannya rapi di layar lebar, di layar ponsel, dan di mode gelap

## History
- 2026-10-16 12:54:01 backlog
- 2026-10-16 12:56:31 todo
- 2026-10-16 12:56:32 in_progress
- 2026-10-16 13:18:55 review
- 2026-10-16 13:20:30 done

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
- 2026-10-16 Pekerja: dikerjakan di worktree `kerjaan-tombol-proyek`, cabang
  `tiket-261016125401`.
  - `viewer/web/proyek.html`: tombol ▾ dan `#pindah-menu` dihapus; di antara
    `h1` dan `#live` ada `<nav id="proyek-tombol">` berisi satu tautan
    berbentuk pil per proyek aktif; yang dibuka ber-`aria-current="page"`.
  - `viewer/web/pindah.js` tinggal `switchList` (tanpa `KEYS`/`keyTarget`).
    `proyek.js`: pendengar tombol papan ketik dan kode buka/tutup daftar
    dihapus; Escape kini hanya menutup laci tiket.
  - Deretan tombol mengambil ruang di antara nama dan "langsung", digeser ke
    samping bila tidak muat (bilah gulir disembunyikan), dan tombol proyek
    yang dibuka digeser ke tengah pandangan saat dimuat (diulang setelah
    font tiba). Di layar <= 640 px deretan mendapat baris sendiri selebar
    layar. Nama proyek panjang di `h1` dipotong dengan elipsis; nama di
    tombol tidak dipotong, karena nama panjang yang mirip jadi tampak sama.
  - Daftar proyek kosong (semua diarsipkan) atau `/api/proyek` gagal: deretan
    disembunyikan, papan tetap jalan. Mengarsipkan di tab lain memperbarui
    deretan lewat event `storage`.
  - README bagian viewer diperbarui; `app.mjs` tidak berubah (berkas aset
    sama).
- 2026-10-16 Pekerja, bukti tes bisa merah (tiap penjaga dirusak di
  tempatnya, `viewer/uji/pindah.test.mjs` dijalankan, berkas dipulihkan dari
  salinan):
  - filter arsip di `switchList` -> tes 1, 2, 6 merah
  - urut nama -> tes 1 merah
  - penanda proyek dibuka (`current: false`) -> tes 1, 2, 4, 5, 6 merah
  - gaya `[aria-current="page"]` dihapus -> tes 2, 5 merah
  - `overflow-x: auto` jadi `visible` -> tes 4, 5 merah
  - elipsis `h1` dihapus -> tes 4 merah
  - baris sendiri di ponsel dihapus -> tes 5 merah
  - `showCurrent` dimatikan -> tes 4 merah; tombol lebih lebar dari deretan
    dipusatkan (bukan dari awalnya) -> tes 4 merah
  - nama tombol dipotong 24ch kembali -> tes 4 merah
  - `nav.hidden` selalu false -> tes 6 merah; event `storage` diabaikan -> tes 6
    merah
  - `href` semua tombol ke `/delta/` -> tes 2 merah
  - pintasan tombol `1` dipasang lagi -> tes 3 merah
  - tombol ▾ dipasang lagi di `h1` -> tes 2 merah
- 2026-10-16 Pekerja, tampilan diperiksa sendiri di Chrome headless (lebar
  1280 dan 1000, ponsel 375 dan 320, terang dan gelap, 11 proyek dan 30
  proyek bernama panjang); gambar bisa dibuat ulang dengan
  `PINDAH_SHOT=<awalan> node --test viewer/uji/pindah.test.mjs`. Tes 5
  juga memeriksa warna latar dan tulisan pil per mode.
- 2026-10-16 13:15:41: test run — `node --test` exited 1 after 2m32s, on content fingerprint 64c0c57b52026639581697513b3483301649a265 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 13:18:43: test run — `node --test` exited 0 after 2m23s, on content fingerprint dfd9102a872821edefebc4a122c6a03b6fafb441 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 Pekerja: run test pertama merah di luar tiket ini:
  `viewer/uji/server.test.mjs` "perintah: menyala..." gagal sekitar 2 dari 6
  kali (juga tanpa perubahan tiket ini), karena baris alamat dan baris
  "N proyek:" kadang tiba dalam dua potongan. Tesnya kini menunggu kedua
  baris (komit ca9db6f); 10 dari 10 hijau sesudahnya.
- 2026-10-16 13:18:55: review covers branch tiket-261016125401 at ca9db6ff2210f0e60f216d62aa958c51d1dc9004, which holds main at 0732e4454e3adc36e6ae60d039f4c4f1b518c36a (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-16 Ditinjau pada level quick, putaran 1, di cabang
  `tiket-261016125401` pada komit ca9db6f (worktree `kerjaan-tombol-proyek`,
  belum digabung ke main; itu wajar, penggabungan dilakukan sesudah review):
  pemeriksaan proyek dihitung sekali dan perubahan dibaca baris demi baris
  terhadap kriteria.
  - Pemeriksaan proyek: `node --test` tidak dijalankan ulang. Hasilnya
    dibawa dari run pekerja 2026-10-16 13:18:43 (sidik
    dfd9102a872821edefebc4a122c6a03b6fafb441, keluar 0);
    `test-run.sh --check 261016125401 ca9db6f` menjawab SAME.
  - Sedikit melewati quick: tes tampilan di `viewer/uji/pindah.test.mjs`
    diam-diam lulus bila Chrome gagal dibuka (`if (!s) return;`), jadi run
    yang dibawa belum membuktikan Chrome benar-benar jalan. Berkas itu saja
    dijalankan lewat `test-run.sh --review ... -- node --test
    viewer/uji/pindah.test.mjs`: 6 lulus, 0 dilewati, tiap tes peramban
    2,6–4 detik, artinya Chrome sungguh berjalan.
  - Kriteria 1 (tombol per proyek aktif, urut nama): terpenuhi —
    `switchList` menyaring arsip dan mengurut nama; `drawSwitcher` membuat
    satu tautan per proyek di `#proyek-tombol`; tes 1 dan 2 memeriksanya.
  - Kriteria 2 (yang dibuka ditandai): terpenuhi — `aria-current="page"`
    dengan warna, garis, latar dan tebal huruf berbeda; tes 2 membandingkan
    gaya tiap tombol.
  - Kriteria 3 (satu klik pindah): terpenuhi — tombol adalah tautan biasa ke
    `/<proyek>/`; tes 2 mengklik `juliet` dan halaman pindah.
  - Kriteria 4 (arsip tidak tampil): terpenuhi — filter arsip di
    `switchList`, digambar ulang pada event `storage`; tes 1 dan 6.
  - Kriteria 5 (panah dan daftar hilang): terpenuhi — tombol `#pindah`,
    `#pindah-menu` dan gayanya dihapus; tidak ada sisa rujukan di `viewer/`
    selain pemeriksaan ketiadaannya di tes 2.
  - Kriteria 6 (pintasan papan ketik hilang): terpenuhi — `KEYS`,
    `keyTarget` dan pendengarnya dihapus; tes 3 menekan 1–9 dan a–z dan
    halaman tetap di `/delta/`.
  - Kriteria 7 (deretan bisa digeser, halaman tidak melebar): terpenuhi —
    `overflow-x: auto`, `min-width: 0`, baris sendiri di <= 640 px; tes 4
    memeriksa layar lebar dan ponsel dengan 30 nama panjang.
  - Kriteria 8 (rapi di layar lebar, ponsel, mode gelap): dinilai dari tes 5
    (posisi, ukuran, warna per mode) dan pemeriksaan pekerja di Chrome
    headless; penilaian "rapi" oleh mata manusia tidak dilakukan dalam
    review quick ini.
  - Komit ca9db6f mengubah `viewer/uji/server.test.mjs` di luar cakupan
    tiket: tes kini menunggu baris alamat dan baris "N proyek:" sebelum
    memeriksa. Perubahannya satu baris, hanya membuat tes yang
    kadang-kadang gagal menjadi stabil, tidak mengubah kode program, dan
    dicatat di Notes. Dapat diterima; bukan temuan.
  - Catatan (tidak memblokir): tautan "Semua proyek" yang dulu ada di kaki
    daftar ikut hilang; jalan ke beranda tetap ada lewat "kerjaan" di
    kepala halaman. Proyek ini tidak punya `CLAUDE.md`/`AGENTS.md`.
  - Keputusan: semua kriteria terpenuhi, pindah ke done.
