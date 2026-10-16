---
type: bug
priority: high
review: normal
labels: [sesi-a192c9e8, scripts]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:05
updated: 2026-10-16 14:54:16
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
- [ ] Langkah di atas menyimpan jawaban persis `pakai pola \d+ di C:\temp`
- [ ] Catatan pertama di Notes yang mengandung garis miring terbalik tersimpan utuh
- [ ] Perintah uji yang mengandung garis miring terbalik tercatat utuh, dan peninjau mengenali hasil ujinya sebagai bukti yang sah
- [ ] Ada uji otomatis untuk ketiga hal di atas

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
