---
type: bug
priority: low
review: normal
labels: [sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:44
updated: 2026-10-28 18:57:29
related: [261028172801]
blocked_by: []
---

## Background
Tiket 261028172801 memperbaiki skrip papan yang membuat folder aneh di akar
repo ketika keluarannya dipotong: sisa keluaran yang tak terkirim ikut masuk
ke alamat folder yang dihitung skrip, lalu dibuat sebagai folder. Perbaikan
itu hanya mengenai folder kunci papan. Peninjaunya menemukan pola yang sama
di dua tempat lain: bagian jalur uji yang menyiapkan folder kemajuan, dan
hook yang menulis catatan serah-terima sebelum percakapan diringkas. Risikonya
rendah karena di kedua tempat itu hampir belum ada keluaran yang bisa
terpotong, tetapi akibatnya sama bila terjadi.

## Request
Kedua tempat itu menolak alamat folder yang tidak wajar dengan cara yang sama
seperti folder kunci papan, sehingga keluaran yang terpotong tidak pernah
menjadi folder di repo.

## Done when
- [ ] Alamat folder kemajuan uji dan alamat catatan serah-terima yang memuat baris baru, bukan alamat lengkap, atau induknya tidak ada ditolak, dan tidak ada folder yang dibuat
- [ ] Jalan uji dan catatan serah-terima tetap bekerja seperti biasa dengan alamat yang wajar
- [ ] Uji proyek ini lulus, termasuk uji baru yang memberi kedua tempat itu alamat tidak wajar

## History
- 2026-10-28 18:56:44 a185f853-6a65-4f44-919d-97ba97774e43 backlog

## Notes
- Saran lanjutan peninjau 261028172801; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Tempatnya: `progress_start` di `test-run.sh` dan `handoff.sh`; keduanya mengambil alamat lewat `$(...)` lalu `mkdir -p`. Pemeriksaan yang dipakai 261028172801 di `kerjaan_locks_dir`: alamat diawali `/`, tanpa baris baru, induknya ada, dibuat dengan `mkdir` bukan `mkdir -p`.
- Bila jalan uji tidak bisa menyiapkan folder kemajuan, jalan uji itu sendiri tetap harus berjalan dan kode keluarnya tidak berubah (261028112701).
