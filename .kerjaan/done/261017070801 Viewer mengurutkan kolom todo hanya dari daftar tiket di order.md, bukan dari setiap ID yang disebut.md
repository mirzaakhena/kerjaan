---
type: bug
priority: medium
review: quick
labels: [viewer, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 07:08:38
updated: 2026-10-17 07:18:09
related: [261016141912]
blocked_by: []
---

## Background
`order.md` adalah berkas tempat pemilik papan menulis urutan antrean `todo`.
Panduan skill sudah menetapkan bentuknya: kelompok yang dibuka kalimat tebal,
lalu satu baris daftar per tiket, persis `- <ID> <judul>`. Kalimat di sekitarnya
bebas, untuk menjelaskan alasan urutan kepada manusia. Pemeriksaan antrean
(`queue.sh check`) dan skrip pemindah tiket sudah hanya membaca baris daftar itu.

Viewer (papan kanban di peramban) membacanya dengan cara lain: setiap angka
12 digit di mana pun dalam berkas dianggap peringkat, mengikuti urutan
kemunculan pertamanya. Akibatnya tiket yang hanya disebut di kalimat penjelasan
("sudah selesai: …", "sengaja tetap di backlog: …") ikut mendapat peringkat.
Ini ditemukan di papan nukitu-mockup 17 Okt 2026. Di sana order.md menyebut
21 ID di kalimat penjelasan dan tidak memuat satu pun baris daftar.

Keputusan bentuknya (Mirza menyerahkan pilihannya, 17 Okt 2026): tetap memakai
baris daftar `- <ID> <judul>` yang sudah dibakukan, bukan bentuk judul baru
seperti `### <ID>`. Alasannya, papan sudah punya satu format yang dibaca
pemeriksaan antrean, ditulis perencana, dan dirawat skrip pemindah tiket. Kalau
viewer memakai bentuk kedua, satu berkas punya dua aturan yang bisa
berselisih. Kalimat penjelasan tetap boleh ditulis di mana saja dan tidak
pernah dibaca sebagai urutan.

## How to reproduce
1. Di sebuah papan, tulis `order.md` berisi satu kalimat biasa yang menyebut
   ID tiket B, lalu di bawahnya satu baris daftar `- <ID A> <judul A>`.
2. Pindahkan tiket A dan tiket B ke `todo`.
3. Buka papan di viewer.

Tiket B tampil paling atas dengan lencana `#1`, dan A di bawahnya dengan `#2`,
padahal order.md hanya mendaftarkan A.

## Request
Viewer membaca urutan `todo` dengan aturan yang sama seperti pemeriksaan
antrean: hanya baris daftar `- <ID> <judul>` yang menentukan peringkat.
Tiket todo yang tidak terdaftar tetap tampil di bawahnya, diurutkan menurut
prioritas lalu ID seperti sekarang. Panduan skill menyebut dengan jelas bahwa
viewer pun hanya membaca baris daftar.

## Done when
- [x] Langkah di atas menghasilkan A sebagai `#1` di paling atas, sedangkan B
      tampil di bawahnya tanpa lencana peringkat
- [x] ID yang disebut di kalimat tebal pembuka kelompok, di kalimat biasa, atau
      di baris `<!-- lands-first: … -->` tidak pernah memberi peringkat
- [x] Urutan di viewer sama dengan urutan baris daftar dari atas ke bawah,
      termasuk bila tiket tersebar di beberapa kelompok
- [x] Papan dengan order.md yang tidak memuat baris daftar menampilkan todo
      menurut prioritas lalu ID, dan tautan "urut order.md" di kolom todo tetap
      membuka berkasnya
- [x] Aturan pembacaan viewer dan pemeriksaan antrean tidak bisa berselisih
      diam-diam: ada uji yang memakai satu berkas order.md contoh dan
      menegaskan keduanya membaca daftar ID yang sama
- [x] `references/ordering-the-queue.md` menyatakan bahwa hanya baris daftar
      yang dibaca mesin (pemeriksaan antrean, skrip, dan viewer), sedangkan
      ID di kalimat penjelasan aman ditulis

## History
- 2026-10-17 07:08:38 274ec161-5783-448b-9b14-9ef25dd7d5f9 backlog
- 2026-10-17 07:09:02 274ec161-5783-448b-9b14-9ef25dd7d5f9 todo
- 2026-10-17 07:11:44 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress
- 2026-10-17 07:17:22 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 review
- 2026-10-17 07:18:09 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 done

## Notes
- 2026-10-17 07:09:01: files estimated to change: `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/scripts/board.mjs`, `viewer/uji/`, `viewer/web/proyek.js`, `viewer/web/saring.js`
- 2026-10-17: dikerjakan. `readOrder` di `skills/kerjaan/scripts/board.mjs` kini
  hanya membaca baris `- <ID>` diikuti spasi atau akhir baris, dengan aturan
  yang sama persis seperti awk `queue.sh check` (dibelah per `\n` saja, jadi
  `\r` tersisa dibaca sama). Uji baru `viewer/uji/urutan.test.mjs`: per jenis
  sebutan (kalimat biasa, kalimat tebal, lands-first, beberapa kelompok, tanpa
  daftar, bentuk mirip daftar), satu order.md contoh yang dibaca viewer dan
  `queue.sh check` (todo kosong, ID dari pesan "order.md lists … not in todo")
  harus sama, dan tiga uji di Chrome sungguhan: langkah reproduksi tiket
  (A `#1`, B tanpa lencana), tujuh tiket di tiga kelompok, serta order.md tanpa
  daftar (prioritas lalu ID, tautan "urut order.md" membuka laci order.md di
  `/alpha/urutan`). Panduan `ordering-the-queue.md`: satu kalimat di aturan
  bullet, dan "never mentions" jadi "never lists".
- Bukti uji bisa merah: (1) `readOrder` dikembalikan ke regex lama
  `\b\d{12}\b` — 10 dari 10 uji di urutan.test.mjs merah; (2) `readOrder`
  dilonggarkan menerima indentasi dan `\r` — uji bentuk-persis dan uji
  kesamaan dengan queue.sh merah; (3) awk `queue.sh` dilonggarkan dengan cara
  sama — uji kesamaan merah. Ketiganya dipulihkan dari salinan.
- Berkas di luar estimasi: tidak ada di luar `viewer/uji/`; `viewer/web/proyek.js`
  dan `saring.js` tidak perlu diubah (peringkat sudah dihitung dari
  `board.order`).
- 2026-10-17 07:17:16: test run — `node --test --test-timeout=900000 --test-force-exit` exited 0 after 2m18s, on content fingerprint fe52d127ec1edf005de3507c5fd30be7c25cfafe (the same before and after the run; .kerjaan/ left out).
- 2026-10-17: Reviewed at level quick, round 1, at commit 2caae62: passed.
  Level quick: uji proyek tidak dijalankan ulang karena `test-run.sh --check`
  menyatakan SAME (dibawa dari run pengerja 2026-10-17 07:17:16, fingerprint
  fe52d127ec1edf005de3507c5fd30be7c25cfafe, 604 uji, exit 0); perubahan dibaca
  baris demi baris terhadap Done when. Tidak ada server yang dijalankan.
  - Langkah reproduksi (A `#1`, B tanpa lencana): uji peramban pertama di
    `viewer/uji/urutan.test.mjs` menegaskan persis `[[A,'#1'],[B,null]]`; B
    berprioritas high sehingga uji ini akan merah bila B masih diberi peringkat.
  - Kalimat tebal, kalimat biasa, lands-first: uji unit per jenis dan uji
    peramban kedua; regex baru `^- (\d{12})(?: |$)` per baris tidak bisa
    menangkap ID di tempat lain.
  - Beberapa kelompok: uji unit dan peramban dengan tiga kelompok, urutan dari
    atas ke bawah, sisanya menurut prioritas lalu ID.
  - order.md tanpa daftar: uji peramban ketiga memeriksa urutan prioritas lalu
    ID dan tautan "urut order.md" membuka laci `.kerjaan/order.md`.
  - Kesamaan dengan pemeriksaan antrean: regex di `readOrder` sama dengan awk
    `queue.sh` (`/^- [0-9]{12}( |$)/`); uji kesamaan menjalankan
    `queue.sh check` sungguhan pada satu order.md contoh berisi kasus tepi
    (tanpa judul, `\r`, menjorok, backtick, duplikat).
  - `references/ordering-the-queue.md`: kalimat baru menyebut queue.sh check,
    skrip, dan viewer hanya membaca bullet, dan ID di prosa aman.
  - Catatan (tidak memblokir): repo ini tidak punya CLAUDE.md/AGENTS.md.
    Klaim "bukti uji bisa merah" di atas tidak diulang (bukan bagian level
    quick).

### Suggested follow-up

- **Baris `- <ID>` tanpa judul tidak dihapus saat tiketnya keluar dari todo.**
  `queue.sh check` dan viewer kini membaca `- <ID>` tanpa judul sebagai tempat
  dalam urutan, tetapi `update-ticket.sh` hanya mencocokkan `- <ID> ` (dengan
  spasi), jadi baris semacam itu tertinggal di order.md setelah tiketnya pindah
  dan baru dilaporkan sebagai entri basi oleh `queue.sh check`. Layak jadi
  tiket: pemindah tiket memakai aturan baris yang sama (`( |$)`).
