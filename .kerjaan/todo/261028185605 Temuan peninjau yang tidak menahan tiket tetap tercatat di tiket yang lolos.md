---
type: bug
priority: medium
review: quick
labels: [agen, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 18:56:45
updated: 2026-10-28 18:59:29
related: [261028171401]
blocked_by: []
---

## Background
Tiket 261028171401 meringkas catatan tinjauan: tinjauan yang lolos kini
ditulis satu baris per butir. Peninjaunya menemukan efek samping. Panduan
peninjau tidak lagi meminta temuan yang tidak menahan tiket (misalnya uji
yang lemah, atau aturan proyek yang dilanggar tanpa menggagalkan butir)
ditulis ke tiket yang lolos. Temuan itu kini mungkin hanya sampai di laporan
peninjau ke mandor, lalu hilang, dan tidak terbaca siapa pun yang membuka
tiketnya nanti.

## Request
Peninjau yang meloloskan tiket tetap menulis setiap temuan yang tidak
menahan tiket ke tiket itu, masing-masing satu baris, tanpa membuat tinjauan
yang lolos kembali panjang.

## Done when
- [ ] Panduan peninjau meminta temuan yang tidak menahan tiket ditulis ke tiket yang lolos, satu baris per temuan
- [ ] Batas kata panduan peninjau dan skill tidak dinaikkan
- [ ] Uji otomatis gagal bila permintaan itu hilang dari panduan peninjau

## History
- 2026-10-28 18:56:45 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 18:59:29 a185f853-6a65-4f44-919d-97ba97774e43 todo

## Notes
- Saran lanjutan peninjau 261028171401; dicatat atas pilihan mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43. Tempatnya paragraf "Every criterion met" di `agents/kerjaan-reviewer.md`. Panduan peninjau 2.992 dari 3.000 kata per 2026-10-28, jadi frasa baru harus menggantikan kata lain.
- 2026-10-28 18:59:15: files estimated to change: `agents/kerjaan-reviewer.md`, `tests/reviewer-rules.test.mjs`
