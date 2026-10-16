---
type: task
priority: medium
review:
labels: [sesi-a192c9e8, queue, parallel]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-16 14:21:58
related: [261016122402]
blocked_by: []
---

## Background

Saat dua tiket dalam satu grup antrean menyentuh berkas yang sama, pengantar
grup harus menyebut tiket mana yang digabung ke main lebih dulu. Pemeriksaan
antrean mengenalinya dengan mencocokkan kalimat bebas dalam bahasa Inggris dan
Indonesia ("lands first", "digabung lebih dulu", "mendarat dahulu", dan
belasan variasi lainnya).

Cara ini rapuh. Kalimat yang sedikit berbeda tidak dikenali, dan daftar
variasinya akan terus bertambah untuk setiap bahasa papan.

## Request

Urutan penggabungan ditulis dengan satu penanda tetap yang selalu dikenali,
apa pun bahasa papannya.

## Done when
- [ ] Ada satu penanda tetap untuk menyatakan tiket mana yang digabung lebih dulu, dijelaskan di panduan urutan antrean
- [ ] Grup yang memakai penanda itu dinyatakan siap, dan grup yang tidak memakainya dinyatakan belum siap beserta alasannya
- [ ] Pencocokan kalimat bebas sudah dihapus
- [ ] Uji yang ada untuk pemeriksaan urutan diperbarui dan lulus

## History
- 2026-10-16 14:19:07 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: `queue.sh:299-323`, `:444-472`. Contoh bentuk penanda:
  `<!-- first: 261016141901 -->` per grup, atau urutan butir di dalam grup.
