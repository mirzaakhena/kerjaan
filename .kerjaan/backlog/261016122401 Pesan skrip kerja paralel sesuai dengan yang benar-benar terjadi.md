---
type: bug
priority: low
review:
labels: [paralel, pesan]
reporter: mirza
assign_to: claude
created: 2026-10-16 12:24:01
updated: 2026-10-16 12:24:42
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
- [ ] Langkah di atas menghasilkan pesan penolakan yang menyebut pertanyaan kedua sebagai nomor 2, dan menjawab dengan nomor itu berhasil
- [ ] Setelah tiket berhasil digabung ke main, tidak ada pesan yang menyebut cabangnya disimpan; pesannya menyatakan cabang sudah dihapus
- [ ] Menghapus salinan kerja secara langsung, di luar penggabungan, tetap memberi tahu bahwa cabangnya disimpan

## History
- 2026-10-16 12:24:01 backlog

## Notes
- 2026-10-16 Berasal dari catatan reviewer 261016101001 (pesan cabang) dan
  261016095101 (penomoran pertanyaan).
