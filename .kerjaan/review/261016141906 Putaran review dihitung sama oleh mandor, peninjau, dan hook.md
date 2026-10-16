---
type: bug
priority: medium
review:
labels: [sesi-a192c9e8, review]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:06
updated: 2026-10-17 04:14:31
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
- [x] Panduan mandor, panduan review dan definisi peninjau memuat definisi putaran yang sama: satu putaran adalah satu penolakan oleh peninjau
- [x] Putaran penggabungan ulang disebut dengan nama tersendiri dan tidak diberi nomor putaran
- [x] Penanda awal sebuah review ditulis dengan kalimat tetap yang sama di papan berbahasa apa pun
- [x] Peninjau pengganti di papan berbahasa Indonesia mengenali review sebelumnya dan melanjutkan hitungannya
- [x] Peristiwa penggabungan ulang hanya punya satu nama di semua dokumen

## History
- 2026-10-16 14:19:06 backlog
- 2026-10-16 14:46:22 todo
- 2026-10-17 04:04:57 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec in_progress
- 2026-10-17 04:14:31 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review

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
- 2026-10-17 (pengerja): yang dibangun.
  - Definisi satu putaran ada di `references/review.md` bagian baru
    "Rounds": satu putaran berakhir dengan satu penolakan oleh peninjau;
    putaran N adalah review sesudah N-1 penolakan. Kalimat yang sama ada di
    `foreman.md` (daftar tugas mandor), `agents/kerjaan-reviewer.md` ("Count
    the rounds") dan komentar `on-ticket-review.sh`.
  - Satu nama untuk peristiwanya: **merge postponed** (sudah dipakai baris
    catatan `merge.sh land` dan `kerjaan_merge_state`, jadi papan lama tetap
    terbaca). Keluaran `merge.sh land` diganti dari `SENT BACK:` menjadi
    `MERGE POSTPONED:` (exit 3 tetap), karena "sent back" juga kata untuk
    penolakan peninjau. Review sesudahnya disebut "the review after a merge
    postponed", tanpa nomor putaran. Nama lama dihapus dari foreman.md,
    review.md, parallel-work.md, ordering-the-queue.md, kerjaan-worker.md
    (judul "When you are resumed after a merge postponed"),
    kerjaan-reviewer.md, README.md, merge.sh, update-ticket.sh, dan
    docs/cara-kerja-reviewer.md. "main moved" tinggal sebagai penjelasan
    sebab (mis. `STALE`), bukan nama peristiwa.
  - Baris pembuka review tetap, berbahasa Inggris di papan apa pun, sama di
    review.md dan kerjaan-reviewer.md:
    `- <YYYY-MM-DD>: Reviewed at level <level>, round <n>, at commit <hash>: <passed | sent back>.`
    dan untuk review sesudah merge postponed `..., after merge postponed, ...`.
    Prosa review sesudahnya tetap dalam bahasa papan. Saya cek done/ papan
    ini: peninjau menulis campur ("Reviewed at level ..." dengan atau tanpa
    tanggal di depan, "Ditinjau pada level/tingkat ...", "Review tingkat
    ..."). "Reviewed at level" dipertahankan agar review lama papan
    berbahasa Inggris tetap terbaca, dan hook kini juga mengenali bentuk
    dengan tanggal di depan (`- 2026-10-16: Reviewed at level ...`), yang
    dulu terlewat. Review lama berbahasa Indonesia dihitung lewat History.
  - Hook menghitung penolakan dari dua catatan peristiwa yang sama, diambil
    yang terbesar (bukan dijumlah): baris pembuka yang berakhir `sent back`,
    dan perpindahan History `review` -> `in_progress`. `done` ->
    `in_progress` = merge postponed. Pesannya kini menyebut "round N, after
    N-1 rejection(s)", atau untuk review sesudah merge postponed: bukan
    putaran, tanpa nomor, level quick, `merge.sh resolution <id>`, jumlah
    penolakan tidak berubah. Kasus di "How to reproduce" (satu penolakan +
    satu merge postponed) kini tidak lagi menjadi "putaran 3".
  - Uji baru di `uji/on-ticket-review.test.mjs`: kasus tiket ini, merge
    postponed tanpa penolakan, merge postponed dari Notes saja, penolakan
    sesudah merge postponed, hitungan per kasus (round 2 dan 3 dari History,
    round 3 dari Notes saja di papan Indonesia), History+Notes tidak
    dijumlah, tiga bentuk pembuka baru, dan tiga uji dokumen (definisi sama
    di tiga dokumen; baris tetap sama di dua dokumen; nama lama tidak ada di
    dokumen mana pun). Uji dokumen 261016141905 di queue.test.mjs tidak
    tersentuh. `uji/merge.test.mjs` hanya menyesuaikan `MERGE POSTPONED:`.
  - Sabotase (salinan berkas dipulihkan dari salinan, bukan git):
    pada hook — deteksi merge postponed dari History dihapus -> 2 uji merah;
    dari Notes -> 1 merah; hitungan penolakan History -> 4 merah; hitungan
    penolakan Notes -> 10 merah; dijumlah bukan diambil terbesar -> 2 merah;
    awalan tanggal di regex pembuka dihapus -> 5 merah; penolakan sesudah
    merge postponed tidak menimpa status -> 2 merah. Pada dokumen — definisi
    dihapus dari foreman.md, review.md, kerjaan-reviewer.md -> uji definisi
    merah di masing-masing; baris tetap diterjemahkan di kerjaan-reviewer.md
    atau diubah di review.md -> uji baris tetap merah; `SENT BACK` di
    merge.sh, "re-integration" di parallel-work.md, judul lama di
    kerjaan-worker.md -> uji satu nama merah.
- 2026-10-17 04:14:25: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m22s, on content fingerprint d792558e49e9f33c477f8c59241254ad0c206d1d (the same before and after the run; .kerjaan/ left out).
