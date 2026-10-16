---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, tests]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:08
updated: 2026-10-16 17:31:44
related: [261016141901, 261016141902, 261016141914]
blocked_by: []
---

## Background

Suite uji berjalan sekitar 150 detik dan lulus 116 dari 116 uji. Tetapi skrip
yang paling sering mengubah papan hanya teruji secara tidak langsung, yaitu
skrip pemindah tiket (pemangkasan daftar urutan, penyisipan riwayat,
penyesuaian nama di daftar urutan) dan skrip pembuat tiket (pembagian ID saat
bersamaan, batas 99 tiket per menit, pengambilalihan kunci basi). Rekaman uji
hanya teruji lewat skrip penggabungan; kasus berkas baru yang belum dilacak
dan isi yang berubah saat uji berjalan belum diuji.

Menjalankan uji dengan menyebut foldernya saja juga gagal, dan belum ada
perintah uji yang tertulis untuk penyumbang.

## Request

Skrip yang paling sering mengubah papan punya uji langsung, dan cara
menjalankan suite tertulis dengan jelas.

## Done when
- [x] Ada uji langsung untuk pemangkasan daftar urutan, penyisipan riwayat dan penggantian nama di daftar urutan
- [x] Ada uji untuk pembuatan tiket bersamaan dan batas jumlah tiket per menit
- [x] Ada uji rekaman uji untuk berkas yang belum dilacak dan isi yang berubah saat uji berjalan
- [ ] README menyebut satu perintah untuk menjalankan semua uji, dan perintah itu berhasil — README sudah menyebutnya; "berhasil" menunggu run hijau, lihat Notes 17:33
- [ ] Waktu jalan suite sebelum dan sesudah tercatat di Notes — sesudah belum terukur dalam keadaan sebanding; lihat Notes 17:33

## History
- 2026-10-16 14:19:08 backlog
- 2026-10-16 14:46:21 todo
- 2026-10-16 16:28:28 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- 2026-10-16 14:36:46: files estimated to change: `README.md`, `uji/new-ticket.test.mjs`, `uji/test-run.test.mjs`, `uji/update-ticket.test.mjs`
- 2026-10-16 16:55: yang sudah tercakup sebelum tiket ini, dan yang ditambahkan.
  - Sudah ada: penghapusan baris di order.md saat dua tiket satu grup dimulai
    bersamaan, termasuk grup yang kosong ikut hilang (`uji/kunci-papan.test.mjs`,
    "dua tiket dari grup yang sama dimulai bersamaan..."); penggantian nama di
    order.md dengan garis miring terbalik (`uji/update-ticket.test.mjs`,
    "--title: backslashes reach order.md..."); bentuk baris riwayat dengan dan
    tanpa sesi (`uji/update-ticket.test.mjs`, `uji/new-ticket.test.mjs`); rekaman
    uji dengan test_command bergaris miring terbalik (`uji/test-run.test.mjs`).
    Pembuatan bersamaan, batas 99, kunci basi, berkas belum dilacak, dan isi
    yang berubah saat uji berjalan belum diuji di mana pun.
  - `uji/update-ticket.test.mjs` (+21 uji): pemangkasan order.md untuk tiap
    tujuan keluar dari todo (backlog, in_progress, done, cancel), grup kosong
    hilang beserta lead-in dua baris, prosa tebal tanpa bullet tetap, ID yang
    hanya berawalan sama tidak ikut, tiket tak terdaftar diberi catatan, papan
    tanpa order.md tidak dibuatkan, tiket yang masuk todo tidak ditambahkan;
    ganti nama hanya mengubah baris tiket itu, judul dirapikan sama dengan nama
    berkas, ganti nama sekaligus keluar todo membuang barisnya, ganti nama di
    luar todo tidak menyentuh order.md; riwayat: baris masuk setelah baris
    History terakhir dan Notes utuh, tiket tanpa History mendapat bagiannya
    tepat sebelum Notes, judul di dalam blok kode bukan bagian, tiket tanpa
    History dan Notes ditolak tanpa satu pun perubahan, penyegaran dan pindah
    ke status yang sama tidak menambah baris.
  - `uji/new-ticket.test.mjs` (+5 uji): menit ID dipatok lewat `date` palsu di
    PATH agar uji tidak pernah melintasi batas menit. 12 pembuatan bersamaan,
    tiga putaran: ID unik 01..12 dan kunci dilepas; nomor dihitung di semua
    folder status; tiket ke-99 dibuat, ke-100 ditolak tanpa menulis apa pun;
    kunci basi (5 menit) diambil alih; kunci segar ditunggu lalu ditolak dan
    dibiarkan.
  - `uji/test-run.test.mjs` (+8 uji): berkas belum dilacak masuk sidik jari
    (ubah, tambah, hapus = DIFFERENT dengan berkasnya disebut) dan indeks asli
    tidak tersentuh; berkas yang diabaikan dan .kerjaan/ di luar sidik jari; uji
    yang menulis berkas baru, mengubah berkas belum dilacak, mengubah atau
    menghapus berkas terlacak dicatat "content changed during the run (<berkas>)",
    kode keluarnya tetap milik perintah, dan --check menjawab NO EVIDENCE; uji
    yang hanya menulis berkas diabaikan tetap bersidik sama; rekaman bersih
    berikutnya menggantikan rekaman yang berubah.
  - README: bagian baru "Running the tests" menyebut `node --test` dari akar
    repo (sama dengan test_command papan ini), menjelaskan bahwa
    `node --test uji/` gagal ("Cannot find module", dicoba di Node 22.20) dan
    cara menjalankan sebagian dengan nama berkas atau glob berkutip
    (`node --test 'uji/*.test.mjs'` dicoba: 218 uji lulus).
- 2026-10-16 16:55: uji dibuktikan bisa merah. Tiap penjaga dirusak di
  salinan skrip, berkas uji terkait dijalankan, lalu skrip dipulihkan dari
  salinannya (cmp sama):
  - update-ticket.sh, order.md: bullet tiket tidak dibuang -> 8 merah; prosa
    tebal tanpa bullet ikut dibuang -> 1; grup kosong dibiarkan -> 2; awalan ID
    tanpa spasi penutup -> 1 ("a bullet that only starts with the same
    digits"); blok dipotong per baris bukan per baris tebal -> 2; ganti nama
    menimpa semua bullet -> 1; ganti nama tidak menyentuh order.md -> 3;
    ganti nama+keluar todo mengganti nama alih-alih membuang -> 1; catatan "not
    listed" dihapus -> 1; order.md dibuat bila tak ada -> 1; tiket masuk todo
    ditambahkan ke order.md -> 1.
  - update-ticket.sh, History: baris ditaruh di akhir berkas -> 11; blok kode
    tidak dilewati -> 2; History tidak ditambahkan bila tak ada -> 2; tanpa
    History dan Notes tidak ditolak -> 1; berkas ditulis sebelum penolakan -> 1;
    baris riwayat juga saat penyegaran -> 2.
  - new-ticket.sh: kunci dihapus (`mkdir -p`) -> 2 (uji bersamaan dan kunci
    segar); kunci basi tidak diambil alih -> 1; kunci segar ikut diambil alih
    -> 2; batas 100 -> 1; batas 98 -> 1; hanya folder tujuan yang dihitung -> 2;
    kunci tidak dilepas -> 3. Catatan: merahnya uji bersamaan tanpa kunci
    bergantung pada balapan yang nyata terjadi (terjadi di sini); uji kunci
    segar menangkapnya secara pasti.
  - test-run.sh: `git add -u` alih-alih `-A` (berkas belum dilacak tak
    terhitung) -> 4; indeks asli yang dipakai -> 5; perubahan saat uji tak
    terdeteksi -> 5; kode keluar tidak diteruskan -> 4; --check mengabaikan
    tanda "berubah" -> 4; .kerjaan/ ikut sidik jari -> 6; berkas diabaikan
    ikut (`add -A -f`) -> 2.
- 2026-10-16 17:05:45: test run — `node --test` exited 1 after 9m35s, on content fingerprint c6a58eca4a876cfc24596e2ebb3447a8c4a5aa13 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 17:12: temuan untuk 261016141914 (tidak menahan tiket ini). Run
  test-run.sh pertama (17:05, keluar 1) gagal di uji pembuatan bersamaan:
  satu dari 12 pembuatan berhenti dengan "Could not lock". new-ticket.sh hanya
  menunggu kuncinya 20 x 0,2 detik, dan ticket-size.sh ikut berjalan di dalam
  kunci; saat itu beban mesin sekitar 240 (30 proses `yes` milik orang lain,
  bukan dari suite ini). Itu perilaku skrip yang sekarang, gagal dengan jelas,
  bukan ID ganda. Ujinya disesuaikan: 8 pembuatan per putaran, penolakan
  "Could not lock" diterima, sedangkan kegagalan lain, ID ganda, atau nomor
  yang berlubang tetap merah; minimal dua harus berhasil. Merusak kuncinya
  (`mkdir -p`) tetap membuat uji ini merah, tiga kali dari tiga percobaan.
- 2026-10-16 17:17:58: test run — `node --test` exited 1 after 8m51s, on content fingerprint 4388e0508dd7014bbbe9769ebccc35863e1ae702 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 17:31:06: test run — `node --test` exited 1 after 11m34s, on content fingerprint 4388e0508dd7014bbbe9769ebccc35863e1ae702 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 17:33: waktu jalan suite (`node --test` dari akar repo).
  - Sebelum (16:29, HEAD 5f68805, sebelum tiket ini mengubah apa pun): 282
    uji, 282 lulus, 238 detik.
  - Sesudah: 316 uji (+34). Tiga run lewat test-run.sh: 17:05 9m35s (1 gagal,
    uji baru pembuatan bersamaan, lihat catatan 17:12), 17:17 8m51s (1 gagal),
    17:31 11m34s (2 gagal). Kegagalan dua run terakhir ada di uji ber-batas
    waktu milik tiket lain yang tidak disentuh tiket ini: kunci-papan
    "update-ticket.sh yang dijalankan test-run.sh tidak menunggu kunci ..."
    (batas 3,5 detik, tercatat 3863 ms) dan merge "catatan \"landed on\" dari
    land menunggu kunci papan". Selama run itu beban mesin naik dari ~240 ke
    ~460: proses `yes` yatim (PPID 1) yang terus bertambah, 30 lalu 46, bukan
    dari repo ini dan tidak dihentikan karena bukan milik pengerja ini. Angka
    sesudah itu tidak sebanding dengan 238 detik dan bukan ukuran suite.
  - Yang tersisa: satu run `test-run.sh 261016141915` saat mesin tidak
    dibebani proses lain, untuk angka sesudah yang sebanding dan bukti hijau.
    Semua uji baru lulus di setiap run itu kecuali yang dicatat 17:12, yang
    sudah diperbaiki sebelum run 17:17.
