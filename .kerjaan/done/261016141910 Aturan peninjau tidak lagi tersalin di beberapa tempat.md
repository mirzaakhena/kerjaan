---
type: task
priority: medium
review: normal
labels: [sesi-a192c9e8, review, token]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 05:34:58
related: [261016141911]
blocked_by: [261016141904, 261016141906]
---

## Background

Definisi peninjau sudah sekitar 5.600 kata, hampir sama panjang dengan berkas
utama skill. Tabel level review ada dalam tiga salinan (panduan review,
definisi peninjau, dan dokumen cara kerja peninjau), dan salah satunya sudah
tidak sesuai kenyataan. Penjelasan hasil pemeriksaan bukti uji juga tertulis
dua kali. Ada pula kasus "cabang sudah digabung" yang tidak mungkin terjadi
lagi, karena penggabungan sekarang hanya dilakukan setelah tiket done.

Di repo ini ke-17 tiket done lolos di putaran pertama, dan level `strict`
belum pernah dipakai.

## Request

Definisi peninjau jauh lebih ringkas, setiap aturannya punya satu tempat, dan
bagian yang tidak bisa terjadi lagi dihapus.

## Done when
- [x] Definisi peninjau paling banyak sekitar 3.000 kata, dengan angka sebelum dan sesudah tercatat di Notes
- [x] Tabel level review hanya ada di satu tempat
- [x] Dokumen cara kerja peninjau tidak lagi menyalin aturan, cukup menjelaskan dan merujuk
- [x] Kasus yang tidak bisa terjadi lagi sudah dihapus
- [x] Tiket uji yang sengaja ditolak (seperti 261011073201) tetap ditolak oleh peninjau yang baru

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:24 todo
- 2026-10-17 05:19:41 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 05:31:27 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review
- 2026-10-17 05:34:58 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 done

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi salinan tabel: `review.md:9-13`, `agents/kerjaan-reviewer.md:35-42`,
  `docs/cara-kerja-reviewer.md:38-42`. Kasus usang:
  `agents/kerjaan-reviewer.md:176-183`. "runs the checks once" di review.md
  sudah tidak tepat.
- 2026-10-16 14:36:48: files estimated to change: `agents/kerjaan-reviewer.md`, `docs/cara-kerja-reviewer.md`, `skills/kerjaan/references/review.md`
- 2026-10-16 14:38:09: answered question: Butir 5 (tiket uji yang sengaja ditolak tetap ditolak peninjau baru) butuh peninjau yang dimuat dari repo. Boleh pengerja mengujinya lewat claude -p --plugin-dir, dengan cadangan skenario tangan yang ditunda; atau langsung ditunda; atau menahan rantai? Saran: sama dengan 261016141909, uji lewat --plugin-dir, cadangannya ditunda.
  answer, 2026-10-16 14:45:48: Sama dengan 261016141909: pengerja menguji lewat claude -p --plugin-dir; skenario tangan yang ditunda menjadi cadangannya.
- 2026-10-17: laporan pengerja (klaim, bukan bukti).
  - Jumlah kata (`wc -w`), sebelum → sesudah: `agents/kerjaan-reviewer.md`
    6.182 → 2.989; `docs/cara-kerja-reviewer.md` 1.326 → 653;
    `skills/kerjaan/references/review.md` 1.711 → 1.536.
  - Tabel level kini hanya di `agents/kerjaan-reviewer.md`, "How thorough to
    be" (barisnya diperbaiki: `test_command` dijalankan sekali atau dibawa dari
    run pengerja di semua level; membuktikan tiap kriteria jadi baris
    sendiri). `review.md`, README dan dokumen cara kerja hanya merujuk dengan
    satu kalimat. README ternyata menyimpan salinan keempat; ikut diganti
    rujukan (berkas di luar estimasi).
  - Satu tempat per aturan di dalam definisi peninjau: penjelasan SAME/
    DIFFERENT/NO EVIDENCE kini hanya di bagian "Test runs"; bentuk baris
    pembuka hanya di definisi peninjau ("The decision"), `review.md` merujuk;
    cara menghitung putaran (termasuk "the larger count holds") hanya di
    `review.md` "Rounds", peninjau merujuk. Bagian "Your own checks are not
    evidence" di `review.md` dihapus: isinya sudah di langkah 5 pengerja dan
    aturan "Notes bukan bukti" peninjau.
  - Kasus usang dihapus: cabang yang sudah digabung sebelum review
    (`merge-base --is-ancestor`, "merged"). Diganti satu kalimat: cabang
    digabung hanya setelah `done`, jadi cabang yang belum digabung bukan
    temuan.
  - `docs/cara-kerja-reviewer.md` ditulis ulang sebagai penjelasan alasan
    (pemeriksa luar, level, sabotase, sidik isi, sabotase murah, kenapa bukan
    subagent), tiap bagian merujuk ke nama bagian di definisi peninjau.
  - Uji baru `uji/aturan-peninjau.test.mjs` (di luar estimasi): batas 3.000
    kata; tabel level hanya di definisi peninjau, diperiksa untuk setiap
    dokumen (README, SKILL.md, tiap references/, tiap agents/, tiap docs/);
    tiap baris tabel punya sel untuk ketiga level; rujukan dari tiga dokumen;
    setiap nama bagian yang disebut dokumen cara kerja memang ada; dokumen
    cara kerja tidak memuat SAME/DIFFERENT/NO EVIDENCE, `test-run.sh --check`,
    `cp -cR`, merge postponed dan sejenisnya; SAME dan "CI badge" sekali saja;
    baris pembuka sekali di peninjau dan dirujuk `review.md`; rujukan
    "Rounds"; kasus cabang tergabung hilang. Uji baris pembuka di
    `uji/on-ticket-review.test.mjs` disesuaikan: bentuknya hanya di peninjau,
    `review.md` merujuk dan menyebut istilah yang dihitung.
  - Uji dibuktikan bisa merah: tiap berkas lama (dari salinan) dipasang
    kembali satu per satu. Definisi lama: merah di batas kata, nama bagian,
    SAME sekali, rujukan Rounds, kasus tergabung. Dokumen cara kerja lama:
    merah di tabel, rujukan, nama bagian, pengulangan aturan. `review.md`
    lama: merah di tabel, rujukan, baris pembuka (kedua berkas uji), Rounds.
    README lama: merah di tabel dan rujukan. Tabel tiruan yang ditempel ke
    `agents/kerjaan-planner.md`: merah untuk berkas itu. Semua dipulihkan dari
    salinan.
  - Butir 5 dijalankan, bukan ditunda: repo uji di scratchpad dengan tiket
    `261017090001` (level normal, sengaja cacat seperti 261011081802 dari
    rantai 261011073201: `jumlah(1, "2")` masih `"12"`, uji masukan kedua
    tidak ada, kedua kotak dicentang, Notes mengklaim selesai, run
    `test-run.sh` lulus). Lebih dulu dipastikan definisi yang dimuat adalah yang
    baru: `claude -p --plugin-dir <repo ini> --agent kerjaan:kerjaan-reviewer`
    mengutip kalimat baru "This table is the one definition of the levels".
    Lalu peninjau yang sama diminta meninjau tiket itu: SAME dibawa, kode
    dijalankan (`jumlah(1, "2")` → `"12"`), kedua kriteria tidak terpenuhi,
    centang dilepas, tiket ke `in_progress`, baris pembuka
    `Reviewed at level normal, round 1, at commit 7493319: sent back.`, dan
    commit yang hanya memuat berkas tiket. Skenario tangan cadangan tidak
    diperlukan.

- 2026-10-17 05:31:22: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m45s, on content fingerprint 9a2fde87ce113955158f324df47da4b2d55da6b3 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level normal, round 1, at commit e0159cf: passed.
  Pada level normal, `test_command` dihitung sekali (di sini dibawa dari run pengerja), tiap kriteria dibuktikan dengan menjalankan sesuatu atau memeriksa hasil yang nyata, dan uji barunya dibaca untuk melihat apakah ada pernyataan yang tidak mungkin gagal. Satu kriteria (butir 5) tidak bisa saya jalankan ulang; lihat di bawah.
  - Uji: `test-run.sh --check 261016141910 e0159cf` → SAME (run 2026-10-17 05:31:22, sidik 9a2fde87ce113955158f324df47da4b2d55da6b3, exit 0). Tidak dijalankan ulang. Tambahan: `test-run.sh --review 261016141910 -- node --test uji/aturan-peninjau.test.mjs` → 22 lulus, 0 gagal.
  - Butir 1 (paling banyak sekitar 3.000 kata, angka tercatat) — terpenuhi. `wc -w agents/kerjaan-reviewer.md` → 2.989; versi sebelum e0159cf → 6.182. Angka itu sama dengan yang tercatat di Notes.
  - Butir 2 (tabel level hanya di satu tempat) — terpenuhi. Tabel ada di definisi peninjau, "How thorough to be". `review.md`, README dan dokumen cara kerja hanya merujuk dengan satu kalimat; baris `review` di SKILL.md hanya keterangan kolom, bukan tabel. Uji baru memeriksa ini untuk setiap dokumen.
  - Butir 3 (dokumen cara kerja hanya menjelaskan dan merujuk) — terpenuhi. Dibaca utuh: isinya alasan, tiap bagian merujuk nama bagian yang memang ada di definisi peninjau (diuji).
  - Butir 4 (kasus usang dihapus) — terpenuhi. Kasus "merged" (`merge-base --is-ancestor`) hilang dari definisi peninjau, diganti satu kalimat. Lihat catatan pertama di bawah.
  - Butir 5 (tiket uji yang sengaja cacat tetap ditolak) — terpenuhi, dinilai dari hasil yang tersimpan. Saya mencoba menjalankan ulang peninjau baru lewat `claude -p`, tetapi izin untuk menjalankan agen bersarang ditolak di sesi ini. Yang saya periksa: repo uji pengerja di scratchpad memuat commit `43515b7` yang memindah tiket `261017090001` ke `in_progress`, dengan kedua centang dilepas dan baris pembuka `Reviewed at level normal, round 1, at commit 7493319: sent back.`; prompt peninjau yang dipakai (`agents.json`) sama persis, huruf demi huruf, dengan isi `agents/kerjaan-reviewer.md` di e0159cf.
  - Aturan yang dihapus, dibandingkan dengan isi sebelum e0159cf: semua bagian definisi lama masih punya padanan di definisi baru. "Your own checks are not evidence" di `review.md` tercakup oleh langkah 5 pengerja (`agents/kerjaan-worker.md`: uji yang tetap hijau diperbaiki dulu, catatannya hanya klaim) dan aturan peninjau bahwa Notes bukan bukti kecuali baris test-run lewat `--check`. Cara menghitung putaran (termasuk "the larger count holds") kini hanya di `review.md`, "Rounds".
  - Tidak ada CLAUDE.md/AGENTS.md di repo ini.
  - Catatan (tidak memblokir):
    - Kalimat pengganti kasus "merged" menyatakan bahwa cabang yang ditemukan "belum masuk main". Skrip papan sendiri masih menangani cabang tiket yang sudah tergabung (`kerjaan_code_rev` di `lib.sh`; pesan "is merged, but its worktree is still checked out" di `update-ticket.sh`; `merge.sh land` membiarkan cabangnya bila worktree gagal dihapus). Cabang lama seperti itu bisa tersisa, misalnya bila tiket yang sudah done dibuka lagi, dan peninjau yang mengikuti kalimat baru lalu menjalankan `git diff HEAD...<commit>` akan melihat diff kosong.
    - Untuk review setelah merge postponed, definisi lama meminta baris kedua menyebut bahwa level `quick` dipakai karena merge postponed. Kalimat baru lebih umum ("what that level meant here"). Bentuk baris pembukanya tetap memuat `after merge postponed`, jadi tidak ada informasi yang hilang dari catatan.
    - Notes menyebut uji butir 5 lewat `--plugin-dir --agent`; berkas di scratchpad menunjukkan tinjauannya dijalankan dengan prompt dari `agents.json` (`--agents`). Isinya sama dengan definisi yang di-commit, jadi kesimpulannya tidak berubah.

### Suggested follow-up

- **Cabang tiket yang sudah tergabung masih bisa ada, tetapi peninjau kini menganggap setiap cabang belum tergabung.** Bila `merge.sh land` gagal menghapus worktree, cabangnya tetap ada, dan bila tiketnya kemudian dibuka lagi, peninjau akan membandingkan HEAD dengan commit yang sudah ada di HEAD, mendapat diff kosong, dan bisa menyimpulkan "tidak ada yang dikerjakan". Layak dibuat tiket: satu kalimat pengaman di "Find the tree the work is in", misalnya "bila `git log HEAD..<commit>` kosong, pekerjaannya sudah di HEAD; tinjau di tempat".
