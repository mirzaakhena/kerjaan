---
type: bug
priority: low
review:
labels: [paralel, pesan]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:24:01
updated: 2026-10-16 13:08:04
related: [261016101001, 261016095101]
blocked_by: []
---

## Background
Dua pesan dari skrip papan untuk kerja paralel menyatakan hal yang berbeda dari
yang sebenarnya terjadi. Hasil akhirnya tetap benar, tetapi pembacanya bisa
salah langkah.

Pertama, ketika sebuah tiket berhasil digabung ke jalur utama proyek (*main*),
skrip mengatakan cabang kerja tiket itu disimpan dan perlu digabung atau
dihapus. Padahal sesaat kemudian cabang itu sudah dihapus otomatis.

Kedua, ketika tiket ditolak masuk antrean karena masih punya pertanyaan
terbuka, pesan penolakan menomori pertanyaan mulai dari 1 dan hanya menghitung
yang belum terjawab. Sementara itu, perintah untuk menjawab pertanyaan memakai
nomor tetap untuk semua pertanyaan, termasuk yang sudah terjawab. Akibatnya
nomor di pesan tidak cocok dengan nomor yang harus dipakai untuk menjawab.

## How to reproduce
1. Di sebuah repo uji, buat tiket di backlog dan beri dua pertanyaan
2. Jawab pertanyaan nomor 1
3. Coba pindahkan tiket ke antrean

Pesan penolakan menyebut pertanyaan kedua sebagai nomor 1. Bila nomor itu
dipakai untuk menjawab, skrip menolak karena pertanyaan 1 sudah terjawab.

Untuk pesan pertama: kerjakan sebuah tiket di salinan kerja terpisah sampai
lolos review, lalu gabungkan ke main dengan skrip penggabungan. Pesan yang
muncul menyebut cabangnya disimpan, padahal cabang itu sudah tidak ada.

## Request
Setiap pesan dari skrip kerja paralel menggambarkan keadaan yang sebenarnya,
dan nomor pertanyaan di mana pun sama dengan nomor yang dipakai untuk
menjawabnya.

## Done when
- [x] Langkah di atas menghasilkan pesan penolakan yang menyebut pertanyaan kedua sebagai nomor 2, dan menjawab dengan nomor itu berhasil
- [x] Setelah tiket berhasil digabung ke main, tidak ada pesan yang menyebut cabangnya disimpan; pesannya menyatakan cabang sudah dihapus
- [x] Menghapus salinan kerja secara langsung, di luar penggabungan, tetap memberi tahu bahwa cabangnya disimpan

## History
- 2026-10-16 12:24:01 backlog
- 2026-10-16 12:38:09 todo
- 2026-10-16 12:42:17 in_progress
- 2026-10-16 13:04:15 review
- 2026-10-16 13:04:46 in_progress
- 2026-10-16 13:06:41 review
- 2026-10-16 13:07:44 done

## Notes
- 2026-10-16 Berasal dari catatan reviewer 261016101001 (pesan cabang) dan
  261016095101 (penomoran pertanyaan).
- 2026-10-16 12:38:09: files estimated to change: `skills/kerjaan/scripts/merge.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `skills/kerjaan/scripts/worktree.sh`, `uji/`
- 2026-10-16 Dikerjakan di cabang tiket-261016122401. Penomoran pertanyaan kini
  satu fungsi, `kerjaan_questions` di lib.sh (pindahan `questions_of` dari
  queue.sh), dipakai `queue.sh ask/answer/check` dan gerbang todo di
  update-ticket.sh; `kerjaan_open_questions` dihapus karena tak ada pemakai
  lain. `merge.sh land` memanggil `worktree.sh remove` dengan
  `KERJAAN_BRANCH_DELETED_NEXT=1`, sehingga remove tidak menyebut cabang
  disimpan, lalu land mencetak "Branch … is merged into main and deleted."
  setelah `git branch -d` berhasil (bila gagal, peringatan lama tetap muncul).
- 2026-10-16 Uji merah (laporan pekerja): tiap penjaga dirusak sendiri-sendiri
  lalu dipulihkan dari salinan.
  1. update-ticket.sh menomori dengan NR lagi → queue.test.mjs 1 gagal.
  2. update-ticket.sh tidak menyaring yang terbuka → queue.test.mjs 2 gagal.
  3. lib.sh hanya menghitung pertanyaan terbuka → queue.test.mjs 2 gagal.
  4. worktree.sh tak pernah menyebut cabang disimpan → worktree.test.mjs 1 gagal.
  5. worktree.sh selalu menyebut cabang disimpan → merge.test.mjs 1 gagal.
  6. merge.sh tidak memberi `KERJAAN_BRANCH_DELETED_NEXT` → merge.test.mjs 1 gagal.
  7. merge.sh tidak mencetak pesan cabang dihapus → merge.test.mjs 1 gagal.
  8. merge.sh tidak menghapus cabang → merge.test.mjs 2 gagal.
- 2026-10-16 13:04:07: test run — `node --test` exited 0 after 1m26s, on content fingerprint 128d0222ca5e9ba6c822bbb69bd441e60227e920 (the same before and after the run; .kerjaan/ left out). Waited 0m19s for the test lock first, held by another run (ticket 261016122402, slot 2, /Users/mirza/Workspace/kerjaan-urutan-gabung).
- 2026-10-16 13:04:15: review covers branch tiket-261016122401 at f20331fbb2d2c532bdbb8fd40326f5b0c2eddff2, which holds main at bb6fa7181e52dd73ef2d0c08a73e0c62ba69f2c8 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-16 Mandor mengembalikan tiket sebelum review: main bergerak setelah sync karena 261016122402 masuk main (b519b9f) dengan perubahan di queue.sh, uji/queue.test.mjs, ordering-the-queue.md dan kerjaan-planner.md. Ini bukan penolakan; worker menjalankan merge.sh sync lagi.
- 2026-10-16 13:06:38: test run — `node --test` exited 0 after 1m38s, on content fingerprint b74c5bc7388d2b29ea8cc5855fb34aad05a8bc47 (the same before and after the run; .kerjaan/ left out).
- 2026-10-16 13:06:41: review covers branch tiket-261016122401 at 57470c730979d9ebb2aa2c615c6d5ee14cc7f63c, which holds main at 3c509957390e7ef1b7bd4c3f405b1de07ff91e21 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-16 Reviewed at level quick, round 1, at commit 57470c7 (cabang tiket-261016122401, belum digabung ke main, di worktree /Users/mirza/Workspace/kerjaan-pesan-paralel): pemeriksaan proyek tidak dijalankan ulang, dan perubahannya dibaca terhadap tiap kriteria. Pengembalian sebelumnya hanya sinkronisasi oleh mandor, bukan penolakan, jadi ini putaran review pertama.
  - Uji: `test-run.sh --check 261016122401 tiket-261016122401` menjawab SAME. Run `node --test` pekerja pada 2026-10-16 13:06:38 (fingerprint b74c5bc7388d2b29ea8cc5855fb34aad05a8bc47) keluar 0 pada isi yang persis sama; run itu dipakai sebagai satu-satunya run, tidak diulang.
  - Diff dibaca: `git diff main...tiket-261016122401` (lib.sh, merge.sh, queue.sh, update-ticket.sh, worktree.sh, tiga berkas uji).
  - Kriteria 1 (nomor pertanyaan di pesan penolakan = nomor untuk menjawab): terpenuhi. Gerbang todo di update-ticket.sh kini memakai `kerjaan_questions`, fungsi yang sama dengan yang dipakai `queue.sh answer` untuk menomori, dan menyaring yang masih terbuka tanpa menomori ulang. Penggantian baris di `queue.sh answer` juga menghitung pertanyaan terbuka dan terjawab, jadi ketiganya selaras. Uji baru di uji/queue.test.mjs menjawab nomor 1, memeriksa pesan menyebut 2 dan 3 (bukan 1), lalu menjawab dengan nomor itu sampai pemindahan berhasil.
  - Kriteria 2 (setelah land, cabang dinyatakan dihapus, tak ada kata "kept"): terpenuhi. merge.sh land memanggil `worktree.sh remove` dengan `KERJAAN_BRANCH_DELETED_NEXT=1` dan baru mencetak "Branch … is merged into main and deleted." bila `git branch -d` berhasil; bila gagal, peringatan lama tetap muncul. Uji di uji/merge.test.mjs memeriksa cabang hilang, tidak ada "kept", dan pesan baru muncul.
  - Kriteria 3 (hapus worktree langsung tetap menyebut cabang disimpan): terpenuhi. Tanpa variabel itu pesan lama tidak berubah; uji/worktree.test.mjs kini memeriksa pesannya untuk kedua tiket.
  - Tidak ada CLAUDE.md atau AGENTS.md di repo, jadi tidak ada aturan proyek tertulis yang diperiksa.
  - Catatan: contoh pesan salah saat 261016122402 digabung hari ini berasal dari merge.sh versi main sebelum perbaikan ini, jadi itulah bug yang diperbaiki tiket ini, bukan tanda perbaikannya gagal.
  - Catatan: dengan level quick, uji yang dibuat pekerja tidak dirusak ulang oleh reviewer; daftar "uji merah" di atas adalah klaim pekerja yang tidak diperiksa.

### Suggested follow-up

- **`merge.sh land` meninggalkan baris "landed on main" di tiket tanpa commit di main.** Saat 261016122402 digabung hari ini, baris itu tertinggal sebagai perubahan yang belum di-commit di salinan utama, lalu di-commit terpisah (2a5760c). Pembaca papan atau sesi berikutnya bisa menemukan salinan utama "kotor" setelah penggabungan yang tampak selesai. Layak jadi tiket: land sebaiknya meng-commit catatannya sendiri, atau menyatakan dengan jelas bahwa commit itu masih perlu dibuat.
- 2026-10-16 13:08:03: landed on main as e7bc9631cc6fb548ec66582e20588906b00662a3, merging tiket-261016122401 at 57470c730979d9ebb2aa2c615c6d5ee14cc7f63c; tests carried from the run on this exact content, not run again.
