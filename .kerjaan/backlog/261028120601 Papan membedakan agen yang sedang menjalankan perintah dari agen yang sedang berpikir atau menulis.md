---
type: feature
priority: medium
review: quick
labels: [viewer, agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 12:06:46
updated: 2026-10-28 12:07:07
related: [261028112701, 261016084202]
blocked_by: []
---

## Background
Papan di peramban menunjukkan langkah terakhir agen pada tiap tiket,
misalnya "● worker · Menjalankan uji · 12 dtk lalu" (261016084202). Baris itu
hanya menyebut langkah yang sudah dimulai. Sesudah sebuah langkah selesai,
agen sering diam cukup lama sebelum langkah berikutnya: ia sedang berpikir,
menyusun kode yang akan ditulis, atau menulis laporan. Selama itu papan tetap
menunjukkan langkah lama dengan waktu yang terus bertambah, jadi agen yang
sedang berpikir tampak sama dengan agen yang menunggu perintah lama, dan sama
dengan agen yang macet.

Ukuran kasar dari tiga pengerja di proyek nukitu-mockup (28 Okt 2026, dari
catatan langkah agen): 18–37% waktu pengerja habis di fase berpikir dan
menulis ini, 59–80% menunggu perintah lama (uji, sabotase), sisanya hampir
nol. Bagian menunggu perintah ditangani 261028112701; tiket ini bagian yang
lain.

## Request
Dari kartu tiket, pemilik bisa melihat apakah agen sedang menjalankan sebuah
perintah atau sedang berpikir dan menulis, dan sudah berapa lama dalam
keadaan itu, tanpa isi pikirannya ditampilkan.

## Done when
- [ ] Selagi agen menjalankan sebuah alat (perintah, membaca berkas, dan sejenisnya), kartunya menyebut langkah itu dan sudah berapa lama berjalan
- [ ] Sesudah langkah itu selesai dan sebelum langkah berikutnya, kartunya menyebut bahwa agen sedang berpikir atau menulis, dan sudah berapa lama
- [ ] Pergantian antara kedua keadaan itu terlihat sendiri dalam beberapa detik, tanpa memuat ulang halaman
- [ ] Isi pikiran, isi pesan, dan hasil alat tetap tidak pernah tampil
- [ ] Agen yang sudah berhenti tetap ditandai berhenti, bukan "sedang berpikir"
- [ ] Pemilik melihat kedua keadaan itu bergantian pada kartu sebuah tiket yang sedang dikerjakan (langkah di Notes)

## History
- 2026-10-28 12:06:46 2894605e-2452-4259-b7ae-7187f1df18cb backlog

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup, dipisah dari 261028112701 karena tiket itu sudah berisi 8 butir Done when.
- Dugaan cara membedakannya (belum diukur): di catatan langkah agen, alat yang sudah dipanggil tapi belum ada hasilnya berarti sedang berjalan; sesudah hasilnya tercatat dan belum ada langkah baru, agen sedang menghasilkan jawaban. Waktu antrean di sisi server Anthropic tidak bisa dibedakan dari berpikir lewat catatan ini, jadi keduanya tampil sebagai "berpikir atau menulis".
- Skrip ukur yang dipakai untuk angka di Background ada di scratchpad sesi nukitu-mockup itu (`waktu-pengerja/ukur.mjs`), tidak dirawat; kategorinya ditebak dari kata di keterangan perintah.
