---
type: task
priority: medium
review: normal
labels: [sesi-8e6130e0]
reporter: mirza
assign_to: claude
created: 2026-10-17 18:44:41
updated: 2026-10-17 22:11:51
related: [261017175101, 261017184402]
blocked_by: [261017175101]
---

## Background
kerjaan dipakai di proyek berbahasa apa pun, tetapi sebagian skrip, definisi agen, panduan, dan uji skill masih berbahasa Indonesia: pesan, komentar, nama folder uji (uji/), nama uji, dan contoh kalimat di deskripsi skill. Ada juga dokumen penjelasan peninjau yang seluruhnya berbahasa Indonesia. Isi papan sebuah proyek (tiket, pesan commit, settings.md) tidak termasuk: itu mengikuti setelan language papan masing-masing, termasuk papan repo ini yang tetap berbahasa Indonesia.

## Request
Skrip papan, definisi agen, panduan, README, dan uji skill sepenuhnya berbahasa Inggris, termasuk nama berkas dan folder, nama variabel, nama uji, dan komentar. Kalimat contoh Indonesia di deskripsi skill dan kalimat Indonesia di uji pemicu dihapus, lalu uji pemicu diulang untuk membuktikan skill tidak lebih jarang terpanggil. Dokumen penjelasan peninjau (docs/cara-kerja-reviewer.md) dihapus.

## Done when
- [x] Pesan yang dicetak skrip papan dan teks definisi agen, panduan, dan README tidak memuat bahasa Indonesia, kecuali contoh yang sengaja menunjukkan papan berbahasa lain
- [x] Deskripsi skill tidak lagi memuat kalimat contoh berbahasa Indonesia, dan uji pemicu hanya memakai kalimat berbahasa Inggris
- [x] Uji pemicu yang diulang dengan deskripsi baru menunjukkan skill terpanggil sama seringnya atau lebih sering, dan diam sama seringnya, dibanding deskripsi sebelumnya pada kalimat yang sama
- [x] Dokumen penjelasan peninjau sudah tidak ada, dan tidak ada panduan atau README yang masih merujuknya
- [x] Nama berkas, folder, variabel, uji, dan komentar di skrip dan uji skill berbahasa Inggris, dan semua uji tetap lulus setelah penggantian nama
- [x] Papan yang sudah ada (tiket, order.md, settings.md berbahasa Indonesia) tetap bisa dipindah, diperiksa, dan diubah oleh skrip seperti sebelumnya

## History
- 2026-10-17 18:44:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 18:45:42 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 21:14:07 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 22:11:51 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review

## Notes
- 2026-10-17: dipecah dari 261017175101 atas jawaban pemilik (sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02). Keputusan pemilik di tiket asal: #2 "Hapus, lalu ukur" (kalimat contoh Indonesia di deskripsi dan uji pemicu dihapus, lalu uji pemicu diulang); #3 "Hapus" (docs/cara-kerja-reviewer.md dihapus). Isi papan repo ini tetap berbahasa Indonesia.
- 2026-10-17 18:45:34: files estimated to change: `README.md`, `agents/`, `docs/cara-kerja-reviewer.md`, `skills/kerjaan/`, `uji/`
- 2026-10-17: pengerja, ringkasan pekerjaan (cabang tiket-261017184401; commit pertama bde3888 hanya penggantian nama agar `git log --follow` menyambung, lalu commit isi):
  - Nama: `uji/` → `tests/` (bukan `test/`, lihat 261017175101); aturan-peninjau → reviewer-rules, batas-waktu → time-limits, commit-papan → board-commits, jalan-pintas → shortcuts, kunci-papan → board-lock, pemicu → trigger, pustaka-bersama → shared-library, skill-ringkas → skill-size; `pemicu/` → `trigger/` (jalankan.mjs → run.mjs, kalimat.json → prompts.json, hasil-lama/hasil-baru → results-before/results-after). deskripsi-lama.txt dan hasil-calon-1.json dihapus (ukuran 261011073101 yang sudah digantikan). Nama uji, komentar, variabel, dan data uji di semua berkas uji berbahasa Inggris; papan uji memakai `language: English`.
  - Skrip: cabang bawaan `worktree.sh add` kini `ticket-<id>` (dulu `tiket-<id>`). Cabang lama tetap ditemukan karena skrip mencocokkan ID, bukan awalan (cabang tiket ini sendiri masih `tiket-261017184401`). Pesan skrip lain sudah berbahasa Inggris; hanya komentar lib.sh/update-ticket.sh yang diganti.
  - Panduan dan agen: "langsung saja" → "just do it", "langsung done saja" → "just mark it done", contoh "Ini cuma mock" dkk. → bahasa Inggris, contoh order.md di ordering-the-queue.md, contoh `queue.sh ask`/`estimate` di planner, "tampilkan papannya" → "show me the board", dan contoh `Ditinjau pada level` di reviewer dihapus. README menunjuk `tests/`. Kata aturan 17959 → 17957 (anggaran 18000).
  - docs/cara-kerja-reviewer.md dihapus; uji yang membacanya (2 uji penjelas + 2 putaran loop) diganti satu uji "there is no docs/ folder, and no document points into one", yang memeriksa setiap dokumen aturan dan README.
- Keputusan: deskripsi baru tanpa kalimat Indonesia mula-mula terpanggil 69/72 (sebelumnya 70/72) karena satu jalan "what's waiting in review?" tidak memanggil skill; ditambahkan contoh Inggris "what is in review" ke deskripsi (121 kata, sebelumnya 131), lalu deskripsi itu diukur ulang. Hasil yang tersimpan adalah ukuran ulang itu.
- Uji pemicu (40 kalimat Inggris, 3 ulangan, claude 2.1.302, claude-opus-5-5[1m]; 18 kalimat Indonesia diganti kalimat Inggris berkelompok sama, papan coba berbahasa Inggris): deskripsi sebelumnya 70/72 jalan terpanggil, 23/24 kalimat lolos, 0/48 jalan terpanggil di kalimat yang tidak boleh; deskripsi baru 71/72, 24/24, 0/48. Angka lama 261011073101 pada 40 kalimat dwibahasa: deskripsi asal 71/72, 0/48; deskripsi yang kini disebut "sebelumnya" 72/72, 0/48.
- Jumlah uji per berkas (sebelum → sesudah, dihitung per berkas tanpa --test-force-exit untuk on-ticket-review): sama di 18 berkas (bash-description 3, board-commits 5, board-lock 15, merge 28, new-ticket 10, on-ticket-review 95, queue 67, release 14, repair 15, shared-library 42, shortcuts 5, skill-size 68, test-run 10, ticket-size 25, time-limits 3, trigger 19, update-ticket 58, worktree 24); reviewer-rules 22 → 19 karena dokumen yang diuji dihapus (−1 putaran tabel, −1 putaran "points at", −2 uji penjelas, +1 uji docs/). Viewer 143 tidak berubah. Total 671 → 668.
- Pengecualian yang sengaja tetap berbahasa Indonesia (untuk daftar 261017184402): tests/real-order/old.md (order.md asli papan lain); tests/queue.test.mjs `**Tujuan.**` dan tiga kalimat bebas Indonesia di uji "no longer read, in any language"; tests/on-ticket-review.test.mjs catatan tinjauan papan berbahasa Indonesia (`Ditinjau pada level ...`, "Uji proyek dijalankan sekali ...", "Kriteria 2/3 gagal") di uji yang memang tentang papan Indonesia; tests/trigger/previous-description.txt dan kolom description di results-before.json (deskripsi yang diukur, dengan empat kalimat Indonesianya); viewer/tests/server.test.mjs daftar alamat lama.
- Penjaga yang sengaja dirusak (di salinan pohon kerja, dipulihkan dari salinan): folder docs/ dibuat lagi, README menunjuk `docs/reviewer.md`, reviewer menunjuk `docs/cara-kerja-reviewer.md` → masing-masing "there is no docs/ folder, and no document points into one" merah; kalimat "catat ini dulu" dikembalikan ke deskripsi → "the current description's results were run on this prompt set and this description" merah; "just do it" dihapus dari SKILL.md dan foreman.md → uji shortcuts merah; cabang bawaan dikembalikan ke `tiket-$id` → 11 uji worktree/merge/board-commits merah; tests/real-order dipindah → uji viewer order.test.mjs merah.
- Papan berbahasa Indonesia yang ada: salinan papan repo ini (.kerjaan/ main tree) dijalankan dengan skrip lama (main) dan skrip baru: queue.sh check, check <id>, ticket-size.sh, update-ticket.sh ke in_progress dan kembali ke todo, ask/answer/estimate berbahasa Indonesia, --title, new-ticket.sh, repair.sh, release.sh. Keluaran sama persis dan isi papan sesudahnya sama (hash berkas sama).
- Temuan, bukan bagian tiket ini: dengan `--test-force-exit` (test_command papan ini), satu berkas uji bisa berhenti sebelum semua ujinya berjalan: on-ticket-review.test.mjs tercatat 70, 88, dan 95 uji pada run berbeda, queue.test.mjs 63 dan 67; tanpa opsi itu selalu 95 dan 67. Uji yang tidak berjalan tidak dilaporkan gagal.
- 2026-10-17 22:08:44: open question: Tidak menahan tiket ini: dengan --test-force-exit di test_command, sebuah berkas uji kadang berhenti sebelum semua ujinya berjalan tanpa dilaporkan gagal (on-ticket-review.test.mjs 70/88/95 uji pada run berbeda). Pilihan: (a) dibuat tiket baru untuk mencari penyebabnya dan membuat run gagal bila uji hilang; (b) dibiarkan. Saran: (a), karena run hijau saat ini bisa tidak menjalankan sebagian uji.
- 2026-10-17 22:11:44: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m39s, on content fingerprint 8b35b4e4bc671335b0d38cffc1bd0f5f8d2e9e60 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 22:11:51: review covers branch tiket-261017184401 at 751f8a91b02b185c0ac2640cdc794e9da6a41d8e, which holds main at 83a8e2ac5232d7bf9a7c61057bd5eaf70c2753bf (code outside .kerjaan/); the latest test run passed on exactly this content.
