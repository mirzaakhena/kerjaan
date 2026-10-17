---
type: task
priority: low
review: normal
labels: [sesi-a192c9e8, skill, token]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:31:49
updated: 2026-10-17 07:04:41
related: [261016141909]
blocked_by: []
---

## Background

Claude memutuskan kapan memakai skill kerjaan dengan membaca deskripsi singkat
skill itu. Deskripsi ini dimuat di setiap sesi, baik skill-nya dipakai maupun
tidak, jadi panjangnya adalah biaya tetap. Sekarang panjangnya sekitar 190
kata.

Kira-kira separuhnya berupa contoh kalimat dalam dua bahasa ("catat ini dulu",
"put that on the backlog", dan seterusnya). Justru contoh-contoh itulah yang
membuat skill menyala tepat saat dibutuhkan. Memangkasnya tanpa mengukur bisa
menghemat sedikit biaya, tetapi membuat skill diam-diam tidak terpanggil saat
pengguna memintanya dengan kata-kata biasa.

Penilaian 2026-10-16 menemukan dua celah lain. Pertama, deskripsi tidak
menyebut pekerjaan terbesar skill ini, yaitu menjalankan antrean lewat
pengerja dan peninjau ("kerjakan tiket berikutnya", "work the queue").
Kedua, kata tunggal seperti "review", "done" dan "todo" bisa memanggil skill
di repo tanpa papan, misalnya saat pengguna meminta review kode biasa, dan
setiap pemanggilan yang salah memuat ribuan token.

## Request

Deskripsi skill menjadi lebih pendek, dan terbukti lewat uji pemicu bahwa
skill tetap terpanggil (dan tetap tidak terpanggil) sama seringnya dengan
deskripsi sekarang.

## Done when
- [x] Ada kumpulan kalimat uji, Bahasa Indonesia dan Inggris, yang
      seharusnya memanggil skill dan yang seharusnya tidak, tersimpan di repo
- [x] Hasil uji pemicu untuk deskripsi lama tercatat sebagai pembanding
- [x] Deskripsi baru lebih pendek dari yang lama, dengan jumlah katanya
      tercatat di Notes
- [x] Kalimat uji mencakup permintaan menjalankan antrean ("kerjakan tiket
      berikutnya", "work the queue"), dan deskripsi baru memanggil skill
      untuk kalimat-kalimat itu
- [x] Kalimat uji mencakup "review kode ini" dan "sudah done" di repo tanpa
      `.kerjaan/`, dan deskripsi baru tidak memanggil skill untuk keduanya
- [x] Hasil uji deskripsi baru tidak lebih buruk dari deskripsi lama, baik
      untuk kalimat yang harus memanggil maupun yang tidak boleh memanggil
- [ ] ~~Bila tidak ada deskripsi lebih pendek yang lolos, deskripsi lama tetap
      dipakai dan hasil ujinya dicatat di Notes sebagai alasan~~ — tidak
      berlaku: deskripsi lebih pendek lolos (lihat Notes)

## History
- 2026-10-11 07:31:49 backlog
- 2026-10-16 14:46:25 todo
- 2026-10-17 06:45:54 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 07:03:11 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review
- 2026-10-17 07:04:41 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 done

## Notes
- Berasal dari CATATAN-BERIKUTNYA.md butir 1. Uji pemicu bisa memakai
  fasilitas eval dari skill `skill-creator`.
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16), yang menambahkan dua
  butir Done when di atas. Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo.
- 2026-10-16 14:36:48: files estimated to change: `skills/kerjaan/SKILL.md`, `uji/pemicu/`
- 2026-10-16 14:38:10: answered question: Uji pemicu memanggil Claude berkali-kali (claude -p atau eval skill-creator) dan memakai kuota. Setuju, dengan batas sekitar 40 kalimat dikali 3 ulangan per deskripsi? Saran: setuju dengan batas itu.
  answer, 2026-10-16 14:45:49: Setuju, dengan batas sekitar 40 kalimat dikali 3 ulangan per deskripsi.
- 2026-10-17: hasil pengerjaan (ringkasan; rincian per jalan ada di `uji/pemicu/hasil-*.json`).
  - Jumlah kata deskripsi: lama 159, baru 131 (dihitung per spasi, seperti `wc -w`).
  - Uji pemicu: `uji/pemicu/kalimat.json` berisi 40 kalimat (24 harus memanggil,
    16 tidak boleh; Indonesia dan Inggris; 6 permintaan antrean; 6 kalimat
    review/done/todo di repo tanpa `.kerjaan/`, termasuk "review kode ini" dan
    "sudah done"). `uji/pemicu/jalankan.mjs` menjalankan tiap kalimat 3 kali
    lewat `claude -p` di sesi baru dengan plugin dari salinan repo ini (plugin
    terpasang dimatikan), di repo coba yang dibuat ulang bersih tiap jalan, dan
    mencatat apakah panggilan Skill pertama adalah `kerjaan:kerjaan`. Model
    claude-opus-5-5[1m], Claude Code 2.1.302.
  - Hasil: deskripsi lama 71 dari 72 jalan memanggil skill di kalimat yang
    harus, 0 dari 48 di kalimat yang tidak boleh. Calon pertama (124 kata) 68
    dari 72, gagal di "tiket mana yang masih di review?" (0/3) dan "what's
    waiting in review?" (2/3), jadi tidak dipakai (`hasil-calon-1.json`).
    Deskripsi baru (131 kata, menambah "answer what is planned, in flight or in
    review" dan "Where `.kerjaan/` exists, trigger it whenever a request
    mentions tickets or those statuses"): 72 dari 72 dan 0 dari 48; keenam
    kalimat antrean 3/3, keenam kalimat tanpa papan 0/3.
  - Temuan: deskripsi lama pun sudah memanggil skill untuk keenam kalimat
    antrean dan tidak untuk review/done tanpa papan pada model ini; dua celah
    dari penilaian 2026-10-16 tidak terlihat, tetapi deskripsi baru kini
    menyebut keduanya secara tertulis.
  - Kuota: 3 deskripsi x 40 kalimat x 3 ulangan, masing-masing dalam batas
    yang disetujui.
  - `uji/pemicu.test.mjs` (masuk suite, tanpa memanggil Claude) memeriksa: isi
    kumpulan kalimat, bahwa hasil tersimpan cocok dengan `kalimat.json` (hash)
    dan dengan deskripsi lama/di SKILL.md, ringkasan sama dengan hasil per
    jalan, baru lebih pendek, tidak lebih buruk di kedua sisi, dan per kalimat
    antrean dan per kalimat tanpa papan.
  - Uji dibuat merah dengan sengaja, lalu dipulihkan dari salinan: deskripsi di
    SKILL.md diubah satu kata; `kalimat.json` diubah; "sudah done" dan "work
    the queue" dihapus dari kumpulan; ringkasan diubah tangan;
    `deskripsi-lama.txt` dipendekkan; dua jalan positif dibuat gagal (satu
    jalan masih hijau, benar karena 71 = pembanding); satu jalan negatif dibuat
    memanggil; tiap kalimat antrean (6) satu jalan dibuat gagal; tiap kalimat
    tanpa papan (6) satu jalan dibuat memanggil. Semua merah di uji yang
    dimaksud.
  - Berkas di luar estimasi: `README.md` (paragraf cara mengulang uji pemicu
    di "Running the tests") dan `uji/pemicu.test.mjs`.
- 2026-10-17 07:03:07: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m13s, on content fingerprint 05b21f0726fbb18ba41445097ad37c96b88d7509 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level normal, round 1, at commit 6a3ae4b: passed.
  Level normal di sini berarti: uji proyek dihitung dari jalan pengerja
  (diperiksa git, isinya sama), setiap butir Done when dibuktikan dengan
  memeriksa berkas hasil yang tersimpan dan kodenya, dan uji barunya dibaca
  untuk memastikan tidak kosong. Uji pemicu penuh lewat `claude -p` sengaja
  tidak dijalankan ulang (memakai kuota; batas pemilik sudah terpakai).
  - Uji proyek: `test-run.sh --check 261011073101 6a3ae4b` menjawab SAME;
    jalan 2026-10-17 07:03:07 (`node --test --test-timeout=900000
    --test-force-exit`, exit 0, fingerprint
    05b21f0726fbb18ba41445097ad37c96b88d7509) dipakai, tidak diulang.
  - Butir 1 (kumpulan kalimat): `uji/pemicu/kalimat.json` berisi 40 kalimat,
    24 harus dan 16 tidak boleh, Indonesia dan Inggris di kedua sisi.
  - Butir 2 (pembanding lama): `deskripsi-lama.txt` sama persis dengan
    deskripsi di SKILL.md sebelum commit ini, dan `hasil-lama.json` dijalankan
    dengan deskripsi itu: 71/72 dan 0/48.
  - Butir 3 (lebih pendek): dihitung ulang dengan `wc -w`: 159 menjadi 131,
    sesuai Notes. Frontmatter SKILL.md tetap YAML yang sah.
  - Butir 4 (antrean): keenam kalimat antrean, termasuk "kerjakan tiket
    berikutnya" dan "work the queue", memanggil skill 3/3 di `hasil-baru.json`.
  - Butir 5 (tanpa papan): "review kode ini" dan "sudah done" ada dengan
    `repo: kosong`, dan `jalankan.mjs` membuat repo itu tanpa `.kerjaan/`.
    Di hasil baru keduanya 0/3.
  - Butir 6 (tidak lebih buruk): baru 72/72 dan 0/48, lama 71/72 dan 0/48.
  - Butir 7: dicoret dengan benar, karena ada deskripsi lebih pendek yang lolos.
  - Kecocokan berkas hasil: deskripsi di `hasil-baru.json` sama persis dengan
    SKILL.md. Ketiga berkas hasil memakai hash `kalimat.json` yang sekarang
    (c350419c93870cff), dan setiap entri cocok dengan kalimatnya (id,
    kalimat, repo, harus, kelompok). Ringkasan sama dengan hitungan per jalan.
    Tidak ada jalan yang `waktu-habis`, dan pada jalan yang ditulis skill
    selalu termuat.
  - Penilaian "terpanggil": dihitung hanya bila panggilan Skill pertama
    adalah `kerjaan:kerjaan`. Sesi dihentikan setelah panggilan itu, setelah
    empat panggilan alat tanpa Skill, atau bila sesi selesai sendiri. Jalan
    positif tidak dihitung gagal karena dihentikan terlalu cepat (penghentian
    datang setelah Skill dipanggil). Jalan negatif yang memanggil skill lain
    (`code-review`) dihitung tidak memanggil, dan itu benar.
  - `uji/pemicu.test.mjs` dibaca: pernyataannya benar-benar bergantung pada
    berkas hasil, SKILL.md, dan `kalimat.json`, dan tidak ada yang kosong.
  Catatan, tidak memblokir:
  - Jalan yang tidak memanggil Skill dalam empat panggilan alat pertama
    dicatat "tidak". Pemanggilan yang terlambat tidak akan terlihat. Batas ini
    sama untuk deskripsi lama dan baru, jadi perbandingannya tetap adil.
    Tetapi untuk kalimat yang tidak boleh memanggil, hasilnya bisa sedikit
    terlalu baik.
  - Hasil diukur pada satu model (claude-opus-5-5[1m]) dan satu versi Claude
    Code (2.1.302). Model lain bisa memicu skill dengan cara lain.
  - Background menyebut sekitar 190 kata. Hitungan nyata deskripsi lama 159.
