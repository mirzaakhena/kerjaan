---
type: bug
priority: medium
review: normal
labels: [sesi-a192c9e8, hooks, review]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-16 14:21:58
related: [261016141906]
blocked_by: []
---

## Background

Hook kerjaan dibuat supaya peninjau pasti dipanggil saat sebuah tiket masuk
review. Tetapi pada jalur yang paling sering dipakai, yaitu pengerja yang
memindahkan tiketnya sendiri ke review, hook hanya menyuruh pengerja
berhenti. Pemanggilan peninjau kembali bergantung pada mandor yang membaca
laporan pengerja, padahal komentar di hook itu sendiri menyebut cara ini tidak
bisa diandalkan.

Hook juga tidak mengenali beberapa cara menulis perintah pindah ke review,
misalnya bila nama status diberi tanda kutip atau digabung dengan tanda sama
dengan.

## How to reproduce

1. Mandor mengutus pengerja untuk sebuah tiket
2. Pengerja menyelesaikan pekerjaan dan memindahkan tiketnya ke review
3. Mandor lupa membaca laporan pengerja atau melanjutkan ke hal lain

Tiket diam di review, dan tidak ada pengingat yang sampai ke mandor.

## Request

Setiap tiket yang masuk review karena pekerjaan pengerja diikuti pengingat
kepada mandor untuk memanggil peninjau, tanpa bergantung pada mandor yang
ingat sendiri.

## Done when
- [ ] Saat pengerja selesai dan tiketnya ada di review, mandor menerima pengingat untuk memanggil peninjau
- [ ] Pengerja yang selesai tanpa memindahkan tiket ke review tidak memicu pengingat itu
- [ ] Perintah pindah ke review dengan nama status yang diberi tanda kutip atau ditulis dengan tanda sama dengan tetap dikenali
- [ ] Ada uji otomatis untuk ketiga hal di atas

## History
- 2026-10-16 14:19:07 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Saran teknis: hook `SubagentStop` yang memeriksa apakah tiket pengerja kini
  berada di `review/`. Lokasi: `on-ticket-review.sh:9-10`, `:44`, `:101-115`;
  `foreman.md:177`, `:203`.
