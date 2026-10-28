---
type: bug
priority: medium
review: quick
labels: [agen]
reporter: mirza
assign_to: claude
created: 2026-10-28 10:22:50
updated: 2026-10-28 11:03:52
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
- [x] Panduan pengerja, peninjau, dan perencana menyatakan: perintah yang harus ditunggu hasilnya dijalankan di latar depan dengan batas waktu panjang; yang lebih lama dari batas itu dipecah; perulangan cek-dan-tidur dilarang, termasuk jalan memutar di sekitar pembatasan `sleep`
- [x] Aturan itu menyebut alasannya dalam satu kalimat yang bisa dipahami tanpa konteks kejadian ini
- [x] Panduan sesi utama (mandor) menyatakan hal yang sama untuk menunggu agen dan perintah latar: notifikasi datang sendiri, tidak ditunggu dengan perulangan
- [x] Uji skill gagal bila aturan itu hilang dari salah satu definisi agen
- [ ] Pengerja yang diberi tiket dengan skrip pemeriksaan beberapa menit tidak lagi memunculkan perulangan cek-dan-tidur (langkah di Notes) — menunggu mirza: skenario tangan di Notes

## History
- 2026-10-28 10:22:50 2894605e-2452-4259-b7ae-7187f1df18cb backlog
- 2026-10-28 10:48:03 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 10:48:19 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 11:03:52 a185f853-6a65-4f44-919d-97ba97774e43 review

## Notes
- Diminta Mirza 28 Okt 2026 dari sesi nukitu-mockup: aturan ini harus hidup di skill, bukan di CLAUDE.md atau memori proyek, supaya berlaku di semua proyek.
- Perintah yang terlihat (nukitu-mockup, pengerja 261028095701): `for i in $(seq 1 100); do pgrep -f sabotase2.mjs >/dev/null || break; perl -e 'select(undef,undef,undef,5)'; done; cat <berkas keluaran> | sed -n '18,$p'`.
- Akar yang diduga (belum diukur): bagi subagen, notifikasi perintah latar tidak membantu, karena mengakhiri giliran untuk menunggunya membuat mandor mengira pengerja sudah selesai (alasan yang sama dengan aturan jalan uji di langkah 7 definisi pengerja). Jadi pengerja yang terlanjur menaruh perintah di latar terdorong membuat perulangan. Aturan yang benar untuk subagen: latar depan, bukan "latar lalu tunggu notifikasi".
- Versi terpasang di nukitu-mockup 1.15.0, sumber sudah 1.16.0 — perbaikannya baru terasa sesudah rilis dan pembaruan plugin.
- 2026-10-28 10:27:23: answered question: Anggaran kata aturan skill (18.000 kata, tests/skill-size.test.mjs) sekarang terpakai 17.998, dan README mewajibkan aturan baru menyebut aturan yang diganti atau dibuang. Aturan menunggu ini masuk ke tiga definisi agen dan panduan mandor (kira-kira 120-150 kata). Pilihan: (a) aturan baru menggantikan kalimat jalan uji di langkah 7 definisi pengerja, dan pengerja memangkas kalimat lain di berkas yang sama sampai total kembali di bawah 18.000; (b) anggaran dinaikkan secukupnya (misal 18.200) di uji dan README. Saran: (a), karena anggaran itu dibuat justru untuk memaksa pertukaran ini dan aturan lama jalan uji memang tercakup aturan baru.
  answer, 2026-10-28 10:48:03: Ganti & rapikan: aturan baru menggantikan kalimat jalan uji di langkah 7 definisi pengerja, dan pengerja memangkas kalimat lain di berkas yang sama sampai total kembali di bawah 18.000 kata; anggaran tidak dinaikkan.
- 2026-10-28 10:27:24: answered question: Butir terakhir Done when (pengerja yang diberi skrip pemeriksaan beberapa menit tidak lagi memunculkan perulangan) hanya bisa dilihat dengan menjalankan agen sungguhan, dan baru terasa di proyek lain sesudah rilis dan pembaruan plugin. Pilihan: (a) ditunda — pengerja menulis skenario tangan di Notes, rantai jalan terus; (b) menahan rantai sampai pemilik mencobanya. Saran: (a), karena tidak ada tiket lain yang menunggu tiket ini dan pemeriksaannya butuh rilis lebih dulu.
  answer, 2026-10-28 10:48:03: Ditunda: pengerja menulis skenario tangan di Notes, rantai jalan terus.
- 2026-10-28 10:27:24: files estimated to change: `agents/kerjaan-planner.md`, `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `skills/kerjaan/references/foreman.md`, `tests/bash-description.test.mjs`
- Aturan menunggu (satu kalimat yang sama, kata demi kata) ada di `agents/kerjaan-worker.md` langkah 3, `agents/kerjaan-reviewer.md` dan `agents/kerjaan-planner.md` tepat sesudah kalimat `description`; alasannya: agen yang mengakhiri giliran untuk menunggu terlihat sudah selesai bagi pengutusnya, dan perulangan memenuhi terminal pemilik serta menyiasati batas yang sengaja dipasang. Aturan hanya untuk perintah yang ditunggu hasilnya, jadi langkah peninjau menyalakan server di latar lalu menyelidikinya tetap utuh.
- Sesuai jawaban #1: kalimat jalan uji di langkah 7 pengerja diganti rujukan ke langkah 3; kalimat lain di definisi pengerja dipangkas (pembuka, langkah 2, 5, 7, 8, bagian tanpa tiket, jawaban pemilik, merge postponed). Definisi peninjau juga dipangkas (pembuka, tindak lanjut, keputusan, laporan akhir) supaya tetap di bawah batas 3.000 katanya sendiri (`tests/reviewer-rules.test.mjs`): kini 2.994. Total kata skill 17.925 dari 18.000; anggaran tidak naik.
- Panduan mandor (`references/foreman.md`, langkah utus pengerja): notifikasi datang sendiri untuk agen dan perintah latar, tidak ditunggu dengan perulangan cek-dan-tidur.
- Uji di `tests/bash-description.test.mjs`. Dibuktikan merah: aturan dihapus dari pengerja, peninjau, perencana satu per satu → masing-masing uji agennya merah; kalimat mandor dihapus → uji mandor merah; langkah 7 pengerja dikembalikan ke "background" → merah; langkah server latar peninjau diubah → merah.
- Skenario tangan (butir terakhir, ditunda pemilik):
  1. Rilis versi berisi tiket ini, lalu perbarui plugin kerjaan di proyek lain (misal nukitu-mockup).
  2. Buat tiket yang `Done when`-nya menuntut menjalankan skrip pemeriksaan yang makan 3-5 menit (misal skrip yang `sleep 240` lalu mencetak hasil).
  3. Jalankan rantai dan biarkan mandor mengutus pengerja.
  4. Amati terminal/panel aktivitas: skrip berjalan di latar depan dengan batas waktu panjang (atau dipecah), tanpa perintah `pgrep`/`perl select`/`sleep` berulang, dan pengerja baru melapor sesudah skrip selesai.
- 2026-10-28 10:54:29: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 1 after 3m41s, on content fingerprint d79bf0e65c4f1a71dbcf987afc79e7bd800f535a (the same before and after the run; .kerjaan/ left out).
- 2026-10-28 11:03:41: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs` exited 0 after 4m15s, on content fingerprint 0ed22031f39504f4075fc317c85e89d5c8fa22df (the same before and after the run; .kerjaan/ left out).
