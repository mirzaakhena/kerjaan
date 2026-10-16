---
type: feature
priority: medium
review:
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:53:31
updated: 2026-10-16 12:41:47
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
- [x] Di kepala halaman papan ada tombol di dekat nama proyek yang membuka daftar proyek lain
- [x] Daftar itu memuat proyek yang sedang aktif (bukan yang diarsipkan), dan proyek yang sedang dibuka ditandai
- [x] Mengeklik salah satu proyek di daftar langsung membuka papan proyek tersebut
- [x] Proyek di daftar diurutkan menurut nama (abjad), dan masing-masing diberi tanda 1 sampai 9, lalu a, b, c, dan seterusnya bila proyek aktif lebih dari sembilan
- [x] Di halaman papan, menekan tanda itu di papan ketik langsung membuka papan proyek tersebut, tanpa perlu membuka daftar dulu
- [x] Tombol itu tidak memindah proyek saat sedang mengetik di kotak pencarian atau kotak isian lain, dan tidak mengganggu pintasan peramban seperti Cmd+1 atau Ctrl+1 untuk pindah tab
- [x] Tampilannya tetap rapi di layar ponsel dan di mode gelap

## History
- 2026-10-16 10:53:31 todo
- 2026-10-16 12:29:44 in_progress
- 2026-10-16 12:40:55 review
- 2026-10-16 12:41:47 done

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
- 2026-10-16 Pengerjaan (worker):
  - Yang dibangun: tombol ▾ tepat sesudah nama proyek di kepala halaman papan
    (`viewer/web/proyek.html`), membuka daftar proyek aktif urut nama dengan
    tanda `1`–`9` lalu `a`–`z`; proyek yang dibuka ditandai "dibuka". Kaki
    daftar punya tautan "Semua proyek". Logika murni di `viewer/web/pindah.js`
    (`switchList`, `keyTarget`), dipasang di `viewer/web/proyek.js`. Pembaca
    arsip (`ARCHIVED_KEY`, `loadArchived`) dipindah ke `viewer/web/arsip.js`
    dan dipakai bersama beranda dan papan. README bagian viewer ditambah.
  - Keputusan kecil (bisa diubah pemilik): lebih dari 35 proyek aktif, yang
    sesudah `z` tetap tampil di daftar tetapi tanpa tanda. Bila proyek yang
    sedang dibuka sendiri diarsipkan, ia tidak ada di daftar (tidak ada yang
    ditandai); tanda tetap mengikuti proyek aktif saja. Menekan tanda proyek
    yang sedang dibuka tidak melakukan apa-apa. Pintasan diabaikan bila ada
    Cmd, Ctrl, Alt, atau Shift, saat mengetik di input teks, textarea, select,
    atau elemen contenteditable. Escape menutup daftar lebih dulu (fokus
    kembali ke tombol), baru laci tiket pada tekan berikutnya.
  - Diuji: `viewer/uji/pindah.test.mjs` (fungsi murni per pengubah dan per
    jenis kotak isian; peramban sungguhan lewat Chrome tanpa layar: daftar,
    klik, setiap jalan keluar daftar — tombol lagi, Escape, klik di luar, fokus
    pindah ke luar —, tautan Semua proyek, tombol papan ketik `1` dan `b`,
    tidak berpindah saat mengetik di pencarian dan select, dengan Cmd/Ctrl/
    Alt/Shift, untuk proyek yang dibuka dan untuk proyek arsip; daftar kosong;
    daftar proyek yang gagal dibaca; ukuran ponsel 375 px terang dan gelap:
    daftar di dalam layar, di bawah kepala, tanpa geser samping, tombol minimal
    28 px, warna panel dan teks sesuai tema). Tangkapan layar ponsel terang
    dan gelap serta desktop dilihat sendiri.
  - Bukti tes bisa merah (sengaja dirusak satu per satu, dipulihkan dari
    salinan): penyaring arsip di `switchList` (tes 1, 4, 5 merah); pengurutan
    (1); semua pengubah, hanya meta, hanya ctrl (3, 5); cek mengetik dan cek
    textarea/select (3, 5); proyek yang dibuka (3); tanda sesudah z (2); tanpa
    huruf (2, 3, 4, 5); urutan Escape daftar/laci dan kembalinya fokus (4);
    tutup saat klik di luar, saat fokus keluar, tombol yang menutup lagi (4);
    pemasangan papan ketik di `proyek.js` (5); arsip dibaca di halaman papan
    (4, 5); posisi daftar di ponsel dan warna teks tema gelap (6); pesan daftar
    kosong dan pesan galat (7). Dua aturan CSS yang dirusak tetap hijau
    (`.pindah-menu[hidden]` dan `z-index` daftar) ternyata tidak berpengaruh,
    jadi keduanya dihapus.
- 2026-10-16 12:40:48: test run — `node --test` exited 0 after 1m27s, on content fingerprint d0490ed9e23b8354dba39ff4813ee55a4c827f19 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 Review (reviewer): Ditinjau pada tingkat quick, putaran 1, pada commit 082910a (pindah ke review di 233423d): pemeriksaan proyek tidak dijalankan ulang karena sudah dijalankan pekerja pada isi yang sama persis, lalu perubahan dibaca terhadap setiap butir `Done when`.
  - Pemeriksaan: `test-run.sh --check 261016105301 233423d` dan untuk pohon kerja menjawab SAME — `node --test` lulus (exit 0) pada 2026-10-16 12:40:48 dengan sidik isi d0490ed9e23b8354dba39ff4813ee55a4c827f19; hasil itu dipakai, tidak dijalankan ulang. Chrome terpasang di mesin ini, jadi tes peramban di `viewer/uji/pindah.test.mjs` tidak terlewati. Tidak ada worktree atau cabang untuk tiket ini; pekerjaan ada di main. Proyek ini tidak punya CLAUDE.md atau AGENTS.md.
  - Butir 1 (tombol di dekat nama): terpenuhi — tombol ▾ `#pindah` tepat sesudah `#name` di `proyek.html`.
  - Butir 2 (hanya proyek aktif, yang dibuka ditandai): terpenuhi — `switchList` menyaring yang diarsipkan lewat `loadArchived()`, dan proyek yang dibuka diberi `aria-current` dan label "dibuka".
  - Butir 3 (klik membuka papan): terpenuhi — tiap baris adalah tautan ke `/<proyek>/`.
  - Butir 4 (urut nama, tanda 1–9 lalu a, b, c…): terpenuhi — urut `localeCompare`, tanda dari `KEYS`.
  - Butir 5 (tekan tanda langsung pindah): terpenuhi — pendengar `keydown` di `proyek.js` memakai `keyTarget` lalu membuka papan.
  - Butir 6 (tidak saat mengetik, tidak mengganggu Cmd/Ctrl+1): terpenuhi menurut kode — `keyTarget` mengembalikan null bila ada Cmd/Ctrl/Alt/Shift atau saat mengetik di input teks, textarea, select, contenteditable, dan dalam kasus itu `preventDefault` tidak pernah dipanggil, jadi peramban tetap menangani Cmd+1. Bahwa Cmd+1 benar-benar berpindah tab di jendela Chrome sungguhan tidak dicoba, baik oleh pekerja maupun peninjau; dari kode, halaman tidak menyentuh tekanan itu sama sekali.
  - Butir 7 (rapi di ponsel dan mode gelap): dinilai dengan membaca CSS (memakai variabel tema, aturan khusus `max-width: 480px`) ditambah tes peramban 375 px terang dan gelap di dalam run yang dipakai tadi. Tampilan tidak dilihat sendiri oleh peninjau.
  - Catatan (tidak memblokir): menekan tanda proyek saat laci tiket sedang terbuka juga memindah proyek; ini wajar menurut butir 5, hanya disebut agar diketahui.
  - Keputusan: semua butir terpenuhi; tiket pindah ke done.
