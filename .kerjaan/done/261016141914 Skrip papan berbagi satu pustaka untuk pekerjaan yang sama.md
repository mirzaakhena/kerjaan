---
type: task
priority: low
review: normal
labels: [sesi-a192c9e8, scripts]
reporter: mirza
assign_to: claude
created: 2026-10-16 14:19:07
updated: 2026-10-17 06:09:40
related: [261016141915]
blocked_by: [261016141901, 261016141902]
---

## Background

Skrip-skrip papan punya pustaka bersama, tetapi banyak pekerjaan yang sama
masih ditulis ulang di tiap skrip:

- menolak dijalankan dari worktree: lima salinan;
- mencari tiket berdasarkan ID: lima salinan, salah satunya diam-diam
  mengambil kecocokan pertama bila ada ID kembar;
- menambah catatan ke Notes: tiga salinan;
- membaca pengaturan.

Ada juga dua desain kunci yang berbeda, dan penanganan blok kode tidak
konsisten (sebagian mengenali dua jenis pagar, sebagian hanya satu).

Pemeriksaan "ukuran diterima pemilik" juga terlalu longgar: baris apa pun yang
memuat kalimat itu, termasuk kalimat yang menyangkalnya, mematikan peringatan
ukuran. Perbaikan ID kembar masih dilakukan dengan tangan, padahal itu
prosedur yang paling rawan salah.

## Request

Setiap pekerjaan yang sama dikerjakan oleh satu fungsi di pustaka bersama,
dan pemeriksaan-pemeriksaan yang terlalu longgar menjadi tepat.

## Done when
- [x] Penolakan dari worktree, pencarian tiket, penambahan catatan dan pembacaan pengaturan masing-masing hanya punya satu penerapan
- [x] Hanya ada satu desain kunci
- [x] Kedua jenis pagar blok kode diperlakukan sama oleh semua skrip
- [x] Peringatan ukuran hanya dimatikan oleh kalimat persis yang ditulis pilihan terima-ukuran
- [x] Dua tiket dengan ID kembar bisa diperbaiki dengan satu perintah skrip
- [x] Semua uji lulus

## History
- 2026-10-16 14:19:07 backlog
- 2026-10-16 14:46:24 todo
- 2026-10-17 05:35:25 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 06:07:24 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review
- 2026-10-17 06:09:40 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 done

## Notes
- Berasal dari penilaian independen atas skill kerjaan di sesi Claude Code
  `a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` (2026-10-16). Semua tiket berlabel `sesi-a192c9e8` lahir dari
  penilaian yang sama dan dimaksudkan dikerjakan sebagai satu batch todo:
  `grep -l 'sesi-a192c9e8' .kerjaan/*/*.md`. Konteks lengkapnya bisa dibuka lagi
  dengan `claude --resume a192c9e8-0bb5-4bbf-8d56-9831b23e62ec` selama transkripnya masih ada; tiket ini
  ditulis agar tetap cukup tanpa itu.
- Lokasi duplikasi: `new-ticket.sh:63`, `update-ticket.sh:102`, `:128`,
  `:291`, `worktree.sh:75`, `:124`, `queue.sh:53`, `merge.sh:88`,
  `test-run.sh:124`, `:139`, `:290`, `ticket-size.sh:46`, `:68`, `:98`.
  Kunci: `new-ticket.sh:84` vs `lib.sh`. Pagar: `update-ticket.sh:423`,
  `on-ticket-review.sh:142` vs `lib.sh:263`.
- 2026-10-16 14:36:48: files estimated to change: `skills/kerjaan/references/repairs.md`, `skills/kerjaan/scripts/lib.sh`, `skills/kerjaan/scripts/merge.sh`, `skills/kerjaan/scripts/new-ticket.sh`, `skills/kerjaan/scripts/on-ticket-review.sh`, `skills/kerjaan/scripts/queue.sh`, `skills/kerjaan/scripts/test-run.sh`, `skills/kerjaan/scripts/ticket-size.sh`, `skills/kerjaan/scripts/update-ticket.sh`, `skills/kerjaan/scripts/worktree.sh`, `uji/repair.test.mjs`
- 2026-10-17 06:04:53: catatan pengerja.
  - Dibangun: lib.sh kini satu-satunya tempat untuk penolakan dari worktree
    (`kerjaan_refuse_linked_worktree`, `kerjaan_in_linked_worktree`,
    `kerjaan_main_tree`), pencarian tiket (`kerjaan_ticket_files`,
    `kerjaan_ticket_file`, `kerjaan_find_ticket`, `kerjaan_ticket_arg`),
    penambahan catatan (`kerjaan_append_note`; pembungkus di update-ticket.sh
    dibuang), pembacaan pengaturan dan frontmatter (`kerjaan_field`,
    `kerjaan_setting`, `kerjaan_setting_list`, `kerjaan_blockers`), pagar blok
    kode (`KERJAAN_FENCE`), kalimat terima-ukuran (`KERJAAN_SIZE_ACCEPTED`),
    pemilihan ID (`kerjaan_next_id`), plus `kerjaan_is_id`,
    `kerjaan_is_status`, `kerjaan_tidy_title`, `KERJAAN_STATUSES`. test-run.sh
    memakai `kerjaan_tree_without_board` alih-alih salinannya sendiri.
  - Kunci: new-ticket.sh kini memakai kunci `board` dari lib.sh (berbasis PID,
    di direktori bersama git, batas lock_timeout); kunci `.kerjaan/.lock`
    berbasis umur 1 menit dibuang.
  - Pagar: update-ticket.sh (penempatan History) dan on-ticket-review.sh
    (hitungan ronde) sebelumnya hanya mengenali ```; kini semua awk memakai
    `KERJAAN_FENCE`. on-ticket-review.sh memuat lib.sh hanya saat akan
    menyala, jadi prompt yang tidak relevan tetap ~27 ms (diukur: 0,547 s
    untuk 20 kali, sama dengan sebelum).
  - Ukuran: ticket-size.sh hanya menerima baris Notes
    `- <YYYY-MM-DD HH:MM:SS>: <KERJAAN_SIZE_ACCEPTED>` persis (spasi di akhir
    boleh), di luar pagar.
  - ID kembar: skrip baru `repair.sh duplicate-id [<id>|<path>]`. Tanpa
    argumen mendaftar semua ID kembar (exit 1 bila ada). Dengan ID: yang
    `created`-nya paling awal mempertahankan ID, sisanya dapat nomor bebas
    berikutnya di menitnya (atau menit sesudahnya, melewati pergantian
    tahun), `created` tetap, `updated` disegarkan, catatan tetap berbahasa
    Inggris di Notes, baris order.md ikut (dicocokkan lewat judul); rujukan
    lain (blocked_by, lands-first, cabang) hanya didaftar. `created` sama
    atau tak terbaca: ditolak tanpa perubahan, minta path. Semua skrip yang
    menemukan ID kembar kini menolak dan menyebut perintah ini;
    ticket-size.sh tidak lagi diam-diam mengambil yang pertama.
    references/repairs.md diganti untuk menjelaskan perintah ini.
  - Berkas di luar estimasi: `skills/kerjaan/scripts/release.sh` (salinan
    keenam penolakan worktree), `skills/kerjaan/scripts/repair.sh` (baru),
    `uji/pustaka-bersama.test.mjs` (baru), `uji/new-ticket.test.mjs`,
    `uji/ticket-size.test.mjs`.
  - Uji lama yang maknanya sengaja berubah karena tiket ini: tiga uji kunci
    di new-ticket.test.mjs (kunci `.kerjaan/.lock` berbasis umur diganti uji
    kunci bersama: pemilik mati diambil alih, pemilik hidup ditunggu sampai
    lock_timeout lalu ditolak, dan di repo git kuncinya sama dengan
    update-ticket.sh); "an acceptance written by hand in Notes counts too" di
    ticket-size.test.mjs diganti uji kalimat persis vs sembilan bentuk
    sebutan/penyangkalan. Uji lain tidak diubah.
  - Tidak diubah, sengaja: `kerjaan_merge_state` dan `reviewed_commit` di
    merge.sh tidak membaca pagar sama sekali (sebelum dan sesudah sama);
    board.mjs (JS) sudah mengenali kedua pagar. SKILL.md "Rare repairs" tetap
    merujuk repairs.md; menyebut repair.sh di ringkasan perintah SKILL.md
    diserahkan ke 261016141909, yang menata ulang SKILL.md.
  - Uji dibuat gagal dengan sengaja (salin berkas, rusak, jalankan, pulihkan
    dari salinan), tiap lokasi pemasangan:
    - penolakan worktree: lib (selalu lolos) -> 7 merah; panggilan dihapus
      satu per satu di new-ticket, update-ticket, worktree, queue, release,
      merge, repair -> masing-masing 1 merah.
    - ID kembar: lib mengambil yang pertama -> 7 merah; tiap skrip diganti
      "ambil yang pertama" (update-ticket, ticket-size, test-run, queue,
      merge, worktree) -> masing-masing merah (queue 2).
    - pagar: `KERJAAN_FENCE='^```'` -> 5 merah; pola ``` sendiri di
      update-ticket, ticket-size, lib unfenced, hook, queue answer ->
      masing-masing merah pada kasus ~~~ (queue answer awalnya tidak
      tertangkap; uji jawaban ditambahkan, lalu merah).
    - terima-ukuran: pencocokan longgar lama dan `index(line, want)` -> merah.
    - kunci new-ticket dihapus -> 4 merah; `kerjaan_setting_list` kosong -> 1.
    - repair: yang muda dipertahankan -> 5 merah; tanpa penolakan seri,
      tanpa order.md, tanpa pergantian menit, tanpa kunci, rujukan
      disembunyikan, tanpa catatan -> masing-masing 1 merah.
  - Rangkaian penuh sebelum: 451 lulus; sesudah: 508 lulus.
- 2026-10-17 06:07:20: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m21s, on content fingerprint 96f53bbd3d2678a6b185070e62ec226b241e9e31 (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level normal, round 1, at commit 007373d: passed.
  Level normal di sini: rangkaian uji proyek tidak dijalankan ulang karena
  `test-run.sh --check 261016141914 007373d` menjawab SAME (jalannya pengerja
  2026-10-17 06:07:20, fingerprint 96f53bbd3d2678a6b185070e62ec226b241e9e31,
  exit 0, 508 uji); diff dibaca per kriteria, uji baru dan uji yang diubah
  dibaca untuk mencari uji kosong, dan repair.sh serta penolakan ID kembar
  dicoba sendiri pada papan sementara. Tidak ada cabang tiket; kerja ada di main.
  - Satu penerapan (kriteria 1): penolakan worktree, pencarian tiket,
    penambahan catatan dan pembacaan pengaturan kini hanya di lib.sh; grep
    atas semua skrip .sh tidak menemukan salinan tersisa (`/gitdir"`,
    `"$board"/*/"$id "*.md`, pembaca settings sendiri). Uji struktural di
    uji/pustaka-bersama.test.mjs menjaga ini, plus uji perilaku per skrip.
  - Satu kunci (kriteria 2): new-ticket.sh memakai `kerjaan_board_lock`;
    `.kerjaan/.lock` hilang. Tiga uji kunci lama di new-ticket.test.mjs diganti
    karena desain kuncinya memang diganti oleh kriteria ini, bukan dilemahkan:
    uji barunya memeriksa pengambilalihan dari PID mati, penolakan setelah
    lock_timeout, dan bahwa di repo git kuncinya sama dengan update-ticket.sh.
  - Pagar (kriteria 3): semua awk memakai `KERJAAN_FENCE`; update-ticket.sh dan
    on-ticket-review.sh sebelumnya hanya mengenali ```. board.mjs sudah
    mengenali keduanya. Diuji untuk kedua pagar di lima skrip.
  - Ukuran (kriteria 4): ticket-size.sh hanya menerima
    `- <waktu>: <kalimat --accept-size>` persis. Uji lama "acceptance written
    by hand counts too" bertentangan langsung dengan kriteria ini, jadi
    penggantiannya diminta tiket; uji baru mencakup sembilan bentuk yang harus
    tetap memperingatkan.
  - ID kembar (kriteria 5): dicoba sendiri: dua tiket 261017100001 di todo
    dengan order.md; update-ticket.sh menolak dan menyebut repair.sh (exit 1);
    `repair.sh duplicate-id` mendaftar (exit 1); `repair.sh duplicate-id
    261017100001` menyisakan yang lebih tua, memberi yang muda 261017100002,
    memperbarui baris order.md dan menulis catatan di Notes (exit 0); daftar
    ulang lalu bersih (exit 0).
  - Semua uji lulus (kriteria 6): dibawa dari jalannya pengerja (SAME, di atas).
  - Perilaku cabang yang sudah tergabung: `kerjaan_code_rev` dan
    `kerjaan_merge_state` tidak disentuh diff; logika merge.sh land sama.
  - Catatan, tidak memblokir:
    - update-ticket.sh, untuk cabang yang tergabung tetapi worktree-nya masih
      ada, kini mencetak path mutlak ke worktree.sh (`$here`) alih-alih
      `$(dirname "$0")`. Isi sarannya sama, hanya bentuk path.
    - merge.sh land dari worktree kini memakai pesan penolakan bersama
      (kode keluar tetap 1), bukan "Tickets land from the main tree".
    - on-ticket-review.sh: bila ID di review/ dipakai dua tiket, hook kini tidak
      menemukan tiket sama sekali (dulu mengambil yang pertama). Wajar, karena
      skrip lain menolak ID itu juga.
    - repair.sh dengan path pada tiga tiket kembar hanya memindahkan satu; dua
      lainnya tetap berbagi ID dan perlu dijalankan lagi. Sesuai dokumentasinya.
