---
type: task
priority: medium
review: normal
labels: [sesi-a192c9e8, queue, parallel]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 02:57:25
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
- [ ] Pengantar grup yang masih tersisa di order.md papan ini memakai penanda baru, dan pemeriksaan antrean menyatakannya siap

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:21 todo
- 2026-10-17 02:57:25 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: `queue.sh:299-323`, `:444-472`. Contoh bentuk penanda:
  `<!-- first: 261016141901 -->` per grup, atau urutan butir di dalam grup.
- 2026-10-16 14:36:46: files estimated to change: `agents/kerjaan-planner.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/scripts/queue.sh`, `uji/queue.test.mjs`
- 2026-10-16 14:38:11: answered question: Bentuk penanda: (a) baris tetap per grup, misalnya <!-- lands-first: ID -->, sama di semua bahasa; atau (b) tanpa penanda, butir pertama dalam grup selalu digabung lebih dulu? Saran: (a), karena butir 2 menuntut grup tanpa penanda ditolak, dan (b) tidak bisa membedakan urutan yang disengaja dari kebetulan. Tambahan: setelah tiket ini masuk main, pengantar grup yang tersisa di order.md batch ini memakai kalimat lama; boleh pengerja tiket ini mengubahnya ke penanda baru? Saran: boleh.
  answer, 2026-10-16 14:45:50: (a) Satu baris tetap per grup, misalnya <!-- lands-first: ID -->; dan ya, pengerja tiket ini mengubah pengantar grup yang tersisa di order.md ke penanda baru.
