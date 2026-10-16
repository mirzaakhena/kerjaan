---
type: task
priority: high
review:
labels: [sesi-a192c9e8, skill, queue]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:21:56
related: [261016141909]
blocked_by: []
---

## Background

Aturan kapan sebuah tiket siap masuk todo tertulis di beberapa tempat dan
isinya tidak sama.

Skill menulis "keempat syarat harus terpenuhi" lalu mendaftar enam butir.
Penyusun antrean menyebut "empat syarat" dan hanya mendaftar empat. Skill juga
mensyaratkan setiap tiket penghalang sudah selesai, padahal penyusun antrean
dan panduan urutan sengaja menaruh penghalang di grup yang lebih awal dalam
todo yang sama. Mandor yang mengikuti skill akan menganggap setiap batch dari
penyusun antrean bermasalah.

Pertanyaan untuk pemilik juga punya dua bentuk. Penyusun antrean memberinya
nomor sehingga terlihat oleh pemeriksaan antrean, sedangkan pengerja
menuliskannya bebas di Notes sehingga tidak terlihat. Selain itu, saran level
review tidak punya pemilik yang jelas: tugas itu diberikan kepada mandor, yang
justru tidak pernah membaca kodenya.

## Request

Ada satu definisi tiket siap dikerjakan, yang sama di semua tempat dan sama
dengan yang diperiksa skrip, dan semua pertanyaan untuk pemilik memakai satu
bentuk.

## Done when
- [ ] Skill dan penyusun antrean menyebut jumlah syarat yang sama dengan daftar yang sama
- [ ] Tiket yang penghalangnya berada di grup lebih awal dalam todo yang sama dianggap siap, baik oleh skill, penyusun antrean, maupun pemeriksaan antrean
- [ ] Panduan menunjuk pemeriksaan antrean sebagai satu-satunya acuan syarat siap, bukan menyalin daftarnya
- [ ] Pertanyaan yang muncul saat pengerjaan dicatat pengerja dengan nomor seperti pertanyaan penyusun antrean, dan terlihat oleh pemeriksaan antrean
- [ ] Usulan level review untuk setiap tiket datang dari penyusun antrean dalam laporannya, lalu disampaikan mandor kepada pemilik

## History
- 2026-10-16 14:19:06 backlog

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: SKILL.md:424-442 ("All four must hold" + 6 butir) dan :426-428,
  :459-460; `agents/kerjaan-planner.md:54-57`; `ordering-the-queue.md:26-28`,
  `:56-57`; `agents/kerjaan-worker.md:43-45`; `foreman.md:73`, `:109-120`;
  `review.md:28-29`.
