---
type: feature
priority: high
review: normal
labels: [viewer, ux]
reporter: mirza
assign_to: claude
created: 2026-10-16 08:49:24
updated: 2026-10-16 08:49:56
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
- [ ] Setiap kartu yang tiketnya punya Done when menampilkan deretan pil, satu per butir, dalam urutan yang sama dengan daftar di tiket, menggantikan angka "x/y"
- [ ] Pil butir yang tercentang terisi hijau, pil butir yang belum kosong dengan garis tepi, dan keduanya jelas dibedakan di tampilan terang maupun gelap
- [ ] Butir yang dicoret karena dibatalkan atau dipindah ke tiket lain tampil berbeda dari butir yang belum selesai, sehingga tidak terlihat seperti pekerjaan yang tertinggal
- [ ] Mengarahkan penunjuk ke deretan pil memunculkan jumlahnya ("5 dari 8 selesai"), dan pembaca layar membacakan hal yang sama
- [ ] Tiket dengan banyak butir (misalnya 20) tetap menampilkan deretannya di dalam lebar kartu tanpa membuat kartu melebar atau terpotong
- [ ] Tiket tanpa Done when tidak menampilkan deretan pil
- [ ] Pemeriksaan proyek (`node --test`) lulus

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
