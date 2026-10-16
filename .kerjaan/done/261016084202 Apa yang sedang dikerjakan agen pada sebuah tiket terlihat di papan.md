---
type: feature
priority: high
review: normal
labels: [viewer, ux, mandor]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:42:23
updated: 2026-10-16 10:00:22
related: [261016084201, 261011064201]
blocked_by: [261016084201]
---

## Background

Setiap tiket dikerjakan oleh agen pengerja (worker) dan diperiksa oleh agen
peninjau (reviewer). Keduanya berjalan di belakang layar, kadang setengah jam
atau lebih untuk satu tiket. Selama itu papan di peramban hanya menunjukkan
bahwa tiket ada di kolom "in progress". Pemilik tidak bisa membedakan agen
yang sedang sibuk dari agen yang sudah berhenti, dan menunggu tanpa kepastian
seperti itu tidak nyaman.

Di terminal Claude Code, daftar agen sudah menampilkan langkah yang sedang
dikerjakan tiap agen, misalnya "Reading J-profil-mitra.md and lintas-role.md".
Claude Code juga menulis setiap langkah agen ke berkas catatan di komputer
yang sama, terus-menerus selama agen bekerja. Papan bisa membaca catatan itu.

Pernah terjadi agen dihentikan di tengah jalan sementara tiketnya tetap
tinggal di "in progress". Dari papan, tiket itu tampak sama persis dengan
tiket yang sedang dikerjakan.

## Request

Untuk tiket di "in progress" dan "review", papan menunjukkan apakah ada agen
yang mengerjakannya dan apa yang terakhir dilakukan agen itu, tanpa perlu
membuka terminal. Pemilik bisa melihat dalam sekejap bahwa agen benar-benar
bekerja, atau sebaliknya bahwa agen sudah lama diam atau berhenti.

Yang ditampilkan hanya keterangan langkah (seperti "Update README API
sections" atau nama berkas yang dibaca). Isi perintah dan hasilnya tidak,
karena catatan agen bisa memuat hal yang tidak pantas tampil di layar. Papan
tetap hanya membaca, dan tetap hanya bisa dibuka dari komputer itu sendiri.

Usulan tampilan (pelaksana boleh mengubah rinciannya selama hasilnya sama):

- Kartu: satu baris di bawah judul, misalnya
  "● worker · Update README API sections · 12 dtk lalu".
- Laci tiket: baris yang sama di bagian atas yang tidak ikut bergulir, dan
  daftar sekitar 15 langkah terakhir (jam, alat, keterangan) yang bisa dibuka
  dan ditutup.
- Penanda warna: hijau saat agen baru saja melangkah, kuning saat sudah
  beberapa menit diam, merah saat agen berhenti tetapi tiketnya masih di
  "in progress".

## Done when
- [x] Saat seorang worker mengerjakan sebuah tiket, kartunya di kolom "in progress" menunjukkan jenis agen, langkah terakhirnya, dan berapa lama yang lalu langkah itu terjadi
- [x] Baris itu berganti sendiri dalam beberapa detik setelah agen melangkah lagi, tanpa memuat ulang halaman
- [x] Hal yang sama berlaku untuk reviewer pada tiket di kolom "review"
- [x] Laci tiket menampilkan sekitar 15 langkah terakhir agen beserta jamnya, dan sudah berapa lama agen itu berjalan
- [ ] Agen yang tidak melangkah selama beberapa menit ditandai berbeda dari agen yang baru saja melangkah, dan agen yang sudah berhenti sementara tiketnya masih di "in progress" ditandai paling mencolok — menunggu mirza: skenario uji manual di Notes
- [x] Isi perintah dan hasil langkah tidak pernah tampil di papan, hanya keterangan langkahnya
- [x] Tiket tanpa catatan agen, atau bila catatan Claude Code tidak bisa dibaca atau formatnya berubah, tampil seperti sekarang tanpa pesan galat
- [x] Pemeriksaan proyek (`node --test`) lulus, termasuk uji yang memakai contoh catatan agen buatan

## History
- 2026-10-16 08:42:23 todo
- 2026-10-16 09:13:10 in_progress
- 2026-10-16 09:58:01 review
- 2026-10-16 10:00:22 done

## Notes
- Temuan mandor 2026-10-16, dari sesi `4dbcf082-290a-4f65-845c-ee75fd3b3e9c`
  di proyek nukitu-mockup (Claude Code 2.1.300):
  - Catatan agen ada di
    `~/.claude/projects/<path proyek, "/" diganti "-">/<sesi>/subagents/`,
    sepasang berkas per agen: `agent-<id>.meta.json` dan `agent-<id>.jsonl`.
  - `meta.json` memuat `agentType` (mis. `kerjaan:kerjaan-worker`) dan
    `description` ("Kerjakan tiket 261009110306", "Tinjau tiket …"). Prompt
    pertama worker juga memuat baris `Ticket: .kerjaan/in_progress/<ID> …`.
  - Setiap baris `.jsonl` bertipe `assistant` memuat `timestamp` dan isi
    `tool_use` dengan `name` dan `input`; Bash punya `input.description`,
    Read/Edit/Write punya `input.file_path`. Agen yang dihentikan berakhir
    dengan pesan user `[Request interrupted by user]`.
  - Satu tiket bisa punya beberapa agen (worker yang dihentikan lalu diganti,
    reviewer putaran kedua); yang relevan adalah yang paling baru.
  - Teks seperti "Reading X and Y" di terminal tidak ditemukan di catatan;
    keterangan Bash dan nama berkas adalah padanannya.
  - Format ini milik Claude Code dan tidak didokumentasikan, jadi bisa
    berubah tanpa pemberitahuan. Karena itu butir ketujuh Done when.
- Angka token di terminal tidak cocok dengan jumlah token di catatan; tidak
  diminta ditampilkan.
- Keputusan mirza, 2026-10-16 ("yang ada di todo langsung dieksekusi"):
  pemeriksaan yang hanya bisa dilakukan orang (tampilan terang/gelap, layar
  ponsel, kesan visual) ditunda: worker menulis skenario uji manual di Notes,
  rantai tidak menunggu. Tingkat review `normal`. Usulan tata letak di Request
  dipakai.
- Pelaksanaan worker, 2026-10-16:
  - Kode: `viewer/agen.mjs` (baru, sisi server: membaca catatan Claude Code),
    `viewer/web/agen.js` (baru, murni: keadaan, warna, baris kartu, daftar
    langkah), `viewer/app.mjs` (agen di `api/papan` tanpa daftar langkah, di
    `api/tiket/<ID>` dengan daftar langkah, `api/agen/<ID>` baru, `event: agen`
    di SSE, `agen.js` di `ASSETS`), `viewer/web/laci.js` (baris agen di bagian
    diam setelah `.sekilas`; `drawerAgent` sebagai blok pertama bagian
    bergulir), `viewer/web/proyek.js`, `viewer/web/gaya.css`. Uji:
    `viewer/uji/agen.test.mjs`, `viewer/uji/agen-papan.test.mjs`, pembantu
    catatan buatan di `viewer/uji/bantu.mjs`.
  - Folder catatan: `$CLAUDE_CONFIG_DIR` (bawaan `~/.claude`) `/projects/`
    + path proyek dengan setiap karakter selain huruf dan angka menjadi "-".
    Dipastikan dari folder yang ada: `/Users/mirza/.claude` →
    `-Users-mirza--claude` (titik ikut menjadi "-"). Garis bawah tidak punya
    contoh di mesin ini (`shinobi_mobile` tidak punya folder catatan), jadi
    diperlakukan dengan aturan yang sama. Nama >200 karakter dicocokkan dari
    200 karakter awalnya — tebakan tanpa contoh. `createViewer({ root,
    claudeDir })` menerima folder lain; `startViewer` di uji memakai folder
    yang tidak ada bila tidak diberi, jadi uji tidak pernah membaca `~/.claude`.
  - Batas yang diketahui: hanya sesi Claude Code yang dimulai di folder proyek
    itu sendiri yang terbaca. Mandor yang dimulai di folder lain (folder induk,
    worktree) tidak terlihat di papan.
  - Agen sebuah tiket: ID 12 digit di `description` meta; cadangannya baris
    `Ticket:` di prompt pertama. Dari beberapa agen, yang tanda hidup
    terakhirnya paling baru — bukan yang paling baru dimulai — supaya worker
    yang dilanjutkan setelah ditolak menang atas reviewer yang sudah selesai.
  - Akhir agen: `SubagentHandback`, atau pesan penutup dengan `stop_reason:
    end_turn` (2.1.300 menulis teks penutup sesudah laporan), atau
    `finished: true` di meta (ada di 2.1.301, tidak di 2.1.300; diabaikan bila
    catatan masih ditulis sesudah meta) → selesai. `[Request interrupted by
    user` → dihentikan. Langkah baru sesudah selesai → bekerja lagi.
  - Penanda (dihitung di halaman, terhadap jam halaman, jadi berubah tanpa ada
    yang ditulis): hijau bila tanda hidup terakhir < 2 menit; kuning 2–20 menit
    ("diam"); merah bila dihentikan, bila ≥ 20 menit tanpa kabar ("tidak ada
    kabar": proses Claude Code mati tanpa penanda), atau bila agen selesai
    sementara tiket masih di in progress ("berhenti", mis. STOPPED — decision).
    Merah = latar merah muda pada baris dan tepi kartu merah. Agen selesai pada
    tiket di review: abu-abu "selesai" (worker menunggu reviewer). Merah juga
    dipakai untuk reviewer yang dihentikan di review, tidak hanya in progress.
  - Keterangan langkah disaring di server (`stepLabel` di `viewer/agen.mjs`):
    hanya `input.description`, atau `file_path`/`notebook_path` (relatif ke
    proyek, atau nama berkas saja bila di luar). Alat lain hanya namanya:
    Grep/Glob tanpa pola, WebFetch tanpa URL, Bash tanpa description hanya
    "Bash". Prompt, teks, pikiran, dan hasil tidak pernah dibaca ke luar
    (kecuali ID tiket dari baris `Ticket:`).
  - Pembaruan langsung: selama ada halaman terbuka, server memeriksa catatan
    tiap 2 dtk (hanya stat; yang dibaca hanya bagian yang bertambah) dan
    mengirim `event: agen` hanya bila ada yang berubah. Halaman memperbarui
    "x lalu" dan warna tiap detik, di tempat, tanpa menggambar ulang kartu
    (fokus kartu tidak hilang).
  - Laci: daftar langkah berupa `<details>`, tertutup mula-mula, terbaru di
    atas (jam, alat, keterangan); ringkasannya "15 langkah terakhir worker ·
    mulai 09:13:31 · berjalan 42 mnt" (atau "bekerja N mnt" bila selesai).
    Keadaan buka/tutup bertahan saat diperbarui. Bagian diam dengan baris agen
    tetap ≤ seperlima tinggi laci di 1280×800 dan 390×844 (diuji).
  - Dicoba di catatan sungguhan (hanya baca): papan kerjaan menampilkan worker
    tiket ini sendiri ("jalan", langkah terakhir, 2 dtk lalu); papan
    nukitu-mockup menampilkan worker 261016090101. Membaca semua agen
    nukitu-mockup (264 tiket) pertama kali ≈ 1 dtk, berikutnya ≈ 7 md; papan
    hanya membaca agen tiket in progress/review.
  - Bukti uji bisa merah (laporan worker; tiap penjaga dirusak di salinan,
    uji dijalankan, berkas dikembalikan dari salinan):
    - keterangan dari `input.command`, atau dari `pattern`/`url` → merah: uji
      "keterangan langkah…", "isi perintah, hasil, … tidak pernah keluar dari
      server", kartu dan laci.
    - penanda dihentikan dimatikan; laporan diserahkan tidak dianggap selesai;
      langkah baru tidak membatalkan selesai; `end_turn` diabaikan; meta
      `finished` diabaikan; meta `finished` tanpa cek waktu → merah: "akhir
      agen…", "agen yang lama dihentikan kalah…", "penanda…" (peramban).
    - agen pertama ditemukan dipakai alih-alih yang terakhir aktif → merah:
      "agen per tiket…", "agen yang lama dihentikan kalah…".
    - saringan ID yang diminta dibuang → mula-mula HIJAU (deskripsi satu ID
      sudah tersaring lebih awal); ditambah uji "agen yang menyebut beberapa
      tiket…", lalu merah.
    - agen tanpa waktu diterima; jendela ekor tidak membesar; baris setengah
      jadi dibaca; cadangan baris `Ticket:` dibuang; pengodean hanya "/" →
      merah di uji masing-masing.
    - semua lapis try/catch di `agen.mjs` dibuang sekaligus → merah: uji
      catatan rusak/tak terbaca di server dan peramban (tiap lapis sendiri
      tertutup lapis lain, sengaja).
    - saringan status di `api/papan`, `api/tiket`, `api/agen`; daftar langkah
      ikut ke kartu → merah: "kanban: …", "isi tiket dan api/agen…".
    - kiriman `event: agen` dimatikan; halaman tidak mendengarkannya; laci
      tidak mengambil langkah baru; penghitung tiap detik dimatikan → merah:
      "agen melangkah: …", "kartu: berganti sendiri…", uji laci.
    - ambang 2 menit dan 20 menit, selesai-di-in-progress, dihentikan di
      `agentState` → merah: uji murni "penanda…" dan uji peramban "penanda…".
    - latar merah, tepi kartu merah, warna kuning dihapus dari CSS → latar dan
      tepi merah; warna kuning mula-mula HIJAU (uji hanya menghitung warna
      berbeda); uji diubah membandingkan tiap titik dengan `--agen-jalan`,
      `--agen-diam`, `--agen-berhenti`, lalu merah.
    - baris agen pada kartu tidak digambar saat kartu dibuat → mula-mula HIJAU
      (penghitung tiap detik mengisinya); uji kini mencatat lewat
      MutationObserver apakah baris ada saat kartu pertama muncul, lalu merah.
    - baris agen di bagian diam laci dikosongkan; daftar langkah tidak tetap
      terbuka; `agen.js` tidak di `ASSETS` → merah di uji laci/kartu.
  - Skenario uji manual (menunggu mirza; kesan penanda warna, terang/gelap):
    1. Jalankan `node viewer/server.mjs --scan ~/Workspace --project kerjaan
       --open` dari akar repo ini.
    2. Dari sesi Claude Code di `~/Workspace/kerjaan`, pindahkan satu tiket ke
       in progress dan kirim worker kerjaan untuknya (mis. "kerjakan tiket
       <ID>").
    3. Lihat kartunya di kolom in progress: di bawah judul ada titik hijau
       berdenyut, "worker", langkah terakhir, dan "N dtk lalu" yang terus
       bertambah; langkah berganti sendiri dalam beberapa detik.
    4. Buka kartunya: baris yang sama ada di bagian atas laci; buka "15 langkah
       terakhir worker" dan lihat jam, alat, keterangan, serta "berjalan N mnt".
    5. Hentikan worker itu (Esc di sesi mandor, atau hentikan agennya): dalam
       beberapa detik kartu berubah merah ("dihentikan"), dengan tepi kartu
       merah, dan tetap paling menonjol di antara kartu lain.
    6. Biarkan sebuah agen menunggu > 2 menit tanpa langkah (mis. saat uji
       panjang berjalan): titik dan kata "diam" kuning, tanpa latar.
    7. Ulangi 3–6 dengan sistem diubah ke tema gelap: hijau, kuning, merah,
       dan abu-abu tetap mudah dibedakan dan terbaca.
    Yang harus terlihat: hijau = sedang bekerja, kuning = diam, merah = berhenti
    sementara tiket masih menunggu; merah paling mencolok di kedua tema.
- 2026-10-16 09:57:49: test run — `node --test` exited 0 after 0m22s, on content fingerprint 80a5ad64efbc10d3e37bebe1e3d902459c0d2330 (the same before and after the run; .kerjaan/ left out).
- Review 2026-10-16 — Ditinjau pada tingkat normal, putaran 1, pada commit a4abd89 (kerja di 51bd223, langsung di `main`, tanpa cabang atau worktree terpisah): pemeriksaan proyek tidak dijalankan ulang karena hasil worker terbukti mencakup isi yang sama; setiap butir Done when dibuktikan dengan menjalankan sesuatu. Keputusan: lolos, pindah ke done.
  - Pemeriksaan proyek: `test-run.sh --check 261016084202 HEAD` dan pada pohon kerja → SAME. `node --test` dari worker (2026-10-16 09:57:49, sidik 80a5ad64efbc10d3e37bebe1e3d902459c0d2330, keluar 0) dipakai, tidak diulang.
  - `node --test viewer/uji/agen-papan.test.mjs` dijalankan sendiri untuk memastikan uji peramban sungguh berjalan (Chrome terpasang): 12 lulus, 0 dilewati.
  - Butir 1–3 (kartu worker, berganti sendiri, reviewer di review): diuji di peramban sungguhan oleh uji "kartu: …" (baris ada sejak kartu digambar, langkah berganti < 6 dtk tanpa memuat ulang, fokus tetap). Juga dicoba pada catatan sungguhan (hanya baca): `readAgents` untuk repo ini menampilkan reviewer tiket ini sendiri, langkah yang sedang dijalankan, `ended: null`; nukitu-mockup 265 tiket terbaca dalam ≈ 1,1 dtk tanpa galat.
  - Butir 4 (laci, ±15 langkah, jam, lama berjalan): uji laci 1280×800 dan 390×844 lulus; `api/agen/<ID>` mengembalikan langkah dengan jamnya.
  - Butir 5: bagian yang bisa diotomatiskan terbukti — uji "penanda: …" membandingkan warna titik dengan `--agen-jalan`, `--agen-diam`, `--agen-berhenti` (tiga warna berbeda), merah berlatar dan tepi kartu merah hanya untuk yang berhenti. Kesan "paling mencolok" di tampilan nyata, terang/gelap: **menunggu mirza**; keputusan mirza 2026-10-16 ada di Notes dan skenario uji manual 1–7 di Notes bisa diikuti dan berakhir pada apa yang harus terlihat. Tidak menghalangi.
  - Butir 6 (privasi): dicoba sendiri dengan catatan buatan berisi penanda rahasia di prompt, pikiran, teks, `input.command` (termasuk Bash tanpa description dan dengan description), hasil alat, `content` Write, `old_string`/`new_string` Edit, URL dan prompt WebFetch, pola Grep, masukan alat MCP, prompt Agent, dan langkah yang ditambahkan selagi halaman terbuka. Isi `api/papan`, `api/tiket/<ID>`, `api/agen/<ID>` dan `event: agen` di SSE digabung lalu dicari: tidak satu pun penanda rahasia keluar. Yang keluar hanya nama alat, `description`, dan nama berkas.
  - Aturan jalur di `viewer/app.mjs`: `api/agen` hanya menerima ID 12 digit (`/^\d{12}$/`) dan ID itu hanya dipakai sebagai kunci peta, tidak pernah digabung ke jalur berkas. `/p/api/agen/..%2f..%2fetc` dan `/p/api/agen/../../etc/passwd` → 404.
  - Butir 7: dicoba sendiri dengan baris bukan JSON, `null`, `[]`, `content` berupa teks, waktu rusak, meta rusak, catatan berisi sampah saja, catatan tanpa izin baca (chmod 0), meta dan catatan berupa folder: semua endpoint 200, tiket itu `agent: null`, tiket lain tetap tampil. Uji "catatan rusak …" di peramban juga lulus.
  - Butir 8: lihat baris pertama (dibawa dari hasil worker, SAME).
  - Uji dibaca untuk mencari pernyataan kosong: uji privasi, kartu, pembaruan langsung, dan penanda memeriksa isi dan warna yang sebenarnya, bukan sekadar tidak galat. Tidak ditemukan uji kosong.
  - Catatan (tidak menghalangi):
    - Berkas di luar proyek tampil hanya dengan nama berkasnya (mis. `/etc/x.txt` → `x.txt`); folder di luar proyek tidak terlihat. Sesuai maksud.
    - `description` Bash ditulis oleh agen sendiri dan tampil apa adanya (dipotong 160 karakter). Request memang meminta keterangan langkah ditampilkan; bila agen menulis hal sensitif di keterangannya, itu akan terlihat.
    - Batas yang sudah dicatat worker: hanya sesi Claude Code yang dimulai di folder proyek itu sendiri yang terbaca.
