---
type: bug
priority: low
review: quick
labels: [viewer, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:45
updated: 2026-10-28 18:57:29
related: [261028121401]
blocked_by: []
---

## Background
Selagi uji proyek berjalan, papan menampilkan daftar uji per berkas uji
(261028121401). Alat uji `node --test` menjalankan beberapa berkas
bersamaan, tetapi melaporkan uji tiap berkas menurut urutan berkas. Berkas
yang sudah selesai tetapi berada di belakang berkas yang masih berjalan
tampil "done" dengan daftar kosong sampai berkas di depannya selesai. Pemilik
bisa mengira berkas itu tidak berisi uji atau ujinya hilang.

## How to reproduce
1. Buka papan selagi uji lengkap repo ini berjalan
2. Buka bagian Progress di laci tiketnya
3. Perhatikan berkas uji yang sudah ditandai selesai sementara berkas di atasnya masih berjalan

Berkas itu tampil "done" tanpa satu uji pun.

## Request
Berkas uji yang sudah selesai tetapi daftar ujinya belum tiba ditampilkan
dengan jelas sebagai menunggu daftar, bukan sebagai berkas selesai yang
kosong.

## Done when
- [ ] Pada langkah di atas, berkas itu menyebut bahwa daftar ujinya menyusul, bukan tampil selesai dan kosong
- [ ] Begitu daftar ujinya tiba, berkas itu tampil seperti berkas selesai lainnya tanpa memuat ulang halaman
- [ ] Uji proyek ini lulus, termasuk uji baru untuk kedua hal di atas

## History
- 2026-10-28 18:56:45 a185f853-6a65-4f44-919d-97ba97774e43 backlog

## Notes
- Saran lanjutan peninjau 261028121401; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Usul peninjau: label seperti "tests to follow", atau sembunyikan berkas itu sampai ujinya tiba. Urutan pelaporan node sudah dijelaskan di panduan `SETTINGS.md` ("Reporting each test to the board"). Teks di viewer berbahasa Inggris.
