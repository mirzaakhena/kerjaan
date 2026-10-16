---
type: feature
priority: high
review:
labels: [sesi-a192c9e8, history]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:46:00
updated: 2026-10-16 15:46:03
related: [261006110801, 261006121502]
blocked_by: []
---

## Background

Setiap kali tiket berpindah status, sebuah baris ditambahkan ke riwayatnya:
kapan tiket itu masuk backlog, todo, in_progress, review, done, atau cancel.
Baris itu menjawab *kapan*, tetapi tidak menjawab *siapa*.

Pemindahan hampir selalu dilakukan oleh sebuah sesi Claude Code: mandor yang
memulai tiket, pengerja yang menyerahkannya ke review, atau peninjau yang
meloloskan atau mengembalikannya. Setiap sesi punya pengenal (session-id),
dan percakapannya bisa dibuka lagi selama transkripnya masih ada. Pengenal itu
tidak tercatat di tiket. Kalau pemilik ingin tahu kenapa sebuah tiket
dikembalikan atau dimulai, ia harus menebak sesi mana yang melakukannya.

## Request

Setiap baris riwayat yang ditulis dari dalam sesi Claude Code ikut mencatat
pengenal sesi itu, sehingga dari tiket mana pun pemilik bisa menelusuri balik
ke percakapan yang memindahkannya.

## Done when
- [x] Perpindahan status dari dalam sesi Claude Code menulis baris riwayat berbentuk `- <waktu> <session-id> <status>`, misalnya `- 2026-10-16 14:16:07 4dbcf082-290a-4f65-845c-ee75fd3b3e9c done`
- [x] Perpindahan dari terminal biasa, di luar sesi Claude Code, tetap menulis baris seperti sekarang tanpa penanda kosong
- [x] Baris riwayat lama tanpa pengenal sesi tetap terbaca benar oleh viewer, hitungan putaran review, dan pemeriksaan antrean
- [x] Viewer menampilkan riwayat yang memuat pengenal sesi dengan rapi
- [x] Panduan skill menjelaskan cara membuka lagi percakapan dari pengenal di riwayat, dan bahwa transkrip lama bisa sudah terhapus
- [x] Ada uji otomatis untuk baris riwayat dengan dan tanpa pengenal sesi

## History
- 2026-10-16 14:46:00 backlog
- 2026-10-16 14:50:07 todo
- 2026-10-16 15:04:28 in_progress
- 2026-10-16 15:44:53 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec review
- 2026-10-16 15:46:03 a192c9e8-0bb5-4bbf-8d56-9831b23e62ec done

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel
  `sesi-a192c9e8` lahir dari penilaian yang sama:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka
  lagi dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama
  transkripnya masih ada.
- Pemilik: "session-id claude juga perlu dicantumkan dalam setiap tiket dalam
  setiap history statusnya. Hal ini digunakan agar bisa melakukan traceback."
- Temuan teknis: perintah Bash di dalam sesi Claude Code menerima variabel
  lingkungan `CLAUDE_CODE_SESSION_ID`. Perlu dipastikan nilainya di dalam
  subagen (pengerja, peninjau): apakah sama dengan sesi mandor atau milik
  subagen itu sendiri. Bila sama, baris riwayat bisa juga mencatat jenis agen
  agar pemindahan oleh pengerja dan oleh peninjau tetap bisa dibedakan.
- Penulis baris riwayat: `update-ticket.sh` (sekitar baris 401-434) dan
  `new-ticket.sh`. Pembaca: `on-ticket-review.sh` (menghitung baris review),
  `viewer/` dan `board.mjs`. Semua pembaca harus mengenali kedua bentuk:
  `- <waktu> <status>` (baris lama atau dari terminal) dan
  `- <waktu> <session-id> <status>`. Status selalu kata terakhir di baris.
- Bentuk baris ditetapkan pemilik: `- 2026-10-16 14:16:07
  4dbcf082-290a-4f65-845c-ee75fd3b3e9c done`.
- 2026-10-16 14:49:58: files estimated to change: `skills/kerjaan/SKILL.md`, `skills/kerjaan/TEMPLATE.md`, `skills/kerjaan/scripts/new-ticket.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `uji/on-ticket-review.test.mjs`, `uji/update-ticket.test.mjs`, `viewer/uji/markdown.test.mjs`, `viewer/web/gaya.css`, `viewer/web/markdown.js`
- Catatan pengerja, 2026-10-16 15:26:
  - Pengenal sesi di subagen, diamati langsung dari lingkungan pengerja ini:
    `CLAUDE_CODE_SESSION_ID=a192c9e8-0bb5-4bbf-8d56-9831b23e62ec`, sama dengan
    sesi mandor, dan `CLAUDE_CODE_CHILD_SESSION=1` hanyalah penanda, bukan
    pengenal. Transkrip yang bisa dibuka `claude --resume` adalah
    `~/.claude/projects/<folder>/a192c9e8-….jsonl` milik sesi utama;
    transkrip subagen (pengerja, peninjau) tersimpan di dalam folder
    `a192c9e8-…/subagents/`, bukan sebagai sesi sendiri. Jadi nilai variabel itu
    langsung dipakai. Jenis agen tidak ikut dicatat karena bentuk baris sudah
    ditetapkan pemilik; pengerja dan peninjau tetap terbedakan lewat status
    yang dituju (pengerja → review, peninjau → done/in_progress).
  - Penulis: fungsi baru `kerjaan_history_line` di `lib.sh`, dipakai
    `update-ticket.sh` (baris diteruskan ke awk lewat ENVIRON) dan
    `new-ticket.sh` (yang kini memuat `lib.sh`). Nilai kosong, atau yang memuat
    selain huruf, angka, dan tanda hubung, tidak ditulis, sehingga status tetap
    kata terakhir dan tidak ada penanda kosong.
  - Pembaca yang diperiksa: `on-ticket-review.sh` (regex kini menerima satu
    kata opsional sebelum `review`); `board.mjs`, `queue.sh`, `merge.sh`,
    `worktree.sh`, `ticket-size.sh`, berkas agen, dan `viewer/app.mjs` tidak
    membaca baris History (`merge.sh` membaca baris `: review covers branch` di
    Notes, bentuk lain). Viewer kini merender History sebagai baris rapi:
    waktu, status berwarna, pengenal sesi di kolom ketiga; pada layar ≤600px
    pengenal turun ke baris sendiri, utuh. Dilihat langsung lewat Chrome
    headless pada lebar 1280/640/600/390/320, terang dan gelap.
  - Panduan: `SKILL.md` (bagian `## History`, dan paragraf baru "Who moved it,
    and why" dengan `claude --resume`, folder asal sesi, dan penghapusan
    transkrip setelah 30 hari / `cleanupPeriodDays`), `references/repairs.md`,
    dan contoh di `README.md`.
  - Uji yang dipecahkan dengan sengaja (salin berkas, ubah, jalankan uji,
    pulihkan dari salinan), semuanya merah:
    - `lib.sh` pengenal tidak ditulis → 4 gagal (update-ticket, new-ticket,
      queue); tanpa penyaringan nilai → 6 gagal; nilai kosong tetap ditulis →
      5 gagal.
    - `update-ticket.sh` tidak memakai baris dari helper → 9 gagal;
      `new-ticket.sh` memakai `$status` mentah → 1 gagal.
    - `on-ticket-review.sh` regex lama → 3 gagal (putaran kedua dari tiga
      bentuk History); regex terlalu longgar `(.* )?review` → 1 gagal.
    - `markdown.js`: bentuk sesi tak dikenali → 6; bentuk lama tak dikenali →
      6; dirender di luar History → 1; daftar tangan tidak dipotong → 1;
      `###` tidak mengakhiri bagian → 1; warna status hilang → 2.
    - `gaya.css`: penumpukan layar sempit dihapus → 2 (uji peramban);
      penanda kosong tampil → 2 (setelah uji diperketat: awalnya hijau, karena
      hanya memeriksa tinggi elemen, bukan jarak antarbaris); baris tidak
      sejajar (`display: contents` dihapus) → 2.
- 2026-10-16 15:44:39: test run — `node --test` exited 0 after 3m32s, on content fingerprint 455c575d897303a8fe480b606a48884df9f0ca3c (the same before and after the run; .kerjaan/ left out).
- Reviewed at level quick, round 1, at commit 36af54e (kerja di b159a8c, langsung di main, tanpa worktree), 2026-10-16: pemeriksaan proyek dihitung sekali dan perubahan dibaca terhadap setiap kriteria. Tidak ada server yang dijalankan.
  - `test-run.sh --check 261016144601 HEAD` → SAME: isi HEAD persis isi yang diuji pada 2026-10-16 15:44:39, sidik jari 455c575d897303a8fe480b606a48884df9f0ca3c, `node --test` keluar 0. Uji tidak dijalankan ulang; hasilnya dibawa dari jalannya pengerja.
  - `explain.sh check` → belum ada penjelasan; `owner_explanation: off`, jadi tidak diperlukan.
  - Repo ini tidak punya `CLAUDE.md` atau `AGENTS.md`; tidak ada aturan proyek tertulis yang diterapkan.
  - Kriteria 1 (bentuk dengan sesi): `kerjaan_history_line` di `lib.sh` menulis `- <waktu> <session-id> <status>` dari `CLAUDE_CODE_SESSION_ID`; dipakai `update-ticket.sh` dan `new-ticket.sh`. Baris History tiket ini sendiri (`... a192c9e8-... review`) adalah contoh hidupnya. Terpenuhi.
  - Kriteria 2 (di luar sesi): nilai kosong atau tidak bersih jatuh ke `- <waktu> <status>`, tanpa penanda kosong; diuji di `uji/update-ticket.test.mjs` dan `uji/new-ticket.test.mjs`. Terpenuhi.
  - Kriteria 3 (baris lama tetap terbaca): regex `on-ticket-review.sh` menerima satu kata opsional sebelum `review`; `markdown.js` menerima kedua bentuk. Pencarian `History` di `scripts/`, `viewer/`, `hooks/`, `agents/` tidak menemukan pembaca lain. Terpenuhi.
  - Kriteria 4 (viewer rapi): `markdown.js` merender History sebagai `ul.riwayat` dengan kolom waktu, status, sesi; `gaya.css` menumpuk sesi di layar ≤600px. Dinilai dengan membaca diff dan dari uji peramban di `viewer/uji/riwayat.test.mjs` yang ikut lulus; tampilannya tidak dilihat sendiri.
  - Kriteria 5 (panduan): `SKILL.md` paragraf "Who moved it, and why" menjelaskan `claude --resume`, folder asal sesi, dan penghapusan transkrip setelah 30 hari / `cleanupPeriodDays`. Terpenuhi.
  - Kriteria 6 (uji otomatis): ada uji dengan dan tanpa pengenal di `uji/update-ticket`, `new-ticket`, `on-ticket-review`, `queue`, dan `viewer/uji/markdown`, `riwayat`. Isi uji tidak dibaca baris per baris (level quick).
  - Catatan, tidak menghalangi: `references/repairs.md` kini menyebut bentuk dengan sesi untuk perbaikan tangan; baris yang sudah ada di sana tetap memuat `- <time> <status>` sebagai bentuk dasar, sesuai.
