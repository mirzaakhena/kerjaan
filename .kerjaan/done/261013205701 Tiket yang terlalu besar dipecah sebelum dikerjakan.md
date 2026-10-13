---
type: feature
priority: high
review: normal
labels: []
reporter: mirza
assign_to: claude
created: 2026-10-13 20:57:26
updated: 2026-10-13 21:09:11
related: []
blocked_by: []
---

## Background

Daftar "Done when" sebuah tiket bisa tumbuh sangat panjang tanpa ada yang
menahan. Di proyek pencatat-keuangan, tiket-tiket untuk memindahkan aplikasi
ke Flutter ditulis satu tiket per layar, dan isinya 17 sampai 23 butir
"Done when" per tiket. Pemilik baru menyadarinya setelah tiket pertama
sudah dikerjakan, lalu meminta semua tiket di antrean dipecah ulang secara
manual.

Tiket sebesar itu merugikan di setiap langkah:
- Reviewer memeriksa 20-an butir sekaligus, dan pada level quick
  pemeriksaannya cenderung sekilas, jadi kesalahan lebih mudah lolos.
- Hasil baru terlihat setelah satu jam lebih, bukan belasan menit. Koreksi
  dari pemilik datang terlambat dan menyeret bagian lain yang sudah jadi.
- Worker membaca dan menulis jauh lebih banyak berkas dalam satu sesi,
  sehingga lebih sering kehabisan konteks di tengah jalan.
- Satu bagian yang gagal menahan seluruh tiket, padahal bagian lain sudah
  layak lolos.

Skill sebenarnya sudah menyebut "ukuran adalah alasan untuk memecah", tetapi
hanya untuk tiket yang terlalu besar untuk dimulai. Belum ada batas yang
jelas, dan belum ada langkah yang memeriksanya saat tiket ditulis.

## Request

Tiket yang terlalu besar terdeteksi dan dipecah per hasil sejak ditulis,
sebelum masuk antrean, sehingga setiap tiket cukup kecil untuk dikerjakan,
direview, dan dikoreksi dalam satu putaran singkat.

## Done when
- [x] Panduan menulis tiket menyebut batas ukuran yang jelas, yaitu sekitar
      6 sampai 8 butir "Done when", beserta alasannya dalam bahasa awam
      (review lebih tajam, hasil lebih cepat terlihat, worker jarang
      kehabisan konteks, kegagalan satu bagian tidak menahan bagian lain)
- [x] Panduan menjelaskan cara memecah: per hasil yang bisa dicoba sendiri,
      bukan per berkas atau per lapisan teknis, dengan contoh satu tiket
      layar besar yang dipecah menjadi beberapa tiket kecil
- [x] Saat tiket dibuat atau diperbarui lewat skrip papan dan butir
      "Done when"-nya melewati batas, skrip menampilkan peringatan yang
      menyebut jumlah butirnya dan menyarankan pemecahan; tiket tetap
      tersimpan
- [x] Sebelum memindahkan tiket ke todo atau memulainya, mandor
      memperhatikan peringatan ukuran itu dan menawarkan pemecahan kepada
      pemilik, tidak diam-diam melanjutkan
- [x] Pemilik tetap bisa memutuskan satu tiket boleh besar, dan keputusan itu
      tercatat di Notes tiketnya, sehingga peringatan tidak diulang untuk
      tiket itu
- [x] Batas angkanya bisa diubah per papan lewat pengaturan papan, dan tanpa
      pengaturan memakai nilai bawaan
- [x] Uji otomatis proyek ini lulus, termasuk uji untuk peringatan ukuran,
      untuk tiket yang dibebaskan pemilik, dan untuk batas yang diatur papan

## History
- 2026-10-13 20:57:26 todo
- 2026-10-13 21:00:30 in_progress
- 2026-10-13 21:07:51 review
- 2026-10-13 21:09:11 done

## Notes
- Diminta mirza, 2026-10-13, dari sesi pencatat-keuangan. Di sana, tiket
  porting Flutter berisi 17 sampai 23 butir "Done when" per tiket. Satu
  tiket (Kategori, 22 butir) sudah terlanjur dikerjakan sebelum masalahnya
  disadari. Sisanya dipecah manual menjadi tiket berisi paling banyak
  sekitar 6 sampai 8 butir.
- Butir yang tidak bisa dicek otomatis, misalnya "periksa di HP" (ditunda
  untuk pemilik), tetap dihitung sebagai butir.
- Tiket ini sendiri berisi 7 butir, sesuai batas yang diusulkannya.
- Pengerja, 2026-10-13: yang dibangun.
  - Panduan: SKILL.md bagian baru "How big a ticket is" (batas sekitar 6
    sampai 8 butir, empat alasan dalam bahasa awam, cara memecah per hasil,
    contoh layar Kategori 20 butir dipecah jadi empat tiket). Batas juga
    disebut singkat di keterangan heading "Done when", di syarat siap masuk
    todo, di "Clear the whole queue first", dan di README.
  - Skrip baru `ticket-size.sh <id|path>`: menghitung butir "Done when"
    tingkat atas di luar blok berpagar; baris lanjutan berindentasi dan butir
    yang dicoret (`- [ ] ~~...~~`) tidak dihitung. Hanya memperingatkan
    (stderr, exit 0), tidak pernah menolak atau mengubah tiket. Tiket di
    review, done, dan cancel tidak diperingatkan, karena klaimnya sudah
    dibuat dan pemecahan tidak lagi mungkin.
  - `update-ticket.sh` dan `new-ticket.sh` memanggil pemeriksaan itu di akhir
    setiap jalannya. Bendera baru `update-ticket.sh <id> --accept-size`
    menulis keputusan pemilik ke Notes dengan kalimat tetap berbahasa Inggris
    ("size accepted by the owner"), seperti catatan `--ack-unmerged`;
    peringatan berhenti untuk tiket itu, juga bila butirnya bertambah lagi.
    Kalimat yang sama yang ditulis tangan di awal butir Notes juga dihormati.
    Seperti `--ack-unmerged`, bendera ini hanya atas keputusan pemilik
    (dicatat di SKILL.md, foreman.md, dan definisi pengerja).
  - Mandor: foreman.md "Starting the chain" kini meminta `ticket-size.sh`
    dijalankan pada setiap tiket dalam rantai, dan pemecahan ditawarkan dalam
    pesan pembuka yang sama; tiket yang diperingatkan tidak dimulai tanpa
    jawaban pemilik.
  - Pengaturan: kunci `done_when_limit` di SETTINGS.md (bawaan 8). Kosong atau
    tidak ada berarti 8; nilai yang bukan bilangan bulat 1 ke atas
    memunculkan catatan dan memakai 8. settings.md papan ini sendiri tidak
    diubah (bukan wewenang pengerja), jadi papan ini memakai bawaan 8.
  - Uji: `uji/ticket-size.test.mjs`, 24 uji.
- Pengerja, 2026-10-13: uji yang sengaja dirusak (salinan berkas dibuat
  dulu, dipulihkan dari salinan, md5 dicocokkan). Semua di bawah ini
  membuat uji merah:
  - perbandingan jumlah dengan batas dimatikan; pemeriksaan penerimaan pemilik
    dimatikan; pengecualian butir dicoret dihapus; pengecualian blok berpagar
    dihapus; pembatasan ke bagian "Done when" dihapus; pembatasan penerimaan
    ke awal butir di Notes dihapus; pengecualian review/done/cancel dihapus;
    batas dari settings diabaikan; penolakan nilai 0/negatif dihapus;
    penolakan nilai bukan angka dihapus;
  - panggilan pemeriksaan di `update-ticket.sh` dihapus; panggilan di
    `new-ticket.sh` dihapus; bendera `--accept-size` tidak lagi mengisi
    variabelnya; kalimat catatannya diubah.
  - Satu temuan: pembacaan `done_when_limit` hanya di frontmatter dijaga dua
    hal yang saling menutupi (berhenti di pagar penutup, dan syarat `fm == 1`).
    Merusak salah satunya tetap hijau; merusak keduanya membuat uji "the key
    below the frontmatter is prose" merah.
- Pengerja, 2026-10-13: dijalankan sungguhan di papan contoh di luar repo:
  tiket 11 butir dipindah ke todo memunculkan peringatan "has 11 "Done when"
  items, over this board's limit of 8" dan tetap pindah; `--accept-size`
  menulis catatannya, lalu pindah ke in_progress tanpa peringatan; opsi tak
  dikenal tetap keluar dengan kode 1 dan bantuan memuat `--accept-size`.
  Tiket ini sendiri (7 butir) tidak diperingatkan.
- 2026-10-13 21:07:38: test run — `node --test` exited 0 after 0m5s, on content fingerprint 06ae7eab873bf2607fde73f2ec481dbbbcb08073 (the same before and after the run; .kerjaan/ left out).
- Review, 2026-10-13. Ditinjau pada level normal, putaran 1, di commit
  94fb287 (pekerjaan; daabf3d hanya memindahkan tiket): perubahan dibaca
  terhadap tiap butir, uji dibaca untuk mencari pernyataan kosong, dan skrip
  dijalankan sendiri di papan percobaan. Keputusan: lolos, pindah ke done.
  - Uji proyek: `test-run.sh --check 261013205701` menjawab SAME. `node --test`
    tidak dijalankan ulang; hasilnya dibawa dari jalannya pengerja
    2026-10-13 21:07:38, exit 0, fingerprint
    06ae7eab873bf2607fde73f2ec481dbbbcb08073.
  - Butir 1 dan 2 (panduan): SKILL.md bagian "How big a ticket is" memuat
    batas sekitar 6 sampai 8, empat alasan dalam bahasa awam, aturan memecah
    per hasil (bukan per berkas atau lapisan), dan contoh layar Kategori
    20 butir dipecah jadi empat tiket. Dinilai dengan membaca; isinya memang
    dokumentasi.
  - Butir 3 (peringatan): dicoba sendiri di papan sementara di luar repo.
    Tiket 10 butir dengan baris lanjutan dan satu butir dicoret, dipindah ke
    todo: muncul "WARNING: ... has 10 "Done when" items, over this board's
    limit of 8", exit 0, tiket tetap pindah. Butir dicoret dan baris lanjutan
    tidak ikut dihitung.
  - Butir 4 (mandor): dinilai dengan membaca saja. foreman.md "Starting the
    chain" dan SKILL.md ("Into todo", "Clear the whole queue first") meminta
    `ticket-size.sh` dijalankan pada tiap tiket, pemecahan ditawarkan, dan
    tiket tidak dimulai tanpa jawaban pemilik. Perilaku sesi tidak bisa diuji
    dengan skrip.
  - Butir 5 (pembebasan): `--accept-size` menulis "size accepted by the owner"
    di Notes; pemindahan ke in_progress sesudahnya tanpa peringatan (dicoba
    sendiri). Uji untuk ini juga ada dan isinya sungguhan.
  - Butir 6 (batas per papan): `done_when_limit` dibaca dari frontmatter
    settings.md, bawaan 8; terdokumentasi di SETTINGS.md. Dijaga uji batas 3,
    batas 15, kunci kosong atau tidak ada, dan nilai tidak sah.
  - Butir 7 (uji): `uji/ticket-size.test.mjs` membahas peringatan, tiket yang
    dibebaskan, dan batas dari papan. Uji ini dibaca dan pernyataannya
    sungguhan (jumlah, pesan, dan isi berkas diperiksa); tidak ada yang kosong.
  - Catatan (tidak menahan): frasa penerimaan dihormati di mana pun dalam
    butir Notes tingkat atas, jadi catatan biasa yang menyebut frasa itu,
    misalnya reviewer yang menjelaskan cara kerjanya, ikut membungkam
    peringatan. Di tiket ini frasa itu ada di sub-butir berindentasi, jadi
    tidak terpicu. Titik lemah uji pembacaan frontmatter yang dicatat
    pengerja dibenarkan; perilakunya sendiri benar.
  - Cabang: tidak ada cabang atau worktree untuk tiket ini; pekerjaan ada di main.
