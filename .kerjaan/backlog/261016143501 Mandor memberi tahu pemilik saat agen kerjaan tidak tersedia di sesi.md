---
type: task
priority: high
review:
labels: [sesi-a192c9e8, foreman, agents]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:35:27
updated: 2026-10-16 14:35:42
related: [261016141903, 261011064201]
blocked_by: []
---

## Background

Mandor menyerahkan pekerjaan kepada tiga agen khusus kerjaan: penyusun
antrean, pengerja, dan peninjau. Agen-agen ini datang bersama plugin yang
terpasang. Kalau plugin itu versi lama, agen yang dibutuhkan bisa saja tidak
ada di sesi.

Pada 2026-10-16 hal itu terjadi. Plugin yang terpasang (1.11.0) belum punya
penyusun antrean, dan mandor mengutus agen umum yang disuruh memerankannya.
Pemilik baru mengetahuinya setelah agen itu berjalan. Agen pengganti tidak
membawa pembatasan alat dan wewenang yang dimiliki agen khusus. Pemilik juga
tidak bisa memilih jalan lain, misalnya memperbarui plugin lebih dulu.

## Request

Bila agen kerjaan yang dibutuhkan tidak tersedia di sesi, mandor berhenti dan
memberi tahu pemilik beserta cara memperbaikinya. Mandor tidak pernah memakai
agen pengganti tanpa persetujuan pemilik.

## Done when
- [ ] Panduan mandor menyatakan bahwa bila penyusun antrean, pengerja atau peninjau tidak ada di daftar agen sesi, mandor memberi tahu pemilik sebelum mengutus siapa pun
- [ ] Pemberitahuan itu menyebut dua jalan keluar: memperbarui plugin, atau membuka sesi yang memuat plugin langsung dari folder repo
- [ ] Agen pengganti hanya dipakai bila pemilik menyetujuinya, dan persetujuan itu tercatat di Notes tiket yang dikerjakan
- [ ] Di repo kerjaan sendiri, saat sesi dimulai mandor menyebut bila versi plugin terpasang lebih tua dari versi di repo
- [ ] Dicoba di sesi dengan plugin yang tidak punya penyusun antrean: permintaan mengisi antrean dijawab dengan pemberitahuan, bukan dengan mengutus agen umum

## History
- 2026-10-16 14:35:27 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel
  `sesi-a192c9e8` lahir dari penilaian yang sama dan dimaksudkan dikerjakan
  sebagai satu batch todo: `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`.
  Konteks lengkapnya bisa dibuka lagi dengan
  `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya
  masih ada; tiket ini ditulis agar tetap cukup tanpa itu.
- Pemilik: "Sebaiknya planner ini adalah agent khusus misal `kerjaan-planner`
  bukan `general-purpose`." Pada kejadian itu agen pengganti dibiarkan
  selesai, tetapi hanya untuk sekali itu.
- Versi terpasang ada di `~/.claude/plugins/installed_plugins.json`; mode
  pengembangan: `claude --plugin-dir <repo>`.
