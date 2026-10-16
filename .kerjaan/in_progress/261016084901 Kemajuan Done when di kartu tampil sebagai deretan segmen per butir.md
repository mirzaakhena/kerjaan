---
type: feature
priority: high
review: normal
labels: [viewer, ux]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:49:24
updated: 2026-10-16 08:58:16
related: [261016084201]
blocked_by: []
---

## Background

Setiap kartu di papan menunjukkan kemajuan daftar Done when tiketnya di sudut
kanan bawah dalam bentuk angka, misalnya "0/8" atau "7/7". Angka seperti itu
harus dibaca dan dihitung dulu sebelum terasa artinya, dan tidak menunjukkan
butir mana yang sudah selesai. Di antara puluhan kartu, mata tidak bisa
menangkapnya sekilas.

Pemilik menginginkan bentuk yang mirip baris status di terminal Claude Code
untuk konteks dan pemakaian: deretan "pil" kecil mendatar, satu pil per butir.
Pil terisi hijau untuk butir yang sudah dicentang dan kosong untuk yang belum.

```
[x][x][ ][x][x][x][ ]   →   ▮▮▯▮▮▮▯
```

## Request

Kemajuan Done when di setiap kartu tampil sebagai deretan pil mendatar, satu
pil per butir dan urut sama dengan butir di tiket. Pil butir yang tercentang
terisi hijau, pil butir yang belum hanya bergaris tepi. Pemilik bisa melihat
dalam sekejap seberapa jauh sebuah tiket dan butir mana yang masih bolong.

Laci tiket (261016084201) memakai tampilan yang sama di bagian atasnya,
supaya kartu dan laci berbicara dengan bahasa yang sama.

## Done when
- [x] Setiap kartu yang tiketnya punya Done when menampilkan deretan pil, satu per butir, dalam urutan yang sama dengan daftar di tiket, menggantikan angka "x/y"
- [ ] Pil butir yang tercentang terisi hijau, pil butir yang belum kosong dengan garis tepi, dan keduanya jelas dibedakan di tampilan terang maupun gelap — menunggu mirza: skenario uji tangan di Notes
- [x] Butir yang dicoret karena dibatalkan atau dipindah ke tiket lain tampil berbeda dari butir yang belum selesai, sehingga tidak terlihat seperti pekerjaan yang tertinggal
- [x] Mengarahkan penunjuk ke deretan pil memunculkan jumlahnya ("5 dari 8 selesai"), dan pembaca layar membacakan hal yang sama
- [x] Tiket dengan banyak butir (misalnya 20) tetap menampilkan deretannya di dalam lebar kartu tanpa membuat kartu melebar atau terpotong
- [x] Tiket tanpa Done when tidak menampilkan deretan pil
- [x] Pemeriksaan proyek (`node --test`) lulus

## History
- 2026-10-16 08:49:24 todo
- 2026-10-16 08:49:56 in_progress

## Notes
- Permintaan mirza, 2026-10-16, dengan rujukan baris status konteks dan
  pemakaian di terminal Claude Code.
- Saat ini papan hanya menghitung jumlah butir tercentang dan seluruhnya per
  tiket; urutan dan keadaan tiap butir belum dikirim ke halaman.
- Keputusan mirza, 2026-10-16 ("yang ada di todo langsung dieksekusi"):
  pemeriksaan yang hanya bisa dilakukan orang (tampilan terang/gelap, layar
  ponsel, kesan visual) ditunda: worker menulis skenario uji manual di Notes,
  rantai tidak menunggu. Tingkat review `normal`. Usulan tata letak di Request
  dipakai.
- Dikerjakan (worker, 2026-10-16):
  - `board.mjs` membaca `## Done when` sendiri (`readDoneWhen`): butir
    tingkat atas di bawah judul itu, di luar blok berpagar, sama seperti
    `ticket-size.sh` menghitung. Tiap tiket kini membawa
    `doneWhen: [{done, struck}]` urut seperti di tiket. `checks` ikut
    dihitung dari situ (tanpa butir yang dicoret), jadi kotak centang di
    Notes atau Background tidak lagi masuk hitungan "x dari y" di laci.
  - Penggambar pil ada di `viewer/web/pil.js` (`pills(items, {className})`
    dan `pillSummary(items)`), dilayani di `/aset/pil.js`; siap dipakai
    ulang oleh laci di 261016084201.
  - Pil tercentang terisi `--done`, pil belum bergaris tepi `--muted`, butir
    dicoret tampil sebagai garis pendek tipis (`--faint`) yang tidak dihitung
    sebagai pekerjaan. Ringkasan: "5 dari 8 selesai", ditambah ", 1 dicoret"
    bila ada; bila semua dicoret: "2 butir dicoret". Deretan dibungkus
    `role="img"` dengan `aria-label` dan `title` yang sama.
  - Tiap pil adalah slot 8px yang bagian tergambarnya 75%, sehingga celah
    ikut menyempit: deretan tidak pernah lebih lebar dari kartu. Diperiksa
    dengan tangkapan layar Chrome headless (lebar 1400 dan 1000, terang dan
    gelap) pada papan contoh berisi 3, 5 (2 dicoret), 7, 20, dan 60 butir
    serta tiket tanpa Done when: 20 dan 60 butir muat di dalam kartu,
    tiket tanpa Done when tanpa deretan, butir dicoret tampil sebagai garis.
- Uji yang dibuktikan bisa merah (laporan worker): dirusak satu per satu,
  lalu `node --test viewer/uji/*.test.mjs`:
  - saringan judul `## Done when` dihapus → 2 uji merah (bagian lain,
    checks); lompatan blok berpagar dihapus → uji pagar merah; deteksi coret
    dimatikan → 3 merah; `checks` ikut menghitung yang dicoret → merah;
    regex butir menerima baris menjorok → uji anak butir merah;
  - `pills([])` mengembalikan deretan → merah; ringkasan ikut menghitung yang
    dicoret → 2 merah; kelas `struck` dihapus → merah; `title` dihapus →
    merah; `aria-label` dihapus → 2 merah;
  - kartu kembali ke angka x/y → uji kartu merah; `pil.js` dihapus dari
    daftar aset → uji server merah. Semua dipulihkan dari salinan.
- Skenario uji tangan untuk mirza (butir 2, terang/gelap):
  1. Jalankan `node viewer/server.mjs --scan ~/Workspace --project kerjaan --open`.
  2. Dengan sistem dalam mode terang, lihat kolom done dan in progress: kartu
     tiket yang punya Done when menunjukkan deretan pil di kanan bawah.
  3. Pastikan pil hijau terisi dan pil kosong bergaris tepi bisa dibedakan
     sekilas tanpa memperbesar layar; arahkan penunjuk ke deretan dan lihat
     tooltip seperti "5 dari 8 selesai".
  4. Ubah sistem ke mode gelap (macOS: Pengaturan Sistem → Tampilan → Gelap)
     dan muat ulang halaman; ulangi langkah 3.
  5. Bila ada tiket dengan butir dicoret (`- [ ] ~~...~~`), pastikan pilnya
     tampil sebagai garis pendek tipis, jelas berbeda dari pil kosong.
  Yang seharusnya terlihat: di kedua mode, hijau = selesai, kotak bergaris =
  belum, garis tipis = dicoret, tanpa perlu membaca angka.

- 2026-10-16 08:58:16: test run — `node --test` exited 0 after 0m4s, on content fingerprint 3438599c0b99751a80128c2be7e0980a9f024b7d (the same before and after the run; .kerjaan/ left out).
