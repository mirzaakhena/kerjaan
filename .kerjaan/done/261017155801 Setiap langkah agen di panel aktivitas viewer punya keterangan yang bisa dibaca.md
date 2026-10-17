---
type: bug
priority: medium
review: normal
labels: [sesi-8e6130e0, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 15:58:20
updated: 2026-10-17 19:09:37
related: [261016084202]
blocked_by: []
---

## Background
Laci tiket di viewer punya panel "langkah terakhir worker" yang menunjukkan apa yang sedang dikerjakan agen. Hampir semua baris di panel itu hanya bertuliskan "Bash —": waktu dan nama alat ada, tetapi tidak ada keterangan apa pun. Di satu worker proyek nukitu-mockup, dari 47 perintah yang dijalankan tidak satu pun punya keterangan. Panel itu jadi tidak berguna justru untuk langkah yang paling sering.

Penyebabnya dua. Agen kerjaan (pengerja, peninjau, penyusun antrean) tidak diminta menulis keterangan singkat saat menjalankan perintah, padahal Claude Code menyediakan tempatnya. Viewer sengaja tidak pernah menampilkan isi perintah, karena perintah bisa memuat rahasia, jadi tanpa keterangan yang tersisa hanya tanda pisah.

## How to reproduce
1. Jalankan satu tiket lewat rantai mandor di proyek mana pun
2. Buka papan di viewer dan buka laci tiket yang sedang dikerjakan
3. Lihat daftar langkah terakhir worker

Baris Bash tampil tanpa keterangan, hanya "—".

## Request
Setiap langkah di panel aktivitas punya keterangan yang bisa dibaca. Agen kerjaan menulis keterangan singkat dalam bahasa papan setiap kali menjalankan perintah. Bila keterangan tetap tidak ada, viewer menampilkan nama program yang dijalankan saja (misalnya "cat" atau "node --test"), tanpa argumen apa pun, sehingga isi perintah tetap tidak pernah terlihat.

## Done when
- [ ] Langkah di reproduksi di atas menampilkan keterangan singkat dalam bahasa papan pada hampir setiap baris Bash, bukan "—" — menunggu mirza: skenario tangan di Notes
- [x] Panduan pengerja, peninjau, dan penyusun antrean masing-masing meminta keterangan itu dalam satu kalimat, tanpa menambah aturan lain
- [x] Langkah Bash tanpa keterangan menampilkan nama program saja, dan tidak pernah argumen, nama berkas, isi variabel, atau teks lain dari perintahnya
- [x] Perintah yang memuat rahasia (misalnya token di argumen atau variabel lingkungan di depan perintah) tetap tidak memperlihatkan rahasia itu di panel

## History
- 2026-10-17 15:58:20 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 16:01:22 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo
- 2026-10-17 17:47:40 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 18:04:50 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review
- 2026-10-17 18:45:41 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 18:55:47 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review
- 2026-10-17 19:05:55 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 done
- 2026-10-17 19:06:13 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 in_progress
- 2026-10-17 19:09:07 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 review
- 2026-10-17 19:09:37 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 done

## Notes
- 2026-10-17: lahir dari pertanyaan pemilik di sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`) sambil melihat tangkapan layar panel aktivitas nukitu-mockup. Pemilik setuju kedua lapis: aturan keterangan di definisi agen, dan cadangan nama program di viewer (melonggarkan aturan "tidak ada isi perintah" sebatas nama program). Pemilik khawatir soal tambahan context: tambahannya sekitar 5-10 token per perintah dan satu kalimat per definisi agen; cadangan di viewer tidak menambah context agen sama sekali. Pemilik minta tiket ini langsung masuk todo.
- 2026-10-17 15:59:14: files estimated to change: `agents/kerjaan-planner.md`, `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `viewer/agen.mjs`, `viewer/uji/agen.test.mjs`
- 2026-10-17 15:59:14: answered question: Butir Done when 1 (keterangan muncul di hampir setiap baris Bash pada reproduksi) baru bisa dicek setelah definisi agen yang baru ikut rilis dan dipakai satu rantai nyata; agen yang sedang dipakai mandor datang dari plugin terpasang 1.15.0. Pilihan: (a) ditunda: peninjau memeriksa kalimat di ketiga definisi agen dan cadangan nama program di viewer, pemilik melihat panelnya pada rantai pertama setelah rilis, dan rantai jalan terus; (b) menahan rantai sampai pemilik melihatnya. Saran: (a), karena tidak ada tiket lain yang bergantung pada butir ini dan pengecekannya memang hanya mungkin setelah rilis.
  answer, 2026-10-17 16:01:21: Pemilik: "Ditunda". (a) ditunda: peninjau memeriksa kalimat di ketiga definisi agen dan cadangan nama program di viewer, pemilik melihat panelnya pada rantai pertama setelah rilis, dan rantai jalan terus.
- 2026-10-17: hasil pengerjaan (worker).
  - Viewer: `stepLabel` di `viewer/agen.mjs` tetap satu-satunya tempat keterangan dibuat. Langkah Bash tanpa `description` kini memakai `programName`: perintah dipecah seperti shell (kutip, `\`, `$(...)`, backtick, `;` `&&` `||` `|` baris baru, komentar), penetapan variabel di depan dilewati, `cd <folder>` di depan dilewati (bila hanya `cd`, tampil "cd"), dari nama program hanya bagian setelah `/` terakhir, dan nama yang bukan kata polos (variabel, substitusi, frasa berkutip) tidak menampilkan apa pun. Komentar kepala modul diganti ke aturan baru.
  - Keputusan: contoh "node --test" di Request dibaca sebagai "node". Butir Done when 3 melarang argumen, dan `--test` adalah argumen.
  - Keputusan: program yang dipanggil lewat path tampil dengan nama berkasnya saja (`"$K/test-run.sh" ...` menjadi "test-run.sh"). Berkas itu memang nama programnya, dan foldernya dibuang.
  - Definisi agen: satu kalimat yang sama di worker (langkah 3), reviewer (setelah blok `$K`), dan planner (setelah pembuka). Supaya batas kata tetap terpenuhi setelah 261017113001 masuk, kalimat lain di file yang sama dipadatkan tanpa mengubah aturan. Kalimat definisi ronde di reviewer ("a round ends with one rejection by the reviewer") tetap utuh karena diuji kata per kata. Kalimat worker "Your code is already committed on your branch, in the worktree" juga tetap utuh karena diuji. Totalnya +20 kata terhadap main. Pada percobaan penggabungan dengan cabang 261017113001 di klon sementara, penggabungan berjalan tanpa konflik, totalnya sekitar 17995 dari 18000, reviewer 2994 dari 3000, dan uji batas kata lulus.
  - Uji baru: `viewer/uji/agen.test.mjs` (satu kasus per bentuk perintah, masing-masing dengan rahasia yang tidak boleh bocor, dan satu uji lewat catatan agen sungguhan) serta `uji/bash-description.test.mjs` (kalimat ada tepat sekali di tiap definisi).
  - Diukur pada catatan Claude Code nyata di mesin ini: dari 3060 langkah Bash tanpa keterangan, 3046 mendapat nama program (sed, grep, python3, cat, git, ...) dan 14 kosong (program berupa variabel atau substitusi).
  - Sabotase, satu per penjaga; berkas disalin lalu dipulihkan dari salinan:
    - Cadangan Bash dihapus: uji 6, 7, dan 8 merah.
    - Cadangan diganti seluruh perintah: uji 6, 7, dan 8 merah.
    - Penetapan variabel tidak dilewati: uji 7 dan 8 merah.
    - Pemeriksaan nama polos dihapus: uji 7 merah.
    - Nama folder tidak dibuang: uji 7 merah.
    - Substitusi tidak dikenali: uji 7 merah.
    - `cd` tidak dilewati: uji 7 merah.
    - Komentar tidak dilewati: uji 7 merah.
    - Pemisah perintah tidak dikenali: uji 7 merah.
    - Kutip tunggal, kutip ganda, dan backslash masing-masing dimatikan: uji 7 merah. Kutip tunggal awalnya tetap hijau, lalu kasus `A='RAHASIA b' node` dan `A=RAHASIA\ b node` ditambahkan.
    - Kalimat dirusak di worker, reviewer, dan planner masing-masing: uji yang sesuai di `uji/bash-description.test.mjs` merah.
  - Skenario tangan untuk Done when 1:
    1. Pasang rilis kerjaan berikutnya, yang memuat definisi agen dari tiket ini.
    2. Jalankan satu tiket lewat rantai mandor di proyek mana pun.
    3. Buka papan di viewer, lalu buka laci tiket yang sedang dikerjakan.
    4. Lihat daftar langkah terakhir worker. Hampir setiap baris Bash berisi keterangan singkat dalam bahasa papan. Baris tanpa keterangan hanya menampilkan nama program, misalnya "git", dan tidak pernah tanda "—" bila programnya terbaca.
- 2026-10-17 17:56:23: test run — `node --test --test-timeout=900000 --test-force-exit` exited 1 after 2m33s, on content fingerprint 1899f7f9ae09864a43683c8a06d924302ee36914 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 18:01:53: test run — `node --test --test-timeout=900000 --test-force-exit` exited 1 after 2m47s, on content fingerprint ee6fd6eb849cd40ec68ea0e2295031a0197b6094 (the same before and after the run; .kerjaan/ left out). Waited 0m47s for the test lock first, held by another run (ticket 261017113001, slot 1, /Users/mirza/Workspace/kerjaan-order-tata-bahasa).
- 2026-10-17 18:04:46: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m31s, on content fingerprint 895645f3c8f344ed59467c3281287faab29040f9 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 18:04:50: review covers branch tiket-261017155801 at a94071275d8bb14b3bd9f2555c38fb93aa7b05ab, which holds main at 7eb507886afb995280765e76fbc9f4bda79a98aa (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-17: Reviewed at level normal, round 1, at commit a94071275d8bb14b3bd9f2555c38fb93aa7b05ab: sent back.
  Level normal di sini berarti: uji lengkap tidak dijalankan ulang karena `test-run.sh --check 261017155801 a940712` menjawab SAME (jalan 2026-10-17 18:04:46, exit 0, sidik 895645f3c8f344ed59467c3281287faab29040f9); setiap butir dibuktikan dengan menjalankan sesuatu, yaitu `stepLabel` dari worktree `/Users/mirza/Workspace/kerjaan-keterangan-langkah` dipanggil langsung dengan bentuk perintah di luar daftar uji; uji dibaca untuk asersi yang tidak bisa gagal. Tidak ada ekspor bersih karena pohon kerja tidak bergerak. Proyek ini tidak punya CLAUDE.md atau AGENTS.md.
  - Butir 1 (keterangan di hampir setiap baris pada reproduksi): menunggu mirza. Keputusan pemilik bertanggal 2026-10-17 16:01:21 ada di Notes, skenario tangan ada dan berakhir pada apa yang harus terlihat, dan butir ini memang baru bisa dilihat setelah rilis. Bukan penghalang.
  - Butir 2 (satu kalimat di tiap panduan): terpenuhi. Kalimat yang sama ada tepat sekali di `agents/kerjaan-worker.md`, `agents/kerjaan-reviewer.md` dan `agents/kerjaan-planner.md` (`grep -c` memberi 1 di tiap berkas; dijaga `uji/bash-description.test.mjs`). Kalimat lain yang dipadatkan hanya diringkas; tidak ada aturan baru dan tidak ada aturan yang hilang.
  - Butir 3 (nama program saja, tidak pernah argumen, nama berkas, isi variabel atau teks lain): TIDAK terpenuhi. Contoh hasil `stepLabel('Bash', { command }, '/p').label`:
    - `TOKENS=(RAHASIA other)` menjadi "RAHASIA"
    - `2>/tmp/RAHASIA.log cat x` menjadi "RAHASIA.log"
    - `</tmp/RAHASIA.txt wc -l` menjadi "RAHASIA.txt"
    - `>/tmp/RAHASIA cat` menjadi "RAHASIA"
    - `cd /x &>/tmp/RAHASIA.log && ls` menjadi "RAHASIA.log"
    - `cd /x >&/tmp/RAHASIA && ls` menjadi "RAHASIA"
    - `cd RAHASIA 2>&1; ls` menjadi "1"
  - Butir 4 (rahasia di argumen atau variabel di depan perintah tidak terlihat): TIDAK terpenuhi, karena isi penetapan variabel bisa bocor. `TOKENS=(RAHASIA other)` menampilkan "RAHASIA", dan `A=(RAHASIA b) node` juga menampilkan "RAHASIA". Bash menjalankan bentuk kedua (`bash -c 'A=(x y) echo hi'` mencetak "hi").
  Yang tersisa, dikelompokkan menurut jenis kesalahan:
  - **Penetapan array dipecah di `(`.** `shellTokens` memperlakukan `(` di dalam kata `A=(` sebagai operator subshell, sehingga isi array terbaca sebagai program. Instance: `X=(…)` sendirian, `X=(…)` di depan program, dan `X+=(…)`. Uji daftar bentuk perintah tidak punya kasus penetapan array.
  - **Pengalihan (redirection) dibaca sebagai program.** Kata yang diawali `>`, `<`, `2>`, `&>` atau `>&` dianggap kata biasa. Setelah foldernya dibuang, nama berkas tujuannya lolos `PROGRAM`. Selain itu, `&` di dalam `&>`, `>&` dan `2>&1` dipotong sebagai operator, sehingga kata sesudahnya dianggap awal perintah baru. Ini terutama terjadi setelah `cd` yang dilewati. Instance: pengalihan sebelum program (`2>f cmd`, `<f cmd`, `>f cmd`) dan pengalihan pada `cd` di depan (`cd x &>f && …`, `cd x >&f`, `cd x 2>&1; …`). Uji daftar bentuk perintah tidak punya kasus pengalihan sebelum program.
  Catatan (tidak menghalangi):
  - Uji di `viewer/uji/agen.test.mjs` tidak hampa. Setiap kasus memeriksa label persis dan juga ketiadaan RAHASIA. Cabang `if (want !== null)` selalu berjalan karena tidak ada kasus dengan `want` null, jadi cabang itu tidak berguna.
  - Kata kunci shell muncul sebagai "program", misalnya `if`, `for`, `case`, `time`, `sudo`, `env` dan `export`. Tidak ada yang bocor, tetapi kata itu kurang memberi tahu.
  - Kata pertama yang lolos `PROGRAM` selalu tampil, sampai 40 karakter. Token yang ditempel sebagai kata pertama, misalnya karena salah tempel, akan terlihat. Ini sesuai dengan aturan "nama program", tetapi patut diketahui.
- 2026-10-17: perbaikan ronde 1 (worker). Yang diperbaiki adalah jenis kesalahannya, yaitu kata di posisi program yang sebenarnya bukan program. Setiap kasus yang disebut peninjau kini menjadi kasus uji, dan bentuk sejenis juga ditambahkan.
  - Penetapan array dibaca utuh. `(` di dalam kata (`A=(…)`, `X+=(…)`, `f()`) diambil sampai pasangannya. `a[i]=…` dan `X+=…` juga dikenali sebagai penetapan.
  - Pengalihan beserta targetnya tidak pernah dibaca sebagai program. Ini mencakup `<` `>` `>>` `&>` `&>>` `>|` `<>` `<<<`, nomor deskriptor atau `{fd}` di depannya, bentuk duplikasi `>&f` `2>&1` `>&-`, dan `<(…)`. Isi heredoc (`<<` dan `<<-`) dilewati sampai baris penutupnya.
  - Bila ragu, tidak ada yang ditampilkan: aritmetika `((…))`, `[[ … ]]`, definisi fungsi, serta kutip atau substitusi yang tidak tertutup sebelum nama program. Kutip `$'…'` dibaca dengan benar.
  - Cabang `want !== null` yang mati di uji bentuk perintah dihapus.
  - Diukur ulang pada catatan nyata: perintah yang dulu menampilkan isi array (nama berkas) kini menampilkan program sesudahnya. Definisi fungsi kini tidak menampilkan apa pun.
  - Sabotase ronde 1, satu per penjaga; berkas dipulihkan dari salinan:
    - Uji 7 merah untuk setiap penjaga berikut: `(` di dalam kata, aritmetika `((`, bentuk penetapan `[i]` dan `+=`, cabang pengalihan, pengenalan `&>`, nomor deskriptor, target yang dilewati, isi heredoc, tab pada `<<-`, tanda `broken`, kutip `$'…'`, `$(` di dalam kutip ganda, `>|`, `&` dalam `>&`, dan `<(…)`.
    - Penjaga lama diuji ulang (cadangan Bash, nama polos, nama folder, `cd`, komentar, kutip, backslash, pemisah) dan semuanya merah.
    - Awalnya `&>`, `>|`, `&` dalam `>&`, dan tanda `broken` tetap hijau. Kasus `cd /x &>/dev/null RAHASIA`, `cd /x 2>&1 RAHASIA`, `cd /x >|RAHASIA.log RAHASIA`, dan `cd /x; A="RAHASIA node` lalu ditambahkan.
    - Satu sabotase sempat membuat perulangan tanpa akhir. Perulangan operator pengalihan kini selalu maju satu karakter.
- 2026-10-17 18:55:42: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m55s, on content fingerprint 8182f71fe4f418495292d4ed94175bafa36d89c8 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17 18:55:47: review covers branch tiket-261017155801 at a2dd467538a4f2a101db8aaa463b207a411f885b, which holds main at f42a48109c0b0a7f4f088bff4987934bd07aa9ee (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-17: Reviewed at level normal, round 2, at commit a2dd467538a4f2a101db8aaa463b207a411f885b: passed.
  Level normal di sini berarti: uji lengkap tidak dijalankan ulang karena `test-run.sh --check 261017155801 a2dd467` menjawab SAME (jalan 2026-10-17 18:55:42, exit 0, sidik 8182f71fe4f418495292d4ed94175bafa36d89c8). Hasil itu juga menunjukkan perbaikan tidak merusak bagian yang sudah lolos. Butir 3 dan 4 dibuktikan ulang dengan cara yang sama seperti saat gagal: `stepLabel` dari worktree dipanggil langsung. Sejak a940712, kode yang berubah hanya `viewer/agen.mjs` dan `viewer/uji/agen.test.mjs`, ditambah penggabungan main yang hanya menyentuh berkas papan. Definisi agen dan `uji/` tidak berubah.
  - Butir 1: tetap menunggu mirza. Keputusan pemilik bertanggal 2026-10-17 16:01:21 dan skenario tangan ada di Notes.
  - Butir 2: dibawa dari tinjauan ronde 1 tanggal 2026-10-17. Kodenya tidak berubah sejak a940712 (`git diff --stat a940712 a2dd467 -- agents uji` kosong).
  - Butir 3: terpenuhi. Setiap perintah yang gagal di ronde 1 kini memberi nama program atau kosong:
    - `TOKENS=(RAHASIA other)` memberi ""
    - `2>/tmp/RAHASIA.log cat x` memberi "cat"
    - `</tmp/RAHASIA.txt wc -l` memberi "wc"
    - `>/tmp/RAHASIA cat` memberi "cat"
    - `cd /x &>/tmp/RAHASIA.log && ls` memberi "ls"
    - `cd /x >&/tmp/RAHASIA && ls` memberi "ls"
    - `cd RAHASIA 2>&1; ls` memberi "ls"
    Bentuk sejenis di luar daftar uji juga diperiksa: array yang memuat baris baru, pengalihan setelah penetapan variabel, heredoc dengan pembatas berkutip, heredoc sebelum program, `>& f cmd`, `1>&2 cat`, backtick bersarang, `$((…))` dan `A[$(…)]=1 ls`. Semuanya memberi nama program atau kosong, tidak pernah RAHASIA.
  - Butir 4: terpenuhi. `A=(RAHASIA b) node` dan `X+=(RAHASIA "RAHASIA b") node` memberi "node". `A=$'RAHASIA b' node` dan `env TOKEN=RAHASIA node` juga tidak memperlihatkan nilainya.
  - Pemeriksaan uji: kasus baru di `viewer/uji/agen.test.mjs` memeriksa label persis dan ketiadaan RAHASIA. Cabang `if (want !== null)` dari ronde 1 sudah dihapus, jadi setiap kasus kini diperiksa label persisnya.
  Catatan (tidak menghalangi):
  - Kata kunci shell dan pembungkus tetap tampil sebagai program, misalnya `env`, `sudo`, `time`, `if` dan `for`. Tidak ada yang bocor, tetapi label itu kurang memberi tahu.
  - Main sudah bergerak setelah 261017113001 mendarat, dan tiket itu juga mengubah `agents/kerjaan-planner.md`. Penggabungan ke main perlu disinkronkan saat mendarat. Ini urusan penggabungan, bukan temuan tinjauan ini.
- 2026-10-17 19:06:13: merge postponed — main changed since tiket-261017155801 last took it in (README.md agents/kerjaan-planner.md agents/kerjaan-reviewer.md skills/kerjaan/SKILL.md skills/kerjaan/references/foreman.md skills/kerjaan/references/ordering-the-queue.md skills/kerjaan/scripts/board.mjs skills/kerjaan/scripts/queue.sh skills/kerjaan/scripts/repair.sh skills/kerjaan/scripts/update-ticket.sh uji/commit-papan.test.mjs uji/kunci-papan.test.mjs uji/queue.test.mjs uji/real-order/old.md uji/real-order/rewritten.md uji/repair.test.mjs uji/update-ticket.test.mjs viewer/uji/urutan.test.mjs); back to in_progress to be brought up to date with main, tested and reviewed again.
- 2026-10-17 19:09:01: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m19s, on content fingerprint 875b8583fcb4aa1a3bfd40ebede90c4923d78bd2 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: setelah merge postponed (worker): main dengan 261017113001 digabung lewat `merge.sh sync` tanpa konflik dan tanpa perubahan tambahan. Kalimat keterangan Bash ada tepat sekali di ketiga definisi agen. Uji batas kata lulus pada keadaan gabungan (reviewer 2994 kata).
- 2026-10-17 19:09:07: review covers branch tiket-261017155801 at bfeefd06bd3d4fd572fbc61d6b8f1623e1635f1d, which holds main at cf92d5316e01202626b3b0abd85dec4cb4553551 (code outside .kerjaan/); the latest test run passed on exactly this content.
- 2026-10-17: Reviewed at level quick, after merge postponed, at commit bfeefd06bd3d4fd572fbc61d6b8f1623e1635f1d: passed.
  Hanya hasil penggabungan main yang diperiksa. `merge.sh resolution 261017155801` menjawab EMPTY: cabang ini persis hasil penggabungan otomatis main cf92d53, termasuk 261017113001, dan pengerja tidak mengubah kode apa pun. `test-run.sh --check 261017155801 bfeefd0` menjawab SAME (jalan 2026-10-17 19:09:01, exit 0, sidik 875b8583fcb4aa1a3bfd40ebede90c4923d78bd2), jadi uji tidak dijalankan ulang. Kalimat keterangan Bash ada tepat sekali di `agents/kerjaan-worker.md`, `agents/kerjaan-reviewer.md` dan `agents/kerjaan-planner.md` pada bfeefd0 (dihitung setelah spasi dirapatkan). Definisi peninjau berisi 2994 kata menurut `wc -w`. Semua butir lain dibawa dari tinjauan ronde 2 pada a2dd467.
