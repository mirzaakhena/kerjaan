---
type: task
priority: high
review: normal
labels: [sesi-a192c9e8, skill, explain]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-16 14:46:21
related: [261011073103, 261016141909]
blocked_by: []
---

## Background

Kerjaan punya fitur yang meminta pemilik menjelaskan kode setiap tiket dengan
kata-katanya sendiri sebelum tiket masuk review. Fitur ini membawa banyak
aturan: urutan commit yang ketat, bagian khusus di tiket, skrip tersendiri,
satu berkas panduan, gerbang di skrip pemindah tiket, dan langkah tunggu di
pengerja dan mandor.

Di repo ini fitur itu tidak pernah dinyalakan, dan pemilik memutuskan
menghapusnya. Semua aturannya ikut dimuat setiap kali skill dipanggil, jadi
menghapusnya langsung menghemat biaya dan menyederhanakan alur kerja.

## Request

Fitur penjelasan pemilik hilang sepenuhnya dari kerjaan, tanpa merusak papan
yang tiketnya sudah memuat bagian penjelasan.

## Done when
- [ ] Pengaturan papan tidak lagi mengenal pilihan penjelasan pemilik maupun terjemahannya
- [ ] Skill, panduan, definisi agen, README dan contoh tiket tidak lagi menyebut penjelasan pemilik
- [ ] Skrip dan panduan khusus fitur itu sudah dihapus, begitu pula gerbangnya di skrip pemindah tiket dan langkah menunggu penjelasan
- [ ] Tiket lama yang masih memuat bagian penjelasan tetap bisa dipindah dan dibaca seperti biasa
- [ ] Tiket 261011073103 dibatalkan dengan alasan bahwa fiturnya sudah dihapus
- [ ] Semua uji yang tersisa lulus

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:21 todo

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Keputusan pemilik di sesi penilaian: "hapus saja `owner_explanation` dan
  semua yang berkaitan dengannya".
- Titik yang diketahui: `skills/kerjaan/references/explanation.md`,
  `scripts/explain.sh`, gerbang di `update-ticket.sh`, `## Explanation` di
  SKILL.md, kunci `owner_explanation` dan `explanation_translation` di
  SETTINGS.md, `WAITING — explanation` di `agents/kerjaan-worker.md`,
  `(waiting for the owner's explanation)` di SKILL.md "Starting a session",
  dan pengecualian izin commit di bagian "Committing".
- 2026-10-16 14:36:59: files estimated to change: `README.md`, `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `skills/kerjaan/SETTINGS.md`, `skills/kerjaan/SKILL.md`, `skills/kerjaan/references/explanation.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/scripts/explain.sh`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `uji/merge.test.mjs`, `uji/queue.test.mjs`, `uji/ticket-size.test.mjs`, `uji/worktree.test.mjs`
