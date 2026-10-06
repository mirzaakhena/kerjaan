---
type: feature
priority: medium
review: normal
labels: [update-ticket, format-tiket]
reporter: mirza
assign_to: claude
created: 2026-10-06 11:08:24
updated: 2026-10-06 11:30:24
related: []
blocked_by: []
---

## Background

Status sebuah tiket ditentukan oleh folder tempat berkasnya berada (backlog,
todo, in_progress, review, done, cancel). Saat tiket dipindah, yang tersisa di
berkas hanya dua cap waktu: kapan tiket dibuat (`created`) dan kapan terakhir
disentuh (`updated`). Kapan tiket mulai dikerjakan, kapan diserahkan ke review,
dan berapa kali ia dikembalikan dari review tidak tercatat di mana pun di dalam
tiket.

Satu-satunya jejak yang ada adalah riwayat git, dan jejak itu terbukti tidak
bisa dipakai untuk mengukur lama pengerjaan. Di papan nukitu-mockup (300 tiket),
perpindahan ke in_progress baru ikut tercatat di git bersama commit kodenya.
Contohnya tiket 261006103601: di git ia "masuk in_progress" pukul 10:42:25,
detik yang sama dengan commit kodenya, padahal pengerjaannya sudah dimulai
sebelum itu. Akibatnya median lama pengerjaan yang dihitung dari git keluar
0,3 jam, angka yang salah. Ada juga 82 commit yang memindahkan lebih dari satu
tiket sekaligus, sehingga waktu masing-masing perpindahan tidak bisa dibedakan.

Data ini dibutuhkan oleh viewer tiket yang akan dibangun: garis waktu per tiket,
lama tiket menunggu di tiap tahap, dan tiket yang bolak-balik di review.

## Request

Setiap kali tiket pindah status, tiket itu sendiri mencatat ke status mana ia
pindah dan kapan, tanpa perlu ada yang mengingat untuk menulisnya. Catatan itu
bisa dibaca manusia dan bisa dibaca program.

Riwayat yang tidak diketahui tidak dikarang. Tiket lama yang belum punya
riwayat mulai mencatat sejak perpindahan berikutnya.

## Done when
- [x] Tiket baru langsung punya bagian `## History` dengan satu baris: status
      awalnya, dengan waktu yang sama persis dengan `created`
- [x] Memindah tiket ke status lain menambah satu baris di `## History`, dengan
      waktu yang sama persis dengan `updated` yang baru
- [x] Mengganti judul atau sekadar menyegarkan `updated`, tanpa pindah status,
      tidak menambah baris
- [x] Perpindahan yang ditolak (misalnya ke review bukan dari in_progress) tidak
      menambah baris
- [x] Tiket lama tanpa `## History` mendapat bagian itu pada perpindahan
      berikutnya, berisi perpindahan itu saja, tanpa baris tebakan untuk masa
      sebelumnya
- [x] `## Notes` tetap menjadi bagian terakhir tiket: catatan yang ditambahkan
      oleh `test-run.sh`, oleh catatan `--ack-unmerged`, dan oleh reviewer
      sesudah ada `## History` tetap jatuh di bawah `## Notes`
- [x] `explain.sh check` dan `gate` tetap lolos untuk tiket yang punya
      `## Explanation` dan `## History` sekaligus
- [x] Peta (`map.mjs`) tetap menampilkan tiket yang punya `## History` tanpa
      galat
- [x] Bentuk baris dan letak bagiannya dijelaskan di SKILL.md (anatomi tiket),
      TEMPLATE.md, dan README

## History
- 2026-10-06 11:28:28 review
- 2026-10-06 11:30:24 done

## Notes
- Bentuk baris: `- 2026-10-06 10:38:02 in_progress` (waktu, lalu status
  tujuan). Mirza memilih bagian di badan tiket, bukan kunci di frontmatter,
  6 Oktober 2026.
- **Letaknya menyimpang dari pratinjau yang dipilih Mirza, dan perlu
  dikonfirmasi.** Pratinjau menaruh `## History` sesudah `## Notes`. Usulan di
  tiket ini menaruhnya **tepat sebelum `## Notes`** (sesudah `## Explanation`
  bila ada). Alasannya: `update-ticket.sh:336` dan `test-run.sh:216` menambah
  catatan dengan menulis ke akhir berkas (`>> "$file"`), SKILL.md menyuruh
  Claude menambah ke `## Notes` di tiga tempat, dan reviewer menambah review-nya
  ke `## Notes`. Kalau History di paling akhir, semua penulis itu harus diubah,
  dan catatan yang ditulis dengan tangan mudah tersasar ke bawah History.
  Sebaliknya, kalau History di depan Notes, tidak ada penulis yang berubah.
  Preseden: `## Explanation` juga diletakkan di antara Done when dan Notes.
- Akibatnya `update-ticket.sh` harus menyisipkan baris di tengah berkas (di
  ujung bagian History, sebelum `## Notes`), bukan menulis ke akhir berkas.
- Perpindahan yang dilakukan dengan `mv` biasa, tanpa skrip, tidak tercatat.
  Ini sudah dilarang aturan nomor 3 di SKILL.md. Memori sesi nukitu mencatat
  reviewer pernah memakai `mv` biasa (20 Sep 2026); perlu dicek apakah itu
  masih terjadi di 1.7.0.
- `explain.sh` membaca bagian Explanation sampai judul `## ` berikutnya
  (`explain.sh:177`), jadi History di depan Notes seharusnya tidak
  mengganggunya. Ini dugaan dari membaca kode, belum diuji.
- Repo ini belum punya uji otomatis (`test_command` kosong). Butir Done when
  dibuktikan dengan menjalankan skripnya pada papan sementara di scratchpad,
  dan langkah-langkahnya dicatat di sini.
- Letak `## History` sebelum `## Notes` disetujui Mirza, 6 Oktober 2026
  ("Semua sudah ok").
- Pengerjaan: `TEMPLATE.md` dan `new-ticket.sh` menulis baris pertama;
  `update-ticket.sh` menambah baris hanya bila status tujuan berbeda dari
  status asal, sesudah semua gerbang lolos. Baris History diproses pada berkas
  sementara yang sama dengan penyegaran `updated`, dan berkasnya ditulis sekali.
  Tiket yang tidak punya `## History` maupun `## Notes` ditolak tanpa perubahan
  apa pun, termasuk `updated`. Judul `## ` di dalam blok kode dilewati.
  Dokumentasi: SKILL.md (anatomi + paragraf History), README (contoh tiket,
  "Five headings"), `references/explanation.md` dan komentar `explain.sh`
  (Explanation kini "sebelum History"), `references/repairs.md` (menulis
  History dengan tangan saat perbaikan).
- Uji tangan, dua skrip di scratchpad sesi ini (repo belum punya uji):
  `uji-history.sh <folder-skrip>` (butir 1–6, 9 cek) dan
  `uji-explain-map.sh <folder-skrip>` (butir 7–8, 6 cek; alur penuh
  `owner_explanation: strict`: kerja → placeholder → teks pemilik → pindah ke
  blok → `check` → review → kembali → review lagi; lalu `/data` dari
  `map.mjs`). Keduanya membuat repo git sementara sendiri. Hasil atas isi
  akhir: 9/9 dan 6/6 lulus.
  Jalur: `/private/tmp/claude-501/-Users-mirza-Workspace-nukitu-mockup/9ac1176f-0ad5-4d09-b5a6-1d793e19da58/scratchpad/`
- Dibuktikan merah, tiap sabotase pada salinan folder skrip (berkas asli
  dicek utuh dengan `cmp`): A catat tanpa pindah → uji 3 merah; B abaikan
  History yang ada (membuat bagian kedua) → uji 2 merah, setelah uji 2
  dipertajam (semula tetap hijau karena hanya menghitung baris); C abaikan
  blok kode → uji 5; D tulis berkas sebelum History → uji 5c; E template
  tanpa status → uji 1; F waktu beda dari `updated` → uji 2, 5, 6b;
  G History di akhir → uji 5 dan 7d; H baris masuk ke blok penjelasan →
  7c, 7e, 8; I `map.mjs` gagal pada History → uji 8.
- Butir 6 untuk reviewer hanya terlihat dari kode: reviewer menulis lewat Edit,
  bukan skrip, dan tidak diuji. Karena Notes tetap terakhir, "tambahkan ke
  Notes" berarti menulis di akhir berkas seperti sebelumnya.
- Tidak diuji: `shellcheck` (tidak terpasang). Sintaks diperiksa `bash -n`.
- Perubahan ini baru sampai ke papan lain (mis. nukitu-mockup) sesudah
  dirilis; plugin yang terpasang masih 1.7.0 dari cache.

### Review, 6 Oktober 2026

- Ditinjau pada level normal, putaran 1, pada commit a4872e6: setiap butir
  Done when dibuktikan dengan menjalankan skrip versi repo
  (`skills/kerjaan/scripts/`) di papan git sementara, bukan hanya dengan
  membaca kodenya. Tidak naik ke level yang lebih tinggi.
- Repo ini tidak punya `test_command` dan tidak punya `CLAUDE.md`/`AGENTS.md`;
  tidak ada aturan proyek tertulis yang diterapkan. Tidak ada cabang khusus
  tiket ini; pekerjaannya ada di `main` (commit a4872e6), pohon kerja bersih
  untuk `skills/`.
- Yang dijalankan peninjau:
  - `uji-history.sh skills/kerjaan/scripts` → 9 lulus, 0 gagal (butir 1–6).
  - `uji-explain-map.sh skills/kerjaan/scripts` → 6 lulus, 0 gagal (butir 7–8,
    papan `owner_explanation: strict`, `explain.sh check`, gate ke review,
    bolak-balik review, `/data` dari `map.mjs`).
  - Pembanding: `uji-history.sh` terhadap skrip 1.7.0 yang terpasang → 6
    gagal, 3 lulus. Jadi uji-uji itu memang membedakan ada dan tidaknya
    perubahan ini. Tiga yang tetap lulus (4, 5b, 6a) memang memeriksa hal
    yang sudah benar sebelumnya (perpindahan ditolak, blok kode tidak
    tersentuh, catatan `test-run.sh` di bawah Notes).
  - Isi kedua skrip uji dibaca: penegasannya membandingkan baris History
    dengan `created`/`updated` yang sebenarnya, menghitung baris, dan
    memeriksa urutan judul. Tidak ada yang kosong makna.
  - Uji tambahan peninjau: tiket lama tanpa baris kosong sebelum `## Notes`
    (History disisipkan dengan benar), tiket dengan History yang diikuti dua
    baris kosong (baris baru jatuh tepat di bawah baris terakhir).
- Per butir: 1 lulus (uji 1); 2 lulus (uji 2, 6b, 7b); 3 lulus (uji 3:
  ganti judul, segarkan, pindah ke status yang sama); 4 lulus (uji 4, berkas
  identik sesudah todo → review ditolak; di kode, baris History ditulis
  sesudah semua gerbang); 5 lulus (uji 5, 5c); 6 lulus untuk `test-run.sh` dan
  `--ack-unmerged` (uji 6a, 6b); 7 lulus (uji 7a–7e); 8 lulus (uji 8);
  9 lulus (dibaca: SKILL.md anatomi + paragraf `## History`, TEMPLATE.md,
  README contoh tiket dan "Five headings", ditambah `references/explanation.md`,
  `references/repairs.md`, komentar `explain.sh`).
- Dinilai dengan membaca saja: bagian butir 6 tentang reviewer. Reviewer
  menambah ke akhir berkas, dan karena History selalu disisipkan sebelum
  Notes, tambahan itu tetap jatuh di Notes. Review ini sendiri ditulis
  dengan cara itu.
- Catatan, tidak menghalangi:
  - Blok kode hanya dikenali bila diawali tiga backtick di kolom pertama.
    Blok bertanda `~~~` yang berisi baris `## History` di tiket tanpa
    History membuat baris perpindahan jatuh di dalam bagian lain, bukan di
    bagian History baru (dicoba: baris masuk ke bawah blok `~~~` di
    Background). Konvensinya sama dengan `explain.sh` (backtick saja), dan
    kasusnya jarang.
  - Pada tiket lama yang tidak punya baris kosong sebelum `## Notes`, judul
    `## History` menempel langsung di bawah baris sebelumnya. Markdown tetap
    membacanya sebagai judul.
  - Tiket ini dipindah ke done dengan `update-ticket.sh` versi repo (yang
    sedang ditinjau), bukan 1.7.0 dari cache, supaya History tiket ini
    mencatat perpindahannya.
