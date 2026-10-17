---
type: task
priority: medium
review:
labels: [sesi-8e6130e0, viewer]
reporter: mirza
assign_to: claude
created: 2026-10-17 17:51:37
updated: 2026-10-17 18:45:42
related: [261017113003, 261017155801, 261017184401, 261017184402]
blocked_by: [261017113003]
---

## Background
kerjaan dipakai di proyek berbahasa apa pun, tetapi sebagian isinya masih berbahasa Indonesia. Pemilik menemukannya di viewer: agen yang tidak melangkah beberapa menit diberi label "diam". Itu bukan satu-satunya. Tombol dan keterangan di viewer ("Tutup", "Buka order.md", "Belum ada perkiraan berkas"), nama berkas halaman viewer, folder uji, nama kelas tampilan, nama uji, dan komentar kode juga memakai bahasa Indonesia.

Isi papan sebuah proyek (tiket, pesan commit, settings.md) tidak termasuk: itu mengikuti setelan language papan masing-masing, termasuk papan repo ini yang tetap berbahasa Indonesia.

## Request
Viewer kerjaan sepenuhnya berbahasa Inggris: teks yang terlihat, alamat halaman, nama berkas dan folder, nama kelas dan variabel, nama uji, dan komentar. Viewer selalu tampil dalam bahasa Inggris, tanpa terjemahan. Alamat halaman diganti ke bahasa Inggris (/order, /ticket/<id>, /api/order, dan seterusnya) tanpa pengalihan dari alamat lama. Skrip, definisi agen, panduan, dan README dikerjakan di 261017184401; uji penjaga di 261017184402.

## Done when
- [ ] Membuka viewer pada papan mana pun, tidak ada satu kata Indonesia pun di halaman beranda, halaman papan, laci tiket, laci order.md, panel aktivitas agen, dan halaman "tidak ada"
- [ ] Label status agen tampil dalam bahasa Inggris, termasuk pengganti "diam"
- [ ] Alamat halaman viewer berbahasa Inggris (misalnya /order dan /ticket/<id>), dan alamat lama seperti /urutan tidak lagi membuka halaman
- [ ] Nama berkas, folder, kelas, variabel, uji, dan komentar di viewer berbahasa Inggris, dan semua uji tetap lulus setelah penggantian nama
- [ ] Papan yang sudah ada (tiket, order.md, settings.md berbahasa Indonesia) tetap terbaca dan tampil seperti sebelumnya
- [ ] ~~Pesan yang dicetak skrip papan dan teks definisi agen, panduan, dan README tidak memuat bahasa Indonesia, kecuali contoh yang sengaja menunjukkan papan berbahasa lain~~ (pindah ke 261017184401)
- [ ] ~~Sebuah uji otomatis gagal bila kata Indonesia yang umum muncul lagi di berkas skill atau viewer, dengan daftar pengecualian yang tertulis untuk contoh papan berbahasa lain~~ (pindah ke 261017184402)

## History
- 2026-10-17 17:51:37 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 backlog
- 2026-10-17 18:45:42 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 todo

## Notes
- 2026-10-17: lahir dari permintaan pemilik di sesi 8e6130e0-0828-4d64-b383-ba0d1c9f4b02 (`claude --resume 8e6130e0-0828-4d64-b383-ba0d1c9f4b02`): "Jangan ada bahasa indonesia dalam skill ini. Saya menemukan ada bahasa indonesia pada viewer board yaitu \"diam\"". Keputusan pemilik lewat pilihan: cakupan seluruhnya (teks terlihat, nama berkas/folder/identifier, komentar, nama uji); viewer selalu Inggris tanpa terjemahan; isi papan repo ini tetap Indonesia; dikerjakan di akhir antrean, setelah 261017113003, karena mengubah hampir semua berkas viewer. Tiket yang sedang berjalan saat itu sudah diminta menulis teks baru dalam bahasa Inggris.
- 2026-10-17 17:52:40: files estimated to change: `README.md`, `agents/`, `docs/`, `skills/kerjaan/`, `uji/`, `viewer/`
- 2026-10-17 17:52:41: answered question: Tiket ini hanya 6 butir Done when, tetapi menyentuh hampir setiap berkas repo (sekitar 60 berkas, termasuk mengganti nama folder uji dan berkas viewer), terlalu banyak untuk satu pengerja dalam satu putaran. Pilihan: (a) dipecah per hasil: viewer berbahasa Inggris (halaman, laci, panel agen, label pengganti "diam", nama berkas dan uji viewer), lalu skrip, definisi agen, panduan, README dan uji skill berbahasa Inggris, lalu uji penjaga yang mencegah bahasa Indonesia masuk lagi; (b) tetap satu tiket. Saran: (a), karena viewer bisa dicoba pemilik sendiri lebih dulu dan satu bagian yang gagal tidak menahan yang lain.
  answer, 2026-10-17 18:44:22: Pemilik: "Pecah jadi tiga". (a) dipecah: viewer berbahasa Inggris; lalu skrip, definisi agen, panduan, README dan uji skill; terakhir uji penjaga.
- 2026-10-17 17:52:41: answered question: Deskripsi skill memuat contoh kalimat Indonesia ("catat ini dulu", "kerjakan tiket berikutnya", ...) dan uji pemicu memakai kalimat Indonesia beserta hasil ukurnya; keduanya membuktikan skill tetap terpanggil saat pemilik berbicara bahasa Indonesia (261011073101). Pilihan: (a) tetap, dicatat sebagai pengecualian 'contoh pengguna berbahasa lain'; (b) dihapus dan uji pemicu diulang untuk membuktikan tidak lebih jarang terpanggil; (c) diganti kalimat Inggris saja. Saran: (a), karena itu kalimat pengguna, bukan teks skill, dan menghapusnya berisiko skill lebih jarang terpanggil di percakapan pemilik.
  answer, 2026-10-17 18:44:22: Pemilik: "Hapus, lalu ukur". (b) kalimat contoh Indonesia di deskripsi skill dan kalimat Indonesia di uji pemicu dihapus, lalu uji pemicu diulang untuk membuktikan skill tidak lebih jarang terpanggil.
- 2026-10-17 17:52:41: answered question: docs/cara-kerja-reviewer.md (penjelasan cara kerja peninjau, berbahasa Indonesia) tidak disebut di Request. Pilihan: (a) diterjemahkan ke bahasa Inggris seperti README; (b) dibiarkan berbahasa Indonesia sebagai dokumen untuk pemilik dan masuk daftar pengecualian; (c) dihapus. Saran: (a), karena ikut terbit bersama plugin dan dirujuk dari panduan.
  answer, 2026-10-17 18:44:22: Pemilik: "Hapus". (c) docs/cara-kerja-reviewer.md dihapus.
- 2026-10-17 17:52:41: answered question: Alamat halaman viewer juga berbahasa Indonesia (/urutan, /tiket/<id>, /api/urutan). Pilihan: (a) diganti ke bahasa Inggris (/order, /ticket/<id>), dan alamat lama dialihkan ke yang baru sehingga tautan lama tetap terbuka; (b) diganti tanpa pengalihan; (c) dibiarkan. Saran: (a), karena alamat terlihat di bilah alamat, dan pengalihan menjaga tautan yang sudah tersimpan.
  answer, 2026-10-17 18:44:22: Pemilik: "Ganti tanpa pengalihan". (b) alamat viewer diganti ke bahasa Inggris (/order, /ticket/<id>, /api/order, ...) tanpa pengalihan dari alamat lama.
- 2026-10-17: dipecah per hasil atas jawaban pemilik #1: tiket ini menjadi bagian viewer; 261017184401 (skrip, definisi agen, panduan, README, uji skill) dan 261017184402 (uji penjaga) mengikutinya berurutan.
- 2026-10-17 18:45:33: files estimated to change: `README.md`, `skills/kerjaan/scripts/board.mjs`, `viewer/`
