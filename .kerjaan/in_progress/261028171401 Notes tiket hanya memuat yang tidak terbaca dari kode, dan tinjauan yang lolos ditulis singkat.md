---
type: task
priority: medium
review: normal
labels: [agen, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 17:14:00
updated: 2026-10-28 18:30:44
related: []
blocked_by: []
---

## Background
Bagian catatan di akhir tiap tiket memakan dua pertiga sampai tiga perempat
isi tiket: 76% di papan ini (65 tiket, panjang tengah sekitar 1.300 kata) dan
66% di nukitu-mockup (438 tiket, yang terbesar sekitar 7.000 kata). Sebagian
besar catatan itu ditulis oleh pengerja dan peninjau setelah pekerjaan
selesai, dan tidak ada agen yang membacanya lagi:

- penjelasan pengerja tentang cara kerja perubahannya, padahal isinya sudah
  ada di perubahan kode, pesan commit, dan laporan ke mandor;
- daftar panjang "penjaga yang sengaja dirusak dan uji yang jadi merah",
  padahal peninjau memperlakukan catatan sebagai klaim, bukan bukti;
- tinjauan yang lolos, ditulis satu paragraf per butir dan diawali kalimat
  yang sama di setiap tiket tentang arti level tinjauan.

Menulis catatan itu menghabiskan waktu dan biaya agen, dan membuat tiket
sulit dibaca pemilik. Yang memang dibutuhkan pembaca berikutnya jauh lebih
sedikit: jawaban dan keputusan pemilik, keputusan pengerja beserta alasannya,
baris yang dibaca skrip (jalan uji, cakupan tinjauan, antrean gabung), dan
temuan peninjau ketika menolak.

## Request
Pengerja dan peninjau hanya menulis ke catatan tiket hal yang tidak bisa
dibaca dari kode atau dari baris yang ditulis skrip, sehingga tiket yang
selesai jauh lebih pendek tanpa kehilangan keputusan dan alasannya.

## Done when
- [ ] Panduan pengerja meminta catatan hanya berisi keputusan dan alasannya yang tidak terlihat dari perubahan, tanpa penjelasan cara kerja yang mengulang perubahan itu
- [ ] Panduan pengerja meminta hasil sabotase diringkas dalam satu baris (berapa penjaga dirusak, semuanya merah), ditambah penjaga yang sempat tetap hijau beserta perbaikannya
- [ ] Panduan peninjau meminta tinjauan yang lolos ditulis satu baris per butir, tanpa kalimat pembuka yang mengulang arti level tinjauan; tinjauan yang menolak tetap rinci
- [ ] Batas jumlah kata skill dan batas kata panduan peninjau tidak dinaikkan: aturan baru menggantikan kalimat lama
- [ ] Uji otomatis gagal bila aturan singkat itu hilang dari panduan pengerja atau peninjau
- [ ] Tiket yang sudah selesai sebelumnya tidak diubah

## History
- 2026-10-28 17:14:00 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 17:17:09 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 18:30:44 a185f853-6a65-4f44-919d-97ba97774e43 in_progress

## Notes
- Diminta mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43, setelah bertanya apakah isi tiket (terutama catatan) bermanfaat bagi agen atau hanya memboroskan token. Pemilik memilih membuat tiket ini ke backlog; tiket lama dibiarkan.
- Ukuran yang mendasari: Notes 76% (kerjaan) dan 66% (nukitu-mockup) dari seluruh kata tiket. Satu pengerja di sesi ini memakai 100rb–190rb token dan satu peninjau 30rb–75rb token, sedangkan membaca satu tiket sedang sekitar 2rb–4rb token. Jadi penghematan membaca kecil (perkiraan 3–5% per tiket); manfaat utamanya lebih sedikit yang ditulis agen dan tiket yang lebih mudah dibaca pemilik.
- Yang tetap dipertahankan: jawaban dan keputusan pemilik, keputusan pengerja beserta alasannya, baris mekanis yang ditulis skrip, dan temuan peninjau saat menolak (bahan pengerja di ronde berikutnya).
- Batas kata hampir penuh: skill 17.925 dari 18.000 kata, panduan peninjau 2.994 dari 3.000 kata (per 2026-10-28; 261028121401 mungkin mengubahnya).
- 2026-10-28 17:17:01: files estimated to change: `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `tests/bash-description.test.mjs`
