---
type: bug
priority: medium
review: quick
labels: [agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 10:22:50
updated: 2026-10-28 10:23:28
related: []
blocked_by: []
---

## Background
Saat mengerjakan sebuah tiket di proyek lain (nukitu-mockup, tiket
261028095701, 28 Okt 2026), pengerja menjalankan skrip pemeriksaan yang lama
di latar, lalu menunggunya dengan perulangan buatan sendiri: cek apakah
prosesnya masih hidup, tidur lima detik, ulangi, sampai seratus kali. Untuk
tidurnya ia memakai jalan memutar lewat `perl` karena `sleep` biasa diblokir.

Perulangan seperti itu menumpuk di terminal pemilik, memakan waktu tanpa
hasil, dan menyiasati pembatasan yang sengaja dipasang. Pemilik sudah melarang
cara ini di satu proyek lewat catatan sesi utama, tapi catatan itu tidak
sampai ke pengerja, dan aturan yang sama tidak ada di skill kerjaan, jadi
kejadian serupa bisa muncul di proyek mana pun yang memakai skill ini.

Skill sudah punya aturan untuk satu kasus: jalan uji tiket wajib di latar
depan dengan batas waktu panjang, karena pengerja yang mengakhiri gilirannya
sementara pekerjaannya masih jalan terlihat sudah selesai. Aturan itu hanya
menyebut jalan uji, tidak menyebut perintah lama lainnya (skrip pemeriksaan,
build, unduhan), dan tidak melarang perulangan cek-dan-tidur.

## How to reproduce
1. Beri pengerja tiket yang perlu skrip pemeriksaan berjalan beberapa menit
2. Pengerja menjalankannya di latar
3. Lihat terminal pemilik

Muncul perintah perulangan cek-proses-lalu-tidur (`pgrep` + `perl select` /
`sleep`) yang berjalan sampai skripnya selesai.

## Request
Agen kerjaan (pengerja, peninjau, perencana) menunggu perintah yang lama
dengan cara yang benar, di proyek mana pun, tanpa bergantung pada catatan
proyek atau ingatan sesi utama.

## Done when
- [ ] Panduan pengerja, peninjau, dan perencana menyatakan: perintah yang harus ditunggu hasilnya dijalankan di latar depan dengan batas waktu panjang; yang lebih lama dari batas itu dipecah; perulangan cek-dan-tidur dilarang, termasuk jalan memutar di sekitar pembatasan `sleep`
- [ ] Aturan itu menyebut alasannya dalam satu kalimat yang bisa dipahami tanpa konteks kejadian ini
- [ ] Panduan sesi utama (mandor) menyatakan hal yang sama untuk menunggu agen dan perintah latar: notifikasi datang sendiri, tidak ditunggu dengan perulangan
- [ ] Uji skill gagal bila aturan itu hilang dari salah satu definisi agen
- [ ] Pengerja yang diberi tiket dengan skrip pemeriksaan beberapa menit tidak lagi memunculkan perulangan cek-dan-tidur (langkah di Notes)

## History
- 2026-10-28 10:22:50 2894605e-2452-4259-b7ae-7187f1df18cb backlog

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup: aturan ini harus hidup di skill, bukan di CLAUDE.md atau memori proyek, supaya berlaku di semua proyek.
- Perintah yang terlihat (nukitu-mockup, pengerja 261028095701): `for i in $(seq 1 100); do pgrep -f sabotase2.mjs >/dev/null || break; perl -e 'select(undef,undef,undef,5)'; done; cat <berkas keluaran> | sed -n '18,$p'`.
- Akar yang diduga (belum diukur): bagi subagen, notifikasi perintah latar tidak membantu, karena mengakhiri giliran untuk menunggunya membuat mandor mengira pengerja sudah selesai (alasan yang sama dengan aturan jalan uji di langkah 7 definisi pengerja). Jadi pengerja yang terlanjur menaruh perintah di latar terdorong membuat perulangan. Aturan yang benar untuk subagen: latar depan, bukan "latar lalu tunggu notifikasi".
- Versi terpasang di nukitu-mockup 1.15.0, sumber sudah 1.16.0 — perbaikannya baru terasa sesudah rilis dan pembaruan plugin.
