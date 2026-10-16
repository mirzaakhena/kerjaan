---
type: feature
priority: high
review: normal
labels: [paralel, mandor, antrean]
reporter: mirza
assign_to: claude
created: 2026-10-16 09:51:12
updated: 2026-10-16 12:01:36
related: [261011064201, 261016101001, 261016101002]
blocked_by: []
---

## Background
Setiap memulai kerja, pemilik bertanya tiket mana dari backlog yang bisa
dimasukkan ke antrean untuk dikerjakan hari ini. Sesi utama (mandor) lalu
membaca semua tiket di backlog, menilai kesiapannya, dan menawarkan beberapa
tiket. Pekerjaan membaca ini menghabiskan banyak ruang ingatan mandor,
padahal ruang itu dibutuhkan untuk mengawal tiket-tiket yang sedang
dikerjakan.

Selain itu, pertanyaan yang belum terjawab pada sebuah tiket baru disapu saat
tiket akan mulai dikerjakan, bukan saat tiket masuk antrean. Akibatnya antrean
bisa berisi tiket yang sebenarnya belum siap.

Dua tiket bisa dikerjakan bersamaan oleh dua agen, masing-masing di salinan
kerja repo sendiri (*worktree*). Saat ini, tiket mana yang boleh dikerjakan
bersamaan hanya ditebak dari judul dan isi tiket, tanpa memeriksa bagian
proyek mana yang akan diubah oleh tiap tiket. Aturan yang berlaku juga
melarang dua tiket yang menyentuh file yang sama dikerjakan bersamaan.
Pemilik menganggap tabrakan semacam itu wajar dan bisa diselesaikan, asalkan
diketahui sejak awal.

## Request
Ada agen tersendiri, penyusun antrean, yang menyiapkan isi antrean dari
backlog sehingga semua tiket di antrean siap dikerjakan tanpa pertanyaan lagi,
baik bersamaan maupun berurutan.

- Mandor memanggil penyusun antrean dan hanya menerima laporan ringkasnya.
- Penyusun antrean menilai kesiapan tiap tiket, memecah tiket yang terlalu
  besar, dan memperkirakan bagian proyek yang akan diubah tiap tiket.
- Pertanyaan yang masih perlu jawaban pemilik dititipkan ke mandor. Mandor
  menanyakannya ke pemilik sekaligus, lalu penyusun antrean menuliskan
  jawabannya ke tiket.
- Usulannya membedakan tiket yang bergantung pada hasil tiket lain (tidak
  boleh bersamaan) dari tiket yang hanya mengubah file yang sama (boleh
  bersamaan, dengan urutan penggabungan yang sudah ditentukan).
- Setelah pemilik menyetujui, penyusun antrean sendiri yang memindahkan tiket
  ke antrean dan menuliskan urutannya.

## Done when
- [x] Ketika pemilik bertanya tiket apa yang bisa dikerjakan hari ini, mandor menyerahkan pekerjaan menilai backlog ke penyusun antrean dan tidak membaca tiket backlog sendiri
- [x] Laporan penyusun antrean ke mandor memuat usulan tiket, urutannya, mana yang bisa bersamaan beserta alasannya, dan pertanyaan per tiket
- [x] Setiap tiket yang diusulkan memuat perkiraan bagian proyek yang akan diubahnya, dan satu perintah menampilkan pasangan tiket yang perkiraannya beririsan beserta file irisannya
- [x] Tiket yang hanya beririsan file bisa diusulkan bersamaan dengan urutan penggabungannya, tiket yang menunggu hasil tiket lain tidak pernah diusulkan bersamaan dengan tiket yang ditunggunya, dan panduan kerja paralel di skill menjelaskan pembedaan ini
- [x] Pertanyaan dari beberapa tiket sampai ke pemilik dalam satu kali tanya, jawabannya tertulis di tiket masing-masing, dan tiket yang masih punya pertanyaan terbuka tidak pernah masuk antrean
- [x] Tiket yang melewati batas ukuran sudah dipecah per hasil sebelum diusulkan
- [x] Setelah pemilik menyetujui, tiket berpindah ke antrean dan urutannya beserta alasannya tertulis di file urutan antrean, tanpa mandor melakukannya
- [x] Setelah tiket selesai, ada cara melihat perbedaan antara perkiraan bagian proyek yang diubah dan yang benar-benar diubah

## History
- 2026-10-16 09:51:12 backlog
- 2026-10-16 10:24:38 todo
- 2026-10-16 11:25:15 in_progress
- 2026-10-16 11:59:09 review
- 2026-10-16 12:01:36 done

## Notes
- 2026-10-16 Berasal dari diskusi dengan pemilik tentang kerja paralel.
  Pengujian dan penggabungan hasil kerja paralel dicatat di 261016101001 dan
  261016101002.
- 2026-10-16 Tiket ini semula hanya tentang memperkirakan bagian proyek yang
  diubah tiap tiket dan mengusulkan tiket yang bisa bersamaan. Atas keputusan
  pemilik, tiket ini dilebur menjadi tiket penyusun antrean, karena perkiraan
  itu menjadi tugas penyusun antrean.
- 2026-10-16 Wewenang penyusun antrean yang diputuskan pemilik: menulis
  jawaban pemilik ke tiket, menulis perkiraan bagian proyek yang diubah,
  memecah tiket yang terlalu besar, dan memindahkan tiket yang sudah disetujui
  ke antrean beserta menulis urutannya. Ini berarti pemecahan tiket tidak lagi
  menunggu keputusan pemilik per tiket ketika dilakukan oleh penyusun antrean.
- 2026-10-16 Keputusan mirza sebelum rantai dimulai: dikerjakan berurutan (101002, 101001, 095101) karena ketiganya mengubah panduan yang sama; review `normal`; tidak ada pemeriksaan yang hanya bisa dilakukan manusia; setelah ketiganya done, mandor merilis 1.12.0.
- 2026-10-16 Dikerjakan oleh pengerja. Yang dibangun:
  - Agen baru `agents/kerjaan-planner.md` (penyusun antrean), di samping
    pengerja dan peninjau; plugin memuat semua file di `agents/` tanpa daftar,
    jadi tidak ada pendaftaran tambahan di `plugin.json`. Dua putaran: usulan
    (baca backlog, catat pertanyaan, pecah tiket besar, perkiraan file,
    susun urutan, lapor), lalu dilanjutkan mandor dengan jawaban dan
    persetujuan pemilik (tulis jawaban, pindah ke todo, tulis order.md,
    `queue.sh check`, commit papan).
  - Skrip baru `skills/kerjaan/scripts/queue.sh`: `estimate`, `overlap`,
    `compare`, `ask`, `answer`, `check`. Catatannya berupa baris tetap
    berbahasa Inggris di `## Notes` (seperti catatan test-run), supaya bisa
    dibaca skrip: `files estimated to change:`, `open question:` /
    `answered question:` dengan jawaban menjorok di bawahnya. Nomor pertanyaan
    tidak bergeser ketika pertanyaan lain dijawab lebih dulu.
  - `update-ticket.sh` menolak perpindahan ke `todo` selama tiket masih punya
    `open question`. Fungsi bersama ada di `lib.sh` (`kerjaan_estimate`,
    `kerjaan_open_questions`, `kerjaan_code_rev`, `kerjaan_changed_files`).
  - Panduan: `foreman.md` (bagian baru "Filling the queue"; mandor tidak lagi
    menyapu tiket sendiri di awal rantai, melainkan menjalankan `queue.sh
    check` dan menyerahkan yang belum siap ke penyusun antrean; ringkasan
    akhir memuat perkiraan yang meleset), `SKILL.md` (pemecahan tiket kini
    wewenang penyusun antrean, `--accept-size` tetap milik pemilik),
    `ordering-the-queue.md` (bagian baru "What may share a group"),
    `parallel-work.md` (aturan lama "file sama berarti tidak boleh satu
    kelompok" diganti pembedaan menunggu-hasil vs hanya-berbagi-file),
    `README.md`.
- 2026-10-16 Keputusan teknis pengerja, pertanyaan yang tidak menahan kerja:
  urutan penggabungan di kalimat pembuka kelompok adalah rencana, bukan kunci.
  Tiket yang lolos review tetap langsung digabung (keputusan pemilik di
  261016101001); bila tiket yang disebut kedua lolos lebih dulu, ia masuk
  lebih dulu dan tiket satunya menggabungkannya saat `merge.sh sync`.
  Pilihan lain: menahan tiket kedua di `done` sampai tiket pertama masuk,
  tetapi cabang yang tertahan itu membuat gerbang mulai tiket berikutnya
  menolak, dan bisa macet bila tiket pertama berhenti. Saran: tetap seperti
  sekarang.
- 2026-10-16 Pertanyaan yang tidak menahan kerja: deskripsi di
  `.claude-plugin/plugin.json` belum menyebut agen penyusun antrean (juga
  belum menyebut pengerja). Dibiarkan untuk rilis 1.12.0 oleh mandor.
- 2026-10-16 Laporan uji merah (pengerja; dibaca peninjau sebagai klaim): 30
  uji di `uji/queue.test.mjs`. Setiap penjaga dirusak satu per satu (file
  disalin dulu, dipulihkan dari salinan), dan uji yang tercantum menjadi
  merah: gerbang todo di update-ticket.sh dimatikan -> uji 13; lewati-blok-
  berpagar di lib.sh dihapus -> 5, 15; validasi jalur (seluruhnya, lalu
  `.kerjaan`, jalur absolut, `..` di tengah masing-masing) -> 3; folder
  tanpa garis miring dianggap awalan -> 7; folder di sisi kedua tak dicocokkan
  -> 6; folder tanpa `/` di estimate -> 1; check mengabaikan pertanyaan
  terbuka -> 9, 17; tanpa perkiraan / ukuran / penghalang ditahan / penghalang
  batal / penghalang di backlog / penghalang tak ada, masing-masing diabaikan
  -> 17; penghalang dalam satu angkatan ditolak -> 18; tiket todo tak ada di
  order.md / entri basi diabaikan -> 20; satu kelompok dengan yang ditunggu
  diabaikan, atau tanpa penelusuran berantai -> 21; ditaruh sebelum yang
  ditunggu diabaikan -> 22; satu ID di kalimat pembuka dianggap cukup, atau
  irisan file diabaikan -> 23; penomoran jawaban bergeser -> 9; menjawab dua
  kali dibolehkan -> 11; jawaban disisipkan sebelum baris lanjutan -> 10;
  cabang belum digabung diabaikan -> 27; semua commit dihitung tanpa ID -> 26,
  28; `.kerjaan/` tidak dikecualikan -> 26, 28; jalan dari worktree
  dibolehkan -> 29.
- 2026-10-16 11:58:58: test run — `node --test` exited 0 after 1m21s, on content fingerprint c3e013cac217696cd11db2b945bd489e811d0290 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 Ditinjau pada level normal, putaran 1, pada commit f8db4c5 (dipindah ke review di 4ea18f6): pemeriksaan proyek dijalankan sendiri oleh peninjau di salinan bersih, skrip baru dicoba di repo uji sekali pakai, dan setiap kriteria dinilai satu per satu. Lolos.
  - Pemeriksaan proyek: `node --test` di salinan bersih `git archive 4ea18f6` (`/tmp/review-261016095101`), bukan di pohon kerja, karena pohon kerja berisi perubahan sesi lain di `viewer/` yang ikut terhitung dalam sidik jari uji pengerja. Hasil: 182 uji, 182 lolos, 0 gagal (1m21s). Hasil uji pengerja tidak dipakai.
  - Uji langsung di repo uji sekali pakai (`/tmp/review-261016095101-probe`), dengan skrip dari salinan bersih: `queue.sh estimate` pada tiga tiket (satu berupa folder `src/`); `queue.sh overlap` menampilkan ketiga pasangan beserta file irisannya; `ask` dua kali lalu `answer 1`, dan `update-ticket.sh --status todo` ditolak (keluar 1) selama pertanyaan 2 masih terbuka, lalu diterima setelah dijawab; `answer 1` yang kedua kali ditolak. `queue.sh check` dengan satu kelompok berisi tiket dan tiket yang ditunggunya menghasilkan `NOT READY` dan menyebut pasangan yang menunggu serta tiap pasangan berbagi file yang tidak disebut di kalimat pembuka; setelah dipisah menjadi dua kelompok dan kalimat pembuka menyebut kedua ID, file bersama, dan siapa yang masuk lebih dulu, hasilnya `READY`. `queue.sh compare` menampilkan tiga daftar: diperkirakan dan diubah, diperkirakan tapi tidak diubah, diubah tanpa diperkirakan.
  - Kriteria 3, 4 (bagian skrip), 5 (gerbang todo dan penulisan jawaban), dan 8: dibuktikan dengan menjalankan skrip seperti di atas. Bagian panduan di kriteria 4 dibaca di `parallel-work.md` dan `ordering-the-queue.md` ("What may share a group").
  - Kriteria 1, 2, 6, 7, serta bagian "satu kali tanya" di kriteria 5, menyangkut apa yang dilakukan mandor dan agen penyusun antrean. Kriteria ini hanya dinilai dengan membaca `agents/kerjaan-planner.md`, `references/foreman.md` ("Filling the queue"), dan `SKILL.md`, tanpa menjalankan agen. Panduan itu menyatakan: mandor tidak membaca backlog sendiri dan memanggil penyusun antrean; bentuk laporan memuat usulan, urutan, kelompok beserta alasannya, dan pertanyaan per tiket; tiket di atas batas dipecah per hasil sebelum diusulkan; setelah persetujuan, penyusun antrean yang memindahkan tiket ke todo dan menulis `order.md`, dan mandor tidak melakukannya.
  - Uji di `uji/queue.test.mjs` dibaca: asersinya memeriksa keluaran dan isi tiket yang sebenarnya, tidak ada yang kosong.
  - Catatan, tidak menahan: (1) pesan penolakan `update-ticket.sh` menomori pertanyaan terbuka mulai dari 1 di antara pertanyaan yang masih terbuka saja, sedangkan `queue.sh answer` memakai nomor tetap di antara semua pertanyaan. Di repo uji, pertanyaan nomor 2 tampil sebagai "1. Q two?" padahal harus dijawab dengan `answer <id> 2`. Kalau nomor yang salah dipakai, skrip menolak dengan pesan "already answered", jadi tidak ada data yang rusak, tapi pesannya menyesatkan. `queue.sh check` sudah memakai nomor yang benar. (2) `queue.sh check` hanya memastikan kalimat pembuka menyebut kedua ID. Ia tidak memastikan kalimat itu mengatakan siapa yang masuk lebih dulu; bagian itu bergantung pada panduan.

### Suggested follow-up

- **Nomor pertanyaan di pesan penolakan masuk todo tidak sama dengan nomor yang dipakai untuk menjawab.** Bila pertanyaan 1 sudah dijawab dan pertanyaan 2 belum, `update-ticket.sh` menampilkannya sebagai nomor 1, padahal `queue.sh answer` memerlukan nomor 2. Sebaiknya pesan penolakan memakai nomor yang sama dengan `queue.sh ask`/`check`.
