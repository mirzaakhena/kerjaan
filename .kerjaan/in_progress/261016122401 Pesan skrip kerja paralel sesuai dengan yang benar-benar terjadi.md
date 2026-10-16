---
type: bug
priority: low
review:
labels: [paralel, pesan]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:24:01
updated: 2026-10-16 13:04:46
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
