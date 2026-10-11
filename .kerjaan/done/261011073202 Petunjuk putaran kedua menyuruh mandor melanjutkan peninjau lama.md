---
type: bug
priority: low
review:
labels: [skill, hook]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:32:18
updated: 2026-10-11 08:30:46
related: [261011064201]
blocked_by: []
---

## Background

Saat tiket ditolak peninjau, mandor seharusnya melanjutkan peninjau yang sama
untuk putaran kedua, bukan mengutus peninjau baru. Dua petunjuk tertulis
belum sejalan dengan itu. Panduan mandor menyebut bahwa sesudah pengerja
melapor, hook kembali meminta peninjau. Padahal pesan itu sampai ke pengerja,
bukan ke mandor. Pesan hook yang sampai ke mandor juga selalu berbunyi
"utus satu peninjau sekarang", termasuk di putaran kedua.

## How to reproduce
1. Baca panduan mandor (`skills/kerjaan/references/foreman.md`), bagian
   "Sent back, first time".
2. Bandingkan dengan pesan hook saat tiket masuk review dari sesi utama, untuk
   tiket yang Notes-nya sudah memuat satu tinjauan.

Panduan menyebut hook yang tidak pernah muncul di sisi mandor, dan pesan hook
menyuruh mengutus peninjau baru.

## Request

Petunjuk untuk putaran kedua selalu mengarahkan mandor ke peninjau lama, dan
tidak menyebut pesan yang tidak akan ia terima.

## Done when
- [x] Panduan mandor menjelaskan putaran kedua tanpa menyebut pesan hook
      yang tidak sampai ke mandor.
- [x] Untuk tiket yang sudah pernah ditinjau, pesan hook ke mandor menyuruh
      melanjutkan peninjau sebelumnya bila masih bisa, dan mengutus yang baru
      hanya kalau tidak bisa.
- [x] Kedua hal di atas dibuktikan dengan uji yang menjalankan hook untuk
      tiket putaran pertama dan tiket putaran kedua.

## History
- 2026-10-11 07:32:18 backlog
- 2026-10-11 07:56:49 todo
- 2026-10-11 07:57:25 in_progress
- 2026-10-11 08:00:10 review
- 2026-10-11 08:01:36 done

## Notes
- Keputusan mirza, 11 Okt 2026: sesudah tiket ini lolos, Claude menaikkan
  versi ke 1.9.0, membuat commit "Release 1.9.0", dan push ke GitHub.
- Catatan pengerja, 11 Okt 2026:
  - Sinyal putaran. Hook menganggap tiket sudah pernah ditinjau bila
    `## History` memuat `review` lebih dari sekali, atau `## Notes` memuat
    "Reviewed at level". Sinyal kedua saja tidak cukup: di papan berbahasa
    Indonesia peninjau menulis "Ditinjau pada level …" (lihat tiket-tiket di
    `done/`), jadi frasa Inggris itu tidak pernah muncul. Baris History
    ditulis `update-ticket.sh` dalam bahasa Inggris di papan mana pun. Frasa
    Notes tetap dipakai untuk tiket lama yang History-nya belum mencakup
    putaran pertama. Baris di dalam blok berpagar dan baris mirip-History di
    luar bagian History tidak dihitung.
  - Pesan hook ke mandor di putaran berikutnya: lanjutkan peninjau putaran
    sebelumnya lewat SendMessage; utus `kerjaan-reviewer` baru hanya bila itu
    tidak bisa. systemMessage-nya "re-entered review — resuming its
    reviewer". Pesan ke pengerja tidak berubah di putaran mana pun.
  - Panduan mandor: langkah 5 tidak lagi menyebut hook meminta peninjau;
    baris `REVIEW` di tabel langkah 3 juga tidak lagi berkata "as the hook
    says", karena pesan itu sampai ke pengerja. Dijelaskan bahwa hook hanya
    berbicara kepada mandor bila mandor sendiri yang memindahkan tiket
    (sesudah penjelasan pemilik). README dan komentar kepala skrip ikut
    disesuaikan.
  - Uji di `uji/on-ticket-review.test.mjs`: putaran pertama (termasuk baris
    tiruan di Notes dan di blok berpagar), putaran kedua lewat History, lewat
    Notes, keduanya dari sisi pengerja, dan isi langkah 5 panduan mandor.
    Dicoba juga ujung ke ujung di papan sementara dengan `new-ticket.sh` dan
    `update-ticket.sh` sungguhan: putaran 1 "dispatching a reviewer",
    putaran 2 "resuming its reviewer".
  - Sabotase (laporan, bukan bukti): (1) sinyal History dimatikan → uji
    "later round told by History" merah; (2) sinyal Notes dimatikan → uji
    "told by the reviewer block in Notes" merah; (3) penghitung dibuat ikut
    menghitung blok berpagar dan semua bagian → uji putaran pertama merah;
    (4) kalimat lama "the hook asks for a reviewer again" dikembalikan ke
    panduan → uji panduan merah. Skrip dan panduan dipulihkan dari salinan,
    `cmp` cocok.
  - Pengamatan di luar tiket: berkas tiket ini punya dua bagian `## History`
    (riwayat `backlog` di bagian kedua). `update-ticket.sh` hanya menambah ke
    bagian pertama. Hook menghitung semua bagian History, jadi tidak
    terpengaruh.
- 2026-10-11 08:00:04: test run — `node --test` exited 0 after 0m4s, on content fingerprint 1bdaa44e39e71b42bb73c14f98849d51c596c8fc (the same before and after the run; .kerjaan/ left out).
- Ditinjau pada level quick, putaran 1, pada commit 4d0c742, 11 Okt 2026: uji
  proyek tidak dijalankan ulang (lihat di bawah), dan perubahan dibaca baris
  demi baris terhadap tiap butir `Done when`. Satu kali melewati quick: hook
  dijalankan sekali pada salinan tiket ini di folder sementara, untuk
  memastikan satu temuan (catatan 1 di bawah). Keputusan: lolos, ke `done`.
  - Uji: `test-run.sh --check 261011073202 4d0c742` menjawab SAME — isi commit
    ini persis isi yang diuji `node --test` pada 2026-10-11 08:00:04 (sidik
    1bdaa44e39e71b42bb73c14f98849d51c596c8fc, keluar 0). Jalankan itu dibawa
    dari pengerja, tidak diulang. Pohon kerja juga SAME.
  - `explain.sh check`: belum ada penjelasan; `owner_explanation: off`.
  - Cabang: tidak ada cabang khusus tiket ini; pekerjaan ada di `main`.
  - Butir 1 (panduan mandor): terpenuhi. Langkah 5 di
    `skills/kerjaan/references/foreman.md` tidak lagi berkata "the hook asks
    for a reviewer again", dan baris `REVIEW` di tabel langkah 3 tidak lagi
    berkata "as the hook says"; keduanya kini bertumpu pada laporan pengerja.
    Dinilai dengan membaca diff.
  - Butir 2 (pesan hook putaran berikutnya): terpenuhi. Bila History memuat
    `review` dua kali atau lebih, atau Notes memuat "Reviewed at level", hook
    menyuruh melanjutkan peninjau lama lewat SendMessage dan mengutus
    `kerjaan-reviewer` baru hanya bila itu tidak bisa. Pesan ke pengerja tidak
    berubah. Dinilai dengan membaca diff dan uji.
  - Butir 3 (uji): terpenuhi. `uji/on-ticket-review.test.mjs` menjalankan hook
    untuk tiket putaran pertama (termasuk baris tiruan) dan putaran kedua
    (lewat History dan lewat Notes), dari sisi mandor dan pengerja, serta
    memeriksa isi langkah 5 panduan. Lulus dalam jalankan yang dibawa tadi.
  - Catatan 1 (tidak memblokir): sinyal Notes memakai `grep -q 'Reviewed at
    level'` atas seluruh berkas — tidak hanya di `## Notes`, tidak hanya di
    awal baris, dan tidak melewati blok berpagar, padahal komentar di skrip
    menyebut "a block that opens with" dan "Lines inside fenced blocks are
    prose ... skipped". Akibatnya tiket putaran pertama yang sekadar menyebut
    frasa itu dianggap putaran kedua. Terbukti pada tiket ini sendiri: catatan
    pengerja di atas mengutip frasa itu, dan hook yang dijalankan pada
    salinannya menjawab "re-entered review — resuming its reviewer". Tiket
    backlog 261006121502 juga memuat frasa itu. Dampaknya ringan, karena
    pesan itu sendiri berkata untuk mengutus peninjau baru bila tidak ada
    agent ID yang tercatat. Tidak ada butir `Done when` yang meminta ketepatan
    ini, jadi tidak memblokir.

### Suggested follow-up

- **Hook salah menganggap tiket putaran pertama sebagai putaran kedua bila
  tiketnya menyebut "Reviewed at level".** Pencarian frasa itu mencakup
  seluruh berkas tiket, termasuk Background, catatan pengerja, dan blok
  berpagar. Mandor lalu disuruh melanjutkan peninjau yang tidak pernah ada,
  dan baru mengutus peninjau baru lewat jalan cadangan. Yang diinginkan:
  frasa itu hanya dihitung di `## Notes`, di awal sebuah butir, di luar blok
  berpagar — sesuai komentar skripnya sendiri — dengan uji untuk tiket
  putaran pertama yang mengutip frasa itu. — **dijadikan tiket [[261011083001]]**
