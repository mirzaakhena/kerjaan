---
type: bug
priority: low
review:
labels: [skill, hook]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:32:18
updated: 2026-10-11 07:32:42
related: [261011064201]
blocked_by: []
---

## Background

Saat tiket ditolak peninjau, mandor seharusnya melanjutkan peninjau yang sama
untuk putaran kedua, bukan mengutus peninjau baru. Dua petunjuk tertulis
belum sejalan dengan itu. Panduan mandor menyebut bahwa sesudah pengerja
melapor, hook kembali meminta peninjau. Padahal pesan itu sampai ke pengerja,
bukan ke mandor. Pesan hook yang sampai ke mandor juga selalu berbunyi
"utus satu peninjau sekarang", termasuk di putaran kedua.

## How to reproduce
1. Baca panduan mandor (`skills/kerjaan/references/foreman.md`), bagian
   "Sent back, first time".
2. Bandingkan dengan pesan hook saat tiket masuk review dari sesi utama, untuk
   tiket yang Notes-nya sudah memuat satu tinjauan.

Panduan menyebut hook yang tidak pernah muncul di sisi mandor, dan pesan hook
menyuruh mengutus peninjau baru.

## Request

Petunjuk untuk putaran kedua selalu mengarahkan mandor ke peninjau lama, dan
tidak menyebut pesan yang tidak akan ia terima.

## Done when
- [ ] Panduan mandor menjelaskan putaran kedua tanpa menyebut pesan hook
      yang tidak sampai ke mandor.
- [ ] Untuk tiket yang sudah pernah ditinjau, pesan hook ke mandor menyuruh
      melanjutkan peninjau sebelumnya bila masih bisa, dan mengutus yang baru
      hanya kalau tidak bisa.
- [ ] Kedua hal di atas dibuktikan dengan uji yang menjalankan hook untuk
      tiket putaran pertama dan tiket putaran kedua.

## History

## History
- 2026-10-11 07:32:18 backlog

## Notes
(none yet)
