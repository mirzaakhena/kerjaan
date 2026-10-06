---
type: feature
priority: high
review: normal
labels: [viewer]
reporter: mirza
assign_to: claude
created: 2026-10-06 12:15:31
updated: 2026-10-06 13:28:53
related: [261006110801]
blocked_by: []
---

## Background

Papan tiket kerjaan hanya berupa folder dan berkas teks di dalam repo:
folder menentukan status (backlog, todo, in_progress, review, done, cancel),
dan setiap tiket satu berkas. Satu-satunya tampilan visual yang ada sekarang
adalah "peta" (graf hubungan antartiket), yang harus dijalankan sendiri untuk
satu repo pada satu waktu.

Mirza memegang beberapa proyek yang masing-masing punya papan, dan papan
terbesar (nukitu-mockup) sudah berisi 300-an tiket. Untuk melihat apa yang ada
di sebuah papan, sekarang orang harus membuka folder satu per satu atau
menjalankan peta untuk satu repo.

Tiket ini adalah fondasi viewer: tempat semua tampilan lain (riwayat tiket,
bolak-balik review, kesehatan papan, saran tindak lanjut) nanti dipasang.

## Request

Satu server di komputer Mirza menampilkan papan setiap proyek di alamatnya
sendiri, misalnya `http://localhost:4321/nukitu-mockup`. Server menemukan
proyeknya sendiri dengan memindai satu folder (misalnya `~/Workspace`): setiap
subfolder yang punya `.kerjaan/` adalah proyek, dan namanya di alamat adalah
nama subfoldernya.

Halaman sebuah proyek berupa papan kanban: satu kolom per status, satu kartu
per tiket, dan kartu bisa dibuka untuk membaca tiketnya. Peta yang sudah ada
menjadi salah satu tab di halaman proyek.

Viewer hanya membaca; tidak ada yang bisa mengubah tiket dari sana.

## Done when
- [x] Dengan satu perintah yang menyebut folder yang dipindai, server menyala
      dan mencetak alamatnya
- [x] Halaman depan menampilkan semua proyek di folder itu yang punya
      `.kerjaan/`, masing-masing dengan jumlah tiket per status; folder tanpa
      `.kerjaan/` tidak muncul
- [x] Proyek yang `.kerjaan/`-nya baru dibuat muncul di halaman depan tanpa
      server dinyalakan ulang
- [x] Halaman proyek menampilkan enam kolom status dengan kartu tiket yang sama
      persis dengan isi folder-foldernya
- [x] Kartu menampilkan judul, ID, tipe, prioritas, dan label; kolom todo
      mengikuti urutan `order.md` bila ada
- [x] Kartu bisa disaring menurut tipe, prioritas, label, dan kata di judul
- [x] Setiap kolom status bisa disembunyikan dan ditampilkan lagi; kolom
      cancel tersembunyi saat halaman pertama kali dibuka, dan jumlah tiket di
      kolom yang tersembunyi tetap terlihat
- [x] Tulisan "urut order.md" di kolom todo bisa ditekan dan menampilkan isi
      `order.md` (alasan urutannya), dengan tiket yang disebutnya bisa ditekan
- [x] Menekan kartu membuka isi tiketnya yang terbaca rapi (judul bagian,
      daftar, kotak centang, blok kode), dan tiket lain yang disebutnya bisa
      ditekan untuk berpindah ke tiket itu
- [x] Memindah, menambah, atau mengubah tiket di folder membuat halaman yang
      sedang terbuka ikut berubah tanpa dimuat ulang
- [x] Tab "Peta" di halaman proyek menampilkan peta yang sama seperti peta yang
      dijalankan sendiri, untuk proyek itu; peta yang dijalankan sendiri tetap
      berfungsi seperti sebelumnya
- [x] Alamat proyek yang tidak ada menampilkan halaman yang mengatakannya,
      dengan tautan kembali ke halaman depan
- [x] Alamat yang dibuat-buat (misalnya berisi `../`) tidak bisa dipakai untuk
      membaca berkas di luar `.kerjaan/` proyeknya
- [x] Server hanya bisa dibuka dari komputer itu sendiri, bukan dari perangkat
      lain di jaringan
- [x] Tampilannya terbaca di layar lebar dan di layar sempit, dan mengikuti mode
      terang/gelap komputer
- [x] Cara menyalakannya tertulis di README

## History
- 2026-10-06 12:15:31 todo
- 2026-10-06 12:23:12 in_progress
- 2026-10-06 13:24:33 review
- 2026-10-06 13:28:53 done

## Notes
- Keputusan Mirza, 6 Oktober 2026: proyek ditemukan dengan memindai satu
  folder (bukan berkas daftar); peta lama menjadi salah satu tab; irisan
  pertama berisi kanban + keempat tampilan di tiket 261006121502–261006121505.
- Rencana teknis (milik pengerja, boleh berubah): `viewer/` di akar repo,
  Node 18+ tanpa dependensi, seperti `map.mjs`. Server mendengar di
  127.0.0.1. Satu modul pembaca papan dipakai bersama oleh semua tampilan.
- `map.html` mengambil datanya dari `/data` dan `/events` (alamat mutlak,
  baris 678 dan 751). Supaya bisa disajikan di `/<proyek>/map/`, keduanya
  dijadikan relatif; dari `map.mjs` di `/` hasilnya tetap sama.
- Repo ini belum punya uji otomatis. Usulan: `node --test` (bawaan Node) untuk
  viewer, dan `test_command` di settings.md diisi dengannya — menunggu
  persetujuan Mirza.
- Mirza menyetujui, 6 Oktober 2026 ("Silakan dimulai"): uji otomatis memakai
  `node --test`, dan `test_command` di settings.md diisi
  `node --test` (semula ditulis `node --test viewer/`; Node tidak menerima
  folder sebagai argumen, jadi tanpa argumen — ia mencari `*.test.mjs` sendiri,
  juga di Node 18). Batas "lama tidak disentuh" untuk 261006121504:
  3 hari sejak `updated`.
- Pengerjaan:
  - `skills/kerjaan/scripts/board.mjs` (baru): pembaca papan yang dipakai
    bersama `map.mjs` dan viewer. Berkas tanpa frontmatter kini dikembalikan
    bertanda `broken` (kanban menampilkannya sebagai "rusak"); peta tetap
    melewatkannya lewat `mapData()`. Keluaran `/data` peta dibandingkan
    sebelum dan sesudah pemisahan, untuk papan nukitu-mockup dan kerjaan:
    sama persis byte demi byte (selain `readAt`).
  - `map.html`: `fetch('/data')` dan `EventSource('/events')` jadi relatif.
  - `viewer/app.mjs` (server, tanpa menyala), `viewer/server.mjs` (perintah),
    `viewer/web/` (halaman; `markdown.js` dan `saring.js` murni supaya bisa
    diuji di Node), `viewer/uji/` (uji).
  - Pengaman jalur: nama proyek hanya diterima bila sama dengan nama folder
    hasil pindaian, ID hanya 12 digit yang ada di papan, aset hanya dari
    daftar tetap. Tidak ada bagian alamat yang digabung ke jalur berkas.
- Uji otomatis: `node --test` → 25 lulus, 0 gagal (lihat baris test run di
  bawah). Folder ujinya `viewer/uji/`, bukan `viewer/test/`: Node menjalankan
  semua berkas di folder bernama `test`, termasuk `bantu.mjs`.
- Dibuktikan merah, tiap penjaga dirusak di salinan repo (scratchpad):
  S1 dengar di 0.0.0.0 → uji perintah (alamat LAN 192.168.1.222 menjawab);
  S2 aset tanpa daftar izin → uji alamat buatan; S3 izinkan selain GET →
  uji hanya-membaca; S4 pantau seluruh folder pindaian → uji proyek lain
  tidak dikabarkan; S5 daftar proyek dibekukan → uji proyek baru (semula
  tetap hijau; ujinya dipertajam agar meminta daftar sebelum proyek dibuat);
  S6 nama di 404 tak di-escape; S7 markdown tanpa escape; S8 semua skema
  tautan diizinkan; S9 peta ikut memuat berkas rusak → dua uji peta;
  S10 todo abaikan order.md; S11 kanban ikut mengirim isi tiket; S12
  perubahan tidak dikabarkan; S13 berkas rusak dibuang dari kanban; S14
  kata cari harus berurutan; S15 ID tak dikenal jadi tautan (semula
  sabotasenya mengenai pemeriksaan yang berlebih; pemeriksaan itu dibuang dan
  penjaga sebenarnya di `ticketLink()` yang dirusak). Semua merah.
- Diperiksa di peramban (Playwright), karena tidak tercakup `node --test`:
  halaman depan dengan 6 proyek di ~/Workspace; kanban nukitu-mockup (296
  tiket) di 1440 px terang dan 390 px gelap, tanpa gulir mendatar (klaim
  "tanpa gulir halaman ganda" di sini salah — lihat ralat di bawah); saringan label dari alamat (80 dari 296); mengetik di
  kolom cari, memilih tipe, "Hapus saringan" (alamat ikut berubah); membuka
  kartu, Esc, tombol back, tautan tiket di dalam laci berpindah tanpa muat
  ulang dokumen; papan sementara: memindah, mengubah, dan menambah berkas dari
  terminal membuat kartu pindah kolom dan laci yang terbuka ikut berubah,
  tanpa muat ulang (penanda di `window` bertahan); tab Peta menampilkan peta
  dengan indikator live. Mode gelap di layar lebar tidak dilihat.
- Ditemukan saat memeriksa: nomor urut todo semula diambil dari posisi di
  `order.md`, sehingga dimulai dari #2 karena `order.md` nukitu masih menyebut
  260930115401 yang sudah di in_progress. Kini nomornya urutan di antara tiket
  yang memang di todo; ketidakcocokan `order.md` menjadi urusan 261006121504.
- Keterbatasan yang diketahui: halaman Peta tidak punya tautan kembali ke
  kanban (map.html disajikan apa adanya); pakai tombol back peramban. Kolom
  dengan lebih dari 60 kartu menampilkan 60 dulu dengan tombol "Tampilkan N
  lagi".
- Playwright menyimpan berkasnya di `nukitu-mockup/.playwright-mcp/` (folder
  lama yang di-gitignore); 18 berkas buatan sesi ini sudah dihapus, isi
  lamanya tidak disentuh.
- 2026-10-06 12:34:41: test run — `node --test` exited 0 after 0m5s, on content fingerprint 3336d3054a0ff112581b9630b0e87b93df7b8f5c (the same before and after the run; .kerjaan/ left out).
- Permintaan Mirza sesudah melihat viewer, 6 Oktober 2026: kolom kanban bisa
  disembunyikan/ditampilkan per status, cancel tersembunyi secara bawaan; isi
  `order.md` bisa dibuka dari kolom todo. Ditambahkan sebagai dua butir Done
  when baru; tiketnya tetap in_progress.
- Pengerjaan dua butir tambahan:
  - Kolom bisa disembunyikan/ditampilkan lewat deretan "Kolom" di bawah
    saringan; tiap chip memuat jumlah tiket kolomnya, juga saat kolomnya
    tersembunyi. Pilihan diingat per peramban (localStorage
    `kerjaan.kolom-tersembunyi`); belum ada pilihan atau isinya rusak →
    bawaan: cancel tersembunyi (`readHidden()` di `saring.js`). Semua kolom
    disembunyikan → pesan penjelas, bukan halaman kosong. Di layar sempit
    deretan ini disembunyikan; pemilih satu-status yang sudah ada tetap
    memuat keenam status.
  - "urut order.md" kini tautan ke `/<proyek>/urutan`: laci yang sama dengan
    tiket, isi `order.md` dirender dengan tiket yang disebutnya bisa
    ditekan. `api/urutan` mengembalikan teksnya apa adanya, 404 bila papan
    tidak punya order.md. Laci ikut berubah bila order.md berubah.
  - Uji baru: `order.md: halamannya sendiri…` dan `kolom tersembunyi: cancel
    secara bawaan…`. Dibuktikan merah: S16 rute api/urutan dimatikan, S17
    bawaan menjadi semua tampil, S18 pilihan tersimpan diabaikan.
- **Ralat:** catatan di atas menyebut kanban "tanpa gulir halaman ganda".
  Itu diukur di papan kerjaan yang kecil. Di nukitu-mockup (250 tiket done)
  kolom done setinggi 6474 px dan halaman bisa digulir 5723 px — kolom tidak
  dibatasi karena tinggi baris grid mengikuti isinya. Diperbaiki
  (`grid-template-rows: minmax(0, 1fr)`); diukur ulang di nukitu: gulir
  halaman 0, kolom done 727 px dan bergulir sendiri.
- Diperiksa di peramban (Playwright) untuk dua butir tambahan: cancel
  tersembunyi saat dibuka; menampilkan cancel, menyembunyikan backlog,
  muat ulang → pilihan bertahan; semua disembunyikan → pesan muncul; membuka
  order.md dari kolom todo, tautan tiket di dalamnya, back kembali ke
  order.md, Esc menutup dan fokus kembali ke tautan "urut order.md"; di
  390 px pemilih status masih memuat cancel, tanpa gulir mendatar; papan
  sementara: mengubah order.md dan memindah tiket saat laci order.md terbuka
  → laci tetap terbuka dan isinya ikut berubah.
- **Belum terjelaskan:** sekali, sesudah membuka order.md dengan klik
  Playwright di nukitu-mockup, lacinya tertutup sendiri (alamat kembali ke
  `/nukitu-mockup/`) sebelum klik berikutnya, padahal tidak ada Esc, klik
  latar, atau tombol Tutup dari saya. Saat itu papan nukitu sedang diubah
  sesi lain. Diulang tiga kali — urutan yang persis sama dengan pushState
  dicatat (hanya dua perpindahan, keduanya dari klik saya), klik dari dalam
  halaman, dan perubahan papan saat laci terbuka — tidak terulang. Dugaan
  "kabar perubahan menutup laci" terbantah oleh percobaan ketiga. Penyebabnya
  tidak diketahui.
- 2026-10-06 13:20:41: test run — `node --test` exited 0 after 0m5s, on content fingerprint 6fd5c152d44187a9b2b89c14e1083cea56c7c77a (the same before and after the run; .kerjaan/ left out).
- 2026-10-06 13:20:51: test run — `node --test` exited 0 after 0m4s, on content fingerprint 46c3c17d5e6ec953d96f15d99a48651cbf5e3bda (the same before and after the run; .kerjaan/ left out).
- Ditinjau pada tingkat normal, putaran 1, pada commit 1eabddf, 6 Oktober 2026: uji proyek tidak dijalankan ulang karena run pengerja mencakup isi yang sama persis; setiap butir Done when dibuktikan dengan menjalankan server dan memeriksanya langsung (curl dan peramban headless), dan ujinya dibaca untuk mencari penegasan yang kosong.
  - Uji: `test-run.sh --check 261006121501` (pohon kerja) → SAME dengan run 2026-10-06 13:20:51, sidik 46c3c17d5e6ec953d96f15d99a48651cbf5e3bda, `node --test` keluar 0. Dibawa dari run pengerja, tidak diulang. (Terhadap commit 1eabddf jawabannya DIFFERENT hanya karena `.claude/settings.local.json` dan `CATATAN-BERIKUTNYA.md` yang tidak di-commit; bukan kode viewer.) Tidak ada cabang terpisah untuk tiket ini; pekerjaannya di `main`.
  - Butir 1 (perintah): `node viewer/server.mjs --scan ~/Workspace --port 0` mencetak `kerjaan viewer: http://127.0.0.1:65414/` dan "6 proyek: …".
  - Butir 2 (halaman depan): `/api/proyek` memuat tepat enam folder yang punya `.kerjaan/` di ~/Workspace (dicocokkan dengan `ls -d ~/Workspace/*/.kerjaan`), masing-masing dengan jumlah per status; folder tanpa `.kerjaan/` di papan uji tidak muncul.
  - Butir 3 (proyek baru): papan sementara, `mkdir p2/.kerjaan` sesudah server menyala → `p2` muncul di `/api/proyek` tanpa restart.
  - Butir 4 (kartu = isi folder): `/nukitu-mockup/api/papan` dibandingkan dengan isi keenam folder di disk: 297 dan 297, sama persis.
  - Butir 5, 6, 7, 8, 9 (dibuka di Chromium headless, papan sementara): kartu memuat judul, ID, tipe, prioritas, label; todo urut sesuai order.md (`…003, …001`, lalu `…002`); saringan kata (`kedua`), label, tipe, prioritas masing-masing menyisakan kartu yang benar dan alamat ikut berubah; saat dibuka cancel tersembunyi, chip-nya tetap "cancel 1"; menampilkan cancel dan menyembunyikan backlog bertahan sesudah muat ulang; "urut order.md" membuka `/p1/urutan` dengan kedua ID sebagai tautan; tiket yang dibuka menampilkan judul bagian, 2 kotak centang (1 tercentang), daftar, blok kode (`## bukan judul` tetap teks), dan tautan ke tiket lain berpindah ke tiket itu tanpa muat ulang dokumen (penanda di `window` bertahan).
  - Butir 10 (berubah langsung): di halaman yang sama, menambah baris ke tiket yang sedang terbuka, memindah satu tiket ke review, dan menambah tiket baru dari terminal → laci, kolom review, dan kolom backlog ikut berubah tanpa muat ulang. Lewat curl, aliran `/p1/events` mengirim 3 `event: change` untuk tambah, ubah, pindah.
  - Butir 11 (peta): `/nukitu-mockup/map/` sama byte demi byte dengan halaman `map.mjs` yang dijalankan sendiri; `/map/data` sama dengan `/data`-nya (297 tiket, `readAt` diabaikan). `/data` dari `map.mjs` versi sebelum commit ini (460a15e) juga sama dengan versi sekarang, jadi peta yang dijalankan sendiri tidak berubah.
  - Butir 12 (404): `/tidak-ada/` → 404, "Proyek "tidak-ada" tidak ada." dan tautan "← Kembali ke daftar proyek".
  - Butir 13 (alamat buatan): delapan alamat dengan `..`, `%2F`, `%2e%2e`, dan `.kerjaan/` langsung (curl `--path-as-is`) → semuanya 404 halaman "tidak ada"; tidak ada isi berkas yang keluar.
  - Butir 14 (hanya komputer ini): `lsof` menunjukkan server mendengar di `127.0.0.1` saja; dari alamat LAN 10.123.255.92 ke porta yang sama curl gagal tersambung (kode 7). POST ditolak 405.
  - Butir 15 (lebar/sempit, terang/gelap): 1440 px gelap di nukitu-mockup (salinan papannya) tanpa gulir halaman (1440×900 = ukuran jendela), latar gelap; 390 px gelap tanpa gulir mendatar dengan pemilih keenam status; 390 px terang dengan laci tiket terbuka, terbaca, tanpa gulir mendatar. Tangkapan layar dilihat sendiri.
  - Butir 16 (README): bagian "The viewer" memuat perintahnya, `--port`, dan cara menjalankan uji.
  - Uji dibaca: penegasannya memeriksa isi, bukan sekadar "tidak gagal". Tidak ada temuan yang menghambat.
  - Catatan (tidak menghambat):
    - Uji "peta yang dijalankan sendiri tetap berfungsi" membandingkan `map.mjs` dengan `mapData()` — keduanya kode baru, jadi ia tidak membandingkan dengan peta sebelum perubahan. Perbandingan dengan versi lama dilakukan di tinjauan ini (lihat butir 11).
    - Uji jangkauan LAN tidak memeriksa apa pun di mesin tanpa alamat IPv4 non-loopback (perulangannya kosong). Di mesin ini ada.
    - Halaman memuat font dari fonts.googleapis.com, jadi viewer lokal ini menghubungi internet tiap dibuka; tanpa internet ia jatuh ke font sistem.
    - Server tidak memeriksa header `Host`. Ia hanya mendengar di 127.0.0.1, tetapi sebuah situs jahat yang dibuka di peramban yang sama secara teori bisa membaca isi tiket lewat DNS rebinding. Ini di luar butir "tidak bisa dibuka dari perangkat lain", yang terpenuhi.
    - Laci order.md yang tertutup sendiri (dicatat pengerja sebagai "belum terjelaskan") tidak terulang di tinjauan ini.

### Suggested follow-up

- **Viewer tidak menolak permintaan dengan header `Host` asing.** Server hanya mendengar di 127.0.0.1, tetapi halaman web lain yang dibuka di peramban yang sama bisa memakai DNS rebinding untuk membaca papan dan isi tiket semua proyek. Layak jadi tiket: server menjawab hanya bila `Host` adalah `127.0.0.1:<porta>` atau `localhost:<porta>`, dan ada uji yang memanggilnya dengan `Host` lain lalu menerima penolakan.
- **Font viewer diambil dari Google Fonts.** Alat yang hanya membaca papan lokal menghubungi server pihak ketiga setiap kali dibuka. Layak jadi tiket bila Mirza ingin viewer sepenuhnya luring: memakai font sistem atau menyertakan berkas fontnya.
