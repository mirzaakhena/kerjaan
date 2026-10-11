---
type: task
priority: medium
review:
labels: [skill, agen]
reporter: mirza
assign_to: claude
created: 2026-10-11 07:32:18
updated: 2026-10-11 07:57:24
related: [261011064201]
blocked_by: []
---

## Background

Sejak tiket 261011064201, sesi utama menjadi mandor. Setiap tiket dikerjakan
agen pengerja baru, peninjau dipanggil oleh mandor, dan tiket yang ditolak
dikembalikan ke pengerja dan peninjau yang sama. Aturannya sudah tertulis,
tetapi belum pernah dijalankan sungguhan. Saat aturan itu ditulis, plugin
yang terpasang masih versi lama, jadi agen pengerja belum terdaftar. Yang
sudah diuji baru bagian kecil yang memutuskan siapa yang boleh memanggil
peninjau.

## Request

Satu rantai kecil dijalankan dari plugin yang memuat cara kerja ini, dan
hasilnya dicatat. Dengan begitu kita tahu cara kerja itu benar-benar berjalan
seperti yang tertulis, bukan hanya di atas kertas.

## Done when
- [ ] Rilis yang memuat agen pengerja sudah terpasang, dan rantai berisi dua
      tiket kecil dijalankan dari satu sesi.
- [ ] Salah satu tiket sengaja dibuat ditolak sekali, dan Notes tiket itu
      menunjukkan bahwa putaran keduanya dikerjakan pengerja yang sama dan
      ditinjau peninjau yang sama.
- [ ] Ringkasan di akhir rantai menyebut tiket mana yang lolos dan di
      putaran keberapa, serta pertanyaan yang terkumpul.
- [ ] Setiap hal yang tidak berjalan seperti yang tertulis dicatat di tiket
      ini, beserta tiket perbaikannya.

## History
- 2026-10-11 07:56:49 todo

## History
- 2026-10-11 07:32:18 backlog

## Notes
- Keputusan mirza, 11 Okt 2026: rantai uji dijalankan di repo git terpisah
  (mis. `~/Workspace/kerjaan-uji-rantai`) dengan papan dan dua tiket mainan
  sendiri, supaya papan kerjaan tidak kotor oleh tiket uji. Hasilnya dicatat
  di tiket ini.
- Keputusan mirza, 11 Okt 2026: rilis 1.9.0 dibuat dan di-push oleh Claude
  sesudah 261011073202 lolos. Tiket ini menunggu rilis itu terpasang.
- Tidak ada butir yang hanya bisa diperiksa manusia.
