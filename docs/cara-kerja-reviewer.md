# Cara kerja reviewer, dan cara sabotase dipercepat

Dokumen ini menjelaskan dengan bahasa sederhana apa yang dilakukan
`kerjaan-reviewer`, lalu membandingkan cara sabotase dijalankan sebelum dan
sesudah versi 1.2.1.

Aturan yang mengikat tetap yang tertulis di `agents/kerjaan-reviewer.md`.
Dokumen ini hanya penjelasannya.

---

## Bagian 1: Yang dilakukan reviewer

Reviewer adalah **pemeriksa dari luar**: ia tidak ikut mengerjakan dan tidak
peduli pekerjaan itu lolos atau tidak.

**Kapan ia bekerja.** Otomatis, begitu tiket dipindah ke `review`. Tidak perlu
dipanggil.

### Langkah dasar, di semua level

1. Membaca tiket, terutama daftar `Done when`. Itulah satu-satunya ukuran lulus.
2. Membaca aturan proyek (`CLAUDE.md` dan sejenisnya), lalu memastikan kode yang
   dikerjakan ada di mana.
3. Memeriksa **setiap baris** `Done when` satu per satu.
4. Menganggap `Notes` dari pengembang sebagai **klaim yang harus dibuktikan**,
   bukan bukti. Tulisan "semua uji lulus" tetap harus ia buktikan sendiri.
5. **Tidak pernah memperbaiki kode.** Ia hanya memutuskan:
   - semua terpenuhi → tiket dipindah ke `done`;
   - ada yang gagal → tiket dikembalikan ke `in_progress`, beserta buktinya.
6. Hal di luar kriteria yang ia temukan hanya **ditulis sebagai saran**, tidak
   dijadikan tiket.

### Seberapa dalam ia memeriksa

| Level | Yang dikerjakan |
|---|---|
| `quick` (bawaan) | Menjalankan uji proyek sekali, lalu membaca perubahan kode dan mencocokkannya dengan kriteria |
| `normal` | Membuktikan tiap kriteria dengan menjalankan sesuatu, menyalakan aplikasi bila perlu, dan memeriksa apakah ujinya benar-benar menguji atau cuma formalitas |
| `strict` | Semua isi `normal`, ditambah **sabotase** di salinan terpisah |

### Apa itu sabotase

Reviewer sengaja merusak kode di salinannya sendiri. Misalnya pengecekan "hanya
pemilik akun yang boleh menghapus" ia hapus. Lalu uji dijalankan:

- **Uji gagal (merah)** → bagus, ujinya benar-benar menjaga fitur itu.
- **Uji tetap lulus (hijau)** → ujinya ompong: fitur rusak pun tidak ketahuan.
  Di `strict`, ini menahan tiket.

### Aturan yang ditambahkan di 1.2.0

- **Satu temuan dianggap contoh, bukan daftar lengkap.** Kalau menemukan satu
  lubang, reviewer wajib mencari lubang sejenis di tempat lain, lalu melaporkan
  semuanya sekaligus.
- **Putaran kedua dan seterusnya lebih sempit.** Yang diperiksa hanya temuan yang
  dulu gagal, kode yang berubah sejak tinjauan terakhir, dan kesalahan sejenis.
- **Batas putaran.** Sesudah dua kali dikembalikan, sesi bertanya dulu kepada
  pemilik tiket sebelum mencoba lagi.
- **Uji kurang gigi di `normal`.** Kalau kodenya terbukti benar, uji yang lemah
  cukup jadi catatan dan saran tiket lanjutan. Di `strict` tetap menahan tiket.

---

## Bagian 2: Sabotase sebelum dan sesudah 1.2.1

Contohnya kasus dengan 4 sabotase: pintu "menandai", "membuang", "mencari", dan
satu lagi. **Angka waktu di bawah hanya ilustrasi, bukan hasil ukur.** Anggap
seluruh uji proyek butuh 3 menit, sedangkan satu berkas uji yang relevan butuh 20
detik.

### Sebelum (sampai 1.2.0)

Semuanya antre di satu salinan, dan tiap sabotase menjalankan **seluruh** uji:

```
Uji awal (seluruh uji)               3 menit
Sabotase 1 → seluruh uji → pulihkan  3 menit
Sabotase 2 → seluruh uji → pulihkan  3 menit
Sabotase 3 → seluruh uji → pulihkan  3 menit
Sabotase 4 → seluruh uji → pulihkan  3 menit
                                     ─────────
                                     ± 15 menit
```

Ibaratnya, untuk mengecek satu lampu mati, seluruh rumah diperiksa ulang, dan
itu diulang untuk tiap lampu.

Masalah ini makin terasa sesudah 1.2.0, karena aturan "cari lubang sejenis"
menambah jumlah sabotase. Setiap tambahan dibayar dengan satu kali seluruh uji.

### Perubahan 1: hanya menjalankan uji yang relevan

Seluruh uji tetap dijalankan **sekali** di awal. Sesudah itu, tiap sabotase
cukup menjalankan berkas uji yang menjaga bagian itu:

```
Uji awal (seluruh uji)               3 menit
Sabotase 1 → uji "menandai"          20 detik
Sabotase 2 → uji "membuang"          20 detik
Sabotase 3 → uji "mencari"           20 detik
Sabotase 4 → uji terkait             20 detik
                                     ─────────
                                     ± 4–5 menit
```

**Pengamannya.** Kadang ada uji di berkas lain yang ternyata ikut menangkap
sabotase itu. Karena itu:

- berkas relevan **merah** → selesai, cepat;
- berkas relevan **hijau** → jalankan seluruh uji sekali untuk memastikan,
  **sebelum** menyatakan ujinya ompong.

Dengan begitu tiket tidak pernah ditahan hanya karena reviewer mengecek terlalu
sempit. Kesimpulannya tetap sama akuratnya, hanya lebih cepat.

### Perubahan 2: sabotase dijalankan bersamaan, kalau aman

Salinan yang sudah siap pakai (dependensinya sudah terpasang) difotokopi instan
menjadi 4, satu untuk tiap sabotase. Di macOS memakai `cp -cR`, yang tidak
memakan ruang disk tambahan. Keempatnya diuji **pada waktu yang sama**:

```
Uji awal (seluruh uji)               3 menit
Sabotase 1 ┐
Sabotase 2 ├ bersamaan               ± 20–30 detik
Sabotase 3 │
Sabotase 4 ┘
                                     ─────────
                                     ± 3,5 menit
```

Salinan yang sudah selesai cukup dihapus, jadi tidak ada kode yang perlu
dipulihkan.

**Batasannya.** Reviewer kembali antre satu per satu, tetap dengan perubahan 1,
kalau:

- **Uji proyek berebut sumber yang sama**, misalnya port, database, berkas di
  lokasi tetap, atau cache. Kalau dijalankan bersamaan, hasil satu sabotase bisa
  mengacaukan yang lain. Merah karena gangguan tetangga tidak bisa dibedakan dari
  merah sungguhan.
- **Salinan tidak bisa jalan di folder baru.** Sebagian dependensi mengingat
  folder tempat ia dipasang; contoh yang paling sering adalah virtual environment
  Python. Kalau salinan gagal bahkan sebelum ujinya mulai, reviewer berhenti
  menyalin.

---

## Ringkasan

| | Sampai 1.2.0 | + Perubahan 1 | + Perubahan 1 dan 2 |
|---|---|---|---|
| Uji per sabotase | seluruh uji | berkas relevan saja | berkas relevan saja |
| Urutan | antre | antre | bersamaan (kalau aman) |
| Contoh waktu | ± 15 menit | ± 4–5 menit | ± 3,5 menit |
| Yang tertangkap | sama | sama | sama |

**Yang tidak berubah:** apa yang diperiksa, apa yang menahan tiket, dan
kejujuran hasilnya. Yang berubah hanya berapa lama menunggu.

## Kenapa tidak memakai beberapa subagent

Pernah dipertimbangkan: reviewer utama menyusun rencana sabotase lalu
membagikannya ke beberapa subagent supaya berjalan paralel. Tidak dipilih karena:

- **Subagent tidak bisa mengutus subagent lain** di Claude Code. Kalau sesi utama
  yang mengutus, independensi hilang, karena sesi itulah yang mengerjakan kodenya.
- **Tiap subagent mulai dari nol.** Ia harus mengenal repo dan memasang
  dependensi sendiri, yang sering lebih mahal daripada sabotasenya.
- **Tidak menambah cakupan.** Agen yang hanya menjalankan rencana tidak membawa
  penilaian baru. Kalau rencananya bolong, hasilnya tetap bolong, hanya lebih
  cepat.

Paralel lewat shell, seperti perubahan 2, memberi kecepatan yang sama tanpa
biaya itu.
