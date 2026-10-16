---
type: bug
priority: medium
review:
labels: [paralel, mandor]
reporter: mirza
assign_to: claude
created: 2026-10-16 13:08:01
updated: 2026-10-16 14:10:20
related: [261016101001, 261016122401]
blocked_by: []
---

## Background
Setelah sebuah tiket lolos review, mandor menggabungkan hasil kerjanya ke
jalur utama proyek (*main*) dengan skrip penggabungan. Skrip itu menulis
satu baris "sudah masuk main" ke catatan tiket, tetapi tidak menyimpan
perubahan itu ke git. File tiket tertinggal dalam keadaan berubah di salinan
kerja utama.

Penggabungan berikutnya menolak berjalan bila salinan kerja utama punya
perubahan yang belum disimpan, dan menahan tiketnya untuk pemilik. Jadi satu
baris catatan yang tertinggal bisa menahan tiket berikutnya, padahal tidak ada
yang salah dengan tiket itu. Hari ini hal ini terjadi dua kali dan baris
catatannya disimpan mandor dengan tangan.

## How to reproduce
1. Kerjakan dua tiket di dua salinan kerja terpisah sampai keduanya lolos review
2. Gabungkan tiket pertama ke main dengan skrip penggabungan
3. Lihat status git di salinan kerja utama
4. Gabungkan tiket kedua

Pada langkah 3 file tiket pertama tercatat berubah tetapi belum disimpan. Pada
langkah 4 penggabungan bisa ditahan karena perubahan itu.

## Request
Penggabungan ke main meninggalkan salinan kerja utama dalam keadaan bersih:
catatan yang ditulisnya ke tiket ikut tersimpan ke git, sehingga penggabungan
berikutnya bisa langsung berjalan.

## Done when
- [x] Langkah di atas berakhir dengan salinan kerja utama yang bersih pada langkah 3
- [x] Penggabungan tiket kedua pada langkah 4 berjalan tanpa campur tangan
- [x] Catatan "sudah masuk main" tetap ada di tiket, dan riwayat git menunjukkan kapan catatan itu disimpan
- [x] Bila salinan kerja utama sudah punya perubahan lain sebelum penggabungan, perubahan itu tidak ikut tersimpan bersama catatan tiket

## History
- 2026-10-16 13:08:01 backlog
- 2026-10-16 13:54:34 todo
- 2026-10-16 13:54:35 in_progress
- 2026-10-16 14:09:11 review
- 2026-10-16 14:10:20 done

## Notes
- 2026-10-16 Berasal dari saran reviewer 261016122401 dan pengamatan mandor
  saat menggabungkan 261016122402 dan 261016122401.
- 2026-10-16 13:54:33: files estimated to change: `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/merge.sh`, `uji/merge.test.mjs`
- 2026-10-16 14:08:50: test run — `node --test` exited 0 after 2m34s, on content fingerprint 3d592a333be29b3b00d4450beb9eab411e3422b5 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 Pengerjaan (commit ed4219c di cabang tiket-261016130801):
  `merge.sh land` sekarang menyimpan sendiri setiap catatan yang ditulisnya ke
  tiket, dalam commit tersendiri yang hanya berisi file tiket itu
  (`git commit --only -- <path>`): `landed on` ("Board: <id> landed on main as
  <hash>"), `merge postponed` beserta pindahnya ke in_progress (kedua path,
  "Board: <id> back to in_progress, merge postponed"), dan `merge held for the
  owner` ("Board: <id> merge held for the owner"). Catatan "held" dan
  "postponed" ikut disimpan karena jenis masalahnya sama: catatan dari land
  yang tertinggal di main tree.
  Keputusan untuk kriteria 4: perubahan lain di main tree (staged atau tidak,
  kode atau papan) tidak pernah ikut. Bila file tiket itu sendiri sudah punya
  perubahan belum disimpan sebelum land berjalan, catatannya ditulis tetapi
  tidak di-commit, dan output menyebut `NOTE NOT COMMITTED`; begitu juga bila
  main tree tidak berada di cabang mana pun (tidak di-commit ke HEAD lepas).
  Akibatnya HEAD setelah land adalah commit catatan; commit gabungan ada tepat
  di bawahnya (HEAD^). Satu uji lama yang memeriksa `HEAD^1` disesuaikan.
  Dokumen: parallel-work.md (paragraf "Land commits its own notes") dan baris
  `LANDED` di foreman.md (mandor tidak lagi menyimpan catatan dengan tangan).
- 2026-10-16 Uji yang dibuktikan bisa merah (salinan merge.sh di scratchpad,
  dipulihkan dari salinan itu, `cmp` sama):
  - save_note di jalur landed dihapus -> merah: "menyimpan sendiri catatan",
    "perubahan lain ... tidak ikut", "tiket yang sudah punya perubahan".
  - save_note di held dihapus -> merah: "catatan ditahan juga tersimpan".
  - save_note di postpone dihapus -> merah: "menyimpan sendiri catatan".
  - commit diganti `git add -A && git commit` -> merah: "ditahan" dan
    "perubahan lain ... tidak ikut".
  - pemeriksaan file tiket bersih dilewati (selalu dianggap bersih) -> merah:
    "tiket yang sudah punya perubahan belum disimpan".
  - path baru (in_progress) tidak ikut di-commit saat postpone -> merah:
    "menyimpan sendiri catatan".
  - penjaga HEAD lepas dihapus -> merah: "di main tree tanpa cabang".
- 2026-10-16 14:09:11: review covers branch tiket-261016130801 at ed4219c8b0777faf50836ae40b304496a67581ae, which holds main at 382566b1051f24aed510d461d061b3f4d74508e0 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-16 Review tingkat quick, putaran 1, pada commit ed4219c (cabang
  tiket-261016130801, worktree /Users/mirza/Workspace/kerjaan-catatan-gabung,
  belum masuk main — sesuai rancangan, mandor menggabungkannya setelah
  review): uji proyek tidak dijalankan ulang, perubahan dibaca terhadap
  kriteria.
  - Uji: `test-run.sh --check 261016130801 ed4219c` -> SAME; hasil `node --test`
    (exit 0, 2026-10-16 14:08:50, sidik 3d592a333be29b3b00d4450beb9eab411e3422b5)
    dibawa dari jalannya pekerja, tidak dijalankan lagi.
  - Kriteria 1 dan 2: uji baru "penggabungan menyimpan sendiri catatan ..."
    menggabungkan tiket pertama, memeriksa `git status` kosong, lalu tiket
    kedua dikirim balik, di-sync, dan mendarat tanpa campur tangan dengan
    status tetap kosong. Kode: `save_note` dipanggil di jalur landed,
    postponed, dan held.
  - Kriteria 3: catatan ada di HEAD, commit `Board: <id> landed on main as
    <hash>` hanya berisi file tiket, dan commit gabungan tepat di bawahnya.
  - Kriteria 4: `git commit --only -- <file tiket>` tidak membawa perubahan
    lain, staged atau tidak; diuji dengan file kode staged dan tiket lain yang
    berubah. Keputusan pekerja untuk file tiket yang sudah kotor (catatan
    ditulis tanpa commit, output `NOTE NOT COMMITTED`) sejalan dengan kriteria
    ini: meng-commit-nya berarti ikut menyimpan perubahan orang lain.
  - Dinilai dengan membaca kode dan uji saja (tidak dijalankan sendiri):
    keempat kriteria, karena jalannya uji dibawa dari pekerja.
  - Catatan (tidak menahan): foreman.md diubah di luar perkiraan file; isinya
    satu baris tabel `LANDED` yang memang harus ikut berubah agar mandor tidak
    lagi menyimpan catatan dengan tangan. parallel-work.md menyebut "the one
    case" yang dibiarkan untuk orang adalah file tiket yang sudah kotor; HEAD
    lepas adalah kasus kedua, tetapi hanya bisa terjadi di jalur HELD, jadi
    dampaknya kecil. Baris `HELD` di foreman.md tidak menyebut bahwa
    `NOTE NOT COMMITTED` bisa muncul di sana.
