---
type: task
priority: high
review: normal
labels: [sesi-a192c9e8, skill, explain]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 02:55:57
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
- [x] Pengaturan papan tidak lagi mengenal pilihan penjelasan pemilik maupun terjemahannya
- [x] Skill, panduan, definisi agen, README dan contoh tiket tidak lagi menyebut penjelasan pemilik
- [x] Skrip dan panduan khusus fitur itu sudah dihapus, begitu pula gerbangnya di skrip pemindah tiket dan langkah menunggu penjelasan
- [x] Tiket lama yang masih memuat bagian penjelasan tetap bisa dipindah dan dibaca seperti biasa
- [x] Tiket 261011073103 dibatalkan dengan alasan bahwa fiturnya sudah dihapus
- [x] Semua uji yang tersisa lulus

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:21 todo
- 2026-10-17 02:49:47 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 02:55:57 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review

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
- 2026-10-17: Dikerjakan oleh pengerja (langsung di main, tanpa worktree):
  - Dihapus: `skills/kerjaan/scripts/explain.sh`, `skills/kerjaan/references/explanation.md`, gerbang `explain.sh gate` di `update-ticket.sh` (gerbang review kini hanya: harus dari in_progress, lalu `merge.sh check --gate`), kunci `owner_explanation`/`explanation_translation` di `SETTINGS.md`, di `.kerjaan/settings.md` papan ini, dan di papan contoh semua uji `uji/*.test.mjs`.
  - Teks dibersihkan: SKILL.md (contoh perintah, pohon papan, gerbang, Settings, Starting a session, judul `## Explanation`, Language, langkah sebelum review, hook, Committing), README (pohon papan, contoh perintah, bagian "The owner explains the code first"), `agents/kerjaan-worker.md` (langkah 9 kini satu perintah; `WAITING — explanation` hilang dari laporan), `agents/kerjaan-reviewer.md` (bagian "The owner's explanation"), `references/foreman.md` (baris tabel dan dua sebutan), komentar `lib.sh`. Hook `on-ticket-review.sh`, viewer dan `docs/` tidak pernah menyebut fitur ini. `grep -rni 'explan'` di luar `.kerjaan/done`, `.kerjaan/cancel` dan tiket papan kini tidak menemukan apa-apa.
  - Butir 4: uji baru di `uji/update-ticket.test.mjs` — tiket dengan `## Explanation` (berisi blok berpagar yang memuat `## Notes`), dengan dan tanpa History, plus tiket berkode tanpa Explanation, dipindah todo -> in_progress -> review di papan yang settings-nya masih berbunyi `owner_explanation: strict`: semua lolos, bagian Explanation utuh byte demi byte, History tetap tepat sebelum Notes yang asli. Viewer: `render()` di `viewer/web/markdown.js` dicoba pada tiket seperti itu; Explanation tampil sebagai judul biasa dan blok kode, History dan Notes seperti biasa.
  - Bukti uji bisa merah: `explain.sh` dari HEAD dipulihkan sementara dan baris `explain.sh gate` dipasang lagi di `update-ticket.sh` (disalin dulu, dipulihkan dari salinan). Hasil: uji 'Explanation, from before History existed' merah (REFUSED: the explanation no longer ...) dan 'code and no Explanation section' merah (owner_explanation is strict, and the owner has not explained this work yet); uji 'with History' tetap hijau karena gerbang lama meloloskannya. Versi pertama uji tanpa berkas kode tetap hijau saat gerbang dipasang (gerbang lama meloloskan tiket tanpa kode), jadi uji diubah agar commit-nya membawa kode.
  - Butir 5: 261011073103 sudah ada di `.kerjaan/cancel/` dengan alasan "fitur penjelasan pemilik akan dihapus seluruhnya (261016141904)", dibatalkan mirza 2026-10-16.
  - Catatan: tiket todo 261016141907 masih menyebut `explanation.md:60-62` sebagai rujukan; berkas itu kini sudah tidak ada (tiket itu sendiri sudah menulis "ikut hilang").
- 2026-10-17 02:55:41: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m18s, on content fingerprint 4589729238e6439d91134112e3501ab24bed447e (the same before and after the run; .kerjaan/ left out).
