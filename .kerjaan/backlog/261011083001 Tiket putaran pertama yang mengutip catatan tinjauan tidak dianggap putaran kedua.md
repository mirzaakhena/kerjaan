---
type: bug
priority: low
review:
labels: [skill, hook]
reporter: mirza
assign_to: claude
created: 2026-10-11 08:30:46
updated: 2026-10-11 08:30:46
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
- [ ] Langkah di atas menghasilkan pesan putaran pertama (utus peninjau),
      bukan pesan putaran ulang.
- [ ] Tiket yang benar-benar sudah pernah ditinjau tetap mendapat pesan
      putaran ulang, baik yang dikenali dari riwayat statusnya maupun dari
      catatan tinjauan lama.
- [ ] Kedua hal di atas dibuktikan dengan uji yang menjalankan hook.

## History
- 2026-10-11 08:30:46 backlog

## Notes
(none yet)
