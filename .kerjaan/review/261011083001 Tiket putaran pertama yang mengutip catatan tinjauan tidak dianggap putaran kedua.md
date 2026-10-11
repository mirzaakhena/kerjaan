---
type: bug
priority: low
review:
labels: [skill, hook]
reporter: mirza
assign_to: claude
created: 2026-10-11 08:30:46
updated: 2026-10-11 09:01:42
related: [261011073202]
blocked_by: []
---

## Background

Saat tiket masuk review, hook memberi tahu mandor apakah ini tinjauan pertama
atau putaran ulang. Untuk putaran ulang, mandor disuruh melanjutkan peninjau
yang lama. Salah satu tanda putaran ulang yang dipakai adalah teks "Reviewed
at level". Teks itu dicari di seluruh berkas tiket, bukan hanya di catatan
tinjauan. Akibatnya, tiket yang baru sekali masuk review tetapi kebetulan
mengutip teks itu, misalnya di catatan pengerja, dianggap putaran ulang.
Mandor lalu disuruh melanjutkan peninjau yang tidak pernah ada, dan baru
mengutus peninjau baru lewat jalan cadangan.

## How to reproduce
1. Buat tiket yang belum pernah ditinjau, dan tulis di catatannya sebuah
   kalimat yang mengutip "Reviewed at level".
2. Pindahkan tiket itu ke review dari sesi utama.

Pesan hook menyuruh melanjutkan peninjau putaran sebelumnya, padahal belum
pernah ada peninjau.

## Request

Tiket yang baru pertama kali masuk review selalu diperlakukan sebagai putaran
pertama, apa pun yang dikutip di dalamnya. Tiket yang benar-benar sudah
pernah ditinjau tetap dikenali sebagai putaran ulang.

## Done when
- [x] Langkah di atas menghasilkan pesan putaran pertama (utus peninjau),
      bukan pesan putaran ulang.
- [x] Tiket yang benar-benar sudah pernah ditinjau tetap mendapat pesan
      putaran ulang, baik yang dikenali dari riwayat statusnya maupun dari
      catatan tinjauan lama.
- [x] Kedua hal di atas dibuktikan dengan uji yang menjalankan hook.

## History
- 2026-10-11 08:30:46 backlog
- 2026-10-11 08:59:25 in_progress
- 2026-10-11 09:01:42 review

## Notes
- Catatan pengerja, 11 Okt 2026:
  - Perbaikan di `skills/kerjaan/scripts/on-ticket-review.sh`: pencarian
    frasa di seluruh berkas (`grep -q`) diganti hitungan di awk yang sama
    dengan hitungan History. Frasa itu kini dihitung hanya di bagian
    `## Notes`, hanya bila baris dimulai dengan frasa itu (polos, atau sebagai
    butir tingkat atas `- `, `* `, `+ `, boleh tebal `**`), dan tidak di dalam
    blok berpagar. Kutipan di Background, di tengah kalimat, di baris lanjutan
    yang menjorok, atau dalam kutipan `>` tidak dihitung. Subjudul
    `### Review ...` di dalam Notes tidak menutup bagian Notes. Komentar skrip
    diperbarui sesuai aturan ini.
  - Uji di `uji/on-ticket-review.test.mjs`, satu uji per kasus, semuanya
    menjalankan hook dari sisi mandor. Putaran pertama yang mengutip frasa:
    di Background, di tengah kalimat catatan pengerja, di baris lanjutan,
    dalam kutipan `>`, dalam blok berpagar, dalam blok berpagar menjorok,
    bentuk tiket 261011073202, dan di bagian sesudah Notes. Semuanya harus
    mendapat pesan "utus peninjau". Putaran ulang lewat baris pembuka
    peninjau di Notes: butir `-`, `*`, `+`, tebal, dan baris polos di bawah
    `### Review ...`. Uji lama `secondRoundByHistory` dan
    `secondRoundByNotes` tetap lulus.
  - Dicoba pada salinan tiket 261011073202 yang History-nya dipangkas jadi
    satu `review`: hook di HEAD menjawab "re-entered review — resuming its
    reviewer", hook baru menjawab "entered review — dispatching a reviewer".
  - Sabotase (salin skrip, rusak, jalankan uji hook, pulihkan dengan cp,
    dicek dengan cmp):
    1. Kembalikan `grep -q` ke seluruh berkas: 8 uji putaran pertama merah.
    2. Hapus syarat `innotes`: uji Background dan bagian sesudah Notes merah.
    3. Hapus jangkar awal baris: uji tengah kalimat, baris lanjutan, kutipan
       `>`, dan bentuk 261011073202 merah.
    4. Matikan lompatan blok berpagar: uji blok berpagar dan uji lama
       baris tiruan merah.
    5. Abaikan hitungan baris pembuka: uji lama `secondRoundByNotes` dan 5 uji
       bentuk baris pembuka merah.
    6. Larang tebal: uji tebal merah. Batasi butir ke `-` saja: uji `*` dan
       `+` merah.
    Blok berpagar yang menjorok sempat dikenali tersendiri, tetapi
    sabotasenya tetap hijau karena isinya menjorok dan sudah ditolak oleh
    jangkar awal baris; penjaga itu dibuang, ujinya dipertahankan.
- 2026-10-11 09:01:35: test run — `node --test` exited 0 after 0m4s, on content fingerprint d69cb0db535c51762f8ffc25e6c24029ba6f9d70 (the same before and after the run; .kerjaan/ left out).
