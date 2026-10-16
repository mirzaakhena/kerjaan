---
type: bug
priority: medium
review:
labels: [sesi-a192c9e8, review]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 04:04:57
related: [261016141913, 261011083001]
blocked_by: []
---

## Background

Setelah dua kali dikembalikan reviewer, sebuah tiket seharusnya berhenti dan
diserahkan kepada pemilik. Masalahnya, ada tiga pihak yang menghitung putaran
dengan cara berbeda:

- mandor menghitung penolakan;
- pengembalian karena main sudah bergerak ("SENT BACK") dinyatakan tidak
  dihitung;
- peninjau menghitung jumlah review.

Tiket dengan satu penolakan dan satu putaran penggabungan ulang dianggap
"putaran 3" oleh peninjau.

Peninjau pengganti juga mencari review sebelumnya lewat kalimat berbahasa
Inggris, padahal di papan berbahasa Indonesia review ditulis dalam bahasa
papan. Akibatnya review sebelumnya tidak ditemukan dan hitungan mulai dari 1
lagi.

## How to reproduce

1. Kerjakan sebuah tiket di worktree sampai masuk review, lalu biarkan
   peninjau menolaknya sekali
2. Perbaiki sampai lolos, tetapi gabungkan tiket lain ke main lebih dulu
   sehingga penggabungannya dikembalikan ("SENT BACK")
3. Biarkan peninjau memeriksa putaran penggabungan ulang

Peninjau menulis bahwa ini review ketiga, artinya tiket sudah dua kali
kembali, padahal baru sekali ditolak.

## Request

Mandor, peninjau dan hook memakai satu definisi putaran yang sama, dan
peninjau pengganti selalu menemukan review sebelumnya, apa pun bahasa
papannya.

## Done when
- [ ] Panduan mandor, panduan review dan definisi peninjau memuat definisi putaran yang sama: satu putaran adalah satu penolakan oleh peninjau
- [ ] Putaran penggabungan ulang disebut dengan nama tersendiri dan tidak diberi nomor putaran
- [ ] Penanda awal sebuah review ditulis dengan kalimat tetap yang sama di papan berbahasa apa pun
- [ ] Peninjau pengganti di papan berbahasa Indonesia mengenali review sebelumnya dan melanjutkan hitungannya
- [ ] Peristiwa penggabungan ulang hanya punya satu nama di semua dokumen

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:22 todo
- 2026-10-17 04:04:57 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi: `foreman.md:39`, `:214`; `review.md:91-94`; `parallel-work.md:281`;
  `agents/kerjaan-reviewer.md:233-234`, `:293-297`, `:570-571`, `:596-597`;
  `on-ticket-review.sh:130-157`. Nama yang beredar untuk satu peristiwa:
  `SENT BACK`, "merge postponed", "re-integration round", "main moved".
- 2026-10-16 14:36:46: files estimated to change: `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `docs/cara-kerja-reviewer.md`, `skills/kerjaan/references/foreman.md`, `skills/kerjaan/references/parallel-work.md`, `skills/kerjaan/references/review.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/merge.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `uji/merge.test.mjs`, `uji/on-ticket-review.test.mjs`
