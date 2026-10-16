---
type: feature
priority: high
review: normal
labels: [viewer, ux, mandor]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:42:23
updated: 2026-10-16 09:13:10
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
- [ ] Saat seorang worker mengerjakan sebuah tiket, kartunya di kolom "in progress" menunjukkan jenis agen, langkah terakhirnya, dan berapa lama yang lalu langkah itu terjadi
- [ ] Baris itu berganti sendiri dalam beberapa detik setelah agen melangkah lagi, tanpa memuat ulang halaman
- [ ] Hal yang sama berlaku untuk reviewer pada tiket di kolom "review"
- [ ] Laci tiket menampilkan sekitar 15 langkah terakhir agen beserta jamnya, dan sudah berapa lama agen itu berjalan
- [ ] Agen yang tidak melangkah selama beberapa menit ditandai berbeda dari agen yang baru saja melangkah, dan agen yang sudah berhenti sementara tiketnya masih di "in progress" ditandai paling mencolok
- [ ] Isi perintah dan hasil langkah tidak pernah tampil di papan, hanya keterangan langkahnya
- [ ] Tiket tanpa catatan agen, atau bila catatan Claude Code tidak bisa dibaca atau formatnya berubah, tampil seperti sekarang tanpa pesan galat
- [ ] Pemeriksaan proyek (`node --test`) lulus, termasuk uji yang memakai contoh catatan agen buatan

## History
- 2026-10-16 08:42:23 todo
- 2026-10-16 09:13:10 in_progress

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
