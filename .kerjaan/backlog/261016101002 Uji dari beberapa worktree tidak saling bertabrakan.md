---
type: feature
priority: medium
review:
labels: [paralel, uji]
reporter: mirza
assign_to: claude
created: 2026-10-16 10:10:02
updated: 2026-10-16 10:19:55
related: [261016095101, 261016101001]
blocked_by: []
---

## Background
Salinan kerja repo yang terpisah (*worktree*) hanya memisahkan file. Beberapa
hal lain tetap dipakai bersama oleh semua salinan: nomor port, database atau
layanan yang berjalan di komputer, file sementara di lokasi tetap, dan cache.
Bila dua salinan menjalankan uji pada saat yang sama, keduanya bisa saling
mengganggu, dan uji gagal bukan karena kodenya salah.

Selain itu, file yang tidak disimpan di git, misalnya file konfigurasi rahasia
(`.env`) atau paket pustaka yang sudah dipasang, tidak ikut ke salinan baru.
Salinan baru bisa langsung gagal diuji hanya karena hal-hal itu belum ada.

## Request
Uji dari beberapa salinan kerja tidak pernah saling mengganggu, tanpa proyek
harus melakukan apa pun. Proyek yang ingin ujinya berjalan berbarengan diberi
cara untuk itu.

- Bawaannya, uji dari salinan yang berbeda dijalankan bergiliran. Pengerjaannya
  tetap bersamaan, hanya ujinya yang antre.
- Proyek bisa menyatakan bahwa ujinya aman berjalan berbarengan.
- Setiap salinan memberi uji sebuah nomor urut salinan dan ID tiketnya,
  sehingga proyek bisa memilih port atau nama database yang berbeda per
  salinan.
- Proyek bisa menetapkan satu perintah yang dijalankan ketika salinan dibuat
  (misalnya menyalin konfigurasi dan memasang pustaka) dan satu perintah ketika
  salinan dihapus (misalnya menghapus database uji milik salinan itu).
- Data uji yang tersimpan di luar repo dimiliki oleh satu tiket. Setiap tiket
  membawa datanya sendiri, kecuali data yang mudah dibuat ulang. Pembersihan
  hanya menghapus data milik tiket itu sendiri, dan data bersama hanya boleh
  dibaca. Uji tiket pertama tidak boleh menghapus data yang masih dibutuhkan
  tiket kedua.

## Done when
- [ ] Dua salinan yang menjalankan uji pada saat yang sama tanpa pengaturan apa pun membuat uji kedua menunggu, dan catatan uji menunjukkan bahwa ia sempat menunggu
- [ ] Setelah proyek menyatakan ujinya aman berbarengan di pengaturan papan, uji dari dua salinan berjalan berbarengan
- [ ] Uji yang dijalankan di sebuah salinan bisa membaca nomor urut salinannya dan ID tiketnya, dan dua salinan yang berjalan bersamaan tidak pernah mendapat nomor yang sama
- [ ] Perintah persiapan dari pengaturan papan dijalankan setiap kali salinan dibuat, dan salinan tidak dipakai bila perintah itu gagal
- [ ] Perintah pembersihan dari pengaturan papan dijalankan setiap kali salinan dihapus
- [ ] Dua tiket yang ujinya memakai data di luar repo tetap lulus ketika diuji bergantian dalam urutan apa pun, termasuk ketika pembersihan tiket pertama sudah berjalan sebelum tiket kedua diuji
- [ ] Panduan kerja paralel menjelaskan aturan kepemilikan data uji: data milik tiket diberi nama sesuai tiket atau salinannya, pembersihan hanya menghapus milik sendiri, data bersama hanya dibaca, dan data yang mudah dibuat ulang dibuat ulang oleh perintah persiapan
- [ ] Pengaturan baru ini dijelaskan di file pengaturan papan dan di panduan kerja paralel

## History
- 2026-10-16 10:10:02 backlog

## Notes
- 2026-10-16 Keputusan pemilik dalam diskusi kerja paralel: uji bergiliran
  lewat kunci sebagai bawaan; disediakan nomor urut salinan dan ID tiket,
  perintah persiapan, dan perintah pembersihan salinan.
- 2026-10-16 Pemilik menambahkan: pengerjaan boleh bersamaan, tetapi pengujian
  serial. Data uji dibawa oleh tiketnya masing-masing kecuali mudah dibuat
  ulang, supaya agen pertama tidak menghapus data yang dibutuhkan agen kedua.
