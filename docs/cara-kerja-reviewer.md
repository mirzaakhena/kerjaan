# Cara kerja reviewer, dan kenapa sabotase dibuat murah

Dokumen ini menjelaskan dengan bahasa sederhana apa yang dilakukan
`kerjaan-reviewer` dan alasan di balik cara kerjanya. Dokumen ini tidak memuat
aturan. Semua aturan yang mengikat ada di satu tempat,
[`agents/kerjaan-reviewer.md`](../agents/kerjaan-reviewer.md); nama bagian di
dalam tanda kutip di bawah merujuk ke bagian di berkas itu. Cara mandor memakai
putusan reviewer ada di
[`skills/kerjaan/references/review.md`](../skills/kerjaan/references/review.md).

---

## Pemeriksa dari luar

Reviewer tidak ikut mengerjakan tiket dan tidak peduli tiket itu lolos atau
tidak. Mandor mengutusnya begitu pengerja menyerahkan tiket, dan pengguna tidak
perlu memanggilnya. Kalau tiket ditolak, putaran berikutnya diberikan kepada
reviewer yang sama, supaya ia tidak memeriksa ulang dari nol.

Ukurannya hanya daftar `Done when` di tiket. Tulisan pengerja di `Notes`
diperlakukan sebagai klaim yang harus dibuktikan, bukan bukti. Reviewer tidak
pernah memperbaiki kode: kalau ia ikut memperbaiki, papan kehilangan
satu-satunya pemeriksa yang independen, dan pengerja tidak tahu apa yang
salah. Hal di luar kriteria hanya ia tulis sebagai saran, karena ia tidak bisa
bertanya kepada siapa pun untuk menulis tiket yang lengkap.

## Kenapa ada level

Tidak semua tiket pantas diperiksa sama dalam. Mengganti satu kata tidak perlu
pemeriksaan selama perubahan di jalur pembayaran. Karena itu tiket punya
kolom `review:` dengan tiga level, dan bawaannya yang paling murah. Apa yang
dikerjakan tiap level dijelaskan di satu tabel, di bagian "How thorough to
be". Level hanya membatasi seberapa banyak yang dilihat, tidak pernah
membolehkan reviewer meloloskan sesuatu yang ia ragukan.

## Apa itu sabotase

Uji yang lulus belum tentu menjaga apa pun. Di level tertinggi, reviewer
sengaja merusak kodenya, misalnya menghapus pengecekan "hanya pemilik akun
yang boleh menghapus", lalu menjalankan ujinya. Kalau uji jadi merah, uji itu
memang menjaga fitur. Kalau tetap hijau, ujinya ompong: fitur rusak pun tidak
ketahuan. Langkah dan akibatnya ada di bagian "Green tests prove nothing on
their own".

## Kenapa uji tidak dijalankan dua kali

Pengerja menjalankan uji lewat `test-run.sh`, yang mencatat **sidik isi**:
satu kode yang mewakili isi semua berkas yang diuji. Reviewer tidak percaya
begitu saja. Ia meminta git menghitung sidik versi yang sedang ditinjau. Kalau
sama, yang ia percayai hanya bahwa run itu memang lulus, seperti orang
mempercayai lencana CI. Jadi menunggu seluruh uji untuk kedua kalinya tidak
perlu. Kode yang ia ubah sendiri, seperti sabotase, tetap ia uji sendiri.
Rinciannya ada di bagian "Test runs".

## Kenapa sabotase dibuat murah

Sampai versi 1.2.0, setiap sabotase menjalankan seluruh uji, satu per satu.
Sejak 1.2.0 reviewer juga diminta mencari kesalahan sejenis di tempat lain,
jadi jumlah sabotase bertambah. Contoh berikut hanya ilustrasi, bukan hasil
ukur: seluruh uji 3 menit, satu berkas uji yang relevan 20 detik, 4 sabotase.

| | Sampai 1.2.0 | Hanya uji yang relevan | Ditambah berjalan bersamaan |
|---|---|---|---|
| Uji per sabotase | seluruh uji | berkas yang menjaga bagian itu | berkas yang menjaga bagian itu |
| Urutan | antre | antre | bersamaan, kalau aman |
| Contoh waktu | ± 15 menit | ± 4–5 menit | ± 3,5 menit |
| Yang tertangkap | sama | sama | sama |

Ibaratnya, untuk mengecek satu lampu mati, dulu seluruh rumah diperiksa ulang
untuk tiap lampu. Sekarang yang diperiksa cukup lampunya. Kalau lampu itu
ternyata tidak ketahuan mati, seluruh rumah diperiksa sekali lagi sebelum
dinyatakan bermasalah, jadi kesimpulannya tetap sama akuratnya.

Berjalan bersamaan memakai salinan instan dari satu salinan yang sudah siap,
dan tidak dipakai kalau uji proyek berebut sumber yang sama (port, database,
berkas di lokasi tetap), karena merah akibat gangguan tetangga tidak bisa
dibedakan dari merah sungguhan. Syarat lengkapnya ada di bagian yang sama.

## Kenapa tidak memakai beberapa subagent

Pernah dipertimbangkan: reviewer menyusun rencana sabotase lalu membaginya ke
beberapa subagent. Tidak dipilih karena tiap subagent mulai dari nol (mengenal
repo dan memasang dependensi sendiri, sering lebih mahal daripada sabotasenya),
dan agen yang hanya menjalankan rencana tidak membawa penilaian baru: kalau
rencananya bolong, hasilnya tetap bolong, hanya lebih cepat. Paralel lewat
shell memberi kecepatan yang sama tanpa biaya itu.
