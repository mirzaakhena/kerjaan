---
type: bug
priority: medium
review: quick
labels: [viewer, order-md]
reporter: mirza
assign_to: claude
created: 2026-10-17 07:08:38
updated: 2026-10-17 07:11:44
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
- [ ] Langkah di atas menghasilkan A sebagai `#1` di paling atas, sedangkan B
      tampil di bawahnya tanpa lencana peringkat
- [ ] ID yang disebut di kalimat tebal pembuka kelompok, di kalimat biasa, atau
      di baris `<!-- lands-first: … -->` tidak pernah memberi peringkat
- [ ] Urutan di viewer sama dengan urutan baris daftar dari atas ke bawah,
      termasuk bila tiket tersebar di beberapa kelompok
- [ ] Papan dengan order.md yang tidak memuat baris daftar menampilkan todo
      menurut prioritas lalu ID, dan tautan "urut order.md" di kolom todo tetap
      membuka berkasnya
- [ ] Aturan pembacaan viewer dan pemeriksaan antrean tidak bisa berselisih
      diam-diam: ada uji yang memakai satu berkas order.md contoh dan
      menegaskan keduanya membaca daftar ID yang sama
- [ ] `references/ordering-the-queue.md` menyatakan bahwa hanya baris daftar
      yang dibaca mesin (pemeriksaan antrean, skrip, dan viewer), sedangkan
      ID di kalimat penjelasan aman ditulis

## History
- 2026-10-17 07:08:38 274ec161-5783-448b-9b14-9ef25dd7d5f9 backlog
- 2026-10-17 07:09:02 274ec161-5783-448b-9b14-9ef25dd7d5f9 todo
- 2026-10-17 07:11:44 e97c38bb-2b6f-487d-a8b0-2fdab5809ee3 in_progress

## Notes
- 2026-10-17 07:09:01: files estimated to change: `skills/kerjaan/references/ordering-the-queue.md`, `skills/kerjaan/scripts/board.mjs`, `viewer/uji/`, `viewer/web/proyek.js`, `viewer/web/saring.js`
