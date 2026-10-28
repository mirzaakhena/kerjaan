---
type: task
priority: medium
review: normal
labels: [agen, sesi-a185f853]
reporter: mirza
assign_to: claude
created: 2026-10-28 17:14:00
updated: 2026-10-28 18:36:42
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
- [x] Panduan pengerja meminta catatan hanya berisi keputusan dan alasannya yang tidak terlihat dari perubahan, tanpa penjelasan cara kerja yang mengulang perubahan itu
- [x] Panduan pengerja meminta hasil sabotase diringkas dalam satu baris (berapa penjaga dirusak, semuanya merah), ditambah penjaga yang sempat tetap hijau beserta perbaikannya
- [x] Panduan peninjau meminta tinjauan yang lolos ditulis satu baris per butir, tanpa kalimat pembuka yang mengulang arti level tinjauan; tinjauan yang menolak tetap rinci
- [x] Batas jumlah kata skill dan batas kata panduan peninjau tidak dinaikkan: aturan baru menggantikan kalimat lama
- [x] Uji otomatis gagal bila aturan singkat itu hilang dari panduan pengerja atau peninjau
- [x] Tiket yang sudah selesai sebelumnya tidak diubah

## History
- 2026-10-28 17:14:00 a185f853-6a65-4f44-919d-97ba97774e43 backlog
- 2026-10-28 17:17:09 a185f853-6a65-4f44-919d-97ba97774e43 todo
- 2026-10-28 18:30:44 a185f853-6a65-4f44-919d-97ba97774e43 in_progress
- 2026-10-28 18:36:42 a185f853-6a65-4f44-919d-97ba97774e43 review

## Notes
- Diminta mirza, 2026-10-28, sesi a185f853-6a65-4f44-919d-97ba97774e43, setelah bertanya apakah isi tiket (terutama catatan) bermanfaat bagi agen atau hanya memboroskan token. Pemilik memilih membuat tiket ini ke backlog; tiket lama dibiarkan.
- Ukuran yang mendasari: Notes 76% (kerjaan) dan 66% (nukitu-mockup) dari seluruh kata tiket. Satu pengerja di sesi ini memakai 100rb–190rb token dan satu peninjau 30rb–75rb token, sedangkan membaca satu tiket sedang sekitar 2rb–4rb token. Jadi penghematan membaca kecil (perkiraan 3–5% per tiket); manfaat utamanya lebih sedikit yang ditulis agen dan tiket yang lebih mudah dibaca pemilik.
- Yang tetap dipertahankan: jawaban dan keputusan pemilik, keputusan pengerja beserta alasannya, baris mekanis yang ditulis skrip, dan temuan peninjau saat menolak (bahan pengerja di ronde berikutnya).
- Batas kata hampir penuh: skill 17.925 dari 18.000 kata, panduan peninjau 2.994 dari 3.000 kata (per 2026-10-28; 261028121401 mungkin mengubahnya).
- 2026-10-28 17:17:01: files estimated to change: `agents/kerjaan-reviewer.md`, `agents/kerjaan-worker.md`, `tests/bash-description.test.mjs`
- Keputusan: baris pembuka `Reviewed at level` dibiarkan apa adanya, karena on-ticket-review.sh dan peninjau baru mencarinya; tidak ada skrip atau viewer yang membaca isi tinjauan lolos, jadi isinya aman diringkas.
- Jumlah kata: skill 17.922 dari 18.000 (sebelumnya 17.925), panduan peninjau 2.992 dari 3.000 (sebelumnya 2.994). Uji lama "No commands with their output" dilonggarkan huruf besarnya karena kalimat itu kini di tengah kalimat.
- Sabotase: 7 penjaga dirusak (4 di panduan pengerja, 3 di panduan peninjau), semuanya merah.
- 2026-10-28 18:36:34: test run — `node --test --test-timeout=900000 --import=./tests/complete-runs.mjs --test-reporter=tap --test-reporter-destination=stdout --test-reporter=./skills/kerjaan/scripts/reporters/node.mjs --test-reporter-destination=/dev/null` exited 0 after 3m42s, on content fingerprint 177e938e4187eb456a3dcd91c6fc6ed812793b69 (the same before and after the run; .kerjaan/ left out).
