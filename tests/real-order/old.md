Urutan `todo`, disusun ulang 15 Oktober 2026 dan diperbarui 16 dan 17 Oktober.
Tujuan Mirza: aplikasi Flutter (`mobile/flutter/`) tersambung ke server dan
bisa ia coba langsung di HP Android-nya. Keputusan Mirza 17 Okt 2026: semua
tiket Flutter dan integrasi API masuk antrean ini, kecuali GPS, kamera,
integrasi pembayaran, integrasi pelatihan, email (OTP lewat email, lupa
sandi), peta dan geocoding, dan push notification. Notifikasi di dalam
aplikasi (F9) masuk. F1 tetap utuh, termasuk GPS domisili dan foto profilnya.

Polanya tetap bergantian per wilayah: pintu API wilayah itu diseragamkan ke
konvensi (tiket 261009110301), lalu alur Flutter wilayah itu disambungkan.
Keempat tiket pintu sudah selesai (261009110303 kontrak, 261009110304 mitra
dan institusi, 261009110305 pengelola, 261009110306 akun, kabar, aktivitas,
dukungan); `PENGECUALIAN` di `test/konvensi-api.mjs` kosong, jadi tidak ada
tiket pintu di depan alur Flutter di bawah.

Sudah selesai sebelum urutan ini: sesi (261015192301), daftar dan OTP
(261016090102), GPS Ubah Domisili (261016090101), verifikasi mitra
(261016124401), siap bekerja (261016134701), jadwal/OFF (261016134702), OTP
kedaluwarsa di webapp (261016103301), bug Kirim Proposal pengganti
(261009233302), pekerjaan mitra sampai berangkat (261016195901) dan sampai
selesai (261016195902), alasan menolak proposal (261017024301), dan keempat
tiket pintu di atas. F1 akun mitra (261017065501) sedang dikerjakan.

**Langkah wajib tiket alur Flutter** (keputusan Mirza 17 Okt 2026, menggantikan
aturan lama "tiket alur ditulis tepat sebelum gilirannya"): semua tiket F3–F9
ditulis 17 Okt sekaligus. Sebelum mulai, pengerja membaca Notes tiket Flutter
sebelumnya yang sudah done, lalu memperbarui bagian Dasar dan perkiraan berkas
tiketnya (`queue.sh estimate`). Langkah ini juga tertulis di Notes setiap tiket.

Sengaja tetap di backlog: yang dikecualikan di atas (pembayaran sungguhan
260916204309, OTP dan reset lewat email 260917094201, peta 260917094202,
geocoding 260929215701, uji HP aplikasi Capacitor 260930125901 yang memakai
kamera dan GPS, keputusan pelatihan 261006220902 dan build produksi bersih
261009233303 yang menunggunya), kalimat "ajakan Perbarui Lokasi" (261017065503, server dan webapp;
Flutter tidak pernah memicu penolakan itu), dan yang bukan Flutter maupun
integrasi API (git log berkas ini).

**Lalu F2 ganti rekening.** Ia menunggu F1 (sedang dikerjakan), karena
rekening yang diloloskan pengelola baru terlihat di Info Profil bila profil
sudah dibaca dari server.

- 261017065502 Mitra mengajukan dan membatalkan ganti rekening dari aplikasi Flutter, dan keputusan pengelola di dashboard sampai ke HP

**Lalu sertifikat dicabut di Info Keahlian.** Tidak menunggu hasil siapa pun,
tetapi mengubah `profil.dart`, `repositori_contoh.dart`, dan `model.dart`
Flutter yang sedang diubah F1 dan F2, jadi ia sesudah keduanya.

- 261017065504 Sertifikat yang dicabut admin tampil Dicabut admin beserta alasannya dan tidak dihitung, di webapp dan Flutter

**Lalu F3 akun bersama.** Ganti sandi, riwayat aktivitas, dan pesan dukungan
untuk kedua role; tidak menunggu siapa pun, dan menutup sisi mitra sebelum
alur instansi dimulai.

- 261017073003 Mitra dan instansi mengganti sandi, melihat riwayat aktivitas, dan mengirim pesan ke tim dukungan dari aplikasi Flutter di server sungguhan

**Lalu F4 akun dan Institusi Saya instansi.** Alur instansi pertama; pencarian
sesudahnya memakai id institusi dari server.

- 261017073004 Instansi melihat verifikasi akunnya, mengubah info personal, dan mengelola Institusi Saya dari aplikasi Flutter di server sungguhan

**Lalu F5 cari dan detail mitra.** Menunggu F4 (institusi pemesan dari
server); wizard proposal sesudahnya berangkat dari detail mitra ini.

- 261017073005 Instansi mencari mitra dan membuka detail mitra dari aplikasi Flutter dengan mitra sungguhan di server

**Lalu satu kode alasan.** Kode penolakan alasan pintu kontrak berubah ke
`alasan_wajib`/`alasan_terlalu_panjang` (keputusan Mirza 17 Okt); F6, bayar,
dan F7 menyusun data contoh kontrak sisi instansi berikut penolakan alasannya,
jadi kodenya harus final sebelum mereka.

- 261017065505 Penolakan karena alasan kosong atau terlalu panjang memakai satu kode di pintu pengelola dan pintu kontrak

**Lalu F6 proposal dan kontrak instansi.** Menunggu F5; tiket inilah yang
memindah kontrak sisi instansi ke server, jadi semua langkah kontrak instansi
di bawah menunggunya.

- 261017073006 Instansi membuat proposal sampai terkirim dan melihat kontraknya di daftar dan detail kontrak aplikasi Flutter, di server sungguhan

**Lalu bayar tiruan dan mitra pengganti.** Menunggu F6; sesudah dibayar dan
diperiksa pengelola, proposal dari HP instansi sampai ke HP mitra.

- 261009225715 Flutter instansi: pembayaran, pembayaran tambahan, dan mitra pengganti

**Lalu F7 tambahan waktu, batal, dan pesan per kontrak.** Menunggu F6;
sesudah bayar karena berbagi berkas kontrak instansi Flutter yang sama.

- 261017073007 Instansi memutuskan tambahan waktu, membatalkan kontrak, dan mengirim pesan per kontrak dari aplikasi Flutter di server sungguhan

**Lalu F8 kode, laporan, tutup, dan ulasan.** Menunggu F6; sesudahnya satu
pekerjaan bisa ditempuh dari awal sampai selesai dengan dua HP.

- 261017073008 Instansi menerbitkan kode mulai kerja, membaca laporan, menutup pekerjaan, dan memberi ulasan dari aplikasi Flutter di server sungguhan

**Terakhir, F9 Notifikasi.** Menunggu F8, supaya setiap tujuan tautan kabar
sudah server.

- 261017073009 Kabar di layar Notifikasi dan pengaturan notifikasi aplikasi Flutter dibaca dari server sungguhan, untuk mitra dan instansi
