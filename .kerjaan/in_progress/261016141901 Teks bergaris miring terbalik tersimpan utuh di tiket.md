---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, scripts]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:05
updated: 2026-10-16 15:01:25
related: [261016141914, 261016141915]
blocked_by: []
---

## Background

Saat pemilik menjawab pertanyaan sebuah tiket, atau saat sebuah catatan
menjadi catatan pertama di bagian Notes, teksnya disalin ke dalam tiket oleh
skrip papan. Cara penyalinan yang dipakai sekarang menafsirkan garis miring
terbalik (`\`) sebagai kode khusus, bukan sebagai huruf biasa. Akibatnya teks
berubah diam-diam: `\d+` menjadi `d+`, `C:\temp` menjadi `C:` diikuti tab dan
`emp`.

Ini juga merusak bukti uji. Bila perintah uji proyek mengandung garis miring
terbalik, perintah yang tercatat di tiket tidak lagi sama dengan yang ada di
pengaturan, sehingga peninjau menganggap bukti ujinya tidak ada dan
penggabungan ke main ditahan.

## How to reproduce

1. Di papan mana pun, buat pertanyaan untuk sebuah tiket dengan `queue.sh ask`
2. Jawab dengan `queue.sh answer <id> 1 "pakai pola \d+ di C:\temp"`
3. Buka tiketnya

Jawaban yang tersimpan berbunyi `pakai pola d+ di C:` lalu tab dan `emp`.

## Request

Teks apa pun yang ditulis skrip ke dalam tiket tersimpan persis seperti
aslinya, termasuk garis miring terbalik.

## Done when
- [x] Langkah di atas menyimpan jawaban persis `pakai pola \d+ di C:\temp`
- [x] Catatan pertama di Notes yang mengandung garis miring terbalik tersimpan utuh
- [x] Perintah uji yang mengandung garis miring terbalik tercatat utuh, dan peninjau mengenali hasil ujinya sebagai bukti yang sah
- [x] Ada uji otomatis untuk ketiga hal di atas

## History
- 2026-10-16 14:19:05 backlog
- 2026-10-16 14:46:19 todo
- 2026-10-16 14:54:16 in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Temuan teknis: `awk -v` menafsirkan escape. Terkena di `queue.sh:273`,
  `lib.sh:221`, `update-ticket.sh:458`, `test-run.sh:291`. Jalan keluar yang
  disarankan: kirim teks lewat `ENVIRON[...]` atau berkas, bukan `-v`.
- 2026-10-16 14:36:44: files estimated to change: `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/queue.sh`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `uji/queue.test.mjs`, `uji/test-run.test.mjs`, `uji/update-ticket.test.mjs`
- 2026-10-16: pengerjaan. Setiap `awk -v` yang membawa teks bebas diganti
  menjadi `ENVIRON[...]`: jawaban di `queue.sh answer`, catatan di
  `kerjaan_append_note` (lib.sh), dan judul baru yang ditulis ke `order.md`
  oleh `update-ticket.sh --title` (tempat keempat, tidak ada di daftar awal).
  `update-ticket.sh` dan `test-run.sh` kini memanggil `kerjaan_append_note`
  alih-alih menyalin awk yang sama, jadi penulisan catatan tinggal satu tempat.
  `awk -v` lain yang tersisa hanya membawa ID, nomor, kunci tetap, waktu atau
  path mktemp. Uji baru: `uji/queue.test.mjs` (jawaban persis; catatan
  pertama dan catatan berikutnya), `uji/test-run.test.mjs` (perintah uji
  bergaris miring tercatat utuh dan `--check` menjawab SAME, untuk Notes kosong
  dan Notes berisi), `uji/update-ticket.test.mjs` (judul bergaris miring utuh di
  order.md; catatan update-ticket menggantikan "(none yet)").
- 2026-10-16: bukti uji bisa merah. lib.sh dikembalikan ke `awk -v note=`:
  merah di test-run "first note" dan queue "ask ... first note". queue.sh
  answer dikembalikan ke `-v ans=`: merah di "answer: backslashes".
  update-ticket.sh judul dikembalikan ke `-v t=`: merah di "--title:
  backslashes". Setiap berkas dipulihkan dari salinannya.
- 2026-10-16 15:01:24: test run — `node --test` exited 0 after 2m59s, on content fingerprint 35caac0dbd57ac10b5e9733f820f44375a36536b (the same before and after the run; .kerjaan/ left out).
