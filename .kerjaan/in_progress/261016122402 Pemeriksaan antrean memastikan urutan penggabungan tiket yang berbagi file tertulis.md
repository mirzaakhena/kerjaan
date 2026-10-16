---
type: feature
priority: low
review:
labels: [paralel, antrean]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:24:02
updated: 2026-10-16 13:02:40
related: [261016095101]
blocked_by: []
---

## Background
Tiket yang mengubah file yang sama boleh dikerjakan bersamaan, asalkan file
urutan antrean menyebut kedua tiket itu, file yang mereka bagi, dan tiket mana
yang digabung ke jalur utama proyek lebih dulu.

Pemeriksaan antrean saat ini hanya memastikan kedua tiket disebut dalam
kalimat pengantar grupnya. Bila urutan penggabungannya tidak ditulis,
pemeriksaan tetap menyatakan antrean siap. Panduannya meminta urutan itu
ditulis, tetapi tidak ada yang memeriksanya.

## Request
Pemeriksaan antrean menolak grup yang berisi tiket-tiket yang berbagi file
bila urutan penggabungannya tidak tertulis.

## Done when
- [x] Grup berisi dua tiket yang berbagi file, yang pengantarnya menyebut kedua tiket tetapi tidak menyebut mana yang digabung lebih dulu, dinyatakan belum siap beserta alasannya
- [x] Grup yang sama, setelah pengantarnya menyebut tiket mana yang digabung lebih dulu, dinyatakan siap
- [x] Panduan urutan antrean menjelaskan cara menuliskan urutan penggabungan sehingga pemeriksaan bisa mengenalinya

## History
- 2026-10-16 12:24:02 backlog
- 2026-10-16 12:38:09 todo
- 2026-10-16 12:42:17 in_progress

## Notes
- 2026-10-16 Berasal dari catatan reviewer 261016095101.
- 2026-10-16 12:38:09: files estimated to change: `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/scripts/queue.sh`, `uji/queue.test.mjs`
- 2026-10-16 Keputusan teknis: urutan dikenali dari bentuk tetap "ID lalu frasa, tanpa kata di antaranya": `<id> lands first` / `<id> lands before <id>`, atau dalam bahasa Indonesia `<id> digabung lebih dulu` / `<id> digabung sebelum <id>` (`mendarat` boleh menggantikan `digabung`, `dahulu` menggantikan `dulu`, `lebih` boleh dihilangkan). Papan berbahasa lain memakai frasa Inggris di dalam kalimatnya sendiri. Huruf besar-kecil bebas, ID boleh dalam backtick/tebal, kalimat boleh terpotong baris di mana pun. Aturan berlaku per pasangan: dua tiket cukup satu `lands first`; tiga tiket atau lebih memerlukan `lands before` untuk pasangan yang tersisa. Kedua tiket satu pasangan sama-sama "lebih dulu" ditolak sebagai tidak jelas. Dijelaskan di `skills/kerjaan/references/ordering-the-queue.md` bagian "Saying which lands first"; pengantar di order.md asli ("bila dikerjakan bersamaan, 261016122401 digabung lebih dulu") dan contoh-contoh di panduan itu sendiri diuji lolos.
- 2026-10-16 Pertanyaan tidak menghambat: daftar frasa hanya mengenal bahasa Inggris dan Indonesia. Bila pemilik ingin papan berbahasa lain menulis frasa dalam bahasanya sendiri, frasanya perlu ditambahkan ke `first_re`/`before_re` di `queue.sh` dan ke tabel panduan. Rekomendasi: biarkan begini sampai ada papan seperti itu.
- 2026-10-16 Juga diubah di luar perkiraan: `agents/kerjaan-planner.md` (langkah 3 menunjuk ke bentuk kalimat yang dikenali).
- 2026-10-16 Uji mutasi (setiap file disalin dulu dan dipulihkan dari salinan; uji `check:` di `uji/queue.test.mjs` dijalankan untuk masing-masing): semua 21 mutasi membuat uji merah — urutan tidak diwajibkan sama sekali; kedua "lebih dulu" diterima; `lands_before` selalu gagal / selalu cocok; `lands_first` selalu gagal; batas digit sebelum ID dibuang; batas digit sesudah ID kedua dibuang (awalnya hijau, lalu ditambah kasus `<id>9`); batas huruf sesudah frasa dibuang ("firstly"); kata boleh di antara ID dan frasa; markup di sekitar ID tidak diizinkan; huruf besar-kecil dibedakan; tanpa `mendarat`; `lebih` diwajibkan; tanpa `dahulu`; tanpa bentuk Indonesia "sebelum"; spasi/tab ganda tidak dirapatkan (awalnya hijau, lalu ditambah kasus spasi ganda dan tab); pemeriksaan "menyebut keduanya" dibuang; frasa hilang dari tabel panduan; contoh order.md di kepala panduan, contoh kutipan Inggris, dan contoh kutipan Indonesia masing-masing diubah menjadi tidak dikenali (contoh kepala panduan awalnya tidak diuji; kini diuji utuh).
- 2026-10-16 13:02:40: test run — `node --test` exited 0 after 1m34s, on content fingerprint 13a30ea9cea38fdf63b94d3a40581521abc25f9d (the same before and after the run; .kerjaan/ left out).
